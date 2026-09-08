import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
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
import {
  catalog as localCatalog,
  catalogById,
  findCatalogPlant,
} from "./shared/catalog";
import type {
  Bed,
  GardenEntry,
  GardenState,
  Phase,
  PlantProblem,
  PlantRecord,
  SourceRecord,
  TimingRule,
  WishlistItem,
} from "./shared/model";
import {
  type PlantingSeason,
  type SowingWindow,
  PLANTING_SEASONS,
  PLANTING_SEASON_LABEL,
  indoorWindowFor,
  seasonOfWindow,
  sowingActionLabel,
  sowingLabel,
  sowingWindowsFor,
} from "./shared/seasons";
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
import {
  actualHarvestPosition,
  actualTimelineForEntry,
  frostPosition,
  plantedDatePosition,
  sowingLanesForEntry,
} from "./shared/timing";
import styles from "./App.module.css";
import {
  ChevronIcon,
  CloseIcon,
  MenuIcon,
  TickIcon,
  WishlistIcon,
  PencilIcon,
  PlannerIcon,
  QuestionIcon,
  SettingsIcon,
  ShovelIcon,
  SnowflakeIcon,
  SourcesIcon,
  SproutNavIcon,
  TodayTickIcon,
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

/** Where the guideline and an actual planting date agree on a slot, the
 * plain color still applies — that agreement is the point. Where they
 * disagree, whichever timeline has a phase here "wins" the slot's display,
 * marked as either guideline-only (tinted, dashed) or actual-only (actual).
 * "Tint" is the same treatment Undecided uses, and for the same reason: a
 * dashed outline alone is too quiet at 14px to read as a shape. */
function combinedSlotPhase(
  guidePhase: Phase | null,
  actualPhase: Phase | null,
): { phase: Phase | null; variant: "" | "Tint" | "Actual" } {
  if (guidePhase === actualPhase) return { phase: guidePhase, variant: "" };
  if (actualPhase) return { phase: actualPhase, variant: "Actual" };
  return { phase: guidePhase, variant: "Tint" };
}
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
// The row shows the species rather than days to maturity: the pills already
// draw the timing, so the number only repeated them. A hand-added plant may
// match the catalog by name even without a plantId; if neither finds it, the
// line is simply left out.
const entrySpecies = (entry: GardenEntry): string | undefined =>
  (entry.plantId
    ? catalogById.get(entry.plantId)
    : findCatalogPlant(entry.name)
  )?.scientificName;
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
          <NavLink to="/wishlist">
            <span className={styles.navIcon} aria-hidden="true">
              <WishlistIcon size={20} />
            </span>
            <span>Wish list</span>
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
          <Route path="/wishlist" element={<WishList />} />
          <Route path="/plants" element={<PlantLibrary />} />
          <Route path="/plants/:slug" element={<PlantDetail />} />
          <Route path="/plants/:slug/:cultivarId" element={<VarietyDetail />} />
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
  back,
}: {
  eyebrow?: React.ReactNode;
  title?: string;
  intro?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  back?: { to: string; label: string };
}) {
  return (
    <main className={`${styles.page} ${className ?? ""}`}>
      {back && (
        <Link className={`${styles.button} ${styles.backLink}`} to={back.to}>
          <ChevronIcon direction="left" size={12} />
          {back.label}
        </Link>
      )}
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
  const { state, loading, saving, notice, noticeTone, dismissNotice, save } =
    useGarden();
  const [dialog, setDialog] = useState<"plant" | "bed" | null>(null);
  // The id, not the bed: a copy of the bed would go on describing a bed the
  // garden no longer has, leaving its settings panel open over nothing.
  const [editingBedId, setEditingBedId] = useState<string | null>(null);
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
  const frostMarks = state.garden.showFrostMarks !== false;
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
  // Same half-month-slot fraction math as frostPosition, but against the
  // browser's own local date rather than a stored ISO string — "today"
  // means today where the gardener is sitting, not in UTC.
  const todayDay = now.getDate();
  const todayDaysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const todayFraction =
    todayDay > 15
      ? (todayDay - 15.5) / (todayDaysInMonth - 15)
      : (todayDay - 0.5) / 15;
  const selectedEntry = state.entries.find(
    (entry) => entry.id === selectedEntryId,
  );
  // Looked up fresh on every draw. Once the bed is gone from the garden — by
  // this device or another one — there is nothing to find and the panel goes
  // with it, instead of lingering over a bed that cannot be removed twice.
  const editingBed = state.beds.find((bed) => bed.id === editingBedId) ?? null;
  return (
    <Page className={styles.plannerPage}>
      <h1 className={styles.srOnly}>My Garden Planting Calendar</h1>
      {notice && (
        <div
          className={`${styles.toast} ${noticeTone === "saved" ? styles.toastSaved : styles.toastProblem}`}
          role="status"
          aria-live="polite"
        >
          <span>{notice}</span>
          {/* Only a problem waits to be read; "Saved" has already gone. */}
          {noticeTone === "problem" && (
            <button
              type="button"
              className={styles.toastDismiss}
              aria-label="Dismiss message"
              onClick={dismissNotice}
            >
              <CloseIcon size={12} />
            </button>
          )}
        </div>
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
              className={`${styles.halfHead} ${slot === currentSlot ? `${styles.currentHead} ${styles.todayHead}` : ""} ${slot === last || slot === first ? styles.frostHead : ""}`}
              style={
                {
                  "--frost-pos": frostFractionForSlot(slot),
                } as CSSProperties
              }
              key={`half-${slot}`}
            >
              {slot === currentSlot && (
                <TodayTickIcon
                  size={12}
                  className={styles.todayFlake}
                  style={{ "--today-pos": todayFraction } as CSSProperties}
                />
              )}
              {frostMarks && (slot === last || slot === first) ? (
                <SnowflakeIcon size={18} className={styles.frostFlake} />
              ) : slot % 2 === 0 ? (
                "E"
              ) : (
                "L"
              )}
            </div>
          ))}
          <div
            className={styles.todayLine}
            style={
              {
                "--today-slot": currentSlot + todayFraction,
              } as CSSProperties
            }
          />
          {[lastFrostPos, firstFrostPos].map((pos, index) =>
            frostMarks &&
            Number.isFinite(pos.slot) &&
            Number.isFinite(pos.fraction) ? (
              <div
                className={styles.frostLine}
                style={
                  {
                    "--frost-slot": pos.slot + pos.fraction,
                  } as CSSProperties
                }
                key={`frost-line-${index}`}
              />
            ) : null,
          )}
          {groups.map((group) => (
            <div className={styles.calendarGroup} key={group.id}>
              {group.label && (
                <div className={styles.groupRow} style={group.style}>
                  {group.bed ? (
                    <button
                      type="button"
                      className={styles.groupRowName}
                      onClick={() => setEditingBedId(group.bed!.id)}
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
                const lanes = sowingLanesForEntry(entry, state.garden);
                /* The overlay measures one logged date against one timeline,
                   so it belongs to a plant sown once. A row with a lane per
                   sowing carries a single date and several sowings, and
                   picking which sowing it meant would shift the wrong crop. */
                const actualTimeline =
                  state.garden.showPillPredictions && lanes.length === 1
                    ? actualTimelineForEntry(entry, state.garden)
                    : null;
                const pinPos = state.garden.showPlantedMarkers
                  ? plantedDatePosition(entry)
                  : null;
                const flagPos = state.garden.showPlantedMarkers
                  ? actualHarvestPosition(entry, state.garden)
                  : null;
                const editLabel = `Edit ${entry.name}${entry.variety ? ` — ${entry.variety}` : ""}`;
                return (
                  <div className={styles.calendarRow} key={entry.id}>
                    <div className={styles.stickyPlant}>
                      <div className={styles.plantRowTitle}>
                        <strong>{entry.name}</strong>
                        {entry.variety ? (
                          <span className={styles.rowVariety}>
                            {entry.variety}
                          </span>
                        ) : null}
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
                    {/* A pill's base look comes from status — Planted stays
                        solid, Will plant is transparent and slashed, Undecided
                        is dashed — unless a logged planting date puts a
                        guideline/actual overlay on this specific slot, which
                        always wins since it reflects a real date comparison
                        rather than the plant's general status. */}
                    {(() => {
                      const statusVariant: "" | "Slashed" | "Tint" =
                        entry.status === "willplant"
                          ? "Slashed"
                          : entry.status === "undecided"
                            ? "Tint"
                            : "";
                      return Array.from({ length: 24 }, (_, index) => (
                        <div
                          className={`${styles.slotCell} ${index === currentSlot ? styles.currentColumn : ""}`}
                          data-slot={index}
                          /* Read by the stylesheet: a cell holding two
                             sowings splits its height between them rather
                             than letting one paint over the other. */
                          data-lanes={lanes.length}
                          key={index}
                        >
                          {lanes.map((lane, laneIndex) => {
                            const overlay = actualTimeline
                              ? combinedSlotPhase(
                                  lane.slots[index].phase,
                                  actualTimeline[index].phase,
                                )
                              : {
                                  phase: lane.slots[index].phase,
                                  variant: "" as const,
                                };
                            const variant = overlay.variant || statusVariant;
                            return (
                              <span
                                key={lane.sowing ?? laneIndex}
                                title={
                                  overlay.phase
                                    ? `${phaseLabels[overlay.phase]}${lane.sowing ? ` — ${sowingLabel(lane.sowing)}` : ""}${overlay.variant === "Tint" ? " (guideline)" : overlay.variant === "Actual" ? " (actual)" : ""}`
                                    : undefined
                                }
                                className={`${styles.pill} ${
                                  overlay.phase
                                    ? styles[`${overlay.phase}${variant}`]
                                    : ""
                                }`}
                              />
                            );
                          })}
                          {pinPos && index === pinPos.slot && (
                            <span
                              className={styles.plantedPin}
                              style={
                                {
                                  "--marker-pos": pinPos.fraction,
                                } as CSSProperties
                              }
                              title={`Planted ${prettyDate(entry.plantedDate!)}`}
                            >
                              <img
                                src="/icons/status-planted.png"
                                alt=""
                                width={12}
                                height={12}
                              />
                            </span>
                          )}
                          {flagPos && index === flagPos.slot && (
                            <span
                              className={styles.harvestFlag}
                              style={
                                {
                                  "--marker-pos": flagPos.fraction,
                                } as CSSProperties
                              }
                              title={`Harvest starts ${prettyDate(flagPos.date)}`}
                            >
                              <img
                                src="/icons/harvest-flag.png"
                                alt=""
                                width={12}
                                height={14}
                              />
                            </span>
                          )}
                        </div>
                      ));
                    })()}
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
          // Keyed by bed, so opening a different bed starts from that bed's
          // own name, colour and un-armed Remove rather than the last one's.
          key={editingBed.id}
          bed={editingBed}
          state={state}
          close={() => setEditingBedId(null)}
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
      {/* The two frost dates read as a pair, because that is what they are —
          the ends of the same season — with its length underneath as the
          figure they produce. Tiles, not bars: the same size as At a glance
          above, so this section stops taking half the panel and the legend
          stays on screen. */}
      <div className={styles.seasonRow}>
        <p className={styles.seasonFact}>
          <b>{prettyDate(state.garden.lastFrost)}</b>
          <span>Last frost</span>
        </p>
        <p className={styles.seasonFact}>
          <b>{prettyDate(state.garden.firstFrost)}</b>
          <span>First frost</span>
        </p>
        <p className={`${styles.seasonFact} ${styles.seasonLength}`}>
          <b>{seasonDays > 0 ? `${seasonDays} days` : "--"}</b>
          <span>
            {seasonDays > 0 ? "Season length" : "Check your frost dates"}
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
        <span>
          <TodayTickIcon
            size={14}
            className={`${styles.legendIcon} ${styles.legendToday}`}
          />
          Today
        </span>
        {state.garden.showPillPredictions && (
          <>
            <span>
              <i className={styles.harvestTint} />
              Guideline only — no planting date logged there yet
            </span>
            <span>
              <i className={styles.harvestActual} />
              Actual — from a logged planting date
            </span>
          </>
        )}
        {state.garden.showPlantedMarkers && (
          <>
            <span>
              <span className={styles.legendPin}>
                <img
                  src="/icons/status-planted.png"
                  alt=""
                  width={12}
                  height={12}
                />
              </span>
              Planted date
            </span>
            <span>
              <span className={styles.legendFlag}>
                <img
                  src="/icons/harvest-flag.png"
                  alt=""
                  width={12}
                  height={14}
                />
              </span>
              Harvest day
            </span>
          </>
        )}
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
  const [qty, setQty] = useState<number | "">(entry.qty);
  const [status, setStatus] = useState(entry.status);
  const [bedId, setBedId] = useState(entry.bedId ?? "");
  const [plantedDate, setPlantedDate] = useState(entry.plantedDate ?? "");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const finalQty = clampQty(qty);
    await save({
      ...state,
      entries: state.entries.map((item) =>
        item.id === entry.id
          ? {
              ...item,
              qty: finalQty,
              status,
              bedId: bedId || null,
              plantedDate: plantedDate || null,
            }
          : item,
      ),
    });
    close();
  };

  return (
    <Dialog title={`${entry.name} details`} close={close}>
      <p className={styles.sheetSubtitle}>
        {[
          entry.variety || "No variety",
          entrySpecies(entry),
          entry.dtm || "Timing not reviewed",
        ]
          .filter(Boolean)
          .join(" · ")}
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
              onChange={(event) => {
                const raw = event.target.value;
                setQty(raw === "" ? "" : Number(raw));
              }}
              onBlur={() => setQty(clampQty(qty))}
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
          {/* Logging the date itself never depends on whether either
              display setting is on — those only control whether the
              calendar shows anything from it, not whether it can be
              recorded at all. */}
          <label className={styles.sheetBed}>
            Actual planting date
            <input
              type="date"
              value={plantedDate}
              onChange={(event) => setPlantedDate(event.target.value)}
            />
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

// Sentinel for the "type your own" choice; not a variety name a gardener would use.
const OWN_VARIETY = "__own__";

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
  // "Something else" keeps its own text so switching back to a listed variety does not lose it.
  const [ownVariety, setOwnVariety] = useState("");
  const [qty, setQty] = useState<number | "">(1);
  const [bedId, setBedId] = useState(
    () => state.beds.find((bed) => bed.id === "unassigned")?.id ?? "",
  );
  const selected = localCatalog.find((plant) => plant.id === plantId);
  const plantKey =
    plantId === "custom" ? name.trim() : (selected?.commonName ?? "");
  // Varieties this gardener has typed before, kept per plant so they come back next time.
  const savedVarieties = state.customVarieties[plantKey] ?? [];
  // EC 871 groups its recommendations by horticultural type, which is how gardeners shop.
  const varietyGroups = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const cultivar of selected?.cultivars ?? []) {
      // Varieties the publications do not list still belong somewhere the gardener can find them.
      const group = cultivar.type?.value ?? "Other";
      groups.set(group, [...(groups.get(group) ?? []), cultivar.name]);
    }
    return [...groups];
  }, [selected]);
  const choosingOwn = variety === OWN_VARIETY;
  const resolvedVariety = (choosingOwn ? ownVariety : variety).trim();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const custom = plantId === "custom";
    const entry: GardenEntry = {
      id: crypto.randomUUID(),
      plantId: custom ? null : plantId,
      name: custom ? name : selected!.commonName,
      variety: resolvedVariety || null,
      dtm: custom ? null : (selected!.daysToMaturity?.value ?? null),
      qty: clampQty(qty),
      bedId: bedId || null,
      status: "willplant",
      sortOrder: state.entries.length,
    };
    // A variety the gardener typed is remembered for this plant, so it is a pick next time.
    const isNew =
      choosingOwn &&
      resolvedVariety.length > 0 &&
      !savedVarieties.includes(resolvedVariety) &&
      !varietyGroups.some(([, names]) => names.includes(resolvedVariety));
    const customVarieties = isNew
      ? {
          ...state.customVarieties,
          [plantKey]: [...savedVarieties, resolvedVariety],
        }
      : state.customVarieties;
    await save({
      ...state,
      entries: [...state.entries, entry],
      customVarieties,
    });
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
                setOwnVariety("");
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
            <select
              value={variety}
              onChange={(event) => setVariety(event.target.value)}
            >
              <option value="">No variety</option>
              {savedVarieties.length > 0 && (
                <optgroup label="Yours">
                  {savedVarieties.map((name) => (
                    <option value={name} key={name}>
                      {name}
                    </option>
                  ))}
                </optgroup>
              )}
              {varietyGroups.map(([group, names]) => (
                <optgroup label={group} key={group}>
                  <option value={group}>{group} — any</option>
                  {names.map((name) => (
                    <option value={name} key={name}>
                      {name}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value={OWN_VARIETY}>Something else…</option>
            </select>
          </span>
        </label>
        {choosingOwn && (
          <label>
            Your variety
            <input
              autoFocus
              value={ownVariety}
              onChange={(event) => setOwnVariety(event.target.value)}
              placeholder="Salad mix"
            />
          </label>
        )}
        <div className={styles.twoCols}>
          <label>
            Quantity
            <input
              type="number"
              min="1"
              max="999"
              value={qty}
              onChange={(event) => {
                const raw = event.target.value;
                setQty(raw === "" ? "" : Number(raw));
              }}
              onBlur={() => setQty(clampQty(qty))}
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
  // A tap that seems not to have landed gets tapped again. Without this, the
  // second one sends a save built from the state the first one already
  // replaced, and the server rightly refuses it.
  const [busy, setBusy] = useState(false);
  const planted = state.entries.filter((entry) => entry.bedId === bed.id);
  const rehome = rehomeTargetFor(state, bed.id);

  // Closes only when the garden really changed. When a save is refused the
  // panel stays put, with the banner saying why, so the work can be tried
  // again rather than silently lost.
  const commit = async (next: GardenState) => {
    if (busy) return;
    setBusy(true);
    try {
      await save(next);
      close();
    } catch {
      // useGarden has already put the reason on screen.
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await commit({
      ...state,
      beds: state.beds.map((item) =>
        item.id === bed.id
          ? { ...item, label, color: bedFallbackHex(colorKey), colorKey }
          : item,
      ),
    });
  };

  const remove = () =>
    commit({
      ...state,
      beds: state.beds.filter((item) => item.id !== bed.id),
      // Every plant keeps its place in the garden; only its bed changes.
      entries: state.entries.map((entry) =>
        entry.bedId === bed.id
          ? { ...entry, bedId: rehome?.id ?? null }
          : entry,
      ),
    });

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
        <button className={styles.primary} disabled={busy}>
          {busy ? "Saving…" : "Save bed"}
        </button>
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
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmingDelete(false)}
              >
                Keep bed
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                disabled={busy}
                onClick={() => void remove()}
              >
                {busy ? "Removing…" : "Remove bed"}
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

/* ============================================================
   Wish list

   Three ways in, one way to add. A-Z is for browsing names, and the two date
   views answer the questions a gardener actually asks: what can go in the
   ground now, and when would I be eating it. Whichever way you arrive, a row
   is the same three things - the name, how long it takes, and one button per
   sowing window carrying the dates in and the dates out.

   Seasons here come from the gardener's calendar in shared/seasons.ts (whole
   months), never from the theme's astronomical ones.
   ============================================================ */

type WishView = "name" | "sow" | "harvest";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTH_INITIALS = [
  "J",
  "F",
  "M",
  "A",
  "M",
  "J",
  "J",
  "A",
  "S",
  "O",
  "N",
  "D",
];

/** A month counts as busy when something covers at least a week of it. */
const PRESENT = 0.22;

/* The gardener's own date, not UTC's: an evening in Oregon is still today. */
function localToday() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function monthCoverage(range: { start: string; end: string }) {
  const start = Date.parse(`${range.start}T12:00:00Z`);
  const end = Date.parse(`${range.end}T12:00:00Z`);
  const year = new Date(start).getUTCFullYear();
  return Array.from({ length: 12 }, (_, month) => {
    const from = Date.UTC(year, month, 1);
    const to = Date.UTC(year, month + 1, 1);
    const low = Math.max(from, start);
    const high = Math.min(to, end);
    return high > low ? (high - low) / (to - from) : 0;
  });
}

function shortDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return `${MONTH_NAMES[date.getUTCMonth()].slice(0, 3)} ${date.getUTCDate()}`;
}
const shortRange = (range: { start: string; end: string }) =>
  `${shortDate(range.start)}\u2013${shortDate(range.end)}`;

interface WishRow {
  plant: PlantRecord;
  windows: SowingWindow[];
  indoor: { start: string; end: string } | null;
}

function WishList() {
  const { state, loading, saving, notice, noticeTone, dismissNotice, save } =
    useGarden();
  const [view, setView] = useState<WishView>("name");
  const [query, setQuery] = useState("");
  const [monthFilter, setMonthFilter] = useState<number[]>([]);
  const [letterFilter, setLetterFilter] = useState<string | null>(null);
  const [seasonFilter, setSeasonFilter] = useState<PlantingSeason[]>([]);
  const [typeFilter, setTypeFilter] = useState<PlantCategory[]>([]);
  const [listOpen, setListOpen] = useState(false);

  const garden = state?.garden;
  const rows = useMemo<WishRow[]>(() => {
    if (!garden) return [];
    return localCatalog.map((plant) => ({
      plant,
      windows: sowingWindowsFor(plant, garden),
      indoor: indoorWindowFor(plant, garden),
    }));
  }, [garden]);

  const wishlist = state?.wishlist ?? [];
  const wishKeys = useMemo(
    () =>
      new Set(wishlist.map((item) => `${item.plantId}|${item.windowIndex}`)),
    [wishlist],
  );
  /* Plants already in the planner. Wanting a second sowing of something you
     grow is perfectly reasonable, so this says so rather than blocking it. */
  const planned = useMemo(
    () =>
      new Set(
        (state?.entries ?? [])
          .map((entry) => entry.plantId)
          .filter((id): id is string => Boolean(id)),
      ),
    [state],
  );

  const letters = useMemo(() => {
    const seen: string[] = [];
    for (const row of rows) {
      const initial = row.plant.commonName.charAt(0).toUpperCase();
      if (!seen.includes(initial)) seen.push(initial);
    }
    return seen.sort();
  }, [rows]);

  // Which months the view cares about: when things go in, or when they come out.
  const rowMonths = (row: WishRow) => {
    const ranges =
      view === "harvest"
        ? row.windows.map((window) => window.harvest).filter((r) => r !== null)
        : row.windows.map((window) => ({
            start: window.start,
            end: window.end,
          }));
    const busy = new Set<number>();
    for (const range of ranges)
      monthCoverage(range).forEach((share, month) => {
        if (share >= PRESENT) busy.add(month);
      });
    return busy;
  };

  const monthTotals = useMemo(() => {
    const totals = new Array(12).fill(0);
    for (const row of rows)
      for (const month of rowMonths(row)) totals[month] += 1;
    return totals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, view]);

  const visible = rows.filter((row) => {
    if (
      query &&
      !row.plant.commonName.toLowerCase().includes(query.toLowerCase())
    )
      return false;
    if (typeFilter.length && !typeFilter.includes(row.plant.category))
      return false;
    if (view === "name")
      return (
        !letterFilter ||
        row.plant.commonName.charAt(0).toUpperCase() === letterFilter
      );
    if (monthFilter.length) {
      const months = rowMonths(row);
      if (!monthFilter.some((month) => months.has(month))) return false;
    }
    /* Match the season a window is filed under, not every season it touches.
       Garlic runs 11 Oct to 6 Dec, so it brushes winter — but it is a fall
       planting, and filtering for winter should not return a group headed
       "Fall planting". The dates on the button still say it runs into
       December. */
    if (
      seasonFilter.length &&
      !row.windows.some((window) =>
        seasonFilter.includes(seasonOfWindow(window)),
      )
    )
      return false;
    return true;
  });

  const firstSow = (row: WishRow) => row.windows[0]?.start ?? "";
  const firstHarvest = (row: WishRow) =>
    row.windows
      .map((window) => window.harvest?.start)
      .filter((value): value is string => Boolean(value))
      .sort()[0];

  const groups: Array<{ key: string; label: string; rows: WishRow[] }> = [];
  if (view === "name") {
    const sorted = [...visible].sort((a, b) =>
      a.plant.commonName.localeCompare(b.plant.commonName),
    );
    for (const letter of letters) {
      const inGroup = sorted.filter(
        (row) => row.plant.commonName.charAt(0).toUpperCase() === letter,
      );
      if (inGroup.length)
        groups.push({ key: letter, label: letter, rows: inGroup });
    }
  } else if (view === "sow") {
    const sorted = [...visible].sort((a, b) =>
      firstSow(a).localeCompare(firstSow(b)),
    );
    for (const season of PLANTING_SEASONS) {
      const inGroup = sorted.filter(
        (row) => row.windows[0] && seasonOfWindow(row.windows[0]) === season,
      );
      if (inGroup.length)
        groups.push({
          key: season,
          label: `${PLANTING_SEASON_LABEL[season]} planting`,
          rows: inGroup,
        });
    }
  } else {
    const sorted = [...visible].sort((a, b) =>
      (firstHarvest(a) ?? "9").localeCompare(firstHarvest(b) ?? "9"),
    );
    for (let month = 0; month < 12; month += 1) {
      const inGroup = sorted.filter((row) => {
        const first = firstHarvest(row);
        return first
          ? new Date(`${first}T12:00:00Z`).getUTCMonth() === month
          : false;
      });
      if (inGroup.length)
        groups.push({
          key: `m${month}`,
          label: `First picks in ${MONTH_NAMES[month]}`,
          rows: inGroup,
        });
    }
    const undated = sorted.filter((row) => !firstHarvest(row));
    if (undated.length)
      groups.push({
        key: "none",
        label: "Picking dates not recorded",
        rows: undated,
      });
  }

  const toggleWish = async (plant: PlantRecord, window: SowingWindow) => {
    if (!state) return;
    const key = `${plant.id}|${window.index}`;
    const next = wishKeys.has(key)
      ? wishlist.filter((item) => `${item.plantId}|${item.windowIndex}` !== key)
      : [
          ...wishlist,
          {
            id: crypto.randomUUID(),
            plantId: plant.id,
            windowIndex: window.index,
            addedAt: localToday(),
          } satisfies WishlistItem,
        ];
    await save({ ...state, wishlist: next });
  };

  const toggleMonth = (month: number) => {
    setMonthFilter((current) =>
      current.includes(month)
        ? current.filter((value) => value !== month)
        : [...current, month],
    );
    setSeasonFilter([]);
  };
  const toggleType = (category: PlantCategory) => {
    setTypeFilter((current) =>
      current.includes(category)
        ? current.filter((value) => value !== category)
        : CATEGORY_ORDER.filter(
            (value) => value === category || current.includes(value),
          ),
    );
  };
  const toggleSeason = (season: PlantingSeason) => {
    setSeasonFilter((current) =>
      current.includes(season)
        ? current.filter((value) => value !== season)
        : PLANTING_SEASONS.filter(
            (value) => value === season || current.includes(value),
          ),
    );
    setMonthFilter([]);
  };
  const clearFilters = () => {
    setMonthFilter([]);
    setSeasonFilter([]);
    setTypeFilter([]);
  };

  const changeView = (next: WishView) => {
    setView(next);
    // A filter from one view means nothing in the next.
    setMonthFilter([]);
    setSeasonFilter([]);
    setLetterFilter(null);
  };

  /* What the summary line says. Seasons and months are the same question, so
     only one of them can be on; type is a separate one and joins whichever. */
  const timeLabel = seasonFilter.length
    ? PLANTING_SEASONS.filter((season) => seasonFilter.includes(season))
        .map((season) => PLANTING_SEASON_LABEL[season])
        .join(" + ")
    : monthFilter
        .slice()
        .sort((a, b) => a - b)
        .map((month) => MONTH_NAMES[month])
        .join(" + ");
  const typeLabel = CATEGORY_ORDER.filter((category) =>
    typeFilter.includes(category),
  )
    .map((category) => categoryLabels[category])
    .join(" + ");
  const activeFilters =
    monthFilter.length + seasonFilter.length + typeFilter.length > 0;

  const thisMonth = new Date().getMonth();

  if (loading || !state || !garden)
    return <main className={styles.loading}>Opening the garden…</main>;

  return (
    <Page className={styles.wishPage}>
      <div className={styles.wishTools}>
        <div className={styles.wishToolRow}>
          <input
            className={styles.wishSearch}
            type="search"
            aria-label="Find a plant"
            placeholder="Find a plant…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {view !== "name" && (
            <button
              className={styles.wishNow}
              type="button"
              aria-pressed={monthFilter.includes(thisMonth)}
              onClick={() => {
                toggleMonth(thisMonth);
              }}
            >
              Now
            </button>
          )}
        </div>
        <div className={styles.wishViews} role="group" aria-label="Search by">
          {(
            [
              ["name", "A\u2013Z"],
              ["sow", "Sow date"],
              ["harvest", "Harvest date"],
            ] as Array<[WishView, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={styles.wishView}
              aria-pressed={view === id}
              onClick={() => changeView(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {view === "name" ? (
          <div
            className={styles.wishKeys}
            role="group"
            aria-label="Jump to a letter"
            style={{ "--keys": letters.length } as CSSProperties}
          >
            {letters.map((letter) => (
              <button
                key={letter}
                type="button"
                className={styles.wishKey}
                aria-pressed={letterFilter === letter}
                onClick={() =>
                  setLetterFilter(letterFilter === letter ? null : letter)
                }
              >
                {letter}
              </button>
            ))}
          </div>
        ) : (
          <>
            <div
              className={styles.wishKeys}
              role="group"
              aria-label="Filter by month"
              data-filtering={monthFilter.length > 0 ? "yes" : undefined}
              style={{ "--keys": 12 } as CSSProperties}
            >
              {MONTH_INITIALS.map((initial, month) => (
                <button
                  key={`${initial}${month}`}
                  type="button"
                  className={`${styles.wishKey} ${
                    monthTotals[month] === 0 ? styles.wishKeyEmpty : ""
                  } ${month === thisMonth ? styles.wishKeyNow : ""}`}
                  aria-pressed={monthFilter.includes(month)}
                  aria-label={`${MONTH_NAMES[month]}, ${monthTotals[month]} ${
                    view === "sow" ? "to sow" : "ready"
                  }`}
                  onClick={() => toggleMonth(month)}
                >
                  {initial}
                </button>
              ))}
            </div>
            <div
              className={styles.wishBand}
              role="group"
              aria-label="Filter by season"
              data-filtering={seasonFilter.length > 0 ? "yes" : undefined}
            >
              {PLANTING_SEASONS.map((season) => (
                <button
                  key={season}
                  type="button"
                  className={styles.wishSeason}
                  data-season={season}
                  aria-pressed={seasonFilter.includes(season)}
                  onClick={() => toggleSeason(season)}
                >
                  {PLANTING_SEASON_LABEL[season]}
                </button>
              ))}
            </div>
          </>
        )}
        <div
          className={styles.wishTypes}
          role="group"
          aria-label="Filter by plant type"
          data-filtering={typeFilter.length > 0 ? "yes" : undefined}
        >
          {CATEGORY_ORDER.map((category) => {
            const count = rows.filter(
              (row) => row.plant.category === category,
            ).length;
            return (
              <button
                key={category}
                type="button"
                className={styles.wishType}
                aria-pressed={typeFilter.includes(category)}
                /* A kind the catalog has none of is shown rather than hidden:
                   the gap is worth knowing about, but there is nothing to
                   filter to, so it does not take a press. */
                disabled={count === 0}
                onClick={() => toggleType(category)}
              >
                {categoryLabels[category]}
                <span className={styles.wishTypeCount}>{count}</span>
              </button>
            );
          })}
        </div>
        {/* With more than one filter on at a time, what is selected has to be
            readable at a glance and clearable in one press. Type and time are
            two different questions, so the line names both when both are on. */}
        {activeFilters ? (
          <p className={styles.wishKeyNote}>
            {typeLabel && <b>{typeLabel}</b>}
            {typeLabel &&
              timeLabel &&
              (view === "sow" ? ", sowing in " : ", ready in ")}
            {!typeLabel &&
              timeLabel &&
              (view === "sow" ? "Sowing in " : "Ready in ")}
            {timeLabel && <b>{timeLabel}</b>}
            <button
              type="button"
              className={styles.wishClearFilters}
              onClick={clearFilters}
            >
              Show all
            </button>
          </p>
        ) : (
          <p className={styles.wishKeyNote}>
            Buttons read <b>sowing dates</b> → <b>picking dates</b>
          </p>
        )}
      </div>

      {notice && noticeTone === "problem" && (
        <div
          className={`${styles.toast} ${styles.toastProblem}`}
          role="status"
          aria-live="polite"
        >
          <span>{notice}</span>
          {noticeTone === "problem" && (
            <button
              type="button"
              className={styles.toastDismiss}
              aria-label="Dismiss message"
              onClick={dismissNotice}
            >
              <CloseIcon size={12} />
            </button>
          )}
        </div>
      )}

      <div className={styles.wishList}>
        {groups.length === 0 && (
          <p className={styles.wishEmpty}>
            {view === "name"
              ? "No plant by that name."
              : view === "sow"
                ? "Nothing in the catalog goes in the ground then."
                : "Nothing in the catalog is ready to pick then."}
          </p>
        )}
        {groups.map((group) => (
          <section key={group.key}>
            <h2
              className={`${styles.wishGroup} ${
                view === "name" ? styles.wishGroupAlpha : ""
              }`}
            >
              {group.label}
              <span className={styles.wishRule} />
              <span className={styles.wishCount}>{group.rows.length}</span>
            </h2>
            {group.rows.map((row) => (
              <article
                key={row.plant.id}
                className={`${styles.wishRow} ${
                  row.windows.some((window) =>
                    wishKeys.has(`${row.plant.id}|${window.index}`),
                  )
                    ? styles.wishRowPicked
                    : ""
                }`}
              >
                <div className={styles.wishRowMain}>
                  <span className={styles.wishNameRow}>
                    <Link
                      className={styles.wishName}
                      to={`/plants/${row.plant.id}`}
                    >
                      {row.plant.commonName}
                    </Link>
                    {planned.has(row.plant.id) && (
                      <span
                        className={styles.wishAlready}
                        title="Already in your planner"
                      >
                        <TickIcon size={9} />
                        <span className={styles.srOnly}>
                          Already in your planner
                        </span>
                      </span>
                    )}
                  </span>
                  <p className={styles.wishMeta}>
                    {row.plant.daysToMaturity?.value ?? "—"}
                  </p>
                </div>
                <div className={styles.wishWindows}>
                  {row.windows.map((window) => {
                    const key = `${row.plant.id}|${window.index}`;
                    const wanted = wishKeys.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        className={styles.wishBtn}
                        data-season={seasonOfWindow(window)}
                        aria-pressed={wanted}
                        title={`${sowingActionLabel(window)} ${shortRange(window)}`}
                        onClick={() => void toggleWish(row.plant, window)}
                      >
                        <span className={styles.wishBtnSeason}>
                          {wanted && <TickIcon size={11} />}
                          {PLANTING_SEASON_LABEL[seasonOfWindow(window)]}
                        </span>
                        <span className={styles.wishBtnDates}>
                          <span>{shortRange(window)}</span>
                          <span className={styles.wishArrow}>→</span>
                          {window.harvest ? (
                            <span>{shortRange(window.harvest)}</span>
                          ) : (
                            <span className={styles.wishNoDate}>no date</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}
          </section>
        ))}
      </div>

      <div className={styles.wishDock}>
        <span className={styles.wishDockCount}>
          <span className={styles.wishDockNumber}>{wishlist.length}</span>
          <span>
            {wishlist.length === 1 ? "plant wanted" : "plants wanted"}
          </span>
        </span>
        <button
          type="button"
          className={styles.primary}
          onClick={() => setListOpen(true)}
        >
          View list
        </button>
      </div>

      {listOpen && (
        <WishDrawer
          state={state}
          close={() => setListOpen(false)}
          save={save}
          saving={saving}
        />
      )}
    </Page>
  );
}

/** The list itself, grouped the two ways it is useful to read it. */
/**
 * The list itself, grouped the two ways it is useful to read it.
 *
 * A wish is not consumed by being acted on: it stays here, and committing it
 * puts an "undecided" plant in the planner. That is what a wish is - a plant
 * you mean to consider this year, not a bed you have promised it. So this
 * list keeps working as a standing record of what you like to grow, and the
 * ticks show how much of it has made it into the planner.
 */
function WishDrawer({
  state,
  close,
  save,
  saving,
}: {
  state: GardenState;
  close: () => void;
  save: (next: GardenState) => Promise<void>;
  saving: boolean;
}) {
  const [grouping, setGrouping] = useState<"sow" | "harvest">("sow");
  const planned = new Set(
    state.entries
      .map((entry) => entry.plantId)
      .filter((id): id is string => Boolean(id)),
  );
  const items = state.wishlist
    .map((item) => {
      const plant = catalogById.get(item.plantId);
      if (!plant) return null;
      const window = sowingWindowsFor(plant, state.garden)[item.windowIndex];
      return window ? { item, plant, window } : null;
    })
    .filter((entry) => entry !== null);

  const remove = async (id: string) =>
    save({
      ...state,
      wishlist: state.wishlist.filter((item) => item.id !== id),
    });

  /* How many of a set you already grow. Wanting a second sowing of something
     is a real thing to want, so this is said out loud rather than blocked. */
  const duplicates = (rows: typeof items) =>
    rows.filter((entry) => planned.has(entry.plant.id));

  /* A wish is spent by being acted on: it becomes a planner entry and leaves
     the list. That keeps the count on the dock meaning "still to decide"
     rather than a running tally of everything ever wanted. */
  const addToPlanner = async (rows: typeof items) => {
    if (rows.length === 0) return;
    const entries: GardenEntry[] = rows.map((entry, index) => ({
      id: crypto.randomUUID(),
      plantId: entry.plant.id,
      name: entry.plant.commonName,
      variety: null,
      dtm: entry.plant.daysToMaturity?.value ?? null,
      qty: 1,
      bedId: null,
      /* Undecided, not "will plant": moving a wish across records that you
         are considering it, and the bed and the commitment come later. */
      status: "undecided",
      sortOrder: state.entries.length + index,
    }));
    const moved = new Set(rows.map((entry) => entry.item.id));
    await save({
      ...state,
      entries: [...state.entries, ...entries],
      wishlist: state.wishlist.filter((item) => !moved.has(item.id)),
    });
  };

  const groups: Array<{ key: string; label: string; rows: typeof items }> = [];
  if (grouping === "sow") {
    for (const season of PLANTING_SEASONS) {
      const rows = items.filter(
        (entry) => seasonOfWindow(entry.window) === season,
      );
      if (rows.length)
        groups.push({
          key: season,
          label: `${PLANTING_SEASON_LABEL[season]} planting`,
          rows,
        });
    }
  } else {
    for (let month = 0; month < 12; month += 1) {
      const rows = items.filter(
        (entry) =>
          entry.window.harvest &&
          new Date(`${entry.window.harvest.start}T12:00:00Z`).getUTCMonth() ===
            month,
      );
      if (rows.length)
        groups.push({
          key: `m${month}`,
          label: `Picking from ${MONTH_NAMES[month]}`,
          rows,
        });
    }
    const undated = items.filter((entry) => !entry.window.harvest);
    if (undated.length)
      groups.push({ key: "none", label: "No picking dates", rows: undated });
  }

  const allDuplicates = duplicates(items);

  return (
    <Dialog title="Your wish list" close={close}>
      <div className={styles.wishViews} role="group" aria-label="Group by">
        {(
          [
            ["sow", "By sow date"],
            ["harvest", "By harvest date"],
          ] as Array<["sow" | "harvest", string]>
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={styles.wishView}
            aria-pressed={grouping === id}
            onClick={() => setGrouping(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <p className={styles.wishEmpty}>
          Nothing yet. Tap a season on any plant to want it.
        </p>
      ) : (
        groups.map((group) => {
          const repeats = duplicates(group.rows);
          return (
            <section key={group.key}>
              <h3 className={styles.wishGroup}>
                {group.label}
                <span className={styles.wishRule} />
                <span className={styles.wishCount}>{group.rows.length}</span>
              </h3>
              {group.rows.map((entry) => (
                <div className={styles.wishSaved} key={entry.item.id}>
                  <span>
                    <span className={styles.wishNameRow}>
                      <span className={styles.wishName}>
                        {entry.plant.commonName}
                      </span>
                      {planned.has(entry.plant.id) && (
                        <span
                          className={styles.wishAlready}
                          title="Already in your planner"
                        >
                          <TickIcon size={9} />
                          <span className={styles.srOnly}>
                            Already in your planner
                          </span>
                        </span>
                      )}
                    </span>
                    <span className={styles.wishMeta}>
                      {grouping === "sow"
                        ? `${sowingActionLabel(entry.window)} ${shortRange(entry.window)}`
                        : entry.window.harvest
                          ? `Ready ${shortRange(entry.window.harvest)}`
                          : "No picking dates recorded"}
                    </span>
                  </span>
                  <button
                    type="button"
                    className={styles.wishRemove}
                    aria-label={`Take ${entry.plant.commonName} off the list`}
                    disabled={saving}
                    onClick={() => void remove(entry.item.id)}
                  >
                    <CloseIcon size={12} />
                  </button>
                </div>
              ))}
              {/* The scope follows whichever grouping you are reading. */}
              <button
                type="button"
                className={styles.wishGroupAdd}
                disabled={saving}
                onClick={() => void addToPlanner(group.rows)}
              >
                {`Add ${group.rows.length} to the planner`}
              </button>
              {repeats.length > 0 && (
                <p className={styles.wishHeadsUp}>
                  {repeats.length === 1
                    ? `${repeats[0].plant.commonName} is already in your planner — adding it again gives you a second sowing.`
                    : `${repeats.length} of these are already in your planner — adding them again gives you a second sowing of each.`}
                </p>
              )}
            </section>
          );
        })
      )}
      {/* With one group the group's own heads-up already said this; repeating
          it under the button reads as two different warnings. */}
      {allDuplicates.length > 0 && groups.length > 1 && (
        <p className={styles.wishHeadsUp}>
          {allDuplicates.length === 1
            ? `1 of these is already in your planner.`
            : `${allDuplicates.length} of these are already in your planner.`}
        </p>
      )}
      {items.length > 0 && (
        <button
          type="button"
          className={styles.primary}
          disabled={saving}
          onClick={() => void addToPlanner(items)}
        >
          {`Add all ${items.length} to the planner`}
        </button>
      )}
    </Dialog>
  );
}

function PlantLibrary() {
  const [plants, setPlants] = useState<PlantRecord[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  // Opens on plants: 253 variety cards is a wall to land on, and the plant you want is the
  // shorter way in. Varieties are a toggle away, and search reaches them from either view.
  const [view, setView] = useState<"varieties" | "plants">("plants");
  // Same jump-to-letter the wish list uses, so the two lists behave alike.
  const [letter, setLetter] = useState<string | null>(null);
  useEffect(() => {
    api.catalog().then(setPlants);
  }, []);
  const varieties = useMemo(
    () =>
      plants
        .flatMap((plant) =>
          plant.cultivars.map((cultivar) => ({ plant, cultivar })),
        )
        .filter(
          ({ plant, cultivar }) =>
            (category === "all" || plant.category === category) &&
            `${cultivar.name} ${cultivar.type?.value ?? ""} ${plant.commonName} ${plant.scientificName ?? ""}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) =>
          a.cultivar.name.localeCompare(b.cultivar.name, undefined, {
            sensitivity: "base",
          }),
        ),
    [plants, category, query],
  );
  const initialOf = (name: string) => name.charAt(0).toUpperCase();
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
  // One card list whichever view is showing, so the letter keys and headings are written once.
  const cards = useMemo(
    () =>
      view === "varieties"
        ? varieties.map((entry) => ({
            key: `${entry.plant.id}-${entry.cultivar.id}`,
            name: entry.cultivar.name,
            to: `/plants/${entry.plant.id}/${entry.cultivar.id}`,
            chip: entry.cultivar.type?.value ?? entry.plant.commonName,
            sub: entry.plant.commonName,
            body: entry.plant.summary,
            foot:
              entry.cultivar.daysToMaturity?.value ??
              entry.plant.daysToMaturity?.value ??
              "Days to maturity not available",
          }))
        : filtered.map((plant) => ({
            key: plant.id,
            name: plant.commonName,
            to: `/plants/${plant.id}`,
            chip: plant.category,
            sub: plant.scientificName ?? "",
            body: plant.summary,
            foot: `${
              plant.cultivars.length
                ? `${plant.cultivars.length} varieties`
                : "No varieties listed"
            }${plant.daysToMaturity ? ` · ${plant.daysToMaturity.value}` : ""}`,
          })),
    [view, varieties, filtered],
  );
  const letters = useMemo(() => {
    const seen: string[] = [];
    for (const card of cards) {
      const initial = initialOf(card.name);
      if (!seen.includes(initial)) seen.push(initial);
    }
    return seen.sort();
  }, [cards]);
  const visible = letter
    ? cards.filter((card) => initialOf(card.name) === letter)
    : cards;
  const grouped = useMemo(() => {
    const out: { letter: string; cards: typeof visible }[] = [];
    for (const card of visible) {
      const initial = initialOf(card.name);
      const last = out[out.length - 1];
      if (last && last.letter === initial) last.cards.push(card);
      else out.push({ letter: initial, cards: [card] });
    }
    return out;
  }, [visible]);
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
            onChange={(event) => {
              setQuery(event.target.value);
              setLetter(null);
            }}
          />
          <span className={styles.selectWrap}>
            <select
              aria-label="Show varieties or plants"
              value={view}
              onChange={(event) => {
                setView(event.target.value as "varieties" | "plants");
                // A letter with plants under it may have no varieties under it, and the other
                // way round, so the jump-to-letter resets when the list changes beneath it.
                setLetter(null);
              }}
            >
              <option value="varieties">Varieties</option>
              <option value="plants">Plants</option>
            </select>
          </span>
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
      <div
        className={styles.wishKeys}
        role="group"
        aria-label="Jump to a letter"
        data-filtering={letter ? "" : undefined}
        style={{ "--keys": letters.length } as CSSProperties}
      >
        {letters.map((key) => (
          <button
            key={key}
            type="button"
            className={styles.wishKey}
            aria-pressed={letter === key}
            onClick={() => setLetter(letter === key ? null : key)}
          >
            {key}
          </button>
        ))}
      </div>
      <p className={styles.muted}>
        {visible.length} {view === "varieties" ? "varieties" : "plants"}
        {view === "varieties" &&
          ` across ${new Set(varieties.map(({ plant }) => plant.id)).size} plants`}
        {query ? ` matching “${query}”` : ""}
        {letter ? ` starting with ${letter}` : ""}.
      </p>
      {grouped.map((group) => (
        <section key={group.letter}>
          <h2 className={`${styles.wishGroup} ${styles.wishGroupAlpha}`}>
            {group.letter}
            <span className={styles.wishRule} />
            <span className={styles.wishCount}>{group.cards.length}</span>
          </h2>
          <div className={styles.cardGrid}>
            {group.cards.map((card) => (
              <Link className={styles.plantCard} to={card.to} key={card.key}>
                <span className={styles.chip}>{card.chip}</span>
                <h3>{card.name}</h3>
                <em>{card.sub}</em>
                <p>{card.body}</p>
                <span className={styles.reviewed}>{card.foot}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </Page>
  );
}

// Varieties read better grouped the way the publications group them — romaine, cherry, paste —
// than as one long alphabetical run.
function groupCultivars(cultivars: PlantRecord["cultivars"]) {
  const groups = new Map<string, PlantRecord["cultivars"]>();
  for (const cultivar of cultivars) {
    const group = cultivar.type?.value ?? "Other";
    groups.set(group, [...(groups.get(group) ?? []), cultivar]);
  }
  return [...groups];
}

// Common names are plural for some crops. "Grown like any other carrots" reads wrong, so prose
// uses the singular the catalog's own lookup already trims to.
function singular(name: string) {
  return name.toLowerCase().replace(/s$/, "");
}

// Stands alone so the drawing that replaces it has one place to go.
const INCOMPATIBLE_MARK = "🚫";

const problemIcons: Record<PlantProblem["kind"], string> = {
  pest: "🐛",
  disease: "🦠",
  disorder: "⚠",
};

function CompanionPanel({
  title,
  empty,
  icon,
  relationships,
}: {
  title: string;
  empty: string;
  icon: string;
  relationships: PlantRecord["companions"];
}) {
  return (
    <section className={styles.panel}>
      <h2>{title}</h2>
      {relationships.length ? (
        relationships.map((relationship) => (
          <div className={styles.companion} key={relationship.plantId}>
            <span>{icon}</span>
            <div>
              <strong>
                <Link to={`/plants/${relationship.plantId}`}>
                  {localCatalog.find((item) => item.id === relationship.plantId)
                    ?.commonName ?? relationship.plantId}
                </Link>
              </strong>
              <small>
                {relationship.mechanism.replace("-", " ")} ·{" "}
                {relationship.evidenceLevel.replace("-", " ")}
              </small>
              <p>{relationship.explanation}</p>
              <SourceLinks ids={relationship.sourceIds} />
            </div>
          </div>
        ))
      ) : (
        <p className={styles.muted}>{empty}</p>
      )}
    </section>
  );
}

function VarietyDetail() {
  const { slug, cultivarId } = useParams();
  const [plant, setPlant] = useState<PlantRecord | null>(null);
  const [notFound, setNotFound] = useState(false);
  useEffect(() => {
    if (slug)
      api
        .plant(slug)
        .then(setPlant)
        .catch(() => setNotFound(true));
  }, [slug]);
  const back = { to: "/plants", label: "Back to plant library" };
  const cultivar = plant?.cultivars.find((item) => item.id === cultivarId);
  if (notFound || (plant && !cultivar))
    return (
      <Page title="Variety not found" back={back}>
        <Link to="/plants">Return to the library</Link>
      </Page>
    );
  if (!plant || !cultivar)
    return (
      <Page title="Plant Library" back={back}>
        <p>Loading variety details…</p>
      </Page>
    );
  const siblings = plant.cultivars.filter((item) => item.id !== cultivar.id);
  return (
    <Page
      // The library is one rung up and the plant is the next, so the plant's name is a way
      // there rather than a label. Most gardeners arrive at a variety from its plant page.
      eyebrow={
        <>
          <Link to={`/plants/${plant.id}`}>{plant.commonName}</Link> · variety
        </>
      }
      title={cultivar.name}
      intro={
        cultivar.type
          ? `${cultivar.type.value} ${singular(plant.commonName)}.`
          : `A ${singular(plant.commonName)} variety kept in your own list.`
      }
      back={back}
    >
      <div className={styles.detailGrid}>
        <section className={styles.panel}>
          <h2>This variety</h2>
          <dl>
            <dt>Plant</dt>
            <dd>
              <Link to={`/plants/${plant.id}`}>{plant.commonName}</Link>
            </dd>
            {plant.scientificName && (
              <>
                <dt>Botanical name</dt>
                <dd>
                  <em>{plant.scientificName}</em>
                </dd>
              </>
            )}
            {cultivar.type && (
              <>
                <dt>Type</dt>
                <dd>{cultivar.type.value}</dd>
              </>
            )}
            <dt>Growth habit</dt>
            <dd className={cultivar.habit ? undefined : styles.muted}>
              {cultivar.habit ? cultivar.habit.value : "Not available"}
            </dd>
            <dt>Days to maturity</dt>
            <dd className={cultivar.daysToMaturity ? undefined : styles.muted}>
              {cultivar.daysToMaturity
                ? cultivar.daysToMaturity.value
                : "Not available"}
            </dd>
          </dl>
          {cultivar.type ? (
            <SourceLinks ids={cultivar.type.sourceIds} />
          ) : (
            <p className={styles.muted}>
              Not on the Extension list — this one is here because you grow it.
            </p>
          )}
          {cultivar.notes && (
            <ul>
              {cultivar.notes.value.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
        </section>
        {/* The crop's own guidance is written once, on the plant's page. This panel points at
            it rather than keeping a second copy in step with the first. */}
        <section className={styles.panel}>
          <h2>All {plant.commonName}</h2>
          <p>
            Grown like any other {singular(plant.commonName)}. Sun, water,
            sowing dates and what to watch for can be found on the{" "}
            {plant.commonName} plant page.
          </p>
          <Link className={styles.button} to={`/plants/${plant.id}`}>
            See the {plant.commonName} plant page
          </Link>
        </section>
        {siblings.length > 0 && (
          <section className={styles.panel}>
            {/* "24 other beans" and "39 other tomatoes" pluralise differently, and some common
                names are plural already. "Varieties" is right for all twenty-one plants. */}
            <h2>
              {siblings.length} other{" "}
              {siblings.length === 1 ? "variety" : "varieties"}
            </h2>
            {groupCultivars(siblings).map(([group, cultivars]) => (
              <div className={styles.varietyGroup} key={group}>
                <p className={styles.varietyGroupLabel}>{group}</p>
                <div className={styles.varietyButtons}>
                  {cultivars.map((item) => (
                    <Link
                      className={styles.button}
                      to={`/plants/${plant.id}/${item.id}`}
                      key={item.id}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
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
  const back = { to: "/plants", label: "Back to plant library" };
  if (notFound)
    return (
      <Page title="Plant not found" back={back}>
        <Link to="/plants">Return to the library</Link>
      </Page>
    );
  if (!plant)
    return (
      <Page title="Plant Library" back={back}>
        <p>Loading plant details…</p>
      </Page>
    );
  const avoids = plant.companions.filter((c) => c.effect === "avoid");
  return (
    <Page
      eyebrow={`${plant.category} · ${plant.reviewStatus}`}
      title={plant.commonName}
      intro={plant.summary}
      back={back}
    >
      <div className={styles.detailGrid}>
        <section className={styles.panel}>
          <h2>At a glance</h2>
          <dl>
            <dt>Botanical name</dt>
            <dd>
              <em>{plant.scientificName}</em>
            </dd>
            {(
              [
                ["Days to maturity", plant.daysToMaturity],
                ["Sun", plant.sun],
                ["Water", plant.water],
                ["Soil", plant.soil],
                ["Spacing", plant.spacing],
              ] as const
            ).map(([label, fact]) => (
              // A gap is shown, not hidden. An absent line looks like the app forgot; "Not
              // available" says plainly that nobody we cite has published the figure.
              <Fragment key={label}>
                <dt>{label}</dt>
                <dd className={fact ? undefined : styles.muted}>
                  {fact ? fact.value : "Not available"}
                </dd>
              </Fragment>
            ))}
          </dl>
        </section>
        <section className={styles.panel}>
          <h2>Timing</h2>
          <p className={styles.muted}>
            Calculated from your explicit frost dates, never from the hardiness
            zone.
          </p>
          {plant.timing.map((rule, index) => (
            <div className={styles.rule} key={index}>
              <strong>{phaseLabels[rule.phase]}</strong>
              <span>{timingPhrase(rule)}</span>
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
          <h2>Pests &amp; problems</h2>
          {plant.problems.length || avoids.length ? (
            <>
              {plant.problems.map((problem) => (
                <div className={styles.companion} key={problem.id}>
                  <span>{problemIcons[problem.kind]}</span>
                  <div>
                    <strong>{problem.name}</strong>
                    <small>
                      {problem.kind} · {problem.evidenceLevel.replace("-", " ")}
                    </small>
                    <p>{problem.symptom}</p>
                    <p>{problem.response}</p>
                    <SourceLinks ids={problem.sourceIds} />
                  </div>
                </div>
              ))}
              {/* A clash with another plant is a problem this plant has, so it belongs here
                  rather than in a panel of its own opposite the friendly pairings.
                  The mark is its own, not the ⚠ the disorders use, so incompatibility reads at
                  a glance. Swap this span for Amanda's drawing when it lands. */}
              {avoids.map((relationship) => (
                <div className={styles.companion} key={relationship.plantId}>
                  <span>{INCOMPATIBLE_MARK}</span>
                  <div>
                    <strong>
                      <Link to={`/plants/${relationship.plantId}`}>
                        {localCatalog.find(
                          (item) => item.id === relationship.plantId,
                        )?.commonName ?? relationship.plantId}
                      </Link>
                    </strong>
                    <small>
                      keep to separate beds ·{" "}
                      {relationship.mechanism.replace("-", " ")}
                    </small>
                    <p>{relationship.explanation}</p>
                    <SourceLinks ids={relationship.sourceIds} />
                  </div>
                </div>
              ))}
            </>
          ) : (
            <p className={styles.muted}>
              Not available — nothing we cite records a pest, a disease or a
              plant to keep this one away from.
            </p>
          )}
        </section>
        <CompanionPanel
          title="Good neighbours"
          empty="No friendships worth promising yet. Plenty of pairings get passed around, but we would rather stay quiet than repeat garden folklore."
          icon="♡"
          relationships={plant.companions.filter((c) => c.effect !== "avoid")}
        />
        <section className={styles.panel}>
          <h2>
            {plant.cultivars.length
              ? `${plant.cultivars.length} varieties`
              : "Varieties"}
          </h2>
          {plant.cultivars.length ? (
            groupCultivars(plant.cultivars).map(([group, cultivars]) => (
              <div className={styles.varietyGroup} key={group}>
                <p className={styles.varietyGroupLabel}>{group}</p>
                <div className={styles.varietyButtons}>
                  {cultivars.map((cultivar) => (
                    <Link
                      className={styles.button}
                      to={`/plants/${plant.id}/${cultivar.id}`}
                      key={cultivar.id}
                    >
                      {cultivar.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className={styles.muted}>
              Not available — no named varieties are recorded for this plant
              yet.
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

/**
 * Settings folds. Seven panels is a long scroll on a phone, so each heading
 * is the control that opens its own panel, and only one stands open at a
 * time — arriving at Settings shows a list of headings rather than a wall.
 */
const SETTINGS_PANEL_IDS = [
  "garden",
  "planner",
  "appearance",
  "history",
  "data",
  "release",
  "clear",
] as const;
type SettingsPanelId = (typeof SETTINGS_PANEL_IDS)[number];

const OPEN_PANEL_KEY = "gardenbuddy.settings.panel";
/** Long enough to gather a run of switches into one save, short enough that
    leaving the page straight after a switch still writes it. */
const PLANNER_OPTION_SAVE_MS = 600;
/** The growing season is first in the grid, so an unremembered visit opens it. */
const DEFAULT_OPEN_PANEL: SettingsPanelId = "garden";

/** Reading storage can throw in private windows, so never let it break the page. */
function readOpenPanel(): SettingsPanelId | null {
  try {
    const stored = window.localStorage.getItem(OPEN_PANEL_KEY);
    if (stored === null) return DEFAULT_OPEN_PANEL;
    // An empty string is a remembered "everything shut", not a missing value.
    if (stored === "") return null;
    return SETTINGS_PANEL_IDS.includes(stored as SettingsPanelId)
      ? (stored as SettingsPanelId)
      : DEFAULT_OPEN_PANEL;
  } catch {
    return DEFAULT_OPEN_PANEL;
  }
}

function writeOpenPanel(id: SettingsPanelId | null): void {
  try {
    window.localStorage.setItem(OPEN_PANEL_KEY, id ?? "");
  } catch {
    // A panel we cannot remember still opens for this visit.
  }
}

/**
 * One folding panel. The whole heading row takes the press, and a shut panel
 * shows its heading and nothing else — so Settings reads as a short list of
 * places to go rather than a wall of text.
 */
function SettingsPanel({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: SettingsPanelId;
  title: string;
  open: boolean;
  onToggle: (id: SettingsPanelId) => void;
  children: ReactNode;
}) {
  return (
    <section className={`${styles.panel} ${styles.foldingPanel}`}>
      <button
        type="button"
        className={styles.panelHead}
        aria-expanded={open}
        aria-controls={`settings-${id}`}
        onClick={() => onToggle(id)}
      >
        <h2>{title}</h2>
        <span className={styles.panelCaret} aria-hidden="true">
          <span />
        </span>
      </button>
      <div className={styles.fold} id={`settings-${id}`}>
        {/* Shut is genuinely shut: nothing inside takes a tab stop. */}
        <div className={styles.foldInner} inert={!open}>
          <div className={styles.foldBody}>{children}</div>
        </div>
      </div>
    </section>
  );
}

/**
 * What the planner draws on top of the calendar. One table, so a switch and
 * the line that explains it cannot drift apart from one another.
 */
const PLANNER_OPTIONS = [
  {
    key: "showFrostMarks",
    title: "Frost markers",
    description:
      "Your last spring and first fall frost, ticked on the calendar.",
  },
  {
    key: "showPillPredictions",
    title: "Pillbox phase predictions",
    description:
      "Shades each month by the phase a plant should be in — sowing, growing, picking.",
  },
  {
    key: "showPlantedMarkers",
    title: "Planted and harvest icons",
    description:
      "Marks the day you planted something, and when it should be ready to pick.",
  },
] as const;
type PlannerOptionKey = (typeof PLANNER_OPTIONS)[number]["key"];

function Settings({
  themePreference,
  onChooseTheme,
  onLogout,
}: {
  themePreference: ThemePreference;
  onChooseTheme: (preference: ThemePreference) => void;
  onLogout: () => void;
}) {
  const { state, loading, saving, save, replace } = useGarden();
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
  const [openPanel, setOpenPanel] = useState<SettingsPanelId | null>(
    readOpenPanel,
  );
  // The three calendar toggles write themselves, so they keep a local mirror:
  // a checkbox that waited for the round trip would not move under her thumb.
  const [plannerOptions, setPlannerOptions] = useState({
    showFrostMarks: state?.garden.showFrostMarks !== false,
    showPillPredictions: state?.garden.showPillPredictions === true,
    showPlantedMarkers: state?.garden.showPlantedMarkers === true,
  });
  const optionsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optionsPending = useRef(false);
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
  // Same sync for the toggles, except while one of our own writes is still in
  // flight — otherwise a second switch flicks back to the value the first
  // save happened to land with.
  useEffect(() => {
    if (!state || optionsPending.current) return;
    setPlannerOptions({
      showFrostMarks: state.garden.showFrostMarks !== false,
      showPillPredictions: state.garden.showPillPredictions === true,
      showPlantedMarkers: state.garden.showPlantedMarkers === true,
    });
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
        // The toggles live in their own panel now, so they are no longer on
        // this form — carry the live values rather than reading them back as
        // three missing checkboxes, which would switch all three off.
        ...plannerOptions,
      },
    });
    setMessage("Garden settings saved.");
  };
  const togglePanel = (id: SettingsPanelId) => {
    const next = openPanel === id ? null : id;
    setOpenPanel(next);
    writeOpenPanel(next);
  };
  /**
   * A planner option applies as soon as it is switched, but the write waits a
   * moment. Every save keeps a snapshot and the history only holds five, so
   * switching all three in a row must not spend her whole undo history.
   */
  const setPlannerOption = (key: PlannerOptionKey, value: boolean) => {
    const next = { ...plannerOptions, [key]: value };
    setPlannerOptions(next);
    optionsPending.current = true;
    if (optionsTimer.current) clearTimeout(optionsTimer.current);
    optionsTimer.current = setTimeout(() => {
      void save({ ...state, garden: { ...state.garden, ...next } })
        .then(() => setMessage("Planner options saved."))
        // The context reports the failure itself; this only stops an unhandled
        // rejection and lets the next sync through.
        .catch(() => {})
        .finally(() => {
          optionsPending.current = false;
        });
    }, PLANNER_OPTION_SAVE_MS);
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
        <SettingsPanel
          id="garden"
          title="Garden and growing season"
          open={openPanel === "garden"}
          onToggle={togglePanel}
        >
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
        </SettingsPanel>
        <SettingsPanel
          id="planner"
          title="Planner options"
          open={openPanel === "planner"}
          onToggle={togglePanel}
        >
          <p className={styles.muted}>
            What the planner draws on top of the calendar. These take effect the
            moment you switch them — there is nothing to save.
          </p>
          <div className={styles.options}>
            {PLANNER_OPTIONS.map((option) => (
              /* The whole row is the label, so it is an easy target with a
                 thumb; aria-label keeps the switch's name to the short title
                 rather than reading the explanation out as its name too. */
              <label className={styles.optionLine} key={option.key}>
                <input
                  type="checkbox"
                  aria-label={option.title}
                  aria-describedby={`option-${option.key}`}
                  checked={plannerOptions[option.key]}
                  onChange={(event) =>
                    setPlannerOption(option.key, event.target.checked)
                  }
                />
                <span>
                  <strong>{option.title}</strong>
                  <small id={`option-${option.key}`}>
                    {option.description}
                  </small>
                </span>
              </label>
            ))}
          </div>
        </SettingsPanel>
        <SettingsPanel
          id="appearance"
          title="Appearance"
          open={openPanel === "appearance"}
          onToggle={togglePanel}
        >
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
        </SettingsPanel>
        <SettingsPanel
          id="history"
          title="Recent history"
          open={openPanel === "history"}
          onToggle={togglePanel}
        >
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
        </SettingsPanel>
        <SettingsPanel
          id="data"
          title="Import or export"
          open={openPanel === "data"}
          onToggle={togglePanel}
        >
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
        </SettingsPanel>
        <SettingsPanel
          id="release"
          title="Release and session"
          open={openPanel === "release"}
          onToggle={togglePanel}
        >
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
        </SettingsPanel>
        <ClearPlannerPanel
          state={state}
          save={save}
          saving={saving}
          open={openPanel === "clear"}
          onToggle={togglePanel}
        />
      </div>
      {message && (
        <p className={styles.notice} role="status">
          {message}
        </p>
      )}
    </Page>
  );
}

/**
 * Starting the year over. This removes every plant from the planner,
 * including ones marked as planted and any date logged against them, so it
 * counts what it is about to take before it takes it. Beds, frost dates and
 * the wish list are left alone: the wish list is what you would rebuild
 * from.
 */
function ClearPlannerPanel({
  state,
  save,
  saving,
  open,
  onToggle,
}: {
  state: GardenState;
  save: (next: GardenState) => Promise<void>;
  saving: boolean;
  open: boolean;
  onToggle: (id: SettingsPanelId) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const planted = state.entries.filter((entry) => entry.status === "planted");
  const dated = state.entries.filter((entry) => entry.plantedDate);
  const clear = async () => {
    await save({ ...state, entries: [] });
    setConfirming(false);
  };
  return (
    <SettingsPanel
      id="clear"
      title="Start the year over"
      open={open}
      onToggle={onToggle}
    >
      {state.entries.length === 0 ? (
        <p className={styles.muted}>
          The planner is already empty. Your wish list is untouched by this.
        </p>
      ) : confirming ? (
        <>
          <p className={styles.muted}>
            This removes all {state.entries.length} plants from the planner
            {planted.length > 0 &&
              `, including ${planted.length} you have marked as planted`}
            {dated.length > 0 &&
              ` and ${dated.length} with a planting date logged`}
            . Your beds, frost dates and wish list stay as they are. This cannot
            be undone from here — restore an earlier revision above if you
            change your mind.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              disabled={saving}
              onClick={() => setConfirming(false)}
            >
              Keep my plants
            </button>
            <button
              type="button"
              className={styles.dangerButton}
              disabled={saving}
              onClick={() => void clear()}
            >
              {saving ? "Clearing…" : `Clear all ${state.entries.length}`}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={styles.muted}>
            Empties the planner so you can plan a fresh year. Your wish list and
            beds stay put.
          </p>
          <button
            type="button"
            className={styles.dangerButton}
            onClick={() => setConfirming(true)}
          >
            Clear the planner
          </button>
        </>
      )}
    </SettingsPanel>
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
  // Zero reads as "on" on its own, but "on to 155 days after" is nonsense at the start of a
  // range, so a range that opens on the frost date says "from".
  return days === 0
    ? "on"
    : `${Math.abs(days)} days ${days < 0 ? "before" : "after"}`;
}
// A whole phrase, because the pieces do not compose: a window opening exactly on the frost
// date reads "from the last spring frost to 155 days after it", not "on to 155 days after".
function timingPhrase(rule: TimingRule) {
  const anchor =
    rule.anchor === "lastFrost" ? "last spring frost" : "first fall frost";
  if (rule.startOffsetDays === 0)
    return `from the ${anchor} to ${offset(rule.endOffsetDays)} it`;
  if (rule.endOffsetDays === 0)
    return `${offset(rule.startOffsetDays)} the ${anchor}, until the day itself`;
  return `${offset(rule.startOffsetDays)} to ${offset(rule.endOffsetDays)} ${anchor}`;
}
function clampQty(value: number | ""): number {
  if (value === "" || Number.isNaN(value)) return 1;
  return Math.min(999, Math.max(1, Math.trunc(value)));
}

export default App;
