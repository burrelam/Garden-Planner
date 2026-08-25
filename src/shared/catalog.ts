import type { PlantRecord, SourceRecord } from "./model";

// Plant pages read only this reviewed, version-controlled catalog. Source websites are editorial
// inputs and citations, never runtime dependencies that could disappear during garden planning.

const reviewedAt = "2026-08-24";

export const sources: SourceRecord[] = [
  {
    id: "osu-vegetable-oregon",
    publisher: "Oregon State University Extension Service",
    title: "Vegetable Gardening in Oregon",
    url: "https://extension.oregonstate.edu/catalog/pub/ec-871-vegetable-gardening-oregon",
    revision: "EC 871",
    accessedAt: reviewedAt,
    licenseNote:
      "Copyrighted Extension guidance. GardenBuddy paraphrases discrete facts and links to the source.",
  },
  {
    id: "osu-growing-your-own",
    publisher: "Oregon State University Extension Service",
    title: "Growing Your Own",
    url: "https://extension.oregonstate.edu/catalog/em-9027-growing-your-own",
    revision: "EM 9027",
    accessedAt: reviewedAt,
    licenseNote:
      "Copyrighted Extension guidance. Do not reproduce tables or prose wholesale.",
  },
  {
    id: "umn-companions",
    publisher: "University of Minnesota Extension",
    title: "Companion planting in home gardens",
    url: "https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/companion-planting-in-home-gardens",
    accessedAt: reviewedAt,
    licenseNote:
      "Paraphrased evidence overview; retain link and evidence label.",
  },
  {
    id: "usda-hardiness",
    publisher: "USDA Agricultural Research Service",
    title: "How to use the Plant Hardiness Zone Map",
    url: "https://planthardiness.ars.usda.gov/pages/how-to-use-the-maps",
    revision: "2023 map",
    accessedAt: reviewedAt,
    licenseNote:
      "Government source. Hardiness describes perennial cold survival, not annual sowing dates.",
  },
  {
    id: "noaa-climate-normals",
    publisher: "NOAA National Centers for Environmental Information",
    title: "1991–2020 U.S. Climate Normals",
    url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals",
    revision: "1991–2020 normals",
    accessedAt: reviewedAt,
    licenseNote:
      "Public-domain federal climate data. Preserve station, threshold, probability, normal period, and dataset version.",
  },
  {
    id: "usda-plants",
    publisher: "USDA Natural Resources Conservation Service",
    title: "PLANTS Database",
    url: "https://plants.usda.gov/",
    accessedAt: reviewedAt,
    licenseNote:
      "Use taxonomy and distribution data with citation. Image permissions vary and images are not imported by default.",
  },
  {
    id: "pnw-handbooks",
    publisher: "OSU, WSU, and University of Idaho Extension",
    title: "Pacific Northwest Pest Management Handbooks",
    url: "https://pnwhandbooks.org/",
    accessedAt: reviewedAt,
    licenseNote:
      "Store prevention summaries and deep links, not frozen pesticide directions. The product label remains authoritative.",
  },
];

const regionalFact = <T>(value: T, sourceIds = ["osu-vegetable-oregon"]) => ({
  value,
  sourceIds,
  locationScope: "western-oregon" as const,
  evidenceLevel: "extension-guidance" as const,
  reviewedAt,
});

const timing = (
  phase: PlantRecord["timing"][number]["phase"],
  anchor: PlantRecord["timing"][number]["anchor"],
  startOffsetDays: number,
  endOffsetDays: number,
) => ({
  phase,
  anchor,
  startOffsetDays,
  endOffsetDays,
  sourceIds: ["osu-vegetable-oregon"],
});

export const catalog: PlantRecord[] = [
  {
    id: "tomato",
    commonName: "Tomato",
    scientificName: "Solanum lycopersicum",
    category: "vegetable",
    summary:
      "A warm-season crop that benefits from an indoor start and transplanting after frost risk has passed.",
    daysToMaturity: regionalFact("60–90 days from transplant"),
    sun: regionalFact("Full sun"),
    water: regionalFact("Deep, consistent watering"),
    spacing: regionalFact("18–36 inches, depending on habit"),
    timing: [
      timing("indoor", "lastFrost", -56, -42),
      timing("transplant", "lastFrost", 14, 42),
      timing("harvest", "lastFrost", 70, 150),
    ],
    cultivars: [
      { id: "roma", name: "Roma", daysToMaturity: regionalFact("75–80 days") },
      {
        id: "cherokee-purple",
        name: "Cherokee Purple",
        daysToMaturity: regionalFact("80–90 days"),
      },
      {
        id: "cherry",
        name: "Cherry",
        daysToMaturity: regionalFact("60–70 days"),
      },
    ],
    companions: [
      {
        plantId: "marigold",
        effect: "contextual",
        mechanism: "beneficial-insects",
        evidenceLevel: "observational",
        explanation:
          "Flowers can support beneficial insects; this is not a guarantee of pest control.",
        sourceIds: ["umn-companions"],
      },
    ],
    growingTips: regionalFact([
      "Transplant after the soil has warmed.",
      "Support vines early and water consistently at the root zone.",
    ]),
    reviewStatus: "reviewed",
  },
  {
    id: "pepper",
    commonName: "Pepper",
    scientificName: "Capsicum annuum",
    category: "vegetable",
    summary:
      "A heat-loving crop usually started indoors well before the last spring frost.",
    daysToMaturity: regionalFact("60–90 days from transplant"),
    sun: regionalFact("Full sun"),
    water: regionalFact("Even moisture; avoid saturated soil"),
    spacing: regionalFact("18–24 inches"),
    timing: [
      timing("indoor", "lastFrost", -70, -56),
      timing("transplant", "lastFrost", 21, 42),
      timing("harvest", "lastFrost", 80, 160),
    ],
    cultivars: [
      { id: "jalapeno", name: "Jalapeño" },
      { id: "shishito", name: "Shishito" },
      { id: "serrano", name: "Serrano" },
    ],
    companions: [],
    growingTips: regionalFact([
      "Wait for reliably warm nights before transplanting.",
      "Use a sheltered, sunny position in cool-summer areas.",
    ]),
    reviewStatus: "reviewed",
  },
  {
    id: "peas",
    commonName: "Peas",
    scientificName: "Pisum sativum",
    category: "vegetable",
    summary:
      "A cool-season crop suited to early direct sowing in Western Oregon.",
    daysToMaturity: regionalFact("55–75 days"),
    sun: regionalFact("Full sun to light shade"),
    water: regionalFact("Regular moisture during flowering and pod fill"),
    spacing: regionalFact("1–3 inches"),
    timing: [
      timing("direct", "lastFrost", -42, 7),
      timing("harvest", "lastFrost", 35, 80),
    ],
    cultivars: [{ id: "sugar-snap", name: "Sugar Snap" }],
    companions: [],
    growingTips: regionalFact([
      "Provide a trellis for climbing types.",
      "Sow early enough to mature before sustained summer heat.",
    ]),
    reviewStatus: "reviewed",
  },
  {
    id: "lettuce",
    commonName: "Lettuce",
    scientificName: "Lactuca sativa",
    category: "vegetable",
    summary: "A quick cool-season crop that can be succession-sown.",
    daysToMaturity: regionalFact("35–70 days"),
    sun: regionalFact("Full sun in cool weather; afternoon shade as days warm"),
    water: regionalFact("Consistent shallow moisture"),
    spacing: regionalFact("4–12 inches by type"),
    timing: [
      timing("indoor", "lastFrost", -56, -28),
      timing("transplant", "lastFrost", -28, 21),
      timing("direct", "lastFrost", -35, 35),
      timing("harvest", "lastFrost", 0, 80),
    ],
    cultivars: [{ id: "mix", name: "Mix" }],
    companions: [],
    growingTips: regionalFact([
      "Use repeated small sowings for a longer harvest.",
      "Heat and long days can cause bolting.",
    ]),
    reviewStatus: "reviewed",
  },
  {
    id: "carrot",
    commonName: "Carrots",
    scientificName: "Daucus carota",
    category: "vegetable",
    summary:
      "A direct-sown root crop that needs loose soil and steady moisture during germination.",
    daysToMaturity: regionalFact("55–85 days"),
    sun: regionalFact("Full sun"),
    water: regionalFact("Keep the seedbed evenly moist"),
    spacing: regionalFact("Thin to 1–3 inches"),
    timing: [
      timing("direct", "lastFrost", -35, 70),
      timing("harvest", "lastFrost", 35, 140),
    ],
    cultivars: [],
    companions: [],
    growingTips: regionalFact([
      "Direct sow; avoid transplanting.",
      "Thin seedlings to prevent crowded roots.",
    ]),
    reviewStatus: "reviewed",
  },
  {
    id: "cucumber",
    commonName: "Cucumbers",
    scientificName: "Cucumis sativus",
    category: "vegetable",
    summary:
      "A warm-season vine planted after the soil and nights have warmed.",
    daysToMaturity: regionalFact("50–70 days"),
    sun: regionalFact("Full sun"),
    water: regionalFact("Deep and regular moisture"),
    spacing: regionalFact("12–36 inches, or trellised"),
    timing: [
      timing("indoor", "lastFrost", -21, -7),
      timing("transplant", "lastFrost", 21, 42),
      timing("direct", "lastFrost", 21, 49),
      timing("harvest", "lastFrost", 70, 140),
    ],
    cultivars: [],
    companions: [],
    growingTips: regionalFact([
      "Protect young plants from cold.",
      "Harvest frequently to keep vines productive.",
    ]),
    reviewStatus: "reviewed",
  },
  {
    id: "bean",
    commonName: "Beans",
    scientificName: "Phaseolus vulgaris",
    category: "vegetable",
    summary: "A warm-soil crop usually direct-sown after frost danger.",
    daysToMaturity: regionalFact("50–75 days"),
    sun: regionalFact("Full sun"),
    water: regionalFact("Regular moisture, especially at flowering"),
    spacing: regionalFact("2–6 inches by type"),
    timing: [
      timing("direct", "lastFrost", 14, 56),
      timing("harvest", "lastFrost", 65, 145),
    ],
    cultivars: [{ id: "purple-string", name: "Purple String" }],
    companions: [],
    growingTips: regionalFact([
      "Do not work plants while foliage is wet.",
      "Provide support for pole types.",
    ]),
    reviewStatus: "reviewed",
  },
  {
    id: "onion",
    commonName: "Onions",
    scientificName: "Allium cepa",
    category: "vegetable",
    summary: "A cool-season allium grown from seed, starts, or sets.",
    daysToMaturity: regionalFact("90–150 days"),
    sun: regionalFact("Full sun"),
    water: regionalFact("Steady moisture until bulbs mature"),
    spacing: regionalFact("3–5 inches"),
    timing: [
      timing("indoor", "lastFrost", -70, -42),
      timing("transplant", "lastFrost", -28, 21),
      timing("harvest", "lastFrost", 100, 170),
    ],
    cultivars: [],
    companions: [],
    growingTips: regionalFact([
      "Choose day-length types suited to the region.",
      "Reduce irrigation as tops fall and bulbs mature.",
    ]),
    reviewStatus: "reviewed",
  },
  {
    id: "garlic",
    commonName: "Garlic",
    scientificName: "Allium sativum",
    category: "herb",
    summary: "A fall-planted allium harvested the following summer.",
    daysToMaturity: regionalFact("About 8–9 months"),
    sun: regionalFact("Full sun"),
    water: regionalFact("Winter rainfall plus spring irrigation as needed"),
    spacing: regionalFact("4–6 inches"),
    timing: [
      timing("transplant", "firstFrost", -35, 21),
      timing("harvest", "lastFrost", 90, 135),
    ],
    cultivars: [],
    companions: [],
    growingTips: regionalFact([
      "Plant individual cloves in fall.",
      "Stop watering as bulbs mature and lower leaves brown.",
    ]),
    reviewStatus: "reviewed",
  },
  {
    id: "shallot",
    commonName: "Shallots",
    scientificName: "Allium cepa Aggregatum Group",
    category: "herb",
    summary: "A multiplier allium commonly planted in fall or early spring.",
    daysToMaturity: regionalFact("90–120 days"),
    sun: regionalFact("Full sun"),
    water: regionalFact("Moderate, tapering near maturity"),
    spacing: regionalFact("6–8 inches"),
    timing: [
      timing("transplant", "lastFrost", -42, 14),
      timing("harvest", "lastFrost", 80, 130),
    ],
    cultivars: [],
    companions: [],
    growingTips: regionalFact([
      "Use well-drained soil.",
      "Harvest when tops yellow and fall.",
    ]),
    reviewStatus: "reviewed",
  },
  {
    id: "basil",
    commonName: "Basil",
    scientificName: "Ocimum basilicum",
    category: "herb",
    summary: "A frost-tender herb that grows best after nights become warm.",
    daysToMaturity: regionalFact("25–60 days"),
    sun: regionalFact("Full sun"),
    water: regionalFact("Consistent moisture in well-drained soil"),
    spacing: regionalFact("8–12 inches"),
    timing: [
      timing("indoor", "lastFrost", -42, -21),
      timing("transplant", "lastFrost", 21, 42),
      timing("harvest", "lastFrost", 45, 145),
    ],
    cultivars: [],
    companions: [],
    growingTips: regionalFact([
      "Pinch growing tips to encourage branching.",
      "Protect from cold nights and frost.",
    ]),
    reviewStatus: "reviewed",
  },
  {
    id: "marigold",
    commonName: "Marigolds",
    scientificName: "Tagetes spp.",
    category: "flower",
    summary:
      "A warm-season flowering annual useful for color and insect habitat.",
    daysToMaturity: regionalFact("50–70 days to bloom"),
    sun: regionalFact("Full sun"),
    water: regionalFact("Moderate; allow the surface to dry between watering"),
    spacing: regionalFact("8–18 inches"),
    timing: [
      timing("indoor", "lastFrost", -42, -21),
      timing("transplant", "lastFrost", 7, 35),
      timing("bloom", "lastFrost", 45, 160),
    ],
    cultivars: [],
    companions: [
      {
        plantId: "tomato",
        effect: "contextual",
        mechanism: "beneficial-insects",
        evidenceLevel: "observational",
        explanation:
          "Flowers may support beneficial insects, but should not be treated as reliable pest prevention.",
        sourceIds: ["umn-companions"],
      },
    ],
    growingTips: regionalFact([
      "Deadhead to extend bloom.",
      "Allow room for airflow around plants.",
    ]),
    reviewStatus: "reviewed",
  },
];

export const catalogById = new Map(catalog.map((plant) => [plant.id, plant]));

export function findCatalogPlant(name: string) {
  const normalized = name.toLowerCase().replace(/s$/, "");
  return catalog.find(
    (plant) => plant.commonName.toLowerCase().replace(/s$/, "") === normalized,
  );
}
