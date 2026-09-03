import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "./api";
import type { GardenState } from "./shared/model";

// This context is a thin shared cache, not a second database: the server remains authoritative.

/** "saved" clears itself; "problem" stays until it is read and dismissed. */
type NoticeTone = "saved" | "problem";

interface GardenContextValue {
  state: GardenState | null;
  loading: boolean;
  saving: boolean;
  notice: string;
  noticeTone: NoticeTone;
  dismissNotice: () => void;
  save: (next: GardenState) => Promise<void>;
  replace: (next: GardenState) => void;
  reload: () => Promise<void>;
}

/** Long enough to read one word, short enough not to become furniture. */
const SAVED_NOTICE_MS = 2200;

const GardenContext = createContext<GardenContextValue | null>(null);

export function GardenProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GardenState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<NoticeTone>("saved");
  // One timer, restarted by each save, cancelled on the way out — so a run of
  // quick saves shows one "Saved" that clears once, and an unmount mid-save
  // never sets state on a component that has gone.
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopTimer = useCallback(() => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = null;
  }, []);
  useEffect(() => stopTimer, [stopTimer]);
  const dismissNotice = useCallback(() => {
    stopTimer();
    setNotice("");
  }, [stopTimer]);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setState(await api.garden());
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  const save = useCallback(
    async (next: GardenState) => {
      setSaving(true);
      stopTimer();
      setNotice("");
      try {
        const saved = await api.saveGarden(next);
        setState(saved);
        setNoticeTone("saved");
        setNotice("Saved");
        clearTimer.current = setTimeout(() => setNotice(""), SAVED_NOTICE_MS);
      } catch (error) {
        setNoticeTone("problem");
        // A 409 means another device saved first. Load its state instead of hiding the conflict.
        if (error instanceof ApiError && error.status === 409) {
          const current = (error.payload as { current?: GardenState })?.current;
          if (current) setState(current);
          setNotice(
            "Another device saved first. We loaded its latest changes so nothing was overwritten.",
          );
        } else
          setNotice(error instanceof Error ? error.message : "Could not save");
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [stopTimer],
  );
  const value = useMemo(
    () => ({
      state,
      loading,
      saving,
      notice,
      noticeTone,
      dismissNotice,
      save,
      replace: setState,
      reload,
    }),
    [state, loading, saving, notice, noticeTone, dismissNotice, save, reload],
  );
  return (
    <GardenContext.Provider value={value}>{children}</GardenContext.Provider>
  );
}

export function useGarden() {
  const value = useContext(GardenContext);
  if (!value) throw new Error("useGarden must be used inside GardenProvider");
  return value;
}
