import {Test, TestingModule} from '@nestjs/testing';
import {MystService} from './myst.service';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {FilterModel} from '@src-core/model/filter.model';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {
  VpnProviderIpTypeEnum,
  VpnProviderModel,
  VpnProviderName,
  VpnProviderStatusEnum,
  VpnServiceTypeEnum,
} from '@src-core/model/vpn-provider.model';
import {IRunnerServiceInterface} from '@src-core/interface/i-runner-service.interface';
import {ISystemInfoRepositoryInterface} from '@src-core/interface/i-system-info-repository.interface';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {ExistException} from '@src-core/exception/exist.exception';
import {NotFoundException} from '@src-core/exception/not-found.exception';
import {NotFoundMystIdentityException} from '@src-core/exception/not-found-myst-identity.exception';
import {
  RunnerDependsOnStatusEnum,
  RunnerExecEnum,
  RunnerModel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {IProxyApiRepositoryInterface} from '@src-core/interface/i-proxy-api-repository.interface';
import {VpnDisconnectException} from '@src-core/exception/vpn-disconnect.exception';

describe('MystService', () => {
  let service: MystService;
  let proxyApiRepository: MockProxy<IProxyApiRepositoryInterface>;
  let runnerDockerService: MockProxy<IRunnerServiceInterface>;
  let systemInfoRepository: MockProxy<ISystemInfoRepositoryInterface>;
  let mystIdentityRepository: MockProxy<IGenericRepositoryInterface<MystIdentityModel>>;
  let identifierMock: MockProxy<IIdentifier>;
  let fakeIdentifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    proxyApiRepository = mock<IProxyApiRepositoryInterface>();
    runnerDockerService = mock<IRunnerServiceInterface>();
    systemInfoRepository = mock<ISystemInfoRepositoryInterface>();
    mystIdentityRepository = mock<IGenericRepositoryInterface<MystIdentityModel>>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    fakeIdentifierMock = mock<IIdentifier>();
    fakeIdentifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProviderTokenEnum.MYST_API_REPOSITORY,
          useValue: proxyApiRepository,
        },
        {
          provide: ProviderTokenEnum.RUNNER_SERVICE_DOCKER,
          useValue: runnerDockerService,
        },
        {
          provide: ProviderTokenEnum.SYSTEM_INFO_REPOSITORY,
          useValue: systemInfoRepository,
        },
        {
          provide: ProviderTokenEnum.MYST_IDENTITY_PG_REPOSITORY,
          useValue: mystIdentityRepository,
        },
        {
          provide: ProviderTokenEnum.IDENTIFIER_UUID_NULL,
          useValue: fakeIdentifierMock,
        },
        {
          provide: MystService,
          inject: [
            ProviderTokenEnum.MYST_API_REPOSITORY,
            ProviderTokenEnum.RUNNER_SERVICE_DOCKER,
            ProviderTokenEnum.SYSTEM_INFO_REPOSITORY,
            ProviderTokenEnum.MYST_IDENTITY_PG_REPOSITORY,
            ProviderTokenEnum.IDENTIFIER_UUID_NULL,
          ],
          useFactory: (
            proxyApiRepository: IProxyApiRepositoryInterface,
            runnerDockerService: IRunnerServiceInterface,
            systemInfoRepository: ISystemInfoRepositoryInterface,
            mystIdentityRepository: IGenericRepositoryInterface<MystIdentityModel>,
            fakeIdentifier: IIdentifier,
          ) =>
            new MystService(
              proxyApiRepository,
              runnerDockerService,
              systemInfoRepository,
              mystIdentityRepository,
              fakeIdentifier,
            ),
        },
      ],
    }).compile();

    service = module.get<MystService>(MystService);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it(`should be defined`, () => {
    expect(service).toBeDefined();
  });

  describe(`Get all proxy list`, () => {
    let inputFilterModel: FilterModel<VpnProviderModel>;
    let outputFindVpnProviderModel: VpnProviderModel;
    let matchFilterModel: FilterModel<VpnProviderModel>;

    beforeEach(() => {
      inputFilterModel = new FilterModel<VpnProviderModel>();
      inputFilterModel.addCondition({country: 'GB', $opr: 'eq'});

      outputFindVpnProviderModel = new VpnProviderModel({
        id: identifierMock.generateId(),
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'provider identity',
        providerIpType: VpnProviderIpTypeEnum.HOSTING,
        ip: '1.1.1.1',
        mask: 32,
        country: 'GB',
        isRegister: false,
        insertDate: new Date(),
      });

      matchFilterModel = new FilterModel<VpnProviderModel>();
      matchFilterModel.addCondition({country: 'GB', $opr: 'eq'});
    });

    it(`Should error find all proxy list`, async () => {
      proxyApiRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.findAll();

      expect(proxyApiRepository.getAll).toHaveBeenCalled();
      expect(proxyApiRepository.getAll).toBeCalledWith(undefined);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully find all proxy list without filter and return empty records`, async () => {
      proxyApiRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result, count] = await service.findAll();

      expect(proxyApiRepository.getAll).toHaveBeenCalled();
      expect(proxyApiRepository.getAll).toBeCalledWith(undefined);
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
      expect(count).toEqual(0);
    });

    it(`Should successfully find all proxy list with filter and return empty records`, async () => {
      proxyApiRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result, count] = await service.findAll(inputFilterModel);

      expect(proxyApiRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<VpnProviderModel>>proxyApiRepository.getAll.mock.calls[0][0]).getCondition('country')).toMatchObject(
        matchFilterModel.getCondition('country'),
      );
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
      expect(count).toEqual(0);
    });

    it(`Should successfully find all proxy list`, async () => {
      proxyApiRepository.getAll.mockResolvedValue([null, [outputFindVpnProviderModel], 1]);

      const [error, result, count] = await service.findAll();

      expect(proxyApiRepository.getAll).toHaveBeenCalled();
      expect(proxyApiRepository.getAll).toBeCalledWith(undefined);
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject(<VpnProviderModel>{
        id: outputFindVpnProviderModel.id,
        serviceType: outputFindVpnProviderModel.serviceType,
        providerName: outputFindVpnProviderModel.providerName,
        providerIdentity: outputFindVpnProviderModel.providerIdentity,
        providerIpType: outputFindVpnProviderModel.providerIpType,
        ip: outputFindVpnProviderModel.ip,
        mask: outputFindVpnProviderModel.mask,
        country: outputFindVpnProviderModel.country,
        isRegister: outputFindVpnProviderModel.isRegister,
        insertDate: outputFindVpnProviderModel.insertDate,
      });
      expect(count).toEqual(1);
    });
  });

  describe(`Create proxy`, () => {
    let inputId: string;
    let outputCurrentIp: string;
    let outputRegisteredVpnProviderModel: VpnProviderModel;
    let outputFindVpnProviderModel: VpnProviderModel;
    let outputMystIdentityModel: MystIdentityModel;
    let outputMystRunnerModel: RunnerModel;
    let outputMystConnectRunnerModel: RunnerModel;
    let outputEnvoyRunnerModel: RunnerModel;
    let outputCreateMystRunnerModel: RunnerModel;

    beforeEach(() => {
      inputId = identifierMock.generateId();

      outputCurrentIp = '1.2.3.4';

      outputRegisteredVpnProviderModel = new VpnProviderModel({
        id: identifierMock.generateId(),
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'provider identity',
        providerIpType: VpnProviderIpTypeEnum.HOSTING,
        ip: '1.1.1.1',
        mask: 32,
        country: 'GB',
        isRegister: true,
        insertDate: new Date(),
      });

      outputFindVpnProviderModel = new VpnProviderModel({
        id: identifierMock.generateId(),
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'provider identity',
        providerIpType: VpnProviderIpTypeEnum.HOSTING,
        country: 'GB',
        isRegister: false,
        insertDate: new Date(),
      });

      outputMystIdentityModel = new MystIdentityModel({
        id: identifierMock.generateId(),
        identity: 'user identity',
        passphrase: 'identity passphrase',
        path: '/identity/store/path/',
        filename: 'name',
        isUse: false,
        insertDate: new Date(),
      });

      outputMystRunnerModel = new RunnerModel({
        id: identifierMock.generateId(),
        serial: 'myst serial',
        name: 'myst',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketUri: '10.10.10.1',
        socketPort: 4449,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });

      outputMystConnectRunnerModel = new RunnerModel({
        id: identifierMock.generateId(),
        serial: 'myst connect serial',
        name: 'myst-connect',
        service: RunnerServiceEnum.MYST_CONNECT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });

      outputEnvoyRunnerModel = new RunnerModel({
        id: identifierMock.generateId(),
        serial: 'envoy serial',
        name: 'envoy',
        service: RunnerServiceEnum.ENVOY,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketUri: '10.10.10.2',
        socketPort: 10001,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });

      outputCreateMystRunnerModel = new RunnerModel({
        id: identifierMock.generateId(),
        serial: 'myst serial',
        name: 'myst',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketUri: '10.10.10.1',
        socketPort: 4449,
        status: RunnerStatusEnum.CREATING,
        insertDate: new Date(),
      });
    });

    it(`Should error create proxy when get current server ip`, async () => {
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([new UnknownException()]);

      const [error] = await service.up(inputId);

      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error create proxy when get proxy information with id`, async () => {
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outputCurrentIp]);
      proxyApiRepository.getById.mockResolvedValue([new UnknownException()]);

      const [error] = await service.up(inputId);

      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(proxyApiRepository.getById).toHaveBeenCalled();
      expect(proxyApiRepository.getById).toBeCalledWith(inputId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error create proxy when proxy information with id not found`, async () => {
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outputCurrentIp]);
      proxyApiRepository.getById.mockResolvedValue([null, null]);

      const [error] = await service.up(inputId);

      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(proxyApiRepository.getById).toHaveBeenCalled();
      expect(proxyApiRepository.getById).toBeCalledWith(inputId);
      expect(error).toBeInstanceOf(NotFoundException);
    });

    it(`Should error create proxy when ip of proxy has been registered before`, async () => {
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outputCurrentIp]);
      proxyApiRepository.getById.mockResolvedValue([null, outputRegisteredVpnProviderModel]);

      const [error] = await service.up(inputId);

      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(proxyApiRepository.getById).toHaveBeenCalled();
      expect(proxyApiRepository.getById).toBeCalledWith(inputId);
      expect(error).toBeInstanceOf(ExistException);
    });

    it(`Should error create proxy when get list of myst identity`, async () => {
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outputCurrentIp]);
      proxyApiRepository.getById.mockResolvedValue([null, outputFindVpnProviderModel]);
      mystIdentityRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.up(inputId);

      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(proxyApiRepository.getById).toHaveBeenCalled();
      expect(proxyApiRepository.getById).toBeCalledWith(inputId);
      expect(mystIdentityRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>mystIdentityRepository.getAll.mock.calls[0][0]).getCondition('isUse')).toMatchObject({
        $opr: 'eq',
        isUse: false,
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error create proxy when can't find any myst identity`, async () => {
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outputCurrentIp]);
      proxyApiRepository.getById.mockResolvedValue([null, outputFindVpnProviderModel]);
      mystIdentityRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error] = await service.up(inputId);

      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(proxyApiRepository.getById).toHaveBeenCalled();
      expect(proxyApiRepository.getById).toBeCalledWith(inputId);
      expect(mystIdentityRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>mystIdentityRepository.getAll.mock.calls[0][0]).getCondition('isUse')).toMatchObject({
        $opr: 'eq',
        isUse: false,
      });
      expect(error).toBeInstanceOf(NotFoundMystIdentityException);
    });

    it(`Should error create proxy when get runner service for identity`, async () => {
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outputCurrentIp]);
      proxyApiRepository.getById.mockResolvedValue([null, outputFindVpnProviderModel]);
      mystIdentityRepository.getAll.mockResolvedValue([null, [outputMystIdentityModel], 1]);
      runnerDockerService.findAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.up(inputId);

      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(proxyApiRepository.getById).toHaveBeenCalled();
      expect(proxyApiRepository.getById).toBeCalledWith(inputId);
      expect(mystIdentityRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>mystIdentityRepository.getAll.mock.calls[0][0]).getCondition('isUse')).toMatchObject({
        $opr: 'eq',
        isUse: false,
      });
      expect(runnerDockerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<VpnProviderModel>>>runnerDockerService.findAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          $namespace: VpnProviderModel.name,
          userIdentity: outputMystIdentityModel.identity,
        },
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error create proxy when all service created before`, async () => {
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outputCurrentIp]);
      proxyApiRepository.getById.mockResolvedValue([null, outputFindVpnProviderModel]);
      mystIdentityRepository.getAll.mockResolvedValue([null, [outputMystIdentityModel], 1]);
      runnerDockerService.findAll.mockResolvedValue([
        null,
        [
          outputMystRunnerModel,
          outputMystConnectRunnerModel,
          outputEnvoyRunnerModel,
        ],
        3,
      ]);
      runnerDockerService.create.mockResolvedValue([new UnknownException()]);

      const [error] = await service.up(inputId);

      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(proxyApiRepository.getById).toHaveBeenCalled();
      expect(proxyApiRepository.getById).toBeCalledWith(inputId);
      expect(mystIdentityRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>mystIdentityRepository.getAll.mock.calls[0][0]).getCondition('isUse')).toMatchObject({
        $opr: 'eq',
        isUse: false,
      });
      expect(runnerDockerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<VpnProviderModel>>>runnerDockerService.findAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          $namespace: VpnProviderModel.name,
          userIdentity: outputMystIdentityModel.identity,
        },
      });
      expect(error).toBeInstanceOf(ExistException);
    });

    it(`Should error create proxy when create myst service runner (when all service not created before)`, async () => {
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outputCurrentIp]);
      proxyApiRepository.getById.mockResolvedValue([null, outputFindVpnProviderModel]);
      mystIdentityRepository.getAll.mockResolvedValue([null, [outputMystIdentityModel], 1]);
      runnerDockerService.findAll.mockResolvedValue([null, [], 0]);
      runnerDockerService.create.mockResolvedValue([new UnknownException()]);

      const [error] = await service.up(inputId);

      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(proxyApiRepository.getById).toHaveBeenCalled();
      expect(proxyApiRepository.getById).toBeCalledWith(inputId);
      expect(mystIdentityRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>mystIdentityRepository.getAll.mock.calls[0][0]).getCondition('isUse')).toMatchObject({
        $opr: 'eq',
        isUse: false,
      });
      expect(runnerDockerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<VpnProviderModel>>>runnerDockerService.findAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          $namespace: VpnProviderModel.name,
          userIdentity: outputMystIdentityModel.identity,
        },
      });
      expect(fakeIdentifierMock.generateId).toHaveBeenCalled();
      expect(runnerDockerService.create).toHaveBeenCalledTimes(1);
      expect(runnerDockerService.create.mock.calls[0][0]).toMatchObject(
        <RunnerModel<VpnProviderModel & MystIdentityModel>>{
          id: fakeIdentifierMock.generateId(),
          serial: '0000000000000000000000000000000000000000000000000000000000000000',
          name: `${RunnerServiceEnum.MYST}-${outputMystIdentityModel.identity}`,
          service: RunnerServiceEnum.MYST,
          exec: RunnerExecEnum.DOCKER,
          socketType: RunnerSocketTypeEnum.HTTP,
          label: {
            $namespace: VpnProviderModel.name,
            id: outputFindVpnProviderModel.id,
            userIdentity: outputMystIdentityModel.identity,
            providerIdentity: outputFindVpnProviderModel.providerIdentity,
            serverOutgoingIp: outputCurrentIp,
            passphrase: outputMystIdentityModel.passphrase,
          },
          status: RunnerStatusEnum.CREATING,
          insertDate: new Date(),
        },
      );
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error create proxy when create myst connect service runner (when all service not created before)`, async () => {
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outputCurrentIp]);
      proxyApiRepository.getById.mockResolvedValue([null, outputFindVpnProviderModel]);
      mystIdentityRepository.getAll.mockResolvedValue([null, [outputMystIdentityModel], 1]);
      runnerDockerService.findAll.mockResolvedValue([null, [], 0]);
      runnerDockerService.create
        .mockResolvedValueOnce([null, null])
        .mockResolvedValueOnce([new UnknownException()]);

      const [error] = await service.up(inputId);

      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(proxyApiRepository.getById).toHaveBeenCalled();
      expect(proxyApiRepository.getById).toBeCalledWith(inputId);
      expect(mystIdentityRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>mystIdentityRepository.getAll.mock.calls[0][0]).getCondition('isUse')).toMatchObject({
        $opr: 'eq',
        isUse: false,
      });
      expect(runnerDockerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<VpnProviderModel>>>runnerDockerService.findAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          $namespace: VpnProviderModel.name,
          userIdentity: outputMystIdentityModel.identity,
        },
      });
      expect(fakeIdentifierMock.generateId).toHaveBeenCalled();
      expect(runnerDockerService.create).toHaveBeenCalledTimes(2);
      expect(runnerDockerService.create.mock.calls[0][0]).toMatchObject(
        <RunnerModel<VpnProviderModel & MystIdentityModel>>{
          id: fakeIdentifierMock.generateId(),
          serial: '0000000000000000000000000000000000000000000000000000000000000000',
          name: `${RunnerServiceEnum.MYST}-${outputMystIdentityModel.identity}`,
          service: RunnerServiceEnum.MYST,
          exec: RunnerExecEnum.DOCKER,
          socketType: RunnerSocketTypeEnum.HTTP,
          label: {
            $namespace: VpnProviderModel.name,
            id: outputFindVpnProviderModel.id,
            userIdentity: outputMystIdentityModel.identity,
            providerIdentity: outputFindVpnProviderModel.providerIdentity,
            serverOutgoingIp: outputCurrentIp,
            passphrase: outputMystIdentityModel.passphrase,
          },
          status: RunnerStatusEnum.CREATING,
          insertDate: new Date(),
        },
      );
      expect(runnerDockerService.create.mock.calls[1][0]).toMatchObject(
        <RunnerModel>{
          id: fakeIdentifierMock.generateId(),
          serial: '0000000000000000000000000000000000000000000000000000000000000000',
          name: `${RunnerServiceEnum.MYST_CONNECT}-${outputMystIdentityModel.identity}`,
          service: RunnerServiceEnum.MYST_CONNECT,
          exec: RunnerExecEnum.DOCKER,
          socketType: RunnerSocketTypeEnum.NONE,
          label: {
            $namespace: VpnProviderModel.name,
            id: outputFindVpnProviderModel.id,
            userIdentity: outputMystIdentityModel.identity,
            providerIdentity: outputFindVpnProviderModel.providerIdentity,
          },
          dependsOn: {
            [`${RunnerServiceEnum.MYST}-${outputMystIdentityModel.identity}`]: RunnerDependsOnStatusEnum.STARTED,
          },
          status: RunnerStatusEnum.CREATING,
          insertDate: new Date(),
        },
      );
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error create proxy when create envoy service runner (when all service not created before)`, async () => {
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outputCurrentIp]);
      proxyApiRepository.getById.mockResolvedValue([null, outputFindVpnProviderModel]);
      mystIdentityRepository.getAll.mockResolvedValue([null, [outputMystIdentityModel], 1]);
      runnerDockerService.findAll.mockResolvedValue([null, [], 0]);
      runnerDockerService.create
        .mockResolvedValueOnce([null, null])
        .mockResolvedValueOnce([null, null])
        .mockResolvedValueOnce([new UnknownException()]);

      const [error] = await service.up(inputId);

      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(proxyApiRepository.getById).toHaveBeenCalled();
      expect(proxyApiRepository.getById).toBeCalledWith(inputId);
      expect(mystIdentityRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>mystIdentityRepository.getAll.mock.calls[0][0]).getCondition('isUse')).toMatchObject({
        $opr: 'eq',
        isUse: false,
      });
      expect(runnerDockerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<VpnProviderModel>>>runnerDockerService.findAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          $namespace: VpnProviderModel.name,
          userIdentity: outputMystIdentityModel.identity,
        },
      });
      expect(fakeIdentifierMock.generateId).toHaveBeenCalled();
      expect(runnerDockerService.create).toHaveBeenCalledTimes(3);
      expect(runnerDockerService.create.mock.calls[0][0]).toMatchObject(
        <RunnerModel<VpnProviderModel & MystIdentityModel>>{
          id: fakeIdentifierMock.generateId(),
          serial: '0000000000000000000000000000000000000000000000000000000000000000',
          name: `${RunnerServiceEnum.MYST}-${outputMystIdentityModel.identity}`,
          service: RunnerServiceEnum.MYST,
          exec: RunnerExecEnum.DOCKER,
          socketType: RunnerSocketTypeEnum.HTTP,
          label: {
            $namespace: VpnProviderModel.name,
            id: outputFindVpnProviderModel.id,
            userIdentity: outputMystIdentityModel.identity,
            providerIdentity: outputFindVpnProviderModel.providerIdentity,
            serverOutgoingIp: outputCurrentIp,
            passphrase: outputMystIdentityModel.passphrase,
          },
          status: RunnerStatusEnum.CREATING,
          insertDate: new Date(),
        },
      );
      expect(runnerDockerService.create.mock.calls[1][0]).toMatchObject(
        <RunnerModel>{
          id: fakeIdentifierMock.generateId(),
          serial: '0000000000000000000000000000000000000000000000000000000000000000',
          name: `${RunnerServiceEnum.MYST_CONNECT}-${outputMystIdentityModel.identity}`,
          service: RunnerServiceEnum.MYST_CONNECT,
          exec: RunnerExecEnum.DOCKER,
          socketType: RunnerSocketTypeEnum.NONE,
          label: {
            $namespace: VpnProviderModel.name,
            id: outputFindVpnProviderModel.id,
            userIdentity: outputMystIdentityModel.identity,
            providerIdentity: outputFindVpnProviderModel.providerIdentity,
          },
          dependsOn: {
            [`${RunnerServiceEnum.MYST}-${outputMystIdentityModel.identity}`]: RunnerDependsOnStatusEnum.STARTED,
          },
          status: RunnerStatusEnum.CREATING,
          insertDate: new Date(),
        },
      );
      expect(runnerDockerService.create.mock.calls[2][0]).toMatchObject(
        <RunnerModel>{
          id: fakeIdentifierMock.generateId(),
          serial: '0000000000000000000000000000000000000000000000000000000000000000',
          name: `${RunnerServiceEnum.ENVOY}-${outputMystIdentityModel.identity}`,
          service: RunnerServiceEnum.ENVOY,
          exec: RunnerExecEnum.DOCKER,
          socketType: RunnerSocketTypeEnum.NONE,
          label: {
            $namespace: VpnProviderModel.name,
            id: outputFindVpnProviderModel.id,
            userIdentity: outputMystIdentityModel.identity,
            providerIdentity: outputFindVpnProviderModel.providerIdentity,
          },
          dependsOn: {
            [`${RunnerServiceEnum.MYST}-${outputMystIdentityModel.identity}`]: RunnerDependsOnStatusEnum.HEALTHY,
          },
          status: RunnerStatusEnum.CREATING,
          insertDate: new Date(),
        },
      );
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully create proxy (when all service not created before)`, async () => {
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outputCurrentIp]);
      proxyApiRepository.getById.mockResolvedValue([null, outputFindVpnProviderModel]);
      mystIdentityRepository.getAll.mockResolvedValue([null, [outputMystIdentityModel], 1]);
      runnerDockerService.findAll.mockResolvedValue([null, [], 0]);
      runnerDockerService.create
        .mockResolvedValueOnce([null, outputCreateMystRunnerModel])
        .mockResolvedValueOnce([null, null])
        .mockResolvedValueOnce([null, null]);

      const [error, result] = await service.up(inputId);

      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(proxyApiRepository.getById).toHaveBeenCalled();
      expect(proxyApiRepository.getById).toBeCalledWith(inputId);
      expect(mystIdentityRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>mystIdentityRepository.getAll.mock.calls[0][0]).getCondition('isUse')).toMatchObject({
        $opr: 'eq',
        isUse: false,
      });
      expect(runnerDockerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<VpnProviderModel>>>runnerDockerService.findAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          $namespace: VpnProviderModel.name,
          userIdentity: outputMystIdentityModel.identity,
        },
      });
      expect(fakeIdentifierMock.generateId).toHaveBeenCalled();
      expect(runnerDockerService.create).toHaveBeenCalledTimes(3);
      expect(runnerDockerService.create.mock.calls[0][0]).toMatchObject(
        <RunnerModel<VpnProviderModel & MystIdentityModel>>{
          id: fakeIdentifierMock.generateId(),
          serial: '0000000000000000000000000000000000000000000000000000000000000000',
          name: `${RunnerServiceEnum.MYST}-${outputMystIdentityModel.identity}`,
          service: RunnerServiceEnum.MYST,
          exec: RunnerExecEnum.DOCKER,
          socketType: RunnerSocketTypeEnum.HTTP,
          label: {
            $namespace: VpnProviderModel.name,
            id: outputFindVpnProviderModel.id,
            userIdentity: outputMystIdentityModel.identity,
            providerIdentity: outputFindVpnProviderModel.providerIdentity,
            serverOutgoingIp: outputCurrentIp,
            passphrase: outputMystIdentityModel.passphrase,
          },
          status: RunnerStatusEnum.CREATING,
          insertDate: new Date(),
        },
      );
      expect(runnerDockerService.create.mock.calls[1][0]).toMatchObject(
        <RunnerModel>{
          id: fakeIdentifierMock.generateId(),
          serial: '0000000000000000000000000000000000000000000000000000000000000000',
          name: `${RunnerServiceEnum.MYST_CONNECT}-${outputMystIdentityModel.identity}`,
          service: RunnerServiceEnum.MYST_CONNECT,
          exec: RunnerExecEnum.DOCKER,
          socketType: RunnerSocketTypeEnum.NONE,
          label: {
            $namespace: VpnProviderModel.name,
            id: outputFindVpnProviderModel.id,
            userIdentity: outputMystIdentityModel.identity,
            providerIdentity: outputFindVpnProviderModel.providerIdentity,
          },
          dependsOn: {
            [`${RunnerServiceEnum.MYST}-${outputMystIdentityModel.identity}`]: RunnerDependsOnStatusEnum.STARTED,
          },
          status: RunnerStatusEnum.CREATING,
          insertDate: new Date(),
        },
      );
      expect(runnerDockerService.create.mock.calls[2][0]).toMatchObject(
        <RunnerModel>{
          id: fakeIdentifierMock.generateId(),
          serial: '0000000000000000000000000000000000000000000000000000000000000000',
          name: `${RunnerServiceEnum.ENVOY}-${outputMystIdentityModel.identity}`,
          service: RunnerServiceEnum.ENVOY,
          exec: RunnerExecEnum.DOCKER,
          socketType: RunnerSocketTypeEnum.NONE,
          label: {
            $namespace: VpnProviderModel.name,
            id: outputFindVpnProviderModel.id,
            userIdentity: outputMystIdentityModel.identity,
            providerIdentity: outputFindVpnProviderModel.providerIdentity,
          },
          dependsOn: {
            [`${RunnerServiceEnum.MYST}-${outputMystIdentityModel.identity}`]: RunnerDependsOnStatusEnum.HEALTHY,
          },
          status: RunnerStatusEnum.CREATING,
          insertDate: new Date(),
        },
      );
      expect(error).toBeNull();
      expect(result).toMatchObject(<VpnProviderModel>{
        id: identifierMock.generateId(),
        userIdentity: outputMystIdentityModel.identity,
        serviceType: outputFindVpnProviderModel.serviceType,
        providerName: outputFindVpnProviderModel.providerName,
        providerIdentity: outputFindVpnProviderModel.providerIdentity,
        providerStatus: VpnProviderStatusEnum.PENDING,
        providerIpType: outputFindVpnProviderModel.providerIpType,
        country: outputFindVpnProviderModel.country,
        serverOutgoingIp: outputCurrentIp,
        runner: <RunnerModel>{
          id: identifierMock.generateId(),
          serial: 'myst serial',
          name: 'myst',
          service: RunnerServiceEnum.MYST,
          exec: RunnerExecEnum.DOCKER,
          socketType: RunnerSocketTypeEnum.HTTP,
          socketUri: '10.10.10.1',
          socketPort: 4449,
          status: RunnerStatusEnum.CREATING,
          insertDate: new Date(),
        },
        isRegister: true,
        isEnable: true,
        insertDate: new Date(),
      });
    });
  });

  describe(`Remove proxy`, () => {
    let inputId: string;
    let outputMystRunnerModel: RunnerModel;
    let outputMystConnectRunnerModel: RunnerModel;
    let outputEnvoyRunnerModel: RunnerModel;

    beforeEach(() => {
      inputId = identifierMock.generateId();

      outputMystRunnerModel = new RunnerModel({
        id: identifierMock.generateId(),
        serial: 'myst serial',
        name: 'myst',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketUri: '10.10.10.1',
        socketPort: 4449,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });

      outputMystConnectRunnerModel = new RunnerModel({
        id: identifierMock.generateId(),
        serial: 'myst connect serial',
        name: 'myst-connect',
        service: RunnerServiceEnum.MYST_CONNECT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });

      outputEnvoyRunnerModel = new RunnerModel({
        id: identifierMock.generateId(),
        serial: 'envoy serial',
        name: 'envoy',
        service: RunnerServiceEnum.ENVOY,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketUri: '10.10.10.2',
        socketPort: 10001,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
    });

    it(`Should error remove proxy when fetch runner list for proxy`, async () => {
      runnerDockerService.findAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.down(inputId);

      expect(runnerDockerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<VpnProviderModel>>>runnerDockerService.findAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          id: inputId,
        },
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error remove proxy when can't find any runner service`, async () => {
      runnerDockerService.findAll.mockResolvedValue([null, [], 0]);

      const [error] = await service.down(inputId);

      expect(runnerDockerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<VpnProviderModel>>>runnerDockerService.findAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          id: inputId,
        },
      });
      expect(error).toBeInstanceOf(NotFoundException);
    });

    it(`Should error remove proxy when fail to remove primary service`, async () => {
      runnerDockerService.findAll.mockResolvedValue([
        null,
        [
          outputMystRunnerModel,
          outputMystConnectRunnerModel,
          outputEnvoyRunnerModel,
        ],
        3,
      ]);
      runnerDockerService.remove.mockResolvedValue([new UnknownException()]);

      const [error] = await service.down(inputId);

      expect(runnerDockerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<VpnProviderModel>>>runnerDockerService.findAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          id: inputId,
        },
      });
      expect(runnerDockerService.remove).toBeCalledTimes(1);
      expect(runnerDockerService.remove.mock.calls[0][0]).toEqual(identifierMock.generateId());
      expect(error).toBeInstanceOf(VpnDisconnectException);
    });

    it(`Should successfully remove proxy (All service remove successfully)`, async () => {
      runnerDockerService.findAll.mockResolvedValue([
        null,
        [
          outputMystRunnerModel,
          outputMystConnectRunnerModel,
          outputEnvoyRunnerModel,
        ],
        3,
      ]);
      runnerDockerService.remove.mockResolvedValue([null]);

      const [error] = await service.down(inputId);

      expect(runnerDockerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<VpnProviderModel>>>runnerDockerService.findAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          id: inputId,
        },
      });
      expect(runnerDockerService.remove).toBeCalledTimes(3);
      expect(runnerDockerService.remove.mock.calls[0][0]).toEqual(identifierMock.generateId());
      expect(runnerDockerService.remove.mock.calls[1][0]).toEqual(identifierMock.generateId());
      expect(runnerDockerService.remove.mock.calls[2][0]).toEqual(identifierMock.generateId());
      expect(error).toBeNull();
    });

    it(`Should successfully remove proxy (If can't remove myst-connect service)`, async () => {
      runnerDockerService.findAll.mockResolvedValue([
        null,
        [
          outputMystRunnerModel,
          outputMystConnectRunnerModel,
          outputEnvoyRunnerModel,
        ],
        3,
      ]);
      runnerDockerService.remove
        .mockResolvedValueOnce([null, null])
        .mockResolvedValueOnce([new UnknownException()])
        .mockResolvedValueOnce([null, null]);

      const [error] = await service.down(inputId);

      expect(runnerDockerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<VpnProviderModel>>>runnerDockerService.findAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          id: inputId,
        },
      });
      expect(runnerDockerService.remove).toBeCalledTimes(3);
      expect(runnerDockerService.remove.mock.calls[0][0]).toEqual(identifierMock.generateId());
      expect(runnerDockerService.remove.mock.calls[1][0]).toEqual(identifierMock.generateId());
      expect(runnerDockerService.remove.mock.calls[2][0]).toEqual(identifierMock.generateId());
      expect(error).toBeNull();
    });

    it(`Should successfully remove proxy (If can't remove envoy service)`, async () => {
      runnerDockerService.findAll.mockResolvedValue([
        null,
        [
          outputMystRunnerModel,
          outputMystConnectRunnerModel,
          outputEnvoyRunnerModel,
        ],
        3,
      ]);
      runnerDockerService.remove
        .mockResolvedValueOnce([null, null])
        .mockResolvedValueOnce([null, null])
        .mockResolvedValueOnce([new UnknownException()]);

      const [error] = await service.down(inputId);

      expect(runnerDockerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<VpnProviderModel>>>runnerDockerService.findAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          id: inputId,
        },
      });
      expect(runnerDockerService.remove).toBeCalledTimes(3);
      expect(runnerDockerService.remove.mock.calls[0][0]).toEqual(identifierMock.generateId());
      expect(runnerDockerService.remove.mock.calls[1][0]).toEqual(identifierMock.generateId());
      expect(runnerDockerService.remove.mock.calls[2][0]).toEqual(identifierMock.generateId());
      expect(error).toBeNull();
    });
  });
});
