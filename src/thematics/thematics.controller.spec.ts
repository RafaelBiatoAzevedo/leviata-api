import { ValidationPipe } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ThematicsController } from './thematics.controller';
import { CreateThematicDto } from './DTOs/create-thematic.dto';
import { UpdateThematicDto } from './DTOs/update-thematic.dto';

const handler = (name: string): object =>
  Object.getOwnPropertyDescriptor(ThematicsController.prototype, name)
    ?.value as object;

describe('Thematic API validation and access', () => {
  const videoId = '550e8400-e29b-41d4-a716-446655440000';
  const payload = {
    title: 'Temática',
    additionalVideos: [
      { videoId, title: 'Vídeo', personId: null, description: null },
    ],
  };
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const create = (value: unknown) =>
    pipe.transform(value, { type: 'body', metatype: CreateThematicDto });
  const update = (value: unknown) =>
    pipe.transform(value, { type: 'body', metatype: UpdateThematicDto });

  it('keeps mutations authenticated while exposing public thematic details', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ThematicsController)).toContain(
      JwtAuthGuard,
    );
    for (const name of ['findAll', 'findOneById', 'findOneBySlug'])
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler(name))).toBe(true);
    for (const name of [
      'create',
      'updateById',
      'updateBySlug',
      'removeById',
      'removeBySlug',
      'findPage',
    ])
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler(name))).not.toBe(true);
  });
  it('validates and normalizes nested contextual titles', async () => {
    const result = (await create({
      ...payload,
      title: ' Temática ',
      additionalVideos: [{ ...payload.additionalVideos[0], title: ' Vídeo ' }],
    })) as CreateThematicDto;
    expect(result.title).toBe('Temática');
    expect(result.additionalVideos?.[0].title).toBe('Vídeo');
  });
  it('allows creation without optional relations and partial patches', async () => {
    await expect(create({ title: 'Temática' })).resolves.toBeDefined();
    await expect(update({ description: null })).resolves.toBeDefined();
    await expect(
      update({ mainVideoId: null, coordinatorId: null, additionalVideos: [] }),
    ).resolves.toBeDefined();
  });
  it.each([
    { additionalVideos: [videoId] },
    { additionalVideos: null },
    { additionalVideos: [{ videoId: 'bad', title: 'Vídeo' }] },
    { additionalVideos: [{ videoId, title: ' ' }] },
    { additionalVideos: [{ videoId, title: 'x'.repeat(256) }] },
    {
      additionalVideos: [
        { videoId, title: 'Vídeo', description: 'x'.repeat(1001) },
      ],
    },
    { additionalVideos: [{ videoId, title: 'Vídeo', personId: 'bad' }] },
    { additionalVideos: [{ videoId, title: 'Vídeo', thematicId: videoId }] },
    {
      additionalVideos: [
        { videoId, title: 'Vídeo', embedLink: 'https://example.com' },
      ],
    },
  ])(
    'rejects invalid nested payload %j on create and edit',
    async (invalid) => {
      await expect(create({ title: 'Temática', ...invalid })).rejects.toThrow();
      await expect(update(invalid)).rejects.toThrow();
    },
  );
  it('rejects null titles and unknown parent fields', async () => {
    await expect(update({ title: null })).rejects.toThrow();
    await expect(update({ deletedAt: '2026-10-04' })).rejects.toThrow();
  });
});
