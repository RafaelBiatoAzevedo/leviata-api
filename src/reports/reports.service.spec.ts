import { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const repository = { getSummaryCounts: jest.fn() };
  const service = new ReportsService(
    repository as unknown as ReportsRepository,
  );

  it('retorna as categorias e soma os registros sem duplicar dossiês', async () => {
    repository.getSummaryCounts.mockResolvedValue({
      people: 2,
      books: 3,
      articles: 4,
      dossiers: 1,
      news: 5,
      meetings: 6,
    });

    const report = await service.getSummary();

    expect(report.totalRecords).toBe(21);
    expect(report.items).toEqual([
      { key: 'people', label: 'Pesquisadores ativos', total: 2 },
      { key: 'books', label: 'Livros', total: 3 },
      { key: 'articles', label: 'Artigos', total: 4 },
      { key: 'dossiers', label: 'Dossiês', total: 1 },
      { key: 'news', label: 'Notícias', total: 5 },
      { key: 'meetings', label: 'Eventos', total: 6 },
    ]);
    expect(new Date(report.generatedAt).toISOString()).toBe(report.generatedAt);
  });

  it('retorna um relatório vazio quando não há registros', async () => {
    repository.getSummaryCounts.mockResolvedValue({
      people: 0,
      books: 0,
      articles: 0,
      dossiers: 0,
      news: 0,
      meetings: 0,
    });

    const report = await service.getSummary();
    expect(report.totalRecords).toBe(0);
    expect(report.items).toHaveLength(6);
    expect(report.items.every((item) => item.total === 0)).toBe(true);
  });

  it('propaga falhas do banco sem apresentar contagens falsas', async () => {
    repository.getSummaryCounts.mockRejectedValue(
      new Error('Database offline'),
    );
    await expect(service.getSummary()).rejects.toThrow('Database offline');
  });
});
