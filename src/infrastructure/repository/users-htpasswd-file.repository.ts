import {IUsersHtpasswdFileInterface} from '@src-core/interface/i-users-htpasswd-file.interface';
import {AsyncReturn} from '@src-core/utility';
import {Injectable} from '@nestjs/common';
import * as fs from 'fs';
import * as fsAsync from 'fs/promises';
import {spawn} from 'child_process';
import {RepositoryException} from '@src-core/exception/repository.exception';

@Injectable()
export class UsersHtpasswdFileRepository implements IUsersHtpasswdFileInterface {
  constructor(private readonly _passwordFileAddr: string) {
  }

  async add(username: string, password: string): Promise<AsyncReturn<Error, null>> {
    const [error, isFileExist] = await this._checkFileExist();
    if (error) {
      return [error];
    }

    try {
      if (!isFileExist) {
        const fd = await fsAsync.open(this._passwordFileAddr, 'w');
        await fd.close();
      }

      await this._executeFile(username, password);

      return [null];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  async remove(username: string): Promise<AsyncReturn<Error, undefined>> {
    const [error, isFileExist] = await this._checkFileExist();
    if (error) {
      return [error];
    }
    if (!isFileExist) {
      return [null];
    }

    try {
      const exec = spawn('htpasswd', ['-D', this._passwordFileAddr, username]);

      let executeError = '';
      for await (const chunk of exec.stderr) {
        executeError += chunk;
      }
      if (executeError) {
        if (/Deleting/i.test(executeError) || /not found/i.test(executeError)) {
          return [null];
        }

        return [new RepositoryException(new Error(executeError))];
      }

      return [null];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  async update(username: string, password: string): Promise<AsyncReturn<Error, null>> {
    try {
      await this._executeFile(username, password);

      return [null];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  async verify(username: string, password: string): Promise<AsyncReturn<Error, boolean>> {
    const [error, isFileExist] = await this._checkFileExist();
    if (error) {
      return [error];
    }
    if (!isFileExist) {
      return [null, false];
    }

    try {
      const exec = spawn('htpasswd', ['-v', '-B', '-b', this._passwordFileAddr, username, password]);

      let executeError = '';
      for await (const chunk of exec.stderr) {
        executeError += chunk;
      }
      if (executeError) {
        if (/not found/i.test(executeError) || /verification failed/i.test(executeError)) {
          return [null, false];
        }
        if (/correct/i.test(executeError)) {
          return [null, true];
        }

        return [new RepositoryException(new Error(executeError))];
      }

      return [null, false];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  async isUserExist(username: string): Promise<AsyncReturn<Error, boolean>> {
    const [error, isFileExist] = await this._checkFileExist();
    if (error) {
      return [error];
    }
    if (!isFileExist) {
      return [null, false];
    }

    try {
      const exec = spawn('htpasswd', ['-v', '-B', '-b', this._passwordFileAddr, username, 'random-check-password']);

      let executeError = '';
      for await (const chunk of exec.stderr) {
        executeError += chunk;
      }
      if (executeError) {
        if (/not found/i.test(executeError)) {
          return [null, false];
        }
        if (/verification failed/i.test(executeError) || /correct/i.test(executeError)) {
          return [null, true];
        }

        return [new RepositoryException(new Error(executeError))];
      }

      return [null, false];
    } catch (error) {
      return [new RepositoryException(error)];
    }
  }

  private async _checkFileExist(): Promise<AsyncReturn<Error, boolean>> {
    try {
      await fsAsync.access(this._passwordFileAddr, fs.constants.F_OK | fs.constants.R_OK);

      return [null, true];
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [null, false];
      }

      return [new RepositoryException(error)];
    }
  }

  private async _executeFile(username: string, password: string): Promise<void> {
    const exec = spawn('htpasswd', ['-b', '-B', this._passwordFileAddr, username, password]);

    let executeError = '';
    for await (const chunk of exec.stderr) {
      executeError += chunk;
    }
    if (!executeError) {
      return;
    }

    if (/Adding/i.test(executeError) || /Updating/i.test(executeError)) {
      return;
    }

    throw new Error(executeError);
  }
}
