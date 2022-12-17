import {ExecuteDurationInterceptor} from './execute-duration.interceptor';

describe('ExecuteDurationInterceptor', () => {
  it('should be defined', () => {
    expect(new ExecuteDurationInterceptor(null)).toBeDefined();
  });
});
