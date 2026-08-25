import { z } from "zod";

// These schemas are both documentation and runtime gates: unknown browser/import JSON must pass
// them before it is allowed into the database.

export const PhaseSchema = z.enum([
  "indoor",
  "transplant",
  "direct",
  "harvest",
  "bloom",
]);
export type Phase = z.infer<typeof PhaseSchema>;

export const GardenSettingsSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  zip: z
    .string()
    .regex(/^\d{5}$/)
    .or(z.literal("")),
  hardinessZone: z.string().max(4),
  timezone: z.string().min(1),
  lastFrost: z.string().date(),
  firstFrost: z.string().date(),
});

export const BedSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  sortOrder: z.number().int().nonnegative(),
});

export const GardenEntrySchema = z.object({
  id: z.string().min(1),
  plantId: z.string().nullable(),
  name: z.string().min(1).max(100),
  variety: z.string().max(120).nullable(),
  dtm: z.string().max(80).nullable(),
  qty: z.number().int().min(1).max(999),
  bedId: z.string().nullable(),
  status: z.enum(["planted", "willplant", "undecided"]),
  sortOrder: z.number().int().nonnegative(),
  timingOverride: z
    .array(
      z.object({
        phase: PhaseSchema,
        anchor: z.enum(["lastFrost", "firstFrost"]),
        startOffsetDays: z.number().int(),
        endOffsetDays: z.number().int(),
      }),
    )
    .optional(),
});

export const GardenStateSchema = z.object({
  version: z.literal(2),
  revision: z.number().int().nonnegative(),
  garden: GardenSettingsSchema,
  beds: z.array(BedSchema),
  entries: z.array(GardenEntrySchema),
  customVarieties: z.record(z.string(), z.array(z.string())),
});

export type GardenSettings = z.infer<typeof GardenSettingsSchema>;
export type Bed = z.infer<typeof BedSchema>;
export type GardenEntry = z.infer<typeof GardenEntrySchema>;
export type GardenState = z.infer<typeof GardenStateSchema>;

export const LegacyExportSchema = z.object({
  version: z.number().optional(),
  exported: z.string().optional(),
  plants: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      variety: z.string().nullable().optional(),
      dtm: z.string().nullable().optional(),
      qty: z.number().int().positive().optional(),
      bed: z.string().nullable().optional(),
      status: z.enum(["planted", "willplant", "undecided"]).optional(),
      months: z.array(z.unknown()).optional(),
    }),
  ),
  beds: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      color: z.string(),
    }),
  ),
  customVarieties: z.record(z.string(), z.array(z.string())).optional(),
});

export type LegacyExport = z.infer<typeof LegacyExportSchema>;

export type EvidenceLevel =
  "research-supported" | "extension-guidance" | "observational" | "traditional";

export interface SourceRecord {
  id: string;
  publisher: string;
  title: string;
  url: string;
  revision?: string;
  accessedAt: string;
  licenseNote: string;
}

export interface SourcedFact<T> {
  value: T;
  sourceIds: string[];
  locationScope:
    "willamette-valley" | "western-oregon" | "national" | "cultivar";
  evidenceLevel: EvidenceLevel;
  reviewedAt: string;
}

export interface TimingRule {
  phase: Phase;
  anchor: "lastFrost" | "firstFrost";
  startOffsetDays: number;
  endOffsetDays: number;
  sourceIds: string[];
}

export interface CultivarRecord {
  id: string;
  name: string;
  daysToMaturity?: SourcedFact<string>;
  notes?: SourcedFact<string[]>;
}

export interface CompanionRelationship {
  plantId: string;
  effect: "helpful" | "avoid" | "contextual";
  mechanism:
    | "beneficial-insects"
    | "trap-crop"
    | "shade"
    | "space-sharing"
    | "rotation-conflict";
  evidenceLevel: EvidenceLevel;
  explanation: string;
  sourceIds: string[];
}

export interface PlantRecord {
  id: string;
  commonName: string;
  scientificName?: string;
  category: "vegetable" | "herb" | "flower" | "fruit";
  summary: string;
  daysToMaturity: SourcedFact<string>;
  sun: SourcedFact<string>;
  water: SourcedFact<string>;
  spacing: SourcedFact<string>;
  timing: TimingRule[];
  cultivars: CultivarRecord[];
  companions: CompanionRelationship[];
  growingTips: SourcedFact<string[]>;
  reviewStatus: "reviewed" | "legacy-unreviewed";
}
