import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { api } from "./api";
import { GardenProvider, useGarden } from "./GardenContext";
import { catalog as localCatalog } from "./shared/catalog";
import type {
  Bed,
  GardenEntry,
  GardenState,
  PlantRecord,
  SourceRecord,
} from "./shared/model";
import { frostSlot, timelineForEntry } from "./shared/timing";
import styles from "./App.module.css";

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
        <img
          src="/brand/gardenbuddy-mark.svg"
          alt=""
          className={styles.loginMark}
        />
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

function Shell() {
  const navigate = useNavigate();
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/planner" className={styles.brand}>
          <img src="/brand/gardenbuddy-mark.svg" alt="" />
          <span>GardenBuddy</span>
        </Link>
        <nav aria-label="Main navigation">
          <NavLink to="/planner">Planner</NavLink>
          <NavLink to="/plants">Plants</NavLink>
          <NavLink to="/sources">Sources</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </header>
      <GardenProvider>
        <Routes>
          <Route path="/planner" element={<Planner />} />
          <Route path="/plants" element={<PlantLibrary />} />
          <Route path="/plants/:slug" element={<PlantDetail />} />
          <Route
            path="/settings"
            element={
              <Settings
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
  if (auth === "checking")
    return <main className={styles.loading}>Opening the garden…</main>;
  return auth === "yes" ? <Shell /> : <Login onLogin={() => setAuth("yes")} />;
}

function Page({
  eyebrow,
  title,
  intro,
  children,
  actions,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div>
          {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
          <h1>{title}</h1>
          {intro && <p>{intro}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {children}
    </main>
  );
}

function Planner() {
  const { state, loading, saving, notice, save } = useGarden();
  const [dialog, setDialog] = useState<"plant" | "bed" | null>(null);
  const [view, setView] = useState<"order" | "bed" | "status">("order");
  if (loading || !state)
    return (
      <Page title="Planner">
        <p>Loading your garden…</p>
      </Page>
    );
  const beds = new Map(state.beds.map((bed) => [bed.id, bed]));
  const entries = [...state.entries].sort((a, b) =>
    view === "bed"
      ? (beds.get(a.bedId ?? "")?.sortOrder ?? 99) -
        (beds.get(b.bedId ?? "")?.sortOrder ?? 99)
      : view === "status"
        ? a.status.localeCompare(b.status)
        : a.sortOrder - b.sortOrder,
  );
  const last = frostSlot(state.garden, "lastFrost");
  const first = frostSlot(state.garden, "firstFrost");
  const updateEntry = (id: string, patch: Partial<GardenEntry>) =>
    save({
      ...state,
      entries: state.entries.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    });
  // Reordering swaps two sort numbers. The whole state is then saved with its prior revision.
  const move = (id: string, direction: -1 | 1) => {
    const ordered = [...state.entries].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const index = ordered.findIndex((entry) => entry.id === id);
    const swap = ordered[index + direction];
    if (!swap) return;
    void save({
      ...state,
      entries: state.entries.map((entry) =>
        entry.id === id
          ? { ...entry, sortOrder: swap.sortOrder }
          : entry.id === swap.id
            ? { ...entry, sortOrder: ordered[index].sortOrder }
            : entry,
      ),
    });
  };
  return (
    <Page
      eyebrow={state.garden.name}
      title="Garden planner"
      intro={`${state.entries.length} plants · last frost ${prettyDate(state.garden.lastFrost)}`}
      actions={
        <>
          <select
            aria-label="Group planner"
            value={view}
            onChange={(event) => setView(event.target.value as typeof view)}
          >
            <option value="order">My order</option>
            <option value="bed">By bed</option>
            <option value="status">By status</option>
          </select>
          <button onClick={() => setDialog("bed")}>+ Bed</button>
          <button className={styles.primary} onClick={() => setDialog("plant")}>
            + Plant
          </button>
        </>
      }
    >
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
      <div className={styles.legend}>
        <span>
          <i className={styles.indoor} />
          Start indoors
        </span>
        <span>
          <i className={styles.direct} />
          Direct sow
        </span>
        <span>
          <i className={styles.transplant} />
          Transplant
        </span>
        <span>
          <i className={styles.harvest} />
          Harvest/bloom
        </span>
        <span>↓ Frost dates</span>
        {saving && <span>Saving…</span>}
      </div>
      <section
        className={styles.calendar}
        aria-label="Annual planting calendar"
      >
        <div className={styles.calendarGrid}>
          <div className={`${styles.stickyPlant} ${styles.monthHead}`}>
            Plant
          </div>
          {months.map((month) => (
            <div className={styles.monthHead} key={month}>
              {month}
            </div>
          ))}
          {entries.map((entry) => {
            const timeline = timelineForEntry(entry, state.garden);
            return (
              <div className={styles.calendarRow} key={entry.id}>
                <div className={styles.stickyPlant}>
                  <div className={styles.plantRowTitle}>
                    <Link
                      to={
                        entry.plantId ? `/plants/${entry.plantId}` : "/plants"
                      }
                    >
                      {entry.name}
                    </Link>
                    <span>
                      {entry.variety || "No variety"} · {entry.qty}
                    </span>
                  </div>
                  <div className={styles.rowControls}>
                    <button
                      aria-label={`Move ${entry.name} up`}
                      onClick={() => move(entry.id, -1)}
                    >
                      ↑
                    </button>
                    <button
                      aria-label={`Move ${entry.name} down`}
                      onClick={() => move(entry.id, 1)}
                    >
                      ↓
                    </button>
                    <input
                      aria-label={`${entry.name} quantity`}
                      type="number"
                      min="1"
                      max="999"
                      value={entry.qty}
                      onChange={(event) =>
                        void updateEntry(entry.id, {
                          qty: Number(event.target.value),
                        })
                      }
                    />
                    <select
                      aria-label={`${entry.name} status`}
                      value={entry.status}
                      onChange={(event) =>
                        void updateEntry(entry.id, {
                          status: event.target.value as GardenEntry["status"],
                        })
                      }
                    >
                      <option value="planted">Planted</option>
                      <option value="willplant">Will plant</option>
                      <option value="undecided">Undecided</option>
                    </select>
                    <select
                      aria-label={`${entry.name} bed`}
                      value={entry.bedId ?? ""}
                      onChange={(event) =>
                        void updateEntry(entry.id, {
                          bedId: event.target.value || null,
                        })
                      }
                    >
                      <option value="">No bed</option>
                      {state.beds.map((bed) => (
                        <option value={bed.id} key={bed.id}>
                          {bed.label}
                        </option>
                      ))}
                    </select>
                    <button
                      className={styles.dangerLink}
                      onClick={() =>
                        confirm(`Remove ${entry.name}?`) &&
                        void save({
                          ...state,
                          entries: state.entries.filter(
                            (item) => item.id !== entry.id,
                          ),
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {Array.from({ length: 12 }, (_, month) => (
                  <div className={styles.monthCell} key={month}>
                    {[month * 2, month * 2 + 1].map((slot) => (
                      <span
                        key={slot}
                        title={
                          timeline[slot].phase
                            ? phaseLabels[timeline[slot].phase!]
                            : undefined
                        }
                        className={`${timeline[slot].phase ? styles[timeline[slot].phase!] : ""} ${slot === last || slot === first ? styles.frost : ""}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </section>
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
    </Page>
  );
}

function Dialog({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={styles.dialog}
      >
        <button className={styles.close} aria-label="Close" onClick={close}>
          ×
        </button>
        <h2>{title}</h2>
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
  const [bedId, setBedId] = useState("");
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
          <input
            list="varieties"
            value={variety}
            onChange={(event) => setVariety(event.target.value)}
            placeholder="Optional"
          />
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
          </label>
        </div>
        <button className={styles.primary}>Add to planner</button>
      </form>
    </Dialog>
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
  const [color, setColor] = useState("#4A5E3A");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const bed: Bed = {
      id: crypto.randomUUID(),
      label,
      color,
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
        <label>
          Color
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
          />
        </label>
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
  const filtered = plants.filter(
    (plant) =>
      (category === "all" || plant.category === category) &&
      `${plant.commonName} ${plant.scientificName}`
        .toLowerCase()
        .includes(query.toLowerCase()),
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
          <select
            aria-label="Plant category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">All types</option>
            <option value="vegetable">Vegetables</option>
            <option value="herb">Herbs</option>
            <option value="flower">Flowers</option>
          </select>
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

function Settings({ onLogout }: { onLogout: () => void }) {
  const { state, loading, save, replace } = useGarden();
  const [meta, setMeta] = useState({ environment: "", revision: "" });
  const [history, setHistory] = useState<
    Array<{ id: string; revision: number; reason: string; createdAt: string }>
  >([]);
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
        zip: String(data.get("zip")),
        hardinessZone: String(data.get("hardinessZone")),
        lastFrost: String(data.get("lastFrost")),
        firstFrost: String(data.get("firstFrost")),
      },
    });
    setMessage("Garden settings saved.");
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
                  defaultValue={state.garden.zip}
                />
              </label>
              <label>
                Hardiness zone
                <input
                  name="hardinessZone"
                  defaultValue={state.garden.hardinessZone}
                />
              </label>
            </div>
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
