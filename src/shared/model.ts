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
  /* Gardens saved before this existed simply have the marks on. */
  showFrostMarks: z.boolean().default(true),
  /* Both new, opt-in, and independent of each other: a gardener may want
     the pillbox overlay without the markers, or the markers without the
     overlay, so gardens saved before these existed default both to off
     rather than bundling them under one switch. */
  showPillPredictions: z.boolean().default(false),
  showPlantedMarkers: z.boolean().default(false),
});

export const BedSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(60),
  // `color` stays the source of truth so existing gardens and exports keep working.
  // `colorKey` names a swatch in the seasonal palette; when present the bed is
  // painted from that token instead, so it retints with the theme.
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  colorKey: z.string().max(40).optional(),
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
  /* The date a gardener actually put this in the ground, as opposed to the
     generic guideline computed from frost dates. Nullable so it can be
     cleared back to "no actual date recorded" rather than only ever set. */
  plantedDate: z.string().date().nullable().optional(),
  timingOverride: z
    .array(
      z.object({
        phase: PhaseSchema,
        anchor: z.enum(["lastFrost", "firstFrost"]),
        startOffsetDays: z.number().int(),
        endOffsetDays: z.number().int(),
        /* Which of the plant's sowings this rule is part of, so a gardener's
           own dates can describe a crop they sow twice the same way the
           catalog does. Left off, the rule belongs to the row as a whole. */
        sowing: z.string().max(40).optional(),
      }),
    )
    .optional(),
});

/**
 * Something a gardener wants to grow but has not committed to a bed yet.
 * It points at a catalog plant and at one of that plant's sowing windows, so
 * the same plant can be wanted for two different times of year. The window is
 * held by index rather than by its dates: frost dates move, and the wish
 * should move with them rather than freeze last year's calendar.
 */
export const WishlistItemSchema = z.object({
  id: z.string().min(1),
  plantId: z.string().min(1),
  windowIndex: z.number().int().nonnegative(),
  addedAt: z.string().date(),
});

export const GardenStateSchema = z.object({
  version: z.literal(2),
  revision: z.number().int().nonnegative(),
  garden: GardenSettingsSchema,
  beds: z.array(BedSchema),
  entries: z.array(GardenEntrySchema),
  customVarieties: z.record(z.string(), z.array(z.string())),
  /* Gardens saved before the wish list existed simply have an empty one, so
     no stored state needs migrating. */
  wishlist: z.array(WishlistItemSchema).default([]),
});

export type GardenSettings = z.infer<typeof GardenSettingsSchema>;
export type Bed = z.infer<typeof BedSchema>;
export type GardenEntry = z.infer<typeof GardenEntrySchema>;
export type WishlistItem = z.infer<typeof WishlistItemSchema>;
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
  /**
   * Which sowing of this plant the rule belongs to, for crops that are sown
   * more than once a year and picked at different times for it. Rules sharing
   * a name are one sowing: its indoor start, its time in the ground, and the
   * harvest that sowing actually produces.
   *
   * Left off, a rule belongs to the plant as a whole and the windows are
   * derived from the dates as before, which is what every single-sowing plant
   * does. Naming the sowings is what stops one lettuce row claiming a harvest
   * from May to November that no single planting ever delivers.
   */
  sowing?: string;
}

export interface CultivarRecord {
  id: string;
  name: string;
  // The horticultural group a variety belongs to — romaine, butterhead, bibb. Gardeners shop by
  // this before they shop by cultivar name, so the variety picker groups on it. A variety with
  // no type is one the publications do not list; the picker files those under "Also grown".
  type?: SourcedFact<string>;
  // Determinate or indeterminate. A crop-wide note has to hedge across both — cage the one,
  // leave the other — so a variety that knows its own habit can be told which half is its.
  habit?: SourcedFact<string>;
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

// What tends to go wrong with a plant. Kept separate from companions: a problem is something
// this plant suffers, a companion is a relationship with another plant.
export interface PlantProblem {
  id: string;
  name: string;
  kind: "pest" | "disease" | "disorder";
  symptom: string;
  response: string;
  evidenceLevel: EvidenceLevel;
  sourceIds: string[];
}

export interface PlantRecord {
  id: string;
  commonName: string;
  scientificName?: string;
  category: "vegetable" | "herb" | "flower" | "fruit";
  summary: string;
  // Every fact is optional. A plant the publications do not describe should say nothing rather
  // than carry a number nobody can point at — the catalog would rather have a gap than a guess.
  daysToMaturity?: SourcedFact<string>;
  sun?: SourcedFact<string>;
  water?: SourcedFact<string>;
  soil?: SourcedFact<string>;
  spacing?: SourcedFact<string>;
  timing: TimingRule[];
  cultivars: CultivarRecord[];
  problems: PlantProblem[];
  companions: CompanionRelationship[];
  growingTips: SourcedFact<string[]>;
  reviewStatus: "reviewed" | "legacy-unreviewed";
}
