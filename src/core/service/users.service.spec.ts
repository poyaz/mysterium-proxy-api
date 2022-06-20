import {Test, TestingModule} from '@nestjs/testing';
import {UsersService} from './users.service';
import {mock, MockProxy} from 'jest-mock-extended';
import {IGenericRepositoryInterface} from '../interface/i-generic-repository.interface';
import {IIdentifier} from '../interface/i-identifier.interface';
import {UsersModel} from '../model/users.model';
import {InterfaceRepositoryEnum} from '../enum/interface-repository.enum';
import {UnknownException} from '../exception/unknown.exception';
import {UserRoleEnum} from '../enum/user-role.enum';
import {FilterModel} from '../model/filter.model';

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
        UsersService,
        {
          provide: InterfaceRepositoryEnum.USER_PG_REPOSITORY,
          useValue: usersRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it(`Should be defined`, () => {
    expect(service).toBeDefined();
  });

  describe(`Create user`, () => {
    let inputCreateUserModel: UsersModel;
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
  });

  describe(`Find all users`, () => {
    let inputFilterModel: FilterModel;
    let outputFindUserModel: UsersModel;

    beforeEach(() => {
      inputFilterModel = new FilterModel();
      inputFilterModel.push({name: 'username', condition: 'eq', value: 'my-username'});

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
      usersRepository.getAll.mockResolvedValue([null, []]);

      const [error, result] = await service.findAll();

      expect(usersRepository.getAll).toHaveBeenCalled();
      expect(usersRepository.getAll).toBeCalledWith(undefined);
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
    });

    it(`Should successfully find all users with filter and return empty records`, async () => {
      usersRepository.getAll.mockResolvedValue([null, []]);

      const [error, result] = await service.findAll(inputFilterModel);

      expect(usersRepository.getAll).toHaveBeenCalled();
      expect(usersRepository.getAll).toBeCalledWith(inputFilterModel);
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
    });

    it(`Should successfully find all users`, async () => {
      usersRepository.getAll.mockResolvedValue([null, [outputFindUserModel]]);

      const [error, result] = await service.findAll();

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
    });
  });
});
