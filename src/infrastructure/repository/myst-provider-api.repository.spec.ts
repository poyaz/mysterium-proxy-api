import {Test, TestingModule} from '@nestjs/testing';
import axios from 'axios';
import {RepositoryException} from '@src-core/exception/repository.exception';
import {MystProviderApiRepository} from './myst-provider-api.repository';
import {
  VpnProviderIpTypeEnum,
  VpnProviderModel,
  VpnProviderName,
  VpnServiceTypeEnum,
} from '@src-core/model/vpn-provider.model';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {FilterModel} from '@src-core/model/filter.model';
import {
  RunnerExecEnum,
  RunnerModel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {defaultModelFactory} from '@src-core/model/defaultModel';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {ProviderIdentityInUseException} from '@src-core/exception/provider-identity-in-use.exception';
import {Logger} from '@nestjs/common';
import {ProviderIdentityNotConnectingException} from '@src-core/exception/provider-identity-not-connecting.exception';

jest.mock('axios');

describe('MystProviderApiRepository', () => {
  let repository: MystProviderApiRepository;
  let identifierMock: MockProxy<IIdentifier>;
  let username: string;
  let password: string;
  let logger: MockProxy<Logger>;

  beforeEach(async () => {
    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    username = 'user';
    password = 'pass';

    logger = mock<Logger>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProviderTokenEnum.IDENTIFIER_UUID,
          useValue: identifierMock,
        },
        {
          provide: Logger,
          useValue: logger,
        },
        {
          provide: MystProviderApiRepository,
          inject: [ProviderTokenEnum.IDENTIFIER_UUID, Logger],
          useFactory: (identifier: IIdentifier, logger: Logger) =>
            new MystProviderApiRepository(identifier, 'https://myst.com', username, password, logger),
        },
      ],
    }).compile();

    repository = module.get<MystProviderApiRepository>(MystProviderApiRepository);

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
    let inputRunnerModel: RunnerModel;
    let inputPaginationFilter: FilterModel<VpnProviderModel>;
    let inputCountryFilter: FilterModel<VpnProviderModel>;
    let inputIsRegisterFilter: FilterModel<VpnProviderModel>;
    let inputProviderIdFilter: FilterModel<VpnProviderModel>;
    let inputProviderIpTypeFilter: FilterModel<VpnProviderModel>;

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

      inputRunnerModel = defaultModelFactory<RunnerModel>(
        RunnerModel,
        {
          id: 'default-id',
          serial: 'default-serial',
          name: 'default-name',
          service: RunnerServiceEnum.MYST,
          exec: RunnerExecEnum.DOCKER,
          socketType: RunnerSocketTypeEnum.HTTP,
          status: RunnerStatusEnum.RUNNING,
          insertDate: new Date(),
        },
        ['id', 'serial', 'name', 'service', 'exec', 'socketType', 'status', 'insertDate'],
      );

      inputPaginationFilter = new FilterModel<VpnProviderModel>({page: 2, limit: 1});

      inputCountryFilter = new FilterModel<VpnProviderModel>();
      inputCountryFilter.addCondition({$opr: 'eq', country: 'GB'});

      inputIsRegisterFilter = new FilterModel<VpnProviderModel>({page: 2, limit: 1});
      inputIsRegisterFilter.addCondition({$opr: 'eq', isRegister: true});

      inputProviderIdFilter = new FilterModel<VpnProviderModel>();
      inputProviderIdFilter.addCondition({$opr: 'eq', providerIdentity: outputAxiosData1.provider_id});

      inputProviderIpTypeFilter = new FilterModel<VpnProviderModel>();
      inputProviderIpTypeFilter.addCondition({$opr: 'eq', providerIpType: VpnProviderIpTypeEnum.HOSTING});
    });

    it(`Should error get all vpn provider when fetch from api`, async () => {
      const apiError = new Error('API call error');
      (<jest.Mock>axios.get).mockRejectedValue(apiError);

      const [error] = await repository.getAll(inputRunnerModel);

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

    it(`Should successfully get all vpn provider and return null when 'providerIpType' is unknown`, async () => {
      (<jest.Mock>axios.get).mockResolvedValue({
        data: [outputFailAxiosData],
      });

      const [error, result] = await repository.getAll(inputRunnerModel);

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
      expect(result).toHaveLength(0);
    });

    it(`Should successfully get all vpn provider with empty record`, async () => {
      (<jest.Mock>axios.get).mockResolvedValue({
        data: [],
      });

      const [error, result] = await repository.getAll(inputRunnerModel);

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

      const [error, result] = await repository.getAll(inputRunnerModel);

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

      const [error, result] = await repository.getAll(inputRunnerModel);

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
        proxyCount: 0,
        insertDate: new Date(),
      });
    });

    it(`Should successfully get all vpn provider with pagination (get limit data)`, async () => {
      (<jest.Mock>axios.get).mockResolvedValue({
        data: [outputAxiosData1, outputAxiosData2],
      });

      const [error, result, totalCount] = await repository.getAll(inputRunnerModel, inputPaginationFilter);

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
        proxyCount: 0,
        insertDate: new Date(),
      });
      expect(totalCount).toEqual(2);
    });

    it(`Should successfully get all vpn provider with 'country' filter (get limit data)`, async () => {
      (<jest.Mock>axios.get).mockResolvedValue({
        data: [outputAxiosData1, outputAxiosData2],
      });

      const [error, result, totalCount] = await repository.getAll(inputRunnerModel, inputCountryFilter);

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
        proxyCount: 0,
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
        proxyCount: 0,
        insertDate: new Date(),
      });
      expect(totalCount).toEqual(2);
    });

    it(`Should successfully get all vpn provider with 'isRegister' filter (get all data)`, async () => {
      (<jest.Mock>axios.get).mockResolvedValue({
        data: [outputAxiosData1, outputAxiosData2, outputAxiosData3],
      });

      const [error, result, totalCount] = await repository.getAll(inputRunnerModel, inputIsRegisterFilter);

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
        proxyCount: 0,
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
        proxyCount: 0,
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
        proxyCount: 0,
        insertDate: new Date(),
      });
      expect(totalCount).toEqual(3);
    });

    it(`Should successfully get all vpn provider with 'providerIdentity' filter (get limit data)`, async () => {
      (<jest.Mock>axios.get).mockResolvedValue({
        data: [outputAxiosData1],
      });

      const [error, result, totalCount] = await repository.getAll(inputRunnerModel, inputProviderIdFilter);

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
        proxyCount: 0,
        insertDate: new Date(),
      });
      expect(totalCount).toEqual(1);
    });

    it(`Should successfully get all vpn provider with 'providerIpType' filter (get limit data)`, async () => {
      (<jest.Mock>axios.get).mockResolvedValue({
        data: [outputAxiosData1],
      });

      const [error, result, totalCount] = await repository.getAll(inputRunnerModel, inputProviderIpTypeFilter);

      expect(axios.get).toHaveBeenCalled();
      expect(axios.get).toBeCalledWith(
        expect.stringMatching(/\/proposals$/),
        expect.objectContaining({
          headers: {
            'content-type': 'application.json',
          },
          params: {
            service_type: VpnServiceTypeEnum.WIREGUARD,
            ip_type: inputProviderIpTypeFilter.getCondition('providerIpType').providerIpType,
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
        proxyCount: 0,
        insertDate: new Date(),
      });
      expect(totalCount).toEqual(1);
    });
  });

  describe(`Get vpn info by id`, () => {
    let inputRunnerModel: RunnerModel;
    let inputId: string;
    let outputNullAxiosData = null;
    let outputAxiosData;

    beforeEach(() => {
      inputRunnerModel = defaultModelFactory<RunnerModel>(
        RunnerModel,
        {
          id: 'default-id',
          serial: 'default-serial',
          name: 'default-name',
          service: RunnerServiceEnum.MYST,
          exec: RunnerExecEnum.DOCKER,
          socketType: RunnerSocketTypeEnum.HTTP,
          status: RunnerStatusEnum.RUNNING,
          insertDate: new Date(),
        },
        ['id', 'serial', 'name', 'service', 'exec', 'socketType', 'status', 'insertDate'],
      );
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

      const [error] = await repository.getById(inputRunnerModel, inputId);

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

      const [error, result] = await repository.getById(inputRunnerModel, inputId);

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

      const [error, result] = await repository.getById(inputRunnerModel, inputId);

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

      const [error, result] = await repository.getById(inputRunnerModel, inputId);

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

      const [error, result] = await repository.getById(inputRunnerModel, inputId);

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
        proxyCount: 0,
        insertDate: new Date(),
      });
    });
  });

  describe(`Connect to vpn`, () => {
    let inputRunner: RunnerModel<MystIdentityModel>;
    let inputVpnProvider: VpnProviderModel;
    let outputApiTokenJson: { token: string };
    let outputApiConnectionExist: { error: { code: string, message: string } };
    let outputApiConnectionIp: { ip: string };

    beforeEach(() => {
      inputRunner = new RunnerModel<MystIdentityModel>({
        id: identifierMock.generateId(),
        serial: 'myst-serial',
        name: 'myst-name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketUri: '10.10.10.1',
        socketPort: 4449,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      inputRunner.label = {
        $namespace: MystIdentityModel.name,
        id: identifierMock.generateId(),
        identity: 'identity1',
      };

      inputVpnProvider = new VpnProviderModel({
        id: identifierMock.generateId(),
        userIdentity: 'identity1',
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'providerIdentity1',
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        country: 'GB',
        isRegister: false,
        proxyCount: 0,
        insertDate: new Date(),
      });

      outputApiTokenJson = {token: 'token'};
      outputApiConnectionExist = {error: {code: 'err_connection_already_exists', message: 'Connection already exists'}};

      outputApiConnectionIp = {ip: '127.0.0.1'};
    });

    it(`Should error connect to vpn when get token`, async () => {
      const apiError = new Error('API call error');
      (<jest.Mock>axios.post).mockRejectedValue(apiError);

      const [error] = await repository.connect(inputRunner, inputVpnProvider);

      expect(axios.post).toHaveBeenCalled();
      expect(axios.post).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/auth\/login$/),
        {username, password},
        {headers: {'content-type': 'application.json'}},
      );
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(apiError);
    });

    it(`Should error connect to vpn when trying to connect`, async () => {
      (<jest.Mock>axios.post).mockReturnValue({data: outputApiTokenJson});
      const apiError = new Error('API call error');
      (<jest.Mock>axios.put).mockRejectedValue(apiError);

      const [error] = await repository.connect(inputRunner, inputVpnProvider);

      expect(axios.post).toHaveBeenCalled();
      expect(axios.post).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/auth\/login$/),
        {username, password},
        {headers: {'content-type': 'application.json'}},
      );
      expect(axios.put).toHaveBeenCalled();
      expect(axios.put).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/connection$/),
        {
          consumer_id: inputVpnProvider.userIdentity,
          provider_id: inputVpnProvider.providerIdentity,
          service_type: inputVpnProvider.serviceType,
        },
        {
          headers: {
            'content-type': 'application.json',
            authorization: `Bearer ${outputApiTokenJson.token}`,
          },
        },
      );
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(apiError);
    });

    it(`Should error connect to vpn when connection in use`, async () => {
      (<jest.Mock>axios.post).mockReturnValue({data: outputApiTokenJson});
      const apiError = new Error('API call error');
      apiError['response'] = {data: outputApiConnectionExist};
      (<jest.Mock>axios.put).mockRejectedValue(apiError);

      const [error] = await repository.connect(inputRunner, inputVpnProvider);

      expect(axios.post).toHaveBeenCalled();
      expect(axios.post).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/auth\/login$/),
        {username, password},
        {headers: {'content-type': 'application.json'}},
      );
      expect(axios.put).toHaveBeenCalled();
      expect(axios.put).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/connection$/),
        {
          consumer_id: inputVpnProvider.userIdentity,
          provider_id: inputVpnProvider.providerIdentity,
          service_type: inputVpnProvider.serviceType,
        },
        {
          headers: {
            'content-type': 'application.json',
            authorization: `Bearer ${outputApiTokenJson.token}`,
          },
        },
      );
      expect(error).toBeInstanceOf(ProviderIdentityInUseException);
    });

    it(`Should successfully connect to vpn (Fail to fill ip)`, async () => {
      (<jest.Mock>axios.post).mockReturnValue({data: outputApiTokenJson});
      (<jest.Mock>axios.put).mockReturnValue(null);
      const apiError = new Error('API call error');
      (<jest.Mock>axios.get).mockRejectedValue(apiError);
      logger.error.mockReturnValue(null);

      const [error, result] = await repository.connect(inputRunner, inputVpnProvider);

      expect(axios.post).toHaveBeenCalled();
      expect(axios.post).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/auth\/login$/),
        {username, password},
        {headers: {'content-type': 'application.json'}},
      );
      expect(axios.put).toHaveBeenCalled();
      expect(axios.put).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/connection$/),
        {
          consumer_id: inputVpnProvider.userIdentity,
          provider_id: inputVpnProvider.providerIdentity,
          service_type: inputVpnProvider.serviceType,
        },
        {
          headers: {
            'content-type': 'application.json',
            authorization: `Bearer ${outputApiTokenJson.token}`,
          },
        },
      );
      expect(axios.get).toHaveBeenCalled();
      expect(axios.get).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/connection\/ip$/),
        {
          headers: {
            'content-type': 'application.json',
            authorization: `Bearer ${outputApiTokenJson.token}`,
          },
        },
      );
      expect(logger.error).toHaveBeenCalled();
      expect(error).toBeNull();
      expect(result).toEqual(inputVpnProvider);
    });

    it(`Should successfully connect to vpn (Successfully to fill ip)`, async () => {
      (<jest.Mock>axios.post).mockReturnValue({data: outputApiTokenJson});
      (<jest.Mock>axios.put).mockReturnValue(null);
      (<jest.Mock>axios.get).mockReturnValue({data: outputApiConnectionIp});

      const [error, result] = await repository.connect(inputRunner, inputVpnProvider);

      expect(axios.post).toHaveBeenCalled();
      expect(axios.post).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/auth\/login$/),
        {username, password},
        {headers: {'content-type': 'application.json'}},
      );
      expect(axios.put).toHaveBeenCalled();
      expect(axios.put).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/connection$/),
        {
          consumer_id: inputVpnProvider.userIdentity,
          provider_id: inputVpnProvider.providerIdentity,
          service_type: inputVpnProvider.serviceType,
        },
        {
          headers: {
            'content-type': 'application.json',
            authorization: `Bearer ${outputApiTokenJson.token}`,
          },
        },
      );
      expect(axios.get).toHaveBeenCalled();
      expect(axios.get).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/connection\/ip$/),
        {
          headers: {
            'content-type': 'application.json',
            authorization: `Bearer ${outputApiTokenJson.token}`,
          },
        },
      );
      expect(error).toBeNull();
      expect(result).toEqual(inputVpnProvider);
      expect(result.ip).toEqual(outputApiConnectionIp.ip);
    });
  });

  describe(`Disconnect from vpn`, () => {
    let inputRunner: RunnerModel<MystIdentityModel>;
    let inputForce: boolean;
    let outputApiTokenJson: { token: string };
    let outputApiConnectionNotExist: { error: { code: string, message: string } };

    beforeEach(() => {
      inputRunner = new RunnerModel<MystIdentityModel>({
        id: identifierMock.generateId(),
        serial: 'myst-serial',
        name: 'myst-name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketUri: '10.10.10.1',
        socketPort: 4449,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      inputRunner.label = {
        $namespace: MystIdentityModel.name,
        id: identifierMock.generateId(),
        identity: 'identity1',
      };
      inputForce = true;

      outputApiTokenJson = {token: 'token'};

      outputApiConnectionNotExist = {error: {code: 'err_no_connection_exists', message: 'No connection exists'}};
    });

    it(`Should error disconnect from vpn when get token`, async () => {
      const apiError = new Error('API call error');
      (<jest.Mock>axios.post).mockRejectedValue(apiError);

      const [error] = await repository.disconnect(inputRunner);

      expect(axios.post).toHaveBeenCalled();
      expect(axios.post).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/auth\/login$/),
        {username, password},
        {headers: {'content-type': 'application.json'}},
      );
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(apiError);
    });

    it(`Should error disconnect from vpn when trying to disconnect`, async () => {
      (<jest.Mock>axios.post).mockReturnValue({data: outputApiTokenJson});
      const apiError = new Error('API call error');
      (<jest.Mock>axios.delete).mockRejectedValue(apiError);

      const [error] = await repository.disconnect(inputRunner);

      expect(axios.post).toHaveBeenCalled();
      expect(axios.post).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/auth\/login$/),
        {username, password},
        {headers: {'content-type': 'application.json'}},
      );
      expect(axios.delete).toHaveBeenCalled();
      expect(axios.delete).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/connection$/),
        {
          headers: {
            'content-type': 'application.json',
            authorization: `Bearer ${outputApiTokenJson.token}`,
          },
        },
      );
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(apiError);
    });

    it(`Should error disconnect from vpn when connection not exist (Without force)`, async () => {
      (<jest.Mock>axios.post).mockReturnValue({data: outputApiTokenJson});
      const apiError = new Error('API call error');
      apiError['response'] = {data: outputApiConnectionNotExist};
      (<jest.Mock>axios.delete).mockRejectedValue(apiError);

      const [error] = await repository.disconnect(inputRunner);

      expect(axios.post).toHaveBeenCalled();
      expect(axios.post).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/auth\/login$/),
        {username, password},
        {headers: {'content-type': 'application.json'}},
      );
      expect(axios.delete).toHaveBeenCalled();
      expect(axios.delete).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/connection$/),
        {
          headers: {
            'content-type': 'application.json',
            authorization: `Bearer ${outputApiTokenJson.token}`,
          },
        },
      );
      expect(error).toBeInstanceOf(ProviderIdentityNotConnectingException);
    });

    it(`Should successfully disconnect from vpn (Without force)`, async () => {
      (<jest.Mock>axios.post).mockReturnValue({data: outputApiTokenJson});
      (<jest.Mock>axios.delete).mockReturnValue(null);

      const [error, result] = await repository.disconnect(inputRunner);

      expect(axios.post).toHaveBeenCalled();
      expect(axios.post).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/auth\/login$/),
        {username, password},
        {headers: {'content-type': 'application.json'}},
      );
      expect(axios.delete).toHaveBeenCalled();
      expect(axios.delete).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/connection$/),
        {
          headers: {
            'content-type': 'application.json',
            authorization: `Bearer ${outputApiTokenJson.token}`,
          },
        },
      );
      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it(`Should successfully disconnect from vpn when connection not exist (With force)`, async () => {
      (<jest.Mock>axios.post).mockReturnValue({data: outputApiTokenJson});
      const apiError = new Error('API call error');
      apiError['response'] = {data: outputApiConnectionNotExist};
      (<jest.Mock>axios.delete).mockRejectedValue(apiError);

      const [error, result] = await repository.disconnect(inputRunner, inputForce);

      expect(axios.post).toHaveBeenCalled();
      expect(axios.post).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/auth\/login$/),
        {username, password},
        {headers: {'content-type': 'application.json'}},
      );
      expect(axios.delete).toHaveBeenCalled();
      expect(axios.delete).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/connection$/),
        {
          headers: {
            'content-type': 'application.json',
            authorization: `Bearer ${outputApiTokenJson.token}`,
          },
        },
      );
      expect(error).toBeNull();
      expect(result).toBeNull();
    });
  });

  describe(`Register identity`, () => {
    let inputRunner: RunnerModel<MystIdentityModel>;
    let inputUserIdentity: string;
    let outputApiTokenJson: { token: string };

    beforeEach(() => {
      inputRunner = new RunnerModel<MystIdentityModel>({
        id: identifierMock.generateId(),
        serial: 'myst-serial',
        name: 'myst-name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketUri: '10.10.10.1',
        socketPort: 4449,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      inputRunner.label = {
        $namespace: MystIdentityModel.name,
        id: identifierMock.generateId(),
        identity: 'identity1',
      };

      inputUserIdentity = 'identity1';

      outputApiTokenJson = {token: 'token'};
    });

    it(`Should error register identity when get token`, async () => {
      const apiError = new Error('API call error');
      (<jest.Mock>axios.post).mockRejectedValue(apiError);

      const [error] = await repository.registerIdentity(inputRunner, inputUserIdentity);

      expect(axios.post).toHaveBeenCalled();
      expect(axios.post).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/auth\/login$/),
        {username, password},
        {headers: {'content-type': 'application.json'}},
      );
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(apiError);
    });

    it(`Should error register identity when trying register account`, async () => {
      const apiError = new Error('API call error');
      (<jest.Mock>axios.post)
        .mockResolvedValueOnce({data: outputApiTokenJson})
        .mockRejectedValueOnce(apiError);

      const [error] = await repository.registerIdentity(inputRunner, inputUserIdentity);

      expect(axios.post).toHaveBeenCalledTimes(2);
      expect(axios.post).toHaveBeenNthCalledWith(
        1,
        expect.stringMatching(/\/tequilapi\/auth\/login$/),
        {username, password},
        {headers: {'content-type': 'application.json'}},
      );
      expect(axios.post).toHaveBeenNthCalledWith(
        2,
        expect.stringMatching(/\/tequilapi\/identities\/.+\/register$/),
        {},
        {
          headers: {
            'content-type': 'application.json',
            authorization: `Bearer ${outputApiTokenJson.token}`,
          },
        },
      );
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(apiError);
    });

    it(`Should successfully register identity`, async () => {
      (<jest.Mock>axios.post)
        .mockResolvedValueOnce({data: outputApiTokenJson})
        .mockResolvedValueOnce(null);

      const [error, result] = await repository.registerIdentity(inputRunner, inputUserIdentity);

      expect(axios.post).toHaveBeenCalledTimes(2);
      expect(axios.post).toHaveBeenNthCalledWith(
        1,
        expect.stringMatching(/\/tequilapi\/auth\/login$/),
        {username, password},
        {headers: {'content-type': 'application.json'}},
      );
      expect(axios.post).toHaveBeenNthCalledWith(
        2,
        expect.stringMatching(/\/tequilapi\/identities\/.+\/register$/),
        {},
        {
          headers: {
            'content-type': 'application.json',
            authorization: `Bearer ${outputApiTokenJson.token}`,
          },
        },
      );
      expect(error).toBeNull();
      expect(result).toBeNull();
    });
  });

  describe(`Unlock identity`, () => {
    let inputRunner: RunnerModel<MystIdentityModel>;
    let inputMystIdentity: MystIdentityModel;
    let outputApiTokenJson: { token: string };

    beforeEach(() => {
      inputRunner = new RunnerModel<MystIdentityModel>({
        id: identifierMock.generateId(),
        serial: 'myst-serial',
        name: 'myst-name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketUri: '10.10.10.1',
        socketPort: 4449,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      inputRunner.label = {
        $namespace: MystIdentityModel.name,
        id: identifierMock.generateId(),
        identity: 'identity1',
      };

      inputMystIdentity = new MystIdentityModel({
        id: identifierMock.generateId(),
        identity: 'identity1',
        passphrase: 'passphrase identity1',
        path: '/path/of/identity1',
        filename: 'identity1.json',
        isUse: true,
        insertDate: new Date(),
      });

      outputApiTokenJson = {token: 'token'};
    });

    it(`Should error unlock identity when get token`, async () => {
      const apiError = new Error('API call error');
      (<jest.Mock>axios.post).mockRejectedValue(apiError);

      const [error] = await repository.unlockIdentity(inputRunner, inputMystIdentity);

      expect(axios.post).toHaveBeenCalled();
      expect(axios.post).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/auth\/login$/),
        {username, password},
        {headers: {'content-type': 'application.json'}},
      );
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(apiError);
    });

    it(`Should error unlock identity when trying unlock`, async () => {
      const apiError = new Error('API call error');
      (<jest.Mock>axios.post).mockResolvedValue({data: outputApiTokenJson});
      (<jest.Mock>axios.put).mockRejectedValue(apiError);

      const [error] = await repository.unlockIdentity(inputRunner, inputMystIdentity);

      expect(axios.post).toHaveBeenCalled();
      expect(axios.post).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/auth\/login$/),
        {username, password},
        {headers: {'content-type': 'application.json'}},
      );
      expect(axios.put).toHaveBeenCalled();
      expect(axios.put).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/identities\/.+\/unlock$/),
        {passphrase: inputMystIdentity.passphrase},
        {
          headers: {
            'content-type': 'application.json',
            authorization: `Bearer ${outputApiTokenJson.token}`,
          },
        },
      );
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(apiError);
    });

    it(`Should successfully unlock identity`, async () => {
      const apiError = new Error('API call error');
      (<jest.Mock>axios.post).mockResolvedValue({data: outputApiTokenJson});
      (<jest.Mock>axios.put).mockResolvedValue(null);

      const [error, result] = await repository.unlockIdentity(inputRunner, inputMystIdentity);

      expect(axios.post).toHaveBeenCalled();
      expect(axios.post).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/auth\/login$/),
        {username, password},
        {headers: {'content-type': 'application.json'}},
      );
      expect(axios.put).toHaveBeenCalled();
      expect(axios.put).toBeCalledWith(
        expect.stringMatching(/\/tequilapi\/identities\/.+\/unlock$/),
        {passphrase: inputMystIdentity.passphrase},
        {
          headers: {
            'content-type': 'application.json',
            authorization: `Bearer ${outputApiTokenJson.token}`,
          },
        },
      );
      expect(error).toBeNull();
      expect(result).toBeNull();
    });
  });
});
