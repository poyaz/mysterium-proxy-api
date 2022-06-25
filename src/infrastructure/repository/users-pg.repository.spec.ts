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
});
