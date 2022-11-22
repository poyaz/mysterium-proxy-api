import {FilterModel, SortEnum} from '@src-core/model/filter.model';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {ProxyAclMode, ProxyAclModel, ProxyAclType} from '@src-core/model/proxyAclModel';
import {defaultModelFactory} from '@src-core/model/defaultModel';
import {UsersModel} from '@src-core/model/users.model';
import {ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {filterAndSortProxyAcl} from '@src-infrastructure/utility/filterAndSortProxyAcl';

describe('filterAndSortProxyAcl', () => {
  let identifierMock: MockProxy<IIdentifier>;

  let inputFilterPaginationModel: FilterModel<ProxyAclModel>;
  let inputFilterSortAndPaginationNameModel: FilterModel<ProxyAclModel>;
  let inputFilterSkipPaginationModel: FilterModel<ProxyAclModel>;

  let proxyAclData1: ProxyAclModel;
  let proxyAclData2: ProxyAclModel;
  let proxyAclData3: ProxyAclModel;

  beforeEach(() => {
    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    inputFilterPaginationModel = new FilterModel<ProxyAclModel>({page: 2, limit: 1});

    inputFilterSortAndPaginationNameModel = new FilterModel<ProxyAclModel>({page: 2, limit: 1});
    inputFilterSortAndPaginationNameModel.addSortBy({insertDate: SortEnum.ASC});

    inputFilterSkipPaginationModel = new FilterModel<ProxyAclModel>({skipPagination: true});

    proxyAclData1 = defaultModelFactory<ProxyAclModel>(
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
    proxyAclData2 = defaultModelFactory<ProxyAclModel>(
      ProxyAclModel,
      {
        id: '11111111-1111-1111-1111-222222222222',
        mode: ProxyAclMode.ALL,
        type: ProxyAclType.USER_PORT,
        user: defaultModelFactory<UsersModel>(
          UsersModel,
          {
            id: '00000000-0000-0000-0000-111111111111',
            username: 'user1',
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
    proxyAclData3 = defaultModelFactory<ProxyAclModel>(
      ProxyAclModel,
      {
        id: '11111111-1111-1111-1111-333333333333',
        mode: ProxyAclMode.CUSTOM,
        type: ProxyAclType.USER_PORT,
        user: defaultModelFactory<UsersModel>(
          UsersModel,
          {
            id: '00000000-0000-0000-0000-222222222222',
            username: 'user2',
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
      },
      ['proxies'],
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it(`Filter and sort proxy acl model with pagination`, () => {
    const inputData = [proxyAclData1, proxyAclData3, proxyAclData2];

    const [result, count] = filterAndSortProxyAcl(inputData, inputFilterPaginationModel);

    expect(result[0]).toMatchObject<Omit<ProxyAclModel, 'clone'>>(proxyAclData3);
    expect(count).toEqual(3);
  });

  it(`Filter and sort proxy acl model with sort insertDate and pagination`, () => {
    const inputData = [proxyAclData1, proxyAclData2, proxyAclData3];

    const [result, count] = filterAndSortProxyAcl(inputData, inputFilterSortAndPaginationNameModel);

    expect(result[0]).toMatchObject<Omit<ProxyAclModel, 'clone'>>(proxyAclData2);
    expect(count).toEqual(3);
  });

  it(`Filter and sort proxy acl model with skip pagination`, () => {
    const inputData = [proxyAclData1, proxyAclData2, proxyAclData3];

    const [result, count] = filterAndSortProxyAcl(inputData, inputFilterSkipPaginationModel);

    expect(result[0]).toMatchObject<Omit<ProxyAclModel, 'clone'>>(proxyAclData1);
    expect(result[1]).toMatchObject<Omit<ProxyAclModel, 'clone'>>(proxyAclData2);
    expect(result[2]).toMatchObject<Omit<ProxyAclModel, 'clone'>>(proxyAclData3);
    expect(count).toEqual(3);
  });
});
