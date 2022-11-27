import {Test, TestingModule} from '@nestjs/testing';
import {ProxyAclService} from './proxy-acl.service';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {IProxyAclRepositoryInterface} from '@src-core/interface/i-proxy-acl-repository.interface';
import {IUsersServiceInterface} from '@src-core/interface/i-users-service.interface';
import {FilterModel} from '@src-core/model/filter.model';
import {ProxyAclMode, ProxyAclModel, ProxyAclType} from '@src-core/model/proxyAclModel';
import {defaultModelFactory} from '@src-core/model/defaultModel';
import {UsersModel} from '@src-core/model/users.model';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {ProxyUpstreamModel} from '@src-core/model/proxy.model';

describe('ProxyAclService', () => {
  let service: ProxyAclService;
  let proxyAclRepository: MockProxy<IProxyAclRepositoryInterface>;
  let usersService: MockProxy<IUsersServiceInterface>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    proxyAclRepository = mock<IProxyAclRepositoryInterface>();
    usersService = mock<IUsersServiceInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const proxyAclRepositoryProvider = 'proxy-acl-repository';
    const usersServiceProvider = 'users-service';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: proxyAclRepositoryProvider,
          useValue: proxyAclRepository,
        },
        {
          provide: usersServiceProvider,
          useValue: usersService,
        },
        {
          provide: ProxyAclService,
          inject: [proxyAclRepositoryProvider, usersServiceProvider],
          useFactory: (proxyAclRepository: IProxyAclRepositoryInterface, usersService: IUsersServiceInterface) =>
            new ProxyAclService(proxyAclRepository, usersService),
        },
      ],
    }).compile();

    service = module.get<ProxyAclService>(ProxyAclService);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe(`Get all acl proxy`, () => {
    let inputFilter: FilterModel<ProxyAclModel>;
    let inputFilterWithUSerId: FilterModel<ProxyAclModel>;

    let outputProxyAclModel1: ProxyAclModel;

    beforeEach(() => {
      inputFilter = new FilterModel<ProxyAclModel>();

      inputFilterWithUSerId = new FilterModel<ProxyAclModel>();
      inputFilterWithUSerId.addCondition({
        $opr: 'eq',
        user: defaultModelFactory<UsersModel>(
          UsersModel,
          {
            id: identifierMock.generateId(),
            username: 'default-username',
            password: 'default-password',
            insertDate: new Date(),
          },
          ['username', 'password', 'insertDate'],
        ),
      });

      outputProxyAclModel1 = new ProxyAclModel({
        id: identifierMock.generateId(),
        mode: ProxyAclMode.ALL,
        type: ProxyAclType.USER_PORT,
        user: {
          id: identifierMock.generateId(),
          username: 'user1',
          password: 'pass1',
          isEnable: true,
          insertDate: new Date(),
        },
        proxies: [],
        insertDate: new Date(),
      });
    });

    it(`Should error get all acl (Without filter)`, async () => {
      proxyAclRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.getAll();

      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll).toHaveBeenCalledWith(undefined);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all acl (With empty filter)`, async () => {
      proxyAclRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.getAll(inputFilter);

      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll.mock.calls[0][0].getConditionList()).toHaveLength(0);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all acl (With user id filter)`, async () => {
      proxyAclRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.getAll(inputFilterWithUSerId);

      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll.mock.calls[0][0].getConditionList()).toHaveLength(1);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getCondition('user')).toEqual({
        $opr: 'eq',
        user: defaultModelFactory<UsersModel>(
          UsersModel,
          {
            id: identifierMock.generateId(),
            username: expect.anything(),
            password: expect.anything(),
            insertDate: expect.anything(),
          },
          ['username', 'password', 'insertDate'],
        ),
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get all acl (Without filter)`, async () => {
      proxyAclRepository.getAll.mockResolvedValue([null, [outputProxyAclModel1], 1]);

      const [error, result, total] = await service.getAll();

      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll).toHaveBeenCalledWith(undefined);
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(outputProxyAclModel1);
      expect(total).toEqual(1);
    });
  });

  describe(`Create new acl proxy`, () => {
    let inputCreateAccessAllUsersToAllPorts: ProxyAclModel;
    let inputCreateAccessOneUserToAllPorts: ProxyAclModel;
    let inputCreateAccessOneUserToMultiplyPorts: ProxyAclModel;

    let outputUserModel: UsersModel;
    let outputAccessAllUsersToAllPorts: ProxyAclModel;

    beforeEach(() => {
      inputCreateAccessAllUsersToAllPorts = defaultModelFactory<ProxyAclModel>(
        ProxyAclModel,
        {
          id: 'default-id',
          mode: ProxyAclMode.ALL,
          type: ProxyAclType.USER_PORT,
          proxies: [],
          insertDate: new Date(),
        },
        ['id', 'proxies', 'insertDate'],
      );

      inputCreateAccessOneUserToAllPorts = defaultModelFactory<ProxyAclModel>(
        ProxyAclModel,
        {
          id: 'default-id',
          mode: ProxyAclMode.ALL,
          type: ProxyAclType.USER_PORT,
          user: defaultModelFactory<UsersModel>(
            UsersModel,
            {
              id: identifierMock.generateId(),
              username: 'default-username',
              password: 'default-password',
              insertDate: new Date(),
            },
            ['username', 'password', 'insertDate'],
          ),
          proxies: [],
          insertDate: new Date(),
        },
        ['id', 'proxies', 'insertDate'],
      );

      inputCreateAccessOneUserToMultiplyPorts = defaultModelFactory<ProxyAclModel>(
        ProxyAclModel,
        {
          id: 'default-id',
          mode: ProxyAclMode.CUSTOM,
          type: ProxyAclType.USER_PORT,
          user: defaultModelFactory<UsersModel>(
            UsersModel,
            {
              id: identifierMock.generateId(),
              username: 'default-username',
              password: 'default-password',
              insertDate: new Date(),
            },
            ['username', 'password', 'insertDate'],
          ),
          proxies: [
            defaultModelFactory<ProxyUpstreamModel>(
              ProxyUpstreamModel,
              {
                id: 'default-id',
                listenAddr: 'default-listen-addr',
                listenPort: 3128,
                proxyDownstream: [],
                insertDate: new Date(),
              },
              ['id', 'listenAddr', 'proxyDownstream', 'insertDate'],
            ),
            defaultModelFactory<ProxyUpstreamModel>(
              ProxyUpstreamModel,
              {
                id: 'default-id',
                listenAddr: 'default-listen-addr',
                listenPort: 3129,
                proxyDownstream: [],
                insertDate: new Date(),
              },
              ['id', 'listenAddr', 'proxyDownstream', 'insertDate'],
            ),
          ],
          insertDate: new Date(),
        },
        ['id', 'proxies', 'insertDate'],
      );

      outputUserModel = new UsersModel({
        id: identifierMock.generateId(),
        username: 'user1',
        password: 'pass1',
        isEnable: true,
        insertDate: new Date(),
      });

      outputAccessAllUsersToAllPorts = new ProxyAclModel({
        id: identifierMock.generateId(),
        mode: ProxyAclMode.ALL,
        type: ProxyAclType.USER_PORT,
        user: outputUserModel,
        proxies: [],
        insertDate: new Date(),
      });
    });

    it(`Should error create new acl proxy (For access all users to all ports)`, async () => {
      proxyAclRepository.create.mockResolvedValue([new UnknownException()]);

      const [error] = await service.create(inputCreateAccessAllUsersToAllPorts);

      expect(proxyAclRepository.create).toHaveBeenCalled();
      expect(proxyAclRepository.create).toHaveBeenCalledWith(inputCreateAccessAllUsersToAllPorts);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error create new acl proxy when get user info (For access one user to all ports)`, async () => {
      usersService.findOne.mockResolvedValue([new UnknownException()]);

      const [error] = await service.create(inputCreateAccessOneUserToAllPorts);

      expect(usersService.findOne).toHaveBeenCalled();
      expect(usersService.findOne).toHaveBeenCalledWith(inputCreateAccessOneUserToAllPorts.user.id);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error create new acl proxy (For access one user to multiply ports)`, async () => {
      usersService.findOne.mockResolvedValue([null, outputUserModel]);
      proxyAclRepository.create.mockResolvedValue([new UnknownException()]);

      const [error] = await service.create(inputCreateAccessOneUserToMultiplyPorts);

      expect(usersService.findOne).toHaveBeenCalled();
      expect(usersService.findOne).toHaveBeenCalledWith(inputCreateAccessOneUserToMultiplyPorts.user.id);
      expect(proxyAclRepository.create).toHaveBeenCalledWith(defaultModelFactory<ProxyAclModel>(
        ProxyAclModel,
        {
          id: 'default-id',
          mode: ProxyAclMode.CUSTOM,
          type: ProxyAclType.USER_PORT,
          user: outputUserModel,
          proxies: [
            defaultModelFactory<ProxyUpstreamModel>(
              ProxyUpstreamModel,
              {
                id: 'default-id',
                listenAddr: 'default-listen-addr',
                listenPort: 3128,
                proxyDownstream: [],
                insertDate: new Date(),
              },
              ['id', 'listenAddr', 'proxyDownstream', 'insertDate'],
            ),
            defaultModelFactory<ProxyUpstreamModel>(
              ProxyUpstreamModel,
              {
                id: 'default-id',
                listenAddr: 'default-listen-addr',
                listenPort: 3129,
                proxyDownstream: [],
                insertDate: new Date(),
              },
              ['id', 'listenAddr', 'proxyDownstream', 'insertDate'],
            ),
          ],
          insertDate: new Date(),
        },
        ['id', 'proxies', 'insertDate'],
      ));
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully create new acl proxy (For access all users to all ports)`, async () => {
      proxyAclRepository.create.mockResolvedValue([null, outputAccessAllUsersToAllPorts]);

      const [error, result] = await service.create(inputCreateAccessAllUsersToAllPorts);

      expect(proxyAclRepository.create).toHaveBeenCalled();
      expect(proxyAclRepository.create).toHaveBeenCalledWith(inputCreateAccessAllUsersToAllPorts);
      expect(error).toBeNull();
      expect(result).toEqual(outputAccessAllUsersToAllPorts);
    });
  });
});
