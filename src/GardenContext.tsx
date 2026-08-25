import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "./api";
import type { GardenState } from "./shared/model";

// This context is a thin shared cache, not a second database: the server remains authoritative.

interface GardenContextValue {
  state: GardenState | null;
  loading: boolean;
  saving: boolean;
  notice: string;
  save: (next: GardenState) => Promise<void>;
  replace: (next: GardenState) => void;
  reload: () => Promise<void>;
}

const GardenContext = createContext<GardenContextValue | null>(null);

export function GardenProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GardenState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
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
  const save = useCallback(async (next: GardenState) => {
    setSaving(true);
    setNotice("");
    try {
      const saved = await api.saveGarden(next);
      setState(saved);
      setNotice("Saved");
    } catch (error) {
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
  }, []);
  const value = useMemo(
    () => ({ state, loading, saving, notice, save, replace: setState, reload }),
    [state, loading, saving, notice, save, reload],
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
