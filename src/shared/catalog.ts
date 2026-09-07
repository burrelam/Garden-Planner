import type { PlantRecord, SourceRecord, SourcedFact } from "./model";

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
  {
    id: "osu-educators-guide",
    publisher: "Oregon State University Extension Service",
    title: "An Educator's Guide to Vegetable Gardening",
    url: "https://extension.oregonstate.edu/catalog/em-9032-educators-guide-vegetable-gardening",
    revision: "EM 9032, published September 2011, reviewed 2024",
    accessedAt: "2026-09-07",
    licenseNote:
      "Copyrighted Extension guidance. Paraphrase discrete facts and link to the source. Carries the days-to-maturity and soil/air temperature tables.",
  },
];

const regionalFact = <T>(
  value: T,
  sourceIds = ["osu-vegetable-oregon"],
  factReviewedAt = reviewedAt,
) => ({
  value,
  sourceIds,
  locationScope: "western-oregon" as const,
  evidenceLevel: "extension-guidance" as const,
  reviewedAt: factReviewedAt,
});

const timing = (
  phase: PlantRecord["timing"][number]["phase"],
  anchor: PlantRecord["timing"][number]["anchor"],
  startOffsetDays: number,
  endOffsetDays: number,
  sourceIds = ["osu-vegetable-oregon"],
) => ({
  phase,
  anchor,
  startOffsetDays,
  endOffsetDays,
  sourceIds,
});

// Entries re-sourced field by field against the OSU publications carry this date. Anything still
// on the original catalog review date has not had that treatment yet.
const resourcedAt = "2026-09-07";

// EM 9032 Appendix C is a calendar for the Willamette Valley specifically, which is a tighter
// scope than EC 871's "Western valleys, Portland to Roseburg". Facts record which they came from.
const osuFact = <T>(
  value: T,
  sourceIds: string[],
  locationScope: SourcedFact<T>["locationScope"] = "western-oregon",
) => ({
  value,
  sourceIds,
  locationScope,
  evidenceLevel: "extension-guidance" as const,
  reviewedAt: resourcedAt,
});

// A variety the gardener grows that OSU does not list. It carries no sourced claim, only a name,
// so nothing here pretends the publications recommend it.
const ownCultivar = (id: string, name: string) => ({ id, name });

// EC 871 lists recommended varieties for Oregon grouped by horticultural type.
const osuCultivar = (id: string, name: string, type: string) => ({
  id,
  name,
  type: osuFact(type, ["osu-vegetable-oregon"]),
});

export const catalog: PlantRecord[] = [
  {
    id: "tomato",
    commonName: "Tomato",
    scientificName: "Solanum lycopersicum",
    category: "vegetable",
    summary:
      "A warm-season crop for the Western valleys, set out as transplants once May arrives.",
    daysToMaturity: osuFact("60–75 days from transplant", [
      "osu-educators-guide",
    ]),
    sun: osuFact("Full sun", ["osu-vegetable-oregon"]),
    water: osuFact(
      "Water regularly and evenly — irregular watering brings on blossom-end rot",
      ["osu-vegetable-oregon"],
    ),
    soil: osuFact(
      "Loam or sandy loam, well drained, with compost worked in each year. Most vegetables want pH 6.0–7.5; western Oregon soils run more acidic and usually need lime.",
      ["osu-vegetable-oregon", "osu-educators-guide"],
    ),
    spacing: osuFact(
      "Rows 36 inches, closer if supported; 24 inches apart in the row",
      ["osu-vegetable-oregon"],
    ),
    timing: [
      timing("indoor", "lastFrost", -9, 21, ["osu-vegetable-oregon"]),
      timing("transplant", "lastFrost", 47, 77, ["osu-vegetable-oregon"]),
      timing("harvest", "lastFrost", 107, 152, [
        "osu-vegetable-oregon",
        "osu-educators-guide",
      ]),
    ],
    cultivars: [
      osuCultivar("oregon-eleven", "Oregon Eleven", "Very early"),
      osuCultivar("early-girl", "Early Girl", "Early"),
      osuCultivar("oregon-spring", "Oregon Spring", "Early"),
      osuCultivar("santiam", "Santiam", "Early"),
      osuCultivar("oregon-pride", "Oregon Pride", "Early"),
      osuCultivar("oregon-star", "Oregon Star", "Early"),
      osuCultivar("siletz", "Siletz", "Early"),
      osuCultivar("legend", "Legend", "Early"),
      osuCultivar("willamette", "Willamette", "Midseason"),
      osuCultivar("pik-red", "Pik Red", "Midseason"),
      osuCultivar("celebrity", "Celebrity", "Midseason"),
      osuCultivar("sunleaper", "Sunleaper", "Midseason"),
      osuCultivar("mountain-spring", "Mountain Spring", "Midseason"),
      osuCultivar("medford", "Medford", "Midseason"),
      osuCultivar("first-lady-ii", "First Lady II", "Midseason"),
      osuCultivar("big-beef", "Big Beef", "Midseason"),
      osuCultivar("big-boy", "Big Boy", "Late"),
      osuCultivar("bhn-44", "BHN 44", "Late"),
      osuCultivar("oregon-cherry", "Oregon Cherry", "Cherry"),
      osuCultivar("gold-nugget", "Gold Nugget", "Cherry"),
      osuCultivar("sweet-million", "Sweet Million", "Cherry"),
      osuCultivar("cherry-grande", "Cherry Grande", "Cherry"),
      osuCultivar("sun-gold", "Sun Gold", "Cherry"),
      osuCultivar("early-cherry", "Early Cherry", "Cherry"),
      osuCultivar("thai-pink", "Thai Pink", "Cherry"),
      osuCultivar("juliet", "Juliet", "Cherry"),
      osuCultivar("sunsugar", "Sunsugar", "Cherry"),
      osuCultivar("large-german-cherry", "Large German Cherry", "Cherry"),
      osuCultivar("sweet-baby-girl", "Sweet Baby Girl", "Cherry"),
      osuCultivar("golden-boy", "Golden Boy", "Yellow"),
      osuCultivar("jubilee", "Jubilee", "Yellow"),
      osuCultivar("oroma", "Oroma", "Paste"),
      osuCultivar("saucy", "Saucy", "Paste"),
      osuCultivar("halley-3155", "Halley 3155", "Paste"),
      osuCultivar("viva-italia", "Viva Italia", "Paste"),
      osuCultivar("super-marzano", "Super Marzano", "Paste"),
      osuCultivar("macero-ii", "Macero II", "Paste"),
      osuCultivar("health-kick", "Health Kick", "Paste"),
      osuCultivar("brandywine", "Brandywine", "Heirloom"),
      ownCultivar("cherokee-purple", "Cherokee Purple"),
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
    growingTips: osuFact(
      [
        "Choose early varieties with compact growth; they suit most of Oregon best.",
        "Set out well-grown plants after the last frost.",
        "Cage or trellis indeterminate varieties; determinate ones need no support.",
        "Watch for flea beetle damage on young plants.",
      ],
      ["osu-vegetable-oregon"],
    ),
    reviewStatus: "reviewed",
  },

  {
    id: "pepper",
    commonName: "Pepper",
    scientificName: "Capsicum annuum",
    category: "vegetable",
    summary:
      "A heat lover for the Western valleys, best grown from transplants set out in May or June.",
    daysToMaturity: osuFact(
      "72–90 days from transplant; about 18 weeks if grown from seed",
      ["osu-educators-guide"],
    ),
    sun: osuFact("Full sun", ["osu-vegetable-oregon"]),
    water: osuFact("Even moisture; avoid saturated soil", [
      "osu-vegetable-oregon",
    ]),
    soil: osuFact(
      "Loam or sandy loam, well drained, with compost worked in each year. Most vegetables want pH 6.0–7.5; western Oregon soils run more acidic and usually need lime.",
      ["osu-vegetable-oregon", "osu-educators-guide"],
    ),
    spacing: osuFact("Rows 24 inches; 12–18 inches apart in the row", [
      "osu-vegetable-oregon",
    ]),
    timing: [
      timing("indoor", "lastFrost", -23, 37, ["osu-vegetable-oregon"]),
      timing("transplant", "lastFrost", 47, 107, ["osu-vegetable-oregon"]),
      timing("harvest", "lastFrost", 119, 197, [
        "osu-vegetable-oregon",
        "osu-educators-guide",
      ]),
    ],
    cultivars: [
      osuCultivar(
        "parks-early-thickset",
        "Parks Early Thickset",
        "Sweet bell, green to red",
      ),
      osuCultivar("camelot", "Camelot", "Sweet bell, green to red"),
      osuCultivar("fat-n-sassy", "Fat 'N Sassy", "Sweet bell, green to red"),
      osuCultivar("bellboy", "Bellboy", "Sweet bell, green to red"),
      osuCultivar("jupiter", "Jupiter", "Sweet bell, green to red"),
      osuCultivar("yankee-bell", "Yankee Bell", "Sweet bell, green to red"),
      osuCultivar("north-star", "North Star", "Sweet bell, green to red"),
      osuCultivar("vidi", "Vidi", "Sweet bell, green to red"),
      osuCultivar("elisa", "Elisa", "Sweet bell, green to red"),
      osuCultivar("lady-bell", "Lady Bell", "Sweet bell, green to red"),
      osuCultivar("king-arthur", "King Arthur", "Sweet bell, green to red"),
      osuCultivar("lantern", "Lantern", "Sweet bell, green to red"),
      osuCultivar("conquest", "Conquest", "Sweet bell, green to red"),
      osuCultivar("tequila", "Tequila", "Sweet bell, green to red"),
      osuCultivar(
        "blushing-beauty",
        "Blushing Beauty",
        "Sweet bell, green to red",
      ),
      osuCultivar("golden-bell", "Golden Bell", "Sweet bell, green to yellow"),
      osuCultivar(
        "golden-summer",
        "Golden Summer",
        "Sweet bell, green to yellow",
      ),
      osuCultivar("labrador", "Labrador", "Sweet bell, green to yellow"),
      osuCultivar("ariane", "Ariane", "Sweet bell, green to orange"),
      osuCultivar("corona", "Corona", "Sweet bell, green to orange"),
      osuCultivar("lilac-bell", "Lilac Bell", "Sweet bell, green to purple"),
      osuCultivar(
        "purple-beauty",
        "Purple Beauty",
        "Sweet bell, green to purple",
      ),
      osuCultivar("sweet-banana", "Sweet Banana", "Specialty sweet"),
      osuCultivar("gypsy", "Gypsy", "Specialty sweet"),
      osuCultivar("biscayne", "Biscayne", "Specialty sweet"),
      osuCultivar("flamingo", "Flamingo", "Specialty sweet"),
      osuCultivar("lipstick", "Lipstick", "Specialty sweet"),
      osuCultivar("giant-marconi", "Giant Marconi", "Specialty sweet"),
      osuCultivar("super-cayenne-ii", "Super Cayenne II", "Cayenne"),
      osuCultivar("hero", "Hero", "Cayenne"),
      osuCultivar("andy", "Andy", "Cayenne"),
      osuCultivar("cayenne-long-slim", "Cayenne Long Slim", "Cayenne"),
      osuCultivar("tam-jalape-o", "Tam Jalapeño", "Jalapeño"),
      osuCultivar("early-jalape-o", "Early Jalapeño", "Jalapeño"),
      osuCultivar("conchos", "Conchos", "Jalapeño"),
      osuCultivar("mitla", "Mitla", "Jalapeño"),
      osuCultivar("cherry-bomb", "Cherry Bomb", "Specialty hot"),
      osuCultivar("serrano", "Serrano", "Specialty hot"),
      osuCultivar("anaheim-tmr-23", "Anaheim TMR 23", "Specialty hot"),
      ownCultivar("shishito", "Shishito"),
    ],
    companions: [],
    growingTips: osuFact(
      [
        "Heat lovers — grow from transplants rather than direct sowing.",
        "Supply plenty of nitrogen early to build vigour before fruit set.",
        "Plastic mulch raises soil temperature and helps in a cool summer.",
        "Transplants want to be 6 to 8 weeks old when they go out.",
      ],
      ["osu-vegetable-oregon", "osu-educators-guide"],
    ),
    reviewStatus: "reviewed",
  },

  {
    id: "peas",
    commonName: "Peas",
    scientificName: "Pisum sativum",
    category: "vegetable",
    summary:
      "A cool-season crop direct sown in the Western valleys from February into May.",
    daysToMaturity: osuFact("About 60 days from seed", ["osu-educators-guide"]),
    sun: osuFact("Full sun to light shade", ["osu-vegetable-oregon"]),
    water: osuFact("Regular moisture through flowering and pod fill", [
      "osu-vegetable-oregon",
    ]),
    soil: osuFact(
      "Loam or sandy loam, well drained, with compost worked in each year. Most vegetables want pH 6.0–7.5; western Oregon soils run more acidic and usually need lime.",
      ["osu-vegetable-oregon", "osu-educators-guide"],
    ),
    spacing: osuFact(
      "Rows 24 inches for bush types and 36 inches for vining; 2 inches apart in the row",
      ["osu-vegetable-oregon"],
    ),
    timing: [
      timing("direct", "lastFrost", -42, 77, ["osu-vegetable-oregon"]),
      timing("harvest", "lastFrost", 18, 137, [
        "osu-vegetable-oregon",
        "osu-educators-guide",
      ]),
    ],
    cultivars: [
      osuCultivar("novella-ii", "Novella II", "Shelling"),
      osuCultivar("oregon-trail", "Oregon Trail", "Shelling"),
      osuCultivar("oregon-pioneer", "Oregon Pioneer", "Shelling"),
      osuCultivar("green-arrow", "Green Arrow", "Shelling"),
      osuCultivar("maxigolt", "Maxigolt", "Shelling"),
      osuCultivar("oregon-sugar-pod-ii", "Oregon Sugar Pod II", "Edible pod"),
      osuCultivar("oregon-giant", "Oregon Giant", "Edible pod"),
      osuCultivar("sugar-daddy", "Sugar Daddy", "Snap pea, bush"),
      osuCultivar("super-snappy", "Super Snappy", "Snap pea, bush"),
      osuCultivar("cascadia", "Cascadia", "Snap pea, bush"),
      osuCultivar("sugar-sprint", "Sugar Sprint", "Snap pea, bush"),
      osuCultivar("sugar-snap", "Sugar Snap", "Snap pea, pole"),
      osuCultivar("super-sugar-snap", "Super Sugar Snap", "Snap pea, pole"),
    ],
    companions: [],
    growingTips: osuFact(
      [
        "Plant early and sow successively, or mix varieties with different maturity dates.",
        "In the Willamette Valley use enation-virus-resistant varieties for April and May sowings.",
        "Trellis: it makes picking thorough, which prolongs bearing.",
        "Snow peas carry a flat edible pod; snap peas a fleshy round one.",
      ],
      ["osu-vegetable-oregon"],
    ),
    reviewStatus: "reviewed",
  },

  {
    id: "lettuce",
    commonName: "Lettuce",
    scientificName: "Lactuca sativa",
    category: "vegetable",
    summary:
      "A cool-season salad crop for the Western valleys, sown in short succession rows from spring into late summer.",
    // EM 9032 gives seed-to-harvest maturity separately for leaf and head types.
    daysToMaturity: osuFact(
      "Leaf types 35–40 days from seed; head types 53–73 days",
      ["osu-educators-guide"],
    ),
    sun: osuFact("Full sun in cool weather; partial shade once it turns hot", [
      "osu-educators-guide",
    ]),
    water: osuFact(
      "Water often — lettuce draws from the top foot of soil or less",
      ["osu-growing-your-own"],
    ),
    // OSU gives soil texture and pH for vegetables as a group, not for lettuce specifically.
    // EC 871 is the most recently revised of the three and sets the pH range used here.
    soil: osuFact(
      "Loam or sandy loam, well drained, with compost worked in each year. Most vegetables want pH 6.0–7.5; western Oregon soils run more acidic and usually need lime.",
      ["osu-vegetable-oregon", "osu-educators-guide"],
    ),
    // Row spacing from EC 871 region 2; leaf thinning distance from EM 9032.
    spacing: osuFact(
      "Rows 12 inches apart; thin leaf types to 4–6 inches and head types to 12 inches",
      ["osu-vegetable-oregon", "osu-educators-guide"],
    ),
    // EC 871 and EM 9027 agree for region 2 (Western valleys, Portland to Roseburg): plant out
    // April–July for head and April–August for leaf, starting transplants five weeks earlier.
    // Offsets are days from the last frost date the gardener has set.
    timing: [
      timing("indoor", "lastFrost", -18, 134),
      timing("transplant", "lastFrost", 17, 169),
      timing("direct", "lastFrost", 17, 169),
      // Harvest spans the earliest sowing plus the shortest leaf maturity through the latest
      // sowing plus the longest head maturity.
      timing("harvest", "lastFrost", 52, 242, [
        "osu-vegetable-oregon",
        "osu-educators-guide",
      ]),
    ],
    // Varieties recommended for Oregon in EC 871.
    cultivars: [
      osuCultivar("summertime", "Summertime", "Heading, main season"),
      osuCultivar("ithaca", "Ithaca", "Heading, main season"),
      osuCultivar("salinas", "Salinas", "Heading, fall crop"),
      osuCultivar("prizehead", "Prizehead", "Red leaf"),
      osuCultivar("red-sails", "Red Sails", "Red leaf"),
      osuCultivar("redina", "Redina", "Red leaf"),
      osuCultivar("new-red-fire", "New Red Fire", "Red leaf"),
      osuCultivar("salad-bowl", "Salad Bowl", "Green leaf"),
      osuCultivar("grand-rapids", "Grand Rapids", "Green leaf"),
      osuCultivar("slobolt", "Slobolt", "Green leaf"),
      osuCultivar("green-vision", "Green Vision", "Green leaf"),
      osuCultivar("oaky-red-splash", "Oaky Red Splash", "Oak leaf"),
      osuCultivar("paris-island", "Paris Island", "Romaine"),
      osuCultivar("valmaine", "Valmaine", "Romaine"),
      osuCultivar("green-towers", "Green Towers", "Romaine"),
      osuCultivar("outredgeous", "Outredgeous", "Romaine"),
      osuCultivar("devils-tongue", "Devils Tongue", "Romaine"),
      osuCultivar("little-gem", "Little Gem", "Romaine"),
      osuCultivar("freckles", "Freckles", "Romaine"),
      osuCultivar("summer-bibb", "Summer Bibb", "Bibb"),
      osuCultivar("ovation", "Ovation", "Bibb"),
      osuCultivar("optima", "Optima", "Bibb"),
      osuCultivar("buttercrunch", "Buttercrunch", "Bibb"),
      osuCultivar("esmeralda", "Esmeralda", "Butterhead"),
      osuCultivar(
        "marvel-of-four-seasons",
        "Marvel of Four Seasons",
        "Butterhead",
      ),
      osuCultivar("nevada", "Nevada", "Batavian"),
      osuCultivar("sierra", "Sierra", "Batavian"),
    ],
    companions: [],
    growingTips: osuFact(
      [
        "Sow short rows every 14 days so the harvest arrives in usable amounts.",
        "Choose heat-resistant varieties for later sowings; heat and long days push plants to bolt.",
        "Set the first transplants out alongside early cabbage.",
        "Sow the small seed about half an inch deep.",
        "Cut head lettuce when the head feels firm, leaving 2–3 inches above the crown so it releafs.",
        "Thin young plantings by eating the thinnings as salad.",
      ],
      ["osu-vegetable-oregon", "osu-growing-your-own", "osu-educators-guide"],
    ),
    reviewStatus: "reviewed",
  },
  {
    id: "carrot",
    commonName: "Carrots",
    scientificName: "Daucus carota",
    category: "vegetable",
    summary:
      "A direct-sown root crop for the Western valleys, sown March through mid-July.",
    daysToMaturity: osuFact("60–88 days from seed", ["osu-educators-guide"]),
    sun: osuFact("Full sun", ["osu-vegetable-oregon"]),
    water: osuFact(
      "Keep the seedbed evenly moist, especially through germination",
      ["osu-educators-guide"],
    ),
    soil: osuFact(
      "Loam or sandy loam, well drained. Raised beds give smoother, longer roots; use shorter varieties in heavy soil.",
      ["osu-vegetable-oregon", "osu-educators-guide"],
    ),
    spacing: osuFact("Rows 12 inches; thin to 2 inches apart in the row", [
      "osu-vegetable-oregon",
    ]),
    timing: [
      timing("direct", "lastFrost", -14, 122, ["osu-vegetable-oregon"]),
      timing("harvest", "lastFrost", 46, 210, [
        "osu-vegetable-oregon",
        "osu-educators-guide",
      ]),
    ],
    cultivars: [
      osuCultivar("red-cored-chantenay", "Red Cored Chantenay", "Standard"),
      osuCultivar("royal-chantenay", "Royal Chantenay", "Standard"),
      osuCultivar("scarlet-nantes", "Scarlet Nantes", "Standard"),
      osuCultivar("mokum", "Mokum", "Standard"),
      osuCultivar("bolero", "Bolero", "Standard"),
      osuCultivar("danvers", "Danvers", "Standard"),
      osuCultivar("sugarsnax-54", "Sugarsnax 54", "Standard"),
      osuCultivar("nelson", "Nelson", "Standard"),
      osuCultivar("napoli", "Napoli", "Standard"),
      osuCultivar("kuroda", "Kuroda", "Standard"),
      osuCultivar("sweetness-ii", "Sweetness II", "Standard"),
      osuCultivar("minicore", "Minicore", "Baby"),
      osuCultivar("babette", "Babette", "Baby"),
      osuCultivar("parmex", "Parmex", "Baby"),
      osuCultivar("thumbelina", "Thumbelina", "Baby"),
    ],
    companions: [],
    growingTips: osuFact(
      [
        "For early carrots, sow as soon as spring conditions allow.",
        "Grow in raised beds for smoother, longer roots.",
        "In heavy soil choose shorter varieties — Danvers, Nantes or Chantenay.",
        "Carrots germinate slowly and must be thinned.",
      ],
      ["osu-vegetable-oregon", "osu-educators-guide"],
    ),
    reviewStatus: "reviewed",
  },

  {
    id: "cucumber",
    commonName: "Cucumbers",
    scientificName: "Cucumis sativus",
    category: "vegetable",
    summary:
      "A warm-season vine for the Western valleys, planted out in May or June once the soil has warmed.",
    daysToMaturity: osuFact(
      "Pickling 30–40 days from transplant; slicing 32–46 days",
      ["osu-educators-guide"],
    ),
    sun: osuFact("Full sun", ["osu-vegetable-oregon"]),
    water: osuFact("Deep and regular moisture", ["osu-vegetable-oregon"]),
    soil: osuFact(
      "Loam or sandy loam, well drained, with compost worked in each year. Most vegetables want pH 6.0–7.5; western Oregon soils run more acidic and usually need lime.",
      ["osu-vegetable-oregon", "osu-educators-guide"],
    ),
    spacing: osuFact(
      "Rows 36 inches; 6–12 inches apart in the row, or 6 inches when trellised",
      ["osu-vegetable-oregon", "osu-educators-guide"],
    ),
    timing: [
      timing("indoor", "lastFrost", 19, 79, ["osu-vegetable-oregon"]),
      timing("transplant", "lastFrost", 47, 107, ["osu-vegetable-oregon"]),
      timing("direct", "lastFrost", 47, 107, ["osu-vegetable-oregon"]),
      timing("harvest", "lastFrost", 77, 153, [
        "osu-vegetable-oregon",
        "osu-educators-guide",
      ]),
    ],
    cultivars: [
      osuCultivar("smr-58", "SMR 58", "Pickling"),
      osuCultivar("pioneer", "Pioneer", "Pickling"),
      osuCultivar("bush-pickle", "Bush Pickle", "Pickling"),
      osuCultivar("county-fair", "County Fair", "Pickling"),
      osuCultivar("burpee-hybrid", "Burpee Hybrid", "Slicing"),
      osuCultivar("marketmore-86", "Marketmore 86", "Slicing"),
      osuCultivar("marketmore-97", "Marketmore 97", "Slicing"),
      osuCultivar("poinsett", "Poinsett", "Slicing"),
      osuCultivar("dasher-ii", "Dasher II", "Slicing"),
      osuCultivar("slicemaster", "Slicemaster", "Slicing"),
      osuCultivar("tasty-green", "Tasty Green", "Slicing"),
      osuCultivar("orient-express", "Orient Express", "Slicing"),
      osuCultivar("suyo-cross", "Suyo Cross", "Slicing"),
      osuCultivar("amira", "Amira", "Slicing"),
      osuCultivar("armenian", "Armenian", "Novelty"),
      osuCultivar("lemon", "Lemon", "Novelty"),
    ],
    companions: [],
    growingTips: osuFact(
      [
        "Transplants want to be about 2 to 3 weeks old when they go out.",
        "Harvest early in the morning for the best flavour and refrigerate straight away.",
        "Pick often to keep the vines producing.",
        "Trellising saves a great deal of ground space.",
      ],
      ["osu-educators-guide"],
    ),
    reviewStatus: "reviewed",
  },

  {
    id: "bean",
    commonName: "Beans",
    scientificName: "Phaseolus vulgaris",
    category: "vegetable",
    summary:
      "A warm-soil crop direct sown in the Western valleys through May and June.",
    daysToMaturity: osuFact("54–65 days from seed", ["osu-educators-guide"]),
    sun: osuFact("Full sun", ["osu-vegetable-oregon"]),
    water: osuFact("Regular moisture, watered at soil level", [
      "osu-vegetable-oregon",
    ]),
    soil: osuFact(
      "Loam or sandy loam, well drained, with compost worked in each year. Most vegetables want pH 6.0–7.5; western Oregon soils run more acidic and usually need lime.",
      ["osu-vegetable-oregon", "osu-educators-guide"],
    ),
    spacing: osuFact(
      "Rows 12–24 inches; bush types 2–6 inches apart and pole types 12–24 inches",
      ["osu-vegetable-oregon"],
    ),
    timing: [
      timing("direct", "lastFrost", 47, 107, ["osu-vegetable-oregon"]),
      timing("harvest", "lastFrost", 101, 172, [
        "osu-vegetable-oregon",
        "osu-educators-guide",
      ]),
    ],
    cultivars: [
      osuCultivar("tendercrop", "Tendercrop", "Green bush"),
      osuCultivar("venture", "Venture", "Green bush"),
      osuCultivar("slenderette", "Slenderette", "Green bush"),
      osuCultivar("oregon-91g", "Oregon 91G", "Green bush"),
      osuCultivar("oregon-trail", "Oregon Trail", "Green bush"),
      osuCultivar("provider", "Provider", "Green bush"),
      osuCultivar("jade", "Jade", "Green bush"),
      osuCultivar("oregon-54", "Oregon 54", "Green bush"),
      osuCultivar("blue-lake", "Blue Lake", "Green pole"),
      osuCultivar("kentucky-wonder", "Kentucky Wonder", "Green pole"),
      osuCultivar("romano", "Romano", "Green pole"),
      osuCultivar("cascade-giant", "Cascade Giant", "Green pole"),
      osuCultivar("kentucky-blue", "Kentucky Blue", "Green pole"),
      osuCultivar("oregon-giant", "Oregon Giant", "Green pole"),
      osuCultivar("roma-ii", "Roma II", "Flat Italian"),
      osuCultivar("nickel", "Nickel", "French filet"),
      osuCultivar("grenoble", "Grenoble", "French filet"),
      osuCultivar("goldenrod", "Goldenrod", "Wax bush"),
      osuCultivar("goldenrush", "Goldenrush", "Wax bush"),
      osuCultivar("indy-gold", "Indy Gold", "Wax bush"),
      osuCultivar("slenderwax", "Slenderwax", "Wax bush"),
      osuCultivar("envy", "Envy", "Edamame"),
      osuCultivar("early-hakucho", "Early Hakucho", "Edamame"),
      osuCultivar("butterbean", "Butterbean", "Edamame"),
      osuCultivar("sayamusume", "Sayamusume", "Edamame"),
    ],
    companions: [],
    growingTips: osuFact(
      [
        "Easy from seed; they can also be started in pots and transplanted.",
        "Do not work among the plants while the foliage is wet.",
        "Give pole types their support before they need it.",
        "Sow about 6 beans per pole, or 3 to 4 inches apart for bush types.",
      ],
      ["osu-vegetable-oregon", "osu-educators-guide"],
    ),
    reviewStatus: "reviewed",
  },

  {
    id: "onion",
    commonName: "Onions",
    scientificName: "Allium cepa",
    category: "vegetable",
    summary:
      "A cool-season allium for the Western valleys, planted March through May from seed, sets or transplants.",
    daysToMaturity: osuFact("110–120 days", ["osu-educators-guide"]),
    sun: osuFact("Full sun", ["osu-vegetable-oregon"]),
    water: osuFact("Steady moisture until the bulbs mature", [
      "osu-vegetable-oregon",
    ]),
    soil: osuFact("Light, fertile, well-drained soil", [
      "osu-vegetable-oregon",
    ]),
    spacing: osuFact("Rows 12 inches; 3 inches apart in the row", [
      "osu-vegetable-oregon",
    ]),
    timing: [
      timing("indoor", "lastFrost", -84, 7, ["osu-vegetable-oregon"]),
      timing("transplant", "lastFrost", -14, 77, ["osu-vegetable-oregon"]),
      timing("harvest", "lastFrost", 96, 197, [
        "osu-vegetable-oregon",
        "osu-educators-guide",
      ]),
    ],
    cultivars: [
      osuCultivar("copra", "Copra", "Yellow"),
      osuCultivar("prince", "Prince", "Yellow"),
      osuCultivar("first-edition", "First Edition", "Yellow"),
      osuCultivar("millennium", "Millennium", "Yellow"),
      osuCultivar("frontier", "Frontier", "Yellow"),
      osuCultivar("new-york-early", "New York Early", "Yellow"),
      osuCultivar("candy", "Candy", "Yellow"),
      osuCultivar("redwing", "Redwing", "Red"),
      osuCultivar("mars", "Mars", "Red"),
      osuCultivar("white-sweet-spanish", "White Sweet Spanish", "White"),
      osuCultivar("blanco-duro", "Blanco Duro", "White"),
      osuCultivar("superstar", "Superstar", "White"),
      osuCultivar("buffalo", "Buffalo", "Overwintering"),
      osuCultivar("walla-walla-sweet", "Walla Walla Sweet", "Overwintering"),
      osuCultivar("ishikura", "Ishikura", "Green bunching"),
      osuCultivar("tokyo-long-white", "Tokyo Long White", "Green bunching"),
      osuCultivar("he-shi-ko", "He-shi-ko", "Green bunching"),
    ],
    companions: [],
    growingTips: osuFact(
      [
        "Plant as early as spring allows, so tops grow well before bulbing begins.",
        "Use long-day or day-neutral varieties in Oregon.",
        "Starting from seed rather than sets gives a much wider choice of variety.",
        "Scallions and chives can be picked in 8 to 9 weeks.",
      ],
      ["osu-vegetable-oregon", "osu-educators-guide"],
    ),
    reviewStatus: "reviewed",
  },

  {
    id: "garlic",
    commonName: "Garlic",
    scientificName: "Allium sativum",
    category: "herb",
    summary:
      "A fall-planted allium for the Western valleys, harvested the following summer.",
    daysToMaturity: osuFact(
      "120–185 days; the longer it grows the bigger the bulbs",
      ["osu-educators-guide"],
    ),
    sun: osuFact("Full sun", ["osu-vegetable-oregon"]),
    water: osuFact("Winter rainfall plus spring irrigation as needed", [
      "osu-vegetable-oregon",
    ]),
    soil: osuFact("Light, fertile, well-drained soil", [
      "osu-vegetable-oregon",
    ]),
    spacing: osuFact("Rows 12 inches; 3 inches apart in the row", [
      "osu-vegetable-oregon",
    ]),
    timing: [
      timing("transplant", "firstFrost", -75, 0, ["osu-vegetable-oregon"]),
      timing("transplant", "lastFrost", -73, -15, ["osu-vegetable-oregon"]),
      timing("harvest", "lastFrost", 105, 170, ["osu-educators-guide"]),
    ],
    cultivars: [],
    companions: [],
    growingTips: osuFact(
      [
        "EC 871 plants garlic in the Western valleys any time from September to February.",
        "Plant individual cloves, pointed end up.",
        "It can be lifted and used at any size; leaving it longer makes bigger bulbs.",
        "Stop watering as the bulbs mature and the lower leaves brown.",
      ],
      ["osu-vegetable-oregon", "osu-educators-guide"],
    ),
    reviewStatus: "reviewed",
  },

  {
    id: "shallot",
    commonName: "Shallots",
    scientificName: "Allium cepa Aggregatum Group",
    category: "herb",
    summary:
      "A multiplier allium for the Willamette Valley, sown after mid-February or again in September.",
    // EM 9032's Appendix C calendar is the only OSU publication that carries shallots at all, and
    // it gives sowing months only — no maturity, spacing, sun or water figure exists to cite.
    timing: [
      timing("direct", "lastFrost", -27, -15, ["osu-educators-guide"]),
      timing("direct", "firstFrost", -75, -46, ["osu-educators-guide"]),
    ],
    cultivars: [],
    companions: [],
    growingTips: osuFact(
      [
        "EM 9032 sows shallots outdoors after 15 February, alongside garlic and onion sets.",
        "They can go in again in September for the following season.",
      ],
      ["osu-educators-guide"],
      "willamette-valley",
    ),
    reviewStatus: "reviewed",
  },

  {
    id: "basil",
    commonName: "Basil",
    scientificName: "Ocimum basilicum",
    category: "herb",
    summary:
      "A frost-tender herb for the Willamette Valley, started under cover in mid-April and set out once the nights turn mild.",
    // EC 871's herbs note names sweet basil directly. It gives no maturity or spacing figure, so
    // this entry has none — a gap is honest where a borrowed number would not be.
    sun: osuFact("A sunny position", ["osu-vegetable-oregon"]),
    water: osuFact("Little water or feeding needed", ["osu-vegetable-oregon"]),
    timing: [
      timing("indoor", "lastFrost", 32, 46, ["osu-educators-guide"]),
      timing("transplant", "lastFrost", 32, 77, ["osu-educators-guide"]),
    ],
    cultivars: [],
    companions: [],
    growingTips: osuFact(
      [
        "Most common herbs, sweet basil among them, grow readily from seed.",
        "Herbs do best in a sunny spot and ask for little care, water or fertiliser.",
        "EM 9032 starts basil in flats from mid-April and sets it out under a cloche or row cover from mid-April into May.",
      ],
      ["osu-vegetable-oregon", "osu-educators-guide"],
    ),
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
