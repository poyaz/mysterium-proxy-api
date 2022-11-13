import {Test, TestingModule} from '@nestjs/testing';
import {ProxyService} from './proxy.service';
import {mock, MockProxy} from 'jest-mock-extended';
import {IProxyRepositoryInterface} from '@src-core/interface/i-proxy-repository.interface';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {FilterModel} from '@src-core/model/filter.model';
import {ProxyDownstreamModel, ProxyStatusEnum, ProxyTypeEnum, ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {
  RunnerExecEnum,
  RunnerModel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {
  VpnProviderIpTypeEnum,
  VpnProviderModel,
  VpnProviderName,
  VpnServiceTypeEnum,
} from '@src-core/model/vpn-provider.model';
import {defaultModelFactory} from '@src-core/model/defaultModel';
import {IProviderServiceInterface} from '@src-core/interface/i-provider-service.interface';
import {NotFoundException} from '@src-core/exception/not-found.exception';
import {ProviderIdentityNotConnectingException} from '@src-core/exception/provider-identity-not-connecting.exception';

describe('ProxyService', () => {
  let service: ProxyService;
  let proxyRepository: MockProxy<IProxyRepositoryInterface>;
  let providerService: MockProxy<IProviderServiceInterface>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    proxyRepository = mock<IProxyRepositoryInterface>();
    providerService = mock<IProviderServiceInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const proxyRepositoryProvider = 'proxy-repository';
    const providerServiceProvider = 'provider-service';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: proxyRepositoryProvider,
          useValue: proxyRepository,
        },
        {
          provide: providerServiceProvider,
          useValue: providerService,
        },
        {
          provide: ProxyService,
          inject: [proxyRepositoryProvider, providerServiceProvider],
          useFactory: (proxyRepository: IProxyRepositoryInterface, providerService: IProviderServiceInterface) =>
            new ProxyService(proxyRepository, providerService),
        },
      ],
    }).compile();

    service = module.get<ProxyService>(ProxyService);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe(`Get all proxy`, () => {
    let inputFilter: FilterModel<ProxyUpstreamModel>;
    let outputRunnerDownstreamModel: RunnerModel<[MystIdentityModel, VpnProviderModel]>;
    let outputDownstreamProxyModel: ProxyDownstreamModel;
    let outputRunnerUpstreamModel: RunnerModel<[MystIdentityModel, VpnProviderModel]>;
    let outputProxyUpstreamModel: ProxyUpstreamModel;

    beforeEach(() => {
      inputFilter = new FilterModel<ProxyUpstreamModel>();

      outputRunnerDownstreamModel = new RunnerModel<[MystIdentityModel, VpnProviderModel]>({
        id: '33333333-3333-3333-3333-333333333333',
        serial: 'envoy-serial',
        name: 'envoy-name',
        service: RunnerServiceEnum.ENVOY,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketUri: '10.10.10.2',
        socketPort: 10001,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputRunnerDownstreamModel.label = [
        {
          $namespace: MystIdentityModel.name,
          id: '44444444-4444-4444-4444-444444444444',
        },
        {
          $namespace: VpnProviderModel.name,
          id: '55555555-5555-5555-5555-5555555555555',
        },
      ];

      outputDownstreamProxyModel = new ProxyDownstreamModel({
        id: '66666666-6666-6666-6666-666666666666',
        refId: '77777777-7777-7777-7777-777777777777',
        ip: '25.14.65.1',
        mask: 32,
        type: ProxyTypeEnum.MYST,
        runner: outputRunnerDownstreamModel,
        status: ProxyStatusEnum.ONLINE,
      });

      outputRunnerUpstreamModel = new RunnerModel<[MystIdentityModel, VpnProviderModel]>({
        id: '88888888-8888-8888-8888-888888888888',
        serial: 'socat-serial',
        name: 'socat-name',
        service: RunnerServiceEnum.SOCAT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketUri: '10.10.10.3',
        socketPort: 3128,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputRunnerUpstreamModel.label = [
        {
          $namespace: MystIdentityModel.name,
          id: '44444444-4444-4444-4444-444444444444',
        },
        {
          $namespace: VpnProviderModel.name,
          id: '55555555-5555-5555-5555-5555555555555',
        },
      ];

      outputProxyUpstreamModel = new ProxyUpstreamModel({
        id: identifierMock.generateId(),
        listenAddr: '114.25.11.1',
        listenPort: 3128,
        proxyDownstream: [outputDownstreamProxyModel],
        runner: outputRunnerUpstreamModel,
        insertDate: new Date(),
      });
    });

    it(`Should error get all proxy without filter`, async () => {
      proxyRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.getAll();

      expect(proxyRepository.getAll).toHaveBeenCalled();
      expect(proxyRepository.getAll).toHaveBeenCalledWith(undefined);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all proxy with filter`, async () => {
      proxyRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.getAll(inputFilter);

      expect(proxyRepository.getAll).toHaveBeenCalled();
      expect(proxyRepository.getAll).toHaveBeenCalledWith(inputFilter);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get all proxy and return empty records`, async () => {
      proxyRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result, total] = await service.getAll(inputFilter);

      expect(proxyRepository.getAll).toHaveBeenCalled();
      expect(proxyRepository.getAll).toHaveBeenCalledWith(inputFilter);
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
      expect(total).toEqual(0);
    });

    it(`Should successfully get all proxy`, async () => {
      proxyRepository.getAll.mockResolvedValue([null, [outputProxyUpstreamModel], 1]);

      const [error, result, total] = await service.getAll(inputFilter);

      expect(proxyRepository.getAll).toHaveBeenCalled();
      expect(proxyRepository.getAll).toHaveBeenCalledWith(inputFilter);
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(outputProxyUpstreamModel);
      expect(total).toEqual(1);
    });
  });

  describe(`Create new proxy`, () => {
    let inputProxyWithPort: ProxyUpstreamModel;
    let outputRunnerMyst: RunnerModel<MystIdentityModel>;
    let outputVpnProviderIsNotRegistered: VpnProviderModel;
    let outputVpnProviderIsRegister: VpnProviderModel;
    let outputRunnerDownstreamModel: RunnerModel<[MystIdentityModel, VpnProviderModel]>;
    let outputDownstreamProxyModel: ProxyDownstreamModel;
    let outputRunnerUpstreamModel: RunnerModel<[MystIdentityModel, VpnProviderModel]>;
    let outputProxyUpstreamModel: ProxyUpstreamModel;

    beforeEach(() => {
      inputProxyWithPort = defaultModelFactory(
        ProxyUpstreamModel,
        {
          id: 'default-id',
          listenAddr: 'listen-addr-default',
          listenPort: 3128,
          proxyDownstream: [
            defaultModelFactory<ProxyDownstreamModel>(
              ProxyDownstreamModel,
              {
                id: 'default-id',
                refId: '44444444-4444-4444-4444-444444444444',
                ip: 'default-ip',
                mask: 32,
                type: ProxyTypeEnum.MYST,
                status: ProxyStatusEnum.OFFLINE,
              },
              ['id', 'ip', 'mask', 'status'],
            ),
          ],
          insertDate: new Date(),
        },
        ['id', 'listenAddr', 'insertDate'],
      );

      outputRunnerMyst = new RunnerModel<MystIdentityModel>({
        id: '11111111-1111-1111-1111-111111111111',
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
      outputRunnerMyst.label = {
        $namespace: MystIdentityModel.name,
        id: '22222222-2222-2222-2222-222222222222',
        identity: 'identity1',
      };

      outputVpnProviderIsNotRegistered = new VpnProviderModel({
        id: identifierMock.generateId(),
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'provider-identity1',
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        country: 'GB',
        isRegister: false,
        proxyCount: 0,
        insertDate: new Date(),
      });
      outputVpnProviderIsRegister = new VpnProviderModel({
        id: identifierMock.generateId(),
        userIdentity: outputRunnerMyst.label.identity,
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'provider-identity1',
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        ip: '25.14.65.1',
        mask: 32,
        country: 'GB',
        runner: outputRunnerMyst,
        isRegister: true,
        proxyCount: 0,
        insertDate: new Date(),
      });

      outputRunnerDownstreamModel = new RunnerModel<[MystIdentityModel, VpnProviderModel]>({
        id: '33333333-3333-3333-3333-333333333333',
        serial: 'envoy-serial',
        name: 'envoy-name',
        service: RunnerServiceEnum.ENVOY,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketUri: '10.10.10.2',
        socketPort: 10001,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputRunnerDownstreamModel.label = [
        {
          $namespace: MystIdentityModel.name,
          id: '44444444-4444-4444-4444-444444444444',
        },
        {
          $namespace: VpnProviderModel.name,
          id: '55555555-5555-5555-5555-5555555555555',
        },
      ];

      outputDownstreamProxyModel = new ProxyDownstreamModel({
        id: '66666666-6666-6666-6666-666666666666',
        refId: inputProxyWithPort.proxyDownstream[0].refId,
        ip: outputVpnProviderIsRegister.ip,
        mask: outputVpnProviderIsRegister.mask,
        type: ProxyTypeEnum.MYST,
        runner: outputRunnerDownstreamModel,
        status: ProxyStatusEnum.ONLINE,
      });

      outputRunnerUpstreamModel = new RunnerModel<[MystIdentityModel, VpnProviderModel]>({
        id: '88888888-8888-8888-8888-888888888888',
        serial: 'socat-serial',
        name: 'socat-name',
        service: RunnerServiceEnum.SOCAT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketUri: '10.10.10.3',
        socketPort: 3128,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputRunnerUpstreamModel.label = [
        {
          $namespace: MystIdentityModel.name,
          id: '44444444-4444-4444-4444-444444444444',
        },
        {
          $namespace: VpnProviderModel.name,
          id: '55555555-5555-5555-5555-5555555555555',
        },
      ];

      outputProxyUpstreamModel = new ProxyUpstreamModel({
        id: identifierMock.generateId(),
        listenAddr: '0.0.0.0',
        listenPort: inputProxyWithPort.listenPort,
        proxyDownstream: [outputDownstreamProxyModel],
        runner: outputRunnerUpstreamModel,
        insertDate: new Date(),
      });
    });

    it(`Should error create new proxy when get provider`, async () => {
      providerService.getById.mockResolvedValue([new UnknownException()]);

      const [error] = await service.create(inputProxyWithPort);

      expect(providerService.getById).toHaveBeenCalled();
      expect(providerService.getById).toHaveBeenCalledWith(inputProxyWithPort.proxyDownstream[0].refId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error create new proxy when get provider not found`, async () => {
      providerService.getById.mockResolvedValue([null, null]);

      const [error] = await service.create(inputProxyWithPort);

      expect(providerService.getById).toHaveBeenCalled();
      expect(providerService.getById).toHaveBeenCalledWith(inputProxyWithPort.proxyDownstream[0].refId);
      expect(error).toBeInstanceOf(NotFoundException);
    });

    it(`Should error create new proxy when provider is not registered`, async () => {
      providerService.getById.mockResolvedValue([null, outputVpnProviderIsNotRegistered]);

      const [error] = await service.create(inputProxyWithPort);

      expect(providerService.getById).toHaveBeenCalled();
      expect(providerService.getById).toHaveBeenCalledWith(inputProxyWithPort.proxyDownstream[0].refId);
      expect(error).toBeInstanceOf(ProviderIdentityNotConnectingException);
    });

    it(`Should error create new proxy`, async () => {
      providerService.getById.mockResolvedValue([null, outputVpnProviderIsRegister]);
      proxyRepository.create.mockResolvedValue([new UnknownException()]);

      const [error] = await service.create(inputProxyWithPort);

      expect(providerService.getById).toHaveBeenCalled();
      expect(providerService.getById).toHaveBeenCalledWith(inputProxyWithPort.proxyDownstream[0].refId);
      expect(proxyRepository.create).toHaveBeenCalled();
      expect(proxyRepository.create).toHaveBeenCalledWith(inputProxyWithPort);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully create new proxy`, async () => {
      providerService.getById.mockResolvedValue([null, outputVpnProviderIsRegister]);
      proxyRepository.create.mockResolvedValue([null, outputProxyUpstreamModel]);

      const [error, result] = await service.create(inputProxyWithPort);

      expect(providerService.getById).toHaveBeenCalled();
      expect(providerService.getById).toHaveBeenCalledWith(inputProxyWithPort.proxyDownstream[0].refId);
      expect(proxyRepository.create).toHaveBeenCalled();
      expect(proxyRepository.create).toHaveBeenCalledWith(inputProxyWithPort);
      expect(error).toBeNull();
      expect(result).toEqual(outputProxyUpstreamModel);
    });
  });

  describe(`Remove proxy`, () => {
    let inputId: string;
    let outputProxyUpstreamModel: ProxyUpstreamModel;

    beforeEach(() => {
      inputId = identifierMock.generateId();

      outputProxyUpstreamModel = defaultModelFactory<ProxyUpstreamModel>(
        ProxyUpstreamModel,
        {
          id: identifierMock.generateId(),
          listenAddr: '0.0.0.0',
          listenPort: 3128,
          proxyDownstream: [],
          insertDate: new Date(),
        },
        ['proxyDownstream', 'insertDate'],
      );
    });

    it(`Should error remove proxy when get proxy info`, async () => {
      proxyRepository.getById.mockResolvedValue([new UnknownException()]);

      const [error] = await service.remove(inputId);

      expect(proxyRepository.getById).toHaveBeenCalled();
      expect(proxyRepository.getById).toHaveBeenCalledWith(inputId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error remove proxy when not found proxy`, async () => {
      proxyRepository.getById.mockResolvedValue([null, null]);

      const [error] = await service.remove(inputId);

      expect(proxyRepository.getById).toHaveBeenCalled();
      expect(proxyRepository.getById).toHaveBeenCalledWith(inputId);
      expect(error).toBeInstanceOf(NotFoundException);
    });

    it(`Should error remove proxy`, async () => {
      proxyRepository.getById.mockResolvedValue([null, outputProxyUpstreamModel]);
      proxyRepository.remove.mockResolvedValue([new UnknownException()]);

      const [error] = await service.remove(inputId);

      expect(proxyRepository.getById).toHaveBeenCalled();
      expect(proxyRepository.getById).toHaveBeenCalledWith(inputId);
      expect(proxyRepository.remove).toHaveBeenCalled();
      expect(proxyRepository.remove).toHaveBeenCalledWith(inputId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully remove proxy`, async () => {
      proxyRepository.getById.mockResolvedValue([null, outputProxyUpstreamModel]);
      proxyRepository.remove.mockResolvedValue([null, null]);

      const [error, result] = await service.remove(inputId);

      expect(proxyRepository.getById).toHaveBeenCalled();
      expect(proxyRepository.getById).toHaveBeenCalledWith(inputId);
      expect(proxyRepository.remove).toHaveBeenCalled();
      expect(proxyRepository.remove).toHaveBeenCalledWith(inputId);
      expect(error).toBeNull();
      expect(result).toBeNull();
    });
  });
});
