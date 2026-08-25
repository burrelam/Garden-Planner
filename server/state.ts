import { randomUUID } from "node:crypto";
import { catalog, findCatalogPlant } from "../src/shared/catalog";
import {
  GardenStateSchema,
  LegacyExportSchema,
  type GardenState,
  type LegacyExport,
} from "../src/shared/model";

// Seeding and old-file translation are kept away from request handling so both can be tested alone.

const bedColors = ["#4A5E3A", "#C4704A", "#E8C96D", "#7B8E65", "#A36B4F"];

export function createSampleGarden(): GardenState {
  const beds = [
    { id: "bed-south", label: "South bed", color: "#C4704A", sortOrder: 0 },
    { id: "bed-kitchen", label: "Kitchen bed", color: "#4A5E3A", sortOrder: 1 },
  ];
  const entries = ["tomato", "peas", "lettuce", "basil", "marigold"].map(
    (plantId, index) => {
      const plant = catalog.find((candidate) => candidate.id === plantId)!;
      return {
        id: randomUUID(),
        plantId,
        name: plant.commonName,
        variety: plant.cultivars[0]?.name ?? null,
        dtm: plant.daysToMaturity.value,
        qty: plantId === "tomato" ? 4 : 1,
        bedId: index < 2 ? "bed-south" : "bed-kitchen",
        status: index === 4 ? ("willplant" as const) : ("planted" as const),
        sortOrder: index,
      };
    },
  );
  return GardenStateSchema.parse({
    version: 2,
    revision: 0,
    garden: {
      id: "primary",
      name: "Our garden",
      zip: "",
      hardinessZone: "8b",
      timezone: "America/Los_Angeles",
      lastFrost: "2026-03-15",
      firstFrost: "2026-11-15",
    },
    beds,
    entries,
    customVarieties: {},
  });
}

export function createEmptyGarden(): GardenState {
  const sample = createSampleGarden();
  return { ...sample, beds: [], entries: [] };
}

export function mapLegacyExport(
  input: unknown,
  settings?: Partial<GardenState["garden"]>,
) {
  const legacy = LegacyExportSchema.parse(input);
  const ids = new Set<string>();
  const beds = legacy.beds.map((bed, index) => {
    const id = bed.id && !ids.has(bed.id) ? bed.id : `bed-${index + 1}`;
    ids.add(id);
    return {
      id,
      label: bed.label || `Bed ${index + 1}`,
      color: /^#[\da-f]{6}$/i.test(bed.color)
        ? bed.color
        : bedColors[index % bedColors.length],
      sortOrder: index,
    };
  });
  const bedByLegacyValue = new Map(
    beds.flatMap((bed) => [
      [bed.id, bed.id],
      [bed.label, bed.id],
    ]),
  );
  const state = createEmptyGarden();
  state.garden = { ...state.garden, ...settings, id: "primary" };
  state.beds = beds;
  state.entries = legacy.plants.map((plant, index) => {
    const catalogPlant = findCatalogPlant(plant.name);
    return {
      id: plant.id && !ids.has(plant.id) ? plant.id : randomUUID(),
      plantId: catalogPlant?.id ?? null,
      name: plant.name,
      variety: plant.variety ?? null,
      dtm: plant.dtm ?? catalogPlant?.daysToMaturity.value ?? null,
      qty: plant.qty ?? 1,
      bedId: plant.bed ? (bedByLegacyValue.get(plant.bed) ?? null) : null,
      status: plant.status ?? "undecided",
      sortOrder: index,
    };
  });
  state.customVarieties = legacy.customVarieties ?? {};
  return GardenStateSchema.parse(state);
}

export function previewLegacyExport(input: unknown) {
  const legacy: LegacyExport = LegacyExportSchema.parse(input);
  return {
    plants: legacy.plants.length,
    beds: legacy.beds.length,
    customPlants: legacy.plants
      .filter((plant) => !findCatalogPlant(plant.name))
      .map((plant) => plant.name),
    varieties: legacy.plants.filter((plant) => plant.variety).length,
  };
}
