import {AsyncReturn} from '@src-core/utility';

export interface IAuthServiceInterface {
  login(username: string, password: string): Promise<AsyncReturn<Error, string>>;
}
