import { ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { MeetingsController } from './meetings.controller';

describe('Meeting access', () => {
  const reflector = new Reflector();
  const guard = new JwtAuthGuard(reflector);
  const handler = (name: string): object =>
    Object.getOwnPropertyDescriptor(MeetingsController.prototype, name)
      ?.value as object;

  it.each(['findAll', 'findOneById', 'findOneBySlug'])(
    'allows portal and linked-news access through %s',
    (name) => {
      const context = {
        getHandler: () => handler(name),
        getClass: () => MeetingsController,
      } as ExecutionContext;
      expect(guard.canActivate(context)).toBe(true);
    },
  );

  it('keeps admin pagination and writes authenticated', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, MeetingsController)).toContain(
      JwtAuthGuard,
    );
    for (const name of [
      'findPage',
      'create',
      'updateById',
      'updateBySlug',
      'removeById',
      'removeBySlug',
    ]) {
      expect(
        reflector.getAllAndOverride(IS_PUBLIC_KEY, [
          handler(name),
          MeetingsController,
        ]),
      ).not.toBe(true);
    }
  });
});
