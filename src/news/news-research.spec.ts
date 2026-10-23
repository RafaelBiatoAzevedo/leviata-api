import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { NewsRelatedType } from '@prisma/client';
import { CreateNewsDto } from './DTOs/create-news.dto';
import { UpdateNewsDto } from './DTOs/update.news.dto';

describe('Research news destination', () => {
  it('accepts research as a destination when creating a news item', () => {
    const dto = plainToInstance(CreateNewsDto, {
      title: 'Novidades da pesquisa',
      description: 'Conheça a pesquisa cadastrada.',
      category: 'RESEARCH',
      date: '2026-10-23',
      isInternal: 'true',
      relatedType: 'RESEARCH',
      relatedId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(dto.relatedType).toBe(NewsRelatedType.RESEARCH);
    expect(validateSync(dto)).toEqual([]);
  });

  it('preserves the research destination in a partial edit', () => {
    const dto = plainToInstance(UpdateNewsDto, {
      relatedType: 'RESEARCH',
      relatedId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(dto.relatedType).toBe(NewsRelatedType.RESEARCH);
    expect(validateSync(dto)).toEqual([]);
  });
});
