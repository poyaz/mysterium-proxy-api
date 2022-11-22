import {Test, TestingModule} from '@nestjs/testing';
import {UsersProxyService} from './users-proxy.service';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {IUsersProxyRepositoryInterface} from '@src-core/interface/i-users-proxy-repository.interface';
import {UsersProxyModel} from '@src-core/model/users-proxy.model';
import {ProxyDownstreamModel, ProxyStatusEnum, ProxyTypeEnum} from '@src-core/model/proxy.model';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {IUsersServiceInterface} from '@src-core/interface/i-users-service.interface';
import {UsersModel} from '@src-core/model/users.model';

describe('UsersProxyService', () => {
  let service: UsersProxyService;
  let usersService: MockProxy<IUsersServiceInterface>;
  let usersProxyRepository: MockProxy<IUsersProxyRepositoryInterface>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    usersService = mock<IUsersServiceInterface>();
    usersProxyRepository = mock<IUsersProxyRepositoryInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const usersServiceProvider = 'users-service';
    const usersProxyRepositoryProvider = 'users-proxy-repository';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: usersServiceProvider,
          useValue: usersService,
        },
        {
          provide: usersProxyRepositoryProvider,
          useValue: usersProxyRepository,
        },
        {
          provide: UsersProxyService,
          inject: [usersServiceProvider, usersProxyRepositoryProvider],
          useFactory: (usersService: IUsersServiceInterface, usersProxyRepository: IUsersProxyRepositoryInterface) =>
            new UsersProxyService(usersService, usersProxyRepository),
        },
      ],
    }).compile();

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));

    service = module.get<UsersProxyService>(UsersProxyService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe(`Get all user's proxies`, () => {
    let inputUserId: string;
    let outputUserModel: UsersModel;
    let outputUsersProxyMode1: UsersProxyModel;

    beforeEach(() => {
      inputUserId = identifierMock.generateId();

      outputUserModel = new UsersModel({
        id: identifierMock.generateId(),
        username: 'user1',
        password: 'pass1',
        isEnable: true,
        insertDate: new Date(),
      })

      outputUsersProxyMode1 = new UsersProxyModel({
        user: {
          id: outputUserModel.id,
          username: outputUserModel.username,
          password: outputUserModel.password,
        },
        id: identifierMock.generateId(),
        listenAddr: '26.110.20.6',
        listenPort: 3128,
        proxyDownstream: [
          new ProxyDownstreamModel({
            id: identifierMock.generateId(),
            refId: identifierMock.generateId(),
            ip: '65.23.45.12',
            mask: 32,
            country: 'GB',
            type: ProxyTypeEnum.MYST,
            status: ProxyStatusEnum.ONLINE,
          }),
        ],
        insertDate: new Date(),
      });
    });

    it(`Should error get all user's proxies with user id when error get user by id`, async () => {
      usersService.findOne.mockResolvedValue([new UnknownException()]);

      const [error] = await service.getByUserId(inputUserId);

      expect(usersService.findOne).toHaveBeenCalled();
      expect(usersService.findOne).toHaveBeenCalledWith(inputUserId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all user's proxies with user id`, async () => {
      usersService.findOne.mockResolvedValue([null, outputUserModel]);
      usersProxyRepository.getByUserId.mockResolvedValue([new UnknownException()]);

      const [error] = await service.getByUserId(inputUserId);

      expect(usersService.findOne).toHaveBeenCalled();
      expect(usersService.findOne).toHaveBeenCalledWith(inputUserId);
      expect(usersProxyRepository.getByUserId).toHaveBeenCalled();
      expect(usersProxyRepository.getByUserId).toHaveBeenCalledWith(inputUserId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get all user's proxies with user id`, async () => {
      usersService.findOne.mockResolvedValue([null, outputUserModel]);
      usersProxyRepository.getByUserId.mockResolvedValue([null, [outputUsersProxyMode1], 1]);

      const [error, result, count] = await service.getByUserId(inputUserId);

      expect(usersService.findOne).toHaveBeenCalled();
      expect(usersService.findOne).toHaveBeenCalledWith(inputUserId);
      expect(usersProxyRepository.getByUserId).toHaveBeenCalled();
      expect(usersProxyRepository.getByUserId).toHaveBeenCalledWith(inputUserId);
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual<UsersProxyModel>(outputUsersProxyMode1);
      expect(count).toEqual(1);
    });
  });
});
