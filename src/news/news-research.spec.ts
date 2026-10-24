import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { NewsRelatedType } from '@prisma/client';
import { CreateNewsDto } from './DTOs/create-news.dto';
import { UpdateNewsDto } from './DTOs/update.news.dto';

describe('Internal news destinations', () => {
  it.each([NewsRelatedType.RESEARCH, NewsRelatedType.PRESENTED_WORK])(
    'accepts %s as a destination when creating a news item',
    (relatedType) => {
      const dto = plainToInstance(CreateNewsDto, {
        title: 'Novidades do grupo',
        description: 'Conheça o conteúdo cadastrado.',
        category: 'RESEARCH',
        date: '2026-10-24',
        isInternal: 'true',
        relatedType,
        relatedId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(dto.relatedType).toBe(relatedType);
      expect(validateSync(dto)).toEqual([]);
    },
  );

  it.each([NewsRelatedType.RESEARCH, NewsRelatedType.PRESENTED_WORK])(
    'preserves %s as a destination in a partial edit',
    (relatedType) => {
      const dto = plainToInstance(UpdateNewsDto, {
        relatedType,
        relatedId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(dto.relatedType).toBe(relatedType);
      expect(validateSync(dto)).toEqual([]);
    },
  );
});
