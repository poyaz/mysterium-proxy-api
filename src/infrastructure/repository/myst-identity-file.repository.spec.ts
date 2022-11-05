import {MystIdentityFileRepository} from './myst-identity-file.repository';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {Test, TestingModule} from '@nestjs/testing';
import {RepositoryException} from '@src-core/exception/repository.exception';
import {Dirent} from 'fs';
import {NotFoundException} from '@src-core/exception/not-found.exception';
import {ParseIdentityException} from '@src-core/exception/parse-identity.exception';
import {NoAddressIdentityException} from '@src-core/exception/no-address-identity.exception';
import {InvalidFileTypeException} from '@src-core/exception/invalid-file-type.exception';
import {UnknownException} from '@src-core/exception/unknown.exception';
import * as path from 'path';

jest.mock('fs/promises');
import * as fsAsync from 'fs/promises';


describe('MystIdentityFileRepository', () => {
  let repository: MystIdentityFileRepository;
  let storeBasePath: string;
  let identifierMock: MockProxy<IIdentifier>;
  let fakeIdentifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    storeBasePath = '/new/path/';

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    fakeIdentifierMock = mock<IIdentifier>();
    fakeIdentifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: MystIdentityFileRepository,
          inject: [],
          useFactory: () => new MystIdentityFileRepository(storeBasePath),
        },
      ],
    }).compile();

    repository = module.get<MystIdentityFileRepository>(MystIdentityFileRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe(`Get all file identity`, () => {
    let dirListFirstLevel1: Dirent;
    let dirListFirstLevelFile1: Dirent;
    let dirListFirstLevelFileRemember1: Dirent;
    let dirListFirstLevelFileOtherFile1: Dirent;
    let dirListFirstLevel2: Dirent;
    let dirListFirstLevelFile2: Dirent;

    beforeEach(() => {
      dirListFirstLevel1 = new Dirent();
      dirListFirstLevel1.name = 'identity1';
      dirListFirstLevel1.isDirectory = jest.fn().mockReturnValue(true);

      dirListFirstLevelFile1 = new Dirent();
      dirListFirstLevelFile1.name = 'identity1.json';
      dirListFirstLevelFile1.isDirectory = jest.fn().mockReturnValue(false);

      dirListFirstLevelFileRemember1 = new Dirent();
      dirListFirstLevelFileRemember1.name = 'remember.json';
      dirListFirstLevelFileRemember1.isDirectory = jest.fn().mockReturnValue(false);

      dirListFirstLevelFileOtherFile1 = new Dirent();
      dirListFirstLevelFileOtherFile1.name = 'data.txt';
      dirListFirstLevelFileOtherFile1.isDirectory = jest.fn().mockReturnValue(false);

      dirListFirstLevel2 = new Dirent();
      dirListFirstLevel2.name = 'identity2';
      dirListFirstLevel2.isDirectory = jest.fn().mockReturnValue(true);

      dirListFirstLevelFile2 = new Dirent();
      dirListFirstLevelFile2.name = 'identity2.json';
      dirListFirstLevelFile2.isDirectory = jest.fn().mockReturnValue(false);
    });

    it(`Should error get all file identity when execute fs read dir`, async () => {
      const fileError = new Error('File error');
      (<jest.Mock>fsAsync.readdir).mockRejectedValue(fileError);

      const [error] = await repository.getAll();

      expect(fsAsync.readdir).toHaveBeenCalled();
      expect((<jest.Mock>fsAsync.readdir).mock.calls[0][0]).toEqual(storeBasePath);
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(fileError);
    });

    it(`Should successfully get all file identity when path not exist`, async () => {
      const fileError = new Error('File error');
      fileError['errno'] = -2;
      (<jest.Mock>fsAsync.readdir).mockRejectedValue(fileError);

      const [error, result] = await repository.getAll();

      expect(fsAsync.readdir).toBeCalledTimes(1);
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
    });

    it(`Should successfully get all file identity`, async () => {
      (<jest.Mock>fsAsync.readdir)
        .mockResolvedValueOnce([dirListFirstLevel1, dirListFirstLevel2])
        .mockResolvedValueOnce([dirListFirstLevelFile1, dirListFirstLevelFileRemember1, dirListFirstLevelFileOtherFile1])
        .mockResolvedValueOnce([dirListFirstLevelFile2]);

      const [error, result] = await repository.getAll();

      expect(fsAsync.readdir).toBeCalledTimes(3);
      expect((<jest.Mock>fsAsync.readdir).mock.calls[0][0]).toEqual(storeBasePath);
      expect((<jest.Mock>fsAsync.readdir).mock.calls[1][0]).toEqual(`${storeBasePath}${dirListFirstLevel1.name}`);
      expect((<jest.Mock>fsAsync.readdir).mock.calls[2][0]).toEqual(`${storeBasePath}${dirListFirstLevel2.name}`);
      expect(error).toBeNull();
      expect(result).toEqual(expect.arrayContaining([
        `${storeBasePath}${dirListFirstLevel1.name}/${dirListFirstLevelFile1.name}`,
        `${storeBasePath}${dirListFirstLevel2.name}/${dirListFirstLevelFile2.name}`,
      ]));
    });
  });

  describe(`Get file identity with dir path`, () => {
    let inputDirPath: string;
    let dirListFirstLevelFile: Dirent;
    let dirListFirstLevelFileRemember: Dirent;

    beforeEach(() => {
      inputDirPath = '/new/path/identity1/';

      dirListFirstLevelFile = new Dirent();
      dirListFirstLevelFile.name = 'identity1.json';
      dirListFirstLevelFile.isDirectory = jest.fn().mockReturnValue(false);

      dirListFirstLevelFileRemember = new Dirent();
      dirListFirstLevelFileRemember.name = 'remember.json';
      dirListFirstLevelFileRemember.isDirectory = jest.fn().mockReturnValue(false);
    });

    it(`Should error get file identity with dir path when execute fs read dir`, async () => {
      const fileError = new Error('File error');
      (<jest.Mock>fsAsync.readdir).mockRejectedValue(fileError);

      const [error] = await repository.getByDirPath(inputDirPath);

      expect(fsAsync.readdir).toHaveBeenCalled();
      expect((<jest.Mock>fsAsync.readdir).mock.calls[0][0]).toEqual(inputDirPath);
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(fileError);
    });

    it(`Should successfully get file identity with dir path and return empty if not found`, async () => {
      (<jest.Mock>fsAsync.readdir).mockResolvedValue([]);

      const [error, result] = await repository.getByDirPath(inputDirPath);

      expect(fsAsync.readdir).toHaveBeenCalled();
      expect((<jest.Mock>fsAsync.readdir).mock.calls[0][0]).toEqual(inputDirPath);
      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it(`Should successfully get file identity with dir path`, async () => {
      (<jest.Mock>fsAsync.readdir).mockResolvedValue([dirListFirstLevelFile, dirListFirstLevelFileRemember]);

      const [error, result] = await repository.getByDirPath(inputDirPath);

      expect(fsAsync.readdir).toHaveBeenCalled();
      expect((<jest.Mock>fsAsync.readdir).mock.calls[0][0]).toEqual(inputDirPath);
      expect(error).toBeNull();
      expect(result).toEqual(`${inputDirPath}${dirListFirstLevelFile.name}`);
    });
  });

  describe(`Get identity by file path`, () => {
    let inputFilePath: string;
    let outputFileData1: string;
    let outputFileDataNoIdentity2: string;
    let outputFileDataFail3: string;

    beforeEach(() => {
      inputFilePath = '/new/path/identity1/identity.json';

      outputFileData1 = '{"address": "0xfe01c4e48515bd0f0c0c5a912c329ec2b8a7a116"}';

      outputFileDataNoIdentity2 = '{}';

      outputFileDataFail3 = 'invalid-identity';
    });

    it(`Should error get identity by file path when file not exist`, async () => {
      const fileError = new Error('File error');
      fileError['errno'] = -2;
      (<jest.Mock>fsAsync.readFile).mockRejectedValue(fileError);

      const [error] = await repository.getIdentityByFilePath(inputFilePath);

      expect(fsAsync.readFile).toHaveBeenCalled();
      expect(fsAsync.readFile).toHaveBeenCalledWith(inputFilePath, 'utf-8');
      expect(error).toBeInstanceOf(NotFoundException);
    });

    it(`Should error get identity by file path when fail parse json data`, async () => {
      (<jest.Mock>fsAsync.readFile).mockResolvedValue(outputFileDataFail3);

      const [error] = await repository.getIdentityByFilePath(inputFilePath);

      expect(fsAsync.readFile).toHaveBeenCalled();
      expect(fsAsync.readFile).toHaveBeenCalledWith(inputFilePath, 'utf-8');
      expect(error).toBeInstanceOf(ParseIdentityException);
    });

    it(`Should error get identity by file path when can't found identity from file`, async () => {
      (<jest.Mock>fsAsync.readFile).mockResolvedValue(outputFileDataNoIdentity2);

      const [error] = await repository.getIdentityByFilePath(inputFilePath);

      expect(fsAsync.readFile).toHaveBeenCalled();
      expect(fsAsync.readFile).toHaveBeenCalledWith(inputFilePath, 'utf-8');
      expect(error).toBeInstanceOf(NoAddressIdentityException);
    });

    it(`Should error get identity by file path when unknown error`, async () => {
      const fileError = new Error('File error');
      (<jest.Mock>fsAsync.readFile).mockRejectedValue(fileError);

      const [error] = await repository.getIdentityByFilePath(inputFilePath);

      expect(fsAsync.readFile).toHaveBeenCalled();
      expect(fsAsync.readFile).toHaveBeenCalledWith(inputFilePath, 'utf-8');
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(fileError);
    });

    it(`Should successfully get identity by file path`, async () => {
      (<jest.Mock>fsAsync.readFile).mockResolvedValue(outputFileData1);

      const [error, result] = await repository.getIdentityByFilePath(inputFilePath);

      expect(fsAsync.readFile).toHaveBeenCalled();
      expect(fsAsync.readFile).toHaveBeenCalledWith(inputFilePath, 'utf-8');
      expect(error).toBeNull();
      expect(result).toEqual(`0x${JSON.parse(outputFileData1).address}`);
    });
  });

  describe(`Move and rename file`, () => {
    let inputFilePath: string;
    let inputRenameFile1: string;
    let inputRenameFileInvalid2: string;
    let repositoryGetIdentityByFilePathStub: jest.SpyInstance;

    beforeEach(() => {
      inputFilePath = '/tmp/upload/identity1.json';
      inputRenameFile1 = 'identity1.json';
      inputRenameFileInvalid2 = 'identity1';

      repositoryGetIdentityByFilePathStub = jest.spyOn(repository, 'getIdentityByFilePath');
    });

    afterEach(() => {
      repositoryGetIdentityByFilePathStub.mockClear();
    });

    it(`Should error move and rename file if rename file type not valid type`, async () => {
      const [error] = await repository.moveAndRenameFile(inputFilePath, inputRenameFileInvalid2);

      expect(error).toBeInstanceOf(InvalidFileTypeException);
    });

    it(`Should error move and rename file when read identity address from file`, async () => {
      repositoryGetIdentityByFilePathStub.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.moveAndRenameFile(inputFilePath, inputRenameFile1);

      expect(repositoryGetIdentityByFilePathStub).toHaveBeenCalled();
      expect(repositoryGetIdentityByFilePathStub).toHaveBeenCalledWith(inputFilePath);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error move and rename file when create recursive folder`, async () => {
      repositoryGetIdentityByFilePathStub.mockResolvedValue([null, 'identity1']);
      const fileError = new Error('File error');
      (<jest.Mock>fsAsync.mkdir).mockRejectedValue(fileError);

      const [error] = await repository.moveAndRenameFile(inputFilePath, inputRenameFile1);

      expect(repositoryGetIdentityByFilePathStub).toHaveBeenCalled();
      expect(repositoryGetIdentityByFilePathStub).toHaveBeenCalledWith(inputFilePath);
      expect(fsAsync.mkdir).toHaveBeenCalled();
      expect(fsAsync.mkdir).toHaveBeenCalledWith(path.join(storeBasePath, 'identity1'), {recursive: true});
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(fileError);
    });

    it(`Should error move and rename file when copy file`, async () => {
      repositoryGetIdentityByFilePathStub.mockResolvedValue([null, 'identity1']);
      (<jest.Mock>fsAsync.mkdir).mockResolvedValue(null);
      const fileError = new Error('File error');
      (<jest.Mock>fsAsync.copyFile).mockRejectedValue(fileError);

      const [error] = await repository.moveAndRenameFile(inputFilePath, inputRenameFile1);

      expect(repositoryGetIdentityByFilePathStub).toHaveBeenCalled();
      expect(repositoryGetIdentityByFilePathStub).toHaveBeenCalledWith(inputFilePath);
      expect(fsAsync.mkdir).toHaveBeenCalled();
      expect(fsAsync.mkdir).toHaveBeenCalledWith(path.join(storeBasePath, 'identity1'), {recursive: true});
      expect(fsAsync.copyFile).toHaveBeenCalled();
      expect(fsAsync.copyFile).toHaveBeenCalledWith(inputFilePath, path.join(storeBasePath, 'identity1', path.sep, inputRenameFile1));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(fileError);
    });

    it(`Should error move and rename file when remove old file`, async () => {
      repositoryGetIdentityByFilePathStub.mockResolvedValue([null, 'identity1']);
      (<jest.Mock>fsAsync.mkdir).mockResolvedValue(null);
      (<jest.Mock>fsAsync.copyFile).mockResolvedValue(null);
      const fileError = new Error('File error');
      (<jest.Mock>fsAsync.unlink).mockRejectedValue(fileError);

      const [error] = await repository.moveAndRenameFile(inputFilePath, inputRenameFile1);

      expect(repositoryGetIdentityByFilePathStub).toHaveBeenCalled();
      expect(repositoryGetIdentityByFilePathStub).toHaveBeenCalledWith(inputFilePath);
      expect(fsAsync.mkdir).toHaveBeenCalled();
      expect(fsAsync.mkdir).toHaveBeenCalledWith(path.join(storeBasePath, 'identity1'), {recursive: true});
      expect(fsAsync.copyFile).toHaveBeenCalled();
      expect(fsAsync.copyFile).toHaveBeenCalledWith(inputFilePath, path.join(storeBasePath, 'identity1', path.sep, inputRenameFile1));
      expect(fsAsync.unlink).toHaveBeenCalled();
      expect(fsAsync.unlink).toHaveBeenCalledWith(inputFilePath);
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(fileError);
    });

    it(`Should successfully move and rename file`, async () => {
      repositoryGetIdentityByFilePathStub.mockResolvedValue([null, 'identity1']);
      (<jest.Mock>fsAsync.mkdir).mockResolvedValue(null);
      (<jest.Mock>fsAsync.copyFile).mockResolvedValue(null);
      (<jest.Mock>fsAsync.unlink).mockResolvedValue(null);

      const [error, result] = await repository.moveAndRenameFile(inputFilePath, inputRenameFile1);

      expect(repositoryGetIdentityByFilePathStub).toHaveBeenCalled();
      expect(repositoryGetIdentityByFilePathStub).toHaveBeenCalledWith(inputFilePath);
      expect(fsAsync.mkdir).toHaveBeenCalled();
      expect(fsAsync.mkdir).toHaveBeenCalledWith(path.join(storeBasePath, 'identity1'), {recursive: true});
      expect(fsAsync.copyFile).toHaveBeenCalled();
      expect(fsAsync.copyFile).toHaveBeenCalledWith(inputFilePath, path.join(storeBasePath, 'identity1', path.sep, inputRenameFile1));
      expect(fsAsync.unlink).toHaveBeenCalled();
      expect(fsAsync.unlink).toHaveBeenCalledWith(inputFilePath);
      expect(error).toBeNull();
      expect(result).toEqual(path.join(storeBasePath, 'identity1', path.sep, inputRenameFile1));
    });
  });

  describe(`Remove file identity`, () => {
    let inputFilePath1: string;
    let inputFilePathInvalid2: string;

    beforeEach(() => {
      inputFilePath1 = '/new/path/identity1/identity.json';
      inputFilePathInvalid2 = '/new/path/identity1/identity';
    });

    it(`Should error remove file identity if file path not valid type`, async () => {
      const [error] = await repository.remove(inputFilePathInvalid2);

      expect(error).toBeInstanceOf(InvalidFileTypeException);
    });

    it(`Should error remove file identity when execute remove dir`, async () => {
      const fileError = new Error('File error');
      (<jest.Mock>fsAsync.rm).mockRejectedValue(fileError);

      const [error] = await repository.remove(inputFilePath1);

      expect(fsAsync.rm).toHaveBeenCalled();
      expect(fsAsync.rm).toHaveBeenCalledWith(path.dirname(inputFilePath1), {recursive: true, force: true});
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(fileError);
    });

    it(`Should successfully remove file identity when execute remove dir`, async () => {
      (<jest.Mock>fsAsync.rm).mockResolvedValue(null);

      const [error] = await repository.remove(inputFilePath1);

      expect(fsAsync.rm).toHaveBeenCalled();
      expect(fsAsync.rm).toHaveBeenCalledWith(path.dirname(inputFilePath1), {recursive: true, force: true});
      expect(error).toBeNull();
    });
  });
});
