import {FavoritesPgRepository} from './favorites-pg.repository';
import {mock, MockProxy} from 'jest-mock-extended';
import {Repository} from 'typeorm';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {IDateTime} from '@src-core/interface/i-date-time.interface';
import {FavoritesEntity} from '@src-infrastructure/entity/favorites.entity';
import {Test, TestingModule} from '@nestjs/testing';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {getRepositoryToken} from '@nestjs/typeorm';
import {FilterModel, SortEnum} from '@src-core/model/filter.model';
import {FavoritesListTypeEnum, FavoritesModel} from '@src-core/model/favorites.model';
import {defaultModelFactory, defaultModelType} from '@src-core/model/defaultModel';
import {UsersProxyModel} from '@src-core/model/users-proxy.model';
import {UsersEntity} from '@src-infrastructure/entity/users.entity';
import {UserRoleEnum} from '@src-core/enum/user-role.enum';
import {FindManyOptions} from 'typeorm/find-options/FindManyOptions';
import {RepositoryException} from '@src-core/exception/repository.exception';

describe('FavoritesPgRepository', () => {
  let repository: FavoritesPgRepository;
  let favoriteDb: MockProxy<Repository<FavoritesEntity>>;
  let identifierMock: MockProxy<IIdentifier>;
  let identifierFakeMock: MockProxy<IIdentifier>;
  let dateTimeMock: MockProxy<IDateTime>;
  const defaultDate = new Date('2020-01-01');

  beforeEach(async () => {
    favoriteDb = mock<Repository<FavoritesEntity>>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    identifierFakeMock = mock<IIdentifier>();
    identifierFakeMock.generateId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    dateTimeMock = mock<IDateTime>();
    dateTimeMock.gregorianCurrentDateWithTimezone.mockReturnValue(defaultDate);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProviderTokenEnum.IDENTIFIER_UUID,
          useValue: identifierMock,
        },
        {
          provide: ProviderTokenEnum.DATE_TIME_DEFAULT,
          useValue: dateTimeMock,
        },
        {
          provide: getRepositoryToken(FavoritesEntity),
          useValue: favoriteDb,
        },
        {
          provide: FavoritesPgRepository,
          inject: [getRepositoryToken(FavoritesEntity), ProviderTokenEnum.IDENTIFIER_UUID, ProviderTokenEnum.DATE_TIME_DEFAULT],
          useFactory: (db: Repository<FavoritesEntity>, identifier: IIdentifier, dateTime: IDateTime) =>
            new FavoritesPgRepository(db, identifier, dateTime),
        },
      ],
    }).compile();

    repository = module.get<FavoritesPgRepository>(FavoritesPgRepository);

    jest.useFakeTimers().setSystemTime(defaultDate);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe(`Get all favorites list`, () => {
    let inputFilterByUserId: FilterModel<FavoritesModel>;
    let inputFilterByKind: FilterModel<FavoritesModel>;
    let inputFilterSortModel: FilterModel<FavoritesModel>;
    let outputFavoriteEntity1: FavoritesEntity;

    beforeEach(() => {
      inputFilterByUserId = new FilterModel<FavoritesModel>({skipPagination: true});
      inputFilterByUserId.addCondition({
        $opr: 'eq',
        usersProxy: defaultModelFactory<UsersProxyModel>(
          UsersProxyModel,
          {
            id: 'default-id',
            listenAddr: 'default-listen-addr',
            listenPort: 0,
            user: {
              id: identifierFakeMock.generateId(),
              username: 'default-username',
              password: 'default-password',
            },
            proxyDownstream: [],
            insertDate: new Date(),
          },
          ['id', 'listenAddr', 'listenPort', 'proxyDownstream', 'insertDate'],
        ),
      });

      inputFilterByKind = new FilterModel<FavoritesModel>({skipPagination: true});
      inputFilterByKind.addCondition({$opr: 'eq', kind: FavoritesListTypeEnum.FAVORITE});

      inputFilterSortModel = new FilterModel<FavoritesModel>();
      inputFilterSortModel.addSortBy({insertDate: SortEnum.ASC});

      outputFavoriteEntity1 = new FavoritesEntity();
      outputFavoriteEntity1.id = identifierFakeMock.generateId();
      outputFavoriteEntity1.user = new UsersEntity();
      outputFavoriteEntity1.user.id = identifierFakeMock.generateId();
      outputFavoriteEntity1.user.username = 'user1';
      outputFavoriteEntity1.user.password = 'pass1';
      outputFavoriteEntity1.user.role = UserRoleEnum.USER;
      outputFavoriteEntity1.user.isEnable = true;
      outputFavoriteEntity1.user.insertDate = new Date();
      outputFavoriteEntity1.kind = FavoritesListTypeEnum.FAVORITE;
      outputFavoriteEntity1.proxyId = identifierFakeMock.generateId();
      outputFavoriteEntity1.note = 'This is a note';
      outputFavoriteEntity1.insertDate = new Date();
      outputFavoriteEntity1.updateDate = null;
    });

    it(`Should error get all favorites list (Without filter)`, async () => {
      const executeError = new Error('Error in create on database');
      favoriteDb.findAndCount.mockRejectedValue(executeError);

      const [error] = await repository.getAll();

      expect(favoriteDb.findAndCount).toHaveBeenCalled();
      expect(favoriteDb.findAndCount).toBeCalledWith(expect.objectContaining(<FindManyOptions<FavoritesEntity>>{
        order: {insertDate: SortEnum.DESC},
      }));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error get all favorites list (With userId filter)`, async () => {
      const executeError = new Error('Error in create on database');
      favoriteDb.findAndCount.mockRejectedValue(executeError);

      const [error] = await repository.getAll(inputFilterByUserId);

      expect(favoriteDb.findAndCount).toHaveBeenCalled();
      expect(favoriteDb.findAndCount).toBeCalledWith(expect.objectContaining(<FindManyOptions<FavoritesEntity>>{
        where: [{user: {id: identifierFakeMock.generateId()}}],
        order: {insertDate: SortEnum.DESC},
      }));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error get all favorites list (With kind filter)`, async () => {
      const executeError = new Error('Error in create on database');
      favoriteDb.findAndCount.mockRejectedValue(executeError);

      const [error] = await repository.getAll(inputFilterByKind);

      expect(favoriteDb.findAndCount).toHaveBeenCalled();
      expect(favoriteDb.findAndCount).toBeCalledWith(expect.objectContaining(<FindManyOptions<FavoritesEntity>>{
        where: [{kind: FavoritesListTypeEnum.FAVORITE}],
        order: {insertDate: SortEnum.DESC},
      }));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error get all favorites list (With limited sort)`, async () => {
      const executeError = new Error('Error in create on database');
      favoriteDb.findAndCount.mockRejectedValue(executeError);

      const [error] = await repository.getAll(inputFilterSortModel);

      expect(favoriteDb.findAndCount).toHaveBeenCalled();
      expect(favoriteDb.findAndCount).toBeCalledWith(expect.objectContaining(<FindManyOptions<FavoritesEntity>>{
        order: {insertDate: SortEnum.DESC},
        skip: 0,
        take: 100,
      }));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should error get all favorites list (Without filter) and return empty records`, async () => {
      favoriteDb.findAndCount.mockResolvedValue([[], 0]);

      const [error, result, total] = await repository.getAll(inputFilterSortModel);

      expect(favoriteDb.findAndCount).toHaveBeenCalled();
      expect(favoriteDb.findAndCount).toBeCalledWith(expect.objectContaining(<FindManyOptions<FavoritesEntity>>{
        order: {insertDate: SortEnum.DESC},
      }));
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
      expect(total).toEqual(0);
    });

    it(`Should error get all favorites list (Without filter)`, async () => {
      favoriteDb.findAndCount.mockResolvedValue([[outputFavoriteEntity1], 1]);

      const [error, result, total] = await repository.getAll(inputFilterSortModel);

      expect(favoriteDb.findAndCount).toHaveBeenCalled();
      expect(favoriteDb.findAndCount).toBeCalledWith(expect.objectContaining(<FindManyOptions<FavoritesEntity>>{
        order: {insertDate: SortEnum.DESC},
      }));
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual<Omit<FavoritesModel, 'clone'>>({
        id: outputFavoriteEntity1.id,
        kind: FavoritesListTypeEnum.FAVORITE,
        usersProxy: <defaultModelType<UsersProxyModel> & { _defaultProperties: Array<keyof UsersProxyModel> }>{
          id: outputFavoriteEntity1.proxyId,
          listenAddr: expect.anything(),
          listenPort: expect.anything(),
          proxyDownstream: [],
          user: {
            id: outputFavoriteEntity1.user.id,
            username: outputFavoriteEntity1.user.username,
            password: outputFavoriteEntity1.user.password,
          },
          insertDate: expect.anything(),
          IS_DEFAULT_MODEL: true,
          _defaultProperties: ['listenAddr', 'listenPort', 'proxyDownstream', 'insertDate'],
        },
        note: outputFavoriteEntity1.note,
        insertDate: defaultDate,
        updateDate: null,
      });
      expect(total).toEqual(1);
    });
  });

  describe(`Get favorite by id`, () => {
    let inputFavoriteId: string;
    let outputFavoriteEntity: FavoritesEntity;

    beforeEach(() => {
      inputFavoriteId = identifierFakeMock.generateId();

      outputFavoriteEntity = new FavoritesEntity();
      outputFavoriteEntity.id = identifierFakeMock.generateId();
      outputFavoriteEntity.user = new UsersEntity();
      outputFavoriteEntity.user.id = identifierFakeMock.generateId();
      outputFavoriteEntity.user.username = 'user1';
      outputFavoriteEntity.user.password = 'pass1';
      outputFavoriteEntity.user.role = UserRoleEnum.USER;
      outputFavoriteEntity.user.isEnable = true;
      outputFavoriteEntity.user.insertDate = new Date();
      outputFavoriteEntity.kind = FavoritesListTypeEnum.FAVORITE;
      outputFavoriteEntity.proxyId = identifierFakeMock.generateId();
      outputFavoriteEntity.note = 'This is a note';
      outputFavoriteEntity.insertDate = new Date();
      outputFavoriteEntity.updateDate = null;
    });

    it(`Should error get favorite by id`, async () => {
      const executeError = new Error('Error in create on database');
      favoriteDb.findOneBy.mockRejectedValue(executeError);

      const [error] = await repository.getById(inputFavoriteId);

      expect(favoriteDb.findOneBy).toHaveBeenCalled();
      expect(favoriteDb.findOneBy).toBeCalledWith({id: inputFavoriteId});
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should successfully get favorite by id but can't find and return null`, async () => {
      favoriteDb.findOneBy.mockResolvedValue(null);

      const [error, result] = await repository.getById(inputFavoriteId);

      expect(favoriteDb.findOneBy).toHaveBeenCalled();
      expect(favoriteDb.findOneBy).toBeCalledWith({id: inputFavoriteId});
      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it(`Should successfully get favorite by id`, async () => {
      favoriteDb.findOneBy.mockResolvedValue(outputFavoriteEntity);

      const [error, result] = await repository.getById(inputFavoriteId);

      expect(favoriteDb.findOneBy).toHaveBeenCalled();
      expect(favoriteDb.findOneBy).toBeCalledWith({id: inputFavoriteId});
      expect(error).toBeNull();
      expect(result).toEqual<Omit<FavoritesModel, 'clone'>>({
        id: outputFavoriteEntity.id,
        kind: FavoritesListTypeEnum.FAVORITE,
        usersProxy: <defaultModelType<UsersProxyModel> & { _defaultProperties: Array<keyof UsersProxyModel> }>{
          id: outputFavoriteEntity.proxyId,
          listenAddr: expect.anything(),
          listenPort: expect.anything(),
          proxyDownstream: [],
          user: {
            id: outputFavoriteEntity.user.id,
            username: outputFavoriteEntity.user.username,
            password: outputFavoriteEntity.user.password,
          },
          insertDate: expect.anything(),
          IS_DEFAULT_MODEL: true,
          _defaultProperties: ['listenAddr', 'listenPort', 'proxyDownstream', 'insertDate'],
        },
        note: outputFavoriteEntity.note,
        insertDate: defaultDate,
        updateDate: null,
      });
    });
  });

  describe(`Add bulk favorites`, () => {
    let inputModel1: FavoritesModel;
    let outputFavoriteEntity1: FavoritesEntity;

    beforeEach(() => {
      inputModel1 = defaultModelFactory<FavoritesModel>(
        FavoritesModel,
        {
          id: 'default-id',
          kind: FavoritesListTypeEnum.FAVORITE,
          usersProxy: defaultModelFactory<UsersProxyModel>(
            UsersProxyModel,
            {
              id: identifierFakeMock.generateId(),
              listenAddr: 'default-listen-addr',
              listenPort: 3128,
              proxyDownstream: [],
              user: {
                id: identifierFakeMock.generateId(),
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

      outputFavoriteEntity1 = new FavoritesEntity();
      outputFavoriteEntity1.id = identifierFakeMock.generateId();
      outputFavoriteEntity1.user = new UsersEntity();
      outputFavoriteEntity1.user.id = identifierFakeMock.generateId();
      outputFavoriteEntity1.user.username = 'user1';
      outputFavoriteEntity1.user.password = 'pass1';
      outputFavoriteEntity1.user.role = UserRoleEnum.USER;
      outputFavoriteEntity1.user.isEnable = true;
      outputFavoriteEntity1.user.insertDate = new Date();
      outputFavoriteEntity1.kind = FavoritesListTypeEnum.FAVORITE;
      outputFavoriteEntity1.proxyId = identifierFakeMock.generateId();
      outputFavoriteEntity1.note = 'This is a note';
      outputFavoriteEntity1.insertDate = new Date();
      outputFavoriteEntity1.updateDate = null;
    });

    it(`Should error add bulk favorites`, async () => {
      const executeError = new Error('Error in create on database');
      favoriteDb.save.mockRejectedValue(executeError);

      const [error] = await repository.addBulk([inputModel1]);

      expect(identifierMock.generateId).toHaveBeenCalledTimes(1);
      expect(favoriteDb.save).toHaveBeenCalled();
      expect(favoriteDb.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          <FavoritesEntity>{
            id: identifierMock.generateId(),
            user: {id: inputModel1.usersProxy.user.id},
            kind: inputModel1.kind,
            proxyId: inputModel1.usersProxy.id,
            note: inputModel1.note,
            insertDate: defaultDate,
          },
        ]),
        {transaction: false},
      );
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
    });

    it(`Should successfully add bulk favorites`, async () => {
      favoriteDb.save.mockResolvedValue(<any>[outputFavoriteEntity1]);

      const [error, result, total] = await repository.addBulk([inputModel1]);

      expect(identifierMock.generateId).toHaveBeenCalledTimes(1);
      expect(favoriteDb.save).toHaveBeenCalled();
      expect(favoriteDb.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          <FavoritesEntity>{
            id: identifierMock.generateId(),
            user: {id: inputModel1.usersProxy.user.id},
            kind: inputModel1.kind,
            proxyId: inputModel1.usersProxy.id,
            note: inputModel1.note,
            insertDate: defaultDate,
          },
        ]),
        {transaction: false},
      );
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual<Omit<FavoritesModel, 'clone'>>({
        id: outputFavoriteEntity1.id,
        kind: FavoritesListTypeEnum.FAVORITE,
        usersProxy: <defaultModelType<UsersProxyModel> & { _defaultProperties: Array<keyof UsersProxyModel> }>{
          id: outputFavoriteEntity1.proxyId,
          listenAddr: expect.anything(),
          listenPort: expect.anything(),
          proxyDownstream: [],
          user: {
            id: outputFavoriteEntity1.user.id,
            username: outputFavoriteEntity1.user.username,
            password: outputFavoriteEntity1.user.password,
          },
          insertDate: expect.anything(),
          IS_DEFAULT_MODEL: true,
          _defaultProperties: ['listenAddr', 'listenPort', 'proxyDownstream', 'insertDate'],
        },
        note: outputFavoriteEntity1.note,
        insertDate: defaultDate,
        updateDate: null,
      });
      expect(total).toEqual(1);
    });
  });
});
