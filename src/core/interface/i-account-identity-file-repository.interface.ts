import {AsyncReturn} from '@src-core/utility';

export interface IAccountIdentityFileRepositoryInterface {
  getAll(): Promise<AsyncReturn<Error, Array<string>>>;

  getByDirPath(dirPath: string): Promise<AsyncReturn<Error, string | null>>;

  getIdentityByFilePath(filePath: string): Promise<AsyncReturn<Error, string>>;

  moveAndRenameFile(filePath: string, renameFile: string): Promise<AsyncReturn<Error, string>>;

  remove(filePath: string): Promise<AsyncReturn<Error, null>>;
}
