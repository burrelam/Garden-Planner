# GardenBuddy plant-data sources

Last reviewed: 2026-08-24

## Recommended source-of-truth policy

GardenBuddy should ship a reviewed, version-controlled catalog. Plant facts should be
available when every upstream website is down; upstream pages are editorial inputs and
citations, not live application dependencies.

Use one authority for each kind of fact:

1. **Regional timing and general care:** Oregon State University Extension guidance for
   the Western Valleys or Willamette Valley.
2. **Frost climatology:** NOAA/NCEI station normals for the garden's configured location.
3. **Perennial cold tolerance:** the current USDA Plant Hardiness Zone Map edition.
4. **Taxonomy and U.S. distribution:** USDA NRCS PLANTS.
5. **Pests and diseases:** the current Pacific Northwest Pest Management Handbooks, with
   pesticide labels remaining the legal authority.
6. **Companion relationships:** mechanism-specific Extension or primary research, never
   an unattributed “friends and enemies” chart.

Keep hardiness and frost timing separate. The USDA map describes the 1991–2020 average
annual **extreme minimum** temperature and is meant primarily to indicate where perennial
plants may survive; it does not supply spring or fall frost dates
([USDA: How to Use the Maps](https://planthardiness.ars.usda.gov/pages/how-to-use-the-maps)).
NOAA frost/freeze normals are climatology rather than a forecast, and OSU's Willamette
Valley calendar explicitly says its average-weather dates may need adjustment for actual
weather and soil temperature
([OSU EM 9032](https://extension.oregonstate.edu/catalog/em-9032-educators-guide-vegetable-gardening)).

Every displayed sourced fact should carry a `sourceId`, geographic scope, source
revision/edition, access date, review date, and evidence level. Timing records should also
record whether they mean indoor sowing, direct sowing, transplanting, or harvesting.
Cultivar days-to-maturity may come from the breeder or the seed packet actually used, but
must be labeled as a cultivar/vendor estimate rather than a regional Extension fact.

## Primary sources and intended use

| Source                                                                                                                                                                                                                                                                                                    | Use in GardenBuddy                                                                                                                                                                                                                                                                      | Ingestion and review policy                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [OSU EM 9032, _An Educator's Guide to Vegetable Gardening_](https://extension.oregonstate.edu/catalog/em-9032-educators-guide-vegetable-gardening)                                                                                                                                                        | The most directly scoped planting calendar: common plants in Oregon's Willamette Valley, split into direct sowing, protected starts, transplants, and season-extender planting.                                                                                                         | Manually encode and paraphrase individual timing rules. Review annually before spring and whenever OSU publishes a revision. Preserve the publication number and revision/access dates.                                                                                                                                          |
| [OSU EM 9027, _Growing Your Own_](https://extension.oregonstate.edu/catalog/em-9027-growing-your-own) and [OSU EC 871, _Vegetable Gardening in Oregon_](https://extension.oregonstate.edu/catalog/pub/ec-871-vegetable-gardening-oregon)                                                                  | Western Valleys planting ranges, indoor-start lead times, spacing, succession planting, soil, watering, rotation, and general care. OSU defines Western Valleys as Portland to Roseburg and notes that season length varies year to year.                                               | Use as the regional baseline and resolve conflicts in favor of the more recently revised, more specifically scoped OSU publication. Review annually. Treat numeric fertilizer and pesticide advice as high-risk, revision-sensitive content.                                                                                     |
| [NOAA/NCEI 1991–2020 U.S. Climate Normals](https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals) and its [dataset record](https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ncdc%3AC01619)                                                                   | First/last frost or freeze normals, growing-season length, and supporting temperature normals for a selected representative station. NCEI calls itself the official source for conventional 30-year U.S. climate normals and recommends the current 1991–2020 release.                  | Import a pinned snapshot, storing station ID, station name, threshold, statistic/probability, normals period, and dataset version. Let the gardener override dates for a known microclimate. Check annually for corrections and adopt each new standard-normal edition through a reviewed catalog update, not a runtime request. |
| [2023 USDA Plant Hardiness Zone Map](https://planthardiness.ars.usda.gov/) and [2023 PHZM GIS downloads](https://prism.oregonstate.edu/phzm/)                                                                                                                                                             | A location's zone/half-zone and perennial cold-survival context only. The edition uses 1991–2020 data and 10°F zones divided into 5°F half-zones.                                                                                                                                       | Pin the 2023 edition and store the resolved zone with its lookup date. Refresh only when USDA publishes a new edition or the garden location changes. Do not convert a zone into vegetable sowing dates or frost dates.                                                                                                          |
| [USDA NRCS PLANTS](https://plants.usda.gov/) and the [PLANTS help/data-use guide](https://plants.usda.gov/assets/docs/PLANTS_Help_Document_2022.pdf)                                                                                                                                                      | Accepted scientific name, synonyms, family, common names, native status, and U.S./state distribution.                                                                                                                                                                                   | Use versioned downloads or a reviewed lookup; retain the PLANTS symbol/identifier and access date. Review taxonomy annually or when a plant record is edited. PLANTS is not the authority for home-garden care, commercial cultivars, or Willamette Valley timing.                                                               |
| [Pacific Northwest Pest Management Handbooks](https://pnwhandbooks.org/) and [handbook citation/permission guidance](https://pnwhandbooks.org/insect/citing-handbook)                                                                                                                                     | Regional pest and disease identification, host relationships, monitoring, cultural controls, and links to current management guidance. The handbooks are a joint OSU, WSU, and University of Idaho Extension publication.                                                               | Store concise, non-chemical summaries and deep links to the relevant current page. Review at least annually; the online handbook cites an edition year and individual pages expose revision dates. Re-check immediately before publishing any pesticide-related content.                                                         |
| [WSU EM128E, _Gardening with Companion Plants_](https://pubs.extension.wsu.edu/product/gardening-with-companion-plants-home-garden-series/) and [WSU EM057E, _Home Vegetable Gardening in Washington_](https://pubs.extension.wsu.edu/product/home-vegetable-gardening-in-washington-home-garden-series/) | Evidence framework for intercropping and companion relationships. WSU distinguishes documented mechanisms—such as nitrogen fixation, microclimate moderation, beneficial-insect habitat, host-finding disruption, and plant competition—from popular charts that lack credible support. | Encode a specific mechanism, direction, conditions, citation, and evidence level for every relationship. Review annually and when relevant new Extension guidance is published. Do not turn a general mechanism into a guaranteed crop-pair claim.                                                                               |

For a default 32°F freeze anchor, the NOAA annual-normal fields are
`ANN-TMIN-PRBLST-T32FP50` (median last spring freeze) and
`ANN-TMIN-PRBFST-T32FP50` (median first fall freeze). GardenBuddy must retain both the
temperature threshold and probability: a 32°F freeze normal is not the same measure as a
36°F frost-risk normal
([NOAA annual-normal documentation](https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/doc/Normals_ANN_Documentation_1991-2020.pdf)).

For pest advice, the application should prefer prevention, monitoring, physical/cultural
controls, and links to current integrated pest-management guidance. The PNW handbook
states that it has no legal status and that the pesticide label is the legal document; the
app should therefore not freeze product rates, registrations, intervals, or safety directions
into its catalog
([PNW landscape guidance](https://pnwhandbooks.org/insect/hort/landscape)).

## Companion-planting evidence model

The existing heart/warning UI can remain, but each relationship needs both a direction and
a mechanism. Recommended levels are:

- `research-supported`: the specific relationship and outcome are supported by applicable
  peer-reviewed research or a research synthesis.
- `extension-guidance`: a named Extension publication recommends the specific relationship
  for a relevant region or setting.
- `observational`: useful local experience or a credible practitioner observation, not a
  controlled result.
- `traditional`: folklore or customary pairing with no adequate supporting evidence found.

Display the level and citation near the claim. Traditional claims must use tentative wording
and must never produce a strong warning. “Both are in the same family” is not by itself a
negative companion relationship; crop-rotation or shared-pest warnings should name the
specific mechanism and timescale. WSU notes that companion planting can be scientifically
sound while many popular pair charts lack credible support
([WSU EM128E](https://pubs.extension.wsu.edu/product/gardening-with-companion-plants-home-garden-series/)).

## Licensing and reuse cautions

- **OSU, WSU, and PNW Extension:** assume prose, tables, and images are copyrighted unless
  a page gives an explicit open license. Paraphrase discrete facts, cite and link the source,
  and do not reproduce complete tables or substantial prose. The PNW handbook explicitly
  directs users to seek permission to reprint or adapt written content, and image rights vary
  by item
  ([PNW permission guidance](https://pnwhandbooks.org/insect/citing-handbook);
  [OSU copyright and fair-use policy](https://policy.oregonstate.edu/policy/copyright-fair-use)).
- **NOAA/NCEI:** NOAA-produced environmental data are public domain in the United States;
  credit NOAA/NCEI, preserve dataset metadata, do not imply endorsement, and check whether
  any contributed item has separate terms
  ([NCEI Open Data Policy](https://www.ncei.noaa.gov/sites/default/files/2023-12/NCEI%20PD-10-2-02%20-%20Open%20Data%20Policy%20Signed.pdf)).
- **USDA PLANTS:** its plant information, distribution maps, lists, and text are not
  copyrighted and are free to use with citation. Image rights differ: most images require
  permission and all require attribution, so GardenBuddy should not import PLANTS images by
  default
  ([PLANTS data-use guide](https://plants.usda.gov/assets/docs/PLANTS_Help_Document_2022.pdf)).
- **USDA hardiness data:** the official map graphic is a U.S. government work, but OSU owns
  the underlying GIS datasets. Derived maps have logo/display conditions, and altered maps
  require a prominent unofficial-map disclaimer and removal of USDA/OSU logos. A stored zone
  value with a citation is simpler than redistributing a derived map
  ([USDA map creation and reuse terms](https://planthardiness.ars.usda.gov/pages/map-creation)).

## Runtime dependency policy

Do **not** make planning, plant detail, or companion features depend at runtime on OSU/WSU
pages, PNW handbook pages, the USDA hardiness ArcGIS viewer, USDA PLANTS, seed-vendor
pages, search results, or an LLM. These sources lack a supported application API, may change
shape, may be unavailable, or contain material that should receive editorial and licensing
review before publication. NOAA climate normals should likewise be imported and cached as a
versioned dataset rather than fetched on every request.

If live weather is added later, keep it separate from the reviewed plant catalog. The
[National Weather Service API](https://www.weather.gov/documentation/services-web-api) is an
appropriate optional source for forecasts and active frost/freeze alerts; it requires an
identifying `User-Agent`, is cache-oriented, and has rate limits. Live weather must be labeled
as a forecast/alert and must not silently rewrite the user's frost dates or the historical
normal used to calculate the planting plan. GardenBuddy v1 should have no runtime
plant-information dependency.
