import { AnonymousRegisterGuard } from './anonymous-register.guard';

describe('AnonymousRegisterGuard', () => {
  it('should be defined', () => {
    expect(new AnonymousRegisterGuard(false)).toBeDefined();
  });
});
