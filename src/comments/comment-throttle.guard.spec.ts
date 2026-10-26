import { ExecutionContext, HttpException } from '@nestjs/common';
import { CommentThrottleGuard } from './comment-throttle.guard';

describe('Public comment submission limits', () => {
  const context = (ip: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ ip }),
        getResponse: () => ({ setHeader: jest.fn() }),
      }),
    }) as ExecutionContext;
  afterEach(() => jest.useRealTimers());
  it('limits repeat submissions while keeping other visitors independent', () => {
    const guard = new CommentThrottleGuard();
    for (let count = 0; count < 5; count++)
      expect(guard.canActivate(context('visitor-a'))).toBe(true);
    expect(() => guard.canActivate(context('visitor-a'))).toThrow(
      HttpException,
    );
    expect(guard.canActivate(context('visitor-b'))).toBe(true);
  });
  it('allows retry when the one-minute window expires', () => {
    jest.useFakeTimers();
    const guard = new CommentThrottleGuard();
    for (let count = 0; count < 5; count++)
      guard.canActivate(context('visitor-a'));
    jest.advanceTimersByTime(60_001);
    expect(guard.canActivate(context('visitor-a'))).toBe(true);
  });
});
