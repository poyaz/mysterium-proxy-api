import {NginxProxyAclAggregateRepository} from './nginx-proxy-acl-aggregate.repository';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {Test, TestingModule} from '@nestjs/testing';
import {IProxyAclRepositoryInterface} from '@src-core/interface/i-proxy-acl-repository.interface';
import {FilterModel} from '@src-core/model/filter.model';
import {ProxyAclMode, ProxyAclModel, ProxyAclType} from '@src-core/model/proxyAclModel';
import {defaultModelFactory} from '@src-core/model/defaultModel';
import {UsersModel} from '@src-core/model/users.model';
import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {filterAndSortProxyAcl} from '@src-infrastructure/utility/filterAndSortProxyAcl';

jest.mock('@src-infrastructure/utility/filterAndSortProxyAcl');

describe('NginxProxyAclAggregateRepository', () => {
  let repository: NginxProxyAclAggregateRepository;
  let proxyAclRepository: MockProxy<IProxyAclRepositoryInterface>;
  let usersRepository: MockProxy<IGenericRepositoryInterface<UsersModel>>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    proxyAclRepository = mock<IProxyAclRepositoryInterface>();
    usersRepository = mock<IGenericRepositoryInterface<UsersModel>>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const proxyAclRepositoryProvider = 'proxy-acl-repository';
    const usersRepositoryProvider = 'users-repository';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: proxyAclRepositoryProvider,
          useValue: proxyAclRepository,
        },
        {
          provide: usersRepositoryProvider,
          useValue: usersRepository,
        },
        {
          provide: NginxProxyAclAggregateRepository,
          inject: [proxyAclRepositoryProvider, usersRepositoryProvider],
          useFactory: (
            proxyAclRepository: IProxyAclRepositoryInterface,
            usersRepository: IGenericRepositoryInterface<UsersModel>,
          ) => new NginxProxyAclAggregateRepository(proxyAclRepository, usersRepository),
        },
      ],
    }).compile();

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));

    repository = module.get<NginxProxyAclAggregateRepository>(NginxProxyAclAggregateRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe(`Get all acl`, () => {
    let selectUserId: string;

    let inputWithoutUserIdFilter: FilterModel<ProxyAclModel>;
    let inputWithUserIdFilter: FilterModel<ProxyAclModel>;

    let outputUserModel1: UsersModel;
    let outputUserModel2: UsersModel;
    let outputUserModel3: UsersModel;

    let outputProxyAclAllModel1: ProxyAclModel;
    let outputProxyAclUser1AllModel2: ProxyAclModel;
    let outputProxyAclUser2OnePortModel3: ProxyAclModel;
    let outputProxyAclUser3MultiplyPortModel4: ProxyAclModel;
    let outputProxyAclUser4OnePortModel5: ProxyAclModel;

    beforeEach(() => {
      selectUserId = '00000000-0000-0000-0000-333333333333';

      inputWithoutUserIdFilter = new FilterModel<ProxyAclModel>({skipPagination: true});
      inputWithUserIdFilter = new FilterModel<ProxyAclModel>({skipPagination: true});
      inputWithUserIdFilter.addCondition({
        $opr: 'eq',
        user: defaultModelFactory<UsersModel>(
          UsersModel,
          {
            id: selectUserId,
            username: 'default-username',
            password: 'default-password',
            insertDate: new Date(),
          },
          ['username', 'password', 'insertDate'],
        ),
      });

      outputUserModel1 = new UsersModel({
        id: '00000000-0000-0000-0000-111111111111',
        username: 'user1',
        password: 'pass1',
        isEnable: true,
        insertDate: new Date(),
      });
      outputUserModel2 = new UsersModel({
        id: '00000000-0000-0000-0000-222222222222',
        username: 'user2',
        password: 'pass2',
        isEnable: false,
        insertDate: new Date(),
      });
      outputUserModel3 = new UsersModel({
        id: selectUserId,
        username: 'user3',
        password: 'pass3',
        isEnable: true,
        insertDate: new Date(),
      });

      outputProxyAclAllModel1 = defaultModelFactory<ProxyAclModel>(
        ProxyAclModel,
        {
          id: '11111111-1111-1111-1111-111111111111',
          mode: ProxyAclMode.ALL,
          type: ProxyAclType.USER_PORT,
          proxies: [],
          insertDate: new Date(),
        },
        ['proxies'],
      );
      outputProxyAclUser1AllModel2 = defaultModelFactory<ProxyAclModel>(
        ProxyAclModel,
        {
          id: '11111111-1111-1111-1111-222222222222',
          mode: ProxyAclMode.ALL,
          type: ProxyAclType.USER_PORT,
          user: defaultModelFactory<UsersModel>(
            UsersModel,
            {
              id: outputUserModel1.id,
              username: outputUserModel1.username,
              password: 'default-password',
              insertDate: new Date(),
            },
            ['password', 'insertDate'],
          ),
          proxies: [],
          insertDate: new Date(),
        },
        ['proxies'],
      );
      outputProxyAclUser2OnePortModel3 = new ProxyAclModel({
        id: '11111111-1111-1111-1111-333333333333',
        mode: ProxyAclMode.CUSTOM,
        type: ProxyAclType.USER_PORT,
        user: defaultModelFactory<UsersModel>(
          UsersModel,
          {
            id: outputUserModel2.id,
            username: outputUserModel2.username,
            password: 'default-password',
            insertDate: new Date(),
          },
          ['password', 'insertDate'],
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
        ],
        insertDate: new Date(),
      });
      outputProxyAclUser3MultiplyPortModel4 = new ProxyAclModel({
        id: '11111111-1111-1111-1111-444444444444',
        mode: ProxyAclMode.CUSTOM,
        type: ProxyAclType.USER_PORT,
        user: defaultModelFactory<UsersModel>(
          UsersModel,
          {
            id: outputUserModel3.id,
            username: outputUserModel3.username,
            password: 'default-password',
            insertDate: new Date(),
          },
          ['password', 'insertDate'],
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
      });
      outputProxyAclUser4OnePortModel5 = new ProxyAclModel({
        id: '11111111-1111-1111-1111-555555555555',
        mode: ProxyAclMode.CUSTOM,
        type: ProxyAclType.USER_PORT,
        user: defaultModelFactory<UsersModel>(
          UsersModel,
          {
            id: '00000000-0000-0000-0000-444444444444',
            username: 'user-4',
            password: 'default-password',
            insertDate: new Date(),
          },
          ['password', 'insertDate'],
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
        ],
        insertDate: new Date(),
      });
    });

    it(`Should error get all acl when get acl data (No filter)`, async () => {
      proxyAclRepository.getAll.mockResolvedValue([new UnknownException()]);
      usersRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error] = await repository.getAll();

      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll.mock.calls[0][0].skipPagination).toEqual(true);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getLengthOfCondition()).toEqual(0);
      expect(usersRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>><unknown>usersRepository.getAll.mock.calls[0][0]).skipPagination).toEqual(true);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all acl when get user data (No filter)`, async () => {
      proxyAclRepository.getAll.mockResolvedValue([null, [], 0]);
      usersRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.getAll();

      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll.mock.calls[0][0].skipPagination).toEqual(true);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getLengthOfCondition()).toEqual(0);
      expect(usersRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>><unknown>usersRepository.getAll.mock.calls[0][0]).skipPagination).toEqual(true);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all acl when get acl data (Without user id filter)`, async () => {
      proxyAclRepository.getAll.mockResolvedValue([new UnknownException()]);
      usersRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error] = await repository.getAll(inputWithoutUserIdFilter);

      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll.mock.calls[0][0].skipPagination).toEqual(true);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getLengthOfCondition()).toEqual(0);
      expect(usersRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>><unknown>usersRepository.getAll.mock.calls[0][0]).skipPagination).toEqual(true);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all acl when get user data (Without user id filter)`, async () => {
      proxyAclRepository.getAll.mockResolvedValue([null, [], 0]);
      usersRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.getAll(inputWithoutUserIdFilter);

      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll.mock.calls[0][0].skipPagination).toEqual(true);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getLengthOfCondition()).toEqual(0);
      expect(usersRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>><unknown>usersRepository.getAll.mock.calls[0][0]).skipPagination).toEqual(true);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all acl when get user data (With user id filter)`, async () => {
      proxyAclRepository.getAll.mockResolvedValue([null, [], 0]);
      usersRepository.getById.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.getAll(inputWithUserIdFilter);

      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll.mock.calls[0][0].skipPagination).toEqual(true);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getLengthOfCondition()).toEqual(1);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getCondition('user').user.id).toEqual(selectUserId);
      expect(usersRepository.getById).toHaveBeenCalled();
      expect(usersRepository.getById).toHaveBeenCalledWith(selectUserId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get all acl and not found any acl data (No filter)`, async () => {
      proxyAclRepository.getAll.mockResolvedValue([null, [], 0]);
      usersRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result, total] = await repository.getAll();

      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll.mock.calls[0][0].skipPagination).toEqual(true);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getLengthOfCondition()).toEqual(0);
      expect(usersRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>><unknown>usersRepository.getAll.mock.calls[0][0]).skipPagination).toEqual(true);
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
      expect(total).toEqual(0);
    });

    it(`Should successfully get all acl and not found any acl data (Without user id filter)`, async () => {
      proxyAclRepository.getAll.mockResolvedValue([null, [], 0]);
      usersRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result, total] = await repository.getAll(inputWithoutUserIdFilter);

      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll.mock.calls[0][0].skipPagination).toEqual(true);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getLengthOfCondition()).toEqual(0);
      expect(usersRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>><unknown>usersRepository.getAll.mock.calls[0][0]).skipPagination).toEqual(true);
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
      expect(total).toEqual(0);
    });

    it(`Should successfully get all acl and not found any acl data (With user id filter)`, async () => {
      proxyAclRepository.getAll.mockResolvedValue([null, [], 0]);
      usersRepository.getById.mockResolvedValue([null, null]);

      const [error, result, total] = await repository.getAll(inputWithUserIdFilter);

      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll.mock.calls[0][0].skipPagination).toEqual(true);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getLengthOfCondition()).toEqual(1);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getCondition('user').user.id).toEqual(selectUserId);
      expect(usersRepository.getById).toHaveBeenCalled();
      expect(usersRepository.getById).toHaveBeenCalledWith(selectUserId);
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
      expect(total).toEqual(0);
    });

    it(`Should successfully get all acl and not found any acl data when user not found (With user id filter)`, async () => {
      proxyAclRepository.getAll.mockResolvedValue([null, [outputProxyAclAllModel1], 1]);
      usersRepository.getById.mockResolvedValue([null, null]);

      const [error, result, total] = await repository.getAll(inputWithUserIdFilter);

      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll.mock.calls[0][0].skipPagination).toEqual(true);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getLengthOfCondition()).toEqual(1);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getCondition('user').user.id).toEqual(selectUserId);
      expect(usersRepository.getById).toHaveBeenCalled();
      expect(usersRepository.getById).toHaveBeenCalledWith(selectUserId);
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
      expect(total).toEqual(0);
    });

    it(`Should successfully get all acl (No filter)`, async () => {
      proxyAclRepository.getAll.mockResolvedValue([
        null,
        [
          outputProxyAclAllModel1,
          outputProxyAclUser1AllModel2,
          outputProxyAclUser2OnePortModel3,
          outputProxyAclUser3MultiplyPortModel4,
          outputProxyAclUser4OnePortModel5,
        ],
        5,
      ]);
      usersRepository.getAll.mockResolvedValue([
        null,
        [outputUserModel1, outputUserModel2, outputUserModel3],
        0,
      ]);
      (<jest.Mock>filterAndSortProxyAcl).mockReturnValue([
        [
          defaultModelFactory<ProxyAclModel>(
            ProxyAclModel,
            {
              id: outputProxyAclAllModel1.id,
              mode: outputProxyAclAllModel1.mode,
              type: outputProxyAclAllModel1.type,
              proxies: [],
              insertDate: new Date(),
            },
            ['proxies'],
          ),
          defaultModelFactory<ProxyAclModel>(
            ProxyAclModel,
            {
              id: outputProxyAclUser1AllModel2.id,
              mode: outputProxyAclUser1AllModel2.mode,
              type: outputProxyAclUser1AllModel2.type,
              user: outputUserModel1,
              proxies: [],
              insertDate: new Date(),
            },
            ['proxies'],
          ),
          new ProxyAclModel({
            id: outputProxyAclUser2OnePortModel3.id,
            mode: outputProxyAclUser2OnePortModel3.mode,
            type: outputProxyAclUser2OnePortModel3.type,
            user: outputUserModel2,
            proxies: outputProxyAclUser2OnePortModel3.proxies,
            insertDate: new Date(),
          }),
          new ProxyAclModel({
            id: outputProxyAclUser3MultiplyPortModel4.id,
            mode: outputProxyAclUser3MultiplyPortModel4.mode,
            type: outputProxyAclUser3MultiplyPortModel4.type,
            user: outputUserModel3,
            proxies: outputProxyAclUser3MultiplyPortModel4.proxies,
            insertDate: new Date(),
          }),
          outputProxyAclUser4OnePortModel5,
        ],
        5,
      ]);

      const [error, result, total] = await repository.getAll();

      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll.mock.calls[0][0].skipPagination).toEqual(true);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getLengthOfCondition()).toEqual(0);
      expect(usersRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>><unknown>usersRepository.getAll.mock.calls[0][0]).skipPagination).toEqual(true);
      expect(filterAndSortProxyAcl).toHaveBeenCalled();
      expect((<jest.Mock>filterAndSortProxyAcl).mock.calls[0][0][0]).toEqual(defaultModelFactory<ProxyAclModel>(
        ProxyAclModel,
        {
          id: outputProxyAclAllModel1.id,
          mode: outputProxyAclAllModel1.mode,
          type: outputProxyAclAllModel1.type,
          proxies: [],
          insertDate: new Date(),
        },
        ['proxies'],
      ));
      expect((<jest.Mock>filterAndSortProxyAcl).mock.calls[0][0][1]).toEqual(defaultModelFactory<ProxyAclModel>(
        ProxyAclModel,
        {
          id: outputProxyAclUser1AllModel2.id,
          mode: outputProxyAclUser1AllModel2.mode,
          type: outputProxyAclUser1AllModel2.type,
          user: outputUserModel1,
          proxies: [],
          insertDate: new Date(),
        },
        ['proxies'],
      ));
      expect((<jest.Mock>filterAndSortProxyAcl).mock.calls[0][0][2]).toEqual(new ProxyAclModel({
        id: outputProxyAclUser2OnePortModel3.id,
        mode: outputProxyAclUser2OnePortModel3.mode,
        type: outputProxyAclUser2OnePortModel3.type,
        user: outputUserModel2,
        proxies: outputProxyAclUser2OnePortModel3.proxies,
        insertDate: new Date(),
      }));
      expect((<jest.Mock>filterAndSortProxyAcl).mock.calls[0][0][3]).toEqual(new ProxyAclModel({
        id: outputProxyAclUser3MultiplyPortModel4.id,
        mode: outputProxyAclUser3MultiplyPortModel4.mode,
        type: outputProxyAclUser3MultiplyPortModel4.type,
        user: outputUserModel3,
        proxies: outputProxyAclUser3MultiplyPortModel4.proxies,
        insertDate: new Date(),
      }));
      expect((<jest.Mock>filterAndSortProxyAcl).mock.calls[0][0][4]).toEqual(outputProxyAclUser4OnePortModel5);
      expect(error).toBeNull();
      expect(result).toHaveLength(5);
      expect(total).toEqual(5);
    });

    it(`Should successfully get all acl (Without user id filter)`, async () => {
      proxyAclRepository.getAll.mockResolvedValue([
        null,
        [
          outputProxyAclAllModel1,
          outputProxyAclUser1AllModel2,
          outputProxyAclUser2OnePortModel3,
          outputProxyAclUser3MultiplyPortModel4,
          outputProxyAclUser4OnePortModel5,
        ],
        5,
      ]);
      usersRepository.getAll.mockResolvedValue([
        null,
        [outputUserModel1, outputUserModel2, outputUserModel3],
        0,
      ]);
      (<jest.Mock>filterAndSortProxyAcl).mockReturnValue([
        [
          defaultModelFactory<ProxyAclModel>(
            ProxyAclModel,
            {
              id: outputProxyAclAllModel1.id,
              mode: outputProxyAclAllModel1.mode,
              type: outputProxyAclAllModel1.type,
              proxies: [],
              insertDate: new Date(),
            },
            ['proxies'],
          ),
          defaultModelFactory<ProxyAclModel>(
            ProxyAclModel,
            {
              id: outputProxyAclUser1AllModel2.id,
              mode: outputProxyAclUser1AllModel2.mode,
              type: outputProxyAclUser1AllModel2.type,
              user: outputUserModel1,
              proxies: [],
              insertDate: new Date(),
            },
            ['proxies'],
          ),
          new ProxyAclModel({
            id: outputProxyAclUser2OnePortModel3.id,
            mode: outputProxyAclUser2OnePortModel3.mode,
            type: outputProxyAclUser2OnePortModel3.type,
            user: outputUserModel2,
            proxies: outputProxyAclUser2OnePortModel3.proxies,
            insertDate: new Date(),
          }),
          new ProxyAclModel({
            id: outputProxyAclUser3MultiplyPortModel4.id,
            mode: outputProxyAclUser3MultiplyPortModel4.mode,
            type: outputProxyAclUser3MultiplyPortModel4.type,
            user: outputUserModel3,
            proxies: outputProxyAclUser3MultiplyPortModel4.proxies,
            insertDate: new Date(),
          }),
          outputProxyAclUser4OnePortModel5,
        ],
        5,
      ]);

      const [error, result, total] = await repository.getAll(inputWithoutUserIdFilter);

      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll.mock.calls[0][0].skipPagination).toEqual(true);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getLengthOfCondition()).toEqual(0);
      expect(usersRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<UsersModel>><unknown>usersRepository.getAll.mock.calls[0][0]).skipPagination).toEqual(true);
      expect(filterAndSortProxyAcl).toHaveBeenCalled();
      expect((<jest.Mock>filterAndSortProxyAcl).mock.calls[0][0][0]).toEqual(defaultModelFactory<ProxyAclModel>(
        ProxyAclModel,
        {
          id: outputProxyAclAllModel1.id,
          mode: outputProxyAclAllModel1.mode,
          type: outputProxyAclAllModel1.type,
          proxies: [],
          insertDate: new Date(),
        },
        ['proxies'],
      ));
      expect((<jest.Mock>filterAndSortProxyAcl).mock.calls[0][0][1]).toEqual(defaultModelFactory<ProxyAclModel>(
        ProxyAclModel,
        {
          id: outputProxyAclUser1AllModel2.id,
          mode: outputProxyAclUser1AllModel2.mode,
          type: outputProxyAclUser1AllModel2.type,
          user: outputUserModel1,
          proxies: [],
          insertDate: new Date(),
        },
        ['proxies'],
      ));
      expect((<jest.Mock>filterAndSortProxyAcl).mock.calls[0][0][2]).toEqual(new ProxyAclModel({
        id: outputProxyAclUser2OnePortModel3.id,
        mode: outputProxyAclUser2OnePortModel3.mode,
        type: outputProxyAclUser2OnePortModel3.type,
        user: outputUserModel2,
        proxies: outputProxyAclUser2OnePortModel3.proxies,
        insertDate: new Date(),
      }));
      expect((<jest.Mock>filterAndSortProxyAcl).mock.calls[0][0][3]).toEqual(new ProxyAclModel({
        id: outputProxyAclUser3MultiplyPortModel4.id,
        mode: outputProxyAclUser3MultiplyPortModel4.mode,
        type: outputProxyAclUser3MultiplyPortModel4.type,
        user: outputUserModel3,
        proxies: outputProxyAclUser3MultiplyPortModel4.proxies,
        insertDate: new Date(),
      }));
      expect((<jest.Mock>filterAndSortProxyAcl).mock.calls[0][0][4]).toEqual(outputProxyAclUser4OnePortModel5);
      expect(error).toBeNull();
      expect(result).toHaveLength(5);
      expect(total).toEqual(5);
    });

    it(`Should successfully get all acl (With user id filter)`, async () => {
      proxyAclRepository.getAll.mockResolvedValue([
        null,
        [
          outputProxyAclAllModel1,
          outputProxyAclUser1AllModel2,
          outputProxyAclUser2OnePortModel3,
          outputProxyAclUser3MultiplyPortModel4,
          outputProxyAclUser4OnePortModel5,
        ],
        5,
      ]);
      usersRepository.getById.mockResolvedValue([null, outputUserModel3]);
      (<jest.Mock>filterAndSortProxyAcl).mockReturnValue([
        [
          defaultModelFactory<ProxyAclModel>(
            ProxyAclModel,
            {
              id: outputProxyAclAllModel1.id,
              mode: outputProxyAclAllModel1.mode,
              type: outputProxyAclAllModel1.type,
              proxies: [],
              insertDate: new Date(),
            },
            ['proxies'],
          ),
          new ProxyAclModel({
            id: outputProxyAclUser3MultiplyPortModel4.id,
            mode: outputProxyAclUser3MultiplyPortModel4.mode,
            type: outputProxyAclUser3MultiplyPortModel4.type,
            user: outputUserModel3,
            proxies: outputProxyAclUser3MultiplyPortModel4.proxies,
            insertDate: new Date(),
          }),
        ],
        2,
      ]);

      const [error, result, total] = await repository.getAll(inputWithUserIdFilter);

      expect(proxyAclRepository.getAll).toHaveBeenCalled();
      expect(proxyAclRepository.getAll.mock.calls[0][0].skipPagination).toEqual(true);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getLengthOfCondition()).toEqual(1);
      expect(proxyAclRepository.getAll.mock.calls[0][0].getCondition('user').user.id).toEqual(selectUserId);
      expect(usersRepository.getById).toHaveBeenCalled();
      expect(usersRepository.getById).toHaveBeenCalledWith(selectUserId);
      expect(filterAndSortProxyAcl).toHaveBeenCalled();
      expect((<jest.Mock>filterAndSortProxyAcl).mock.calls[0][0][0]).toEqual(defaultModelFactory<ProxyAclModel>(
        ProxyAclModel,
        {
          id: outputProxyAclAllModel1.id,
          mode: outputProxyAclAllModel1.mode,
          type: outputProxyAclAllModel1.type,
          proxies: [],
          insertDate: new Date(),
        },
        ['proxies'],
      ));
      expect((<jest.Mock>filterAndSortProxyAcl).mock.calls[0][0][3]).toEqual(new ProxyAclModel({
        id: outputProxyAclUser3MultiplyPortModel4.id,
        mode: outputProxyAclUser3MultiplyPortModel4.mode,
        type: outputProxyAclUser3MultiplyPortModel4.type,
        user: outputUserModel3,
        proxies: outputProxyAclUser3MultiplyPortModel4.proxies,
        insertDate: new Date(),
      }));
      expect(error).toBeNull();
      expect(result).toHaveLength(2);
      expect(total).toEqual(2);
    });
  });

  describe(`Create new acl proxy`, () => {
    let inputCreateAccessAllUsersToAllPorts: ProxyAclModel;

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

      outputAccessAllUsersToAllPorts = new ProxyAclModel({
        id: identifierMock.generateId(),
        mode: ProxyAclMode.ALL,
        type: ProxyAclType.USER_PORT,
        proxies: [],
        insertDate: new Date(),
      });
    });

    it(`Should error create new acl proxy`, async () => {
      proxyAclRepository.create.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.create(inputCreateAccessAllUsersToAllPorts);

      expect(proxyAclRepository.create).toHaveBeenCalled();
      expect(proxyAclRepository.create).toHaveBeenCalledWith(inputCreateAccessAllUsersToAllPorts);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully create new acl proxy`, async () => {
      proxyAclRepository.create.mockResolvedValue([null, outputAccessAllUsersToAllPorts]);

      const [error, result] = await repository.create(inputCreateAccessAllUsersToAllPorts);

      expect(proxyAclRepository.create).toHaveBeenCalled();
      expect(proxyAclRepository.create).toHaveBeenCalledWith(inputCreateAccessAllUsersToAllPorts);
      expect(error).toBeNull();
      expect(result).toEqual(outputAccessAllUsersToAllPorts);
    });
  });
});
