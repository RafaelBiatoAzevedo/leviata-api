import { Injectable } from '@nestjs/common';
import { ReportsRepository } from './reports.repository';
import { SummaryReportResponseDto } from './dto/summary-report-response.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async getSummary(): Promise<SummaryReportResponseDto> {
    const counts = await this.reportsRepository.getSummaryCounts();
    const items = [
      { key: 'people', label: 'Pesquisadores ativos', total: counts.people },
      { key: 'books', label: 'Livros', total: counts.books },
      { key: 'articles', label: 'Artigos', total: counts.articles },
      { key: 'dossiers', label: 'Dossiês', total: counts.dossiers },
      { key: 'news', label: 'Notícias', total: counts.news },
      { key: 'meetings', label: 'Eventos', total: counts.meetings },
    ];

    return {
      title: 'Resumo do portal',
      generatedAt: new Date().toISOString(),
      totalRecords: items.reduce((total, item) => total + item.total, 0),
      items,
    };
  }
}
