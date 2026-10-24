import { Test, TestingModule } from '@nestjs/testing';
import { NewsRelatedType } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NewsRepository } from './news.repository';
import { NewsService } from './news.service';

describe('NewsService', () => {
  let service: NewsService;
  const relatedId = '550e8400-e29b-41d4-a716-446655440000';
  const saved = {
    id: 'news-id',
    title: 'Notícia da apresentação',
    slug: 'noticia-da-apresentacao',
    coverUrl: null,
    coverPublicId: null,
  };
  const repository = {
    existsSlug: jest.fn(),
    create: jest.fn(),
    findBySlug: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    repository.existsSlug.mockResolvedValue(false);
    repository.create.mockResolvedValue(saved);
    repository.findBySlug.mockResolvedValue(saved);
    repository.update.mockResolvedValue(saved);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsService,
        { provide: NewsRepository, useValue: repository },
        { provide: CloudinaryService, useValue: {} },
      ],
    }).compile();
    service = module.get<NewsService>(NewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('persists the presentation destination when creating internal news', async () => {
    await service.create({
      title: saved.title,
      description: 'Conheça o trabalho apresentado.',
      date: new Date('2026-10-24T12:00:00Z'),
      category: 'EVENT',
      isInternal: true,
      relatedType: NewsRelatedType.PRESENTED_WORK,
      relatedId,
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        isInternal: true,
        relatedType: NewsRelatedType.PRESENTED_WORK,
        relatedId,
      }),
    );
  });

  it('updates the linked presentation without changing the news slug', async () => {
    await service.updateBySlug(saved.slug, {
      relatedType: NewsRelatedType.PRESENTED_WORK,
      relatedId,
    });
    expect(repository.update).toHaveBeenCalledWith(
      saved.id,
      expect.objectContaining({
        slug: saved.slug,
        relatedType: NewsRelatedType.PRESENTED_WORK,
        relatedId,
      }),
    );
  });
});
