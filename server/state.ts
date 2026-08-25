import { randomUUID } from "node:crypto";
import { findCatalogPlant } from "../src/shared/catalog";
import {
  GardenStateSchema,
  LegacyExportSchema,
  type GardenState,
  type LegacyExport,
} from "../src/shared/model";

// Seeding and old-file translation are kept away from request handling so both can be tested alone.

const bedColors = ["#4A5E3A", "#C4704A", "#E8C96D", "#7B8E65", "#A36B4F"];

// This is Amanda's committed garden from the original planner—not invented demo
// content. Keeping it in the legacy shape makes the production seed exercise the
// exact same validated migration path as a browser-exported v1 backup.
export const amandaLegacyGarden: LegacyExport = {
  version: 1,
  beds: [
    { id: "a", label: "Bed A", color: "#4a7a9b" },
    { id: "b", label: "Bed B", color: "#7a5e9b" },
    { id: "c", label: "Bed C", color: "#9b7a3a" },
    { id: "d", label: "Bed D", color: "#4a9b6a" },
    { id: "companion", label: "Companions", color: "#9b4a6a" },
    { id: "unassigned", label: "Unassigned", color: "#888888" },
  ],
  plants: [
    {
      id: "peas",
      name: "Peas",
      variety: "Sugar Snap",
      dtm: "60–70 days",
      qty: 1,
      bed: "a",
      status: "planted",
    },
    {
      id: "lettuce",
      name: "Lettuce",
      variety: "Mix",
      dtm: "45–60 days",
      qty: 1,
      bed: "a",
      status: "planted",
    },
    {
      id: "carrots",
      name: "Carrots",
      variety: null,
      dtm: "70–80 days",
      qty: 1,
      bed: "a",
      status: "planted",
    },
    {
      id: "cucumbers",
      name: "Cucumbers",
      variety: null,
      dtm: "50–70 days",
      qty: 1,
      bed: "a",
      status: "undecided",
    },
    {
      id: "tomato-roma",
      name: "Tomato",
      variety: "Roma",
      dtm: "75–80 days",
      qty: 1,
      bed: "b",
      status: "willplant",
    },
    {
      id: "tomato-cherokee",
      name: "Tomato",
      variety: "Cherokee Purple",
      dtm: "80–90 days",
      qty: 1,
      bed: "b",
      status: "willplant",
    },
    {
      id: "beans",
      name: "Beans",
      variety: "Purple String",
      dtm: "50–60 days",
      qty: 1,
      bed: "b",
      status: "planted",
    },
    {
      id: "onions",
      name: "Onions",
      variety: null,
      dtm: "100–120 days",
      qty: 1,
      bed: "c",
      status: "planted",
    },
    {
      id: "garlic",
      name: "Garlic",
      variety: null,
      dtm: "240–270 days",
      qty: 1,
      bed: "c",
      status: "planted",
    },
    {
      id: "shallots",
      name: "Shallots",
      variety: null,
      dtm: "90–120 days",
      qty: 1,
      bed: "c",
      status: "planted",
    },
    {
      id: "jalapeno",
      name: "Pepper",
      variety: "Jalapeño",
      dtm: "70–85 days",
      qty: 1,
      bed: "d",
      status: "willplant",
    },
    {
      id: "shishito",
      name: "Pepper",
      variety: "Shishito",
      dtm: "60–75 days",
      qty: 1,
      bed: "d",
      status: "willplant",
    },
    {
      id: "serrano",
      name: "Pepper",
      variety: "Serrano",
      dtm: "75–90 days",
      qty: 1,
      bed: "d",
      status: "willplant",
    },
    {
      id: "marigolds",
      name: "Marigolds",
      variety: null,
      dtm: "50–60 days to bloom",
      qty: 1,
      bed: "companion",
      status: "willplant",
    },
    {
      id: "basil",
      name: "Basil",
      variety: null,
      dtm: "24–30 days",
      qty: 1,
      bed: "companion",
      status: "willplant",
    },
  ],
  customVarieties: {},
};

export function createEmptyGarden(): GardenState {
  return GardenStateSchema.parse({
    version: 2,
    revision: 0,
    garden: {
      id: "primary",
      name: "My Garden",
      zip: "97201",
      hardinessZone: "8b",
      timezone: "America/Los_Angeles",
      lastFrost: "2026-03-15",
      firstFrost: "2026-11-15",
    },
    beds: [],
    entries: [],
    customVarieties: {},
  });
}

export function createAmandaGarden(): GardenState {
  return mapLegacyExport(amandaLegacyGarden, createEmptyGarden().garden);
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
