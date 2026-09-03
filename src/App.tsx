import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { api } from "./api";
import { GardenProvider, useGarden } from "./GardenContext";
import { catalog as localCatalog, catalogById } from "./shared/catalog";
import type {
  Bed,
  GardenEntry,
  GardenState,
  PlantRecord,
  SourceRecord,
} from "./shared/model";
import {
  type BedColorKey,
  type ThemePreference,
  BED_COLOR_KEYS,
  THEMES,
  applyTheme,
  bedColorLabel,
  bedFallbackHex,
  bedStyle,
  isBedColorKey,
  nearestBedColorKey,
  readThemePreference,
  resolveTheme,
  writeThemePreference,
} from "./theme";
import { frostPosition, timelineForEntry } from "./shared/timing";
import styles from "./App.module.css";
import {
  ChevronIcon,
  CloseIcon,
  MenuIcon,
  PencilIcon,
  PlannerIcon,
  QuestionIcon,
  SettingsIcon,
  ShovelIcon,
  SnowflakeIcon,
  SourcesIcon,
  SproutNavIcon,
} from "./icons";

// This file is the visible application. Each named function below is either a whole page
// or a small piece of one; data storage and HTTP details live in separate modules.

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const phaseLabels = {
  indoor: "Start indoors",
  transplant: "Transplant",
  direct: "Direct sow",
  harvest: "Harvest",
  bloom: "Bloom",
};
const CATEGORY_ORDER = ["herb", "vegetable", "fruit", "flower"] as const;
type PlantCategory = (typeof CATEGORY_ORDER)[number];
const categoryLabels: Record<PlantCategory, string> = {
  herb: "Herbs",
  vegetable: "Vegetables",
  fruit: "Fruits",
  flower: "Flowers",
};
const categoryColors: Record<PlantCategory, string> = {
  herb: "var(--stage-harvest)",
  vegetable: "var(--color-accent)",
  fruit: "var(--stage-indoor)",
  flower: "var(--stage-bloom)",
};
// An entry only has a category if it came from the catalog; hand-added plants
// have none until someone links them to a catalog plant.
const entryCategory = (entry: GardenEntry): PlantCategory | null => {
  const category = entry.plantId
    ? catalogById.get(entry.plantId)?.category
    : undefined;
  return category && (CATEGORY_ORDER as readonly string[]).includes(category)
    ? (category as PlantCategory)
    : null;
};

const statusLabels: Record<GardenEntry["status"], string> = {
  planted: "Planted",
  willplant: "Will plant",
  undecided: "Undecided",
};

function StatusIcon({
  status,
  size = 14,
}: {
  status: GardenEntry["status"];
  size?: number;
}) {
  if (status === "planted")
    return (
      <img
        src="/icons/status-planted.png"
        alt=""
        width={size}
        height={size}
        className={styles.statusIcon}
      />
    );
  if (status === "willplant") return <ShovelIcon size={size} />;
  return <QuestionIcon size={size} />;
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setWorking(true);
    setError("");
    try {
      await api.login(passphrase);
      onLogin();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not sign in");
    } finally {
      setWorking(false);
    }
  };
  return (
    <main className={styles.login}>
      <section className={styles.loginCard}>
        <img src="/brand/icon-192.png" alt="" className={styles.loginMark} />
        <p className={styles.eyebrow}>Welcome to</p>
        <h1>GardenBuddy</h1>
        <p>Your garden plans, together in one warm little place.</p>
        <form onSubmit={submit} className={styles.stack}>
          <label>
            Passphrase
            <input
              type="password"
              autoComplete="current-password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              autoFocus
            />
          </label>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <button className={styles.primary} disabled={working}>
            {working ? "Opening…" : "Open the garden"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Shell({
  themePreference,
  onChooseTheme,
}: {
  themePreference: ThemePreference;
  onChooseTheme: (preference: ThemePreference) => void;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  // The drawer is a page-level overlay, so arriving anywhere new closes it.
  useEffect(() => setNavOpen(false), [pathname]);
  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/planner" className={styles.brand}>
          <img src="/brand/icon-192.png" alt="" />
          <span>GardenBuddy</span>
        </Link>
        <button
          className={styles.navToggle}
          aria-label={navOpen ? "Close menu" : "Open menu"}
          aria-expanded={navOpen}
          onClick={() => setNavOpen((open) => !open)}
        >
          <MenuIcon />
        </button>
      </header>
      {navOpen && (
        <div
          className={styles.navScrim}
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
      )}
      {navOpen && (
        <nav className={styles.navDrawer} aria-label="Main navigation">
          <p className={styles.navHeading}>Go to</p>
          <NavLink to="/planner">
            <span className={styles.navIcon} aria-hidden="true">
              <PlannerIcon size={20} />
            </span>
            <span>Planner</span>
          </NavLink>
          <NavLink to="/plants">
            <span className={styles.navIcon} aria-hidden="true">
              <SproutNavIcon size={20} />
            </span>
            <span>Plants</span>
          </NavLink>
          <NavLink to="/sources">
            <span className={styles.navIcon} aria-hidden="true">
              <SourcesIcon size={20} />
            </span>
            <span>Sources</span>
          </NavLink>
          <NavLink to="/settings">
            <span className={styles.navIcon} aria-hidden="true">
              <SettingsIcon size={20} />
            </span>
            <span>Settings</span>
          </NavLink>
        </nav>
      )}
      <GardenProvider>
        <Routes>
          <Route path="/planner" element={<Planner />} />
          <Route path="/plants" element={<PlantLibrary />} />
          <Route path="/plants/:slug" element={<PlantDetail />} />
          <Route
            path="/settings"
            element={
              <Settings
                themePreference={themePreference}
                onChooseTheme={onChooseTheme}
                onLogout={async () => {
                  await api.logout();
                  navigate("/");
                  location.reload();
                }}
              />
            }
          />
          <Route path="/sources" element={<Sources />} />
          <Route path="*" element={<Navigate to="/planner" replace />} />
        </Routes>
      </GardenProvider>
    </div>
  );
}

function App() {
  // Check the server-owned session before rendering any private garden information.
  const [auth, setAuth] = useState<"checking" | "yes" | "no">("checking");
  useEffect(() => {
    api
      .session()
      .then(() => setAuth("yes"))
      .catch(() => setAuth("no"));
  }, []);

  // The theme belongs above the sign-in gate: the login and loading screens are
  // themed too, and applyTheme keeps the phone's browser chrome in step.
  const [themePreference, setThemePreference] =
    useState<ThemePreference>(readThemePreference);
  useEffect(() => {
    const apply = () => applyTheme(resolveTheme(themePreference));
    apply();
    if (themePreference !== "auto") return;
    // "Seasonal" can fall due while the app sits open, so re-check on return.
    const recheck = () => {
      if (!document.hidden) apply();
    };
    document.addEventListener("visibilitychange", recheck);
    window.addEventListener("focus", recheck);
    return () => {
      document.removeEventListener("visibilitychange", recheck);
      window.removeEventListener("focus", recheck);
    };
  }, [themePreference]);
  const chooseTheme = (preference: ThemePreference) => {
    writeThemePreference(preference);
    setThemePreference(preference);
  };

  if (auth === "checking")
    return <main className={styles.loading}>Opening the garden…</main>;
  return auth === "yes" ? (
    <Shell themePreference={themePreference} onChooseTheme={chooseTheme} />
  ) : (
    <Login onLogin={() => setAuth("yes")} />
  );
}

function Page({
  eyebrow,
  title,
  intro,
  children,
  actions,
  className,
}: {
  eyebrow?: string;
  title?: string;
  intro?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={`${styles.page} ${className ?? ""}`}>
      {(title || eyebrow || intro || actions) && (
        <div className={styles.pageHead}>
          <div>
            {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
            {title && <h1>{title}</h1>}
            {intro && <p>{intro}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
      {children}
    </main>
  );
}

function Planner() {
  const { state, loading, saving, notice, save } = useGarden();
  const [dialog, setDialog] = useState<"plant" | "bed" | null>(null);
  const [editingBed, setEditingBed] = useState<Bed | null>(null);
  const [view, setView] = useState<"name" | "bed" | "status" | "category">(
    "bed",
  );
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const calendarRef = useRef<HTMLElement>(null);

  // Amanda's original planner opened near the current month. Keep a little
  // earlier context visible while the plant names remain pinned on the left.
  useEffect(() => {
    if (!state || !calendarRef.current) return;
    const now = new Date();
    const currentSlot = now.getMonth() * 2 + (now.getDate() > 15 ? 1 : 0);
    const firstSlot =
      calendarRef.current.querySelector<HTMLElement>("[data-slot='0']");
    if (!firstSlot) return;
    calendarRef.current.scrollLeft = Math.max(
      0,
      (currentSlot - 2) * firstSlot.getBoundingClientRect().width,
    );
  }, [state]);
  if (loading || !state)
    return (
      <Page title="Planner">
        <p>Loading your garden…</p>
      </Page>
    );
  const beds = new Map(state.beds.map((bed) => [bed.id, bed]));
  const byName = (a: GardenEntry, b: GardenEntry) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  const categoryRank = (entry: GardenEntry) => {
    const category = entryCategory(entry);
    return category ? CATEGORY_ORDER.indexOf(category) : CATEGORY_ORDER.length;
  };
  const entries = [...state.entries].sort((a, b) => {
    if (view === "bed")
      return (
        (beds.get(a.bedId ?? "")?.sortOrder ?? 99) -
          (beds.get(b.bedId ?? "")?.sortOrder ?? 99) || byName(a, b)
      );
    if (view === "status")
      return a.status.localeCompare(b.status) || byName(a, b);
    if (view === "category")
      return categoryRank(a) - categoryRank(b) || byName(a, b);
    return byName(a, b);
  });
  const lastFrostPos = frostPosition(state.garden, "lastFrost");
  const firstFrostPos = frostPosition(state.garden, "firstFrost");
  const last = lastFrostPos.slot;
  const first = firstFrostPos.slot;
  const frostFractionForSlot = (slot: number) =>
    slot === last
      ? lastFrostPos.fraction
      : slot === first
        ? firstFrostPos.fraction
        : undefined;
  const removeEntry = async (entry: GardenEntry) => {
    if (!confirm(`Remove ${entry.name}?`)) return;
    await save({
      ...state,
      entries: state.entries.filter((item) => item.id !== entry.id),
    });
    setSelectedEntryId(null);
  };
  // Bed-backed groups carry their bed so the header can open its settings;
  // the status and no-bed groups are synthetic and carry null.
  type PlannerGroup = {
    id: string;
    label: string;
    style: { backgroundColor: string; color: string };
    bed: Bed | null;
    entries: typeof entries;
  };
  const bedGroups: PlannerGroup[] = state.beds.map((bed) => ({
    id: bed.id,
    label: bed.label,
    style: bedStyle(bed),
    bed,
    entries: entries.filter((entry) => entry.bedId === bed.id),
  }));
  const unmatchedEntries = entries.filter(
    (entry) => !entry.bedId || !beds.has(entry.bedId),
  );
  if (unmatchedEntries.length)
    bedGroups.push({
      id: "no-bed",
      label: "No bed",
      style: {
        backgroundColor: "var(--color-text-muted)",
        color: "var(--color-surface)",
      },
      bed: null,
      entries: unmatchedEntries,
    });
  const groups: PlannerGroup[] =
    view === "bed"
      ? bedGroups
      : view === "status"
        ? (["planted", "willplant", "undecided"] as const).map((status) => ({
            id: status,
            label: statusLabels[status],
            style: {
              backgroundColor:
                status === "planted"
                  ? "var(--color-accent)"
                  : status === "willplant"
                    ? "var(--color-secondary)"
                    : "var(--color-text-muted)",
              color: "var(--color-on-accent)",
            },
            bed: null,
            entries: entries.filter((entry) => entry.status === status),
          }))
        : view === "category"
          ? [
              ...CATEGORY_ORDER.map((category) => ({
                id: category,
                label: categoryLabels[category],
                style: {
                  backgroundColor: categoryColors[category],
                  color: "var(--color-on-accent)",
                },
                bed: null,
                entries: entries.filter(
                  (entry) => entryCategory(entry) === category,
                ),
              })),
              {
                id: "uncategorised",
                label: "Not categorised",
                style: {
                  backgroundColor: "var(--color-text-muted)",
                  color: "var(--color-surface)",
                },
                bed: null,
                entries: entries.filter((entry) => !entryCategory(entry)),
              },
            ].filter((group) => group.entries.length)
          : [
              {
                id: "name",
                label: "",
                style: {
                  backgroundColor: "var(--color-accent)",
                  color: "var(--color-on-accent)",
                },
                bed: null,
                entries,
              },
            ];
  const now = new Date();
  const currentSlot = now.getMonth() * 2 + (now.getDate() > 15 ? 1 : 0);
  const selectedEntry = state.entries.find(
    (entry) => entry.id === selectedEntryId,
  );
  return (
    <Page className={styles.plannerPage}>
      <h1 className={styles.srOnly}>My Garden Planting Calendar</h1>
      {notice && (
        <p
          className={
            notice.startsWith("Saved") ? styles.notice : styles.warning
          }
          role="status"
        >
          {notice}
        </p>
      )}
      <section
        ref={calendarRef}
        className={styles.calendar}
        aria-label="Annual planting calendar"
      >
        <div className={styles.calendarGrid}>
          <div
            className={`${styles.stickyPlant} ${styles.monthHead} ${styles.monthCorner}`}
          >
            <span className={styles.selectWrap}>
              <select
                aria-label="Sort plants"
                className={styles.cornerSort}
                value={view}
                onChange={(event) => setView(event.target.value as typeof view)}
              >
                <option value="name">A – Z</option>
                <option value="bed">By bed</option>
                <option value="status">By status</option>
                <option value="category">By category</option>
              </select>
            </span>
          </div>
          {months.map((month, index) => (
            <div
              className={`${styles.monthHead} ${currentSlot >> 1 === index ? styles.currentHead : ""}`}
              key={month}
            >
              {month}
            </div>
          ))}
          {Array.from({ length: 24 }, (_, slot) => (
            <div
              className={`${styles.halfHead} ${slot === currentSlot ? styles.currentHead : ""} ${slot === last || slot === first ? styles.frostHead : ""}`}
              style={
                {
                  "--frost-pos": frostFractionForSlot(slot),
                } as CSSProperties
              }
              key={`half-${slot}`}
            >
              {slot === last || slot === first ? (
                <SnowflakeIcon size={12} />
              ) : slot % 2 === 0 ? (
                "E"
              ) : (
                "L"
              )}
            </div>
          ))}
          {groups.map((group) => (
            <div className={styles.calendarGroup} key={group.id}>
              {group.label && (
                <div className={styles.groupRow} style={group.style}>
                  {group.bed ? (
                    <button
                      type="button"
                      className={styles.groupRowName}
                      onClick={() => setEditingBed(group.bed)}
                      aria-label={`Bed settings for ${group.label}`}
                    >
                      {group.label}
                    </button>
                  ) : (
                    <span>{group.label}</span>
                  )}
                </div>
              )}
              {group.entries.map((entry) => {
                const timeline = timelineForEntry(entry, state.garden);
                const editLabel = `Edit ${entry.name}${entry.variety ? ` — ${entry.variety}` : ""}`;
                return (
                  <div className={styles.calendarRow} key={entry.id}>
                    <div className={styles.stickyPlant}>
                      <div className={styles.plantRowTitle}>
                        <strong>{entry.name}</strong>
                        <span>
                          {entry.variety || "No variety"} ·{" "}
                          {entry.dtm || "Timing not reviewed"}
                        </span>
                        <small className={styles.statusLine}>
                          <StatusIcon status={entry.status} size={13} />
                          {statusLabels[entry.status]} · qty {entry.qty}
                        </small>
                      </div>
                      <button
                        className={styles.rowEdit}
                        aria-label={editLabel}
                        onClick={() => setSelectedEntryId(entry.id)}
                      >
                        <ChevronIcon direction="down" />
                      </button>
                    </div>
                    {timeline.map((slot, index) => (
                      <div
                        className={`${styles.slotCell} ${index === last || index === first ? styles.frostColumn : ""} ${index === currentSlot ? styles.currentColumn : ""}`}
                        style={
                          {
                            "--frost-pos": frostFractionForSlot(index),
                          } as CSSProperties
                        }
                        data-slot={index}
                        key={index}
                      >
                        <span
                          title={
                            slot.phase ? phaseLabels[slot.phase] : undefined
                          }
                          className={slot.phase ? styles[slot.phase] : ""}
                        />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>
      <div className={styles.plannerDock}>
        <button className={styles.primary} onClick={() => setDialog("plant")}>
          + Plant
        </button>
        <button className={styles.primary} onClick={() => setDialog("bed")}>
          + Bed
        </button>
        <button
          className={styles.moreButton}
          aria-expanded={showMore}
          onClick={() => setShowMore(true)}
        >
          More{" "}
          <ChevronIcon
            className={styles.moreArrow}
            direction={showMore ? "down" : "up"}
          />
        </button>
      </div>
      {showMore && (
        <PlannerMore
          state={state}
          save={save}
          saving={saving}
          close={() => setShowMore(false)}
        />
      )}
      {!entries.length && (
        <div className={styles.empty}>
          <h2>Your garden is ready to grow.</h2>
          <p>Add the first plant to see its season across the calendar.</p>
          <button className={styles.primary} onClick={() => setDialog("plant")}>
            Add a plant
          </button>
        </div>
      )}
      {dialog === "plant" && (
        <PlantDialog state={state} close={() => setDialog(null)} save={save} />
      )}
      {dialog === "bed" && (
        <BedDialog state={state} close={() => setDialog(null)} save={save} />
      )}
      {editingBed && (
        <BedSettingsDialog
          bed={editingBed}
          state={state}
          close={() => setEditingBed(null)}
          save={save}
        />
      )}
      {selectedEntry && (
        <PlantSheet
          entry={selectedEntry}
          state={state}
          close={() => setSelectedEntryId(null)}
          save={save}
          remove={() => void removeEntry(selectedEntry)}
        />
      )}
    </Page>
  );
}

// "More" is where everything that is not the grid lives, now that the planner
// runs full screen: the garden's facts, its growing season, and the legend.
// ZIP and zone are editable here and write to the same garden record Settings
// writes to, so the two screens are one setting seen from two places.
function PlannerMore({
  state,
  save,
  saving,
  close,
}: {
  state: GardenState;
  save: (state: GardenState) => Promise<void>;
  saving: boolean;
  close: () => void;
}) {
  const [field, setField] = useState<"zip" | "zone" | null>(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  // Enter blurs the input, so without this the commit would run twice.
  const settled = useRef(false);
  const { zip, hardinessZone } = state.garden;
  const seasonDays = Math.round(
    (Date.parse(state.garden.firstFrost) - Date.parse(state.garden.lastFrost)) /
      86_400_000,
  );

  const startEditing = (which: "zip" | "zone") => {
    settled.current = false;
    setStatus("");
    setDraft(which === "zip" ? zip : hardinessZone);
    setField(which);
  };

  // A ZIP fills the zone in from the same lookup Settings uses. A zone typed by
  // hand wins instead, and the ZIP it no longer matches is cleared, so the two
  // can never sit on screen contradicting each other.
  const finish = async (which: "zip" | "zone", cancelled: boolean) => {
    if (settled.current) return;
    settled.current = true;
    setField(null);
    const value = draft.trim();
    if (cancelled) return;
    if (which === "zip") {
      if (!/^\d{5}$/.test(value) || value === zip) return;
      setStatus("Looking up hardiness zone…");
      try {
        const { zone } = await api.hardinessZone(value);
        await save({
          ...state,
          garden: { ...state.garden, zip: value, hardinessZone: zone },
        });
        setStatus(`Saved · zone ${zone}. Settings shows this too.`);
      } catch {
        await save({ ...state, garden: { ...state.garden, zip: value } });
        setStatus(
          "Saved the ZIP, but no zone came back. You can type the zone in yourself.",
        );
      }
      return;
    }
    if (!value || value === hardinessZone) return;
    await save({
      ...state,
      garden: { ...state.garden, hardinessZone: value, zip: "" },
    });
    setStatus(`Saved · zone ${value}, ZIP cleared. Settings shows this too.`);
  };

  const editor = (which: "zip" | "zone", label: string) => (
    <input
      className={styles.factInput}
      aria-label={label}
      inputMode={which === "zip" ? "numeric" : undefined}
      maxLength={which === "zip" ? 5 : 4}
      autoFocus
      value={draft}
      onChange={(event) =>
        setDraft(
          which === "zip"
            ? event.target.value.replace(/\D/g, "").slice(0, 5)
            : event.target.value,
        )
      }
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") void finish(which, true);
      }}
      onBlur={() => void finish(which, false)}
    />
  );

  return (
    <Dialog title="More about the garden" close={close} hideTitle>
      <p className={styles.moreGarden}>{state.garden.name}</p>

      <h3 className={styles.moreHeading}>At a glance</h3>
      <div className={styles.facts}>
        <div className={styles.factEditable}>
          <button
            className={styles.factPen}
            aria-label="Change ZIP code"
            onClick={() => startEditing("zip")}
          >
            <PencilIcon />
          </button>
          {field === "zip" ? editor("zip", "ZIP code") : <b>{zip || "--"}</b>}
          <span>ZIP code</span>
        </div>
        <div className={styles.factEditable}>
          <button
            className={styles.factPen}
            aria-label="Change hardiness zone"
            onClick={() => startEditing("zone")}
          >
            <PencilIcon />
          </button>
          {field === "zone" ? (
            editor("zone", "Hardiness zone")
          ) : (
            <b>{hardinessZone || "--"}</b>
          )}
          <span>Hardiness zone</span>
        </div>
        <div className={styles.fact}>
          <b>{state.entries.length}</b>
          <span>Plants</span>
        </div>
        <div className={styles.fact}>
          <b>{state.beds.length}</b>
          <span>Beds</span>
        </div>
      </div>
      {(status || saving) && (
        <p className={styles.moreStatus} role="status">
          {saving ? "Saving…" : status}
        </p>
      )}

      <h3 className={styles.moreHeading}>Growing season</h3>
      <div className={styles.seasonRow}>
        <p className={styles.seasonBar}>
          <b>Last frost</b>
          <span>~{prettyDate(state.garden.lastFrost)}</span>
        </p>
        <p className={styles.seasonBar}>
          <b>First frost</b>
          <span>~{prettyDate(state.garden.firstFrost)}</span>
        </p>
        <p className={`${styles.seasonBar} ${styles.seasonLength}`}>
          <b>Season length</b>
          <span>
            {seasonDays > 0 ? `${seasonDays} days` : "Check your frost dates"}
          </span>
        </p>
      </div>

      <h3 className={styles.moreHeading}>Calendar legend</h3>
      <div className={styles.moreLegend}>
        <span>
          <i className={styles.indoor} />
          Start seeds indoors
        </span>
        <span>
          <i className={styles.transplant} />
          Transplant outdoors
        </span>
        <span>
          <i className={styles.direct} />
          Direct sow outdoors
        </span>
        <span>
          <i className={styles.harvest} />
          Harvest window
        </span>
        <span>
          <i className={styles.bloom} />
          Bloom window
        </span>
        <span>
          <SnowflakeIcon size={14} className={styles.legendIcon} />
          Frost date
        </span>
      </div>

      <h3 className={styles.moreHeading}>Reading the grid</h3>
      <p className={styles.moreHint}>
        <strong>E</strong> = early month · <strong>L</strong> = late month. Tap
        the arrow on a plant for its status, bed, quantity and ordering.
      </p>

      <Link className={styles.moreSettings} to="/settings" onClick={close}>
        <span className={styles.moreSettingsLabel}>
          <SettingsIcon size={14} className={styles.legendIcon} />
          All garden settings
        </span>
        <ChevronIcon direction="right" />
      </Link>
    </Dialog>
  );
}

function PlantSheet({
  entry,
  state,
  close,
  save,
  remove,
}: {
  entry: GardenEntry;
  state: GardenState;
  close: () => void;
  save: (state: GardenState) => Promise<void>;
  remove: () => void;
}) {
  const [qty, setQty] = useState(entry.qty);
  const [status, setStatus] = useState(entry.status);
  const [bedId, setBedId] = useState(entry.bedId ?? "");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await save({
      ...state,
      entries: state.entries.map((item) =>
        item.id === entry.id
          ? { ...item, qty, status, bedId: bedId || null }
          : item,
      ),
    });
    close();
  };

  return (
    <Dialog title={`${entry.name} details`} close={close}>
      <p className={styles.sheetSubtitle}>
        {entry.variety || "No variety"} · {entry.dtm || "Timing not reviewed"}
      </p>
      <form onSubmit={submit} className={styles.stack}>
        <div className={styles.sheetFields}>
          <label>
            Quantity
            <input
              type="number"
              min="1"
              max="999"
              value={qty}
              onChange={(event) => setQty(Number(event.target.value))}
            />
          </label>
          <label>
            Status
            <span className={styles.selectWrap}>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as GardenEntry["status"])
                }
              >
                <option value="planted">Planted</option>
                <option value="willplant">Will plant</option>
                <option value="undecided">Undecided</option>
              </select>
            </span>
          </label>
          <label className={styles.sheetBed}>
            Bed
            <span className={styles.selectWrap}>
              <select
                value={bedId}
                onChange={(event) => setBedId(event.target.value)}
              >
                <option value="">No bed</option>
                {state.beds.map((bed) => (
                  <option value={bed.id} key={bed.id}>
                    {bed.label}
                  </option>
                ))}
              </select>
            </span>
          </label>
        </div>
        {entry.plantId && (
          <Link className={styles.button} to={`/plants/${entry.plantId}`}>
            View plant guide
          </Link>
        )}
        <button className={styles.primary}>Save plant</button>
        <button
          type="button"
          className={styles.dangerButton}
          aria-label={`Remove ${entry.name}`}
          onClick={remove}
        >
          Remove from calendar
        </button>
      </form>
    </Dialog>
  );
}

function Dialog({
  title,
  close,
  children,
  hideTitle,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
  /** For sheets that carry their own visible heading. The dialog is still
      named by `title` for screen readers. */
  hideTitle?: boolean;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          "a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled)",
        ) ?? [],
      );
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => focusable()[0]?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [close]);

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={styles.dialog}
      >
        <button className={styles.close} aria-label="Close" onClick={close}>
          <CloseIcon />
        </button>
        <h2 className={hideTitle ? styles.srOnly : undefined}>{title}</h2>
        {children}
      </section>
    </div>
  );
}

function PlantDialog({
  state,
  close,
  save,
}: {
  state: GardenState;
  close: () => void;
  save: (state: GardenState) => Promise<void>;
}) {
  const [plantId, setPlantId] = useState(localCatalog[0].id);
  const [name, setName] = useState("");
  const [variety, setVariety] = useState("");
  const [qty, setQty] = useState(1);
  const [bedId, setBedId] = useState(
    () => state.beds.find((bed) => bed.id === "unassigned")?.id ?? "",
  );
  const selected = localCatalog.find((plant) => plant.id === plantId);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const custom = plantId === "custom";
    const entry: GardenEntry = {
      id: crypto.randomUUID(),
      plantId: custom ? null : plantId,
      name: custom ? name : selected!.commonName,
      variety: variety || null,
      dtm: custom ? null : selected!.daysToMaturity.value,
      qty,
      bedId: bedId || null,
      status: "willplant",
      sortOrder: state.entries.length,
    };
    await save({ ...state, entries: [...state.entries, entry] });
    close();
  };
  return (
    <Dialog title="Add a plant" close={close}>
      <form onSubmit={submit} className={styles.stack}>
        <label>
          Plant
          <span className={styles.selectWrap}>
            <select
              value={plantId}
              onChange={(event) => {
                setPlantId(event.target.value);
                setVariety("");
              }}
            >
              <option value="custom">Custom plant</option>
              {localCatalog.map((plant) => (
                <option value={plant.id} key={plant.id}>
                  {plant.commonName}
                </option>
              ))}
            </select>
          </span>
        </label>
        {plantId === "custom" && (
          <label>
            Name
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        )}
        <label>
          Variety
          <span className={styles.selectWrap}>
            <input
              list="varieties"
              value={variety}
              onChange={(event) => setVariety(event.target.value)}
              placeholder="Optional"
            />
          </span>
          <datalist id="varieties">
            {selected?.cultivars.map((cultivar) => (
              <option key={cultivar.id}>{cultivar.name}</option>
            ))}
          </datalist>
        </label>
        <div className={styles.twoCols}>
          <label>
            Quantity
            <input
              type="number"
              min="1"
              max="999"
              value={qty}
              onChange={(event) => setQty(Number(event.target.value))}
            />
          </label>
          <label>
            Bed
            <span className={styles.selectWrap}>
              <select
                value={bedId}
                onChange={(event) => setBedId(event.target.value)}
              >
                <option value="">No bed</option>
                {state.beds.map((bed) => (
                  <option value={bed.id} key={bed.id}>
                    {bed.label}
                  </option>
                ))}
              </select>
            </span>
          </label>
        </div>
        <button className={styles.primary}>Add to planner</button>
      </form>
    </Dialog>
  );
}

/**
 * Where a deleted bed's plants go. Gardens usually keep a bed called
 * "Unassigned" for exactly this; if there isn't one, the plants fall back to
 * no bed at all, which the planner groups under "No bed". Either way nothing
 * is lost, and the dialog says which it will be before you confirm.
 */
function rehomeTargetFor(state: GardenState, bedId: string) {
  return (
    state.beds.find(
      (bed) =>
        bed.id !== bedId && bed.label.trim().toLowerCase() === "unassigned",
    ) ?? null
  );
}

function BedSettingsDialog({
  bed,
  state,
  close,
  save,
}: {
  bed: Bed;
  state: GardenState;
  close: () => void;
  save: (state: GardenState) => Promise<void>;
}) {
  const [label, setLabel] = useState(bed.label);
  const [colorKey, setColorKey] = useState<BedColorKey>(() =>
    isBedColorKey(bed.colorKey) ? bed.colorKey : nearestBedColorKey(bed.color),
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const planted = state.entries.filter((entry) => entry.bedId === bed.id);
  const rehome = rehomeTargetFor(state, bed.id);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await save({
      ...state,
      beds: state.beds.map((item) =>
        item.id === bed.id
          ? { ...item, label, color: bedFallbackHex(colorKey), colorKey }
          : item,
      ),
    });
    close();
  };

  const remove = async () => {
    await save({
      ...state,
      beds: state.beds.filter((item) => item.id !== bed.id),
      // Every plant keeps its place in the garden; only its bed changes.
      entries: state.entries.map((entry) =>
        entry.bedId === bed.id
          ? { ...entry, bedId: rehome?.id ?? null }
          : entry,
      ),
    });
    close();
  };

  return (
    <Dialog title={`Bed settings — ${bed.label}`} close={close}>
      <form onSubmit={submit} className={styles.stack}>
        <label>
          Name
          <input
            required
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </label>
        <BedColorPicker value={colorKey} onChange={setColorKey} />
        <p className={styles.muted}>
          {planted.length} {planted.length === 1 ? "plant" : "plants"} in this
          bed.
        </p>
        <button className={styles.primary}>Save bed</button>
      </form>
      <div className={styles.bedDanger}>
        {confirmingDelete ? (
          <>
            <p className={styles.muted}>
              Remove {bed.label}?{" "}
              {planted.length === 0
                ? "It has no plants in it."
                : `Its ${planted.length} ${planted.length === 1 ? "plant moves" : "plants move"} to ${rehome ? rehome.label : "no bed"}.`}
            </p>
            <div className={styles.actions}>
              <button type="button" onClick={() => setConfirmingDelete(false)}>
                Keep bed
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={remove}
              >
                Remove bed
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className={styles.dangerButton}
            onClick={() => setConfirmingDelete(true)}
          >
            Remove bed
          </button>
        )}
      </div>
    </Dialog>
  );
}

function BedColorPicker({
  value,
  onChange,
}: {
  value: BedColorKey;
  onChange: (key: BedColorKey) => void;
}) {
  return (
    <fieldset className={styles.bedColorField}>
      <legend>Colour</legend>
      <div
        className={styles.bedSwatches}
        role="radiogroup"
        aria-label="Bed colour"
        onKeyDown={(event) => {
          // A radiogroup is one tab stop; the arrows move within it.
          const step =
            event.key === "ArrowRight" || event.key === "ArrowDown"
              ? 1
              : event.key === "ArrowLeft" || event.key === "ArrowUp"
                ? -1
                : 0;
          if (!step) return;
          event.preventDefault();
          const index = BED_COLOR_KEYS.indexOf(value);
          const next =
            BED_COLOR_KEYS[
              (index + step + BED_COLOR_KEYS.length) % BED_COLOR_KEYS.length
            ];
          onChange(next);
          event.currentTarget
            .querySelector<HTMLButtonElement>(`[data-key="${next}"]`)
            ?.focus();
        }}
      >
        {BED_COLOR_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            data-key={key}
            aria-checked={value === key}
            aria-label={bedColorLabel(key)}
            title={bedColorLabel(key)}
            tabIndex={value === key ? 0 : -1}
            className={styles.bedSwatch}
            style={{ background: `var(--bed-${key})` }}
            onClick={() => onChange(key)}
          />
        ))}
      </div>
      <p className={styles.muted}>{bedColorLabel(value)}</p>
    </fieldset>
  );
}

function BedDialog({
  state,
  close,
  save,
}: {
  state: GardenState;
  close: () => void;
  save: (state: GardenState) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [colorKey, setColorKey] = useState<BedColorKey>("deep-fern");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const bed: Bed = {
      id: crypto.randomUUID(),
      label,
      // The key drives the colour; the hex is kept so exports and older
      // readers still see something sensible.
      color: bedFallbackHex(colorKey),
      colorKey,
      sortOrder: state.beds.length,
    };
    await save({ ...state, beds: [...state.beds, bed] });
    close();
  };
  return (
    <Dialog title="Add a garden bed" close={close}>
      <form onSubmit={submit} className={styles.stack}>
        <label>
          Name
          <input
            required
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="North raised bed"
          />
        </label>
        <BedColorPicker value={colorKey} onChange={setColorKey} />
        <button className={styles.primary}>Add bed</button>
      </form>
    </Dialog>
  );
}

function PlantLibrary() {
  const [plants, setPlants] = useState<PlantRecord[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  useEffect(() => {
    api.catalog().then(setPlants);
  }, []);
  const filtered = plants
    .filter(
      (plant) =>
        (category === "all" || plant.category === category) &&
        `${plant.commonName} ${plant.scientificName}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      a.commonName.localeCompare(b.commonName, undefined, {
        sensitivity: "base",
      }),
    );
  return (
    <Page
      eyebrow="Reviewed plant knowledge"
      title="Plant Library"
      intro="Western Oregon guidance with source and evidence details attached."
      actions={
        <>
          <input
            type="search"
            aria-label="Search plants"
            placeholder="Search plants"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <span className={styles.selectWrap}>
            <select
              aria-label="Plant category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="all">All types</option>
              <option value="herb">Herbs</option>
              <option value="vegetable">Vegetables</option>
              <option value="fruit">Fruits</option>
              <option value="flower">Flowers</option>
            </select>
          </span>
        </>
      }
    >
      <div className={styles.cardGrid}>
        {filtered.map((plant) => (
          <Link
            className={styles.plantCard}
            to={`/plants/${plant.id}`}
            key={plant.id}
          >
            <span className={styles.chip}>{plant.category}</span>
            <h2>{plant.commonName}</h2>
            <em>{plant.scientificName}</em>
            <p>{plant.summary}</p>
            <span className={styles.reviewed}>
              ✓ Reviewed · {plant.daysToMaturity.value}
            </span>
          </Link>
        ))}
      </div>
    </Page>
  );
}

function PlantDetail() {
  const { slug } = useParams();
  const [plant, setPlant] = useState<PlantRecord | null>(null);
  const [notFound, setNotFound] = useState(false);
  useEffect(() => {
    if (slug)
      api
        .plant(slug)
        .then(setPlant)
        .catch(() => setNotFound(true));
  }, [slug]);
  if (notFound)
    return (
      <Page title="Plant not found">
        <Link to="/plants">Return to the library</Link>
      </Page>
    );
  if (!plant)
    return (
      <Page title="Plant Library">
        <p>Loading plant details…</p>
      </Page>
    );
  return (
    <Page
      eyebrow={`${plant.category} · ${plant.reviewStatus}`}
      title={plant.commonName}
      intro={plant.summary}
      actions={
        <Link className={styles.button} to="/planner">
          View planner
        </Link>
      }
    >
      <div className={styles.detailGrid}>
        <section className={styles.panel}>
          <h2>At a glance</h2>
          <dl>
            <dt>Botanical name</dt>
            <dd>
              <em>{plant.scientificName}</em>
            </dd>
            <dt>Days to maturity</dt>
            <dd>{plant.daysToMaturity.value}</dd>
            <dt>Sun</dt>
            <dd>{plant.sun.value}</dd>
            <dt>Water</dt>
            <dd>{plant.water.value}</dd>
            <dt>Spacing</dt>
            <dd>{plant.spacing.value}</dd>
          </dl>
        </section>
        <section className={styles.panel}>
          <h2>Timing rules</h2>
          <p className={styles.muted}>
            Calculated from your explicit frost dates, never from the hardiness
            zone.
          </p>
          {plant.timing.map((rule, index) => (
            <div className={styles.rule} key={index}>
              <strong>{phaseLabels[rule.phase]}</strong>
              <span>
                {offset(rule.startOffsetDays)} to {offset(rule.endOffsetDays)}{" "}
                {rule.anchor === "lastFrost"
                  ? "last spring frost"
                  : "first fall frost"}
              </span>
            </div>
          ))}
        </section>
        <section className={styles.panel}>
          <h2>Growing notes</h2>
          <ul>
            {plant.growingTips.value.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
          <SourceLinks ids={plant.growingTips.sourceIds} />
        </section>
        <section className={styles.panel}>
          <h2>Companions—with context</h2>
          {plant.companions.length ? (
            plant.companions.map((relationship) => (
              <div className={styles.companion} key={relationship.plantId}>
                <span>{relationship.effect === "avoid" ? "⚠" : "♡"}</span>
                <div>
                  <strong>
                    {localCatalog.find(
                      (item) => item.id === relationship.plantId,
                    )?.commonName ?? relationship.plantId}
                  </strong>
                  <small>
                    {relationship.mechanism.replace("-", " ")} ·{" "}
                    {relationship.evidenceLevel.replace("-", " ")}
                  </small>
                  <p>{relationship.explanation}</p>
                </div>
              </div>
            ))
          ) : (
            <p>
              No reviewed companion claim is attached. GardenBuddy won’t turn
              folklore into a promise.
            </p>
          )}
        </section>
      </div>
    </Page>
  );
}

function SourceLinks({ ids }: { ids: string[] }) {
  return (
    <p className={styles.sourceLinks}>
      Sources:{" "}
      {ids.map((id, index) => (
        <span key={id}>
          {index > 0 && ", "}
          <Link to="/sources">{id}</Link>
        </span>
      ))}
    </p>
  );
}

function Settings({
  themePreference,
  onChooseTheme,
  onLogout,
}: {
  themePreference: ThemePreference;
  onChooseTheme: (preference: ThemePreference) => void;
  onLogout: () => void;
}) {
  const { state, loading, save, replace } = useGarden();
  const [meta, setMeta] = useState({ environment: "", revision: "" });
  const [history, setHistory] = useState<
    Array<{ id: string; revision: number; reason: string; createdAt: string }>
  >([]);
  const [zip, setZip] = useState(state?.garden.zip ?? "");
  const [hardinessZone, setHardinessZone] = useState(
    state?.garden.hardinessZone ?? "8b",
  );
  const [zoneLookup, setZoneLookup] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const zoneLookupRequest = useRef(0);
  const [importData, setImportData] = useState<unknown>(null);
  const [preview, setPreview] = useState<{
    plants: number;
    beds: number;
    customPlants: string[];
    varieties: number;
  } | null>(null);
  const [importSettings, setImportSettings] = useState({
    zip: "",
    hardinessZone: "8b",
    lastFrost: "2026-03-15",
    firstFrost: "2026-11-15",
  });
  const [message, setMessage] = useState("");
  const loadHistory = () => api.history().then(setHistory);
  useEffect(() => {
    void api.meta().then(setMeta);
    void loadHistory();
  }, []);
  // The zip/zone fields are controlled (for the auto-fill), so they need to sync
  // once the garden loads instead of only capturing an initial value at mount.
  useEffect(() => {
    if (!state) return;
    setZip(state.garden.zip);
    setHardinessZone(state.garden.hardinessZone);
  }, [state?.revision]);
  if (loading || !state)
    return (
      <Page title="Settings">
        <p>Loading settings…</p>
      </Page>
    );
  const updateGarden = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await save({
      ...state,
      garden: {
        ...state.garden,
        name: String(data.get("name")),
        zip,
        hardinessZone,
        lastFrost: String(data.get("lastFrost")),
        firstFrost: String(data.get("firstFrost")),
      },
    });
    setMessage("Garden settings saved.");
  };
  // Auto-fills the hardiness zone from the ZIP; the zone field stays a normal
  // input afterward, so typing in it simply overrides the looked-up value.
  const handleZipChange = (value: string) => {
    setZip(value);
    if (!/^\d{5}$/.test(value)) return;
    const requestId = ++zoneLookupRequest.current;
    setZoneLookup("loading");
    api
      .hardinessZone(value)
      .then((result) => {
        if (zoneLookupRequest.current !== requestId) return;
        setHardinessZone(result.zone);
        setZoneLookup("idle");
      })
      .catch(() => {
        if (zoneLookupRequest.current !== requestId) return;
        setZoneLookup("error");
      });
  };
  // The server validates and previews old JSON before a second, explicit import click can mutate data.
  const fileSelected = async (file?: File) => {
    if (!file) return;
    try {
      const data: unknown = JSON.parse(await file.text());
      setImportData(data);
      setPreview(await api.previewImport(data));
      setImportSettings({
        zip: state.garden.zip,
        hardinessZone: state.garden.hardinessZone,
        lastFrost: state.garden.lastFrost,
        firstFrost: state.garden.firstFrost,
      });
      setMessage("Import preview ready. Nothing has changed yet.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not read the file",
      );
    }
  };
  return (
    <Page
      eyebrow={`${meta.environment} environment`}
      title="Settings"
      intro="Garden dates, portable data, history, and release identity."
    >
      <div className={styles.settingsGrid}>
        <section className={styles.panel}>
          <h2>Appearance</h2>
          <p className={styles.muted}>
            GardenBuddy follows the season by default, changing at each equinox
            and solstice. Pick a season to hold it there instead.
          </p>
          <div
            className={styles.themeChoices}
            role="radiogroup"
            aria-label="Theme"
            onKeyDown={(event) => {
              // A radiogroup is one tab stop; the arrows move within it.
              const step =
                event.key === "ArrowRight" || event.key === "ArrowDown"
                  ? 1
                  : event.key === "ArrowLeft" || event.key === "ArrowUp"
                    ? -1
                    : 0;
              if (!step) return;
              event.preventDefault();
              const order: ThemePreference[] = [
                "auto",
                ...THEMES.map((theme) => theme.id),
              ];
              const index = order.indexOf(themePreference);
              const next = order[(index + step + order.length) % order.length];
              onChooseTheme(next);
              event.currentTarget
                .querySelector<HTMLButtonElement>(
                  `[data-theme-option="${next}"]`,
                )
                ?.focus();
            }}
          >
            <button
              type="button"
              role="radio"
              data-theme-option="auto"
              aria-checked={themePreference === "auto"}
              tabIndex={themePreference === "auto" ? 0 : -1}
              className={styles.themeChoice}
              onClick={() => onChooseTheme("auto")}
            >
              <span
                className={styles.themeSwatch}
                data-auto="true"
                aria-hidden="true"
              />
              <span>
                <strong>Seasonal</strong>
                <small>
                  Currently{" "}
                  {THEMES.find((t) => t.id === resolveTheme("auto"))?.name}
                </small>
              </span>
            </button>
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                role="radio"
                data-theme-option={theme.id}
                aria-checked={themePreference === theme.id}
                tabIndex={themePreference === theme.id ? 0 : -1}
                className={styles.themeChoice}
                onClick={() => onChooseTheme(theme.id)}
              >
                <span
                  className={styles.themeSwatch}
                  data-theme-swatch={theme.id}
                  aria-hidden="true"
                />
                <span>
                  <strong>{theme.name}</strong>
                  <small>{theme.blurb}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
        <section className={styles.panel}>
          <h2>Garden and growing season</h2>
          <form onSubmit={updateGarden} className={styles.stack}>
            <label>
              Garden name
              <input name="name" defaultValue={state.garden.name} required />
            </label>
            <div className={styles.twoCols}>
              <label>
                ZIP code
                <input
                  name="zip"
                  inputMode="numeric"
                  pattern="[0-9]{5}"
                  value={zip}
                  onChange={(event) => handleZipChange(event.target.value)}
                />
              </label>
              <label>
                Hardiness zone
                <input
                  name="hardinessZone"
                  value={hardinessZone}
                  onChange={(event) => setHardinessZone(event.target.value)}
                />
              </label>
            </div>
            {zoneLookup === "loading" && (
              <p className={styles.muted}>Looking up hardiness zone…</p>
            )}
            {zoneLookup === "error" && (
              <p className={styles.muted}>
                Couldn't look up that ZIP's hardiness zone. You can type one in
                directly.
              </p>
            )}
            <div className={styles.twoCols}>
              <label>
                Last spring frost
                <input
                  name="lastFrost"
                  type="date"
                  defaultValue={state.garden.lastFrost}
                  required
                />
              </label>
              <label>
                First fall frost
                <input
                  name="firstFrost"
                  type="date"
                  defaultValue={state.garden.firstFrost}
                  required
                />
              </label>
            </div>
            <p className={styles.muted}>
              Hardiness describes perennial cold survival. Your frost dates
              drive the vegetable calendar.
            </p>
            <button className={styles.primary}>Save settings</button>
          </form>
        </section>
        <section className={styles.panel}>
          <h2>Import or export</h2>
          <p>
            Import the original v1 JSON. Computed month cells are ignored;
            plants, beds, varieties, quantities, and DTM overrides are kept.
          </p>
          <label className={styles.fileButton}>
            Choose v1 JSON
            <input
              type="file"
              accept="application/json"
              onChange={(event) => void fileSelected(event.target.files?.[0])}
            />
          </label>
          {preview && (
            <div className={styles.preview}>
              <strong>Ready to import</strong>
              <span>
                {preview.plants} plants · {preview.beds} beds ·{" "}
                {preview.varieties} varieties
              </span>
              {preview.customPlants.length > 0 && (
                <span>Custom plants: {preview.customPlants.join(", ")}</span>
              )}
              <div className={styles.twoCols}>
                <label>
                  Garden ZIP
                  <input
                    value={importSettings.zip}
                    inputMode="numeric"
                    pattern="[0-9]{5}"
                    onChange={(event) =>
                      setImportSettings({
                        ...importSettings,
                        zip: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Hardiness zone
                  <input
                    value={importSettings.hardinessZone}
                    onChange={(event) =>
                      setImportSettings({
                        ...importSettings,
                        hardinessZone: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Last spring frost
                  <input
                    type="date"
                    value={importSettings.lastFrost}
                    onChange={(event) =>
                      setImportSettings({
                        ...importSettings,
                        lastFrost: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  First fall frost
                  <input
                    type="date"
                    value={importSettings.firstFrost}
                    onChange={(event) =>
                      setImportSettings({
                        ...importSettings,
                        firstFrost: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
              <button
                className={styles.primary}
                onClick={async () => {
                  const imported = await api.importGarden(
                    importData,
                    importSettings,
                  );
                  replace(imported);
                  setPreview(null);
                  setMessage(
                    "Import complete. A fresh server-side history has started.",
                  );
                }}
              >
                Import atomically
              </button>
            </div>
          )}
          <a className={styles.button} href="/api/export" download>
            Export GardenBuddy JSON
          </a>
        </section>
        <section className={styles.panel}>
          <h2>Recent history</h2>
          {history.length ? (
            history.map((item) => (
              <div className={styles.history} key={item.id}>
                <div>
                  <strong>Revision {item.revision}</strong>
                  <span>
                    {item.reason} · {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={async () => {
                    if (!confirm(`Restore revision ${item.revision}?`)) return;
                    const restored = await api.restore(item.id);
                    replace(restored);
                    await loadHistory();
                    setMessage(`Restored revision ${item.revision}.`);
                  }}
                >
                  Restore
                </button>
              </div>
            ))
          ) : (
            <p>
              No snapshots yet. The five most recent changes will appear here.
            </p>
          )}
        </section>
        <section className={styles.panel}>
          <h2>Release and session</h2>
          <dl>
            <dt>Environment</dt>
            <dd>
              <span className={styles.chip}>{meta.environment}</span>
            </dd>
            <dt>Git revision</dt>
            <dd>
              <code>{meta.revision}</code>
            </dd>
            <dt>Garden revision</dt>
            <dd>{state.revision}</dd>
          </dl>
          <button onClick={() => void onLogout()}>
            Sign out on this device
          </button>
        </section>
      </div>
      {message && (
        <p className={styles.notice} role="status">
          {message}
        </p>
      )}
    </Page>
  );
}

function Sources() {
  const [records, setRecords] = useState<SourceRecord[]>([]);
  useEffect(() => {
    api.sources().then(setRecords);
  }, []);
  return (
    <Page
      eyebrow="Methodology and provenance"
      title="Sources"
      intro="Plant knowledge is small, reviewed, versioned, and honest about what the evidence can support."
    >
      <section className={styles.method}>
        <h2>How GardenBuddy uses information</h2>
        <div className={styles.methodGrid}>
          <div>
            <strong>Regional guidance first</strong>
            <p>
              OSU Extension guides timing, spacing, and care for Western Oregon.
              Facts are paraphrased and linked.
            </p>
          </div>
          <div>
            <strong>Frost is not hardiness</strong>
            <p>
              Explicit NOAA-style frost dates drive annual planting windows.
              USDA hardiness is perennial cold-survival context only.
            </p>
          </div>
          <div>
            <strong>No magical companion chart</strong>
            <p>
              Relationships name a mechanism and an evidence level:
              research-supported, extension guidance, observational, or
              traditional.
            </p>
          </div>
          <div>
            <strong>Stable by design</strong>
            <p>
              v1 has no runtime plant API. The catalog stays usable even when an
              outside service is unavailable.
            </p>
          </div>
        </div>
      </section>
      <div className={styles.sourceList}>
        {records.map((source) => (
          <article className={styles.panel} key={source.id}>
            <span className={styles.chip}>{source.id}</span>
            <h2>{source.title}</h2>
            <p>
              {source.publisher}
              {source.revision ? ` · ${source.revision}` : ""}
            </p>
            <p>{source.licenseNote}</p>
            <p className={styles.muted}>
              Accessed/reviewed {source.accessedAt}
            </p>
            <a href={source.url} target="_blank" rel="noreferrer">
              Open source ↗
            </a>
          </article>
        ))}
      </div>
    </Page>
  );
}

function prettyDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
function offset(days: number) {
  return days === 0
    ? "on"
    : `${Math.abs(days)} days ${days < 0 ? "before" : "after"}`;
}

export default App;
