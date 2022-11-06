import {Test, TestingModule} from '@nestjs/testing';
import {mock, MockProxy} from 'jest-mock-extended';
import {UsersHttpController} from './users.http.controller';
import {IUsersServiceInterface} from '@src-core/interface/i-users-service.interface';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {CreateUserInputDto} from './dto/create-user-input.dto';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {FindUserQueryDto} from './dto/find-user-query.dto';
import {UsersModel} from '@src-core/model/users.model';
import {FilterModel} from '@src-core/model/filter.model';
import {NotFoundUserException} from '@src-core/exception/not-found-user.exception';
import {UpdateUserAdminInputDto} from './dto/update-user-admin-input.dto';
import {UpdateModel} from '@src-core/model/update.model';
import {UserRoleEnum} from '@src-core/enum/user-role.enum';
import {UpdatePasswordInputDto} from './dto/update-password-input.dto';
import {LoginInputDto} from './dto/login-input.dto';
import {IAuthServiceInterface} from '@src-core/interface/i-auth-service.interface';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {IncomingMessage} from 'http';

describe('UsersController', () => {
  let controller: UsersHttpController;
  let usersService: MockProxy<IUsersServiceInterface>;
  let authService: MockProxy<IAuthServiceInterface>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    usersService = mock<IUsersServiceInterface>();
    authService = mock<IAuthServiceInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersHttpController],
      providers: [
        {
          provide: ProviderTokenEnum.USER_SERVICE_DEFAULT,
          useValue: usersService,
        },
        {
          provide: ProviderTokenEnum.AUTH_SERVICE_DEFAULT,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<UsersHttpController>(UsersHttpController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it(`Should be defined`, () => {
    expect(controller).toBeDefined();
  });

  describe(`Add new user`, () => {
    let inputCreateUserDto;
    let inputCreateUserAdminDto;
    let outputUserModel;
    let outputUserAdminModel;

    beforeEach(() => {
      inputCreateUserDto = new CreateUserInputDto();
      inputCreateUserDto.username = 'alex042';
      inputCreateUserDto.password = 'my-password';
      inputCreateUserDto.confirmPassword = 'my-password';

      inputCreateUserAdminDto = new CreateUserInputDto();
      inputCreateUserAdminDto.username = 'alex042';
      inputCreateUserAdminDto.password = 'my-password';
      inputCreateUserAdminDto.confirmPassword = 'my-password';
      inputCreateUserAdminDto.isEnable = false;

      outputUserModel = new UsersModel({
        id: identifierMock.generateId(),
        username: 'my-user',
        password: 'my-password',
        role: UserRoleEnum.USER,
        isEnable: true,
        insertDate: new Date(),
      });

      outputUserAdminModel = new UsersModel({
        id: identifierMock.generateId(),
        username: 'my-user',
        password: 'my-password',
        role: UserRoleEnum.USER,
        isEnable: false,
        insertDate: new Date(),
      });
    });

    it(`Should error add new user`, async () => {
      usersService.create.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.create(inputCreateUserDto);

      expect(usersService.create).toHaveBeenCalled();
      expect(usersService.create).toBeCalledWith(expect.objectContaining({
        username: inputCreateUserDto.username,
        password: inputCreateUserDto.password,
      }));
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully add new user`, async () => {
      usersService.create.mockResolvedValue([null, outputUserModel]);

      const [error, result] = await controller.create(inputCreateUserDto);

      expect(usersService.create).toHaveBeenCalled();
      expect(usersService.create).toBeCalledWith(expect.objectContaining({
        username: inputCreateUserDto.username,
        password: inputCreateUserDto.password,
      }));
      expect(error).toBeNull();
      expect(result['id']).toEqual(identifierMock.generateId());
      expect(result['username']).toEqual(outputUserModel.username);
      expect(result['password']).toEqual(outputUserModel.password);
    });

    it(`Should successfully add new user for admin`, async () => {
      usersService.create.mockResolvedValue([null, outputUserAdminModel]);

      const [error, result] = await controller.create(inputCreateUserAdminDto);

      expect(usersService.create).toHaveBeenCalled();
      expect(usersService.create).toBeCalledWith(expect.objectContaining({
        username: inputCreateUserAdminDto.username,
        password: inputCreateUserAdminDto.password,
        isEnable: inputCreateUserAdminDto.isEnable,
      }));
      expect(error).toBeNull();
      expect((result as UsersModel).id).toEqual(identifierMock.generateId());
      expect((result as UsersModel).username).toEqual(outputUserAdminModel.username);
      expect((result as UsersModel).password).toEqual(outputUserAdminModel.password);
      expect((result as UsersModel).isEnable).toEqual(outputUserAdminModel.isEnable);
    });
  });

  describe(`Find all users`, () => {
    let inputFindUserQueryDto;
    let inputEmptyFindUserQueryDto;
    let matchFindUserFilter: FilterModel<UsersModel>;
    let matchEmptyFindUserFilter: FilterModel<UsersModel>;
    let outputUserModel;

    beforeEach(() => {
      inputFindUserQueryDto = new FindUserQueryDto();
      inputFindUserQueryDto.filters = {username: 'my-user'};

      inputEmptyFindUserQueryDto = new FindUserQueryDto();

      matchFindUserFilter = new FilterModel<UsersModel>();
      matchFindUserFilter.addCondition({$opr: 'eq', username: 'my-user'});

      matchEmptyFindUserFilter = new FilterModel<UsersModel>();

      outputUserModel = new UsersModel({
        id: identifierMock.generateId(),
        username: 'my-user',
        password: 'my-password',
        role: UserRoleEnum.USER,
        isEnable: true,
        insertDate: new Date(),
      });
    });

    it(`Should error get all users without filter`, async () => {
      usersService.findAll.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.findAll(inputEmptyFindUserQueryDto);

      expect(usersService.findAll).toHaveBeenCalled();
      expect(usersService.findAll).toBeCalledWith(matchEmptyFindUserFilter);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all users with filter`, async () => {
      usersService.findAll.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.findAll(inputFindUserQueryDto);

      expect(usersService.findAll).toHaveBeenCalled();
      expect(usersService.findAll.mock.calls[0][0].getCondition('username')).toMatchObject(
        matchFindUserFilter.getCondition('username'),
      );
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get all users with empty record`, async () => {
      usersService.findAll.mockResolvedValue([null, [], 0]);

      const [error, result] = await controller.findAll(inputEmptyFindUserQueryDto);

      expect(usersService.findAll).toHaveBeenCalled();
      expect(usersService.findAll).toBeCalledWith(matchEmptyFindUserFilter);
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
    });

    it(`Should successfully get all users`, async () => {
      usersService.findAll.mockResolvedValue([null, [outputUserModel], 1]);

      const [error, result] = await controller.findAll(inputEmptyFindUserQueryDto);

      expect(usersService.findAll).toHaveBeenCalled();
      expect(usersService.findAll).toBeCalledWith(matchEmptyFindUserFilter);
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect((result[0] as UsersModel).id).toEqual(identifierMock.generateId());
      expect((result[0] as UsersModel).username).toEqual(outputUserModel.username);
      expect((result[0] as UsersModel).password).toEqual(outputUserModel.password);
      expect((result[0] as UsersModel).isEnable).toEqual(outputUserModel.isEnable);
    });
  });

  describe(`Find current user`, () => {
    let inputReq: { user: { userId: string } };
    let outputUserModel;

    beforeEach(() => {
      inputReq = {user: {userId: identifierMock.generateId()}};

      outputUserModel = new UsersModel({
        id: identifierMock.generateId(),
        username: 'my-user',
        password: 'my-password',
        role: UserRoleEnum.USER,
        isEnable: true,
        insertDate: new Date(),
      });
      outputUserModel.id = identifierMock.generateId();
      outputUserModel.username = 'my-user';
      outputUserModel.isEnable = true;
    });

    it(`Should error get current user by id`, async () => {
      usersService.findOne.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.findMe(inputReq);

      expect(usersService.findOne).toHaveBeenCalled();
      expect(usersService.findOne).toBeCalledWith(inputReq.user.userId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get current user by id when user not found`, async () => {
      usersService.findOne.mockResolvedValue([new NotFoundUserException()]);

      const [error] = await controller.findMe(inputReq);

      expect(usersService.findOne).toHaveBeenCalled();
      expect(usersService.findOne).toBeCalledWith(inputReq.user.userId);
      expect(error).toBeInstanceOf(NotFoundUserException);
    });

    it(`Should successfully get current user`, async () => {
      usersService.findOne.mockResolvedValue([null, outputUserModel]);

      const [error, result] = await controller.findMe(inputReq);

      expect(usersService.findOne).toHaveBeenCalled();
      expect(usersService.findOne).toBeCalledWith(inputReq.user.userId);
      expect(error).toBeNull();
      expect((result as UsersModel).id).toEqual(identifierMock.generateId());
      expect((result as UsersModel).username).toEqual(outputUserModel.username);
      expect((result as UsersModel).password).toEqual(outputUserModel.password);
      expect((result as UsersModel).isEnable).toEqual(outputUserModel.isEnable);
    });
  });

  describe(`Find one user`, () => {
    let outputUserModel;

    beforeEach(() => {
      outputUserModel = new UsersModel({
        id: identifierMock.generateId(),
        username: 'my-user',
        password: 'my-password',
        role: UserRoleEnum.USER,
        isEnable: true,
        insertDate: new Date(),
      });
      outputUserModel.id = identifierMock.generateId();
      outputUserModel.username = 'my-user';
      outputUserModel.isEnable = true;
    });

    it(`Should error get one user by id`, async () => {
      const userId = identifierMock.generateId();
      usersService.findOne.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.findOne(userId);

      expect(usersService.findOne).toHaveBeenCalled();
      expect(usersService.findOne).toBeCalledWith(userId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get one user by id when user not found`, async () => {
      const userId = identifierMock.generateId();
      usersService.findOne.mockResolvedValue([new NotFoundUserException()]);

      const [error] = await controller.findOne(userId);

      expect(usersService.findOne).toHaveBeenCalled();
      expect(usersService.findOne).toBeCalledWith(userId);
      expect(error).toBeInstanceOf(NotFoundUserException);
    });

    it(`Should successfully get one user`, async () => {
      const userId = identifierMock.generateId();
      usersService.findOne.mockResolvedValue([null, outputUserModel]);

      const [error, result] = await controller.findOne(userId);

      expect(usersService.findOne).toHaveBeenCalled();
      expect(usersService.findOne).toBeCalledWith(userId);
      expect(error).toBeNull();
      expect((result as UsersModel).id).toEqual(identifierMock.generateId());
      expect((result as UsersModel).username).toEqual(outputUserModel.username);
      expect((result as UsersModel).password).toEqual(outputUserModel.password);
      expect((result as UsersModel).isEnable).toEqual(outputUserModel.isEnable);
    });
  });

  describe(`Update admin`, () => {
    let inputUpdateUserAdminDto: UpdateUserAdminInputDto;
    let matchUpdateUser: UpdateModel<UsersModel>;

    beforeEach(() => {
      inputUpdateUserAdminDto = new UpdateUserAdminInputDto();
      inputUpdateUserAdminDto.isEnable = true;

      matchUpdateUser = new UpdateModel<UsersModel>(identifierMock.generateId(), {isEnable: true});
    });

    it(`Should error update user by id with admin access`, async () => {
      const userId = identifierMock.generateId();
      usersService.update.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.updateAdmin(userId, inputUpdateUserAdminDto);

      expect(usersService.update).toHaveBeenCalled();
      expect(usersService.update).toBeCalledWith(matchUpdateUser);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully update user by id with admin access`, async () => {
      const userId = identifierMock.generateId();
      usersService.update.mockResolvedValue([null]);

      const [error] = await controller.updateAdmin(userId, inputUpdateUserAdminDto);

      expect(usersService.update).toHaveBeenCalled();
      expect(usersService.update).toBeCalledWith(matchUpdateUser);
      expect(error).toBeNull();
    });
  });

  describe(`Update password`, () => {
    let inputUpdatePasswordDto: UpdatePasswordInputDto;
    let matchUpdateUser: UpdateModel<UsersModel>;

    beforeEach(() => {
      inputUpdatePasswordDto = new UpdatePasswordInputDto();
      inputUpdatePasswordDto.password = '123456';
      inputUpdatePasswordDto.confirmPassword = '123456';

      matchUpdateUser = new UpdateModel<UsersModel>(identifierMock.generateId(), {password: '123456'});
    });

    it(`Should error update user by id with admin access`, async () => {
      const userId = identifierMock.generateId();
      usersService.update.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.updatePassword(userId, inputUpdatePasswordDto);

      expect(usersService.update).toHaveBeenCalled();
      expect(usersService.update).toBeCalledWith(matchUpdateUser);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully update user by id with admin access`, async () => {
      const userId = identifierMock.generateId();
      usersService.update.mockResolvedValue([null]);

      const [error] = await controller.updatePassword(userId, inputUpdatePasswordDto);

      expect(usersService.update).toHaveBeenCalled();
      expect(usersService.update).toBeCalledWith(matchUpdateUser);
      expect(error).toBeNull();
    });
  });

  describe(`Delete user`, () => {
    it(`Should error delete user by id`, async () => {
      const userId = identifierMock.generateId();
      usersService.remove.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.remove(userId);

      expect(usersService.remove).toHaveBeenCalled();
      expect(usersService.remove).toBeCalledWith(userId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully delete user by id`, async () => {
      const userId = identifierMock.generateId();
      usersService.remove.mockResolvedValue([null]);

      const [error] = await controller.remove(userId);

      expect(usersService.remove).toHaveBeenCalled();
      expect(usersService.remove).toBeCalledWith(userId);
      expect(error).toBeNull();
    });
  });

  describe(`Login user`, () => {
    let inputLoginDto: LoginInputDto;

    beforeEach(() => {
      inputLoginDto = new LoginInputDto();
      inputLoginDto.username = 'my-user';
      inputLoginDto.password = 'my password';
    });

    it(`Should error login user`, async () => {
      authService.login.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.login(inputLoginDto);

      expect(authService.login).toHaveBeenCalled();
      expect(authService.login).toBeCalledWith(inputLoginDto.username, inputLoginDto.password);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully login user`, async () => {
      authService.login.mockResolvedValue([null, 'token']);

      const [error, result] = await controller.login(inputLoginDto);

      expect(authService.login).toHaveBeenCalled();
      expect(authService.login).toBeCalledWith(inputLoginDto.username, inputLoginDto.password);
      expect(error).toBeNull();
      expect(result).toEqual('token');
    });
  });
});
