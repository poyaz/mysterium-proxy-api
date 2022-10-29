import {FilterModel, SortEnum} from '@src-core/model/filter.model';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {filterAndSortVpnProvider} from '@src-infrastructure/utility/filterAndSortVpnProvider';
import {
  VpnProviderIpTypeEnum,
  VpnProviderModel,
  VpnProviderName,
  VpnServiceTypeEnum,
} from '@src-core/model/vpn-provider.model';

describe('filterAndSortVpnProvider', () => {
  let identifierMock: MockProxy<IIdentifier>;

  let inputFilterConditionModel: FilterModel<VpnProviderModel>;
  let inputFilterPaginationModel: FilterModel<VpnProviderModel>;
  let inputFilterSortAndPaginationNameModel: FilterModel<VpnProviderModel>;
  let inputFilterSkipPaginationModel: FilterModel<VpnProviderModel>;

  let vpnProviderData1: VpnProviderModel;
  let vpnProviderData2: VpnProviderModel;
  let vpnProviderData3: VpnProviderModel;

  beforeEach(() => {
    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    inputFilterConditionModel = new FilterModel<VpnProviderModel>({skipPagination: true});
    inputFilterConditionModel.addCondition({$opr: 'eq', country: 'GB'});
    inputFilterConditionModel.addCondition({$opr: 'eq', providerIdentity: 'provider3'});
    inputFilterConditionModel.addCondition({$opr: 'eq', providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL});
    inputFilterConditionModel.addCondition({$opr: 'eq', isRegister: true});

    inputFilterPaginationModel = new FilterModel<VpnProviderModel>({page: 2, limit: 1});

    inputFilterSortAndPaginationNameModel = new FilterModel<VpnProviderModel>({page: 2, limit: 1});
    inputFilterSortAndPaginationNameModel.addSortBy({insertDate: SortEnum.ASC});

    inputFilterSkipPaginationModel = new FilterModel<VpnProviderModel>({skipPagination: true});

    vpnProviderData1 = new VpnProviderModel({
      id: identifierMock.generateId(),
      serviceType: VpnServiceTypeEnum.WIREGUARD,
      providerName: VpnProviderName.MYSTERIUM,
      providerIdentity: 'provider1',
      providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
      country: 'GB',
      isRegister: false,
      insertDate: new Date(),
    });
    vpnProviderData2 = new VpnProviderModel({
      id: identifierMock.generateId(),
      serviceType: VpnServiceTypeEnum.WIREGUARD,
      providerName: VpnProviderName.MYSTERIUM,
      providerIdentity: 'provider2',
      providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
      country: 'GB',
      isRegister: false,
      insertDate: new Date(),
    });
    vpnProviderData3 = new VpnProviderModel({
      id: identifierMock.generateId(),
      serviceType: VpnServiceTypeEnum.WIREGUARD,
      providerName: VpnProviderName.MYSTERIUM,
      providerIdentity: 'provider3',
      providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
      country: 'GB',
      isRegister: true,
      insertDate: new Date(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it(`Filter and sort vpn provider model with condition`, () => {
    const inputData = [vpnProviderData1, vpnProviderData3, vpnProviderData2];

    const [result, count] = filterAndSortVpnProvider(inputData, inputFilterConditionModel);

    expect(result[0]).toMatchObject<Omit<VpnProviderModel, 'clone'>>({
      id: vpnProviderData3.id,
      serviceType: vpnProviderData3.serviceType,
      providerName: vpnProviderData3.providerName,
      providerIdentity: vpnProviderData3.providerIdentity,
      providerIpType: vpnProviderData3.providerIpType,
      country: vpnProviderData3.country,
      isRegister: vpnProviderData3.isRegister,
      insertDate: vpnProviderData3.insertDate,
    });
    expect(count).toEqual(1);
  });

  it(`Filter and sort vpn provider model with pagination`, () => {
    const inputData = [vpnProviderData1, vpnProviderData3, vpnProviderData2];

    const [result, count] = filterAndSortVpnProvider(inputData, inputFilterPaginationModel);

    expect(result[0]).toMatchObject<Omit<VpnProviderModel, 'clone'>>({
      id: vpnProviderData3.id,
      serviceType: vpnProviderData3.serviceType,
      providerName: vpnProviderData3.providerName,
      providerIdentity: vpnProviderData3.providerIdentity,
      providerIpType: vpnProviderData3.providerIpType,
      country: vpnProviderData3.country,
      isRegister: vpnProviderData3.isRegister,
      insertDate: vpnProviderData3.insertDate,
    });
    expect(count).toEqual(3);
  });

  it(`Filter and sort vpn provider model with sort insertDate and pagination`, () => {
    const inputData = [vpnProviderData1, vpnProviderData2, vpnProviderData3];

    const [result, count] = filterAndSortVpnProvider(inputData, inputFilterSortAndPaginationNameModel);

    expect(result[0]).toMatchObject<Omit<VpnProviderModel, 'clone'>>({
      id: vpnProviderData2.id,
      serviceType: vpnProviderData2.serviceType,
      providerName: vpnProviderData2.providerName,
      providerIdentity: vpnProviderData2.providerIdentity,
      providerIpType: vpnProviderData2.providerIpType,
      country: vpnProviderData2.country,
      isRegister: vpnProviderData2.isRegister,
      insertDate: vpnProviderData2.insertDate,
    });
    expect(count).toEqual(3);
  });

  it(`Filter and sort vpn provider model with skip pagination`, () => {
    const inputData = [vpnProviderData1, vpnProviderData2, vpnProviderData3];

    const [result, count] = filterAndSortVpnProvider(inputData, inputFilterSkipPaginationModel);

    expect(result[0]).toMatchObject<Omit<VpnProviderModel, 'clone'>>({
      id: vpnProviderData1.id,
      serviceType: vpnProviderData1.serviceType,
      providerName: vpnProviderData1.providerName,
      providerIdentity: vpnProviderData1.providerIdentity,
      providerIpType: vpnProviderData1.providerIpType,
      country: vpnProviderData1.country,
      isRegister: vpnProviderData1.isRegister,
      insertDate: vpnProviderData1.insertDate,
    });
    expect(result[1]).toMatchObject<Omit<VpnProviderModel, 'clone'>>({
      id: vpnProviderData2.id,
      serviceType: vpnProviderData2.serviceType,
      providerName: vpnProviderData2.providerName,
      providerIdentity: vpnProviderData2.providerIdentity,
      providerIpType: vpnProviderData2.providerIpType,
      country: vpnProviderData2.country,
      isRegister: vpnProviderData2.isRegister,
      insertDate: vpnProviderData2.insertDate,
    });
    expect(result[2]).toMatchObject<Omit<VpnProviderModel, 'clone'>>({
      id: vpnProviderData3.id,
      serviceType: vpnProviderData3.serviceType,
      providerName: vpnProviderData3.providerName,
      providerIdentity: vpnProviderData3.providerIdentity,
      providerIpType: vpnProviderData3.providerIpType,
      country: vpnProviderData3.country,
      isRegister: vpnProviderData3.isRegister,
      insertDate: vpnProviderData3.insertDate,
    });
    expect(count).toEqual(3);
  });
});
