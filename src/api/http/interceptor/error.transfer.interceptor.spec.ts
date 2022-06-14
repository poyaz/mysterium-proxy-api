import { ErrorTransferInterceptor } from './error.interceptor';

describe('ErrorInterceptor', () => {
  it('should be defined', () => {
    expect(new ErrorTransferInterceptor()).toBeDefined();
  });
});
