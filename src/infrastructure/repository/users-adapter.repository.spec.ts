import {UsersAdapterRepository} from './users-adapter.repository';
import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {UsersModel} from '@src-core/model/users.model';
import {IUsersHtpasswdFileInterface} from '@src-core/interface/i-users-htpasswd-file.interface';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {Test, TestingModule} from '@nestjs/testing';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {UserRoleEnum} from '@src-core/enum/user-role.enum';
import {FilterModel} from '@src-core/model/filter.model';
import {ExistException} from '@src-core/exception/exist.exception';
import {UpdateModel} from '@src-core/model/update.model';
import {IRunnerRepositoryInterface} from '@src-core/interface/i-runner-repository.interface';
import {
  RunnerExecEnum,
  RunnerModel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';

describe('UsersAdapterRepository', () => {
  let repository: UsersAdapterRepository;
  let usersPgRepository: MockProxy<IGenericRepositoryInterface<UsersModel>>;
  let usersHtpasswdFileRepository: MockProxy<IUsersHtpasswdFileInterface>;
  let runnerRepository: MockProxy<IRunnerRepositoryInterface>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    usersPgRepository = mock<IGenericRepositoryInterface<UsersModel>>();
    usersHtpasswdFileRepository = mock<IUsersHtpasswdFileInterface>();
    runnerRepository = mock<IRunnerRepositoryInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProviderTokenEnum.USERS_PG_REPOSITORY,
          useValue: usersPgRepository,
        },
        {
          provide: ProviderTokenEnum.USERS_HTPASSWD_FILE_REPOSITORY,
          useValue: usersHtpasswdFileRepository,
        },
        {
          provide: ProviderTokenEnum.DOCKER_RUNNER_REPOSITORY,
          useValue: runnerRepository,
        },
        {
          provide: UsersAdapterRepository,
          inject: [
            ProviderTokenEnum.USERS_PG_REPOSITORY,
            ProviderTokenEnum.USERS_HTPASSWD_FILE_REPOSITORY,
            ProviderTokenEnum.DOCKER_RUNNER_REPOSITORY,
          ],
          useFactory: (
            usersPgRepository: IGenericRepositoryInterface<UsersModel>,
            usersSquidFileRepository: IUsersHtpasswdFileInterface,
            runnerRepository: IRunnerRepositoryInterface,
          ) => new UsersAdapterRepository(usersPgRepository, usersSquidFileRepository, runnerRepository),
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
    let outputRunnerModel1: RunnerModel;
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

      outputRunnerModel1 = new RunnerModel({
        id: identifierMock.generateId(),
        serial: 'nginx-serial',
        name: 'nginx-name',
        service: RunnerServiceEnum.NGINX,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketPort: 80,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });

      matchUpdateUser = new UpdateModel<UsersModel>(identifierMock.generateId(), outputUsersModel.clone());
    });

    it(`Should error add new user when check user exist on database`, async () => {
      usersPgRepository.getAll.mockResolvedValue([new UnknownException()]);
      usersHtpasswdFileRepository.isUserExist.mockResolvedValue([null, false]);
      runnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error add new user when check user exist on htpasswd`, async () => {
      usersPgRepository.getAll.mockResolvedValue([null, [], 0]);
      usersHtpasswdFileRepository.isUserExist.mockResolvedValue([new UnknownException()]);
      runnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersHtpasswdFileRepository.isUserExist).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.isUserExist).toBeCalledWith(inputUsersModel.username);
      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error add new user when check user exist on get runner info`, async () => {
      usersPgRepository.getAll.mockResolvedValue([null, [], 0]);
      usersHtpasswdFileRepository.isUserExist.mockResolvedValue([null, false]);
      runnerRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersHtpasswdFileRepository.isUserExist).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.isUserExist).toBeCalledWith(inputUsersModel.username);
      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error add new user when user exist on system`, async () => {
      usersPgRepository.getAll.mockResolvedValue([null, [outputUsersModel], 0]);
      usersHtpasswdFileRepository.isUserExist.mockResolvedValue([null, true]);
      runnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersHtpasswdFileRepository.isUserExist).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.isUserExist).toBeCalledWith(inputUsersModel.username);
      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(error).toBeInstanceOf(ExistException);
    });

    it(`Should error add new user when can't create on database`, async () => {
      usersPgRepository.getAll.mockResolvedValue([null, [], 0]);
      usersHtpasswdFileRepository.isUserExist.mockResolvedValue([null, false]);
      runnerRepository.getAll.mockResolvedValue([null, [], 0]);
      usersPgRepository.add.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersHtpasswdFileRepository.isUserExist).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.isUserExist).toBeCalledWith(inputUsersModel.username);
      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(usersPgRepository.add).toHaveBeenCalled();
      expect(usersPgRepository.add).toBeCalledWith(inputUsersModel);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error add new user when can't create on squid`, async () => {
      usersPgRepository.getAll.mockResolvedValue([null, [], 0]);
      usersHtpasswdFileRepository.isUserExist.mockResolvedValue([null, false]);
      runnerRepository.getAll.mockResolvedValue([null, [], 0]);
      usersPgRepository.add.mockResolvedValue([null, outputUsersModel]);
      usersHtpasswdFileRepository.add.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersHtpasswdFileRepository.isUserExist).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.isUserExist).toBeCalledWith(inputUsersModel.username);
      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(usersPgRepository.add).toHaveBeenCalled();
      expect(usersPgRepository.add).toBeCalledWith(inputUsersModel);
      expect(usersHtpasswdFileRepository.add).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.add).toBeCalledWith(inputUsersModel.username, inputUsersModel.password);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully add new user`, async () => {
      usersPgRepository.getAll.mockResolvedValue([null, [], 0]);
      usersHtpasswdFileRepository.isUserExist.mockResolvedValue([null, false]);
      runnerRepository.getAll.mockResolvedValue([null, [], 0]);
      usersPgRepository.add.mockResolvedValue([null, outputUsersModel]);
      usersHtpasswdFileRepository.add.mockResolvedValue([null]);

      const [error, result] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersHtpasswdFileRepository.isUserExist).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.isUserExist).toBeCalledWith(inputUsersModel.username);
      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(usersPgRepository.add).toHaveBeenCalled();
      expect(usersPgRepository.add).toBeCalledWith(inputUsersModel);
      expect(usersHtpasswdFileRepository.add).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.add).toBeCalledWith(inputUsersModel.username, inputUsersModel.password);
      expect(error).toBeNull();
      expect(result).toEqual(outputUsersModel);
    });

    it(`Should error add new user when update user if user exist on database but not exist on squid`, async () => {
      usersPgRepository.getAll.mockResolvedValue([null, [outputUsersModel], 1]);
      usersHtpasswdFileRepository.isUserExist.mockResolvedValue([null, false]);
      runnerRepository.getAll.mockResolvedValue([null, [], 0]);
      usersPgRepository.update.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersHtpasswdFileRepository.isUserExist).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.isUserExist).toBeCalledWith(inputUsersModel.username);
      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(usersPgRepository.update).toHaveBeenCalled();
      expect(usersPgRepository.update).toBeCalledWith(matchUpdateUser);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully add new user when update user if user exist on database but not exist on squid`, async () => {
      usersPgRepository.getAll.mockResolvedValue([null, [outputUsersModel], 1]);
      usersHtpasswdFileRepository.isUserExist.mockResolvedValue([null, false]);
      runnerRepository.getAll.mockResolvedValue([null, [], 0]);
      usersPgRepository.update.mockResolvedValue([null]);
      usersHtpasswdFileRepository.add.mockResolvedValue([null]);

      const [error, result] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersHtpasswdFileRepository.isUserExist).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.isUserExist).toBeCalledWith(inputUsersModel.username);
      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(usersPgRepository.update).toHaveBeenCalled();
      expect(usersPgRepository.update).toBeCalledWith(matchUpdateUser);
      expect(usersHtpasswdFileRepository.add).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.add).toBeCalledWith(inputUsersModel.username, inputUsersModel.password);
      expect(error).toBeNull();
      expect(result).toEqual(outputUsersModel);
    });

    it(`Should error add new user when duplicate record on database and can't update user on database`, async () => {
      usersPgRepository.getAll.mockResolvedValueOnce([null, [], 0]);
      usersHtpasswdFileRepository.isUserExist.mockResolvedValue([null, false]);
      runnerRepository.getAll.mockResolvedValue([null, [], 0]);
      usersPgRepository.add.mockResolvedValue([new ExistException()]);
      usersPgRepository.getAll.mockResolvedValueOnce([new UnknownException()]);

      const [error] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toBeCalledTimes(2);
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersHtpasswdFileRepository.isUserExist).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.isUserExist).toBeCalledWith(inputUsersModel.username);
      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(usersPgRepository.add).toHaveBeenCalled();
      expect(usersPgRepository.add).toBeCalledWith(inputUsersModel);
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[1][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error add new user when duplicate record on database and can't update user on database`, async () => {
      usersPgRepository.getAll.mockResolvedValueOnce([null, [], 0]);
      usersHtpasswdFileRepository.isUserExist.mockResolvedValue([null, false]);
      runnerRepository.getAll.mockResolvedValue([null, [], 0]);
      usersPgRepository.add.mockResolvedValue([new ExistException()]);
      usersPgRepository.getAll.mockResolvedValueOnce([null, [outputUsersModel], 1]);
      usersPgRepository.update.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toBeCalledTimes(2);
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersHtpasswdFileRepository.isUserExist).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.isUserExist).toBeCalledWith(inputUsersModel.username);
      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
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
      usersPgRepository.getAll.mockResolvedValueOnce([null, [], 0]);
      usersHtpasswdFileRepository.isUserExist.mockResolvedValue([null, false]);
      runnerRepository.getAll.mockResolvedValue([null, [], 0]);
      usersPgRepository.add.mockResolvedValue([new ExistException()]);
      usersPgRepository.getAll.mockResolvedValueOnce([null, [outputUsersModel], 1]);
      usersPgRepository.update.mockResolvedValue([null]);
      usersHtpasswdFileRepository.add.mockResolvedValue([null]);

      const [error, result] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toBeCalledTimes(2);
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersHtpasswdFileRepository.isUserExist).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.isUserExist).toBeCalledWith(inputUsersModel.username);
      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(usersPgRepository.add).toHaveBeenCalled();
      expect(usersPgRepository.add).toBeCalledWith(inputUsersModel);
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[1][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersPgRepository.update).toHaveBeenCalled();
      expect(usersPgRepository.update).toBeCalledWith(matchUpdateUser);
      expect(usersHtpasswdFileRepository.add).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.add).toBeCalledWith(inputUsersModel.username, inputUsersModel.password);
      expect(error).toBeNull();
      expect(result).toEqual(outputUsersModel);
    });

    it(`Should successfully add new user and reload runner if exist (Ignore reload runner if error happened)`, async () => {
      usersPgRepository.getAll.mockResolvedValue([null, [], 0]);
      usersHtpasswdFileRepository.isUserExist.mockResolvedValue([null, false]);
      runnerRepository.getAll.mockResolvedValue([null, [outputRunnerModel1], 1]);
      usersPgRepository.add.mockResolvedValue([null, outputUsersModel]);
      usersHtpasswdFileRepository.add.mockResolvedValue([null]);
      runnerRepository.reload.mockResolvedValue([new UnknownException()]);

      const [error, result] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersHtpasswdFileRepository.isUserExist).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.isUserExist).toBeCalledWith(inputUsersModel.username);
      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(usersPgRepository.add).toHaveBeenCalled();
      expect(usersPgRepository.add).toBeCalledWith(inputUsersModel);
      expect(usersHtpasswdFileRepository.add).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.add).toBeCalledWith(inputUsersModel.username, inputUsersModel.password);
      expect(runnerRepository.reload).toHaveBeenCalled();
      expect(runnerRepository.reload).toHaveBeenCalledWith(outputRunnerModel1.id);
      expect(error).toBeNull();
      expect(result).toEqual(outputUsersModel);
    });

    it(`Should successfully add new user and reload runner if exist`, async () => {
      usersPgRepository.getAll.mockResolvedValue([null, [], 0]);
      usersHtpasswdFileRepository.isUserExist.mockResolvedValue([null, false]);
      runnerRepository.getAll.mockResolvedValue([null, [outputRunnerModel1], 1]);
      usersPgRepository.add.mockResolvedValue([null, outputUsersModel]);
      usersHtpasswdFileRepository.add.mockResolvedValue([null]);
      runnerRepository.reload.mockResolvedValue([null]);

      const [error, result] = await repository.add(inputUsersModel);

      expect(usersPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>>usersPgRepository.getAll.mock.calls[0][0]).getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(usersHtpasswdFileRepository.isUserExist).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.isUserExist).toBeCalledWith(inputUsersModel.username);
      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(usersPgRepository.add).toHaveBeenCalled();
      expect(usersPgRepository.add).toBeCalledWith(inputUsersModel);
      expect(usersHtpasswdFileRepository.add).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.add).toBeCalledWith(inputUsersModel.username, inputUsersModel.password);
      expect(runnerRepository.reload).toHaveBeenCalled();
      expect(runnerRepository.reload).toHaveBeenCalledWith(outputRunnerModel1.id);
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
      usersPgRepository.getAll.mockResolvedValue([null, [outputUsersModel], 1]);

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

  describe(`Remove by id`, () => {
    let inputId: string;
    let outputRunnerModel1: RunnerModel;
    let outputUsersModel: UsersModel;

    beforeEach(() => {
      inputId = identifierMock.generateId();

      outputRunnerModel1 = new RunnerModel({
        id: identifierMock.generateId(),
        serial: 'nginx-serial',
        name: 'nginx-name',
        service: RunnerServiceEnum.NGINX,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketPort: 80,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });

      outputUsersModel = new UsersModel({
        id: identifierMock.generateId(),
        username: 'my-user',
        password: 'my-password',
        role: UserRoleEnum.USER,
        isEnable: true,
        insertDate: new Date(),
      });
    });

    it(`Should error remove by id when get runner info`, async () => {
      runnerRepository.getAll.mockResolvedValue([new UnknownException()]);
      usersPgRepository.getById.mockResolvedValue([null, null]);

      const [error] = await repository.remove(inputId);

      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(usersPgRepository.getById).toHaveBeenCalled();
      expect(usersPgRepository.getById).toHaveBeenCalledWith(inputId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error remove by id when get user info`, async () => {
      runnerRepository.getAll.mockResolvedValue([null, [], 0]);
      usersPgRepository.getById.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.remove(inputId);

      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(usersPgRepository.getById).toHaveBeenCalled();
      expect(usersPgRepository.getById).toHaveBeenCalledWith(inputId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error remove by id when remove in database`, async () => {
      runnerRepository.getAll.mockResolvedValue([null, [], 0]);
      usersPgRepository.getById.mockResolvedValue([null, outputUsersModel]);
      usersPgRepository.remove.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.remove(inputId);

      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(usersPgRepository.getById).toHaveBeenCalled();
      expect(usersPgRepository.getById).toHaveBeenCalledWith(inputId);
      expect(usersPgRepository.remove).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error remove by id when remove in file`, async () => {
      runnerRepository.getAll.mockResolvedValue([null, [], 0]);
      usersPgRepository.getById.mockResolvedValue([null, outputUsersModel]);
      usersPgRepository.remove.mockResolvedValue([null, null]);
      usersHtpasswdFileRepository.remove.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.remove(inputId);

      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(usersPgRepository.getById).toHaveBeenCalled();
      expect(usersPgRepository.getById).toHaveBeenCalledWith(inputId);
      expect(usersPgRepository.remove).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully remove get by id`, async () => {
      runnerRepository.getAll.mockResolvedValue([null, [], 0]);
      usersPgRepository.getById.mockResolvedValue([null, outputUsersModel]);
      usersPgRepository.remove.mockResolvedValue([null]);
      usersHtpasswdFileRepository.remove.mockResolvedValue([null, null]);

      const [error] = await repository.remove(inputId);

      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(usersPgRepository.getById).toHaveBeenCalled();
      expect(usersPgRepository.getById).toHaveBeenCalledWith(inputId);
      expect(usersPgRepository.remove).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.remove).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.remove).toHaveBeenCalledWith(outputUsersModel.username);
      expect(error).toBeNull();
    });

    it(`Should successfully remove get by id and reload runner if exist (Ignore reload runner if error happened)`, async () => {
      runnerRepository.getAll.mockResolvedValue([null, [outputRunnerModel1], 1]);
      usersPgRepository.getById.mockResolvedValue([null, outputUsersModel]);
      usersPgRepository.remove.mockResolvedValue([null]);
      usersHtpasswdFileRepository.remove.mockResolvedValue([null, null]);
      runnerRepository.reload.mockResolvedValue([null]);

      const [error] = await repository.remove(inputId);

      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(usersPgRepository.getById).toHaveBeenCalled();
      expect(usersPgRepository.getById).toHaveBeenCalledWith(inputId);
      expect(usersPgRepository.remove).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.remove).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.remove).toHaveBeenCalledWith(outputUsersModel.username);
      expect(runnerRepository.reload).toHaveBeenCalled();
      expect(runnerRepository.reload).toHaveBeenCalledWith(outputRunnerModel1.id);
      expect(error).toBeNull();
    });

    it(`Should successfully remove get by id and reload runner if exist`, async () => {
      runnerRepository.getAll.mockResolvedValue([null, [outputRunnerModel1], 1]);
      usersPgRepository.getById.mockResolvedValue([null, outputUsersModel]);
      usersPgRepository.remove.mockResolvedValue([null]);
      usersHtpasswdFileRepository.remove.mockResolvedValue([null, null]);
      runnerRepository.reload.mockResolvedValue([null]);

      const [error] = await repository.remove(inputId);

      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(usersPgRepository.getById).toHaveBeenCalled();
      expect(usersPgRepository.getById).toHaveBeenCalledWith(inputId);
      expect(usersPgRepository.remove).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.remove).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.remove).toHaveBeenCalledWith(outputUsersModel.username);
      expect(runnerRepository.reload).toHaveBeenCalled();
      expect(runnerRepository.reload).toHaveBeenCalledWith(outputRunnerModel1.id);
      expect(error).toBeNull();
    });
  });

  describe(`Update user`, () => {
    let inputUpdateModel: UpdateModel<UsersModel>;
    let outputRunnerModel1: RunnerModel;
    let outputUsersModel: UsersModel;

    beforeEach(() => {
      inputUpdateModel = new UpdateModel<UsersModel>(identifierMock.generateId(), {
        password: 'new-password',
        isEnable: true,
      });

      outputRunnerModel1 = new RunnerModel({
        id: identifierMock.generateId(),
        serial: 'nginx-serial',
        name: 'nginx-name',
        service: RunnerServiceEnum.NGINX,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketPort: 80,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });

      outputUsersModel = new UsersModel({
        id: identifierMock.generateId(),
        username: 'my-user',
        password: 'my-password',
        role: UserRoleEnum.USER,
        isEnable: true,
        insertDate: new Date(),
      });
    });

    it(`Should error update by id when get runner info`, async () => {
      runnerRepository.getAll.mockResolvedValue([new UnknownException()]);
      usersPgRepository.getById.mockResolvedValue([null, null]);

      const [error] = await repository.update(inputUpdateModel);

      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(usersPgRepository.getById).toHaveBeenCalled();
      expect(usersPgRepository.getById).toHaveBeenCalledWith(inputUpdateModel.id);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error update by id when get user info`, async () => {
      runnerRepository.getAll.mockResolvedValue([null, [], 0]);
      usersPgRepository.getById.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.update(inputUpdateModel);

      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(usersPgRepository.getById).toHaveBeenCalled();
      expect(usersPgRepository.getById).toHaveBeenCalledWith(inputUpdateModel.id);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error update by id when update in database`, async () => {
      runnerRepository.getAll.mockResolvedValue([null, [], 0]);
      usersPgRepository.getById.mockResolvedValue([null, outputUsersModel]);
      usersPgRepository.update.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.update(inputUpdateModel);

      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect(usersPgRepository.getById).toHaveBeenCalled();
      expect(usersPgRepository.getById).toHaveBeenCalledWith(inputUpdateModel.id);
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(usersPgRepository.update).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error update by id when update in file`, async () => {
      runnerRepository.getAll.mockResolvedValue([null, [], 0]);
      usersPgRepository.getById.mockResolvedValue([null, outputUsersModel]);
      usersPgRepository.update.mockResolvedValue([null, null]);
      usersHtpasswdFileRepository.update.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.update(inputUpdateModel);

      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect(usersPgRepository.getById).toHaveBeenCalled();
      expect(usersPgRepository.getById).toHaveBeenCalledWith(inputUpdateModel.id);
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(usersPgRepository.update).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.update).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.update).toHaveBeenCalledWith(outputUsersModel.username, inputUpdateModel.getModel().password);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully update get by id`, async () => {
      runnerRepository.getAll.mockResolvedValue([null, [], 0]);
      usersPgRepository.getById.mockResolvedValue([null, outputUsersModel]);
      usersPgRepository.update.mockResolvedValue([null, null]);
      usersHtpasswdFileRepository.update.mockResolvedValue([null, null]);

      const [error] = await repository.update(inputUpdateModel);

      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect(usersPgRepository.getById).toHaveBeenCalled();
      expect(usersPgRepository.getById).toHaveBeenCalledWith(inputUpdateModel.id);
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(usersPgRepository.update).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.update).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.update).toHaveBeenCalledWith(outputUsersModel.username, inputUpdateModel.getModel().password);
      expect(error).toBeNull();
    });

    it(`Should successfully update get by id and reload runner if exist (Ignore reload runner if error happened)`, async () => {
      runnerRepository.getAll.mockResolvedValue([null, [outputRunnerModel1], 1]);
      usersPgRepository.getById.mockResolvedValue([null, outputUsersModel]);
      usersPgRepository.update.mockResolvedValue([null, null]);
      usersHtpasswdFileRepository.update.mockResolvedValue([null, null]);
      runnerRepository.reload.mockResolvedValue([null]);

      const [error] = await repository.update(inputUpdateModel);

      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect(usersPgRepository.getById).toHaveBeenCalled();
      expect(usersPgRepository.getById).toHaveBeenCalledWith(inputUpdateModel.id);
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(usersPgRepository.update).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.update).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.update).toHaveBeenCalledWith(outputUsersModel.username, inputUpdateModel.getModel().password);
      expect(runnerRepository.reload).toHaveBeenCalled();
      expect(runnerRepository.reload).toHaveBeenCalledWith(outputRunnerModel1.id);
      expect(error).toBeNull();
    });

    it(`Should successfully update get by id and reload runner if exist`, async () => {
      runnerRepository.getAll.mockResolvedValue([null, [outputRunnerModel1], 1]);
      usersPgRepository.getById.mockResolvedValue([null, outputUsersModel]);
      usersPgRepository.update.mockResolvedValue([null, null]);
      usersHtpasswdFileRepository.update.mockResolvedValue([null, null]);
      runnerRepository.reload.mockResolvedValue([null]);

      const [error] = await repository.update(inputUpdateModel);

      expect(runnerRepository.getAll).toHaveBeenCalled();
      expect(usersPgRepository.getById).toHaveBeenCalled();
      expect(usersPgRepository.getById).toHaveBeenCalledWith(inputUpdateModel.id);
      expect((<FilterModel<RunnerModel>><unknown>runnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.NGINX,
      });
      expect(usersPgRepository.update).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.update).toHaveBeenCalled();
      expect(usersHtpasswdFileRepository.update).toHaveBeenCalledWith(outputUsersModel.username, inputUpdateModel.getModel().password);
      expect(runnerRepository.reload).toHaveBeenCalled();
      expect(runnerRepository.reload).toHaveBeenCalledWith(outputRunnerModel1.id);
      expect(error).toBeNull();
    });
  });
});
