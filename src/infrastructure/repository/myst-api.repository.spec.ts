import {Test, TestingModule} from '@nestjs/testing';
import axios from 'axios';
import {RepositoryException} from '@src-core/exception/repository.exception';
import {MystApiRepository} from './myst-api.repository';
import {
  VpnProviderIpTypeEnum,
  VpnProviderModel,
  VpnProviderName,
  VpnProviderStatusEnum,
  VpnServiceTypeEnum,
} from '@src-core/model/vpn-provider.model';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {FilterModel} from '@src-core/model/filter.model';
import {FillDataRepositoryException} from '@src-core/exception/fill-data-repository.exception';

jest.mock('axios');

describe('MystApiRepository', () => {
  let repository: MystApiRepository;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProviderTokenEnum.IDENTIFIER_UUID,
          useValue: identifierMock,
        },
        {
          provide: MystApiRepository,
          inject: [ProviderTokenEnum.IDENTIFIER_UUID],
          useFactory: (identifier: IIdentifier) =>
            new MystApiRepository(identifier, 'https://myst.com'),
        },
      ],
    }).compile();

    repository = module.get<MystApiRepository>(MystApiRepository);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe(`Get all vpn provider info`, () => {
    let outputFailAxiosData;
    let outputNullAxiosData;
    let outputAxiosData1;
    let outputAxiosData2;
    let outputAxiosData3;
    let inputPaginationFilter: FilterModel<VpnProviderModel>;
    let inputCountryFilter: FilterModel<VpnProviderModel>;
    let inputIsRegisterFilter: FilterModel<VpnProviderModel>;
    let inputProviderIdFilter: FilterModel<VpnProviderModel>;

    beforeEach(() => {
      outputFailAxiosData = {
        'id': 0,
        'format': 'service-proposal/v3',
        'compatibility': 2,
        'provider_id': '0x73cd26eedd454613acb73f620628021b4c936dba',
        'service_type': 'wireguard',
        'location': {
          'continent': 'EU',
          'country': 'GB',
          'city': 'England',
          'asn': 31898,
          'isp': 'Oracle Public Cloud',
          'ip_type': null,
        },
        'contacts': [
          {
            'type': 'nats/p2p/v1',
            'definition': {
              'broker_addresses': [
                'nats://broker.mysterium.network:4222',
                'nats://broker.mysterium.network:4222',
                'nats://51.15.116.186:4222',
                'nats://51.15.72.87:4222',
              ],
            },
          },
        ],
        'quality': {
          'quality': 2.625,
          'latency': 4002.173432,
          'bandwidth': 1130.874381,
          'uptime': 24,
        },
      };
      outputNullAxiosData = null;
      outputAxiosData1 = {
        'id': 0,
        'format': 'service-proposal/v3',
        'compatibility': 2,
        'provider_id': '0x73cd26eedd454613acb73f620628021b4c936dba',
        'service_type': 'wireguard',
        'location': {
          'continent': 'EU',
          'country': 'GB',
          'city': 'England',
          'asn': 31898,
          'isp': 'Oracle Public Cloud',
          'ip_type': 'hosting',
        },
        'contacts': [
          {
            'type': 'nats/p2p/v1',
            'definition': {
              'broker_addresses': [
                'nats://broker.mysterium.network:4222',
                'nats://broker.mysterium.network:4222',
                'nats://51.15.116.186:4222',
                'nats://51.15.72.87:4222',
              ],
            },
          },
        ],
        'quality': {
          'quality': 2.625,
          'latency': 4002.173432,
          'bandwidth': 1130.874381,
          'uptime': 24,
        },
      };
      outputAxiosData2 = {

        'id': 0,
        'format': 'service-proposal/v3',
        'compatibility': 2,
        'provider_id': '0x93eac8b269230820a54a9549ec3979e4412c7a16',
        'service_type': 'wireguard',
        'location': {
          'continent': 'EU',
          'country': 'GB',
          'city': 'England',
          'asn': 5607,
          'isp': 'SKY UK Limited',
          'ip_type': 'residential',
        },
        'contacts': [
          {
            'type': 'nats/p2p/v1',
            'definition': {
              'broker_addresses': [
                'nats://broker.mysterium.network:4222',
                'nats://broker.mysterium.network:4222',
                'nats://51.15.116.186:4222',
                'nats://51.15.72.87:4222',
              ],
            },
          },
        ],
        'quality': {
          'quality': 2.0999999999999996,
          'latency': 1801.880756,
          'bandwidth': 4.848026,
          'uptime': 24,
        },
      };
      outputAxiosData3 = {
        'id': 0,
        'format': 'service-proposal/v3',
        'compatibility': 2,
        'provider_id': '0x504de73bab20897d7c14401ad41bb6a9f1777795',
        'service_type': 'wireguard',
        'location': {
          'continent': 'EU',
          'country': 'FR',
          'city': 'Ile-de-France',
          'asn': 3215,
          'isp': 'Orange S.A.',
          'ip_type': 'residential',
        },
        'contacts': [
          {
            'type': 'nats/p2p/v1',
            'definition': {
              'broker_addresses': [
                'nats://broker.mysterium.network:4222',
                'nats://broker.mysterium.network:4222',
                'nats://51.15.116.186:4222',
                'nats://51.15.72.87:4222',
              ],
            },
          },
        ],
        'quality': {
          'quality': 2.625,
          'latency': 1665.160757,
          'bandwidth': 115.460469,
          'uptime': 23.966667,
        },
      };

      inputPaginationFilter = new FilterModel<VpnProviderModel>({page: 2, limit: 1});

      inputCountryFilter = new FilterModel<VpnProviderModel>();
      inputCountryFilter.addCondition({$opr: 'eq', country: 'GB'});

      inputIsRegisterFilter = new FilterModel<VpnProviderModel>({page: 2, limit: 1});
      inputIsRegisterFilter.addCondition({$opr: 'eq', isRegister: true});

      inputProviderIdFilter = new FilterModel<VpnProviderModel>();
      inputProviderIdFilter.addCondition({$opr: 'eq', providerIdentity: outputAxiosData1.provider_id});
    });

    it(`Should error get all vpn provider when fetch from api`, async () => {
      const apiError = new Error('API call error');
      (<jest.Mock>axios.get).mockRejectedValue(apiError);

      const [error] = await repository.getAll();

      expect(axios.get).toHaveBeenCalled();
      expect(axios.get).toBeCalledWith(
        expect.stringMatching(/\/proposals$/),
        expect.objectContaining({
          headers: {
            'content-type': 'application.json',
          },
          params: {
            service_type: VpnServiceTypeEnum.WIREGUARD,
          },
        }),
      );
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(apiError);
    });

    it(`Should error get all vpn provider when fill 'providerIpType'`, async () => {
      (<jest.Mock>axios.get).mockResolvedValue({
        data: [outputFailAxiosData],
      });

      const [error] = await repository.getAll();

      expect(axios.get).toHaveBeenCalled();
      expect(axios.get).toBeCalledWith(
        expect.stringMatching(/\/proposals$/),
        expect.objectContaining({
          headers: {
            'content-type': 'application.json',
          },
          params: {
            service_type: VpnServiceTypeEnum.WIREGUARD,
          },
        }),
      );
      expect(error).toBeInstanceOf(FillDataRepositoryException);
      expect((<FillDataRepositoryException<VpnProviderModel>>error).fillProperties).toEqual(
        expect.arrayContaining(<Array<keyof VpnProviderModel>>['serviceType']),
      );
    });

    it(`Should successfully get all vpn provider with empty record`, async () => {
      (<jest.Mock>axios.get).mockResolvedValue({
        data: [],
      });

      const [error, result] = await repository.getAll();

      expect(axios.get).toHaveBeenCalled();
      expect(axios.get).toBeCalledWith(
        expect.stringMatching(/\/proposals$/),
        expect.objectContaining({
          headers: {
            'content-type': 'application.json',
          },
          params: {
            service_type: VpnServiceTypeEnum.WIREGUARD,
          },
        }),
      );
      expect(error).toBeNull();
      expect(result.length).toEqual(0);
    });

    it(`Should successfully get all vpn provider with empty record when result of api is null`, async () => {
      (<jest.Mock>axios.get).mockResolvedValue({
        data: outputNullAxiosData,
      });

      const [error, result] = await repository.getAll();

      expect(axios.get).toHaveBeenCalled();
      expect(axios.get).toBeCalledWith(
        expect.stringMatching(/\/proposals$/),
        expect.objectContaining({
          headers: {
            'content-type': 'application.json',
          },
          params: {
            service_type: VpnServiceTypeEnum.WIREGUARD,
          },
        }),
      );
      expect(error).toBeNull();
      expect(result.length).toEqual(0);
    });

    it(`Should successfully get all vpn provider (get limit data)`, async () => {
      (<jest.Mock>axios.get).mockResolvedValue({
        data: [outputAxiosData1],
      });

      const [error, result] = await repository.getAll();

      expect(axios.get).toHaveBeenCalled();
      expect(axios.get).toBeCalledWith(
        expect.stringMatching(/\/proposals$/),
        expect.objectContaining({
          headers: {
            'content-type': 'application.json',
          },
          params: {
            service_type: VpnServiceTypeEnum.WIREGUARD,
          },
        }),
      );
      expect(error).toBeNull();
      expect(result.length).toEqual(1);
      expect(result[0]).toEqual(<VpnProviderModel>{
        id: identifierMock.generateId(),
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: outputAxiosData1.provider_id,
        providerIpType: VpnProviderIpTypeEnum.HOSTING,
        country: outputAxiosData1.location.country,
        isRegister: false,
        quality: outputAxiosData1.quality.quality,
        bandwidth: outputAxiosData1.quality.bandwidth,
        latency: outputAxiosData1.quality.latency,
        insertDate: new Date(),
      });
    });

    it(`Should successfully get all vpn provider with pagination (get limit data)`, async () => {
      (<jest.Mock>axios.get).mockResolvedValue({
        data: [outputAxiosData1, outputAxiosData2],
      });

      const [error, result, totalCount] = await repository.getAll(inputPaginationFilter);

      expect(axios.get).toHaveBeenCalled();
      expect(axios.get).toBeCalledWith(
        expect.stringMatching(/\/proposals$/),
        expect.objectContaining({
          headers: {
            'content-type': 'application.json',
          },
          params: {
            service_type: VpnServiceTypeEnum.WIREGUARD,
          },
        }),
      );
      expect(error).toBeNull();
      expect(result.length).toEqual(1);
      expect(result[0]).toEqual(<VpnProviderModel>{
        id: identifierMock.generateId(),
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: outputAxiosData2.provider_id,
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        country: outputAxiosData2.location.country,
        isRegister: false,
        quality: outputAxiosData2.quality.quality,
        bandwidth: outputAxiosData2.quality.bandwidth,
        latency: outputAxiosData2.quality.latency,
        insertDate: new Date(),
      });
      expect(totalCount).toEqual(2);
    });

    it(`Should successfully get all vpn provider with 'country' filter (get limit data)`, async () => {
      (<jest.Mock>axios.get).mockResolvedValue({
        data: [outputAxiosData1, outputAxiosData2],
      });

      const [error, result, totalCount] = await repository.getAll(inputCountryFilter);

      expect(axios.get).toHaveBeenCalled();
      expect(axios.get).toBeCalledWith(
        expect.stringMatching(/\/proposals$/),
        expect.objectContaining({
          headers: {
            'content-type': 'application.json',
          },
          params: {
            service_type: VpnServiceTypeEnum.WIREGUARD,
            location_country: inputCountryFilter.getCondition('country').country,
          },
        }),
      );
      expect(error).toBeNull();
      expect(result.length).toEqual(2);
      expect(result[0]).toEqual(<VpnProviderModel>{
        id: identifierMock.generateId(),
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: outputAxiosData1.provider_id,
        providerIpType: VpnProviderIpTypeEnum.HOSTING,
        country: outputAxiosData1.location.country,
        isRegister: false,
        quality: outputAxiosData1.quality.quality,
        bandwidth: outputAxiosData1.quality.bandwidth,
        latency: outputAxiosData1.quality.latency,
        insertDate: new Date(),
      });
      expect(result[1]).toEqual(<VpnProviderModel>{
        id: identifierMock.generateId(),
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: outputAxiosData2.provider_id,
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        country: outputAxiosData2.location.country,
        isRegister: false,
        quality: outputAxiosData2.quality.quality,
        bandwidth: outputAxiosData2.quality.bandwidth,
        latency: outputAxiosData2.quality.latency,
        insertDate: new Date(),
      });
      expect(totalCount).toEqual(2);
    });

    it(`Should successfully get all vpn provider with 'isRegister' filter (get all data)`, async () => {
      (<jest.Mock>axios.get).mockResolvedValue({
        data: [outputAxiosData1, outputAxiosData2, outputAxiosData3],
      });

      const [error, result, totalCount] = await repository.getAll(inputIsRegisterFilter);

      expect(axios.get).toHaveBeenCalled();
      expect(axios.get).toBeCalledWith(
        expect.stringMatching(/\/proposals$/),
        expect.objectContaining({
          headers: {
            'content-type': 'application.json',
          },
          params: {
            service_type: VpnServiceTypeEnum.WIREGUARD,
          },
        }),
      );
      expect(error).toBeNull();
      expect(result.length).toEqual(3);
      expect(result[0]).toEqual(<VpnProviderModel>{
        id: identifierMock.generateId(),
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: outputAxiosData1.provider_id,
        providerIpType: VpnProviderIpTypeEnum.HOSTING,
        country: outputAxiosData1.location.country,
        isRegister: false,
        quality: outputAxiosData1.quality.quality,
        bandwidth: outputAxiosData1.quality.bandwidth,
        latency: outputAxiosData1.quality.latency,
        insertDate: new Date(),
      });
      expect(result[1]).toEqual(<VpnProviderModel>{
        id: identifierMock.generateId(),
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: outputAxiosData2.provider_id,
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        country: outputAxiosData2.location.country,
        isRegister: false,
        quality: outputAxiosData2.quality.quality,
        bandwidth: outputAxiosData2.quality.bandwidth,
        latency: outputAxiosData2.quality.latency,
        insertDate: new Date(),
      });
      expect(result[2]).toEqual(<VpnProviderModel>{
        id: identifierMock.generateId(),
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: outputAxiosData3.provider_id,
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        country: outputAxiosData3.location.country,
        isRegister: false,
        quality: outputAxiosData3.quality.quality,
        bandwidth: outputAxiosData3.quality.bandwidth,
        latency: outputAxiosData3.quality.latency,
        insertDate: new Date(),
      });
      expect(totalCount).toEqual(3);
    });

    it(`Should successfully get all vpn provider with 'providerIdentity' filter (get limit data)`, async () => {
      (<jest.Mock>axios.get).mockResolvedValue({
        data: [outputAxiosData1],
      });

      const [error, result, totalCount] = await repository.getAll(inputProviderIdFilter);

      expect(axios.get).toHaveBeenCalled();
      expect(axios.get).toBeCalledWith(
        expect.stringMatching(/\/proposals$/),
        expect.objectContaining({
          headers: {
            'content-type': 'application.json',
          },
          params: {
            service_type: VpnServiceTypeEnum.WIREGUARD,
            provider_id: inputProviderIdFilter.getCondition('providerIdentity').providerIdentity,
          },
        }),
      );
      expect(error).toBeNull();
      expect(result.length).toEqual(1);
      expect(result[0]).toEqual(<VpnProviderModel>{
        id: identifierMock.generateId(),
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: outputAxiosData1.provider_id,
        providerIpType: VpnProviderIpTypeEnum.HOSTING,
        country: outputAxiosData1.location.country,
        isRegister: false,
        quality: outputAxiosData1.quality.quality,
        bandwidth: outputAxiosData1.quality.bandwidth,
        latency: outputAxiosData1.quality.latency,
        insertDate: new Date(),
      });
      expect(totalCount).toEqual(1);
    });
  });

  describe(`Get vpn info by id`, () => {
    let inputId: string;
    let outputNullAxiosData = null;
    let outputAxiosData;

    beforeEach(() => {
      inputId = identifierMock.generateId();
      outputAxiosData = {
        'id': 0,
        'format': 'service-proposal/v3',
        'compatibility': 2,
        'provider_id': '0x73cd26eedd454613acb73f620628021b4c936dba',
        'service_type': 'wireguard',
        'location': {
          'continent': 'EU',
          'country': 'GB',
          'city': 'England',
          'asn': 31898,
          'isp': 'Oracle Public Cloud',
          'ip_type': 'hosting',
        },
        'contacts': [
          {
            'type': 'nats/p2p/v1',
            'definition': {
              'broker_addresses': [
                'nats://broker.mysterium.network:4222',
                'nats://broker.mysterium.network:4222',
                'nats://51.15.116.186:4222',
                'nats://51.15.72.87:4222',
              ],
            },
          },
        ],
        'quality': {
          'quality': 2.625,
          'latency': 4002.173432,
          'bandwidth': 1130.874381,
          'uptime': 24,
        },
      };
    });

    it(`Should error get vpn info by id when fetch from api`, async () => {
      const apiError = new Error('API call error');
      (<jest.Mock>axios.get).mockRejectedValue(apiError);

      const [error] = await repository.getById(inputId);

      expect(axios.get).toBeCalledWith(
        expect.stringMatching(/\/proposals$/),
        expect.objectContaining({
          headers: {
            'content-type': 'application.json',
          },
          params: {
            service_type: VpnServiceTypeEnum.WIREGUARD,
          },
        }),
      );
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(apiError);
    });

    it(`Should successfully get vpn info by id with return null`, async () => {
      (<jest.Mock>axios.get).mockResolvedValue({
        data: [],
      });

      const [error, result] = await repository.getById(inputId);

      expect(axios.get).toBeCalledWith(
        expect.stringMatching(/\/proposals$/),
        expect.objectContaining({
          headers: {
            'content-type': 'application.json',
          },
          params: {
            service_type: VpnServiceTypeEnum.WIREGUARD,
          },
        }),
      );
      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it(`Should successfully get vpn info by id with return null when result of api is null`, async () => {
      (<jest.Mock>axios.get).mockResolvedValue({
        data: outputNullAxiosData,
      });

      const [error, result] = await repository.getById(inputId);

      expect(axios.get).toBeCalledWith(
        expect.stringMatching(/\/proposals$/),
        expect.objectContaining({
          headers: {
            'content-type': 'application.json',
          },
          params: {
            service_type: VpnServiceTypeEnum.WIREGUARD,
          },
        }),
      );
      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it(`Should successfully get vpn info by id with return null when result of api not found`, async () => {
      (<jest.Mock>axios.get).mockResolvedValue({
        data: [outputAxiosData],
      });
      identifierMock.generateId.mockReturnValueOnce('00000000-0000-0000-0000-000000000000');

      const [error, result] = await repository.getById(inputId);

      expect(axios.get).toBeCalledWith(
        expect.stringMatching(/\/proposals$/),
        expect.objectContaining({
          headers: {
            'content-type': 'application.json',
          },
          params: {
            service_type: VpnServiceTypeEnum.WIREGUARD,
          },
        }),
      );
      expect(identifierMock.generateId).toHaveBeenCalled();
      expect(identifierMock.generateId).toBeCalledWith(outputAxiosData.provider_id);
      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it(`Should successfully get vpn info by id with return null when result of api not found`, async () => {
      (<jest.Mock>axios.get).mockResolvedValue({
        data: [outputAxiosData],
      });
      identifierMock.generateId.mockReturnValueOnce('11111111-1111-1111-1111-111111111111');

      const [error, result] = await repository.getById(inputId);

      expect(axios.get).toBeCalledWith(
        expect.stringMatching(/\/proposals$/),
        expect.objectContaining({
          headers: {
            'content-type': 'application.json',
          },
          params: {
            service_type: VpnServiceTypeEnum.WIREGUARD,
          },
        }),
      );
      expect(identifierMock.generateId).toHaveBeenCalled();
      expect(identifierMock.generateId).toBeCalledWith(outputAxiosData.provider_id);
      expect(error).toBeNull();
      expect(result).toEqual(<VpnProviderModel>{
        id: identifierMock.generateId(),
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: outputAxiosData.provider_id,
        providerIpType: VpnProviderIpTypeEnum.HOSTING,
        country: outputAxiosData.location.country,
        isRegister: false,
        quality: outputAxiosData.quality.quality,
        bandwidth: outputAxiosData.quality.bandwidth,
        latency: outputAxiosData.quality.latency,
        insertDate: new Date(),
      });
    });
  });
});
