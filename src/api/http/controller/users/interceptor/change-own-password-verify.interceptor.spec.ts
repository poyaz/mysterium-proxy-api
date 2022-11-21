import {ChangeOwnPasswordVerifyInterceptor} from '@src-api/http/controller/users/interceptor/change-own-password-verify.interceptor';
import {IUsersServiceInterface} from '@src-core/interface/i-users-service.interface';

describe('ChangeOwnPasswordAccessInterceptor', () => {
  it('should be defined', () => {
    expect(new ChangeOwnPasswordVerifyInterceptor(<IUsersServiceInterface><unknown>{})).toBeDefined();
  });
});
