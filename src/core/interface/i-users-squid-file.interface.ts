import {AsyncReturn} from '@src-core/utility';

export interface IUsersSquidFileInterface {
  add(username: string, password: string): Promise<AsyncReturn<Error, null>>;

  verify(username: string, password: string): Promise<AsyncReturn<Error, boolean>>;

  update(username: string, password: string): Promise<AsyncReturn<Error, null>>;

  remove(username: string): Promise<AsyncReturn<Error, null>>;

  isUserExist(username: string): Promise<AsyncReturn<Error, boolean>>;
}
