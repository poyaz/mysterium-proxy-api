import {Test, TestingModule} from '@nestjs/testing';
import {MystProviderProxyHttpController} from './myst-provider-proxy-http.controller';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {
  RunnerExecEnum,
  RunnerModel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';
import {ProxyDownstreamModel, ProxyStatusEnum, ProxyTypeEnum, ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {DefaultModel} from '@src-core/model/defaultModel';
import {CreateProxyWithConnectInputDto} from '@src-api/http/controller/proxy/myst/dto/create-proxy-with-connect-input.dto';
import {IProviderProxyInterface} from '@src-core/interface/i-provider-proxy.interface';

describe('MystProviderProxyHttpController', () => {
  let controller: MystProviderProxyHttpController;
  let vpnProviderProxyService: MockProxy<IProviderProxyInterface>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    vpnProviderProxyService = mock<IProviderProxyInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MystProviderProxyHttpController],
      providers: [
        {
          provide: ProviderTokenEnum.MYST_PROVIDER_PROXY_SERVICE_DEFAULT,
          useValue: vpnProviderProxyService,
        },
      ],
    }).compile();

    controller = module.get<MystProviderProxyHttpController>(MystProviderProxyHttpController);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe(`Connect vpn provider and create new proxy`, () => {
    let inputProviderId: string;
    let inputProxyWithoutPort: CreateProxyWithConnectInputDto;
    let inputProxyWithPort: CreateProxyWithConnectInputDto;
    let outputRunnerDownstreamModel: RunnerModel<[MystIdentityModel, VpnProviderModel]>;
    let outputDownstreamProxyModel: ProxyDownstreamModel;
    let outputRunnerUpstreamModel: RunnerModel<[MystIdentityModel, VpnProviderModel]>;
    let outputProxyUpstreamModel: ProxyUpstreamModel;

    beforeEach(() => {
      inputProviderId = identifierMock.generateId();

      inputProxyWithoutPort = new CreateProxyWithConnectInputDto();

      inputProxyWithPort = new CreateProxyWithConnectInputDto();
      inputProxyWithPort.listenPort = 3128;

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
        country: 'GB',
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
        listenPort: inputProxyWithPort.listenPort,
        proxyDownstream: [outputDownstreamProxyModel],
        runner: outputRunnerUpstreamModel,
        insertDate: new Date(),
      });
    });

    it(`Should error connect vpn provider and create new proxy without data`, async () => {
      vpnProviderProxyService.create.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.create(inputProviderId, inputProxyWithoutPort);

      expect(vpnProviderProxyService.create).toHaveBeenCalled();
      expect((<DefaultModel<ProxyUpstreamModel>><unknown>vpnProviderProxyService.create.mock.calls[0][0]).getDefaultProperties()).toEqual(
        expect.arrayContaining<keyof ProxyUpstreamModel>(['id', 'listenAddr', 'listenPort', 'insertDate']),
      );
      expect(vpnProviderProxyService.create.mock.calls[0][0].proxyDownstream).toEqual(
        expect.arrayContaining([expect.objectContaining<Pick<ProxyDownstreamModel, 'refId'>>({refId: inputProviderId})]),
      );
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error connect vpn provider and create new proxy with data`, async () => {
      vpnProviderProxyService.create.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.create(inputProviderId, inputProxyWithPort);

      expect(vpnProviderProxyService.create).toHaveBeenCalled();
      expect((<DefaultModel<ProxyUpstreamModel>><unknown>vpnProviderProxyService.create.mock.calls[0][0]).getDefaultProperties()).toEqual(
        expect.arrayContaining<keyof ProxyUpstreamModel>(['id', 'listenAddr', 'insertDate']),
      );
      expect(vpnProviderProxyService.create.mock.calls[0][0].proxyDownstream).toEqual(
        expect.arrayContaining([expect.objectContaining<Pick<ProxyDownstreamModel, 'refId'>>({refId: inputProviderId})]),
      );
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully connect vpn provider and create new proxy`, async () => {
      vpnProviderProxyService.create.mockResolvedValue([null, outputProxyUpstreamModel]);

      const [error, result] = await controller.create(inputProviderId, inputProxyWithPort);

      expect(vpnProviderProxyService.create).toHaveBeenCalled();
      expect((<DefaultModel<ProxyUpstreamModel>><unknown>vpnProviderProxyService.create.mock.calls[0][0]).getDefaultProperties()).toEqual(
        expect.arrayContaining<keyof ProxyUpstreamModel>(['id', 'listenAddr', 'insertDate']),
      );
      expect(vpnProviderProxyService.create.mock.calls[0][0].proxyDownstream).toEqual(
        expect.arrayContaining([expect.objectContaining<Pick<ProxyDownstreamModel, 'refId'>>({refId: inputProviderId})]),
      );
      expect(error).toBeNull();
      expect(result).toEqual(outputProxyUpstreamModel);
    });
  });

  describe(`Disconnect vpn provider and remove new proxy`, () => {
    let inputId: string;

    beforeEach(() => {
      inputId = identifierMock.generateId();
    });

    it(`Should error disconnect vpn provider and remove new proxy`, async () => {
      vpnProviderProxyService.down.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.remove(inputId);

      expect(vpnProviderProxyService.down).toHaveBeenCalled();
      expect(vpnProviderProxyService.down).toHaveBeenCalledWith(inputId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully disconnect vpn provider and remove new proxy`, async () => {
      vpnProviderProxyService.down.mockResolvedValue([null, null]);

      const [error, result] = await controller.remove(inputId);

      expect(vpnProviderProxyService.down).toHaveBeenCalled();
      expect(vpnProviderProxyService.down).toHaveBeenCalledWith(inputId);
      expect(error).toBeNull();
      expect(result).toBeNull();
    });
  });
});
