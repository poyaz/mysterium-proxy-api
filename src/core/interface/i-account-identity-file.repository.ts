import {AsyncReturn} from '@src-core/utility';

export interface IAccountIdentityFileRepository {
  getAll(): Promise<AsyncReturn<Error, Array<string>>>;

  getIdentityByFilepath(name: string): Promise<AsyncReturn<Error, string>>;

  moveAndRenameFile(filePath: string, renameFile: string): Promise<AsyncReturn<Error, string>>;

  remove(filePath: string): Promise<AsyncReturn<Error, null>>;
}
