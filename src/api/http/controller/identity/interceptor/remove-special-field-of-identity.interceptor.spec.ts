import { RemoveSpecialFieldOfIdentityInterceptor } from './remove-special-field-of-identity.interceptor';

describe('RemovePasswordFieldOfUserInterceptor', () => {
  it('should be defined', () => {
    expect(new RemoveSpecialFieldOfIdentityInterceptor()).toBeDefined();
  });
});
