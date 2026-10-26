/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest's asymmetric matchers are typed as any. */
import {
  BadRequestException,
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  ValidationPipe,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { CommentTarget, Prisma, Role } from '@prisma/client';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../users/super-admin.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import {
  CreateCommentDto,
  ModerateCommentDto,
  PublicCommentsQueryDto,
} from './comments.dto';
import { findCommentTarget } from './comment-target';

const id = 'd34d4663-f8d9-4f29-a757-eae70d07efa7';
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const handler = (name: keyof CommentsController) =>
  Object.getOwnPropertyDescriptor(CommentsController.prototype, name)
    ?.value as object;
const body = {
  targetType: CommentTarget.THEMATIC,
  targetId: id,
  fullName: ' Ana   D’Ávila ',
  text: ' Uma contribuição. ',
};

describe('Comments input and authorization', () => {
  it('normalizes full names and short messages', async () => {
    const result: unknown = await pipe.transform(body, {
      type: 'body',
      metatype: CreateCommentDto,
    });
    expect(result).toMatchObject({
      fullName: 'Ana D’Ávila',
      text: 'Uma contribuição.',
    });
  });
  it.each([
    { fullName: 'Ana' },
    { fullName: ' '.repeat(10) },
    { fullName: `Ana ${'x'.repeat(120)}` },
    { text: 'a'.repeat(301) },
    { text: '  ' },
    { targetType: 'UNSUPPORTED' },
    { targetId: 'invalid' },
    { status: 'APPROVED' },
    { approvedById: id },
  ])(
    'rejects invalid data or attempts to bypass moderation: %j',
    async (change) => {
      await expect(
        pipe.transform(
          { ...body, ...change },
          { type: 'body', metatype: CreateCommentDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );
  it('accepts news submissions without allowing clients to set publication status', async () => {
    const dto: unknown = await pipe.transform(
      { ...body, targetType: 'NEWS' },
      { type: 'body', metatype: CreateCommentDto },
    );
    expect(dto).toMatchObject({ targetType: 'NEWS', targetId: id });
    expect(dto).not.toHaveProperty('status');
  });
  it('limits public pagination and disallows status selection', async () => {
    for (const change of [
      { page: '0' },
      { limit: '61' },
      { status: 'PENDING' },
    ]) {
      await expect(
        pipe.transform(
          { targetType: 'THEMATIC', targetId: id, ...change },
          { type: 'query', metatype: PublicCommentsQueryDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    await expect(
      pipe.transform(
        { decision: 'publish' },
        { type: 'body', metatype: ModerateCommentDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('only exposes public submission/listing and requires JWT plus superadmin for moderation', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, CommentsController)).toContain(
      JwtAuthGuard,
    );
    for (const name of ['findPublic', 'create'] as const)
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler(name))).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler('moderate'))).not.toBe(
      true,
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, handler('moderate'))).toContain(
      SuperAdminGuard,
    );
    const guard = new SuperAdminGuard();
    for (const role of [undefined, Role.ADMIN]) {
      const ctx = {
        switchToHttp: () => ({
          getRequest: () => ({ user: role ? { role } : undefined }),
        }),
      } as ExecutionContext;
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    }
  });
});

describe('Comment publication lifecycle', () => {
  const db = {
    thematic: { findFirst: jest.fn() },
    comment: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    notification: { update: jest.fn() },
    notificationRead: { upsert: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new CommentsService(db as unknown as PrismaService);
  beforeEach(() => {
    jest.resetAllMocks();
    db.thematic.findFirst.mockResolvedValue({
      title: 'Temática',
      slug: 'tematica',
    });
    db.$transaction.mockImplementation(
      (work: ((client: typeof db) => Promise<unknown>) | Promise<unknown>[]) =>
        typeof work === 'function' ? work(db) : Promise.all(work),
    );
    db.comment.findUnique.mockResolvedValue({
      id,
      status: 'PENDING',
      targetType: CommentTarget.THEMATIC,
      targetId: id,
      notification: { id: 'notification' },
    });
    db.comment.updateMany.mockResolvedValue({ count: 1 });
    db.comment.deleteMany.mockResolvedValue({ count: 1 });
  });
  it('creates a pending comment and its notification atomically, returning no private data', async () => {
    const response = await service.create({
      ...body,
      fullName: 'Ana D’Ávila',
      text: 'Uma contribuição.',
    });
    expect(Object.keys(response)).toEqual(['message']);
    expect(db.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PENDING',
          notification: {
            create: expect.objectContaining({
              type: 'COMMENT',
              targetPath: '/grupo/linhas-tematicas/tematica/tematica',
            }),
          },
        }),
      }),
    );
  });
  it('filters public comments by approval and excludes moderation fields', async () => {
    db.comment.findMany.mockResolvedValue([]);
    db.comment.count.mockResolvedValue(0);
    await service.findPublic({
      targetType: CommentTarget.THEMATIC,
      targetId: id,
      page: 2,
      limit: 30,
    });
    expect(db.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { targetType: 'THEMATIC', targetId: id, status: 'APPROVED' },
        skip: 30,
        select: { id: true, fullName: true, text: true, approvedAt: true },
      }),
    );
  });
  it('refuses submission, listing and approval when the original record is deleted', async () => {
    db.thematic.findFirst.mockResolvedValue(null);
    await expect(service.create(body)).rejects.toThrow('Página não encontrada');
    await expect(
      service.findPublic({
        targetType: CommentTarget.THEMATIC,
        targetId: id,
        page: 1,
        limit: 30,
      }),
    ).rejects.toThrow('Página não encontrada');
    await expect(
      service.moderate(id, { decision: 'approve' }, 'moderator'),
    ).rejects.toThrow('Página não encontrada');
    expect(db.comment.updateMany).not.toHaveBeenCalled();
  });
  it('approves a pending comment and records the moderator in the same transaction', async () => {
    await service.moderate(id, { decision: 'approve' }, 'moderator');
    expect(db.comment.updateMany).toHaveBeenCalledWith({
      where: { id, status: 'PENDING' },
      data: {
        status: 'APPROVED',
        approvedAt: expect.any(Date),
        approvedById: 'moderator',
      },
    });
    expect(db.notification.update).toHaveBeenCalledWith({
      where: { id: 'notification' },
      data: { resolution: 'APPROVED', resolvedAt: expect.any(Date) },
    });
    expect(db.notificationRead.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { notificationId: 'notification', userId: 'moderator' },
      }),
    );
  });
  it('permanently deletes rejected messages without copying the name or text to notifications', async () => {
    await service.moderate(id, { decision: 'reject' }, 'moderator');
    expect(db.comment.deleteMany).toHaveBeenCalledWith({
      where: { id, status: 'PENDING' },
    });
    expect(db.notification.update).toHaveBeenCalledWith({
      where: { id: 'notification' },
      data: { resolution: 'REJECTED', resolvedAt: expect.any(Date) },
    });
    expect(db.comment.updateMany).not.toHaveBeenCalled();
  });
  it('prevents concurrent moderation from silently succeeding or deleting approved comments', async () => {
    db.comment.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.moderate(id, { decision: 'approve' }, 'moderator'),
    ).rejects.toBeInstanceOf(ConflictException);
    db.comment.deleteMany.mockResolvedValue({ count: 0 });
    await expect(
      service.moderate(id, { decision: 'reject' }, 'moderator'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(db.notification.update).not.toHaveBeenCalled();
  });
  it('does not allow rejection of a previously approved contribution', async () => {
    db.comment.findUnique.mockResolvedValue({ id, status: 'APPROVED' });
    await expect(
      service.moderate(id, { decision: 'reject' }, 'moderator'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(db.comment.deleteMany).not.toHaveBeenCalled();
  });
});

describe('Supported page models', () => {
  it.each([
    [CommentTarget.THEMATIC, 'thematic', '/grupo/linhas-tematicas/tematica/'],
    [
      CommentTarget.RESEARCH_INSTRUMENT,
      'researchInstrument',
      '/instrumentos/catalogos/',
    ],
    [CommentTarget.BOARD, 'board', '/agenda/bancas/'],
    [CommentTarget.JURY, 'jury', '/atividades/juris-historicos/juris/'],
    [CommentTarget.MEETING, 'meeting', '/atividades/seminarios/'],
    [
      CommentTarget.PRESENTED_WORK,
      'presentedWork',
      '/atividades/apresentacoes-trabalhos/',
    ],
    [CommentTarget.RESEARCH, 'search', '/atividades/pesquisas/'],
    [CommentTarget.NEWS, 'news', '/noticias/'],
  ])('resolves %s to its own public page', async (type, model, path) => {
    const findFirst = jest.fn().mockResolvedValue({
      title: 'Conteúdo',
      slug: 'conteudo',
      type: type === CommentTarget.MEETING ? 'SEMINAR' : 'CATALOG',
    });
    const target = await findCommentTarget(
      { [model]: { findFirst } } as unknown as Prisma.TransactionClient,
      type,
      id,
    );
    expect(target.path).toBe(`${path}conteudo`);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id, deletedAt: null } }),
    );
  });
});
