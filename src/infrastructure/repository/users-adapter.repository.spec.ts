import {UsersAdapterRepository} from './users-adapter.repository';
import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {UsersModel} from '@src-core/model/users.model';
import {IUsersSquidFileInterface} from '@src-core/interface/i-users-squid-file.interface';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {Test, TestingModule} from '@nestjs/testing';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {UserRoleEnum} from '@src-core/enum/user-role.enum';
import {FilterModel} from '@src-core/model/filter.model';
import {ExistException} from '@src-core/exception/exist.exception';
import {UpdateModel} from '@src-core/model/update.model';

describe('UsersAdapterRepository', () => {
  let repository: UsersAdapterRepository;
  let usersPgRepository: MockProxy<IGenericRepositoryInterface<UsersModel>>;
  let usersSquidFileRepository: MockProxy<IUsersSquidFileInterface>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    usersPgRepository = mock<IGenericRepositoryInterface<UsersModel>>();
    usersSquidFileRepository = mock<IUsersSquidFileInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProviderTokenEnum.USER_PG_REPOSITORY,
          useValue: usersPgRepository,
        },
        {
          provide: ProviderTokenEnum.USERS_SQUID_FILE_REPOSITORY,
          useValue: usersSquidFileRepository,
        },
        {
          provide: UsersAdapterRepository,
          inject: [ProviderTokenEnum.USER_PG_REPOSITORY, ProviderTokenEnum.USERS_SQUID_FILE_REPOSITORY],
          useFactory: (usersPgRepository: IGenericRepositoryInterface<UsersModel>, usersSquidFileRepository: IUsersSquidFileInterface) =>
            new UsersAdapterRepository(usersPgRepository, usersSquidFileRepository),
        },
      ],
    }).compile();

    repository = module.get<UsersAdapterRepository>(UsersAdapterRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it(`should be defined`, () => {
    expect(repository).toBeDefined();
  });

  describe(`Add new user`, () => {
    let inputUsersModel: UsersModel;
    let matchFindUserFilter: FilterModel<UsersModel>;
    let outputUsersModel: UsersModel;
    let matchUpdateUser: UpdateModel<UsersModel>;

    beforeEach(() => {
      inputUsersModel = new UsersModel({
        id: '',
        username: 'my-user',
        password: 'my-password',
        role: UserRoleEnum.USER,
        isEnable: true,
        insertDate: new Date(),
      });

      matchFindUserFilter = new FilterModel<UsersModel>();
      matchFindUserFilter.addCondition({username: inputUsersModel.username, $opr: 'eq'});

      outputUsersModel = new UsersModel({
        id: identifierMock.generateId(),
        username: 'my-user',
        password: 'my-password',
        role: UserRoleEnum.USER,
        isEnable: true,
        insertDate: new Date(),
      });

      matchUpdateUser = new UpdateModel<UsersModel>(identifierMock.generateId(), outputUsersModel.clone());
    });

    it(`Should error add new user when check user exist on database`, async () => {
      usersPgRepository.getAll.mockResolvedValue([new UnknownException()]);
      usersSquidFileRepository.isUserExist.mockResolvedValue([null, false]);

      const [error] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error add new user when check user exist on squid`, async () => {
      usersPgRepository.getAll.mockResolvedValue([null, []]);
      usersSquidFileRepository.isUserExist.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersSquidFileRepository.isUserExist).toHaveBeenCalled();
      expect(usersSquidFileRepository.isUserExist).toBeCalledWith(inputUsersModel.username);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error add new user when user exist on system`, async () => {
      usersPgRepository.getAll.mockResolvedValue([null, [outputUsersModel]]);
      usersSquidFileRepository.isUserExist.mockResolvedValue([null, true]);

      const [error] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersSquidFileRepository.isUserExist).toHaveBeenCalled();
      expect(usersSquidFileRepository.isUserExist).toBeCalledWith(inputUsersModel.username);
      expect(error).toBeInstanceOf(ExistException);
    });

    it(`Should error add new user when can't create on database`, async () => {
      usersPgRepository.getAll.mockResolvedValue([null, []]);
      usersSquidFileRepository.isUserExist.mockResolvedValue([null, false]);
      usersPgRepository.add.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersSquidFileRepository.isUserExist).toHaveBeenCalled();
      expect(usersSquidFileRepository.isUserExist).toBeCalledWith(inputUsersModel.username);
      expect(usersPgRepository.add).toHaveBeenCalled();
      expect(usersPgRepository.add).toBeCalledWith(inputUsersModel);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error add new user when can't create on squid`, async () => {
      usersPgRepository.getAll.mockResolvedValue([null, []]);
      usersSquidFileRepository.isUserExist.mockResolvedValue([null, false]);
      usersPgRepository.add.mockResolvedValue([null, outputUsersModel]);
      usersSquidFileRepository.add.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersSquidFileRepository.isUserExist).toHaveBeenCalled();
      expect(usersSquidFileRepository.isUserExist).toBeCalledWith(inputUsersModel.username);
      expect(usersPgRepository.add).toHaveBeenCalled();
      expect(usersPgRepository.add).toBeCalledWith(inputUsersModel);
      expect(usersSquidFileRepository.add).toHaveBeenCalled();
      expect(usersSquidFileRepository.add).toBeCalledWith(inputUsersModel.username, inputUsersModel.password);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully add new user`, async () => {
      usersPgRepository.getAll.mockResolvedValue([null, []]);
      usersSquidFileRepository.isUserExist.mockResolvedValue([null, false]);
      usersPgRepository.add.mockResolvedValue([null, outputUsersModel]);
      usersSquidFileRepository.add.mockResolvedValue([null]);

      const [error, result] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersSquidFileRepository.isUserExist).toHaveBeenCalled();
      expect(usersSquidFileRepository.isUserExist).toBeCalledWith(inputUsersModel.username);
      expect(usersPgRepository.add).toHaveBeenCalled();
      expect(usersPgRepository.add).toBeCalledWith(inputUsersModel);
      expect(usersSquidFileRepository.add).toHaveBeenCalled();
      expect(usersSquidFileRepository.add).toBeCalledWith(inputUsersModel.username, inputUsersModel.password);
      expect(error).toBeNull();
      expect(result).toEqual(outputUsersModel);
    });

    it(`Should error add new user when update user if user exist on database but not exist on squid`, async () => {
      usersPgRepository.getAll.mockResolvedValue([null, [outputUsersModel]]);
      usersSquidFileRepository.isUserExist.mockResolvedValue([null, false]);
      usersPgRepository.update.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersSquidFileRepository.isUserExist).toHaveBeenCalled();
      expect(usersSquidFileRepository.isUserExist).toBeCalledWith(inputUsersModel.username);
      expect(usersPgRepository.update).toHaveBeenCalled();
      expect(usersPgRepository.update).toBeCalledWith(matchUpdateUser);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully add new user when update user if user exist on database but not exist on squid`, async () => {
      usersPgRepository.getAll.mockResolvedValue([null, [outputUsersModel]]);
      usersSquidFileRepository.isUserExist.mockResolvedValue([null, false]);
      usersPgRepository.update.mockResolvedValue([null]);
      usersSquidFileRepository.add.mockResolvedValue([null]);

      const [error, result] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersSquidFileRepository.isUserExist).toHaveBeenCalled();
      expect(usersSquidFileRepository.isUserExist).toBeCalledWith(inputUsersModel.username);
      expect(usersPgRepository.update).toHaveBeenCalled();
      expect(usersPgRepository.update).toBeCalledWith(matchUpdateUser);
      expect(usersSquidFileRepository.add).toHaveBeenCalled();
      expect(usersSquidFileRepository.add).toBeCalledWith(inputUsersModel.username, inputUsersModel.password);
      expect(error).toBeNull();
      expect(result).toEqual(outputUsersModel);
    });

    it(`Should error add new user when duplicate record on database and can't update user on database`, async () => {
      usersPgRepository.getAll.mockResolvedValueOnce([null, []]);
      usersSquidFileRepository.isUserExist.mockResolvedValue([null, false]);
      usersPgRepository.add.mockResolvedValue([new ExistException()]);
      usersPgRepository.getAll.mockResolvedValueOnce([new UnknownException()]);

      const [error] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toBeCalledTimes(2);
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersSquidFileRepository.isUserExist).toHaveBeenCalled();
      expect(usersSquidFileRepository.isUserExist).toBeCalledWith(inputUsersModel.username);
      expect(usersPgRepository.add).toHaveBeenCalled();
      expect(usersPgRepository.add).toBeCalledWith(inputUsersModel);
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[1][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error add new user when duplicate record on database and can't update user on database`, async () => {
      usersPgRepository.getAll.mockResolvedValueOnce([null, []]);
      usersSquidFileRepository.isUserExist.mockResolvedValue([null, false]);
      usersPgRepository.add.mockResolvedValue([new ExistException()]);
      usersPgRepository.getAll.mockResolvedValueOnce([null, [outputUsersModel]]);
      usersPgRepository.update.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toBeCalledTimes(2);
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersSquidFileRepository.isUserExist).toHaveBeenCalled();
      expect(usersSquidFileRepository.isUserExist).toBeCalledWith(inputUsersModel.username);
      expect(usersPgRepository.add).toHaveBeenCalled();
      expect(usersPgRepository.add).toBeCalledWith(inputUsersModel);
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[1][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersPgRepository.update).toHaveBeenCalled();
      expect(usersPgRepository.update).toBeCalledWith(matchUpdateUser);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully add new user when duplicate record on database and user not exist on squid`, async () => {
      usersPgRepository.getAll.mockResolvedValueOnce([null, []]);
      usersSquidFileRepository.isUserExist.mockResolvedValue([null, false]);
      usersPgRepository.add.mockResolvedValue([new ExistException()]);
      usersPgRepository.getAll.mockResolvedValueOnce([null, [outputUsersModel]]);
      usersPgRepository.update.mockResolvedValue([null]);
      usersSquidFileRepository.add.mockResolvedValue([null]);

      const [error, result] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toBeCalledTimes(2);
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersSquidFileRepository.isUserExist).toHaveBeenCalled();
      expect(usersSquidFileRepository.isUserExist).toBeCalledWith(inputUsersModel.username);
      expect(usersPgRepository.add).toHaveBeenCalled();
      expect(usersPgRepository.add).toBeCalledWith(inputUsersModel);
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[1][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersPgRepository.update).toHaveBeenCalled();
      expect(usersPgRepository.update).toBeCalledWith(matchUpdateUser);
      expect(usersSquidFileRepository.add).toHaveBeenCalled();
      expect(usersSquidFileRepository.add).toBeCalledWith(inputUsersModel.username, inputUsersModel.password);
      expect(error).toBeNull();
      expect(result).toEqual(outputUsersModel);
    });
  });

  describe(`Get all users`, () => {
    let outputUsersModel: UsersModel;

    beforeEach(() => {
      outputUsersModel = new UsersModel({
        id: identifierMock.generateId(),
        username: 'my-user',
        password: 'my-password',
        role: UserRoleEnum.USER,
        isEnable: true,
        insertDate: new Date(),
      });
    });

    it(`Should error get all users`, async () => {
      usersPgRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.getAll();

      expect(usersPgRepository.getAll).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get all users`, async () => {
      usersPgRepository.getAll.mockResolvedValue([null, [outputUsersModel]]);

      const [error, result] = await repository.getAll();

      expect(usersPgRepository.getAll).toHaveBeenCalled();
      expect(error).toBeNull();
      expect(result.length).toEqual(1);
      expect(result[0]).toMatchObject(outputUsersModel);
    });
  });

  describe(`Get by id`, () => {
    let inputId: string;
    let outputUsersModel: UsersModel;

    beforeEach(() => {
      inputId = identifierMock.generateId();

      outputUsersModel = new UsersModel({
        id: identifierMock.generateId(),
        username: 'my-user',
        password: 'my-password',
        role: UserRoleEnum.USER,
        isEnable: true,
        insertDate: new Date(),
      });
    });

    it(`Should error get by id`, async () => {
      usersPgRepository.getById.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.getById(inputId);

      expect(usersPgRepository.getById).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get by id`, async () => {
      usersPgRepository.getById.mockResolvedValue([null, outputUsersModel]);

      const [error, result] = await repository.getById(inputId);

      expect(usersPgRepository.getById).toHaveBeenCalled();
      expect(error).toBeNull();
      expect(result).toMatchObject(outputUsersModel);
    });
  });
});
