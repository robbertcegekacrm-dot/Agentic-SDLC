# Cegeka brand for demo builds

Stay close to the Cegeka brand guide. This is the subset that matters for Power Platform demos.

## Core palette
| Name | Hex | Use |
|---|---|---|
| Cegeka Blue | `#00C7F9` | Leading accent, hero bands, primary buttons, active states. Never as text on white; put black text on top. |
| Sea Blue | `#0095BB` | Navigation bars, section headers, secondary accent. White text on top. |
| Dark Blue | `#00647D` | Safe text color in blue, tertiary accent. |
| Darkest Blue | `#00323E` | Text on light blue fills. |
| Sky Blue | `#80E3FC` | Light fills and highlights only, never as text. |
| Purple | `#632064` | KPI badges, highlights. White text on top. |
| Red | `#F04B4C` | Alerts and problems only. White text on top. |
| Light grey | `#F1F1F1` | Card and panel backgrounds. |
| Divider grey | `#DCDCDC` | Borders and dividers. |
| Body text | `#3D3D3D` | Body text. |
| Headings | `#000000` | Headings. |

Background is always white. The only approved gradient is Cegeka Blue to Sea Blue, used sparingly on a few headline words.

Font: Nunito Sans (Regular, Semibold, Bold) loaded from Google Fonts in web resources and code apps, with fallback `Aptos, "Segoe UI", sans-serif`.

## Option set colors
Option colors in Dataverse are shown as the background of a pill with dark text. Full brand colors are too dark for that (black on Purple or Dark Blue is unreadable) and make grids restless. So **every choice option uses the light tint** of its brand color. The full colors stay for header bands, buttons, charts and accents.

Map choice options by meaning, consistently across all tables:

| Meaning | Examples | Base color | Option color (tint) |
|---|---|---|---|
| New, submitted, open | Nieuw, Ingediend, Open, Gestart | Sea Blue `#0095BB` | `#B2DFEB` |
| In progress, active | In behandeling, In uitvoering, Actief | Cegeka Blue `#00C7F9` | `#B2EEFD` |
| Waiting, attention needed | Wacht op medewerker, Verloopt binnenkort, Krap, Preboarding | Purple `#632064` | `#D0BCD0` |
| Done, approved, valid | Afgehandeld, Goedgekeurd, Afgerond, Geldig, Voldoende | Dark Blue `#00647D` | `#B2D0D8` |
| Problem, rejected, expired | Afgewezen, Verlopen, Onvoldoende | Red `#F04B4C` | `#FAC9C9` |
| Inactive, neutral, other | Inactief, Uit dienst, Overig | Grey `#7A7A7A` | `#D7D7D7` |
| Categories without status meaning | Afdeling, Categorie, Type | Cycle Cegeka Blue, Sea Blue, Purple, Dark Blue, Sky Blue | Cycle `#B2EEFD`, `#B2DFEB`, `#D0BCD0`, `#B2D0D8`, `#D9F7FE` |
| Ordinal scales | Risicoklasse 1 to 5, Prioriteit | Light to dark | `#D9F7FE`, `#B2EEFD`, `#B2DFEB`, `#B2D0D8`, `#D0BCD0` |

Standard State: Active gets `#B2EEFD`, Inactive gets `#D7D7D7`.

All tints have a contrast of at least 11:1 with black text.

In generative pages, custom pages and canvas apps, status pills use the same tint as background with text in the base color (or `#3D3D3D` for Cegeka Blue, Sky Blue and Grey), so they match the grids.

## Start pages, cards and charts
- Pages inside a model driven app (generative pages, custom pages, start page web resources) follow `page-style.md`: Fluent 2 look of the app, no header band, brand colors as accents.
- Standalone pages (code apps, portals): white page, light grey cards, Sea Blue or Cegeka Blue header band, Purple KPI badges, Red only for items that need action.
- Calm over loud: full brand colors on small accents only (one primary button, a badge, a chart series). Large colored areas and lists of pills use the tints.
- Charts: monochromatic blues by default (`#00C7F9`, `#0095BB`, `#00647D`, `#00323E`); max five colors; red only when it means a problem.
- Clean and calm: generous whitespace, few icons, no decoration for its own sake.