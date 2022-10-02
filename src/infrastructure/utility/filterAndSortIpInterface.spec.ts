import {FilterModel, SortEnum} from '@src-core/model/filter.model';
import {IpInterfaceModel} from '@src-core/model/ip-interface.model';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {filterAndSortIpInterface} from '@src-infrastructure/utility/filterAndSortIpInterface';

describe('filterAndSortIpInterface', () => {
  let identifierMock: MockProxy<IIdentifier>;

  let inputFilterNameModel: FilterModel<IpInterfaceModel>;
  let inputFilterIpModel: FilterModel<IpInterfaceModel>;
  let inputFilterIsUseModel: FilterModel<IpInterfaceModel>;
  let inputFilterPaginationModel: FilterModel<IpInterfaceModel>;
  let inputFilterSortAndPaginationNameModel: FilterModel<IpInterfaceModel>;
  let inputFilterSortAndPaginationIpModel: FilterModel<IpInterfaceModel>;
  let inputFilterSkipPaginationModel: FilterModel<IpInterfaceModel>;

  let ipInterfaceData1: IpInterfaceModel;
  let ipInterfaceData2: IpInterfaceModel;

  beforeEach(() => {
    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    inputFilterNameModel = new FilterModel<IpInterfaceModel>();
    inputFilterNameModel.addCondition({$opr: 'eq', name: 'eno1'});

    inputFilterIpModel = new FilterModel<IpInterfaceModel>();
    inputFilterIpModel.addCondition({$opr: 'eq', ip: '192.168.1.1'});

    inputFilterIsUseModel = new FilterModel<IpInterfaceModel>();
    inputFilterIsUseModel.addCondition({$opr: 'eq', isUse: true});

    inputFilterPaginationModel = new FilterModel<IpInterfaceModel>({page: 2, limit: 1});

    inputFilterSortAndPaginationNameModel = new FilterModel<IpInterfaceModel>({page: 2, limit: 1});
    inputFilterSortAndPaginationNameModel.addSortBy({name: SortEnum.ASC});

    inputFilterSortAndPaginationIpModel = new FilterModel<IpInterfaceModel>({page: 2, limit: 1});
    inputFilterSortAndPaginationIpModel.addSortBy({ip: SortEnum.DESC});

    inputFilterSkipPaginationModel = new FilterModel<IpInterfaceModel>({skipPagination: true});

    ipInterfaceData1 = new IpInterfaceModel({
      id: identifierMock.generateId(),
      name: 'eno1',
      ip: '192.168.1.1',
      isUse: true,
    });
    ipInterfaceData2 = new IpInterfaceModel({
      id: identifierMock.generateId(),
      name: 'eno2',
      ip: '192.168.100.1',
      isUse: false,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it(`Filter and sort ip interface model with name filter`, () => {
    const inputData = [ipInterfaceData1, ipInterfaceData2];

    const [result, count] = filterAndSortIpInterface(inputData, inputFilterNameModel);

    expect(result[0]).toMatchObject<Omit<IpInterfaceModel, 'clone'>>({
      id: ipInterfaceData1.id,
      name: ipInterfaceData1.name,
      ip: ipInterfaceData1.ip,
      isUse: ipInterfaceData1.isUse,
    });
    expect(count).toEqual(1);
  });

  it(`Filter and sort ip interface model with ip filter`, () => {
    const inputData = [ipInterfaceData1, ipInterfaceData2];

    const [result, count] = filterAndSortIpInterface(inputData, inputFilterIpModel);

    expect(result[0]).toMatchObject<Omit<IpInterfaceModel, 'clone'>>({
      id: ipInterfaceData1.id,
      name: ipInterfaceData1.name,
      ip: ipInterfaceData1.ip,
      isUse: ipInterfaceData1.isUse,
    });
    expect(count).toEqual(1);
  });

  it(`Filter and sort ip interface model with ip filter`, () => {
    const inputData = [ipInterfaceData1, ipInterfaceData2];

    const [result, count] = filterAndSortIpInterface(inputData, inputFilterIsUseModel);

    expect(result[0]).toMatchObject<Omit<IpInterfaceModel, 'clone'>>({
      id: ipInterfaceData1.id,
      name: ipInterfaceData1.name,
      ip: ipInterfaceData1.ip,
      isUse: ipInterfaceData1.isUse,
    });
    expect(count).toEqual(1);
  });

  it(`Filter and sort ip interface model with pagination`, () => {
    const inputData = [ipInterfaceData1, ipInterfaceData2];

    const [result, count] = filterAndSortIpInterface(inputData, inputFilterPaginationModel);

    expect(result[0]).toMatchObject<Omit<IpInterfaceModel, 'clone'>>({
      id: ipInterfaceData2.id,
      name: ipInterfaceData2.name,
      ip: ipInterfaceData2.ip,
      isUse: ipInterfaceData2.isUse,
    });
    expect(count).toEqual(2);
  });

  it(`Filter and sort ip interface model with sort name and pagination`, () => {
    const inputData = [ipInterfaceData1, ipInterfaceData2];

    const [result, count] = filterAndSortIpInterface(inputData, inputFilterSortAndPaginationNameModel);

    expect(result[0]).toMatchObject<Omit<IpInterfaceModel, 'clone'>>({
      id: ipInterfaceData2.id,
      name: ipInterfaceData2.name,
      ip: ipInterfaceData2.ip,
      isUse: ipInterfaceData2.isUse,
    });
    expect(count).toEqual(2);
  });

  it(`Filter and sort ip interface model with sort ip and pagination`, () => {
    const inputData = [ipInterfaceData1, ipInterfaceData2];

    const [result, count] = filterAndSortIpInterface(inputData, inputFilterSortAndPaginationIpModel);

    expect(result[0]).toMatchObject<Omit<IpInterfaceModel, 'clone'>>({
      id: ipInterfaceData1.id,
      name: ipInterfaceData1.name,
      ip: ipInterfaceData1.ip,
      isUse: ipInterfaceData1.isUse,
    });
    expect(count).toEqual(2);
  });

  it(`Filter and sort ip interface model with skip pagination`, () => {
    const inputData = [ipInterfaceData1, ipInterfaceData2];

    const [result, count] = filterAndSortIpInterface(inputData, inputFilterSkipPaginationModel);

    expect(result[0]).toMatchObject<Omit<IpInterfaceModel, 'clone'>>({
      id: ipInterfaceData1.id,
      name: ipInterfaceData1.name,
      ip: ipInterfaceData1.ip,
      isUse: ipInterfaceData1.isUse,
    });
    expect(result[1]).toMatchObject<Omit<IpInterfaceModel, 'clone'>>({
      id: ipInterfaceData2.id,
      name: ipInterfaceData2.name,
      ip: ipInterfaceData2.ip,
      isUse: ipInterfaceData2.isUse,
    });
    expect(count).toEqual(2);
  });
});
