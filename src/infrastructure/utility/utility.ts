import {SortEnum} from '@src-core/model/filter.model';
import * as fsAsync from 'fs/promises';
import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';

export function sortListObject<T>(dataList: Array<T>, sortType: SortEnum, prop: keyof T) {
  const sortTypeNum = sortType === SortEnum.ASC ? 1 : -1;

  return dataList.sort((a, b) => {
    if (a[prop] > b[prop]) {
      return sortTypeNum * 1;
    }
    if (a[prop] < b[prop]) {
      return sortTypeNum * -1;
    }

    return 0;
  });
}

export async function* getFiles(dirPath): AsyncGenerator<string> {
  const dirList = await fsAsync.readdir(dirPath, {withFileTypes: true});
  for (const dir of dirList) {
    const res = path.resolve(dirPath, dir.name);
    if (dir.isDirectory()) {
      yield* getFiles(res);
    } else {
      yield res;
    }
  }
}

export async function checkDirOrFileExist(path, canWrite: boolean = false): Promise<boolean> {
  const permission = canWrite
    ? fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK
    : fs.constants.F_OK | fs.constants.R_OK;

  try {
    await fsAsync.access(path, permission);

    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

export async function checkPortInUse(ip: string, port: number): Promise<boolean> {
  const server = net.createServer();

  const result = new Promise((resolve, reject) => {
    server.once('error', (error) => {
      if (error['code'] === 'EADDRINUSE') {
        return resolve(true);
      }

      reject(error);
    });

    server.once('listening', () => {
      server.close();

      resolve(false);
    });
  });

  server.listen(port, ip);

  return <Promise<boolean>>result;
}
