import {IAccountIdentityFileRepository} from '@src-core/interface/i-account-identity-file.repository';
import {AsyncReturn} from '@src-core/utility';

import * as fsAsync from 'fs/promises';
import * as path from 'path';
import {RepositoryException} from '@src-core/exception/repository.exception';

export class MystIdentityFileRepository implements IAccountIdentityFileRepository {
  private readonly _storeBasePath: string;

  constructor(storeBasePath: string) {
    this._storeBasePath = `${storeBasePath.replace(/(.+)\/$/g, '$1')}/`;
  }

  async getAll(): Promise<AsyncReturn<Error, Array<string>>> {
    const identityList = [];

    try {
      const fileList = MystIdentityFileRepository.getFiles(this._storeBasePath);
      for await (const file of fileList) {
        if (!/\.json$/.exec(file) || /remember\.json$/.exec(file)) {
          continue;
        }

        identityList.push(file);
      }

      return [null, identityList, identityList.length];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  getIdentityByFilepath(name: string): Promise<AsyncReturn<Error, string>> {
    return Promise.resolve(undefined);
  }

  moveAndRenameFile(filePath: string, renameFile: string): Promise<AsyncReturn<Error, string>> {
    return Promise.resolve(undefined);
  }

  remove(filePath: string): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  private static async* getFiles(dirPath) {
    const dirList = await fsAsync.readdir(dirPath, {withFileTypes: true});
    for (const dir of dirList) {
      const res = path.resolve(dirPath, dir.name);
      if (dir.isDirectory()) {
        yield* MystIdentityFileRepository.getFiles(res);
      } else {
        yield res;
      }
    }
  }
}
