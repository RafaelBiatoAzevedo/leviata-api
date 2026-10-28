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
      juries: 8,
      boards: 9,
      presentedWorks: 10,
      research: 11,
      researchInstruments: 12,
      thematics: 13,
      videos: 14,
      schedule: 15,
      newsletters: 16,
    });

    const report = await service.getSummary();

    expect(report.totalRecords).toBe(129);
    expect(report.items).toEqual([
      { key: 'people', label: 'Pessoas ativas', total: 2 },
      { key: 'books', label: 'Livros', total: 3 },
      { key: 'articles', label: 'Artigos', total: 4 },
      { key: 'dossiers', label: 'Dossiês editoriais', total: 1 },
      { key: 'news', label: 'Notícias', total: 5 },
      { key: 'meetings', label: 'Eventos', total: 6 },
      { key: 'juries', label: 'Júris históricos', total: 8 },
      { key: 'boards', label: 'Bancas', total: 9 },
      { key: 'presentedWorks', label: 'Trabalhos apresentados', total: 10 },
      { key: 'research', label: 'Pesquisas', total: 11 },
      {
        key: 'researchInstruments',
        label: 'Instrumentos de pesquisa',
        total: 12,
      },
      { key: 'thematics', label: 'Linhas temáticas', total: 13 },
      { key: 'videos', label: 'Vídeos', total: 14 },
      { key: 'schedule', label: 'Agenda', total: 15 },
      { key: 'newsletters', label: 'Newsletters', total: 16 },
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
      juries: 0,
      boards: 0,
      presentedWorks: 0,
      research: 0,
      researchInstruments: 0,
      thematics: 0,
      videos: 0,
      schedule: 0,
      newsletters: 0,
    });

    const report = await service.getSummary();
    expect(report.totalRecords).toBe(0);
    expect(report.items).toHaveLength(15);
    expect(report.items.every((item) => item.total === 0)).toBe(true);
  });

  it('propaga falhas do banco sem apresentar contagens falsas', async () => {
    repository.getSummaryCounts.mockRejectedValue(
      new Error('Database offline'),
    );
    await expect(service.getSummary()).rejects.toThrow('Database offline');
  });
});
