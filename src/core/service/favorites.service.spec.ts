import {Test, TestingModule} from '@nestjs/testing';
import {FavoritesService} from './favorites.service';
import {mock, MockProxy} from 'jest-mock-extended';
import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {FavoritesListTypeEnum, FavoritesModel} from '@src-core/model/favorites.model';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {FilterModel} from '@src-core/model/filter.model';
import {IUsersServiceInterface} from '@src-core/interface/i-users-service.interface';
import {UsersModel} from '@src-core/model/users.model';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {defaultModelFactory} from '@src-core/model/defaultModel';
import {UsersProxyModel} from '@src-core/model/users-proxy.model';
import {ProxyDownstreamModel, ProxyStatusEnum, ProxyTypeEnum} from '@src-core/model/proxy.model';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let favoritesRepository: MockProxy<IGenericRepositoryInterface<FavoritesModel>>;
  let usersService: MockProxy<IUsersServiceInterface>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    favoritesRepository = mock<IGenericRepositoryInterface<FavoritesModel>>();
    usersService = mock<IUsersServiceInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const favoritesRepositoryProvider = 'favorites-repository';
    const usersServiceProvider = 'users-service';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: favoritesRepositoryProvider,
          useValue: favoritesRepository,
        },
        {
          provide: usersServiceProvider,
          useValue: usersService,
        },
        {
          provide: FavoritesService,
          inject: [favoritesRepositoryProvider, usersServiceProvider],
          useFactory: (
            favoritesRepository: IGenericRepositoryInterface<FavoritesModel>,
            usersService: IUsersServiceInterface,
          ) =>
            new FavoritesService(favoritesRepository, usersService),
        },
      ],
    }).compile();

    service = module.get<FavoritesService>(FavoritesService);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe(`Get favorites list by user id`, () => {
    let inputUserId: string;
    let inputFilter: FilterModel<FavoritesModel>;
    let outputUserModel: UsersModel;
    let outputUsersProxyMode: UsersProxyModel;
    let outputFavoritesModel1: FavoritesModel;

    beforeEach(() => {
      inputUserId = identifierMock.generateId();

      inputFilter = new FilterModel<FavoritesModel>();
      inputFilter.addCondition({$opr: 'eq', kind: FavoritesListTypeEnum.FAVORITE});

      outputUserModel = new UsersModel({
        id: identifierMock.generateId(),
        username: 'user1',
        password: 'pass1',
        insertDate: new Date(),
      });

      outputUsersProxyMode = new UsersProxyModel({
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

      outputFavoritesModel1 = new FavoritesModel({
        id: identifierMock.generateId(),
        usersProxy: outputUsersProxyMode,
        kind: FavoritesListTypeEnum.FAVORITE,
        note: 'This is a note',
        insertDate: new Date(),
      });
    });

    it(`Should error get favorites list by user id when get user info (Without filter)`, async () => {
      usersService.findOne.mockResolvedValue([new UnknownException()]);

      const [error] = await service.getByUserId(inputUserId);

      expect(usersService.findOne).toHaveBeenCalled();
      expect(usersService.findOne).toHaveBeenCalledWith(inputUserId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get favorites list by user id (Without filter)`, async () => {
      usersService.findOne.mockResolvedValue([null, outputUserModel]);
      favoritesRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.getByUserId(inputUserId);

      expect(usersService.findOne).toHaveBeenCalled();
      expect(usersService.findOne).toHaveBeenCalledWith(inputUserId);
      expect(favoritesRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<FavoritesModel>>favoritesRepository.getAll.mock.calls[0][0]).getConditionList()).toHaveLength(1);
      expect((<FilterModel<FavoritesModel>>favoritesRepository.getAll.mock.calls[0][0]).getCondition('usersProxy')).toEqual({
        $opr: 'eq',
        usersProxy: defaultModelFactory<UsersProxyModel>(
          UsersProxyModel,
          {
            id: 'default-id',
            listenAddr: 'default-listen-addr',
            listenPort: 0,
            user: {
              id: inputUserId,
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

    it(`Should error get favorites list by user id (With filter)`, async () => {
      usersService.findOne.mockResolvedValue([null, outputUserModel]);
      favoritesRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.getByUserId(inputUserId, inputFilter);

      expect(usersService.findOne).toHaveBeenCalled();
      expect(usersService.findOne).toHaveBeenCalledWith(inputUserId);
      expect(favoritesRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<FavoritesModel>>favoritesRepository.getAll.mock.calls[0][0]).getConditionList()).toHaveLength(2);
      expect((<FilterModel<FavoritesModel>>favoritesRepository.getAll.mock.calls[0][0]).getCondition('usersProxy')).toEqual({
        $opr: 'eq',
        usersProxy: defaultModelFactory<UsersProxyModel>(
          UsersProxyModel,
          {
            id: 'default-id',
            listenAddr: 'default-listen-addr',
            listenPort: 0,
            user: {
              id: inputUserId,
              username: 'default-username',
              password: 'default-password',
            },
            proxyDownstream: [],
            insertDate: new Date(),
          },
          ['id', 'listenAddr', 'listenPort', 'proxyDownstream', 'insertDate'],
        ),
      });
      expect((<FilterModel<FavoritesModel>>favoritesRepository.getAll.mock.calls[0][0]).getCondition('kind')).toEqual({
        $opr: 'eq',
        kind: FavoritesListTypeEnum.FAVORITE,
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get favorites list by user id (Without filter)`, async () => {
      usersService.findOne.mockResolvedValue([null, outputUserModel]);
      favoritesRepository.getAll.mockResolvedValue([null, [outputFavoritesModel1], 1]);

      const [error, result, total] = await service.getByUserId(inputUserId);

      expect(usersService.findOne).toHaveBeenCalled();
      expect(usersService.findOne).toHaveBeenCalledWith(inputUserId);
      expect(favoritesRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<FavoritesModel>>favoritesRepository.getAll.mock.calls[0][0]).getConditionList()).toHaveLength(1);
      expect((<FilterModel<FavoritesModel>>favoritesRepository.getAll.mock.calls[0][0]).getCondition('usersProxy')).toEqual({
        $opr: 'eq',
        usersProxy: defaultModelFactory<UsersProxyModel>(
          UsersProxyModel,
          {
            id: 'default-id',
            listenAddr: 'default-listen-addr',
            listenPort: 0,
            user: {
              id: inputUserId,
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
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(outputFavoritesModel1);
      expect(total).toEqual(1);
    });
  });

  describe(`Create bulk favorites`, () => {
    let inputModel1: FavoritesModel;
    let outputFavoritesModel1: FavoritesModel;

    beforeEach(() => {
      inputModel1 = defaultModelFactory<FavoritesModel>(
        FavoritesModel,
        {
          id: 'default-id',
          kind: FavoritesListTypeEnum.FAVORITE,
          usersProxy: defaultModelFactory<UsersProxyModel>(
            UsersProxyModel,
            {
              id: identifierMock.generateId(),
              listenAddr: 'default-listen-addr',
              listenPort: 3128,
              proxyDownstream: [],
              user: {
                id: identifierMock.generateId(),
                username: 'default-username',
                password: 'default-password',
              },
              insertDate: new Date(),
            },
            ['listenAddr', 'listenPort', 'proxyDownstream', 'insertDate'],
          ),
          note: 'This is a note',
          insertDate: new Date(),
        },
        ['id', 'insertDate'],
      );

      outputFavoritesModel1 = new FavoritesModel({
        id: identifierMock.generateId(),
        usersProxy: {
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
        },
        kind: FavoritesListTypeEnum.FAVORITE,
        note: 'This is a note',
        insertDate: new Date(),
      });
    });

    it(`Should error create bulk favorites list`, async () => {
      favoritesRepository.addBulk.mockResolvedValue([new UnknownException()]);

      const [error] = await service.createBulk([inputModel1]);

      expect(favoritesRepository.addBulk).toHaveBeenCalled();
      expect(favoritesRepository.addBulk).toHaveBeenCalledWith(expect.arrayContaining([inputModel1]));
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully create bulk favorites list`, async () => {
      favoritesRepository.addBulk.mockResolvedValue([null, [outputFavoritesModel1], 1]);

      const [error, result, total] = await service.createBulk([inputModel1]);

      expect(favoritesRepository.addBulk).toHaveBeenCalled();
      expect(favoritesRepository.addBulk).toHaveBeenCalledWith(expect.arrayContaining([inputModel1]));
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(outputFavoritesModel1);
      expect(total).toEqual(1);
    });
  });
});
