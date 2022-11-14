import {Test, TestingModule} from '@nestjs/testing';
import {MystProviderProxyService} from './myst-provider-proxy.service';
import {mock, MockProxy} from 'jest-mock-extended';
import {IProviderProxyInterface} from '@src-core/interface/i-provider-proxy.interface';
import {IProxyServiceInterface} from '@src-core/interface/i-proxy-service.interface';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {ProxyDownstreamModel, ProxyStatusEnum, ProxyTypeEnum, ProxyUpstreamModel} from '@src-core/model/proxy.model';
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
import {DefaultModel, defaultModelFactory} from '@src-core/model/defaultModel';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {IProviderServiceInterface} from '@src-core/interface/i-provider-service.interface';

describe('MystProviderProxyService', () => {
  let service: MystProviderProxyService;
  let vpnProviderService: MockProxy<IProviderServiceInterface>;
  let proxyService: MockProxy<IProxyServiceInterface>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    vpnProviderService = mock<IProviderServiceInterface>();
    proxyService = mock<IProxyServiceInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const vpnProviderServiceProvider = 'vpn-provider-service';
    const proxyServiceProvider = 'proxy-service';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: vpnProviderServiceProvider,
          useValue: vpnProviderService,
        },
        {
          provide: proxyServiceProvider,
          useValue: proxyService,
        },
        {
          provide: MystProviderProxyService,
          inject: [vpnProviderServiceProvider, proxyServiceProvider],
          useFactory: (vpnProviderService: IProviderServiceInterface, proxyService: IProxyServiceInterface) =>
            new MystProviderProxyService(vpnProviderService, proxyService),
        },
      ],
    }).compile();

    service = module.get<MystProviderProxyService>(MystProviderProxyService);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe(`Connect vpn provider and create new proxy`, () => {
    let inputProxyWithPort: ProxyUpstreamModel;
    let outputRunnerMyst: RunnerModel<MystIdentityModel>;
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

    it(`Should error connect vpn provider and create new proxy when connect vpn provider`, async () => {
      vpnProviderService.up.mockResolvedValue([new UnknownException()]);

      const [error] = await service.create(inputProxyWithPort);

      expect(vpnProviderService.up).toHaveBeenCalled();
      expect(vpnProviderService.up).toHaveBeenCalledWith(inputProxyWithPort.proxyDownstream[0].refId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error connect vpn provider and create new proxy when create proxy`, async () => {
      vpnProviderService.up.mockResolvedValue([null, outputVpnProviderIsRegister]);
      proxyService.create.mockResolvedValue([new UnknownException()]);

      const [error] = await service.create(inputProxyWithPort);

      expect(vpnProviderService.up).toHaveBeenCalled();
      expect(vpnProviderService.up).toHaveBeenCalledWith(inputProxyWithPort.proxyDownstream[0].refId);
      expect(proxyService.create).toHaveBeenCalled();
      expect((<DefaultModel<ProxyUpstreamModel>><unknown>proxyService.create.mock.calls[0][0]).getDefaultProperties()).toEqual(
        expect.arrayContaining<keyof ProxyUpstreamModel>(['id', 'listenAddr', 'insertDate']),
      );
      expect(proxyService.create.mock.calls[0][0].proxyDownstream).toEqual(
        expect.arrayContaining([expect.objectContaining<Pick<ProxyDownstreamModel, 'refId'>>({refId: inputProxyWithPort.proxyDownstream[0].refId})]),
      );
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully connect vpn provider and create new proxy`, async () => {
      vpnProviderService.up.mockResolvedValue([null, outputVpnProviderIsRegister]);
      proxyService.create.mockResolvedValue([null, outputProxyUpstreamModel]);

      const [error, result] = await service.create(inputProxyWithPort);

      expect(vpnProviderService.up).toHaveBeenCalled();
      expect(vpnProviderService.up).toHaveBeenCalledWith(inputProxyWithPort.proxyDownstream[0].refId);
      expect(proxyService.create).toHaveBeenCalled();
      expect((<DefaultModel<ProxyUpstreamModel>><unknown>proxyService.create.mock.calls[0][0]).getDefaultProperties()).toEqual(
        expect.arrayContaining<keyof ProxyUpstreamModel>(['id', 'listenAddr', 'insertDate']),
      );
      expect(proxyService.create.mock.calls[0][0].proxyDownstream).toEqual(
        expect.arrayContaining([expect.objectContaining<Pick<ProxyDownstreamModel, 'refId'>>({refId: inputProxyWithPort.proxyDownstream[0].refId})]),
      );
      expect(error).toBeNull();
      expect(result).toEqual(outputProxyUpstreamModel);
    });
  });
});
