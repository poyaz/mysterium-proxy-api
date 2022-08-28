import {MystIdentityFileRepository} from './myst-identity-file.repository';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {Test, TestingModule} from '@nestjs/testing';

jest.mock('fs/promises');
import * as fsAsync from 'fs/promises';
import {RepositoryException} from '@src-core/exception/repository.exception';
import {Dirent} from 'fs';

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
      dirListFirstLevel1.isDirectory = jest.fn().mockReturnValue(true)

      dirListFirstLevelFile1 = new Dirent();
      dirListFirstLevelFile1.name = 'identity1.json';
      dirListFirstLevelFile1.isDirectory = jest.fn().mockReturnValue(false)

      dirListFirstLevelFileRemember1 = new Dirent();
      dirListFirstLevelFileRemember1.name = 'remember.json';
      dirListFirstLevelFileRemember1.isDirectory = jest.fn().mockReturnValue(false)

      dirListFirstLevelFileOtherFile1 = new Dirent();
      dirListFirstLevelFileOtherFile1.name = 'data.txt';
      dirListFirstLevelFileOtherFile1.isDirectory = jest.fn().mockReturnValue(false)

      dirListFirstLevel2 = new Dirent();
      dirListFirstLevel2.name = 'identity2';
      dirListFirstLevel2.isDirectory = jest.fn().mockReturnValue(true)

      dirListFirstLevelFile2 = new Dirent();
      dirListFirstLevelFile2.name = 'identity2.json';
      dirListFirstLevelFile2.isDirectory = jest.fn().mockReturnValue(false)
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
        `${storeBasePath}${dirListFirstLevel2.name}/${dirListFirstLevelFile2.name}`
      ]));
    });
  });
});
