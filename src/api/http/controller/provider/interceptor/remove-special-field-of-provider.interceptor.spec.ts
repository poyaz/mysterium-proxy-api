import { RemoveSpecialFieldOfProviderInterceptor } from './remove-special-field-of-provider.interceptor';

describe('RemovePasswordFieldOfUserInterceptor', () => {
  it('should be defined', () => {
    expect(new RemoveSpecialFieldOfProviderInterceptor()).toBeDefined();
  });
});
