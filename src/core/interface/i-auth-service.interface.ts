import {AsyncReturn} from '../utility';

export interface IAuthServiceInterface {
  login(username: string, password: string): Promise<AsyncReturn<Error, string>>;
}
