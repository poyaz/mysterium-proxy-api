import {Test, TestingModule} from '@nestjs/testing';
import {AuthService} from './auth.service';
import {mock, MockProxy} from 'jest-mock-extended';
import {JwtService} from '@nestjs/jwt';
import {IUsersServiceInterface} from '../interface/i-users-service.interface';
import {UnknownException} from '../exception/unknown.exception';
import {FilterModel} from '../model/filter.model';
import {UsersModel} from '../model/users.model';
import {AuthenticateException} from '../exception/authenticate.exception';
import {UserRoleEnum} from '../enum/user-role.enum';
import {IIdentifier} from '../interface/i-identifier.interface';
import {ProviderTokenEnum} from '../enum/provider-token.enum';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: MockProxy<IUsersServiceInterface>;
  let jwtService: MockProxy<JwtService>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    usersService = mock<IUsersServiceInterface>();
    jwtService = mock<JwtService>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProviderTokenEnum.USER_SERVICE_DEFAULT,
          useValue: usersService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: AuthService,
          inject: [ProviderTokenEnum.USER_SERVICE_DEFAULT, JwtService],
          useFactory: (usersService: IUsersServiceInterface, jwtService: JwtService) =>
            new AuthService(usersService, jwtService),
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe(`Login`, () => {
    let inputUsername;
    let inputPassword;
    let filterMatch: FilterModel<UsersModel>;
    let outputInvalidPasswordUserModel: UsersModel;
    let outputValidPasswordUserModel: UsersModel;

    beforeEach(() => {
      inputUsername = 'my-user';
      inputPassword = 'my password';

      filterMatch = new FilterModel<UsersModel>();
      filterMatch.addCondition({username: 'my-user', $opr: 'eq'});

      outputInvalidPasswordUserModel = new UsersModel({
        id: identifierMock.generateId(),
        username: 'my-user',
        password: 'invalid password',
        role: UserRoleEnum.USER,
        isEnable: true,
        insertDate: new Date(),
      });

      outputValidPasswordUserModel = new UsersModel({
        id: identifierMock.generateId(),
        username: 'my-user',
        password: 'my password',
        role: UserRoleEnum.USER,
        isEnable: true,
        insertDate: new Date(),
      });
    });

    it(`Should error login when get user info`, async () => {
      usersService.findAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.login(inputUsername, inputPassword);

      expect(usersService.findAll).toHaveBeenCalled();
      expect(usersService.findAll).toBeCalledWith(filterMatch);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error login when username not found`, async () => {
      usersService.findAll.mockResolvedValue([null, []]);

      const [error] = await service.login(inputUsername, inputPassword);

      expect(usersService.findAll).toHaveBeenCalled();
      expect(usersService.findAll).toBeCalledWith(filterMatch);
      expect(error).toBeInstanceOf(AuthenticateException);
    });

    it(`Should error login when password not match`, async () => {
      usersService.findAll.mockResolvedValue([null, [outputInvalidPasswordUserModel]]);

      const [error] = await service.login(inputUsername, inputPassword);

      expect(usersService.findAll).toHaveBeenCalled();
      expect(usersService.findAll).toBeCalledWith(filterMatch);
      expect(error).toBeInstanceOf(AuthenticateException);
    });

    it(`Should successfully login`, async () => {
      usersService.findAll.mockResolvedValue([null, [outputValidPasswordUserModel]]);
      jwtService.sign.mockReturnValue('token');

      const [error, result] = await service.login(inputUsername, inputPassword);

      expect(usersService.findAll).toHaveBeenCalled();
      expect(usersService.findAll).toBeCalledWith(filterMatch);
      expect(jwtService.sign).toHaveBeenCalled();
      expect(jwtService.sign).toBeCalledWith(expect.objectContaining({
        userId: outputValidPasswordUserModel.id,
        role: outputValidPasswordUserModel.role,
      }));
      expect(error).toBeNull();
      expect(result).toEqual('token');
    });
  });
});
