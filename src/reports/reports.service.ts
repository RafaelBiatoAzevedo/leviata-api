import { Injectable } from '@nestjs/common';
import { ReportsRepository } from './reports.repository';
import { SummaryReportResponseDto } from './dto/summary-report-response.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async getSummary(): Promise<SummaryReportResponseDto> {
    const counts = await this.reportsRepository.getSummaryCounts();
    const items = [
      { key: 'people', label: 'Pessoas ativas', total: counts.people },
      { key: 'books', label: 'Livros', total: counts.books },
      { key: 'articles', label: 'Artigos', total: counts.articles },
      { key: 'dossiers', label: 'Dossiês editoriais', total: counts.dossiers },
      { key: 'news', label: 'Notícias', total: counts.news },
      {
        key: 'meetings',
        label: 'Eventos',
        total: counts.meetings,
      },
      { key: 'juries', label: 'Júris históricos', total: counts.juries },
      { key: 'boards', label: 'Bancas', total: counts.boards },
      {
        key: 'presentedWorks',
        label: 'Trabalhos apresentados',
        total: counts.presentedWorks,
      },
      { key: 'research', label: 'Pesquisas', total: counts.research },
      {
        key: 'researchInstruments',
        label: 'Instrumentos de pesquisa',
        total: counts.researchInstruments,
      },
      { key: 'thematics', label: 'Linhas temáticas', total: counts.thematics },
      { key: 'videos', label: 'Vídeos', total: counts.videos },
      { key: 'schedule', label: 'Agenda', total: counts.schedule },
      { key: 'newsletters', label: 'Newsletters', total: counts.newsletters },
    ];

    return {
      title: 'Resumo do portal',
      generatedAt: new Date().toISOString(),
      totalRecords: items.reduce((total, item) => total + item.total, 0),
      items,
    };
  }
}
