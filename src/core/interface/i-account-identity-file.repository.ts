import {AsyncReturn} from '@src-core/utility';

export interface IAccountIdentityFileRepository {
  getAll(): Promise<AsyncReturn<Error, Array<string>>>;

  getByFilename(name: string): Promise<AsyncReturn<Error, string>>;

  moveAndCreateFile(filePath: string): Promise<AsyncReturn<Error, string>>;

  remove(filePath: string): Promise<AsyncReturn<Error, null>>;
}
