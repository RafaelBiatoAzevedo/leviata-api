import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('Administrator deletion restrictions', () => {
  const guard = new JwtAuthGuard(new Reflector());
  const context = (method: string, url = '/books/record') =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ method, url }) }),
    }) as ExecutionContext;
  const admin = { id: 'admin', email: 'admin@example.test', role: Role.ADMIN };

  it.each([
    '/books/id',
    '/books/slug/book',
    '/books/slug/book/cover',
    '/researchInstruments/slug/source/pdf',
    '/meetings/id/images/image',
    '/research/id/supports/image',
    '/people/slug/person/image',
    '/newsletter/id',
    '/schedule/slug/event',
    '/users/id',
  ])('rejects administrator deletion of %s before any handler runs', (path) => {
    expect(() =>
      guard.handleRequest(null, admin, null, context('DELETE', path)),
    ).toThrow(ForbiddenException);
  });

  it.each(['GET', 'POST', 'PATCH', 'PUT'])(
    'preserves authenticated %s access for admins',
    (method) => {
      expect(guard.handleRequest(null, admin, null, context(method))).toEqual(
        admin,
      );
    },
  );

  it('preserves superadministrator deletions', () => {
    const user = { ...admin, role: Role.SUPER_ADMIN };
    expect(guard.handleRequest(null, user, null, context('DELETE'))).toEqual(
      user,
    );
  });

  it('still rejects unauthenticated deletions', () => {
    expect(() =>
      guard.handleRequest(null, false, null, context('DELETE')),
    ).toThrow(UnauthorizedException);
  });
});
