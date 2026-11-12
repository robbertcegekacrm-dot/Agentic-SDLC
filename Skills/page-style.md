# In-app page style

Applies to every page that runs **inside a model driven app**: generative pages, custom pages and HTML web resources used as start page, planning board or overview. The goal is that a page looks like part of the app, not like a separate website. Standalone experiences (code apps, Power Pages) keep the full brand look from `brand.md`.

## Principles
- **The app shell leads.** The page follows Fluent 2, the design system of the model driven app: the same font, background, cards, spacing and controls. Cegeka shows up in accents, not in large surfaces.
- **Calm and dense.** One clear title, then content. No hero banners, no full width color bands, no decoration.
- **Color means something.** Neutral by default. Blue for data and links, Purple for attention, Red only for what needs action now.

## Build with Fluent UI v9
- Use Fluent UI v9 components: `Card`, `Badge`, `Button`, `Text`, `Table` or `DataGrid`, `Skeleton`, `Tooltip`, `Divider`, `MessageBar`.
- Style with Griffel `makeStyles` and Fluent `tokens`, never hard coded grey values or fonts. Brand colors only through the small token map below.
- Font: the Fluent base font (`tokens.fontFamilyBase`, Segoe UI). Do not load Nunito Sans inside model driven apps; a second font is the main reason a page feels foreign.

## Brand token map
| Token | Value | Use |
|---|---|---|
| `accent` | Sea Blue `#0095BB` | Primary chart series, selected state, focus accents |
| `accentStrong` | Dark Blue `#00647D` | Primary button background (white text), links, active tab indicator |
| `accentStrongHover` | Darkest Blue `#00323E` | Hover and pressed state of primary buttons |
| `accentSoft` | `#B2DFEB` | Selected row, subtle highlight, chart area fill at 40% opacity |
| `attention` | Purple `#632064` on tint `#D0BCD0` | Waiting or attention badges |
| `danger` | `#A1221B` text on tint `#FAC9C9` | Overdue and problem badges; Red `#F04B4C` only as a small dot or chart bar that means a problem |
| `success` | Darkest Blue `#00323E` on tint `#B2D0D8` | Done or valid badges |

Use at most one primary button per page.

## Layout
- Page background: the same neutral as the app pages (`tokens.colorNeutralBackground2`), cards in `tokens.colorNeutralBackground1` (white).
- Page padding 24 px, gap between cards 16 px, content in a 12 column CSS grid.
- Cards: `tokens.borderRadiusXLarge` (8 px), `tokens.shadow4`, no border, inner padding 16 to 20 px. Clickable cards get `tokens.shadow8` on hover and a visible focus ring.
- Responsive: KPI row 6 columns from 1400 px, 3 columns from 900 px, 2 columns below. Two column sections stack below 1100 px.

## Page header
- No color band. A plain header row on the page background:
  - Left: page title (`fontSizeBase600` 24 px, semibold, `colorNeutralForeground1`) with one subtitle line below (`fontSizeBase300` 14 px, `colorNeutralForeground3`), for example "PWN drinkwaterinstallaties · bijgewerkt 09:41".
  - Right: optional filter (for example a Rayon dropdown or segmented "Alles / Mijn rayon") and a subtle refresh button (`appearance="subtle"`, icon plus text "Vernieuwen").
- Header height about 72 px including padding.

## KPI tiles
- White card, top to bottom: label (`fontSizeBase300`, semibold, `colorNeutralForeground2`), value (`fontSizeHero700` 28 px, semibold, `colorNeutralForeground1`, `font-variant-numeric: tabular-nums`), one context line (`fontSizeBase200` 12 px, `colorNeutralForeground3`, for example "3 in Amstelland" or "vorige week 31").
- No thick colored side borders. Status is shown with one small `Badge appearance="tint"` top right, only when it adds meaning ("Actie nodig" in the danger tint, "Let op" in the attention tint).
- The whole tile is a link to the matching view, with a chevron icon on hover.

## Section cards
- Header row: title (`fontSizeBase400` 16 px, semibold) left, one action link right ("Bekijk alles", in `accentStrong`). Meta information like "174 actieve objecten" goes in the subtitle in `colorNeutralForeground3`, not as a link.
- No colored underline below the header; use spacing or a `Divider` in `colorNeutralStroke2`.

## Charts
- One series color by default (`accent`). Ordinal scales may use the tints from light to dark. Red only for a bar that is a problem.
- Bars at most 40 px wide with 4 px top radius, value labels 12 px in `colorNeutralForeground2`, gridlines 1 px `colorNeutralStroke2`, axis labels 12 px `colorNeutralForeground3`, no chart borders or backgrounds.
- Line charts: 2 px line in `accent`, small points only on hover, optional area fill in `accentSoft` at 40% opacity, y axis starting at 0 with three or four gridlines.
- Every chart has a short title and, where useful, a one line takeaway in the subtitle.

## Lists and tables
- Lists: rows of 56 px with the primary text (14 px semibold) and one secondary line (12 px, `colorNeutralForeground3`), a tint badge right, row hover in `colorNeutralBackground1Hover`, the whole row clickable. At most 5 rows, then "Bekijk alles".
- Tables: Fluent `Table` in compact size, header 12 px semibold `colorNeutralForeground3`, numbers right aligned with tabular numerals, row dividers in `colorNeutralStroke2`. Highlight a problem number with a tint badge, not by coloring the text red.

## States and quality
- Loading: `Skeleton` blocks in the shape of the content, never a full page spinner.
- Empty: one calm sentence and, when useful, one action ("Geen achterstallige inspecties").
- Errors: a `MessageBar` with intent error above the content, with a retry action.
- Accessibility: WCAG AA contrast for all text (all badge pairs in the token map are at least 4.5:1), keyboard reachable tiles and rows, visible focus, `aria-label` on icon buttons and tiles, numbers readable by screen readers with their label.
- Dates and numbers in the language of the demo (Dutch: 27 okt 2026, 1.234).