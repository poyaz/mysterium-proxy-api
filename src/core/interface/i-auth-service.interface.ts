import {AsyncReturn} from '../utility';

export enum I_AUTH_SERVICE {
  DEFAULT = 'AUTH_SERVICE_DEFAULT',
}

export interface IAuthServiceInterface {
  login(username: string, password: string): Promise<AsyncReturn<Error, string>>;
}
