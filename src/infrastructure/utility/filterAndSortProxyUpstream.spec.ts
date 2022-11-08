import {FilterModel, SortEnum} from '@src-core/model/filter.model';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {filterAndSortProxyUpstream} from '@src-infrastructure/utility/filterAndSortProxyUpstream';
import {ProxyUpstreamModel} from '@src-core/model/proxy.model';

describe('filterAndSortProxyUpstream', () => {
  let identifierMock: MockProxy<IIdentifier>;

  let inputFilterConditionModel: FilterModel<ProxyUpstreamModel>;
  let inputFilterPaginationModel: FilterModel<ProxyUpstreamModel>;
  let inputFilterSortAndPaginationInsertDateModel: FilterModel<ProxyUpstreamModel>;
  let inputFilterSkipPaginationModel: FilterModel<ProxyUpstreamModel>;

  let proxyUpstreamData1: ProxyUpstreamModel;
  let proxyUpstreamData2: ProxyUpstreamModel;
  let proxyUpstreamData3: ProxyUpstreamModel;

  beforeEach(() => {
    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    inputFilterConditionModel = new FilterModel<ProxyUpstreamModel>({skipPagination: true});
    inputFilterConditionModel.addCondition({$opr: 'eq', listenPort: 3129});

    inputFilterPaginationModel = new FilterModel<ProxyUpstreamModel>({page: 2, limit: 1});

    inputFilterSortAndPaginationInsertDateModel = new FilterModel<ProxyUpstreamModel>({page: 2, limit: 1});
    inputFilterSortAndPaginationInsertDateModel.addSortBy({insertDate: SortEnum.ASC});

    inputFilterSkipPaginationModel = new FilterModel<ProxyUpstreamModel>({skipPagination: true});

    proxyUpstreamData1 = new ProxyUpstreamModel({
      id: identifierMock.generateId(),
      listenAddr: 'addr1',
      listenPort: 3128,
      proxyDownstream: [],
      insertDate: new Date(),
    });
    proxyUpstreamData2 = new ProxyUpstreamModel({
      id: identifierMock.generateId(),
      listenAddr: 'addr1',
      listenPort: 3129,
      proxyDownstream: [],
      insertDate: new Date(),
    });
    proxyUpstreamData3 = new ProxyUpstreamModel({
      id: identifierMock.generateId(),
      listenAddr: 'addr1',
      listenPort: 3130,
      proxyDownstream: [],
      insertDate: new Date(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it(`Filter and sort proxy upstream model with condition`, () => {
    const inputData = [proxyUpstreamData1, proxyUpstreamData3, proxyUpstreamData2];

    const [result, count] = filterAndSortProxyUpstream(inputData, inputFilterConditionModel);

    expect(result[0]).toMatchObject<Omit<ProxyUpstreamModel, 'clone'>>({
      id: proxyUpstreamData2.id,
      listenAddr: proxyUpstreamData2.listenAddr,
      listenPort: proxyUpstreamData2.listenPort,
      proxyDownstream: proxyUpstreamData2.proxyDownstream,
      insertDate: proxyUpstreamData2.insertDate,
    });
    expect(count).toEqual(1);
  });

  it(`Filter and sort proxy upstream model with pagination`, () => {
    const inputData = [proxyUpstreamData1, proxyUpstreamData3, proxyUpstreamData2];

    const [result, count] = filterAndSortProxyUpstream(inputData, inputFilterPaginationModel);

    expect(result[0]).toMatchObject<Omit<ProxyUpstreamModel, 'clone'>>({
      id: proxyUpstreamData3.id,
      listenAddr: proxyUpstreamData3.listenAddr,
      listenPort: proxyUpstreamData3.listenPort,
      proxyDownstream: proxyUpstreamData3.proxyDownstream,
      insertDate: proxyUpstreamData3.insertDate,
    });
    expect(count).toEqual(3);
  });

  it(`Filter and sort proxy upstream model with sort insertDate and pagination`, () => {
    const inputData = [proxyUpstreamData1, proxyUpstreamData2, proxyUpstreamData3];

    const [result, count] = filterAndSortProxyUpstream(inputData, inputFilterSortAndPaginationInsertDateModel);

    expect(result[0]).toMatchObject<Omit<ProxyUpstreamModel, 'clone'>>({
      id: proxyUpstreamData2.id,
      listenAddr: proxyUpstreamData2.listenAddr,
      listenPort: proxyUpstreamData2.listenPort,
      proxyDownstream: proxyUpstreamData2.proxyDownstream,
      insertDate: proxyUpstreamData2.insertDate,
    });
    expect(count).toEqual(3);
  });

  it(`Filter and sort proxy upstream model with skip pagination`, () => {
    const inputData = [proxyUpstreamData1, proxyUpstreamData2, proxyUpstreamData3];

    const [result, count] = filterAndSortProxyUpstream(inputData, inputFilterSkipPaginationModel);

    expect(result[0]).toMatchObject<Omit<ProxyUpstreamModel, 'clone'>>({
      id: proxyUpstreamData1.id,
      listenAddr: proxyUpstreamData1.listenAddr,
      listenPort: proxyUpstreamData1.listenPort,
      proxyDownstream: proxyUpstreamData1.proxyDownstream,
      insertDate: proxyUpstreamData1.insertDate,
    });
    expect(result[1]).toMatchObject<Omit<ProxyUpstreamModel, 'clone'>>({
      id: proxyUpstreamData2.id,
      listenAddr: proxyUpstreamData2.listenAddr,
      listenPort: proxyUpstreamData2.listenPort,
      proxyDownstream: proxyUpstreamData2.proxyDownstream,
      insertDate: proxyUpstreamData2.insertDate,
    });
    expect(result[2]).toMatchObject<Omit<ProxyUpstreamModel, 'clone'>>({
      id: proxyUpstreamData3.id,
      listenAddr: proxyUpstreamData3.listenAddr,
      listenPort: proxyUpstreamData3.listenPort,
      proxyDownstream: proxyUpstreamData3.proxyDownstream,
      insertDate: proxyUpstreamData3.insertDate,
    });
    expect(count).toEqual(3);
  });
});
