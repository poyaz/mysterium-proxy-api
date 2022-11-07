import {Test, TestingModule} from '@nestjs/testing';
import {ProxyHttpController} from './proxy.http.controller';
import {mock, MockProxy} from 'jest-mock-extended';
import {IProxyServiceInterface} from '@src-core/interface/i-proxy-service.interface';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {FindProxyQueryDto} from '@src-api/http/controller/proxy/dto/find-proxy-query.dto';
import {ProxyDownstreamModel, ProxyStatusEnum, ProxyTypeEnum, ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {
  RunnerExecEnum,
  RunnerModel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {FilterInstanceType, FilterModel, FilterOperationType} from '@src-core/model/filter.model';
import {CreateProxyInputDto} from '@src-api/http/controller/proxy/dto/create-proxy-input.dto';
import {DefaultModel} from '@src-core/model/defaultModel';

describe('Proxy.HttpController', () => {
  let controller: ProxyHttpController;
  let proxyService: MockProxy<IProxyServiceInterface>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    proxyService = mock<IProxyServiceInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProxyHttpController],
      providers: [
        {
          provide: ProviderTokenEnum.PROXY_SERVICE_DEFAULT,
          useValue: proxyService,
        },
      ],
    }).compile();

    controller = module.get<ProxyHttpController>(ProxyHttpController);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe(`Find all proxy`, () => {
    let inputFindProxyQueryDto: FindProxyQueryDto;
    let inputEmptyFindProxyQueryDto: FindProxyQueryDto;
    let outputRunnerDownstreamModel: RunnerModel<MystIdentityModel>;
    let outputDownstreamProxyModel: ProxyDownstreamModel;
    let outputRunnerUpstreamModel: RunnerModel<[MystIdentityModel, VpnProviderModel]>;
    let outputProxyUpstreamModel: ProxyUpstreamModel;

    beforeEach(() => {
      inputFindProxyQueryDto = new FindProxyQueryDto();
      inputFindProxyQueryDto.filters = {listenPort: 3128};

      inputEmptyFindProxyQueryDto = new FindProxyQueryDto();

      outputRunnerDownstreamModel = new RunnerModel<MystIdentityModel>({
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
      outputRunnerDownstreamModel.label = {
        $namespace: MystIdentityModel.name,
        id: '22222222-2222-2222-2222-222222222222',
        identity: 'identity1',
      };

      outputDownstreamProxyModel = new ProxyDownstreamModel({
        id: '33333333-3333-3333-3333-333333333333',
        refId: '44444444-4444-4444-4444-444444444444',
        ip: '25.14.65.1',
        mask: 32,
        type: ProxyTypeEnum.MYST,
        runner: outputRunnerDownstreamModel,
        status: ProxyStatusEnum.ONLINE,
      });

      outputRunnerUpstreamModel = new RunnerModel<[MystIdentityModel, VpnProviderModel]>({
        id: '55555555-5555-5555-5555-555555555555',
        serial: 'socat-serial',
        name: 'socat-name',
        service: RunnerServiceEnum.SOCAT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketUri: '10.10.10.2',
        socketPort: 3128,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputRunnerUpstreamModel.label = [
        {
          $namespace: MystIdentityModel.name,
          id: '22222222-2222-2222-2222-222222222222',
        },
        {
          $namespace: VpnProviderModel.name,
          id: '66666666-6666-6666-6666-666666666666',
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

    it(`Should error find all proxy without filter`, async () => {
      proxyService.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.findAll(inputEmptyFindProxyQueryDto);

      expect(proxyService.getAll).toHaveBeenCalled();
      expect(proxyService.getAll).toBeCalledWith(new FilterModel<ProxyUpstreamModel>());
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error find all proxy with filter`, async () => {
      proxyService.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.findAll(inputFindProxyQueryDto);

      expect(proxyService.getAll).toHaveBeenCalled();
      expect(proxyService.getAll.mock.calls[0][0].getLengthOfCondition()).toEqual(1);
      expect(proxyService.getAll.mock.calls[0][0].getConditionList()).toEqual(expect.arrayContaining<FilterInstanceType<ProxyUpstreamModel> & { $opr: FilterOperationType }>([
        {
          $opr: 'eq',
          listenPort: inputFindProxyQueryDto.filters.listenPort,
        },
      ]));
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully find all proxy with empty record`, async () => {
      proxyService.getAll.mockResolvedValue([null, [], 0]);

      const [error, result, total] = await controller.findAll(inputEmptyFindProxyQueryDto);

      expect(proxyService.getAll).toHaveBeenCalled();
      expect(proxyService.getAll).toBeCalledWith(new FilterModel<ProxyUpstreamModel>());
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
      expect(total).toEqual(0);
    });

    it(`Should successfully find all proxy with empty record`, async () => {
      proxyService.getAll.mockResolvedValue([null, [outputProxyUpstreamModel], 1]);

      const [error, result, total] = await controller.findAll(inputEmptyFindProxyQueryDto);

      expect(proxyService.getAll).toHaveBeenCalled();
      expect(proxyService.getAll).toBeCalledWith(new FilterModel<ProxyUpstreamModel>());
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(outputProxyUpstreamModel);
      expect(total).toEqual(1);
    });
  });

  describe(`Create new proxy`, () => {
    let inputProxyWithoutPort: CreateProxyInputDto;
    let inputProxyWithPort: CreateProxyInputDto;
    let outputRunnerDownstreamModel: RunnerModel<MystIdentityModel>;
    let outputDownstreamProxyModel: ProxyDownstreamModel;
    let outputRunnerUpstreamModel: RunnerModel<[MystIdentityModel, VpnProviderModel]>;
    let outputProxyUpstreamModel: ProxyUpstreamModel;

    beforeEach(() => {
      inputProxyWithoutPort = new CreateProxyInputDto();
      inputProxyWithoutPort.providerId = identifierMock.generateId();

      inputProxyWithPort = new CreateProxyInputDto();
      inputProxyWithPort.providerId = identifierMock.generateId();
      inputProxyWithPort.listenPort = 3128;

      outputRunnerDownstreamModel = new RunnerModel<MystIdentityModel>({
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
      outputRunnerDownstreamModel.label = {
        $namespace: MystIdentityModel.name,
        id: '22222222-2222-2222-2222-222222222222',
        identity: 'identity1',
      };

      outputDownstreamProxyModel = new ProxyDownstreamModel({
        id: '33333333-3333-3333-3333-333333333333',
        refId: '44444444-4444-4444-4444-444444444444',
        ip: '25.14.65.1',
        mask: 32,
        type: ProxyTypeEnum.MYST,
        runner: outputRunnerDownstreamModel,
        status: ProxyStatusEnum.ONLINE,
      });

      outputRunnerUpstreamModel = new RunnerModel<[MystIdentityModel, VpnProviderModel]>({
        id: '55555555-5555-5555-5555-555555555555',
        serial: 'socat-serial',
        name: 'socat-name',
        service: RunnerServiceEnum.SOCAT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketUri: '10.10.10.2',
        socketPort: 3128,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputRunnerUpstreamModel.label = [
        {
          $namespace: MystIdentityModel.name,
          id: '22222222-2222-2222-2222-222222222222',
        },
        {
          $namespace: VpnProviderModel.name,
          id: '66666666-6666-6666-6666-666666666666',
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

    it(`Should error create new proxy without data`, async () => {
      proxyService.create.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.create(inputProxyWithoutPort);

      expect(proxyService.create).toHaveBeenCalled();
      expect((<DefaultModel<ProxyUpstreamModel>><unknown>proxyService.create.mock.calls[0][0]).getDefaultProperties()).toEqual(
        expect.arrayContaining<keyof ProxyUpstreamModel>(['id', 'listenAddr', 'listenPort', 'insertDate']),
      );
      expect(proxyService.create.mock.calls[0][0].proxyDownstream).toEqual(
        expect.arrayContaining([expect.objectContaining<Pick<ProxyDownstreamModel, 'refId'>>({refId: inputProxyWithPort.providerId})]),
      );
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error create new proxy with data`, async () => {
      proxyService.create.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.create(inputProxyWithPort);

      expect(proxyService.create).toHaveBeenCalled();
      expect((<DefaultModel<ProxyUpstreamModel>><unknown>proxyService.create.mock.calls[0][0]).getDefaultProperties()).toEqual(
        expect.arrayContaining<keyof ProxyUpstreamModel>(['id', 'listenAddr', 'insertDate']),
      );
      expect(proxyService.create.mock.calls[0][0].proxyDownstream).toEqual(
        expect.arrayContaining([expect.objectContaining<Pick<ProxyDownstreamModel, 'refId'>>({refId: inputProxyWithPort.providerId})]),
      );
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully create new proxy`, async () => {
      proxyService.create.mockResolvedValue([null, outputProxyUpstreamModel]);

      const [error, result] = await controller.create(inputProxyWithPort);

      expect(proxyService.create).toHaveBeenCalled();
      expect((<DefaultModel<ProxyUpstreamModel>><unknown>proxyService.create.mock.calls[0][0]).getDefaultProperties()).toEqual(
        expect.arrayContaining<keyof ProxyUpstreamModel>(['id', 'listenAddr', 'insertDate']),
      );
      expect(proxyService.create.mock.calls[0][0].proxyDownstream).toEqual(
        expect.arrayContaining([expect.objectContaining<Pick<ProxyDownstreamModel, 'refId'>>({refId: inputProxyWithPort.providerId})]),
      );
      expect(error).toBeNull();
      expect(result).toEqual(outputProxyUpstreamModel);
    });
  });

  describe(`Remove proxy`, () => {
    let inputId: string;

    beforeEach(() => {
      inputId = identifierMock.generateId();
    });

    it(`Should error remove proxy with proxy id`, async () => {
      proxyService.remove.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.remove(inputId);

      expect(proxyService.remove).toHaveBeenCalled();
      expect(proxyService.remove).toHaveBeenCalledWith(inputId);
      expect(error).toBeInstanceOf(UnknownException);
    });
  });
});
