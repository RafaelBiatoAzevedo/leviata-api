import { ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { NewsController } from './news.controller';

describe('Public news access', () => {
  const reflector = new Reflector();
  const guard = new JwtAuthGuard(reflector);
  const handler = (name: string): object =>
    Object.getOwnPropertyDescriptor(NewsController.prototype, name)
      ?.value as object;

  it.each(['findAll', 'findOneById', 'findOneBySlug'])(
    'allows visitors to read news through %s without a JWT',
    (name) => {
      const context = {
        getHandler: () => handler(name),
        getClass: () => NewsController,
      } as ExecutionContext;
      expect(guard.canActivate(context)).toBe(true);
    },
  );

  it('keeps pagination totals and all administrative operations authenticated', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, NewsController)).toContain(
      JwtAuthGuard,
    );
    for (const name of [
      'findPage',
      'create',
      'updateById',
      'updateBySlug',
      'removeById',
      'removeBySlug',
      'uploadCover',
      'removeImage',
    ])
      expect(
        reflector.getAllAndOverride(IS_PUBLIC_KEY, [
          handler(name),
          NewsController,
        ]),
      ).not.toBe(true);
  });
});
