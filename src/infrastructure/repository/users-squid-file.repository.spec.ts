import {Test, TestingModule} from '@nestjs/testing';

jest.mock('fs/promises');
import * as fsAsync from 'fs/promises';

jest.mock('child_process');
import {spawn} from 'child_process';

import {UsersSquidFileRepository} from './users-squid-file.repository';
import {RepositoryException} from '../../core/exception/repository.exception';
import {PassThrough} from 'stream';
import {AuthenticateException} from '../../core/exception/authenticate.exception';

describe('UsersSquidFileRepository', () => {
  let repository: UsersSquidFileRepository;
  let fileAddr;

  beforeEach(async () => {
    fileAddr = 'pass-of-squid-password';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: UsersSquidFileRepository,
          inject: [],
          useFactory: () =>
            new UsersSquidFileRepository(fileAddr),
        },
      ],
    }).compile();

    repository = module.get<UsersSquidFileRepository>(UsersSquidFileRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it(`should be defined`, () => {
    expect(repository).toBeDefined();
  });

  describe(`Add new user`, () => {
    let inputUsername;
    let inputPassword;

    beforeEach(() => {
      inputUsername = 'my-user';
      inputPassword = 'my password';
    });

    it(`Should error add new user when check file exist`, async () => {
      const fileError = new Error('File error');
      (<jest.Mock>fsAsync.access).mockRejectedValue(fileError);

      const [error] = await repository.add(inputUsername, inputPassword);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(fileError);
    });

    it(`Should error add new user when create file`, async () => {
      const fileExistError = new Error('File exist error');
      fileExistError['code'] = 'ENOENT';
      (<jest.Mock>fsAsync.access).mockRejectedValue(fileExistError);
      const fileError = new Error('File error');
      (<jest.Mock>fsAsync.open).mockRejectedValue(fileError);

      const [error] = await repository.add(inputUsername, inputPassword);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(fsAsync.open).toHaveBeenCalled();
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(fileError);
    });

    it(`Should error add new user when create file success but can't close file`, async () => {
      const fileExistError = new Error('File exist error');
      fileExistError['code'] = 'ENOENT';
      (<jest.Mock>fsAsync.access).mockRejectedValue(fileExistError);
      const fileError = new Error('File error');
      const outputFileOpen = {close: jest.fn().mockRejectedValue(fileError)};
      (<jest.Mock>fsAsync.open).mockResolvedValue(outputFileOpen);

      const [error] = await repository.add(inputUsername, inputPassword);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(fsAsync.open).toHaveBeenCalled();
      expect(outputFileOpen.close).toHaveBeenCalled();
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(fileError);
    });

    it(`Should error add new user when run add username`, async () => {
      (<jest.Mock>fsAsync.access).mockResolvedValue(null);
      const spawnError = new Error('Spawn error');
      (<jest.Mock>spawn).mockImplementation(() => {
        throw spawnError;
      });

      const [error] = await repository.add(inputUsername, inputPassword);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(spawn).toHaveBeenCalled();
      expect(spawn).toBeCalledWith('htpasswd', expect.arrayContaining(['-b', '-B', fileAddr, inputUsername, inputPassword]));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(spawnError);
    });

    it(`Should error add new user when execute add password`, async () => {
      (<jest.Mock>fsAsync.access).mockResolvedValue(null);
      const spawnErrorMsg = 'Spawn stderr error';
      (<jest.Mock>spawn).mockImplementation(() => {
        const stderr = new PassThrough();
        stderr.write(spawnErrorMsg);
        stderr.end();

        return {stderr};
      });

      const [error] = await repository.add(inputUsername, inputPassword);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(spawn).toHaveBeenCalled();
      expect(spawn).toBeCalledWith('htpasswd', expect.arrayContaining(['-b', '-B', fileAddr, inputUsername, inputPassword]));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(new Error(spawnErrorMsg));
    });

    it(`Should successfully add new user`, async () => {
      (<jest.Mock>fsAsync.access).mockResolvedValue(null);
      (<jest.Mock>spawn).mockImplementation(() => {
        const stderr = new PassThrough();
        stderr.end();

        return {stderr};
      });

      const [error] = await repository.add(inputUsername, inputPassword);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(spawn).toHaveBeenCalled();
      expect(spawn).toBeCalledWith('htpasswd', expect.arrayContaining(['-b', '-B', fileAddr, inputUsername, inputPassword]));
      expect(error).toBeNull();
    });

    it(`Should successfully add new user with adding message`, async () => {
      (<jest.Mock>fsAsync.access).mockResolvedValue(null);
      (<jest.Mock>spawn).mockImplementation(() => {
        const stderr = new PassThrough();
        stderr.write('Adding new user successfully');
        stderr.end();

        return {stderr};
      });

      const [error] = await repository.add(inputUsername, inputPassword);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(spawn).toHaveBeenCalled();
      expect(spawn).toBeCalledWith('htpasswd', expect.arrayContaining(['-b', '-B', fileAddr, inputUsername, inputPassword]));
      expect(error).toBeNull();
    });
  });

  describe(`Remove user`, () => {
    let inputUsername;

    beforeEach(() => {
      inputUsername = 'my-user';
    });

    it(`Should error remove user when check file exist`, async () => {
      const fileError = new Error('File error');
      (<jest.Mock>fsAsync.access).mockRejectedValue(fileError);

      const [error] = await repository.remove(inputUsername);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(fileError);
    });

    it(`Should successfully remove user and skip when file not exist`, async () => {
      const fileExistError = new Error('File exist error');
      fileExistError['code'] = 'ENOENT';
      (<jest.Mock>fsAsync.access).mockRejectedValue(fileExistError);

      const [error] = await repository.remove(inputUsername);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(error).toBeNull();
    });

    it(`Should error remove user when run check user`, async () => {
      (<jest.Mock>fsAsync.access).mockResolvedValue(null);
      const spawnError = new Error('Spawn error');
      (<jest.Mock>spawn).mockImplementation(() => {
        throw spawnError;
      });

      const [error] = await repository.remove(inputUsername);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(spawn).toHaveBeenCalled();
      expect(spawn).toBeCalledWith('htpasswd', expect.arrayContaining(['-D', fileAddr, inputUsername]));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(spawnError);
    });

    it(`Should error remove user when execute check user`, async () => {
      (<jest.Mock>fsAsync.access).mockResolvedValue(null);
      const spawnErrorMsg = 'Spawn stderr error';
      (<jest.Mock>spawn).mockImplementation(() => {
        const stderr = new PassThrough();
        stderr.write(spawnErrorMsg);
        stderr.end();

        return {stderr};
      });

      const [error] = await repository.remove(inputUsername);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(spawn).toHaveBeenCalled();
      expect(spawn).toBeCalledWith('htpasswd', expect.arrayContaining(['-D', fileAddr, inputUsername]));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(new Error(spawnErrorMsg));
    });

    it(`Should successfully remove user`, async () => {
      (<jest.Mock>fsAsync.access).mockResolvedValue(null);
      (<jest.Mock>spawn).mockImplementation(() => {
        const stderr = new PassThrough();
        stderr.end();

        return {stderr};
      });

      const [error] = await repository.remove(inputUsername);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(spawn).toHaveBeenCalled();
      expect(spawn).toBeCalledWith('htpasswd', expect.arrayContaining(['-D', fileAddr, inputUsername]));
      expect(error).toBeNull();
    });

    it(`Should successfully remove user with remove message`, async () => {
      (<jest.Mock>fsAsync.access).mockResolvedValue(null);
      (<jest.Mock>spawn).mockImplementation(() => {
        const stderr = new PassThrough();
        stderr.write(`Deleting password for user ${inputUsername}`);
        stderr.end();

        return {stderr};
      });

      const [error] = await repository.remove(inputUsername);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(spawn).toHaveBeenCalled();
      expect(spawn).toBeCalledWith('htpasswd', expect.arrayContaining(['-D', fileAddr, inputUsername]));
      expect(error).toBeNull();
    });

    it(`Should successfully remove user with not found message`, async () => {
      (<jest.Mock>fsAsync.access).mockResolvedValue(null);
      (<jest.Mock>spawn).mockImplementation(() => {
        const stderr = new PassThrough();
        stderr.write(`User ${inputUsername} not found`);
        stderr.end();

        return {stderr};
      });

      const [error] = await repository.remove(inputUsername);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(spawn).toHaveBeenCalled();
      expect(spawn).toBeCalledWith('htpasswd', expect.arrayContaining(['-D', fileAddr, inputUsername]));
      expect(error).toBeNull();
    });
  });

  describe(`Update user`, () => {
    let inputUsername;
    let inputPassword;

    beforeEach(() => {
      inputUsername = 'my-user';
      inputPassword = 'my password';
    });

    it(`Should error update user when run add username`, async () => {
      (<jest.Mock>fsAsync.access).mockResolvedValue(null);
      const spawnError = new Error('Spawn error');
      (<jest.Mock>spawn).mockImplementation(() => {
        throw spawnError;
      });

      const [error] = await repository.update(inputUsername, inputPassword);

      expect(spawn).toHaveBeenCalled();
      expect(spawn).toBeCalledWith('htpasswd', expect.arrayContaining(['-b', '-B', fileAddr, inputUsername, inputPassword]));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(spawnError);
    });

    it(`Should error update user when execute add password`, async () => {
      (<jest.Mock>fsAsync.access).mockResolvedValue(null);
      const spawnErrorMsg = 'Spawn stderr error';
      (<jest.Mock>spawn).mockImplementation(() => {
        const stderr = new PassThrough();
        stderr.write(spawnErrorMsg);
        stderr.end();

        return {stderr};
      });

      const [error] = await repository.update(inputUsername, inputPassword);

      expect(spawn).toHaveBeenCalled();
      expect(spawn).toBeCalledWith('htpasswd', expect.arrayContaining(['-b', '-B', fileAddr, inputUsername, inputPassword]));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(new Error(spawnErrorMsg));
    });

    it(`Should successfully update user`, async () => {
      (<jest.Mock>fsAsync.access).mockResolvedValue(null);
      (<jest.Mock>spawn).mockImplementation(() => {
        const stderr = new PassThrough();
        stderr.end();

        return {stderr};
      });

      const [error] = await repository.update(inputUsername, inputPassword);

      expect(spawn).toHaveBeenCalled();
      expect(spawn).toBeCalledWith('htpasswd', expect.arrayContaining(['-b', '-B', fileAddr, inputUsername, inputPassword]));
      expect(error).toBeNull();
    });

    it(`Should successfully update user with updating message`, async () => {
      (<jest.Mock>fsAsync.access).mockResolvedValue(null);
      (<jest.Mock>spawn).mockImplementation(() => {
        const stderr = new PassThrough();
        stderr.write('Updating user successfully');
        stderr.end();

        return {stderr};
      });

      const [error] = await repository.update(inputUsername, inputPassword);

      expect(spawn).toHaveBeenCalled();
      expect(spawn).toBeCalledWith('htpasswd', expect.arrayContaining(['-b', '-B', fileAddr, inputUsername, inputPassword]));
      expect(error).toBeNull();
    });
  });

  describe(`Verify user`, () => {
    let inputUsername;
    let inputPassword;

    beforeEach(() => {
      inputUsername = 'my-user';
      inputPassword = 'my password';
    });

    it(`Should error verify user when check file exist`, async () => {
      const fileError = new Error('File error');
      (<jest.Mock>fsAsync.access).mockRejectedValue(fileError);

      const [error] = await repository.verify(inputUsername, inputPassword);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(fileError);
    });

    it(`Should successfully verify user and return false when file not exist`, async () => {
      const fileExistError = new Error('File exist error');
      fileExistError['code'] = 'ENOENT';
      (<jest.Mock>fsAsync.access).mockRejectedValue(fileExistError);

      const [error, result] = await repository.verify(inputUsername, inputPassword);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(error).toBeNull();
      expect(result).toEqual(false);
    });

    it(`Should error verify user when run verify user`, async () => {
      (<jest.Mock>fsAsync.access).mockResolvedValue(null);
      const spawnError = new Error('Spawn error');
      (<jest.Mock>spawn).mockImplementation(() => {
        throw spawnError;
      });

      const [error] = await repository.verify(inputUsername, inputPassword);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(spawn).toHaveBeenCalled();
      expect(spawn).toBeCalledWith('htpasswd', expect.arrayContaining(['-v', '-B', '-b', fileAddr, inputUsername, inputPassword]));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(spawnError);
    });

    it(`Should error verify user when execute verify username and password`, async () => {
      (<jest.Mock>fsAsync.access).mockResolvedValue(null);
      const spawnErrorMsg = 'Spawn stderr error';
      (<jest.Mock>spawn).mockImplementation(() => {
        const stderr = new PassThrough();
        stderr.write(spawnErrorMsg);
        stderr.end();

        return {stderr};
      });

      const [error] = await repository.verify(inputUsername, inputPassword);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(spawn).toHaveBeenCalled();
      expect(spawn).toBeCalledWith('htpasswd', expect.arrayContaining(['-v', '-B', '-b', fileAddr, inputUsername, inputPassword]));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(new Error(spawnErrorMsg));
    });

    it(`Should successfully verify user and return false when user not found`, async () => {
      (<jest.Mock>fsAsync.access).mockResolvedValue(null);
      (<jest.Mock>spawn).mockImplementation(() => {

        const stderr = new PassThrough();
        stderr.write(`User ${inputUsername} not found`);
        stderr.end();

        return {stderr};
      });

      const [error, result] = await repository.verify(inputUsername, inputPassword);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(spawn).toHaveBeenCalled();
      expect(spawn).toBeCalledWith('htpasswd', expect.arrayContaining(['-v', '-B', '-b', fileAddr, inputUsername, inputPassword]));
      expect(error).toBeNull();
      expect(result).toEqual(false);
    });

    it(`Should successfully verify user and return false when password incorrect`, async () => {
      (<jest.Mock>fsAsync.access).mockResolvedValue(null);
      (<jest.Mock>spawn).mockImplementation(() => {
        const stderr = new PassThrough();
        stderr.write(`password verification failed`);
        stderr.end();

        return {stderr};
      });

      const [error, result] = await repository.verify(inputUsername, inputPassword);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(spawn).toHaveBeenCalled();
      expect(spawn).toBeCalledWith('htpasswd', expect.arrayContaining(['-v', '-B', '-b', fileAddr, inputUsername, inputPassword]));
      expect(error).toBeNull();
      expect(result).toEqual(false);
    });

    it(`Should successfully verify user and return true when username and password is correct`, async () => {
      (<jest.Mock>fsAsync.access).mockResolvedValue(null);
      (<jest.Mock>spawn).mockImplementation(() => {
        const stderr = new PassThrough();
        stderr.write(`Password for user ${inputUsername} correct`);
        stderr.end();

        return {stderr};
      });

      const [error, result] = await repository.verify(inputUsername, inputPassword);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(spawn).toHaveBeenCalled();
      expect(spawn).toBeCalledWith('htpasswd', expect.arrayContaining(['-v', '-B', '-b', fileAddr, inputUsername, inputPassword]));
      expect(error).toBeNull();
      expect(result).toEqual(true);
    });

    it(`Should successfully verify user and return false when not print anything in stderr`, async () => {
      (<jest.Mock>fsAsync.access).mockResolvedValue(null);
      (<jest.Mock>spawn).mockImplementation(() => {
        const stderr = new PassThrough();
        stderr.end();

        return {stderr};
      });

      const [error, result] = await repository.verify(inputUsername, inputPassword);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(spawn).toHaveBeenCalled();
      expect(spawn).toBeCalledWith('htpasswd', expect.arrayContaining(['-v', '-B', '-b', fileAddr, inputUsername, inputPassword]));
      expect(error).toBeNull();
      expect(result).toEqual(false);
    });
  });
});
