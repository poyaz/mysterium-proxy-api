import {Test, TestingModule} from '@nestjs/testing';
import {UsersService} from './users.service';
import {mock, MockProxy} from 'jest-mock-extended';
import {IGenericRepositoryInterface} from '../interface/i-generic-repository.interface';
import {IIdentifier} from '../interface/i-identifier.interface';
import {UsersModel} from '../model/users.model';
import {UnknownException} from '../exception/unknown.exception';
import {UserRoleEnum} from '../enum/user-role.enum';
import {FilterModel} from '../model/filter.model';
import {NotFoundUserException} from '../exception/not-found-user.exception';
import {UpdateModel} from '../model/update.model';
import {ProviderTokenEnum} from '../enum/provider-token.enum';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: MockProxy<IGenericRepositoryInterface<UsersModel>>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    usersRepository = mock<IGenericRepositoryInterface<UsersModel>>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProviderTokenEnum.USER_PG_REPOSITORY,
          useValue: usersRepository,
        },
        {
          provide: UsersService,
          inject: [ProviderTokenEnum.USER_PG_REPOSITORY],
          useFactory: (usersRepository: IGenericRepositoryInterface<UsersModel>) =>
            new UsersService(usersRepository),
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it(`Should be defined`, () => {
    expect(service).toBeDefined();
  });

  describe(`Create user`, () => {
    let inputCreateUserModel: UsersModel;
    let inputCreateUserOptionalModel: UsersModel;
    let outputCreateUserModel: UsersModel;

    beforeEach(() => {
      inputCreateUserModel = new UsersModel({
        id: '',
        username: 'my-user',
        password: 'my-password',
        role: UserRoleEnum.USER,
        isEnable: true,
        insertDate: new Date(),
      });

      inputCreateUserOptionalModel = new UsersModel({
        id: '',
        username: 'my-user',
        password: 'my-password',
        insertDate: new Date(),
      });

      outputCreateUserModel = new UsersModel({
        id: identifierMock.generateId(),
        username: 'my-user',
        password: 'my-password',
        role: UserRoleEnum.USER,
        isEnable: true,
        insertDate: new Date(),
      });
    });

    it(`Should error create user`, async () => {
      usersRepository.add.mockResolvedValue([new UnknownException()]);

      const [error] = await service.create(inputCreateUserModel);

      expect(usersRepository.add).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully create user`, async () => {
      usersRepository.add.mockResolvedValue([null, outputCreateUserModel]);

      const [error, result] = await service.create(inputCreateUserModel);

      expect(usersRepository.add).toHaveBeenCalled();
      expect(error).toBeNull();
      expect(result).toMatchObject<UsersModel>({
        id: outputCreateUserModel.id,
        username: outputCreateUserModel.username,
        password: outputCreateUserModel.password,
        isEnable: outputCreateUserModel.isEnable,
        role: outputCreateUserModel.role,
        insertDate: outputCreateUserModel.insertDate,
      });
    });

    it(`Should successfully create user with optional`, async () => {
      usersRepository.add.mockResolvedValue([null, outputCreateUserModel]);

      const [error, result] = await service.create(inputCreateUserOptionalModel);

      expect(usersRepository.add).toHaveBeenCalled();
      expect(usersRepository.add).toBeCalledWith(expect.objectContaining<UsersModel>({
        id: inputCreateUserOptionalModel.id,
        username: inputCreateUserOptionalModel.username,
        password: inputCreateUserOptionalModel.password,
        isEnable: true,
        role: UserRoleEnum.USER,
        insertDate: inputCreateUserOptionalModel.insertDate,
      }));
      expect(error).toBeNull();
      expect(result).toMatchObject<UsersModel>({
        id: outputCreateUserModel.id,
        username: outputCreateUserModel.username,
        password: outputCreateUserModel.password,
        isEnable: outputCreateUserModel.isEnable,
        role: outputCreateUserModel.role,
        insertDate: outputCreateUserModel.insertDate,
      });
    });
  });

  describe(`Find all users`, () => {
    let inputFilterModel: FilterModel<UsersModel>;
    let outputFindUserModel: UsersModel;

    beforeEach(() => {
      inputFilterModel = new FilterModel<UsersModel>();
      inputFilterModel.addCondition({$opr: 'eq', username: 'my-username'});

      outputFindUserModel = new UsersModel({
        id: identifierMock.generateId(),
        username: 'my-user',
        password: 'my-password',
        role: UserRoleEnum.USER,
        isEnable: true,
        insertDate: new Date(),
      });
    });

    it(`Should error find all users`, async () => {
      usersRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.findAll();

      expect(usersRepository.getAll).toHaveBeenCalled();
      expect(usersRepository.getAll).toBeCalledWith(undefined);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully find all users without filter and return empty records`, async () => {
      usersRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result, count] = await service.findAll();

      expect(usersRepository.getAll).toHaveBeenCalled();
      expect(usersRepository.getAll).toBeCalledWith(undefined);
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
      expect(count).toEqual(0);
    });

    it(`Should successfully find all users with filter and return empty records`, async () => {
      usersRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result, count] = await service.findAll(inputFilterModel);

      expect(usersRepository.getAll).toHaveBeenCalled();
      expect(usersRepository.getAll).toBeCalledWith(inputFilterModel);
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
      expect(count).toEqual(0);
    });

    it(`Should successfully find all users`, async () => {
      usersRepository.getAll.mockResolvedValue([null, [outputFindUserModel], 1]);

      const [error, result, count] = await service.findAll();

      expect(usersRepository.getAll).toHaveBeenCalled();
      expect(usersRepository.getAll).toBeCalledWith(undefined);
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect<UsersModel>(result[0]).toMatchObject({
        id: outputFindUserModel.id,
        username: outputFindUserModel.username,
        password: outputFindUserModel.password,
        isEnable: outputFindUserModel.isEnable,
        role: outputFindUserModel.role,
        insertDate: outputFindUserModel.insertDate,
      });
      expect(count).toEqual(1);
    });
  });

  describe(`Find one user`, () => {
    let outputFindUserModel: UsersModel;

    beforeEach(() => {
      outputFindUserModel = new UsersModel({
        id: identifierMock.generateId(),
        username: 'my-user',
        password: 'my-password',
        role: UserRoleEnum.USER,
        isEnable: true,
        insertDate: new Date(),
      });
    });

    it(`Should error find one user`, async () => {
      const userId = identifierMock.generateId();
      usersRepository.getById.mockResolvedValue([new UnknownException()]);

      const [error] = await service.findOne(userId);

      expect(usersRepository.getById).toHaveBeenCalled();
      expect(usersRepository.getById).toBeCalledWith(userId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error find one user`, async () => {
      const userId = identifierMock.generateId();
      usersRepository.getById.mockResolvedValue([new UnknownException()]);

      const [error] = await service.findOne(userId);

      expect(usersRepository.getById).toHaveBeenCalled();
      expect(usersRepository.getById).toBeCalledWith(userId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error find one user when user not found`, async () => {
      const userId = identifierMock.generateId();
      usersRepository.getById.mockResolvedValue([null, null]);

      const [error] = await service.findOne(userId);

      expect(usersRepository.getById).toHaveBeenCalled();
      expect(usersRepository.getById).toBeCalledWith(userId);
      expect(error).toBeInstanceOf(NotFoundUserException);
    });

    it(`Should successfully find one user`, async () => {
      const userId = identifierMock.generateId();
      usersRepository.getById.mockResolvedValue([null, outputFindUserModel]);

      const [error, result] = await service.findOne(userId);

      expect(usersRepository.getById).toHaveBeenCalled();
      expect(usersRepository.getById).toBeCalledWith(userId);
      expect(error).toBeNull();
      expect(result).toMatchObject<UsersModel>({
        id: outputFindUserModel.id,
        username: outputFindUserModel.username,
        password: outputFindUserModel.password,
        isEnable: outputFindUserModel.isEnable,
        role: outputFindUserModel.role,
        insertDate: outputFindUserModel.insertDate,
      });
    });
  });

  describe(`Update user`, () => {
    let findOneMock;
    let inputUpdateModel: UpdateModel<UsersModel>;

    beforeEach(() => {
      findOneMock = service.findOne = jest.fn();

      inputUpdateModel = new UpdateModel<UsersModel>(identifierMock.generateId(), {isEnable: true});
    });

    afterEach(() => {
      findOneMock.mockClear();
    });

    it(`Should error update users when trying find user`, async () => {
      findOneMock.mockResolvedValue([new UnknownException()]);

      const [error] = await service.update(inputUpdateModel);

      expect(findOneMock).toHaveBeenCalled();
      expect(findOneMock).toBeCalledWith(inputUpdateModel.id);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error update users`, async () => {
      findOneMock.mockResolvedValue([null]);
      usersRepository.update.mockResolvedValue([new UnknownException()]);

      const [error] = await service.update(inputUpdateModel);

      expect(findOneMock).toHaveBeenCalled();
      expect(findOneMock).toBeCalledWith(inputUpdateModel.id);
      expect(usersRepository.update).toHaveBeenCalled();
      expect(usersRepository.update).toBeCalledWith(inputUpdateModel);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully update users`, async () => {
      findOneMock.mockResolvedValue([null]);
      usersRepository.update.mockResolvedValue([null]);

      const [error] = await service.update(inputUpdateModel);

      expect(findOneMock).toHaveBeenCalled();
      expect(findOneMock).toBeCalledWith(inputUpdateModel.id);
      expect(usersRepository.update).toHaveBeenCalled();
      expect(usersRepository.update).toBeCalledWith(inputUpdateModel);
      expect(error).toBeNull();
    });
  });

  describe(`Delete user`, () => {
    let findOneMock;

    beforeEach(() => {
      findOneMock = service.findOne = jest.fn();
    });

    afterEach(() => {
      findOneMock.mockClear();
    });

    it(`Should error delete user when trying find user`, async () => {
      const inputId = identifierMock.generateId();
      findOneMock.mockResolvedValue([new UnknownException()]);

      const [error] = await service.remove(inputId);

      expect(findOneMock).toHaveBeenCalled();
      expect(findOneMock).toBeCalledWith(inputId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error delete user`, async () => {
      const inputId = identifierMock.generateId();
      findOneMock.mockResolvedValue([null]);
      usersRepository.remove.mockResolvedValue([new UnknownException()]);

      const [error] = await service.remove(inputId);

      expect(findOneMock).toHaveBeenCalled();
      expect(findOneMock).toBeCalledWith(inputId);
      expect(usersRepository.remove).toHaveBeenCalled();
      expect(usersRepository.remove).toBeCalledWith(inputId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully update users`, async () => {
      const inputId = identifierMock.generateId();
      findOneMock.mockResolvedValue([null]);
      usersRepository.remove.mockResolvedValue([null]);

      const [error] = await service.remove(inputId);

      expect(findOneMock).toHaveBeenCalled();
      expect(findOneMock).toBeCalledWith(inputId);
      expect(usersRepository.remove).toHaveBeenCalled();
      expect(usersRepository.remove).toBeCalledWith(inputId);
      expect(error).toBeNull();
    });
  });
});
