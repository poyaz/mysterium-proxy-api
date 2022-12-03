import {FavoritesAggregateRepository} from './favorites-aggregate.repository';
import {mock, MockProxy} from 'jest-mock-extended';
import {Test, TestingModule} from '@nestjs/testing';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {FavoritesListTypeEnum, FavoritesModel} from '@src-core/model/favorites.model';
import {IUsersProxyRepositoryInterface} from '@src-core/interface/i-users-proxy-repository.interface';
import {UsersProxyModel} from '@src-core/model/users-proxy.model';
import {UsersModel} from '@src-core/model/users.model';
import {FilterModel} from '@src-core/model/filter.model';
import {defaultModelFactory} from '@src-core/model/defaultModel';
import {ProxyDownstreamModel, ProxyStatusEnum, ProxyTypeEnum} from '@src-core/model/proxy.model';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {filterAndSortFavorites} from '@src-infrastructure/utility/filterAndSortFavorites';

jest.mock('@src-infrastructure/utility/filterAndSortFavorites');

describe('FavoritesAggregateRepository', () => {
  let repository: FavoritesAggregateRepository;
  let favoritesDbRepository: MockProxy<IGenericRepositoryInterface<FavoritesModel>>;
  let usersProxyRepository: MockProxy<IUsersProxyRepositoryInterface>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    favoritesDbRepository = mock<IGenericRepositoryInterface<FavoritesModel>>();
    usersProxyRepository = mock<IUsersProxyRepositoryInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const favoritesDbRepositoryProvider = 'favorite-db-repository';
    const usersProxyRepositoryProvider = 'users-proxy-repository';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: favoritesDbRepositoryProvider,
          useValue: favoritesDbRepository,
        },
        {
          provide: usersProxyRepositoryProvider,
          useValue: usersProxyRepository,
        },
        {
          provide: FavoritesAggregateRepository,
          inject: [favoritesDbRepositoryProvider, usersProxyRepositoryProvider],
          useFactory: (
            favoritesDbRepository: IGenericRepositoryInterface<FavoritesModel>,
            usersProxyRepository: IUsersProxyRepositoryInterface,
          ) =>
            new FavoritesAggregateRepository(favoritesDbRepository, usersProxyRepository),
        },
      ],
    }).compile();

    repository = module.get<FavoritesAggregateRepository>(FavoritesAggregateRepository);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe(`Get all favorites list`, () => {
    let inputFilterWithoutKind: FilterModel<FavoritesModel>;
    let inputFilterWithFavroriteKind: FilterModel<FavoritesModel>;
    let outputUserModel: UsersModel;
    let outputUsersProxyModel1: UsersProxyModel;
    let outputUsersProxyModel2: UsersProxyModel;
    let outputUsersProxyModel3: UsersProxyModel;
    let outputFavoritesDbModel1: FavoritesModel;
    let outputFavoritesDbModel2: FavoritesModel;
    let outputFavoritesModel1: FavoritesModel;
    let outputFavoritesModel2: FavoritesModel;
    let outputFavoritesModel3: FavoritesModel;

    beforeEach(() => {
      inputFilterWithoutKind = new FilterModel<FavoritesModel>();
      inputFilterWithoutKind.addCondition({
        $opr: 'eq',
        usersProxy: defaultModelFactory<UsersProxyModel>(
          UsersProxyModel,
          {
            id: 'default-id',
            listenAddr: 'default-listen-addr',
            listenPort: 0,
            user: {
              id: identifierMock.generateId(),
              username: 'default-username',
              password: 'default-password',
            },
            proxyDownstream: [],
            insertDate: new Date(),
          },
          ['id', 'listenAddr', 'listenPort', 'proxyDownstream', 'insertDate'],
        ),
      });

      inputFilterWithFavroriteKind = new FilterModel<FavoritesModel>();
      inputFilterWithFavroriteKind.addCondition({
        $opr: 'eq',
        usersProxy: defaultModelFactory<UsersProxyModel>(
          UsersProxyModel,
          {
            id: 'default-id',
            listenAddr: 'default-listen-addr',
            listenPort: 0,
            user: {
              id: identifierMock.generateId(),
              username: 'default-username',
              password: 'default-password',
            },
            proxyDownstream: [],
            insertDate: new Date(),
          },
          ['id', 'listenAddr', 'listenPort', 'proxyDownstream', 'insertDate'],
        ),
      });
      inputFilterWithFavroriteKind.addCondition({$opr: 'eq', kind: FavoritesListTypeEnum.FAVORITE});

      outputUserModel = new UsersModel({
        id: identifierMock.generateId(),
        username: 'user1',
        password: 'pass1',
        isEnable: true,
        insertDate: new Date(),
      });

      outputUsersProxyModel1 = new UsersProxyModel({
        user: {
          id: outputUserModel.id,
          username: outputUserModel.username,
          password: outputUserModel.password,
        },
        id: '11111111-1111-1111-1111-111111111111',
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
      outputUsersProxyModel2 = new UsersProxyModel({
        user: {
          id: outputUserModel.id,
          username: outputUserModel.username,
          password: outputUserModel.password,
        },
        id: '11111111-1111-1111-1111-222222222222',
        listenAddr: '26.110.20.6',
        listenPort: 3129,
        proxyDownstream: [
          new ProxyDownstreamModel({
            id: identifierMock.generateId(),
            refId: identifierMock.generateId(),
            ip: '65.23.45.13',
            mask: 32,
            country: 'GB',
            type: ProxyTypeEnum.MYST,
            status: ProxyStatusEnum.ONLINE,
          }),
        ],
        insertDate: new Date(),
      });
      outputUsersProxyModel3 = new UsersProxyModel({
        user: {
          id: outputUserModel.id,
          username: outputUserModel.username,
          password: outputUserModel.password,
        },
        id: '11111111-1111-1111-1111-333333333333',
        listenAddr: '26.110.20.6',
        listenPort: 3130,
        proxyDownstream: [
          new ProxyDownstreamModel({
            id: identifierMock.generateId(),
            refId: identifierMock.generateId(),
            ip: '65.23.45.14',
            mask: 32,
            country: 'GB',
            type: ProxyTypeEnum.MYST,
            status: ProxyStatusEnum.ONLINE,
          }),
        ],
        insertDate: new Date(),
      });

      outputFavoritesDbModel1 = new FavoritesModel({
        id: '22222222-2222-2222-2222-111111111111',
        kind: FavoritesListTypeEnum.FAVORITE,
        usersProxy: defaultModelFactory<UsersProxyModel>(
          UsersProxyModel,
          {
            id: outputUsersProxyModel1.id,
            listenAddr: 'default-listen-addr',
            listenPort: 0,
            proxyDownstream: [],
            user: {
              id: outputUserModel.id,
              username: outputUserModel.username,
              password: outputUserModel.password,
            },
            insertDate: new Date(),
          },
          ['listenAddr', 'listenPort', 'proxyDownstream', 'insertDate'],
        ),
        note: 'This is a note',
        insertDate: new Date(),
      });
      outputFavoritesDbModel2 = new FavoritesModel({
        id: '22222222-2222-2222-2222-222222222222',
        kind: FavoritesListTypeEnum.TODAY,
        usersProxy: defaultModelFactory<UsersProxyModel>(
          UsersProxyModel,
          {
            id: outputUsersProxyModel2.id,
            listenAddr: 'default-listen-addr',
            listenPort: 0,
            proxyDownstream: [],
            user: {
              id: outputUserModel.id,
              username: outputUserModel.username,
              password: outputUserModel.password,
            },
            insertDate: new Date(),
          },
          ['listenAddr', 'listenPort', 'proxyDownstream', 'insertDate'],
        ),
        note: 'This is a note',
        insertDate: new Date(),
      });

      outputFavoritesModel1 = new FavoritesModel({
        id: outputFavoritesDbModel1.id,
        kind: outputFavoritesDbModel1.kind,
        usersProxy: outputUsersProxyModel1,
        note: outputFavoritesDbModel1.note,
        insertDate: outputFavoritesDbModel1.insertDate,
      });
      outputFavoritesModel2 = new FavoritesModel({
        id: outputFavoritesDbModel2.id,
        kind: outputFavoritesDbModel2.kind,
        usersProxy: outputUsersProxyModel2,
        note: outputFavoritesDbModel2.note,
        insertDate: outputFavoritesDbModel2.insertDate,
      });
      outputFavoritesModel3 = new FavoritesModel({
        id: outputUsersProxyModel3.id,
        usersProxy: outputUsersProxyModel3,
        kind: FavoritesListTypeEnum.OTHER,
        insertDate: outputUsersProxyModel3.insertDate,
      });
    });

    it(`Should successfully get all favorites list and return empty records when filter not exist`, async () => {
      const [error, result, total] = await repository.getAll();

      expect(error).toBeNull();
      expect(result).toHaveLength(0);
      expect(total).toEqual(0);
    });

    it(`Should error get all favorites list when get users proxy list (Without kind)`, async () => {
      usersProxyRepository.getByUserId.mockResolvedValue([new UnknownException()]);
      favoritesDbRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error] = await repository.getAll(inputFilterWithoutKind);

      expect(usersProxyRepository.getByUserId).toHaveBeenCalled();
      expect(usersProxyRepository.getByUserId.mock.calls[0][0]).toEqual(inputFilterWithoutKind.getCondition('usersProxy').usersProxy.user.id);
      expect(usersProxyRepository.getByUserId.mock.calls[0][1].skipPagination).toEqual(true);
      expect(favoritesDbRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<FavoritesModel>>favoritesDbRepository.getAll.mock.calls[0][0]).skipPagination).toEqual(true);
      expect((<FilterModel<FavoritesModel>>favoritesDbRepository.getAll.mock.calls[0][0]).getConditionList()).toHaveLength(1);
      expect((<FilterModel<FavoritesModel>>favoritesDbRepository.getAll.mock.calls[0][0]).getCondition('usersProxy')).toEqual({
        $opr: 'eq',
        usersProxy: defaultModelFactory<UsersProxyModel>(
          UsersProxyModel,
          {
            id: 'default-id',
            listenAddr: 'default-listen-addr',
            listenPort: 0,
            user: {
              id: inputFilterWithoutKind.getCondition('usersProxy').usersProxy.user.id,
              username: 'default-username',
              password: 'default-password',
            },
            proxyDownstream: [],
            insertDate: new Date(),
          },
          ['id', 'listenAddr', 'listenPort', 'proxyDownstream', 'insertDate'],
        ),
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all favorites list when get users proxy list (With kind)`, async () => {
      usersProxyRepository.getByUserId.mockResolvedValue([null, [], 0]);
      favoritesDbRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.getAll(inputFilterWithFavroriteKind);

      expect(usersProxyRepository.getByUserId).toHaveBeenCalled();
      expect(usersProxyRepository.getByUserId.mock.calls[0][0]).toEqual(inputFilterWithFavroriteKind.getCondition('usersProxy').usersProxy.user.id);
      expect(usersProxyRepository.getByUserId.mock.calls[0][1].skipPagination).toEqual(true);
      expect(favoritesDbRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<FavoritesModel>>favoritesDbRepository.getAll.mock.calls[0][0]).skipPagination).toEqual(true);
      expect((<FilterModel<FavoritesModel>>favoritesDbRepository.getAll.mock.calls[0][0]).getConditionList()).toHaveLength(1);
      expect((<FilterModel<FavoritesModel>>favoritesDbRepository.getAll.mock.calls[0][0]).getCondition('usersProxy')).toEqual({
        $opr: 'eq',
        usersProxy: defaultModelFactory<UsersProxyModel>(
          UsersProxyModel,
          {
            id: 'default-id',
            listenAddr: 'default-listen-addr',
            listenPort: 0,
            user: {
              id: inputFilterWithFavroriteKind.getCondition('usersProxy').usersProxy.user.id,
              username: 'default-username',
              password: 'default-password',
            },
            proxyDownstream: [],
            insertDate: new Date(),
          },
          ['id', 'listenAddr', 'listenPort', 'proxyDownstream', 'insertDate'],
        ),
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get all favorites list and return empty records when not found any proxies (Without kind)`, async () => {
      usersProxyRepository.getByUserId.mockResolvedValue([null, [], 0]);
      favoritesDbRepository.getAll.mockResolvedValue([null, [outputFavoritesDbModel1], 1]);

      const [error, result, total] = await repository.getAll(inputFilterWithoutKind);

      expect(usersProxyRepository.getByUserId).toHaveBeenCalled();
      expect(usersProxyRepository.getByUserId.mock.calls[0][0]).toEqual(inputFilterWithoutKind.getCondition('usersProxy').usersProxy.user.id);
      expect(usersProxyRepository.getByUserId.mock.calls[0][1].skipPagination).toEqual(true);
      expect(favoritesDbRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<FavoritesModel>>favoritesDbRepository.getAll.mock.calls[0][0]).skipPagination).toEqual(true);
      expect((<FilterModel<FavoritesModel>>favoritesDbRepository.getAll.mock.calls[0][0]).getConditionList()).toHaveLength(1);
      expect((<FilterModel<FavoritesModel>>favoritesDbRepository.getAll.mock.calls[0][0]).getCondition('usersProxy')).toEqual({
        $opr: 'eq',
        usersProxy: defaultModelFactory<UsersProxyModel>(
          UsersProxyModel,
          {
            id: 'default-id',
            listenAddr: 'default-listen-addr',
            listenPort: 0,
            user: {
              id: inputFilterWithoutKind.getCondition('usersProxy').usersProxy.user.id,
              username: 'default-username',
              password: 'default-password',
            },
            proxyDownstream: [],
            insertDate: new Date(),
          },
          ['id', 'listenAddr', 'listenPort', 'proxyDownstream', 'insertDate'],
        ),
      });
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
      expect(total).toEqual(0);
    });

    it(`Should successfully get all favorites list and return empty records when not found any favorites (Without kind)`, async () => {
      usersProxyRepository.getByUserId.mockResolvedValue([null, [outputUsersProxyModel1], 1]);
      favoritesDbRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result, total] = await repository.getAll(inputFilterWithoutKind);

      expect(usersProxyRepository.getByUserId).toHaveBeenCalled();
      expect(usersProxyRepository.getByUserId.mock.calls[0][0]).toEqual(inputFilterWithoutKind.getCondition('usersProxy').usersProxy.user.id);
      expect(usersProxyRepository.getByUserId.mock.calls[0][1].skipPagination).toEqual(true);
      expect(favoritesDbRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<FavoritesModel>>favoritesDbRepository.getAll.mock.calls[0][0]).skipPagination).toEqual(true);
      expect((<FilterModel<FavoritesModel>>favoritesDbRepository.getAll.mock.calls[0][0]).getConditionList()).toHaveLength(1);
      expect((<FilterModel<FavoritesModel>>favoritesDbRepository.getAll.mock.calls[0][0]).getCondition('usersProxy')).toEqual({
        $opr: 'eq',
        usersProxy: defaultModelFactory<UsersProxyModel>(
          UsersProxyModel,
          {
            id: 'default-id',
            listenAddr: 'default-listen-addr',
            listenPort: 0,
            user: {
              id: inputFilterWithoutKind.getCondition('usersProxy').usersProxy.user.id,
              username: 'default-username',
              password: 'default-password',
            },
            proxyDownstream: [],
            insertDate: new Date(),
          },
          ['id', 'listenAddr', 'listenPort', 'proxyDownstream', 'insertDate'],
        ),
      });
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
      expect(total).toEqual(0);
    });

    it(`Should successfully get all favorites list (Without kind)`, async () => {
      usersProxyRepository.getByUserId.mockResolvedValue([
        null,
        [outputUsersProxyModel1, outputUsersProxyModel2, outputUsersProxyModel3],
        3,
      ]);
      favoritesDbRepository.getAll.mockResolvedValue([
        null,
        [outputFavoritesDbModel1, outputFavoritesDbModel2],
        2,
      ]);
      (<jest.Mock>filterAndSortFavorites).mockReturnValue([
        [outputFavoritesModel1, outputFavoritesModel2, outputFavoritesModel3],
        3,
      ]);

      const [error, result, total] = await repository.getAll(inputFilterWithoutKind);

      expect(usersProxyRepository.getByUserId).toHaveBeenCalled();
      expect(usersProxyRepository.getByUserId.mock.calls[0][0]).toEqual(inputFilterWithoutKind.getCondition('usersProxy').usersProxy.user.id);
      expect(usersProxyRepository.getByUserId.mock.calls[0][1].skipPagination).toEqual(true);
      expect(favoritesDbRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<FavoritesModel>>favoritesDbRepository.getAll.mock.calls[0][0]).skipPagination).toEqual(true);
      expect((<FilterModel<FavoritesModel>>favoritesDbRepository.getAll.mock.calls[0][0]).getConditionList()).toHaveLength(1);
      expect((<FilterModel<FavoritesModel>>favoritesDbRepository.getAll.mock.calls[0][0]).getCondition('usersProxy')).toEqual({
        $opr: 'eq',
        usersProxy: defaultModelFactory<UsersProxyModel>(
          UsersProxyModel,
          {
            id: 'default-id',
            listenAddr: 'default-listen-addr',
            listenPort: 0,
            user: {
              id: inputFilterWithoutKind.getCondition('usersProxy').usersProxy.user.id,
              username: 'default-username',
              password: 'default-password',
            },
            proxyDownstream: [],
            insertDate: new Date(),
          },
          ['id', 'listenAddr', 'listenPort', 'proxyDownstream', 'insertDate'],
        ),
      });
      expect(filterAndSortFavorites).toHaveBeenCalledWith(
        expect.arrayContaining([
          outputFavoritesModel1,
          outputFavoritesModel2,
          outputFavoritesModel3,
        ]),
        expect.anything(),
      );
      expect(error).toBeNull();
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(outputFavoritesModel1);
      expect(result[1]).toEqual(outputFavoritesModel2);
      expect(result[2]).toEqual(outputFavoritesModel3);
      expect(total).toEqual(3);
    });

    it(`Should successfully get all favorites list (With favorite kind)`, async () => {
      usersProxyRepository.getByUserId.mockResolvedValue([
        null,
        [outputUsersProxyModel1, outputUsersProxyModel2, outputUsersProxyModel3],
        3,
      ]);
      favoritesDbRepository.getAll.mockResolvedValue([
        null,
        [outputFavoritesDbModel1, outputFavoritesDbModel2],
        2,
      ]);
      (<jest.Mock>filterAndSortFavorites).mockReturnValue([[outputFavoritesModel1], 1]);

      const [error, result, total] = await repository.getAll(inputFilterWithFavroriteKind);

      expect(usersProxyRepository.getByUserId).toHaveBeenCalled();
      expect(usersProxyRepository.getByUserId.mock.calls[0][0]).toEqual(inputFilterWithFavroriteKind.getCondition('usersProxy').usersProxy.user.id);
      expect(usersProxyRepository.getByUserId.mock.calls[0][1].skipPagination).toEqual(true);
      expect(favoritesDbRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<FavoritesModel>>favoritesDbRepository.getAll.mock.calls[0][0]).skipPagination).toEqual(true);
      expect((<FilterModel<FavoritesModel>>favoritesDbRepository.getAll.mock.calls[0][0]).getConditionList()).toHaveLength(1);
      expect((<FilterModel<FavoritesModel>>favoritesDbRepository.getAll.mock.calls[0][0]).getCondition('usersProxy')).toEqual({
        $opr: 'eq',
        usersProxy: defaultModelFactory<UsersProxyModel>(
          UsersProxyModel,
          {
            id: 'default-id',
            listenAddr: 'default-listen-addr',
            listenPort: 0,
            user: {
              id: inputFilterWithFavroriteKind.getCondition('usersProxy').usersProxy.user.id,
              username: 'default-username',
              password: 'default-password',
            },
            proxyDownstream: [],
            insertDate: new Date(),
          },
          ['id', 'listenAddr', 'listenPort', 'proxyDownstream', 'insertDate'],
        ),
      });
      expect(filterAndSortFavorites).toHaveBeenCalledWith(
        expect.arrayContaining([
          outputFavoritesModel1,
          outputFavoritesModel2,
          outputFavoritesModel3,
        ]),
        expect.anything(),
      );
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(outputFavoritesModel1);
      expect(total).toEqual(1);
    });
  });
});