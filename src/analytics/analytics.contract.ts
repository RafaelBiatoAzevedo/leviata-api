export const ANALYTICS_PROVIDER = Symbol('ANALYTICS_PROVIDER');
export const TIMEZONE = 'America/Sao_Paulo';
export const RETENTION_DAYS = 180;
export const CACHE_SECONDS = 300;

// Only public route templates. Never store slugs, titles, queries or fragments.
export const PAGE_LABELS: Record<string, [string, string]> = {
  '/': ['Início', 'Início'],
  '/grupo': ['O grupo', 'Grupo'],
  '/grupo/pesquisadores': ['Pesquisadores', 'Grupo'],
  '/grupo/linhas-tematicas': ['Linhas temáticas', 'Grupo'],
  '/grupo/linhas-tematicas/tematica/:id': ['Detalhes de temática', 'Grupo'],
  '/publicacoes': ['Publicações', 'Publicações'],
  '/instrumentos': ['Instrumentos de pesquisa', 'Instrumentos'],
  '/instrumentos/planilhas-biblio-tematicas': [
    'Planilhas bibliográficas',
    'Instrumentos',
  ],
  '/instrumentos/planilhas-biblio-tematicas/dossie/:id': [
    'Detalhes de dossiê',
    'Instrumentos',
  ],
  '/instrumentos/catalogos': ['Catálogos', 'Instrumentos'],
  '/instrumentos/catalogos/:id': ['Detalhes de catálogo', 'Instrumentos'],
  '/instrumentos/banco-de-dados': ['Bancos de dados', 'Instrumentos'],
  '/instrumentos/banco-de-dados/:id': [
    'Detalhes de banco de dados',
    'Instrumentos',
  ],
  '/instrumentos/registro/:id': ['Registro de instrumento', 'Instrumentos'],
  '/atividades': ['Atividades', 'Atividades'],
  '/atividades/nucleo-de-pesquisa-em-costas-negras': [
    'Núcleo de pesquisa',
    'Atividades',
  ],
  '/atividades/juris-historicos': ['Júris históricos', 'Atividades'],
  '/atividades/juris-historicos/juris/:id': ['Detalhes de júri', 'Atividades'],
  '/atividades/encontros-e-seminarios': [
    'Encontros e seminários',
    'Atividades',
  ],
  '/atividades/encontros-e-seminarios/:type/:id': [
    'Detalhes de evento',
    'Atividades',
  ],
  '/atividades/encontros': ['Encontros', 'Atividades'],
  '/atividades/encontros/:id': ['Detalhes de encontro', 'Atividades'],
  '/atividades/seminarios': ['Seminários', 'Atividades'],
  '/atividades/seminarios/:id': ['Detalhes de seminário', 'Atividades'],
  '/atividades/simposios': ['Simpósios', 'Atividades'],
  '/atividades/simposios/:id': ['Detalhes de simpósio', 'Atividades'],
  '/atividades/mostra-de-documentarios': [
    'Mostra de documentários',
    'Atividades',
  ],
  '/atividades/mostra-de-documentarios/:id': [
    'Detalhes de mostra',
    'Atividades',
  ],
  '/atividades/pesquisas': ['Pesquisas', 'Atividades'],
  '/atividades/pesquisas/:id': ['Detalhes de pesquisa', 'Atividades'],
  '/atividades/apresentacoes-trabalhos': [
    'Trabalhos apresentados',
    'Atividades',
  ],
  '/atividades/apresentacoes-trabalhos/:id': [
    'Detalhes de trabalho',
    'Atividades',
  ],
  '/agenda': ['Agenda', 'Agenda'],
  '/agenda/bancas': ['Bancas', 'Agenda'],
  '/agenda/bancas/:id': ['Detalhes de banca', 'Agenda'],
  '/agenda/seminarios': ['Agenda de seminários', 'Agenda'],
  '/agenda/encontros': ['Agenda de encontros', 'Agenda'],
  '/agenda/simposios': ['Agenda de simpósios', 'Agenda'],
  '/agenda/mostra-de-documentarios': ['Agenda de documentários', 'Agenda'],
  '/noticias': ['Notícias', 'Notícias'],
  '/noticias/:id': ['Detalhes de notícia', 'Notícias'],
  '/noticias/newsletter': ['Newsletter nas notícias', 'Newsletter'],
  '/newsletter': ['Newsletter', 'Newsletter'],
  '/contato': ['Contato', 'Contato'],
};

export const SOURCES = {
  direct: 'Direto / não informado',
  google: 'Google',
  bing: 'Bing',
  duckduckgo: 'DuckDuckGo',
  yahoo: 'Yahoo',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  internal: 'Próprio portal',
  other: 'Outros sites',
};

export interface AnalyticsRange {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  days: number;
}
export interface AnalyticsRow {
  key: string;
  label: string;
  views: number;
}
export interface AnalyticsData {
  pageviews: number;
  previousPageviews: number;
  changePercent: number | null;
  comparisonReliable: boolean;
  averagePerDay: number;
  activeDays: number;
  sessions: null;
  uniqueVisitors: null;
  pagesPerSession: null;
  series: { date: string; views: number; previousViews: number }[];
  pages: AnalyticsRow[];
  sections: AnalyticsRow[];
  sources: AnalyticsRow[];
  devices: AnalyticsRow[];
  browsers: AnalyticsRow[];
}
export interface AnalyticsReport {
  status: 'ready' | 'not_configured' | 'unavailable' | 'quota_reached';
  provider: 'first-party';
  timezone: typeof TIMEZONE;
  range: AnalyticsRange;
  generatedAt: string;
  cacheSeconds: number;
  retentionDays: number;
  earliestAvailableDate: string | null;
  missing: string[];
  quota: { month: string; used: number; limit: number } | null;
  limitedMonths: string[];
  data: AnalyticsData | null;
}
export interface AnalyticsEvent {
  id: string;
  day: string;
  path: string;
  source: string;
  device: string;
  browser: string;
}
export interface AnalyticsSnapshot {
  rows: { dimension: string; key: string; views: number }[];
  months: { month: string; used: number; capped: boolean }[];
  earliest: string | null;
}
export interface AnalyticsProvider {
  collect(
    event: AnalyticsEvent,
    monthlyLimit: number,
  ): Promise<'recorded' | 'duplicate' | 'quota_reached'>;
  report(range: AnalyticsRange): Promise<AnalyticsSnapshot>;
  cleanup(before: string): Promise<void>;
}
