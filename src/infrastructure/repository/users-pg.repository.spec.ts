import {Test, TestingModule} from '@nestjs/testing';
import {UsersPgRepository} from './users-pg.repository';
import {mock, MockProxy} from 'jest-mock-extended';
import {Repository} from 'typeorm';
import {UsersEntity} from '../entity/users.entity';
import {getRepositoryToken} from '@nestjs/typeorm';
import {I_IDENTIFIER, IIdentifier} from '../../core/interface/i-identifier.interface';
import {UsersModel} from '../../core/model/users.model';
import {UserRoleEnum} from '../../core/enum/user-role.enum';
import {RepositoryException} from '../../core/exception/repository.exception';
import {I_DATE_TIME, IDateTime} from '../../core/interface/i-date-time.interface';
import {User} from '../../../dist/src/users/entities/user.entity';
import {FilterModel} from '../../core/model/filter.model';

describe('UsersPgRepositoryService', () => {
  let repository: UsersPgRepository;
  let userDb: MockProxy<Repository<UsersEntity>>;
  let identifierMock: MockProxy<IIdentifier>;
  let dateTimeMock: MockProxy<IDateTime>;
  const defaultDate = new Date('2020-01-01');

  beforeEach(async () => {
    userDb = mock<Repository<UsersEntity>>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    dateTimeMock = mock<IDateTime>();
    dateTimeMock.gregorianCurrentDateWithTimezone.mockReturnValue(defaultDate);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersPgRepository,
        {
          provide: I_IDENTIFIER.DEFAULT,
          useValue: identifierMock,
        },
        {
          provide: I_DATE_TIME.DEFAULT,
          useValue: dateTimeMock,
        },
        {
          provide: getRepositoryToken(UsersEntity),
          useValue: userDb,
        },
      ],
    }).compile();

    repository = module.get<UsersPgRepository>(UsersPgRepository);
  });

  it(`should be defined`, () => {
    expect(repository).toBeDefined();
  });

  describe(`Create user`, () => {
    let inputUsersModel: UsersModel;

    beforeEach(() => {
      inputUsersModel = new UsersModel({
        id: '',
        username: 'my-user',
        password: 'my-password',
        role: UserRoleEnum.USER,
        isEnable: true,
        insertDate: new Date(),
      });
    });

    it(`Should error create user`, async () => {
      const executeError: never = new Error('Error in create on database') as never;
      userDb.create.mockRejectedValue(executeError);

      const [error] = await repository.add(inputUsersModel);

      expect(identifierMock.generateId).toHaveBeenCalled();
      expect(dateTimeMock.gregorianCurrentDateWithTimezone).toHaveBeenCalled();
      expect(userDb.create).toHaveBeenCalled();
      expect(userDb.create).toBeCalledWith({
        id: identifierMock.generateId(),
        username: inputUsersModel.username,
        password: inputUsersModel.password,
        role: inputUsersModel.role,
        isEnable: inputUsersModel.isEnable,
        insertDate: defaultDate,
      });
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(executeError);
    });

    it(`Should successfully create user`, async () => {
      const outputUsersEntity = new UsersEntity();
      outputUsersEntity.id = identifierMock.generateId();
      outputUsersEntity.username = inputUsersModel.username;
      outputUsersEntity.password = inputUsersModel.password;
      outputUsersEntity.role = inputUsersModel.role;
      outputUsersEntity.isEnable = inputUsersModel.isEnable;
      outputUsersEntity.insertDate = defaultDate;
      outputUsersEntity.updateDate = null;
      userDb.create.mockResolvedValue(outputUsersEntity as never);

      const [error, result] = await repository.add(inputUsersModel);

      expect(identifierMock.generateId).toHaveBeenCalled();
      expect(dateTimeMock.gregorianCurrentDateWithTimezone).toHaveBeenCalled();
      expect(userDb.create).toHaveBeenCalled();
      expect(userDb.create).toBeCalledWith({
        id: identifierMock.generateId(),
        username: inputUsersModel.username,
        password: inputUsersModel.password,
        role: inputUsersModel.role,
        isEnable: inputUsersModel.isEnable,
        insertDate: defaultDate,
      });
      expect(error).toBeNull();
      expect(result).toMatchObject<UsersModel>({
        id: identifierMock.generateId(),
        username: inputUsersModel.username,
        password: inputUsersModel.password,
        role: inputUsersModel.role,
        isEnable: inputUsersModel.isEnable,
        insertDate: defaultDate,
        updateDate: null,
      });
    });
  });

  describe(`Get all users`, () => {
    let outputUsersEntity: UsersEntity;
    let inputUsernameFilterModel: FilterModel;
    let inputFilterModel: FilterModel;

    beforeEach(() => {
      outputUsersEntity = new UsersEntity();
      outputUsersEntity.id = identifierMock.generateId();
      outputUsersEntity.username = 'my-user';
      outputUsersEntity.password = 'my-password';
      outputUsersEntity.role = UserRoleEnum.USER;
      outputUsersEntity.isEnable = true;
      outputUsersEntity.insertDate = defaultDate;
      outputUsersEntity.updateDate = null;

      inputUsernameFilterModel = new FilterModel();
      inputUsernameFilterModel.push({name: 'username', condition: 'eq', value: 'my-user'});

      inputFilterModel = new FilterModel();
      inputFilterModel.push({name: 'username', condition: 'eq', value: 'my-user'});
      inputFilterModel.push({name: 'isEnable', condition: 'eq', value: true});
    });

    it(`Should error get all users (without filter)`, async () => {
      const executeError: never = new Error('Error in create on database') as never;
      userDb.find.mockRejectedValue(executeError);

      const [error] = await repository.getAll();

      expect(userDb.find).toHaveBeenCalled();
      expect(userDb.find.mock.calls[0][0]).toEqual({});
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(executeError);
    });

    it(`Should error get all users (with filter)`, async () => {
      const executeError: never = new Error('Error in create on database') as never;
      userDb.find.mockRejectedValue(executeError);

      const [error] = await repository.getAll<FilterModel>(inputUsernameFilterModel);

      expect(userDb.find).toHaveBeenCalled();
      expect(userDb.find).toBeCalledWith(expect.objectContaining({
        where: [{username: inputUsernameFilterModel[0].value}],
      }));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(executeError);
    });

    it(`Should successfully get all users (without filter) and return empty records`, async () => {
      userDb.find.mockResolvedValue([]);

      const [error, result] = await repository.getAll();

      expect(userDb.find).toHaveBeenCalled();
      expect(userDb.find.mock.calls[0][0]).toEqual({});
      expect(error).toBeNull();
      expect(result.length).toEqual(0);
    });

    it(`Should successfully get all users (without filter) and return records`, async () => {
      userDb.find.mockResolvedValue([outputUsersEntity]);

      const [error, result] = await repository.getAll();

      expect(userDb.find).toHaveBeenCalled();
      expect(userDb.find.mock.calls[0][0]).toEqual({});
      expect(error).toBeNull();
      expect(result.length).toEqual(1);
      expect(result[0]).toMatchObject<UsersModel>({
        id: identifierMock.generateId(),
        username: outputUsersEntity.username,
        password: outputUsersEntity.password,
        role: UserRoleEnum.USER,
        isEnable: outputUsersEntity.isEnable,
        insertDate: defaultDate,
        updateDate: null,
      });
    });

    it(`Should successfully get all users (with filter) and return records`, async () => {
      userDb.find.mockResolvedValue([outputUsersEntity]);

      const [error, result] = await repository.getAll(inputFilterModel);

      expect(userDb.find).toHaveBeenCalled();
      expect(userDb.find).toBeCalledWith(expect.objectContaining({
        where: [{username: inputFilterModel[0].value}, {isEnable: inputFilterModel[1].value}],
      }));
      expect(error).toBeNull();
      expect(result.length).toEqual(1);
      expect(result[0]).toMatchObject<UsersModel>({
        id: identifierMock.generateId(),
        username: outputUsersEntity.username,
        password: outputUsersEntity.password,
        role: UserRoleEnum.USER,
        isEnable: outputUsersEntity.isEnable,
        insertDate: defaultDate,
        updateDate: null,
      });
    });
  });

  describe(`Get user by id`, () => {
    let outputUsersEntity: UsersEntity;

    beforeEach(() => {
      outputUsersEntity = new UsersEntity();
      outputUsersEntity.id = identifierMock.generateId();
      outputUsersEntity.username = 'my-user';
      outputUsersEntity.password = 'my-password';
      outputUsersEntity.role = UserRoleEnum.USER;
      outputUsersEntity.isEnable = true;
      outputUsersEntity.insertDate = defaultDate;
      outputUsersEntity.updateDate = null;
    });

    it(`Should error get user by id`, async () => {
      const inputId = identifierMock.generateId();
      const executeError: never = new Error('Error in create on database') as never;
      userDb.findOneBy.mockRejectedValue(executeError);

      const [error] = await repository.getById(inputId);

      expect(userDb.findOneBy).toHaveBeenCalled();
      expect(userDb.findOneBy).toBeCalledWith({id: inputId});
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(executeError);
    });

    it(`Should successfully get user by id but can't find and return null`, async () => {
      const inputId = identifierMock.generateId();
      userDb.findOneBy.mockResolvedValue(null);

      const [error, result] = await repository.getById(inputId);

      expect(userDb.findOneBy).toHaveBeenCalled();
      expect(userDb.findOneBy).toBeCalledWith({id: inputId});
      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it(`Should successfully get user by id`, async () => {
      const inputId = identifierMock.generateId();
      userDb.findOneBy.mockResolvedValue(outputUsersEntity);

      const [error, result] = await repository.getById(inputId);

      expect(userDb.findOneBy).toHaveBeenCalled();
      expect(userDb.findOneBy).toBeCalledWith({id: inputId});
      expect(error).toBeNull();
      expect(result).toMatchObject<UsersModel>({
        id: identifierMock.generateId(),
        username: outputUsersEntity.username,
        password: outputUsersEntity.password,
        role: UserRoleEnum.USER,
        isEnable: outputUsersEntity.isEnable,
        insertDate: defaultDate,
        updateDate: null,
      });
    });
  });

  describe(`Remove user by id`, () => {
    let outputUsersEntity: UsersEntity;
    let entityRemoveMock;

    beforeEach(() => {
      outputUsersEntity = new UsersEntity();
      outputUsersEntity.id = identifierMock.generateId();
      outputUsersEntity.username = 'my-user';
      outputUsersEntity.password = 'my-password';
      outputUsersEntity.role = UserRoleEnum.USER;
      outputUsersEntity.isEnable = true;
      outputUsersEntity.insertDate = defaultDate;
      outputUsersEntity.updateDate = null;
      entityRemoveMock = outputUsersEntity.softRemove = jest.fn();
    });

    afterEach(() => {
      entityRemoveMock.mockClear();
    });

    it(`Should error remove when fetch user by id`, async () => {
      const inputId = identifierMock.generateId();
      const executeError: never = new Error('Error in create on database') as never;
      userDb.findOneBy.mockRejectedValue(executeError);

      const [error] = await repository.remove(inputId);

      expect(userDb.findOneBy).toHaveBeenCalled();
      expect(userDb.findOneBy).toBeCalledWith({id: inputId});
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(executeError);
    });

    it(`Should successfully escape remove when user not found`, async () => {
      const inputId = identifierMock.generateId();
      userDb.findOneBy.mockResolvedValue(null);

      const [error] = await repository.remove(inputId);

      expect(userDb.findOneBy).toHaveBeenCalled();
      expect(userDb.findOneBy).toBeCalledWith({id: inputId});
      expect(entityRemoveMock).not.toHaveBeenCalled();
      expect(error).toBeNull();
    });

    it(`Should error remove by id`, async () => {
      const inputId = identifierMock.generateId();
      userDb.findOneBy.mockResolvedValue(outputUsersEntity);
      const executeError: never = new Error('Error in create on database') as never;
      entityRemoveMock.mockRejectedValue(executeError);

      const [error] = await repository.remove(inputId);

      expect(userDb.findOneBy).toHaveBeenCalled();
      expect(userDb.findOneBy).toBeCalledWith({id: inputId});
      expect(entityRemoveMock).toHaveBeenCalled();
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(executeError);
    });

    it(`Should successfully remove by id`, async () => {
      const inputId = identifierMock.generateId();
      userDb.findOneBy.mockResolvedValue(outputUsersEntity);
      entityRemoveMock.mockResolvedValue();

      const [error] = await repository.remove(inputId);

      expect(userDb.findOneBy).toHaveBeenCalled();
      expect(userDb.findOneBy).toBeCalledWith({id: inputId});
      expect(entityRemoveMock).toHaveBeenCalled();
      expect(error).toBeNull();
    });
  });
});
