import {IUsersSquidFileInterface} from '../../core/interface/i-users-squid-file.interface';
import {AsyncReturn} from '../../core/utility';
import {Injectable} from '@nestjs/common';
import * as fs from 'fs';
import * as fsAsync from 'fs/promises';
import {spawn} from 'child_process';
import {RepositoryException} from '../../core/exception/repository.exception';

@Injectable()
export class UsersSquidFileRepository implements IUsersSquidFileInterface {
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

  async remove(username: string): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  async update(username: string, password: string): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  async verify(username: string, password: string): Promise<AsyncReturn<Error, boolean>> {
    return Promise.resolve(undefined);
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
    const exec = spawn('htpasswd', ['-b', '-5', '-i', this._passwordFileAddr, username]);
    exec.stdin.write(password);
    exec.stdin.end();

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
