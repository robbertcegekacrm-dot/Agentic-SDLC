import * as React from 'react';
import {
  Badge,
  Button,
  Link,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Skeleton,
  SkeletonItem,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import { ArrowClockwiseRegular, ChevronRightRegular, OpenRegular } from '@fluentui/react-icons';
import type { GeneratedComponentProps } from './RuntimeTypes';

// ---------------------------------------------------------------------------
// View ids: placeholders, replaced with real savedquery ids before upload.
// While a value still starts with '__VIEW_' the tile opens the default list.
// ---------------------------------------------------------------------------
const VIEW_ALL_OPEN = '__VIEW_ALL_OPEN__';
const VIEW_AUTONOMOUS_PIPELINE = '__VIEW_AUTONOMOUS_PIPELINE__';
const VIEW_RELEASED = '__VIEW_RELEASED__';
const VIEW_AWAITING_HUMAN = '__VIEW_AWAITING_HUMAN__';
const VIEW_RELEASED_THIS_WEEK = '__VIEW_RELEASED_THIS_WEEK__';

const PAGE_NAME = 'SDLC Dashboard';
const STORY = 'cgk_sdlcstory';
const ACTIVITY = 'cgk_agentactivity';
const RELEASE = 'cgk_release';
const FEED_SIZE = 15;
const RELEASE_COUNT = 5;
const FEED_REFRESH_MS = 30000;
const FORMATTED = '@OData.Community.Display.V1.FormattedValue';

// ---------------------------------------------------------------------------
// Brand token map (Skills/page-style.md) and option tints (Skills/brand.md).
// These are the only hex values on the page; neutrals come from Fluent tokens.
// ---------------------------------------------------------------------------
const BRAND = {
  accent: '#0095BB',
  accentStrong: '#00647D',
  accentStrongHover: '#00323E',
  accentSoft: '#B2DFEB',
  attention: '#632064',
  attentionTint: '#D0BCD0',
  danger: '#A1221B',
  dangerTint: '#FAC9C9',
  success: '#00323E',
  successTint: '#B2D0D8',
} as const;

// Pill = option tint as background, base color as text; where the base color misses WCAG AA on its
// tint (Sea Blue, Dark Blue, Red) the next darker brand color is used. Cegeka Blue, Sky, Grey: #3D3D3D.
type Tint = { bg: string; fg: string };
const TINT: Record<'sea' | 'cegeka' | 'purple' | 'dark' | 'red' | 'grey' | 'sky', Tint> = {
  sea: { bg: '#B2DFEB', fg: '#00647D' },
  cegeka: { bg: '#B2EEFD', fg: '#3D3D3D' },
  purple: { bg: '#D0BCD0', fg: '#632064' },
  dark: { bg: '#B2D0D8', fg: '#00323E' },
  red: { bg: '#FAC9C9', fg: '#A1221B' },
  grey: { bg: '#D7D7D7', fg: '#3D3D3D' },
  sky: { bg: '#D9F7FE', fg: '#3D3D3D' },
};

// ---------------------------------------------------------------------------
// Option values (scripts/agentic-sdlc/model.js)
// ---------------------------------------------------------------------------
const ST = {
  New: 1,
  Triaging: 766630100,
  Triaged: 766630101,
  InDevelopment: 766630102,
  Testing: 766630103,
  AwaitingApproval: 766630104,
  Released: 766630105,
  RoutedToHuman: 766630106,
  Closed: 2,
} as const;

const PIPELINE: Array<{ value: number; label: string; tint: Tint }> = [
  { value: ST.New, label: 'New', tint: TINT.sea },
  { value: ST.Triaging, label: 'Triaging', tint: TINT.cegeka },
  { value: ST.Triaged, label: 'Triaged', tint: TINT.cegeka },
  { value: ST.InDevelopment, label: 'In development', tint: TINT.cegeka },
  { value: ST.Testing, label: 'Testing', tint: TINT.cegeka },
  { value: ST.AwaitingApproval, label: 'Awaiting approval', tint: TINT.purple },
  { value: ST.Released, label: 'Released', tint: TINT.dark },
];
const PIPELINE_SIDE: Array<{ value: number; label: string; tint: Tint }> = [
  { value: ST.RoutedToHuman, label: 'Routed to human', tint: TINT.purple },
  { value: ST.Closed, label: 'Closed', tint: TINT.grey },
];

const TYPES: Array<{ value: number; label: string }> = [
  { value: 766630000, label: 'New feature' },
  { value: 766630001, label: 'Issue' },
  { value: 766630002, label: 'Improvement' },
  { value: 766630003, label: 'Change request' },
  { value: 766630004, label: 'Technical debt' },
  { value: 766630005, label: 'Question' },
];
const PATH_AUTONOMOUS = 766630000;
const PATH_HUMAN = 766630001;
const PATHS: Array<{ value: number; label: string }> = [
  { value: PATH_AUTONOMOUS, label: 'Autonomous' },
  { value: PATH_HUMAN, label: 'Human' },
];

const AGENTS: Record<number, { label: string; tint: Tint }> = {
  766630000: { label: 'Intake', tint: TINT.cegeka },
  766630001: { label: 'Triage', tint: TINT.sea },
  766630002: { label: 'Build', tint: TINT.purple },
  766630003: { label: 'Test', tint: TINT.dark },
  766630004: { label: 'Release', tint: TINT.sky },
  766630005: { label: 'Human', tint: TINT.grey },
};
// Outcome badges follow the page-style token map: Success, Warning = attention, Failed = danger, Info = accentSoft.
const OUTCOMES: Record<number, { label: string; tint: Tint }> = {
  766630000: { label: 'Success', tint: { bg: BRAND.successTint, fg: BRAND.success } },
  766630001: { label: 'Warning', tint: { bg: BRAND.attentionTint, fg: BRAND.attention } },
  766630002: { label: 'Failed', tint: { bg: BRAND.dangerTint, fg: BRAND.danger } },
  766630003: { label: 'Info', tint: { bg: BRAND.accentSoft, fg: BRAND.accentStrongHover } },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type StoryRow = {
  cgk_sdlcstoryid: string;
  cgk_title?: string | null;
  cgk_storynumber?: string | null;
  cgk_type?: number | null;
  cgk_deliverypath?: number | null;
  statuscode?: number | null;
  statecode?: number | null;
  cgk_leadtimemin?: number | null;
  cgk_resolvedon?: string | null;
  cgk_priority?: number | null;
  createdon?: string | null;
  modifiedon?: string | null;
  _cgk_release_value?: string | null;
  [annotation: string]: unknown;
};
type ActivityRow = {
  cgk_agentactivityid: string;
  cgk_name?: string | null;
  cgk_agent?: number | null;
  cgk_outcome?: number | null;
  cgk_timestamp?: string | null;
  _cgk_sdlcstory_value?: string | null;
  cgk_details?: string | null;
  [annotation: string]: unknown;
};
type ReleaseRow = {
  cgk_releaseid: string;
  cgk_name?: string | null;
  cgk_version?: string | null;
  cgk_releasedon?: string | null;
  cgk_deploymenturl?: string | null;
  [annotation: string]: unknown;
};
type Paged<T> = { rows: T[]; hasMoreRows?: boolean; loadMoreRows?: () => Promise<Paged<T>> };
type DataApi = GeneratedComponentProps['dataApi'];
type PageProps = GeneratedComponentProps;
type XrmLike = { Navigation?: { navigateTo?: (input: Record<string, unknown>) => Promise<unknown> } };

type PageError = { operation: string; message: string; retry?: () => void };

// ---------------------------------------------------------------------------
// Data access
// ---------------------------------------------------------------------------
async function collectRows<T>(pending: Promise<Paged<T>>, maxPages = 20): Promise<T[]> {
  let page = await pending;
  const rows: T[] = [...(page.rows ?? [])];
  let guard = 0;
  while (page.hasMoreRows && typeof page.loadMoreRows === 'function' && guard < maxPages) {
    page = await page.loadMoreRows();
    rows.push(...(page.rows ?? []));
    guard += 1;
  }
  return rows;
}

function loadStories(dataApi: DataApi): Promise<StoryRow[]> {
  return collectRows<StoryRow>(
    dataApi.queryTable(STORY, {
      select: [
        'cgk_sdlcstoryid', 'cgk_title', 'cgk_storynumber', 'cgk_type', 'cgk_deliverypath', 'statuscode', 'statecode',
        'cgk_leadtimemin', 'cgk_resolvedon', 'cgk_priority', 'createdon', 'modifiedon', '_cgk_release_value',
      ],
      orderBy: 'createdon desc',
      pageSize: 500,
    }) as unknown as Promise<Paged<StoryRow>>,
  );
}

async function loadActivities(dataApi: DataApi): Promise<ActivityRow[]> {
  const page = await (dataApi.queryTable(ACTIVITY, {
    select: ['cgk_agentactivityid', 'cgk_name', 'cgk_agent', 'cgk_outcome', 'cgk_timestamp', '_cgk_sdlcstory_value', 'cgk_details'],
    orderBy: 'cgk_timestamp desc',
    pageSize: FEED_SIZE,
  }) as unknown as Promise<Paged<ActivityRow>>);
  return (page.rows ?? []).slice(0, FEED_SIZE);
}

async function loadReleases(dataApi: DataApi): Promise<ReleaseRow[]> {
  const page = await (dataApi.queryTable(RELEASE, {
    select: ['cgk_releaseid', 'cgk_name', 'cgk_version', 'cgk_releasedon', 'cgk_deploymenturl'],
    orderBy: 'cgk_releasedon desc',
    pageSize: RELEASE_COUNT,
  }) as unknown as Promise<Paged<ReleaseRow>>);
  return (page.rows ?? []).slice(0, RELEASE_COUNT);
}

function errorMessage(error: unknown): string {
  try {
    const raw = error && typeof error === 'object' && 'message' in error ? (error as { message?: unknown }).message : error;
    const line = typeof raw === 'string' ? raw.split(/[\r\n]/)[0].trim() : '';
    return line.length > 240 ? line.slice(0, 239) + '…' : line;
  } catch {
    return '';
  }
}

function reportError(operation: string, error: unknown, retry?: () => void): PageError {
  const detail = errorMessage(error);
  console.error(`[${PAGE_NAME}] ${operation} failed`, detail);
  return { operation, message: detail, retry };
}

const normId = (value: unknown): string => (typeof value === 'string' ? value.replace(/[{}]/g, '').trim().toLowerCase() : '');

function getXrm(): XrmLike | undefined {
  return (window as unknown as { Xrm?: XrmLike }).Xrm;
}

// ---------------------------------------------------------------------------
// Formatting (en-BE style: "12 Nov 2026", 24 h clock)
// ---------------------------------------------------------------------------
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad2 = (n: number) => (n < 10 ? '0' + n : String(n));

function toDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
const formatDate = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const formatTime = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const formatNumber = (n: number) => new Intl.NumberFormat('en-BE', { maximumFractionDigits: 0 }).format(n);

function formatDuration(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes)) return '–';
  if (minutes < 90) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 10) return `${(Math.round(hours * 10) / 10).toFixed(1)} h`;
  return `${Math.round(hours)} h`;
}

function relativeTime(d: Date | null, now: Date): string {
  if (!d) return '';
  const minutes = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? 'yesterday' : `${days} days ago`;
  return formatDate(d);
}

function startOfWeek(now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const offset = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - offset);
  return d;
}

// ---------------------------------------------------------------------------
// Derived figures
// ---------------------------------------------------------------------------
function mean(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;
}

function deriveOverview(stories: StoryRow[], now: Date) {
  const statusCount = new Map<number, number>();
  for (const s of stories) {
    const code = typeof s.statuscode === 'number' ? s.statuscode : -1;
    statusCount.set(code, (statusCount.get(code) ?? 0) + 1);
  }
  const count = (code: number) => statusCount.get(code) ?? 0;
  const released = stories.filter((s) => s.statuscode === ST.Released);
  const releasedAuto = released.filter((s) => s.cgk_deliverypath === PATH_AUTONOMOUS);
  const releasedHuman = released.filter((s) => s.cgk_deliverypath === PATH_HUMAN);
  const lead = (rows: StoryRow[]) => mean(rows.map((s) => s.cgk_leadtimemin).filter((v): v is number => typeof v === 'number'));
  const weekStart = startOfWeek(now).getTime();
  const releasedThisWeek = released.filter((s) => {
    const d = toDate(s.cgk_resolvedon);
    return d !== null && d.getTime() >= weekStart;
  }).length;
  const releaseCounts = new Map<string, number>();
  for (const s of stories) {
    const id = normId(s._cgk_release_value);
    if (id) releaseCounts.set(id, (releaseCounts.get(id) ?? 0) + 1);
  }
  const byId = new Map<string, StoryRow>();
  for (const s of stories) byId.set(normId(s.cgk_sdlcstoryid), s);
  return {
    open: stories.filter((s) => s.statecode === 0).length,
    releasedCount: released.length,
    releasedAutoCount: releasedAuto.length,
    autoPct: released.length > 0 ? Math.round((releasedAuto.length / released.length) * 100) : null,
    leadAuto: lead(releasedAuto),
    leadHuman: lead(releasedHuman),
    awaitingHuman: count(ST.AwaitingApproval) + count(ST.RoutedToHuman),
    routed: count(ST.RoutedToHuman),
    awaitingApproval: count(ST.AwaitingApproval),
    releasedThisWeek,
    inProgress: count(ST.Triaging) + count(ST.Triaged) + count(ST.InDevelopment) + count(ST.Testing),
    statusCount: count,
    types: TYPES.map((t) => ({ label: t.label, value: stories.filter((s) => s.cgk_type === t.value).length })),
    paths: PATHS.map((p) => ({ label: p.label, value: stories.filter((s) => s.cgk_deliverypath === p.value).length })),
    untriaged: stories.filter((s) => typeof s.cgk_deliverypath !== 'number').length,
    total: stories.length,
    releaseCounts,
    byId,
  };
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const useStyles = makeStyles({
  root: {
    boxSizing: 'border-box',
    height: '100%',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    paddingTop: '24px',
    paddingBottom: '24px',
    paddingLeft: '24px',
    paddingRight: '24px',
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground1,
    fontFamily: tokens.fontFamilyBase,
    '@media (max-width: 599px)': { paddingLeft: '16px', paddingRight: '16px' },
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', minHeight: '48px' },
  headerText: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '0' },
  title: {
    margin: '0',
    fontSize: tokens.fontSizeBase600,
    lineHeight: tokens.lineHeightBase600,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  subtitle: { margin: '0', fontSize: tokens.fontSizeBase300, lineHeight: tokens.lineHeightBase300, color: tokens.colorNeutralForeground3 },
  messages: { display: 'flex', flexDirection: 'column', gap: '8px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: '16px' },
  kpiSection: { gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: '16px' },
  kpiCell: {
    gridColumn: 'span 6',
    '@media (min-width: 900px) and (max-width: 1399px)': { gridColumn: 'span 4' },
    '@media (min-width: 1400px)': { gridColumn: 'span 2' },
  },
  spanFull: { gridColumn: '1 / -1' },
  spanWide: { gridColumn: 'span 12', '@media (min-width: 1100px)': { gridColumn: 'span 7' } },
  spanNarrow: { gridColumn: 'span 12', '@media (min-width: 1100px)': { gridColumn: 'span 5' } },
  column: { display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '0' },
  card: {
    boxSizing: 'border-box',
    minWidth: '0',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    paddingTop: '20px',
    paddingBottom: '20px',
    paddingLeft: '20px',
    paddingRight: '20px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow4,
  },
  feedCard: { maxHeight: '560px' },
  cardHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' },
  cardHeading: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '0' },
  cardTitle: {
    margin: '0',
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  cardSubtitle: { fontSize: tokens.fontSizeBase200, lineHeight: tokens.lineHeightBase200, color: tokens.colorNeutralForeground3 },
  actionLink: {
    flexShrink: 0,
    whiteSpace: 'nowrap',
    fontSize: tokens.fontSizeBase300,
    color: BRAND.accentStrong,
    ':hover': { color: BRAND.accentStrongHover },
  },
  kpiTile: {
    boxSizing: 'border-box',
    minWidth: '0',
    minHeight: '128px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '4px',
    paddingTop: '16px',
    paddingBottom: '16px',
    paddingLeft: '20px',
    paddingRight: '16px',
    margin: '0',
    textAlign: 'left',
    cursor: 'pointer',
    border: 'none',
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow4,
    color: tokens.colorNeutralForeground1,
    fontFamily: tokens.fontFamilyBase,
    transitionProperty: 'box-shadow',
    transitionDuration: tokens.durationFaster,
    ':hover': { boxShadow: tokens.shadow8 },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px', boxShadow: tokens.shadow8 },
    '&:hover [data-kpi-chevron]': { opacity: 1 },
    '&:focus-visible [data-kpi-chevron]': { opacity: 1 },
  },
  kpiTop: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' },
  kpiLabel: {
    minWidth: '0',
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
  },
  kpiValue: {
    marginTop: '4px',
    fontSize: tokens.fontSizeHero700,
    lineHeight: tokens.lineHeightHero700,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    fontVariantNumeric: 'tabular-nums',
  },
  kpiContextRow: { marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' },
  kpiContext: { minWidth: '0', fontSize: tokens.fontSizeBase200, lineHeight: tokens.lineHeightBase200, color: tokens.colorNeutralForeground3 },
  kpiChevron: {
    display: 'flex',
    flexShrink: 0,
    fontSize: '16px',
    color: BRAND.accentStrong,
    opacity: 0,
    transitionProperty: 'opacity',
    transitionDuration: tokens.durationFaster,
  },
  badge: { flexShrink: 0, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' },
  pipeline: { display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: '8px' },
  pipelineMain: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px', flexGrow: 1, minWidth: '0' },
  pipelineSide: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '8px',
    paddingLeft: '12px',
    borderLeft: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  stage: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: '96px',
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '12px',
    paddingRight: '12px',
    borderRadius: tokens.borderRadiusLarge,
  },
  stageCount: {
    fontSize: tokens.fontSizeBase500,
    lineHeight: tokens.lineHeightBase500,
    fontWeight: tokens.fontWeightSemibold,
    fontVariantNumeric: 'tabular-nums',
  },
  stageLabel: { fontSize: tokens.fontSizeBase200, lineHeight: tokens.lineHeightBase200, whiteSpace: 'nowrap' },
  chevron: { display: 'flex', color: tokens.colorNeutralForeground3, fontSize: '16px' },
  chartTitle: {
    margin: '0',
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
  },
  hbars: { display: 'flex', flexDirection: 'column', gap: '8px' },
  hbarRow: { display: 'grid', gridTemplateColumns: '120px minmax(0, 1fr) 32px', alignItems: 'center', gap: '8px' },
  hbarLabel: {
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    color: tokens.colorNeutralForeground3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  hbarTrack: { height: '20px', display: 'flex', alignItems: 'center', borderLeft: `1px solid ${tokens.colorNeutralStroke2}` },
  hbar: { height: '20px', minWidth: '2px', borderTopRightRadius: '4px', borderBottomRightRadius: '4px', backgroundColor: BRAND.accent },
  hbarValue: {
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    color: tokens.colorNeutralForeground2,
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
  },
  divider: { height: '1px', backgroundColor: tokens.colorNeutralStroke2, border: 'none', margin: '0' },
  feedScroll: { overflowY: 'auto', minHeight: '0', flexGrow: 1, marginLeft: '-8px', marginRight: '-8px' },
  list: { listStyleType: 'none', margin: '0', padding: '0', display: 'flex', flexDirection: 'column' },
  listItem: { borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, ':last-child': { borderBottom: 'none' } },
  listRow: {
    boxSizing: 'border-box',
    width: '100%',
    minHeight: '56px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '8px',
    paddingRight: '8px',
    margin: '0',
    border: 'none',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: 'transparent',
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: tokens.fontFamilyBase,
    color: tokens.colorNeutralForeground1,
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
    ':active': { backgroundColor: tokens.colorNeutralBackground1Pressed },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '-2px' },
    ':disabled': { cursor: 'default', backgroundColor: 'transparent' },
  },
  agentCell: { width: '72px', flexShrink: 0, display: 'flex' },
  listText: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '0', flexGrow: 1 },
  listPrimary: {
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  listSecondary: {
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    color: tokens.colorNeutralForeground3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
  },
  emptyText: { margin: '0', fontSize: tokens.fontSizeBase300, lineHeight: tokens.lineHeightBase300, color: tokens.colorNeutralForeground2 },
  tableScroll: { overflowX: 'auto' },
  th: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
    whiteSpace: 'nowrap',
  },
  num: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  nowrap: { whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' },
  link: { color: BRAND.accentStrong, ':hover': { color: BRAND.accentStrongHover } },
  linkIcon: { marginLeft: '4px', verticalAlign: 'middle' },
  skeletonStack: { display: 'flex', flexDirection: 'column', gap: '8px' },
  skeletonTile: {
    boxSizing: 'border-box',
    minHeight: '128px',
    paddingTop: '16px',
    paddingBottom: '16px',
    paddingLeft: '20px',
    paddingRight: '16px',
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow4,
  },
  skLabel: { width: '60%', height: '14px' },
  skValue: { width: '40%', height: '28px' },
  skContext: { width: '70%', height: '12px' },
  skRow: { width: '100%', height: '40px' },
  skStage: { width: '100%', height: '56px' },
});

// ---------------------------------------------------------------------------
// Small components
// ---------------------------------------------------------------------------
function TintBadge(props: { tint: Tint; children: React.ReactNode }) {
  const styles = useStyles();
  const { tint } = props;
  return (
    <Badge
      appearance="tint"
      size="medium"
      className={styles.badge}
      style={{ backgroundColor: tint.bg, color: tint.fg, borderColor: tint.bg }}
    >
      {props.children}
    </Badge>
  );
}

function ErrorBar(props: { error: PageError | null }) {
  const { error } = props;
  if (!error) return null;
  return (
    <MessageBar intent="error">
      <MessageBarBody>
        {error.operation === 'navigate' ? 'This item could not be opened.' : 'The data could not be loaded.'}
        {error.message ? ` ${error.message}` : ''}
      </MessageBarBody>
      {error.retry ? (
        <MessageBarActions>
          <Button onClick={error.retry}>Try again</Button>
        </MessageBarActions>
      ) : null}
    </MessageBar>
  );
}

class PageErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  public state = { failed: false };
  public static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  public componentDidCatch(error: Error): void {
    reportError('render', error);
  }
  public render(): React.ReactNode {
    if (this.state.failed) {
      return (
        <MessageBar intent="error">
          <MessageBarBody>This page could not be displayed. Refresh the page.</MessageBarBody>
        </MessageBar>
      );
    }
    return this.props.children;
  }
}

function SectionHeader(props: { id: string; title: string; subtitle?: string; action?: { label: string; ariaLabel: string; onClick: () => void } }) {
  const styles = useStyles();
  const { id, title, subtitle, action } = props;
  return (
    <div className={styles.cardHeader}>
      <div className={styles.cardHeading}>
        <h2 id={id} className={styles.cardTitle}>{title}</h2>
        {subtitle ? <span className={styles.cardSubtitle}>{subtitle}</span> : null}
      </div>
      {action ? (
        <Link as="button" className={styles.actionLink} onClick={action.onClick} aria-label={action.ariaLabel}>
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

type TileSpec = { key: string; label: string; value: string; context: string; attention: boolean; view: string; aria: string };

function KpiTile(props: { tile: TileSpec; className?: string; onOpen: () => void }) {
  const styles = useStyles();
  const { tile } = props;
  return (
    <button
      type="button"
      role="link"
      className={mergeClasses(styles.kpiTile, props.className)}
      onClick={props.onOpen}
      aria-label={`${tile.label}: ${tile.aria}${tile.attention ? ', attention' : ''}. ${tile.context}. Open the list`}
    >
      <span className={styles.kpiTop}>
        <span className={styles.kpiLabel}>{tile.label}</span>
        {tile.attention ? <TintBadge tint={{ bg: BRAND.attentionTint, fg: BRAND.attention }}>Attention</TintBadge> : null}
      </span>
      <span className={styles.kpiValue}>{tile.value}</span>
      <span className={styles.kpiContextRow}>
        <span className={styles.kpiContext}>{tile.context}</span>
        <span className={styles.kpiChevron} data-kpi-chevron="" aria-hidden="true">
          <ChevronRightRegular />
        </span>
      </span>
    </button>
  );
}

function KpiSkeleton(props: { label: string; className?: string }) {
  const styles = useStyles();
  return (
    <div className={mergeClasses(styles.skeletonTile, props.className)}>
      <Skeleton aria-label={`Loading ${props.label}`} className={styles.skeletonStack}>
        <SkeletonItem className={styles.skLabel} />
        <SkeletonItem className={styles.skValue} />
        <SkeletonItem className={styles.skContext} />
      </Skeleton>
    </div>
  );
}

function ListSkeleton(props: { rows: number; label: string }) {
  const styles = useStyles();
  return (
    <Skeleton aria-label={`Loading ${props.label}`} className={styles.skeletonStack}>
      {Array.from({ length: props.rows }, (_, i) => <SkeletonItem key={i} className={styles.skRow} />)}
    </Skeleton>
  );
}

function PipelineStage(props: { label: string; count: number; tint: Tint }) {
  const styles = useStyles();
  return (
    <li className={styles.stage} style={{ backgroundColor: props.tint.bg, color: props.tint.fg }} aria-label={`${props.label}: ${formatNumber(props.count)}`}>
      <span className={styles.stageCount} aria-hidden="true">{formatNumber(props.count)}</span>
      <span className={styles.stageLabel} aria-hidden="true">{props.label}</span>
    </li>
  );
}

function HBarChart(props: { title: string; data: Array<{ label: string; value: number }>; labelWidth?: number }) {
  const styles = useStyles();
  const max = Math.max(1, ...props.data.map((d) => d.value));
  const summary = props.data.map((d) => `${d.label}: ${formatNumber(d.value)}`).join(', ');
  return (
    <div className={styles.skeletonStack}>
      <h3 className={styles.chartTitle}>{props.title}</h3>
      <div className={styles.hbars} role="img" aria-label={`${props.title}: ${summary}`}>
        {props.data.map((d) => (
          <div key={d.label} className={styles.hbarRow} aria-hidden="true">
            <span className={styles.hbarLabel} title={d.label}>{d.label}</span>
            <span className={styles.hbarTrack}>
              <span className={styles.hbar} style={{ width: `${(d.value / max) * 100}%`, opacity: d.value === 0 ? 0 : 1 }} />
            </span>
            <span className={styles.hbarValue}>{formatNumber(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
type DataState<T> = { rows: T[] | null; error: PageError | null };

function PageBody(props: PageProps) {
  const styles = useStyles();
  const { dataApi } = props;
  const dataReady = !!dataApi;
  const apiRef = React.useRef<DataApi>(dataApi);
  apiRef.current = dataApi;

  const [stories, setStories] = React.useState<DataState<StoryRow>>({ rows: null, error: null });
  const [activities, setActivities] = React.useState<DataState<ActivityRow>>({ rows: null, error: null });
  const [releases, setReleases] = React.useState<DataState<ReleaseRow>>({ rows: null, error: null });
  const [loading, setLoading] = React.useState(true);
  const [updatedAt, setUpdatedAt] = React.useState<Date>(() => new Date());
  const [now, setNow] = React.useState<Date>(() => new Date());
  const [navError, setNavError] = React.useState<PageError | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const lastFeedKey = React.useRef<string>('');
  const mounted = React.useRef(true);
  React.useEffect(() => () => { mounted.current = false; }, []);

  const refreshAll = React.useCallback(() => setReloadKey((k) => k + 1), []);

  // Full load on mount and on Refresh. Previous data stays visible during a manual refresh.
  React.useEffect(() => {
    if (!dataReady) return;
    let cancelled = false;
    setLoading(true);
    const api = apiRef.current;
    Promise.allSettled([loadStories(api), loadActivities(api), loadReleases(api)]).then(([s, a, r]) => {
      if (cancelled || !mounted.current) return;
      setStories(s.status === 'fulfilled' ? { rows: s.value, error: null } : (prev) => ({ rows: prev.rows ?? [], error: reportError('loadStories', s.reason, refreshAll) }));
      setActivities(a.status === 'fulfilled' ? { rows: a.value, error: null } : (prev) => ({ rows: prev.rows ?? [], error: reportError('loadActivities', a.reason, refreshAll) }));
      setReleases(r.status === 'fulfilled' ? { rows: r.value, error: null } : (prev) => ({ rows: prev.rows ?? [], error: reportError('loadReleases', r.reason, refreshAll) }));
      if (a.status === 'fulfilled') lastFeedKey.current = a.value.map((x) => x.cgk_agentactivityid).join('|');
      const stamp = new Date();
      setUpdatedAt(stamp);
      setNow(stamp);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [dataReady, reloadKey, refreshAll]);

  // Quiet auto refresh of the Agent Activity feed every 30 s (no skeletons). When new activity has
  // arrived, the stories and releases are reloaded quietly too, so tiles and pipeline stay in step.
  React.useEffect(() => {
    if (!dataReady) return;
    let busy = false;
    const tick = async () => {
      setNow(new Date());
      if (busy || (typeof document !== 'undefined' && document.hidden)) return;
      busy = true;
      try {
        const api = apiRef.current;
        const rows = await loadActivities(api);
        if (!mounted.current) return;
        const key = rows.map((x) => x.cgk_agentactivityid).join('|');
        setActivities({ rows, error: null });
        if (key !== lastFeedKey.current) {
          lastFeedKey.current = key;
          const [s, r] = await Promise.allSettled([loadStories(api), loadReleases(api)]);
          if (!mounted.current) return;
          if (s.status === 'fulfilled') setStories({ rows: s.value, error: null });
          if (r.status === 'fulfilled') setReleases({ rows: r.value, error: null });
        }
        setUpdatedAt(new Date());
      } catch (error) {
        // Quiet: keep the last feed; log once per failure without interrupting the page.
        reportError('autoRefreshActivities', error);
      } finally {
        busy = false;
      }
    };
    const handle = window.setInterval(() => void tick(), FEED_REFRESH_MS);
    return () => window.clearInterval(handle);
  }, [dataReady]);

  async function navigate(input: Record<string, unknown>) {
    const navigateTo = getXrm()?.Navigation?.navigateTo;
    if (typeof navigateTo !== 'function') {
      setNavError(reportError('navigate', new Error('Navigation is not available here.')));
      return;
    }
    try {
      await navigateTo(input);
      setNavError(null);
    } catch (error) {
      setNavError(reportError('navigate', error));
    }
  }
  const openView = (entityName: string, viewId: string) =>
    void navigate(
      viewId.startsWith('__VIEW_')
        ? { pageType: 'entitylist', entityName }
        : { pageType: 'entitylist', entityName, viewId, viewType: 'savedquery' },
    );
  const openRecord = (entityName: string, entityId: string) => void navigate({ pageType: 'entityrecord', entityName, entityId });

  const overview = React.useMemo(() => deriveOverview(stories.rows ?? [], updatedAt), [stories.rows, updatedAt]);
  const storiesLoading = stories.rows === null;
  const feedLoading = activities.rows === null;
  const releasesLoading = releases.rows === null;

  const tiles: TileSpec[] = [
    {
      key: 'open',
      label: 'Open stories',
      value: formatNumber(overview.open),
      aria: formatNumber(overview.open),
      context: `${formatNumber(overview.total)} stories in total`,
      attention: false,
      view: VIEW_ALL_OPEN,
    },
    {
      key: 'auto',
      label: 'Delivered autonomously',
      value: overview.autoPct === null ? '–' : `${overview.autoPct}%`,
      aria: overview.autoPct === null ? 'no released stories yet' : `${overview.autoPct} percent`,
      context: `${formatNumber(overview.releasedAutoCount)} of ${formatNumber(overview.releasedCount)} released stories`,
      attention: false,
      view: VIEW_AUTONOMOUS_PIPELINE,
    },
    {
      key: 'lead',
      label: 'Avg lead time autonomous',
      value: formatDuration(overview.leadAuto),
      aria: overview.leadAuto === null ? 'no data' : formatDuration(overview.leadAuto),
      context: overview.leadHuman === null ? 'No human path releases yet' : `human path ${formatDuration(overview.leadHuman)}`,
      attention: false,
      view: VIEW_RELEASED,
    },
    {
      key: 'human',
      label: 'Awaiting a human',
      value: formatNumber(overview.awaitingHuman),
      aria: formatNumber(overview.awaitingHuman),
      context: `${formatNumber(overview.routed)} routed · ${formatNumber(overview.awaitingApproval)} awaiting approval`,
      attention: overview.awaitingHuman > 0,
      view: VIEW_AWAITING_HUMAN,
    },
    {
      key: 'week',
      label: 'Released this week',
      value: formatNumber(overview.releasedThisWeek),
      aria: formatNumber(overview.releasedThisWeek),
      context: `since Monday ${formatDate(startOfWeek(updatedAt))}`,
      attention: false,
      view: VIEW_RELEASED_THIS_WEEK,
    },
    {
      key: 'progress',
      label: 'In progress',
      value: formatNumber(overview.inProgress),
      aria: formatNumber(overview.inProgress),
      context: 'Triaging, in development or testing',
      attention: false,
      view: VIEW_AUTONOMOUS_PIPELINE,
    },
  ];

  const feed = (activities.rows ?? []).map((a) => {
    const storyId = normId(a._cgk_sdlcstory_value);
    const story = storyId ? overview.byId.get(storyId) : undefined;
    const lookupName = a[`_cgk_sdlcstory_value${FORMATTED}`];
    const storyNumber = story?.cgk_storynumber ?? '';
    const storyTitle = story?.cgk_title ?? (typeof lookupName === 'string' ? lookupName : '');
    const when = toDate(a.cgk_timestamp);
    const agent = typeof a.cgk_agent === 'number' ? AGENTS[a.cgk_agent] : undefined;
    const outcome = typeof a.cgk_outcome === 'number' ? OUTCOMES[a.cgk_outcome] : undefined;
    const secondary = [storyNumber, storyTitle, relativeTime(when, now)].filter((part) => part).join(' · ');
    return { id: a.cgk_agentactivityid, name: a.cgk_name ?? 'Activity', storyId, secondary, agent, outcome, when };
  });

  const errors = [stories.error, activities.error, releases.error].filter((e): e is PageError => e !== null);
  const firstError = errors.length > 0 ? errors[0] : null;
  const pipelineTotal = PIPELINE.reduce((sum, s) => sum + overview.statusCount(s.value), 0);

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>SDLC Dashboard</h1>
          <p className={styles.subtitle}>PowerStudios Customer Portal · updated {formatTime(updatedAt)}</p>
        </div>
        <Button appearance="subtle" icon={<ArrowClockwiseRegular />} onClick={refreshAll} disabled={loading} aria-label="Refresh the dashboard">
          Refresh
        </Button>
      </header>

      {firstError || navError ? (
        <div className={styles.messages}>
          <ErrorBar error={firstError} />
          <ErrorBar error={navError} />
        </div>
      ) : null}

      <main className={styles.grid}>
        <section aria-label="Key figures" className={styles.kpiSection}>
          {tiles.map((tile) =>
            storiesLoading ? (
              <KpiSkeleton key={tile.key} label={tile.label} className={styles.kpiCell} />
            ) : (
              <KpiTile key={tile.key} tile={tile} className={styles.kpiCell} onOpen={() => openView(STORY, tile.view)} />
            ),
          )}
        </section>

        <section className={mergeClasses(styles.card, styles.spanFull)} aria-labelledby="sdlc-pipeline-title">
          <SectionHeader
            id="sdlc-pipeline-title"
            title="Pipeline"
            subtitle={storiesLoading ? undefined : `${formatNumber(pipelineTotal)} stories on the main path, from intake to release`}
            action={{ label: 'View all open', ariaLabel: 'View all open stories', onClick: () => openView(STORY, VIEW_ALL_OPEN) }}
          />
          {storiesLoading ? (
            <Skeleton aria-label="Loading pipeline" className={styles.pipeline}>
              {Array.from({ length: 9 }, (_, i) => <SkeletonItem key={i} className={styles.skStage} style={{ width: '96px' }} />)}
            </Skeleton>
          ) : (
            <div className={styles.pipeline}>
              <ol className={mergeClasses(styles.list, styles.pipelineMain)} style={{ flexDirection: 'row' }} aria-label="Main path by status">
                {PIPELINE.map((stage, index) => (
                  <React.Fragment key={stage.value}>
                    {index > 0 ? (
                      <li className={styles.chevron} aria-hidden="true">
                        <ChevronRightRegular />
                      </li>
                    ) : null}
                    <PipelineStage label={stage.label} count={overview.statusCount(stage.value)} tint={stage.tint} />
                  </React.Fragment>
                ))}
              </ol>
              <ul className={mergeClasses(styles.list, styles.pipelineSide)} style={{ flexDirection: 'row' }} aria-label="Off the main path">
                {PIPELINE_SIDE.map((stage) => (
                  <PipelineStage key={stage.value} label={stage.label} count={overview.statusCount(stage.value)} tint={stage.tint} />
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className={mergeClasses(styles.card, styles.feedCard, styles.spanWide)} aria-labelledby="sdlc-feed-title">
          <SectionHeader id="sdlc-feed-title" title="Live Agent Activity" subtitle={`Latest ${FEED_SIZE} steps · refreshes every 30 seconds`} />
          {feedLoading ? (
            <ListSkeleton rows={6} label="agent activity" />
          ) : feed.length === 0 ? (
            <p className={styles.emptyText}>No agent activity yet.</p>
          ) : (
            <div className={styles.feedScroll}>
              <ul className={styles.list} aria-live="polite" aria-relevant="additions">
                {feed.map((item) => (
                  <li key={item.id} className={styles.listItem}>
                    <button
                      type="button"
                      className={styles.listRow}
                      disabled={!item.storyId}
                      onClick={() => item.storyId && openRecord(STORY, item.storyId)}
                      aria-label={`${item.agent?.label ?? 'Agent'}: ${item.name}. ${item.secondary}. Outcome ${item.outcome?.label ?? 'unknown'}.${item.storyId ? ' Open the story' : ''}`}
                    >
                      <span className={styles.agentCell}>
                        {item.agent ? <TintBadge tint={item.agent.tint}>{item.agent.label}</TintBadge> : null}
                      </span>
                      <span className={styles.listText}>
                        <span className={styles.listPrimary}>{item.name}</span>
                        <span className={styles.listSecondary} title={item.when ? `${formatDate(item.when)} ${formatTime(item.when)}` : undefined}>
                          {item.secondary}
                        </span>
                      </span>
                      {item.outcome ? <TintBadge tint={item.outcome.tint}>{item.outcome.label}</TintBadge> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <div className={mergeClasses(styles.column, styles.spanNarrow)}>
          <section className={styles.card} aria-labelledby="sdlc-breakdown-title">
            <SectionHeader
              id="sdlc-breakdown-title"
              title="Breakdown"
              subtitle={
                storiesLoading
                  ? undefined
                  : `${formatNumber(overview.total)} stories${overview.untriaged > 0 ? ` · ${formatNumber(overview.untriaged)} without delivery path yet` : ''}`
              }
            />
            {storiesLoading ? (
              <ListSkeleton rows={4} label="breakdown" />
            ) : overview.total === 0 ? (
              <p className={styles.emptyText}>No stories yet.</p>
            ) : (
              <>
                <HBarChart title="By type" data={overview.types} />
                <hr className={styles.divider} />
                <HBarChart title="By delivery path" data={overview.paths} />
              </>
            )}
          </section>

          <section className={styles.card} aria-labelledby="sdlc-releases-title">
            <SectionHeader
              id="sdlc-releases-title"
              title="Last releases"
              subtitle="Latest 5 production releases"
              action={{ label: 'View released', ariaLabel: 'View released stories', onClick: () => openView(STORY, VIEW_RELEASED) }}
            />
            {releasesLoading ? (
              <ListSkeleton rows={5} label="releases" />
            ) : (releases.rows ?? []).length === 0 ? (
              <p className={styles.emptyText}>No releases yet.</p>
            ) : (
              <div className={styles.tableScroll}>
                <Table size="small" aria-labelledby="sdlc-releases-title">
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell className={styles.th}>Version</TableHeaderCell>
                      <TableHeaderCell className={styles.th}>Released on</TableHeaderCell>
                      <TableHeaderCell className={mergeClasses(styles.th, styles.num)}>Stories</TableHeaderCell>
                      <TableHeaderCell className={styles.th}>Deployment</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(releases.rows ?? []).map((r) => {
                      const id = normId(r.cgk_releaseid);
                      const version = r.cgk_version || r.cgk_name || 'Release';
                      const released = toDate(r.cgk_releasedon);
                      const url = typeof r.cgk_deploymenturl === 'string' && /^https?:\/\//i.test(r.cgk_deploymenturl) ? r.cgk_deploymenturl : '';
                      return (
                        <TableRow key={id}>
                          <TableCell>
                            <Link as="button" className={styles.link} onClick={() => openRecord(RELEASE, id)} aria-label={`Open release ${version}`}>
                              {version}
                            </Link>
                          </TableCell>
                          <TableCell className={styles.nowrap}>{released ? formatDate(released) : '–'}</TableCell>
                          <TableCell className={styles.num}>{formatNumber(overview.releaseCounts.get(id) ?? 0)}</TableCell>
                          <TableCell>
                            {url ? (
                              <Link href={url} target="_blank" rel="noopener noreferrer" className={styles.link} aria-label={`Open deployment of ${version} in a new tab`}>
                                Open
                                <OpenRegular className={styles.linkIcon} aria-hidden="true" />
                              </Link>
                            ) : (
                              '–'
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

const GeneratedComponent = (props: PageProps) => (
  <PageErrorBoundary>
    <PageBody {...props} />
  </PageErrorBoundary>
);

export default GeneratedComponent;
