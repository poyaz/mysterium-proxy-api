import {IAccountIdentityFileRepository} from '@src-core/interface/i-account-identity-file.repository';
import {AsyncReturn} from '@src-core/utility';

import * as fsAsync from 'fs/promises';
import * as path from 'path';
import {RepositoryException} from '@src-core/exception/repository.exception';
import {NotFoundException} from '@src-core/exception/not-found.exception';
import {ParseIdentityException} from '@src-core/exception/parse-identity.exception';
import {NoAddressIdentityException} from '@src-core/exception/no-address-identity.exception';
import {InvalidFileTypeException} from '@src-core/exception/invalid-file-type.exception';

export class MystIdentityFileRepository implements IAccountIdentityFileRepository {
  private readonly _storeBasePath: string;

  constructor(storeBasePath: string) {
    this._storeBasePath = path.join(storeBasePath, path.sep);
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
      if ('errno' in error && error.errno === -2) {
        return [null, [], 0];
      }
      return [new RepositoryException(error)];
    }
  }

  async getByDirPath(dirPath: string): Promise<AsyncReturn<Error, string | null>> {
    const identityList = [];

    try {
      const fileList = MystIdentityFileRepository.getFiles(dirPath);
      for await (const file of fileList) {
        if (!/\.json$/.exec(file) || /remember\.json$/.exec(file)) {
          continue;
        }

        identityList.push(file);
      }
      if (identityList.length === 0) {
        return [null, null];
      }

      return [null, identityList[0]];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  async getIdentityByFilePath(filePath: string): Promise<AsyncReturn<Error, string>> {
    try {
      const row = await fsAsync.readFile(filePath, 'utf-8');

      const data = JSON.parse(row);
      if (!('address' in data)) {
        return [new NoAddressIdentityException()];
      }

      return [null, `0x${data.address}`];
    } catch (error) {
      if ('errno' in error && error.errno === -2) {
        return [new NotFoundException()];
      }
      if (error instanceof SyntaxError) {
        return [new ParseIdentityException()];
      }

      return [new RepositoryException(error)];
    }
  }

  async moveAndRenameFile(filePath: string, renameFile: string): Promise<AsyncReturn<Error, string>> {
    if (!/\.json$/.exec(renameFile)) {
      return [new InvalidFileTypeException()];
    }

    const [errorFetchIdentity, dataFetchIdentity] = await this.getIdentityByFilePath(filePath);
    if (errorFetchIdentity) {
      return [errorFetchIdentity];
    }

    const destinationFile = path.join(this._storeBasePath, dataFetchIdentity, path.sep, renameFile);
    try {
      await fsAsync.mkdir(path.dirname(destinationFile), {recursive: true});
      await fsAsync.rename(filePath, destinationFile);

      return [null, destinationFile];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  async remove(filePath: string): Promise<AsyncReturn<Error, null>> {
    if (!/\.json$/.exec(filePath)) {
      return [new InvalidFileTypeException()];
    }

    try {
      await fsAsync.rm(path.dirname(filePath), {recursive: true, force: true});

      return [null, null];
    } catch (error) {
      return [new RepositoryException(error)];
    }
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
