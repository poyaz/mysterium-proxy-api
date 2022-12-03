import {FilterModel, SortEnum} from '@src-core/model/filter.model';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {ProxyDownstreamModel, ProxyStatusEnum, ProxyTypeEnum} from '@src-core/model/proxy.model';
import {filterAndSortFavorites} from '@src-infrastructure/utility/filterAndSortFavorites';
import {FavoritesListTypeEnum, FavoritesModel} from '@src-core/model/favorites.model';

describe('filterAndSortFavorites', () => {
  let identifierMock: MockProxy<IIdentifier>;

  let inputFilterPaginationModel: FilterModel<FavoritesModel>;
  let inputFilterSortAndPaginationNameModel: FilterModel<FavoritesModel>;
  let inputFilterSkipPaginationModel: FilterModel<FavoritesModel>;
  let inputFilterFavoriteTypeModel: FilterModel<FavoritesModel>;
  let inputFilterTodayTypeModel: FilterModel<FavoritesModel>;
  let inputFilterOtherTypeModel: FilterModel<FavoritesModel>;

  let favoriteData1: FavoritesModel;
  let favoriteData2: FavoritesModel;
  let favoriteData3: FavoritesModel;

  beforeEach(() => {
    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    inputFilterPaginationModel = new FilterModel<FavoritesModel>({page: 2, limit: 1});

    inputFilterSortAndPaginationNameModel = new FilterModel<FavoritesModel>({page: 2, limit: 1});
    inputFilterSortAndPaginationNameModel.addSortBy({insertDate: SortEnum.ASC});

    inputFilterSkipPaginationModel = new FilterModel<FavoritesModel>({skipPagination: true});

    inputFilterFavoriteTypeModel = new FilterModel<FavoritesModel>({skipPagination: true});
    inputFilterFavoriteTypeModel.addCondition({$opr: 'eq', kind: FavoritesListTypeEnum.FAVORITE});

    inputFilterTodayTypeModel = new FilterModel<FavoritesModel>({skipPagination: true});
    inputFilterTodayTypeModel.addCondition({$opr: 'eq', kind: FavoritesListTypeEnum.TODAY});

    inputFilterOtherTypeModel = new FilterModel<FavoritesModel>({skipPagination: true});
    inputFilterOtherTypeModel.addCondition({$opr: 'eq', kind: FavoritesListTypeEnum.OTHER});

    favoriteData1 = new FavoritesModel({
      id: '11111111-1111-1111-1111-111111111111',
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
    favoriteData2 = new FavoritesModel({
      id: '11111111-1111-1111-1111-222222222222',
      usersProxy: {
        user: {
          id: identifierMock.generateId(),
          username: 'user1',
          password: 'pass1',
        },
        id: identifierMock.generateId(),
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
      },
      kind: FavoritesListTypeEnum.TODAY,
      note: 'This is a note',
      insertDate: new Date(),
    });
    favoriteData3 = new FavoritesModel({
      id: '11111111-1111-1111-1111-333333333333',
      usersProxy: {
        user: {
          id: identifierMock.generateId(),
          username: 'user1',
          password: 'pass1',
        },
        id: identifierMock.generateId(),
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
      },
      kind: FavoritesListTypeEnum.OTHER,
      note: 'This is a note',
      insertDate: new Date(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it(`Filter and sort favorites model with pagination`, () => {
    const inputData = [favoriteData1, favoriteData3, favoriteData2];

    const [result, count] = filterAndSortFavorites(inputData, inputFilterPaginationModel);

    expect(result[0]).toMatchObject<Omit<FavoritesModel, 'clone'>>(favoriteData3);
    expect(count).toEqual(3);
  });

  it(`Filter and sort favorites model with sort insertDate and pagination`, () => {
    const inputData = [favoriteData1, favoriteData2, favoriteData3];

    const [result, count] = filterAndSortFavorites(inputData, inputFilterSortAndPaginationNameModel);

    expect(result[0]).toMatchObject<Omit<FavoritesModel, 'clone'>>(favoriteData2);
    expect(count).toEqual(3);
  });

  it(`Filter and sort favorites model with skip pagination`, () => {
    const inputData = [favoriteData1, favoriteData2, favoriteData3];

    const [result, count] = filterAndSortFavorites(inputData, inputFilterSkipPaginationModel);

    expect(result[0]).toMatchObject<Omit<FavoritesModel, 'clone'>>(favoriteData1);
    expect(result[1]).toMatchObject<Omit<FavoritesModel, 'clone'>>(favoriteData2);
    expect(result[2]).toMatchObject<Omit<FavoritesModel, 'clone'>>(favoriteData3);
    expect(count).toEqual(3);
  });

  it(`Filter and sort favorites model with filter favorite kind`, () => {
    const inputData = [favoriteData1, favoriteData2, favoriteData3];

    const [result, count] = filterAndSortFavorites(inputData, inputFilterFavoriteTypeModel);

    expect(result[0]).toMatchObject<Omit<FavoritesModel, 'clone'>>(favoriteData1);
    expect(count).toEqual(1);
  });

  it(`Filter and sort favorites model with filter today kind`, () => {
    const inputData = [favoriteData1, favoriteData2, favoriteData3];

    const [result, count] = filterAndSortFavorites(inputData, inputFilterTodayTypeModel);

    expect(result[0]).toMatchObject<Omit<FavoritesModel, 'clone'>>(favoriteData2);
    expect(count).toEqual(1);
  });

  it(`Filter and sort favorites model with filter other kind`, () => {
    const inputData = [favoriteData1, favoriteData2, favoriteData3];

    const [result, count] = filterAndSortFavorites(inputData, inputFilterOtherTypeModel);

    expect(result[0]).toMatchObject<Omit<FavoritesModel, 'clone'>>(favoriteData3);
    expect(count).toEqual(1);
  });
});
