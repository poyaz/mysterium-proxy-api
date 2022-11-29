import {Test, TestingModule} from '@nestjs/testing';
import {UsersFavoritesHttpController} from './users-favorites-http.controller';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {IFavoritesServiceInterface} from '@src-core/interface/i-favorites-service.interface';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {FindUsersFavoritesQueryDto} from '@src-api/http/controller/users-favorites/dto/find-users-favorites-query.dto';
import {FavoritesListTypeEnum, FavoritesModel} from '@src-core/model/favorites.model';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {FilterModel} from '@src-core/model/filter.model';
import {ProxyDownstreamModel, ProxyStatusEnum, ProxyTypeEnum} from '@src-core/model/proxy.model';
import {CreateUsersFavoritesBulkInputDto} from '@src-api/http/controller/users-favorites/dto/create-users-favorites-bulk-input.dto';
import {defaultModelType} from '@src-core/model/defaultModel';
import {UsersProxyModel} from '@src-core/model/users-proxy.model';
import {UpdateUsersFavoritesInputDto} from '@src-api/http/controller/users-favorites/dto/update-users-favorites-input.dto';
import {UpdateModel} from '@src-core/model/update.model';

describe('UsersFavoritesHttpController', () => {
  let controller: UsersFavoritesHttpController;
  let favoritesService: MockProxy<IFavoritesServiceInterface>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    favoritesService = mock<IFavoritesServiceInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersFavoritesHttpController],
      providers: [
        {
          provide: ProviderTokenEnum.FAVORITES_SERVICE_DEFAULT,
          useValue: favoritesService,
        },
      ],
    }).compile();

    controller = module.get<UsersFavoritesHttpController>(UsersFavoritesHttpController);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe(`Find favorites by user id`, () => {
    let inputUserId: string;
    let inputFilter: FindUsersFavoritesQueryDto;
    let inputFilterWithKind: FindUsersFavoritesQueryDto;

    let outputFavoritesModel1: FavoritesModel;

    beforeEach(() => {
      inputUserId = identifierMock.generateId();

      inputFilter = new FindUsersFavoritesQueryDto();

      inputFilterWithKind = new FindUsersFavoritesQueryDto();
      inputFilterWithKind.filters = {kind: FavoritesListTypeEnum.FAVORITE};

      outputFavoritesModel1 = new FavoritesModel({
        id: identifierMock.generateId(),
        kind: FavoritesListTypeEnum.FAVORITE,
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
        note: 'This is a note',
        insertDate: new Date(),
      });
    });

    it(`Should error find favorites by user id (Without filter)`, async () => {
      favoritesService.getByUserId.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.findByUserId(inputUserId, inputFilter);

      expect(favoritesService.getByUserId).toHaveBeenCalled();
      expect(favoritesService.getByUserId).toHaveBeenCalledWith(inputUserId, new FilterModel());
      expect(favoritesService.getByUserId.mock.calls[0][1].getConditionList()).toHaveLength(0);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error find favorites by user id (With filter)`, async () => {
      favoritesService.getByUserId.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.findByUserId(inputUserId, inputFilterWithKind);

      expect(favoritesService.getByUserId).toHaveBeenCalled();
      expect(favoritesService.getByUserId.mock.calls[0][1].getConditionList()).toHaveLength(1);
      expect(favoritesService.getByUserId.mock.calls[0][1].getCondition('kind')).toEqual({
        $opr: 'eq',
        kind: inputFilterWithKind.filters.kind,
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully find favorites by user id (With filter)`, async () => {
      favoritesService.getByUserId.mockResolvedValue([null, [outputFavoritesModel1], 1]);

      const [error, result, total] = await controller.findByUserId(inputUserId, inputFilterWithKind);

      expect(favoritesService.getByUserId).toHaveBeenCalled();
      expect(favoritesService.getByUserId.mock.calls[0][1].getConditionList()).toHaveLength(1);
      expect(favoritesService.getByUserId.mock.calls[0][1].getCondition('kind')).toEqual({
        $opr: 'eq',
        kind: inputFilterWithKind.filters.kind,
      });
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(outputFavoritesModel1);
      expect(total).toEqual(1);
    });
  });

  describe(`Create bulk favorites for user id`, () => {
    let inputUserId: string;
    let inputBody: CreateUsersFavoritesBulkInputDto;

    let outputFavoritesModel1: FavoritesModel;

    beforeEach(() => {
      inputUserId = identifierMock.generateId();

      inputBody = new CreateUsersFavoritesBulkInputDto();
      inputBody.kind = FavoritesListTypeEnum.FAVORITE;
      inputBody.bulk = [
        {
          proxyId: identifierMock.generateId(),
          note: 'This is a note',
        },
      ];

      outputFavoritesModel1 = new FavoritesModel({
        id: identifierMock.generateId(),
        kind: FavoritesListTypeEnum.FAVORITE,
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
        note: 'This is a note',
        insertDate: new Date(),
      });
    });

    it(`Should error create bulk favorites for user id`, async () => {
      favoritesService.createBulk.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.createBulkByUserId(inputUserId, inputBody);

      expect(favoritesService.createBulk).toHaveBeenCalled();
      expect(favoritesService.createBulk.mock.calls[0][0]).toHaveLength(1);
      expect(favoritesService.createBulk.mock.calls[0][0][0]).toEqual<Omit<defaultModelType<FavoritesModel>, 'isDefaultProperty' | 'getDefaultProperties' | 'clone'> & { _defaultProperties: Array<keyof FavoritesModel> }>({
        id: expect.anything(),
        kind: inputBody.kind,
        usersProxy: <defaultModelType<UsersProxyModel> & { _defaultProperties: Array<keyof UsersProxyModel> }>{
          id: inputBody.bulk[0].proxyId,
          listenAddr: 'default-listen-addr',
          listenPort: 3128,
          proxyDownstream: [],
          user: {
            id: 'default-id',
            username: 'default-username',
            password: 'default-password',
          },
          insertDate: new Date(),
          IS_DEFAULT_MODEL: true,
          _defaultProperties: ['listenAddr', 'listenPort', 'proxyDownstream', 'user', 'insertDate'],
        },
        note: inputBody.bulk[0].note,
        insertDate: new Date(),
        IS_DEFAULT_MODEL: true,
        _defaultProperties: ['id', 'insertDate'],
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully create bulk favorites for user id`, async () => {
      favoritesService.createBulk.mockResolvedValue([null, [outputFavoritesModel1], 1]);

      const [error, result, total] = await controller.createBulkByUserId(inputUserId, inputBody);

      expect(favoritesService.createBulk).toHaveBeenCalled();
      expect(favoritesService.createBulk.mock.calls[0][0]).toHaveLength(1);
      expect(favoritesService.createBulk.mock.calls[0][0][0]).toEqual<Omit<defaultModelType<FavoritesModel>, 'isDefaultProperty' | 'getDefaultProperties' | 'clone'> & { _defaultProperties: Array<keyof FavoritesModel> }>({
        id: expect.anything(),
        kind: inputBody.kind,
        usersProxy: <defaultModelType<UsersProxyModel> & { _defaultProperties: Array<keyof UsersProxyModel> }>{
          id: inputBody.bulk[0].proxyId,
          listenAddr: 'default-listen-addr',
          listenPort: 3128,
          proxyDownstream: [],
          user: {
            id: 'default-id',
            username: 'default-username',
            password: 'default-password',
          },
          insertDate: new Date(),
          IS_DEFAULT_MODEL: true,
          _defaultProperties: ['listenAddr', 'listenPort', 'proxyDownstream', 'user', 'insertDate'],
        },
        note: inputBody.bulk[0].note,
        insertDate: new Date(),
        IS_DEFAULT_MODEL: true,
        _defaultProperties: ['id', 'insertDate'],
      });
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(outputFavoritesModel1);
      expect(total).toEqual(1);
    });
  });

  describe(`Update favorite by user id`, () => {
    let inputUserId: string;
    let inputFavoriteId: string;
    let inputBody: UpdateUsersFavoritesInputDto;

    beforeEach(() => {
      inputUserId = identifierMock.generateId();

      inputFavoriteId = identifierMock.generateId();

      inputBody = new UpdateUsersFavoritesInputDto();
      inputBody.kind = FavoritesListTypeEnum.FAVORITE;
      inputBody.note = 'This is a note';
    });

    it(`Should error favorite by user id`, async () => {
      favoritesService.update.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.updateByUserId(inputUserId, inputFavoriteId, inputBody);

      expect(favoritesService.update).toHaveBeenCalled();
      expect(favoritesService.update).toHaveBeenCalledWith(new UpdateModel<FavoritesModel>(inputFavoriteId, {
        kind: inputBody.kind,
        note: inputBody.note,
      }));
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully favorite by user id`, async () => {
      favoritesService.update.mockResolvedValue([null, null]);

      const [error, result] = await controller.updateByUserId(inputUserId, inputFavoriteId, inputBody);

      expect(favoritesService.update).toHaveBeenCalled();
      expect(favoritesService.update).toHaveBeenCalledWith(new UpdateModel<FavoritesModel>(inputFavoriteId, {
        kind: inputBody.kind,
        note: inputBody.note,
      }));
      expect(error).toBeNull();
      expect(result).toBeNull();
    });
  });
});
