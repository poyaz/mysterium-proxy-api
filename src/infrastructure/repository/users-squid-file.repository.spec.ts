import {Test, TestingModule} from '@nestjs/testing';

jest.mock('fs/promises');
import * as fsAsync from 'fs/promises';

jest.mock('child_process');
import {spawn} from 'child_process';

import {UsersSquidFileRepository} from './users-squid-file.repository';
import {RepositoryException} from '../../core/exception/repository.exception';
import {PassThrough} from 'stream';

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

    it(`Should error add new user when execute add username`, async () => {
      (<jest.Mock>fsAsync.access).mockResolvedValue(null);
      const spawnError = new Error('Spawn error');
      (<jest.Mock>spawn).mockImplementation(() => {
        throw spawnError;
      });

      const [error] = await repository.add(inputUsername, inputPassword);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(spawn).toHaveBeenCalled();
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(spawnError);
    });

    it(`Should error add new user when execute add password`, async () => {
      (<jest.Mock>fsAsync.access).mockResolvedValue(null);
      const spawnErrorMsg = 'Spawn stderr error';
      (<jest.Mock>spawn).mockImplementation(() => {
        const stdin = new PassThrough();

        const stderr = new PassThrough();
        stderr.write(spawnErrorMsg);
        stderr.end();

        return {stderr, stdin};
      });

      const [error] = await repository.add(inputUsername, inputPassword);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(spawn).toHaveBeenCalled();
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(new Error(spawnErrorMsg));
    });

    it(`Should successfully add new user`, async () => {
      (<jest.Mock>fsAsync.access).mockResolvedValue(null);
      (<jest.Mock>spawn).mockImplementation(() => {
        const stdin = new PassThrough();

        const stderr = new PassThrough();
        stderr.end();

        return {stderr, stdin};
      });

      const [error] = await repository.add(inputUsername, inputPassword);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(spawn).toHaveBeenCalled();
      expect(error).toBeNull();
    });

    it(`Should successfully add new user with adding msg`, async () => {
      (<jest.Mock>fsAsync.access).mockResolvedValue(null);
      (<jest.Mock>spawn).mockImplementation(() => {
        const stdin = new PassThrough();

        const stderr = new PassThrough();
        stderr.write('Adding new user successfully');
        stderr.end();

        return {stderr, stdin};
      });

      const [error] = await repository.add(inputUsername, inputPassword);

      expect(fsAsync.access).toHaveBeenCalled();
      expect(spawn).toHaveBeenCalled();
      expect(error).toBeNull();
    });
  });
});
