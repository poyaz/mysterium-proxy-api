import {UsersProxyAggregateRepository} from './users-proxy-aggregate.repository';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {Test, TestingModule} from '@nestjs/testing';
import {IProxyRepositoryInterface} from '@src-core/interface/i-proxy-repository.interface';
import {IProxyAclRepositoryInterface} from '@src-core/interface/i-proxy-acl-repository.interface';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {ProxyDownstreamModel, ProxyStatusEnum, ProxyTypeEnum, ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {defaultModelFactory} from '@src-core/model/defaultModel';
import {ProxyAclMode, ProxyAclModel, ProxyAclType} from '@src-core/model/proxyAclModel';
import {UsersProxyModel} from '@src-core/model/users-proxy.model';
import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {UsersModel} from '@src-core/model/users.model';

describe('UsersProxyAggregateRepository', () => {
  let repository: UsersProxyAggregateRepository;
  let proxyRepository: MockProxy<IProxyRepositoryInterface>;
  let proxyAclRepository: MockProxy<IProxyAclRepositoryInterface>;
  let usersRepository: MockProxy<IGenericRepositoryInterface<UsersModel>>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    proxyRepository = mock<IProxyRepositoryInterface>();
    proxyAclRepository = mock<IProxyAclRepositoryInterface>();
    usersRepository = mock<IGenericRepositoryInterface<UsersModel>>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const proxyRepositoryProvider = 'proxy-repository';
    const proxyAclRepositoryProvider = 'proxy-acl-repository';
    const usersRepositoryProvider = 'users-repository';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: proxyRepositoryProvider,
          useValue: proxyRepository,
        },
        {
          provide: proxyAclRepositoryProvider,
          useValue: proxyAclRepository,
        },
        {
          provide: usersRepositoryProvider,
          useValue: usersRepository,
        },
        {
          provide: UsersProxyAggregateRepository,
          inject: [proxyRepositoryProvider, proxyAclRepositoryProvider, usersRepositoryProvider],
          useFactory: (
            proxyRepository: IProxyRepositoryInterface,
            proxyAclRepository: IProxyAclRepositoryInterface,
            usersRepository: IGenericRepositoryInterface<UsersModel>,
          ) => new UsersProxyAggregateRepository(proxyRepository, proxyAclRepository, usersRepository),
        },
      ],
    }).compile();

    repository = module.get<UsersProxyAggregateRepository>(UsersProxyAggregateRepository);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe(`Get all user's proxies list`, () => {
    let inputUserId: string;

    let outputUserModel: UsersModel;

    let outputProxyAclAllAccessModel1: ProxyAclModel;
    let outputProxyAclOnePortAccessModel2: ProxyAclModel;
    let outputProxyAclMultiplyAccessModel3: ProxyAclModel;

    let outputProxyUpstream1: ProxyUpstreamModel;
    let outputProxyUpstream2: ProxyUpstreamModel;
    let outputProxyUpstream3: ProxyUpstreamModel;

    beforeEach(() => {
      inputUserId = identifierMock.generateId();

      outputUserModel = new UsersModel({
        id: inputUserId,
        username: 'user1',
        password: 'pass1',
        isEnable: true,
        insertDate: new Date(),
      });

      outputProxyUpstream1 = new ProxyUpstreamModel({
        id: '00000000-0000-0000-0000-111111111111',
        listenAddr: '26.45.101.6',
        listenPort: 3128,
        proxyDownstream: [
          new ProxyDownstreamModel({
            id: '00000000-0000-0000-0000-222222222222',
            refId: '00000000-0000-0000-0000-333333333333',
            ip: '59.10.56.111',
            mask: 32,
            country: 'GB',
            type: ProxyTypeEnum.MYST,
            status: ProxyStatusEnum.ONLINE,
          }),
        ],
        insertDate: new Date(),
      });
      outputProxyUpstream2 = new ProxyUpstreamModel({
        id: '00000000-0000-0000-0000-444444444444',
        listenAddr: '26.45.101.6',
        listenPort: 3129,
        proxyDownstream: [
          new ProxyDownstreamModel({
            id: '00000000-0000-0000-0000-555555555555',
            refId: '00000000-0000-0000-0000-666666666666',
            ip: '59.10.56.112',
            mask: 32,
            country: 'GB',
            type: ProxyTypeEnum.MYST,
            status: ProxyStatusEnum.ONLINE,
          }),
        ],
        insertDate: new Date(),
      });
      outputProxyUpstream3 = new ProxyUpstreamModel({
        id: '00000000-0000-0000-0000-777777777777',
        listenAddr: '26.45.101.6',
        listenPort: 3130,
        proxyDownstream: [
          new ProxyDownstreamModel({
            id: '00000000-0000-0000-0000-888888888888',
            refId: '00000000-0000-0000-0000-999999999999',
            ip: '59.10.56.113',
            mask: 32,
            country: 'GB',
            type: ProxyTypeEnum.MYST,
            status: ProxyStatusEnum.ONLINE,
          }),
        ],
        insertDate: new Date(),
      });

      outputProxyAclAllAccessModel1 = defaultModelFactory<ProxyAclModel>(
        ProxyAclModel,
        {
          id: '22222222-2222-2222-2222-111111111111',
          mode: ProxyAclMode.ALL,
          type: ProxyAclType.USER_PORT,
          proxies: [],
          insertDate: new Date(),
        },
        ['proxies'],
      );
      outputProxyAclOnePortAccessModel2 = new ProxyAclModel({
        id: '22222222-2222-2222-2222-222222222222',
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
        ],
        insertDate: new Date(),
      });
      outputProxyAclMultiplyAccessModel3 = new ProxyAclModel({
        id: '22222222-2222-2222-2222-222222222222',
        mode: ProxyAclMode.CUSTOM,
        type: ProxyAclType.USER_PORT,
        user: outputUserModel,
        proxies: [
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
          defaultModelFactory<ProxyUpstreamModel>(
            ProxyUpstreamModel,
            {
              id: 'default-id',
              listenAddr: 'default-listen-addr',
              listenPort: 3130,
              proxyDownstream: [],
              insertDate: new Date(),
            },
            ['id', 'listenAddr', 'proxyDownstream', 'insertDate'],
          ),
        ],
        insertDate: new Date(),
      });
    });

    it(`Should error get all user's proxies list when get acl list`, async () => {
      usersRepository.getById.mockResolvedValue([null, null]);
      proxyAclRepository.getAll.mockResolvedValue([new UnknownException()]);
      proxyRepository.getAll.mockResolvedValue([null]);

      const [error] = await repository.getByUserId(inputUserId);

      expect(usersRepository.getById).toHaveBeenCalled();
      expect(usersRepository.getById).toHaveBeenCalledWith(inputUserId);
      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll.mock.calls[0][0].skipPagination).toEqual(true);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getLengthOfCondition()).toEqual(1);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getCondition('user').user.id).toEqual(inputUserId);
      expect(proxyRepository.getAll).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all user's proxies list when get proxy list`, async () => {
      usersRepository.getById.mockResolvedValue([null, null]);
      proxyAclRepository.getAll.mockResolvedValue([null, [], 0]);
      proxyRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.getByUserId(inputUserId);

      expect(usersRepository.getById).toHaveBeenCalled();
      expect(usersRepository.getById).toHaveBeenCalledWith(inputUserId);
      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll.mock.calls[0][0].skipPagination).toEqual(true);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getLengthOfCondition()).toEqual(1);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getCondition('user').user.id).toEqual(inputUserId);
      expect(proxyRepository.getAll).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all user's proxies list when get user info`, async () => {
      usersRepository.getById.mockResolvedValue([new UnknownException()]);
      proxyAclRepository.getAll.mockResolvedValue([null, [], 0]);
      proxyRepository.getAll.mockResolvedValue([null, [], 0]);


      const [error] = await repository.getByUserId(inputUserId);

      expect(usersRepository.getById).toHaveBeenCalled();
      expect(usersRepository.getById).toHaveBeenCalledWith(inputUserId);
      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll.mock.calls[0][0].skipPagination).toEqual(true);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getLengthOfCondition()).toEqual(1);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getCondition('user').user.id).toEqual(inputUserId);
      expect(proxyRepository.getAll).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get all user's proxies list and return empty when not found any acl`, async () => {
      usersRepository.getById.mockResolvedValue([null, outputUserModel]);
      proxyAclRepository.getAll.mockResolvedValue([null, [], 0]);
      proxyRepository.getAll.mockResolvedValue([
        null,
        [outputProxyUpstream1, outputProxyUpstream2, outputProxyUpstream3],
        3,
      ]);


      const [error, result, total] = await repository.getByUserId(inputUserId);

      expect(usersRepository.getById).toHaveBeenCalled();
      expect(usersRepository.getById).toHaveBeenCalledWith(inputUserId);
      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll.mock.calls[0][0].skipPagination).toEqual(true);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getLengthOfCondition()).toEqual(1);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getCondition('user').user.id).toEqual(inputUserId);
      expect(proxyRepository.getAll).toHaveBeenCalled();
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
      expect(total).toEqual(0);
    });

    it(`Should successfully get all user's proxies list and return empty when not found any user`, async () => {
      usersRepository.getById.mockResolvedValue([null, null]);
      proxyAclRepository.getAll.mockResolvedValue([null, [outputProxyAclAllAccessModel1], 0]);
      proxyRepository.getAll.mockResolvedValue([
        null,
        [outputProxyUpstream1, outputProxyUpstream2, outputProxyUpstream3],
        3,
      ]);

      const [error, result, total] = await repository.getByUserId(inputUserId);

      expect(usersRepository.getById).toHaveBeenCalled();
      expect(usersRepository.getById).toHaveBeenCalledWith(inputUserId);
      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll.mock.calls[0][0].skipPagination).toEqual(true);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getLengthOfCondition()).toEqual(1);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getCondition('user').user.id).toEqual(inputUserId);
      expect(proxyRepository.getAll).toHaveBeenCalled();
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
      expect(total).toEqual(0);
    });

    it(`Should successfully get all user's proxies list and return all proxy if acl to all port exist`, async () => {
      usersRepository.getById.mockResolvedValue([null, outputUserModel]);
      proxyAclRepository.getAll.mockResolvedValue([null, [outputProxyAclAllAccessModel1], 1]);
      proxyRepository.getAll.mockResolvedValue([
        null,
        [outputProxyUpstream1, outputProxyUpstream2, outputProxyUpstream3],
        3,
      ]);

      const [error, result, total] = await repository.getByUserId(inputUserId);

      expect(usersRepository.getById).toHaveBeenCalled();
      expect(usersRepository.getById).toHaveBeenCalledWith(inputUserId);
      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll.mock.calls[0][0].skipPagination).toEqual(true);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getLengthOfCondition()).toEqual(1);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getCondition('user').user.id).toEqual(inputUserId);
      expect(proxyRepository.getAll).toHaveBeenCalled();
      expect(error).toBeNull();
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual<Omit<UsersProxyModel, 'clone'>>({
        user: {
          id: outputUserModel.id,
          username: outputUserModel.username,
          password: outputUserModel.password,
        },
        id: outputProxyUpstream1.id,
        listenAddr: outputProxyUpstream1.listenAddr,
        listenPort: outputProxyUpstream1.listenPort,
        proxyDownstream: outputProxyUpstream1.proxyDownstream,
        runner: outputProxyUpstream1.runner,
        insertDate: outputProxyUpstream1.insertDate,
      });
      expect(result[1]).toEqual<Omit<UsersProxyModel, 'clone'>>({
        user: {
          id: outputUserModel.id,
          username: outputUserModel.username,
          password: outputUserModel.password,
        },
        id: outputProxyUpstream2.id,
        listenAddr: outputProxyUpstream2.listenAddr,
        listenPort: outputProxyUpstream2.listenPort,
        proxyDownstream: outputProxyUpstream2.proxyDownstream,
        runner: outputProxyUpstream2.runner,
        insertDate: outputProxyUpstream2.insertDate,
      });
      expect(result[2]).toEqual<Omit<UsersProxyModel, 'clone'>>({
        user: {
          id: outputUserModel.id,
          username: outputUserModel.username,
          password: outputUserModel.password,
        },
        id: outputProxyUpstream3.id,
        listenAddr: outputProxyUpstream3.listenAddr,
        listenPort: outputProxyUpstream3.listenPort,
        proxyDownstream: outputProxyUpstream3.proxyDownstream,
        runner: outputProxyUpstream3.runner,
        insertDate: outputProxyUpstream3.insertDate,
      });
      expect(total).toEqual(3);
    });

    it(`Should successfully get all user's proxies list and return one proxy`, async () => {
      usersRepository.getById.mockResolvedValue([null, outputUserModel]);
      proxyAclRepository.getAll.mockResolvedValue([null, [outputProxyAclOnePortAccessModel2], 1]);
      proxyRepository.getAll.mockResolvedValue([
        null,
        [outputProxyUpstream1, outputProxyUpstream2, outputProxyUpstream3],
        3,
      ]);

      const [error, result, total] = await repository.getByUserId(inputUserId);

      expect(usersRepository.getById).toHaveBeenCalled();
      expect(usersRepository.getById).toHaveBeenCalledWith(inputUserId);
      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll.mock.calls[0][0].skipPagination).toEqual(true);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getLengthOfCondition()).toEqual(1);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getCondition('user').user.id).toEqual(inputUserId);
      expect(proxyRepository.getAll).toHaveBeenCalled();
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual<Omit<UsersProxyModel, 'clone'>>({
        user: {
          id: outputUserModel.id,
          username: outputUserModel.username,
          password: outputUserModel.password,
        },
        id: outputProxyUpstream1.id,
        listenAddr: outputProxyUpstream1.listenAddr,
        listenPort: outputProxyUpstream1.listenPort,
        proxyDownstream: outputProxyUpstream1.proxyDownstream,
        runner: outputProxyUpstream1.runner,
        insertDate: outputProxyUpstream1.insertDate,
      });
      expect(total).toEqual(1);
    });

    it(`Should successfully get all user's proxies list and return multiply proxy`, async () => {
      usersRepository.getById.mockResolvedValue([null, outputUserModel]);
      proxyAclRepository.getAll.mockResolvedValue([null, [outputProxyAclMultiplyAccessModel3], 1]);
      proxyRepository.getAll.mockResolvedValue([
        null,
        [outputProxyUpstream1, outputProxyUpstream2, outputProxyUpstream3],
        3,
      ]);

      const [error, result, total] = await repository.getByUserId(inputUserId);

      expect(usersRepository.getById).toHaveBeenCalled();
      expect(usersRepository.getById).toHaveBeenCalledWith(inputUserId);
      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll.mock.calls[0][0].skipPagination).toEqual(true);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getLengthOfCondition()).toEqual(1);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getCondition('user').user.id).toEqual(inputUserId);
      expect(proxyRepository.getAll).toHaveBeenCalled();
      expect(error).toBeNull();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual<Omit<UsersProxyModel, 'clone'>>({
        user: {
          id: outputUserModel.id,
          username: outputUserModel.username,
          password: outputUserModel.password,
        },
        id: outputProxyUpstream2.id,
        listenAddr: outputProxyUpstream2.listenAddr,
        listenPort: outputProxyUpstream2.listenPort,
        proxyDownstream: outputProxyUpstream2.proxyDownstream,
        runner: outputProxyUpstream2.runner,
        insertDate: outputProxyUpstream2.insertDate,
      });
      expect(result[1]).toEqual<Omit<UsersProxyModel, 'clone'>>({
        user: {
          id: outputUserModel.id,
          username: outputUserModel.username,
          password: outputUserModel.password,
        },
        id: outputProxyUpstream3.id,
        listenAddr: outputProxyUpstream3.listenAddr,
        listenPort: outputProxyUpstream3.listenPort,
        proxyDownstream: outputProxyUpstream3.proxyDownstream,
        runner: outputProxyUpstream3.runner,
        insertDate: outputProxyUpstream3.insertDate,
      });
      expect(total).toEqual(2);
    });

    it(`Should successfully get all user's proxies list and return multiply proxy when have multi acl for user`, async () => {
      usersRepository.getById.mockResolvedValue([null, outputUserModel]);
      proxyAclRepository.getAll.mockResolvedValue([null, [outputProxyAclOnePortAccessModel2, outputProxyAclMultiplyAccessModel3], 2]);
      proxyRepository.getAll.mockResolvedValue([
        null,
        [outputProxyUpstream1, outputProxyUpstream2, outputProxyUpstream3],
        3,
      ]);

      const [error, result, total] = await repository.getByUserId(inputUserId);

      expect(usersRepository.getById).toHaveBeenCalled();
      expect(usersRepository.getById).toHaveBeenCalledWith(inputUserId);
      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll.mock.calls[0][0].skipPagination).toEqual(true);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getLengthOfCondition()).toEqual(1);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getCondition('user').user.id).toEqual(inputUserId);
      expect(proxyRepository.getAll).toHaveBeenCalled();
      expect(error).toBeNull();
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual<Omit<UsersProxyModel, 'clone'>>({
        user: {
          id: outputUserModel.id,
          username: outputUserModel.username,
          password: outputUserModel.password,
        },
        id: outputProxyUpstream1.id,
        listenAddr: outputProxyUpstream1.listenAddr,
        listenPort: outputProxyUpstream1.listenPort,
        proxyDownstream: outputProxyUpstream1.proxyDownstream,
        runner: outputProxyUpstream1.runner,
        insertDate: outputProxyUpstream1.insertDate,
      });
      expect(result[1]).toEqual<Omit<UsersProxyModel, 'clone'>>({
        user: {
          id: outputUserModel.id,
          username: outputUserModel.username,
          password: outputUserModel.password,
        },
        id: outputProxyUpstream2.id,
        listenAddr: outputProxyUpstream2.listenAddr,
        listenPort: outputProxyUpstream2.listenPort,
        proxyDownstream: outputProxyUpstream2.proxyDownstream,
        runner: outputProxyUpstream2.runner,
        insertDate: outputProxyUpstream2.insertDate,
      });
      expect(result[2]).toEqual<Omit<UsersProxyModel, 'clone'>>({
        user: {
          id: outputUserModel.id,
          username: outputUserModel.username,
          password: outputUserModel.password,
        },
        id: outputProxyUpstream3.id,
        listenAddr: outputProxyUpstream3.listenAddr,
        listenPort: outputProxyUpstream3.listenPort,
        proxyDownstream: outputProxyUpstream3.proxyDownstream,
        runner: outputProxyUpstream3.runner,
        insertDate: outputProxyUpstream3.insertDate,
      });
      expect(total).toEqual(3);
    });
  });
});
