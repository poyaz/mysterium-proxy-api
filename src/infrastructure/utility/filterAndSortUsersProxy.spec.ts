import {FilterModel, SortEnum} from '@src-core/model/filter.model';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {UsersProxyModel} from '@src-core/model/users-proxy.model';
import {filterAndSortUsersProxy} from '@src-infrastructure/utility/filterAndSortUsersProxy';

describe('filterAndSortUsersProxy', () => {
  let identifierMock: MockProxy<IIdentifier>;

  let inputFilterPaginationModel: FilterModel<UsersProxyModel>;
  let inputFilterSortAndPaginationNameModel: FilterModel<UsersProxyModel>;
  let inputFilterSkipPaginationModel: FilterModel<UsersProxyModel>;

  let usersProxyData1: UsersProxyModel;
  let usersProxyData2: UsersProxyModel;
  let usersProxyData3: UsersProxyModel;

  beforeEach(() => {
    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    inputFilterPaginationModel = new FilterModel<UsersProxyModel>({page: 2, limit: 1});

    inputFilterSortAndPaginationNameModel = new FilterModel<UsersProxyModel>({page: 2, limit: 1});
    inputFilterSortAndPaginationNameModel.addSortBy({insertDate: SortEnum.ASC});

    inputFilterSkipPaginationModel = new FilterModel<UsersProxyModel>({skipPagination: true});

    usersProxyData1 = new UsersProxyModel({
      id: '11111111-1111-1111-1111-111111111111',
      listenAddr: '110.20.45.1',
      listenPort: 3128,
      proxyDownstream: [],
      insertDate: new Date(),
      user: {
        id: identifierMock.generateId(),
        username: 'user1',
        password: 'pass1',
      },
    });
    usersProxyData2 = new UsersProxyModel({
      id: '11111111-1111-1111-1111-222222222222',
      listenAddr: '110.20.45.1',
      listenPort: 3129,
      proxyDownstream: [],
      insertDate: new Date(),
      user: {
        id: identifierMock.generateId(),
        username: 'user1',
        password: 'pass1',
      },
    });
    usersProxyData3 = new UsersProxyModel({
      id: '11111111-1111-1111-1111-333333333333',
      listenAddr: '110.20.45.1',
      listenPort: 3130,
      proxyDownstream: [],
      insertDate: new Date(),
      user: {
        id: identifierMock.generateId(),
        username: 'user1',
        password: 'pass1',
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it(`Filter and sort proxy acl model with pagination`, () => {
    const inputData = [usersProxyData1, usersProxyData3, usersProxyData2];

    const [result, count] = filterAndSortUsersProxy(inputData, inputFilterPaginationModel);

    expect(result[0]).toMatchObject<Omit<UsersProxyModel, 'clone'>>(usersProxyData3);
    expect(count).toEqual(3);
  });

  it(`Filter and sort proxy acl model with sort insertDate and pagination`, () => {
    const inputData = [usersProxyData1, usersProxyData2, usersProxyData3];

    const [result, count] = filterAndSortUsersProxy(inputData, inputFilterSortAndPaginationNameModel);

    expect(result[0]).toMatchObject<Omit<UsersProxyModel, 'clone'>>(usersProxyData2);
    expect(count).toEqual(3);
  });

  it(`Filter and sort proxy acl model with skip pagination`, () => {
    const inputData = [usersProxyData1, usersProxyData2, usersProxyData3];

    const [result, count] = filterAndSortUsersProxy(inputData, inputFilterSkipPaginationModel);

    expect(result[0]).toMatchObject<Omit<UsersProxyModel, 'clone'>>(usersProxyData1);
    expect(result[1]).toMatchObject<Omit<UsersProxyModel, 'clone'>>(usersProxyData2);
    expect(result[2]).toMatchObject<Omit<UsersProxyModel, 'clone'>>(usersProxyData3);
    expect(count).toEqual(3);
  });
});
