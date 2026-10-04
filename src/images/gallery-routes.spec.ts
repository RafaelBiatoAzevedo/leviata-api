import {
  type INestApplication,
  UnauthorizedException,
  ValidationPipe,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'http';
import { BoardsImagesController } from '../boards/boards-images.controller';
import { JuriesImagesController } from '../juris/juries-images.controller';
import { MeetingsImagesController } from '../meetings/meetings-images.controller';
import { PresentedWorksImagesController } from '../presentedWorks/presented-works-images.controller';
import { ResearchImagesController } from '../research/researchs-images.controller';
import { ImagesService } from './images.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';

describe('Gallery HTTP routes', () => {
  const ownerId = '550e8400-e29b-41d4-a716-446655440000';
  const imageId = '550e8400-e29b-41d4-a716-446655440001';
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=',
    'base64',
  );
  const service = {
    list: jest.fn(),
    upload: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const routes = [
    ['boards', 'board', 'images'],
    ['juries', 'jury', 'images'],
    ['meetings', 'meeting', 'images'],
    ['presented-works', 'presentedWork', 'images'],
    ['research', 'search', 'images'],
    ['research', 'search', 'supports'],
  ];
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const reflector = new Reflector();
    const module = await Test.createTestingModule({
      controllers: [
        BoardsImagesController,
        JuriesImagesController,
        MeetingsImagesController,
        PresentedWorksImagesController,
        ResearchImagesController,
      ],
      providers: [{ provide: ImagesService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          if (
            reflector.getAllAndOverride(IS_PUBLIC_KEY, [
              context.getHandler(),
              context.getClass(),
            ])
          )
            return true;
          const req = context
            .switchToHttp()
            .getRequest<{ headers: { authorization?: string } }>();
          if (req.headers.authorization !== 'Bearer test')
            throw new UnauthorizedException();
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    server = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service.list.mockResolvedValue([]);
    service.upload.mockResolvedValue({
      id: imageId,
      imageUrl: 'https://res.cloudinary.com/test/photo.png',
      title: null,
      description: null,
    });
    service.update.mockResolvedValue({
      id: imageId,
      title: null,
      description: null,
    });
    service.remove.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(routes)(
    'supports public listing and authenticated CRUD for %s (%s, %s)',
    async (resource, owner, collection) => {
      const path = `/${resource}/${ownerId}/${collection}`;
      await request(server).get(path).expect(200, []);
      await request(server)
        .post(path)
        .attach('image', png, 'photo.png')
        .expect(401);
      await request(server)
        .post(path)
        .set('Authorization', 'Bearer test')
        .field('title', 'Foto')
        .field('description', 'Legenda')
        .attach('image', png, 'photo.png')
        .expect(201);
      expect(service.upload).toHaveBeenCalledWith(
        owner,
        ownerId,
        expect.objectContaining({ originalname: 'photo.png' }),
        expect.objectContaining({ title: 'Foto', description: 'Legenda' }),
        ...(collection === 'supports' ? ['supports'] : []),
      );
      await request(server)
        .patch(`${path}/${imageId}`)
        .set('Authorization', 'Bearer test')
        .send({ title: null, description: '' })
        .expect(200);
      await request(server)
        .delete(`${path}/${imageId}`)
        .set('Authorization', 'Bearer test')
        .expect(204);
    },
  );

  it('requires authentication for metadata changes and deletion', async () => {
    const path = `/meetings/${ownerId}/images/${imageId}`;
    await request(server).patch(path).send({ title: 'Test' }).expect(401);
    await request(server).delete(path).expect(401);
  });

  it('accepts uploads without optional captions', async () => {
    await request(server)
      .post(`/boards/${ownerId}/images`)
      .set('Authorization', 'Bearer test')
      .attach('image', png, 'photo.png')
      .expect(201);
  });

  it('rejects missing files and disguised non-image files', async () => {
    const path = `/meetings/${ownerId}/images`;
    await request(server)
      .post(path)
      .set('Authorization', 'Bearer test')
      .field('title', 'No file')
      .expect(400);
    await request(server)
      .post(path)
      .set('Authorization', 'Bearer test')
      .attach('image', Buffer.from('not an image'), {
        filename: 'fake.png',
        contentType: 'image/png',
      })
      .expect(400);
    expect(service.upload).not.toHaveBeenCalled();
  });

  it('rejects oversized files before reaching Cloudinary', async () => {
    await request(server)
      .post(`/boards/${ownerId}/images`)
      .set('Authorization', 'Bearer test')
      .attach('image', Buffer.alloc(10 * 1024 * 1024 + 1), 'large.png')
      .expect(413);
    expect(service.upload).not.toHaveBeenCalled();
  });

  it('validates captions, UUIDs and disallows arbitrary asset URLs', async () => {
    const path = `/juries/${ownerId}/images/${imageId}`;
    await request(server)
      .patch(path)
      .set('Authorization', 'Bearer test')
      .send({ title: 'x'.repeat(256) })
      .expect(400);
    await request(server)
      .patch(path)
      .set('Authorization', 'Bearer test')
      .send({ description: 'x'.repeat(5001) })
      .expect(400);
    await request(server)
      .patch(path)
      .set('Authorization', 'Bearer test')
      .send({ imageUrl: 'https://example.com/image.png' })
      .expect(400);
    await request(server).get('/boards/invalid/images').expect(400);
    expect(service.update).not.toHaveBeenCalled();
  });
});
