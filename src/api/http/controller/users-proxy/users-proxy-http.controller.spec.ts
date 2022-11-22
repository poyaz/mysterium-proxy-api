import {Test, TestingModule} from '@nestjs/testing';
import {UsersProxyHttpController} from './users-proxy-http.controller';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {IUsersProxyServiceInterface} from '@src-core/interface/i-users-proxy-service.interface';
import {UsersProxyModel} from '@src-core/model/users-proxy.model';
import {ProxyDownstreamModel, ProxyStatusEnum, ProxyTypeEnum} from '@src-core/model/proxy.model';
import {UnknownException} from '@src-core/exception/unknown.exception';

describe('UsersProxyHttpController', () => {
  let controller: UsersProxyHttpController;
  let usersProxyService: MockProxy<IUsersProxyServiceInterface>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    usersProxyService = mock<IUsersProxyServiceInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersProxyHttpController],
      providers: [
        {
          provide: ProviderTokenEnum.USERS_PROXY_SERVICE_DEFAULT,
          useValue: usersProxyService,
        },
      ],
    }).compile();

    controller = module.get<UsersProxyHttpController>(UsersProxyHttpController);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe(`Get all user's proxies`, () => {
    let inputUserId: string;
    let outputUsersProxyMode1: UsersProxyModel;

    beforeEach(() => {
      inputUserId = identifierMock.generateId();

      outputUsersProxyMode1 = new UsersProxyModel({
        user: {
          id: identifierMock.generateId(),
          username: 'user1',
          password: 'pass1',
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

    it(`Should error get all user's proxies with user id`, async () => {
      usersProxyService.getByUserId.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.findByUserId(inputUserId);

      expect(usersProxyService.getByUserId).toHaveBeenCalled();
      expect(usersProxyService.getByUserId).toHaveBeenCalledWith(inputUserId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get all user's proxies with user id`, async () => {
      usersProxyService.getByUserId.mockResolvedValue([null, [outputUsersProxyMode1], 1]);

      const [error, result, count] = await controller.findByUserId(inputUserId);

      expect(usersProxyService.getByUserId).toHaveBeenCalled();
      expect(usersProxyService.getByUserId).toHaveBeenCalledWith(inputUserId);
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual<UsersProxyModel>(outputUsersProxyMode1);
      expect(count).toEqual(1);
    });
  });
});
