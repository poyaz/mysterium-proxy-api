import {ProxyAggregateRepository} from './proxy-aggregate.repository';
import {Test, TestingModule} from '@nestjs/testing';
import {mock, MockProxy} from 'jest-mock-extended';
import {IRunnerRepositoryInterface} from '@src-core/interface/i-runner-repository.interface';
import {IMystApiRepositoryInterface} from '@src-core/interface/i-myst-api-repository.interface';
import {FilterInstanceType, FilterModel, FilterOperationType} from '@src-core/model/filter.model';
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
  VpnProviderStatusEnum,
  VpnServiceTypeEnum,
} from '@src-core/model/vpn-provider.model';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {DefaultModel, defaultModelFactory, defaultModelType} from '@src-core/model/defaultModel';
import {filterAndSortProxyUpstream} from '@src-infrastructure/utility/filterAndSortProxyUpstream';
import {ISystemInfoRepositoryInterface} from '@src-core/interface/i-system-info-repository.interface';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {ExistException} from '@src-core/exception/exist.exception';

jest.mock('@src-infrastructure/utility/filterAndSortProxyUpstream');

describe('ProxyAggregateRepository', () => {
  let repository: ProxyAggregateRepository;
  let dockerRunnerRepository: MockProxy<IRunnerRepositoryInterface>;
  let mystProviderRepository: MockProxy<IMystApiRepositoryInterface>;
  let systemInfoRepository: MockProxy<ISystemInfoRepositoryInterface>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    dockerRunnerRepository = mock<IRunnerRepositoryInterface>();
    mystProviderRepository = mock<IMystApiRepositoryInterface>();
    systemInfoRepository = mock<ISystemInfoRepositoryInterface>();
    identifierMock = mock<IIdentifier>();

    const dockerRunnerRepositoryProvider = 'docker-runner-repository';
    const mystProviderRepositoryProvider = 'myst-provider-repository';
    const systemInfoRepositoryProvider = 'system-info-repository';
    const identifierMockProvider = 'identifier';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: dockerRunnerRepositoryProvider,
          useValue: dockerRunnerRepository,
        },
        {
          provide: mystProviderRepositoryProvider,
          useValue: mystProviderRepository,
        },
        {
          provide: systemInfoRepositoryProvider,
          useValue: systemInfoRepository,
        },
        {
          provide: identifierMockProvider,
          useValue: identifierMock,
        },
        {
          provide: ProxyAggregateRepository,
          inject: [dockerRunnerRepositoryProvider, mystProviderRepositoryProvider, systemInfoRepositoryProvider, identifierMockProvider],
          useFactory: (
            dockerRunnerRepository: IRunnerRepositoryInterface,
            mystProviderRepositoryProvider: IMystApiRepositoryInterface,
            systemInfoRepository: ISystemInfoRepositoryInterface,
            identifierMock: IIdentifier,
          ) => new ProxyAggregateRepository(dockerRunnerRepository, mystProviderRepositoryProvider, systemInfoRepository, identifierMock),
        },
      ],
    }).compile();

    repository = module.get<ProxyAggregateRepository>(ProxyAggregateRepository);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe(`Get all proxy`, () => {
    let inputFilterWithoutFilter: FilterModel<ProxyUpstreamModel>;
    let inputFilterWithFilter: FilterModel<ProxyUpstreamModel>;
    let inputFilterWithRefIdFilter: FilterModel<ProxyUpstreamModel>;
    let outgoingIpAddress: string;
    let outputMystRunner1: RunnerModel<MystIdentityModel>;
    let outputMystConnectRunner1: RunnerModel<[MystIdentityModel, VpnProviderModel]>;
    let outputProxyDownstreamRunner1: RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyDownstreamModel]>;
    let outputProxyUpstreamRunner1: RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>;
    let outputMystRunner2: RunnerModel<MystIdentityModel>;
    let outputProxyDownstreamRunner2: RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyDownstreamModel]>;
    let outputProxyUpstreamRunner2: RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>;
    let outputProxyDownstreamRunner3: RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyDownstreamModel]>;
    let outputProxyUpstreamRunner3: RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>;
    let outputProxyUpstreamRunner4: RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>;
    let outputVpnProvider1: VpnProviderModel;
    let outputProxyUpstream1: ProxyUpstreamModel;
    let outputProxyUpstream2: ProxyUpstreamModel;
    let outputProxyUpstream3: ProxyUpstreamModel;
    let outputProxyUpstream4: ProxyUpstreamModel;

    beforeEach(() => {
      inputFilterWithoutFilter = new FilterModel<ProxyUpstreamModel>();

      inputFilterWithFilter = new FilterModel<ProxyUpstreamModel>();
      inputFilterWithFilter.addCondition({$opr: 'eq', listenPort: 3128});

      inputFilterWithRefIdFilter = new FilterModel<ProxyUpstreamModel>();
      inputFilterWithRefIdFilter.addCondition({
        $opr: 'eq',
        proxyDownstream: [
          defaultModelFactory<ProxyDownstreamModel>(
            ProxyDownstreamModel,
            {
              id: 'default-id',
              refId: '11111111-1111-1111-1111-444444444444',
              ip: 'default-ip',
              mask: 32,
              type: ProxyTypeEnum.MYST,
              status: ProxyStatusEnum.DISABLE,
            },
            ['id', 'ip', 'mask', 'status'],
          ),
        ],
      });

      outgoingIpAddress = '26.45.101.6';

      outputMystRunner1 = new RunnerModel<MystIdentityModel>({
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
      outputMystRunner1.label = {
        $namespace: MystIdentityModel.name,
        id: '11111111-1111-1111-1111-222222222222',
        identity: 'identity1',
      };
      outputMystConnectRunner1 = new RunnerModel<[MystIdentityModel, VpnProviderModel]>({
        id: '11111111-1111-1111-1111-333333333333',
        serial: 'myst-connect-serial',
        name: 'myst-connect-name',
        service: RunnerServiceEnum.MYST_CONNECT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.NONE,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputMystConnectRunner1.label = [
        {
          $namespace: MystIdentityModel.name,
          id: '11111111-1111-1111-1111-222222222222',
          identity: 'identity1',
        },
        {
          $namespace: VpnProviderModel.name,
          id: '11111111-1111-1111-1111-444444444444',
          userIdentity: 'identity1',
          providerIdentity: 'provider-identity1',
        },
      ];
      outputProxyDownstreamRunner1 = new RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyDownstreamModel]>({
        id: '11111111-1111-1111-1111-555555555555',
        serial: 'proxy-proxyDownstream-serial',
        name: 'proxy-downstream-name',
        service: RunnerServiceEnum.ENVOY,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketUri: '10.10.10.1',
        socketPort: 10001,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputProxyDownstreamRunner1.label = [
        {
          $namespace: MystIdentityModel.name,
          id: '11111111-1111-1111-1111-222222222222',
        },
        {
          $namespace: VpnProviderModel.name,
          id: '11111111-1111-1111-1111-444444444444',
        },
        {
          $namespace: ProxyDownstreamModel.name,
          id: '11111111-1111-1111-1111-666666666666',
        },
      ];
      outputProxyUpstreamRunner1 = new RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>({
        id: '11111111-1111-1111-1111-777777777777',
        serial: 'proxy-upstream-serial',
        name: 'proxy-upstream-name',
        service: RunnerServiceEnum.SOCAT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketUri: '10.10.10.2',
        socketPort: 3128,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputProxyUpstreamRunner1.label = [
        {
          $namespace: MystIdentityModel.name,
          id: '11111111-1111-1111-1111-222222222222',
        },
        {
          $namespace: VpnProviderModel.name,
          id: '11111111-1111-1111-1111-444444444444',
        },
        {
          $namespace: ProxyUpstreamModel.name,
          id: '11111111-1111-1111-1111-666666666666',
        },
      ];

      outputMystRunner2 = new RunnerModel<MystIdentityModel>({
        id: '22222222-2222-2222-2222-111111111111',
        serial: 'myst-serial',
        name: 'myst-name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketUri: '10.10.10.3',
        socketPort: 4449,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputMystRunner2.label = {
        $namespace: MystIdentityModel.name,
        id: '22222222-2222-2222-2222-222222222222',
        identity: 'identity1',
      };
      outputProxyDownstreamRunner2 = new RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyDownstreamModel]>({
        id: '22222222-2222-2222-2222-555555555555',
        serial: 'proxy-proxyDownstream-serial',
        name: 'proxy-downstream-name',
        service: RunnerServiceEnum.ENVOY,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketUri: '10.10.10.3',
        socketPort: 10001,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputProxyDownstreamRunner2.label = [
        {
          $namespace: MystIdentityModel.name,
          id: '22222222-2222-2222-2222-222222222222',
        },
        {
          $namespace: VpnProviderModel.name,
          id: '22222222-2222-2222-2222-444444444444',
        },
        {
          $namespace: ProxyDownstreamModel.name,
          id: '22222222-2222-2222-2222-666666666666',
        },
      ];
      outputProxyUpstreamRunner2 = new RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>({
        id: '22222222-2222-2222-2222-777777777777',
        serial: 'proxy-upstream-serial',
        name: 'proxy-upstream-name',
        service: RunnerServiceEnum.SOCAT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketUri: '10.10.10.4',
        socketPort: 3129,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputProxyUpstreamRunner2.label = [
        {
          $namespace: MystIdentityModel.name,
          id: '22222222-2222-2222-2222-222222222222',
        },
        {
          $namespace: VpnProviderModel.name,
          id: '22222222-2222-2222-2222-444444444444',
        },
        {
          $namespace: ProxyUpstreamModel.name,
          id: '22222222-2222-2222-2222-666666666666',
        },
      ];

      outputProxyDownstreamRunner3 = new RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyDownstreamModel]>({
        id: '33333333-3333-3333-3333-111111111111',
        serial: 'proxy-proxyDownstream-serial',
        name: 'proxy-downstream-name',
        service: RunnerServiceEnum.ENVOY,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketUri: null,
        socketPort: 10001,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputProxyDownstreamRunner3.label = [
        {
          $namespace: MystIdentityModel.name,
          id: '33333333-3333-3333-3333-222222222222',
        },
        {
          $namespace: VpnProviderModel.name,
          id: '33333333-3333-3333-3333-333333333333',
        },
        {
          $namespace: ProxyDownstreamModel.name,
          id: '33333333-3333-3333-3333-444444444444',
        },
      ];
      outputProxyUpstreamRunner3 = new RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>({
        id: '33333333-3333-3333-3333-555555555555',
        serial: 'proxy-upstream-serial',
        name: 'proxy-upstream-name',
        service: RunnerServiceEnum.SOCAT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketUri: '10.10.10.5',
        socketPort: 3130,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputProxyUpstreamRunner3.label = [
        {
          $namespace: MystIdentityModel.name,
          id: '33333333-3333-3333-3333-222222222222',
        },
        {
          $namespace: VpnProviderModel.name,
          id: '33333333-3333-3333-3333-333333333333',
        },
        {
          $namespace: ProxyUpstreamModel.name,
          id: '33333333-3333-3333-3333-444444444444',
        },
      ];

      outputProxyUpstreamRunner4 = new RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>({
        id: '44444444-4444-4444-4444-111111111111',
        serial: 'proxy-upstream-serial',
        name: 'proxy-upstream-name',
        service: RunnerServiceEnum.SOCAT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketUri: '10.10.10.6',
        socketPort: 3131,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputProxyUpstreamRunner4.label = [
        {
          $namespace: MystIdentityModel.name,
          id: '44444444-4444-4444-4444--222222222222',
        },
        {
          $namespace: VpnProviderModel.name,
          id: '44444444-4444-4444-4444--333333333333',
        },
        {
          $namespace: ProxyUpstreamModel.name,
          id: '44444444-4444-4444-4444-444444444444',
        },
      ];

      outputVpnProvider1 = new VpnProviderModel({
        id: (<VpnProviderModel><unknown>outputMystConnectRunner1.label.find((v) => v.$namespace === VpnProviderModel.name)).id,
        userIdentity: (<VpnProviderModel><unknown>outputMystConnectRunner1.label.find((v) => v.$namespace === VpnProviderModel.name)).userIdentity,
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: (<VpnProviderModel><unknown>outputMystConnectRunner1.label.find((v) => v.$namespace === VpnProviderModel.name)).providerIdentity,
        providerStatus: VpnProviderStatusEnum.ONLINE,
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        ip: '59.10.56.111',
        mask: 32,
        country: 'GB',
        runner: outputMystRunner1,
        isRegister: true,
        proxyCount: 0,
        insertDate: new Date(),
      });

      outputProxyUpstream1 = new ProxyUpstreamModel({
        id: (<ProxyUpstreamModel><unknown>outputProxyUpstreamRunner1.label.find((v) => v.$namespace === ProxyUpstreamModel.name)).id,
        listenAddr: outgoingIpAddress,
        listenPort: outputProxyUpstreamRunner1.socketPort,
        proxyDownstream: [
          new ProxyDownstreamModel({
            id: (<VpnProviderModel><unknown>outputProxyDownstreamRunner1.label.find((v) => v.$namespace === ProxyDownstreamModel.name)).id,
            refId: (<VpnProviderModel><unknown>outputProxyDownstreamRunner1.label.find((v) => v.$namespace === VpnProviderModel.name)).id,
            ip: outputVpnProvider1.ip,
            mask: outputVpnProvider1.mask,
            type: ProxyTypeEnum.MYST,
            runner: outputProxyDownstreamRunner1,
            status: ProxyStatusEnum.ONLINE,
          }),
        ],
        runner: outputProxyUpstreamRunner1,
        insertDate: new Date(),
      });
      outputProxyUpstream2 = new ProxyUpstreamModel({
        id: (<ProxyUpstreamModel><unknown>outputProxyUpstreamRunner2.label.find((v) => v.$namespace === ProxyUpstreamModel.name)).id,
        listenAddr: outgoingIpAddress,
        listenPort: outputProxyUpstreamRunner2.socketPort,
        proxyDownstream: [
          defaultModelFactory<ProxyDownstreamModel>(
            ProxyDownstreamModel,
            {
              id: (<VpnProviderModel><unknown>outputProxyDownstreamRunner2.label.find((v) => v.$namespace === ProxyDownstreamModel.name)).id,
              refId: (<VpnProviderModel><unknown>outputProxyDownstreamRunner2.label.find((v) => v.$namespace === VpnProviderModel.name)).id,
              ip: 'default-ip',
              mask: 32,
              type: ProxyTypeEnum.MYST,
              runner: outputProxyDownstreamRunner2,
              status: ProxyStatusEnum.OFFLINE,
            },
            ['ip', 'mask'],
          ),
        ],
        runner: outputProxyUpstreamRunner2,
        insertDate: new Date(),
      });
      outputProxyUpstream3 = new ProxyUpstreamModel({
        id: (<ProxyUpstreamModel><unknown>outputProxyUpstreamRunner3.label.find((v) => v.$namespace === ProxyUpstreamModel.name)).id,
        listenAddr: outgoingIpAddress,
        listenPort: outputProxyUpstreamRunner3.socketPort,
        proxyDownstream: [
          defaultModelFactory<ProxyDownstreamModel>(
            ProxyDownstreamModel,
            {
              id: (<VpnProviderModel><unknown>outputProxyDownstreamRunner3.label.find((v) => v.$namespace === ProxyDownstreamModel.name)).id,
              refId: (<VpnProviderModel><unknown>outputProxyDownstreamRunner3.label.find((v) => v.$namespace === VpnProviderModel.name)).id,
              ip: 'default-ip',
              mask: 32,
              type: ProxyTypeEnum.MYST,
              runner: outputProxyDownstreamRunner3,
              status: ProxyStatusEnum.OFFLINE,
            },
            ['ip', 'mask'],
          ),
        ],
        runner: outputProxyUpstreamRunner3,
        insertDate: new Date(),
      });
      outputProxyUpstream4 = new ProxyUpstreamModel({
        id: (<ProxyUpstreamModel><unknown>outputProxyUpstreamRunner4.label.find((v) => v.$namespace === ProxyUpstreamModel.name)).id,
        listenAddr: outgoingIpAddress,
        listenPort: outputProxyUpstreamRunner4.socketPort,
        proxyDownstream: [
          defaultModelFactory<ProxyDownstreamModel>(
            ProxyDownstreamModel,
            {
              id: 'default-id',
              refId: 'default-ref-id',
              ip: 'default-ip',
              mask: 32,
              type: ProxyTypeEnum.MYST,
              status: ProxyStatusEnum.DISABLE,
            },
            ['id', 'refId', 'ip', 'mask', 'type'],
          ),
        ],
        runner: outputProxyUpstreamRunner4,
        insertDate: new Date(),
      });
    });

    // it(`Should error get all proxy when get all runner info`, async () => {
    //   dockerRunnerRepository.getAll.mockResolvedValue([new UnknownException()]);
    //   mystProviderRepository.getAll.mockResolvedValue([null, [], 0]);
    //   systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outgoingIpAddress]);
    //
    //   const [error] = await repository.getAll(inputFilterWithoutFilter);
    //
    //   expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
    //   expect(dockerRunnerRepository.getAll).toHaveBeenCalledWith(new FilterModel({skipPagination: true}));
    //   expect(mystProviderRepository.getAll).toHaveBeenCalled();
    //   expect((<FilterModel<VpnProviderModel>>mystProviderRepository.getAll.mock.calls[0][1]).skipPagination).toEqual(true);
    //   expect((<FilterModel<VpnProviderModel>>mystProviderRepository.getAll.mock.calls[0][1]).getCondition('isRegister')).toEqual({
    //     $opr: 'eq',
    //     isRegister: true,
    //   });
    //   expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
    //   expect(error).toBeInstanceOf(UnknownException);
    // });
    //
    // it(`Should error get all proxy when get all vpn provider`, async () => {
    //   dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);
    //   mystProviderRepository.getAll.mockResolvedValue([new UnknownException()]);
    //   systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outgoingIpAddress]);
    //
    //   const [error] = await repository.getAll(inputFilterWithoutFilter);
    //
    //   expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
    //   expect(dockerRunnerRepository.getAll).toHaveBeenCalledWith(new FilterModel({skipPagination: true}));
    //   expect(mystProviderRepository.getAll).toHaveBeenCalled();
    //   expect((<FilterModel<VpnProviderModel>>mystProviderRepository.getAll.mock.calls[0][1]).skipPagination).toEqual(true);
    //   expect((<FilterModel<VpnProviderModel>>mystProviderRepository.getAll.mock.calls[0][1]).getCondition('isRegister')).toEqual({
    //     $opr: 'eq',
    //     isRegister: true,
    //   });
    //   expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
    //   expect(error).toBeInstanceOf(UnknownException);
    // });
    //
    // it(`Should error get all proxy when get outgoing ip`, async () => {
    //   dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);
    //   mystProviderRepository.getAll.mockResolvedValue([null, [], 0]);
    //   systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([new UnknownException()]);
    //
    //   const [error] = await repository.getAll(inputFilterWithoutFilter);
    //
    //   expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
    //   expect(dockerRunnerRepository.getAll).toHaveBeenCalledWith(new FilterModel({skipPagination: true}));
    //   expect(mystProviderRepository.getAll).toHaveBeenCalled();
    //   expect((<FilterModel<VpnProviderModel>>mystProviderRepository.getAll.mock.calls[0][1]).skipPagination).toEqual(true);
    //   expect((<FilterModel<VpnProviderModel>>mystProviderRepository.getAll.mock.calls[0][1]).getCondition('isRegister')).toEqual({
    //     $opr: 'eq',
    //     isRegister: true,
    //   });
    //   expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
    //   expect(error).toBeInstanceOf(UnknownException);
    // });
    //
    // it(`Should error get all proxy with refId filter`, async () => {
    //   dockerRunnerRepository.getAll.mockResolvedValue([
    //     null,
    //     [
    //       outputMystRunner1,
    //       outputMystConnectRunner1,
    //       outputProxyDownstreamRunner1,
    //       outputProxyUpstreamRunner1,
    //       outputMystRunner2,
    //       outputProxyDownstreamRunner2,
    //       outputProxyUpstreamRunner2,
    //       outputProxyDownstreamRunner3,
    //       outputProxyUpstreamRunner3,
    //       outputProxyUpstreamRunner4,
    //     ],
    //     10,
    //   ]);
    //   mystProviderRepository.getById.mockResolvedValue([new UnknownException()]);
    //   systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outgoingIpAddress]);
    //
    //   const [error] = await repository.getAll(inputFilterWithRefIdFilter);
    //
    //   expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
    //   expect(dockerRunnerRepository.getAll).toHaveBeenCalledWith(new FilterModel({skipPagination: true}));
    //   expect(mystProviderRepository.getById).toHaveBeenCalled();
    //   expect(mystProviderRepository.getById).toHaveBeenCalledWith(expect.anything(), inputFilterWithRefIdFilter.getCondition('proxyDownstream').proxyDownstream[0].refId);
    //   expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
    //   expect(error).toBeInstanceOf(UnknownException);
    // });
    //
    // it(`Should successfully get all proxy and return empty records`, async () => {
    //   dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);
    //   mystProviderRepository.getAll.mockResolvedValue([null, [], 0]);
    //   systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outgoingIpAddress]);
    //
    //   const [error, result, total] = await repository.getAll(inputFilterWithoutFilter);
    //
    //   expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
    //   expect(dockerRunnerRepository.getAll).toHaveBeenCalledWith(new FilterModel({skipPagination: true}));
    //   expect(mystProviderRepository.getAll).toHaveBeenCalled();
    //   expect((<FilterModel<VpnProviderModel>>mystProviderRepository.getAll.mock.calls[0][1]).skipPagination).toEqual(true);
    //   expect((<FilterModel<VpnProviderModel>>mystProviderRepository.getAll.mock.calls[0][1]).getCondition('isRegister')).toEqual({
    //     $opr: 'eq',
    //     isRegister: true,
    //   });
    //   expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
    //   expect(error).toBeNull();
    //   expect(result).toHaveLength(0);
    //   expect(total).toEqual(0);
    // });
    //
    // it(`Should successfully get all proxy and return empty records if not found socat runner`, async () => {
    //   dockerRunnerRepository.getAll.mockResolvedValue([
    //     null,
    //     [
    //       outputMystRunner1,
    //       outputMystConnectRunner1,
    //       outputProxyDownstreamRunner1,
    //       outputMystRunner2,
    //       outputProxyDownstreamRunner2,
    //       outputProxyDownstreamRunner3,
    //     ],
    //     6,
    //   ]);
    //   mystProviderRepository.getAll.mockResolvedValue([null, [], 0]);
    //   systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outgoingIpAddress]);
    //
    //   const [error, result, total] = await repository.getAll(inputFilterWithoutFilter);
    //
    //   expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
    //   expect(dockerRunnerRepository.getAll).toHaveBeenCalledWith(new FilterModel({skipPagination: true}));
    //   expect(mystProviderRepository.getAll).toHaveBeenCalled();
    //   expect((<FilterModel<VpnProviderModel>>mystProviderRepository.getAll.mock.calls[0][1]).skipPagination).toEqual(true);
    //   expect((<FilterModel<VpnProviderModel>>mystProviderRepository.getAll.mock.calls[0][1]).getCondition('isRegister')).toEqual({
    //     $opr: 'eq',
    //     isRegister: true,
    //   });
    //   expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
    //   expect(error).toBeNull();
    //   expect(result).toHaveLength(0);
    //   expect(total).toEqual(0);
    // });
    //
    // it(`Should successfully get all proxy without filter`, async () => {
    //   dockerRunnerRepository.getAll.mockResolvedValue([
    //     null,
    //     [
    //       outputMystRunner1,
    //       outputMystConnectRunner1,
    //       outputProxyDownstreamRunner1,
    //       outputProxyUpstreamRunner1,
    //       outputMystRunner2,
    //       outputProxyDownstreamRunner2,
    //       outputProxyUpstreamRunner2,
    //       outputProxyDownstreamRunner3,
    //       outputProxyUpstreamRunner3,
    //       outputProxyUpstreamRunner4,
    //     ],
    //     10,
    //   ]);
    //   mystProviderRepository.getAll.mockResolvedValue([null, [outputVpnProvider1], 1]);
    //   systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outgoingIpAddress]);
    //   (<jest.Mock>filterAndSortProxyUpstream).mockReturnValue([
    //     [outputProxyUpstream1, outputProxyUpstream2, outputProxyUpstream3, outputProxyUpstream4],
    //     4,
    //   ]);
    //
    //   const [error, result, total] = await repository.getAll(inputFilterWithoutFilter);
    //
    //   expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
    //   expect(dockerRunnerRepository.getAll).toHaveBeenCalledWith(new FilterModel({skipPagination: true}));
    //   expect(mystProviderRepository.getAll).toHaveBeenCalled();
    //   expect((<FilterModel<VpnProviderModel>>mystProviderRepository.getAll.mock.calls[0][1]).skipPagination).toEqual(true);
    //   expect((<FilterModel<VpnProviderModel>>mystProviderRepository.getAll.mock.calls[0][1]).getCondition('isRegister')).toEqual({
    //     $opr: 'eq',
    //     isRegister: true,
    //   });
    //   expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
    //   expect(filterAndSortProxyUpstream).toHaveBeenCalled();
    //   expect((<jest.Mock>filterAndSortProxyUpstream).mock.calls[0][0]).toHaveLength(4);
    //   expect((<jest.Mock>filterAndSortProxyUpstream).mock.calls[0][0][0]).toEqual<Omit<ProxyUpstreamModel, 'clone'>>({
    //     id: outputProxyUpstream1.id,
    //     listenAddr: outputProxyUpstream1.listenAddr,
    //     listenPort: outputProxyUpstream1.listenPort,
    //     proxyDownstream: [
    //       <ProxyDownstreamModel & Pick<DefaultModel<ProxyDownstreamModel>, 'IS_DEFAULT_MODEL'> & { _defaultProperties: Array<keyof ProxyDownstreamModel> }>{
    //         IS_DEFAULT_MODEL: true,
    //         _defaultProperties: [],
    //         id: outputProxyUpstream1.proxyDownstream[0].id,
    //         refId: outputProxyUpstream1.proxyDownstream[0].refId,
    //         ip: outputProxyUpstream1.proxyDownstream[0].ip,
    //         mask: outputProxyUpstream1.proxyDownstream[0].mask,
    //         type: outputProxyUpstream1.proxyDownstream[0].type,
    //         runner: outputProxyUpstream1.proxyDownstream[0].runner,
    //         status: outputProxyUpstream1.proxyDownstream[0].status,
    //       },
    //     ],
    //     runner: outputProxyUpstream1.runner,
    //     insertDate: outputProxyUpstream1.insertDate,
    //   });
    //   expect((<jest.Mock>filterAndSortProxyUpstream).mock.calls[0][0][1]).toEqual<Omit<ProxyUpstreamModel, 'clone'>>({
    //     id: outputProxyUpstream2.id,
    //     listenAddr: outputProxyUpstream2.listenAddr,
    //     listenPort: outputProxyUpstream2.listenPort,
    //     proxyDownstream: [
    //       <ProxyDownstreamModel & Pick<DefaultModel<ProxyDownstreamModel>, 'IS_DEFAULT_MODEL'> & { _defaultProperties: Array<keyof ProxyDownstreamModel> }>{
    //         IS_DEFAULT_MODEL: true,
    //         _defaultProperties: ['ip', 'mask'],
    //         id: outputProxyUpstream2.proxyDownstream[0].id,
    //         refId: outputProxyUpstream2.proxyDownstream[0].refId,
    //         ip: expect.any(String),
    //         mask: expect.any(Number),
    //         type: outputProxyUpstream2.proxyDownstream[0].type,
    //         runner: outputProxyUpstream2.proxyDownstream[0].runner,
    //         status: outputProxyUpstream2.proxyDownstream[0].status,
    //       },
    //     ],
    //     runner: outputProxyUpstream2.runner,
    //     insertDate: outputProxyUpstream2.insertDate,
    //   });
    //   expect((<jest.Mock>filterAndSortProxyUpstream).mock.calls[0][0][2]).toEqual<Omit<ProxyUpstreamModel, 'clone'>>({
    //     id: outputProxyUpstream3.id,
    //     listenAddr: outputProxyUpstream3.listenAddr,
    //     listenPort: outputProxyUpstream3.listenPort,
    //     proxyDownstream: [
    //       <ProxyDownstreamModel & Pick<DefaultModel<ProxyDownstreamModel>, 'IS_DEFAULT_MODEL'> & { _defaultProperties: Array<keyof ProxyDownstreamModel> }>{
    //         IS_DEFAULT_MODEL: true,
    //         _defaultProperties: ['ip', 'mask'],
    //         id: outputProxyUpstream3.proxyDownstream[0].id,
    //         refId: outputProxyUpstream3.proxyDownstream[0].refId,
    //         ip: expect.any(String),
    //         mask: expect.any(Number),
    //         type: outputProxyUpstream3.proxyDownstream[0].type,
    //         runner: outputProxyUpstream3.proxyDownstream[0].runner,
    //         status: outputProxyUpstream3.proxyDownstream[0].status,
    //       },
    //     ],
    //     runner: outputProxyUpstream3.runner,
    //     insertDate: outputProxyUpstream3.insertDate,
    //   });
    //   expect((<jest.Mock>filterAndSortProxyUpstream).mock.calls[0][0][3]).toEqual<Omit<ProxyUpstreamModel, 'clone'>>({
    //     id: outputProxyUpstream4.id,
    //     listenAddr: outputProxyUpstream4.listenAddr,
    //     listenPort: outputProxyUpstream4.listenPort,
    //     proxyDownstream: [
    //       <ProxyDownstreamModel & Pick<DefaultModel<ProxyDownstreamModel>, 'IS_DEFAULT_MODEL'> & { _defaultProperties: Array<keyof ProxyDownstreamModel> }>{
    //         IS_DEFAULT_MODEL: true,
    //         _defaultProperties: ['id', 'refId', 'ip', 'mask', 'type'],
    //         id: expect.any(String),
    //         refId: expect.any(String),
    //         ip: expect.any(String),
    //         mask: expect.any(Number),
    //         type: expect.anything(),
    //         runner: outputProxyUpstream4.proxyDownstream[0].runner,
    //         status: outputProxyUpstream4.proxyDownstream[0].status,
    //       },
    //     ],
    //     runner: outputProxyUpstream4.runner,
    //     insertDate: outputProxyUpstream4.insertDate,
    //   });
    //   expect(error).toBeNull();
    //   expect(result).toHaveLength(4);
    //   expect(total).toEqual(4);
    // });
    //
    // it(`Should successfully get all proxy with filter`, async () => {
    //   dockerRunnerRepository.getAll.mockResolvedValue([
    //     null,
    //     [
    //       outputMystRunner1,
    //       outputMystConnectRunner1,
    //       outputProxyDownstreamRunner1,
    //       outputProxyUpstreamRunner1,
    //       outputMystRunner2,
    //       outputProxyDownstreamRunner2,
    //       outputProxyUpstreamRunner2,
    //       outputProxyDownstreamRunner3,
    //       outputProxyUpstreamRunner3,
    //       outputProxyUpstreamRunner4,
    //     ],
    //     10,
    //   ]);
    //   mystProviderRepository.getAll.mockResolvedValue([null, [outputVpnProvider1], 1]);
    //   systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outgoingIpAddress]);
    //   (<jest.Mock>filterAndSortProxyUpstream).mockReturnValue([[outputProxyUpstream1], 1]);
    //
    //   const [error, result, total] = await repository.getAll(inputFilterWithFilter);
    //
    //   expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
    //   expect(dockerRunnerRepository.getAll).toHaveBeenCalledWith(new FilterModel({skipPagination: true}));
    //   expect(mystProviderRepository.getAll).toHaveBeenCalled();
    //   expect((<FilterModel<VpnProviderModel>>mystProviderRepository.getAll.mock.calls[0][1]).skipPagination).toEqual(true);
    //   expect((<FilterModel<VpnProviderModel>>mystProviderRepository.getAll.mock.calls[0][1]).getCondition('isRegister')).toEqual({
    //     $opr: 'eq',
    //     isRegister: true,
    //   });
    //   expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
    //   expect(filterAndSortProxyUpstream).toHaveBeenCalled();
    //   expect((<jest.Mock>filterAndSortProxyUpstream).mock.calls[0][0]).toHaveLength(4);
    //   expect((<jest.Mock>filterAndSortProxyUpstream).mock.calls[0][0][0]).toEqual<Omit<ProxyUpstreamModel, 'clone'>>({
    //     id: outputProxyUpstream1.id,
    //     listenAddr: outputProxyUpstream1.listenAddr,
    //     listenPort: outputProxyUpstream1.listenPort,
    //     proxyDownstream: [
    //       <ProxyDownstreamModel & Pick<DefaultModel<ProxyDownstreamModel>, 'IS_DEFAULT_MODEL'> & { _defaultProperties: Array<keyof ProxyDownstreamModel> }>{
    //         IS_DEFAULT_MODEL: true,
    //         _defaultProperties: [],
    //         id: outputProxyUpstream1.proxyDownstream[0].id,
    //         refId: outputProxyUpstream1.proxyDownstream[0].refId,
    //         ip: outputProxyUpstream1.proxyDownstream[0].ip,
    //         mask: outputProxyUpstream1.proxyDownstream[0].mask,
    //         type: outputProxyUpstream1.proxyDownstream[0].type,
    //         runner: outputProxyUpstream1.proxyDownstream[0].runner,
    //         status: outputProxyUpstream1.proxyDownstream[0].status,
    //       },
    //     ],
    //     runner: outputProxyUpstream1.runner,
    //     insertDate: outputProxyUpstream1.insertDate,
    //   });
    //   expect((<jest.Mock>filterAndSortProxyUpstream).mock.calls[0][0][1]).toEqual<Omit<ProxyUpstreamModel, 'clone'>>({
    //     id: outputProxyUpstream2.id,
    //     listenAddr: outputProxyUpstream2.listenAddr,
    //     listenPort: outputProxyUpstream2.listenPort,
    //     proxyDownstream: [
    //       <ProxyDownstreamModel & Pick<DefaultModel<ProxyDownstreamModel>, 'IS_DEFAULT_MODEL'> & { _defaultProperties: Array<keyof ProxyDownstreamModel> }>{
    //         IS_DEFAULT_MODEL: true,
    //         _defaultProperties: ['ip', 'mask'],
    //         id: outputProxyUpstream2.proxyDownstream[0].id,
    //         refId: outputProxyUpstream2.proxyDownstream[0].refId,
    //         ip: expect.any(String),
    //         mask: expect.any(Number),
    //         type: outputProxyUpstream2.proxyDownstream[0].type,
    //         runner: outputProxyUpstream2.proxyDownstream[0].runner,
    //         status: outputProxyUpstream2.proxyDownstream[0].status,
    //       },
    //     ],
    //     runner: outputProxyUpstream2.runner,
    //     insertDate: outputProxyUpstream2.insertDate,
    //   });
    //   expect((<jest.Mock>filterAndSortProxyUpstream).mock.calls[0][0][2]).toEqual<Omit<ProxyUpstreamModel, 'clone'>>({
    //     id: outputProxyUpstream3.id,
    //     listenAddr: outputProxyUpstream3.listenAddr,
    //     listenPort: outputProxyUpstream3.listenPort,
    //     proxyDownstream: [
    //       <ProxyDownstreamModel & Pick<DefaultModel<ProxyDownstreamModel>, 'IS_DEFAULT_MODEL'> & { _defaultProperties: Array<keyof ProxyDownstreamModel> }>{
    //         IS_DEFAULT_MODEL: true,
    //         _defaultProperties: ['ip', 'mask'],
    //         id: outputProxyUpstream3.proxyDownstream[0].id,
    //         refId: outputProxyUpstream3.proxyDownstream[0].refId,
    //         ip: expect.any(String),
    //         mask: expect.any(Number),
    //         type: outputProxyUpstream3.proxyDownstream[0].type,
    //         runner: outputProxyUpstream3.proxyDownstream[0].runner,
    //         status: outputProxyUpstream3.proxyDownstream[0].status,
    //       },
    //     ],
    //     runner: outputProxyUpstream3.runner,
    //     insertDate: outputProxyUpstream3.insertDate,
    //   });
    //   expect((<jest.Mock>filterAndSortProxyUpstream).mock.calls[0][0][3]).toEqual<Omit<ProxyUpstreamModel, 'clone'>>({
    //     id: outputProxyUpstream4.id,
    //     listenAddr: outputProxyUpstream4.listenAddr,
    //     listenPort: outputProxyUpstream4.listenPort,
    //     proxyDownstream: [
    //       <ProxyDownstreamModel & Pick<DefaultModel<ProxyDownstreamModel>, 'IS_DEFAULT_MODEL'> & { _defaultProperties: Array<keyof ProxyDownstreamModel> }>{
    //         IS_DEFAULT_MODEL: true,
    //         _defaultProperties: ['id', 'refId', 'ip', 'mask', 'type'],
    //         id: expect.any(String),
    //         refId: expect.any(String),
    //         ip: expect.any(String),
    //         mask: expect.any(Number),
    //         type: expect.anything(),
    //         runner: outputProxyUpstream4.proxyDownstream[0].runner,
    //         status: outputProxyUpstream4.proxyDownstream[0].status,
    //       },
    //     ],
    //     runner: outputProxyUpstream4.runner,
    //     insertDate: outputProxyUpstream4.insertDate,
    //   });
    //   expect((<FilterModel<ProxyUpstreamModel>>(<jest.Mock>filterAndSortProxyUpstream).mock.calls[0][1]).getCondition('listenPort')).toEqual(inputFilterWithFilter.getCondition('listenPort'));
    //   expect(error).toBeNull();
    //   expect(result).toHaveLength(1);
    //   expect(total).toEqual(1);
    // });

    it(`Should successfully get all proxy with refId filter`, async () => {
      dockerRunnerRepository.getAll.mockResolvedValue([
        null,
        [
          outputMystRunner1,
          outputMystConnectRunner1,
          outputProxyDownstreamRunner1,
          outputProxyUpstreamRunner1,
          outputMystRunner2,
          outputProxyDownstreamRunner2,
          outputProxyUpstreamRunner2,
          outputProxyDownstreamRunner3,
          outputProxyUpstreamRunner3,
          outputProxyUpstreamRunner4,
        ],
        10,
      ]);
      mystProviderRepository.getById.mockResolvedValue([null, outputVpnProvider1]);
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outgoingIpAddress]);
      (<jest.Mock>filterAndSortProxyUpstream).mockReturnValue([[outputProxyUpstream1], 1]);

      const [error, result, total] = await repository.getAll(inputFilterWithRefIdFilter);

      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toHaveBeenCalledWith(new FilterModel({skipPagination: true}));
      expect(mystProviderRepository.getById).toHaveBeenCalled();
      expect(mystProviderRepository.getById).toHaveBeenCalledWith(expect.anything(), inputFilterWithRefIdFilter.getCondition('proxyDownstream').proxyDownstream[0].refId);
      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(filterAndSortProxyUpstream).toHaveBeenCalled();
      expect((<jest.Mock>filterAndSortProxyUpstream).mock.calls[0][0]).toHaveLength(4);
      expect((<jest.Mock>filterAndSortProxyUpstream).mock.calls[0][0][0]).toEqual<Omit<ProxyUpstreamModel, 'clone'>>({
        id: outputProxyUpstream1.id,
        listenAddr: outputProxyUpstream1.listenAddr,
        listenPort: outputProxyUpstream1.listenPort,
        proxyDownstream: [
          <ProxyDownstreamModel & Pick<DefaultModel<ProxyDownstreamModel>, 'IS_DEFAULT_MODEL'> & { _defaultProperties: Array<keyof ProxyDownstreamModel> }>{
            IS_DEFAULT_MODEL: true,
            _defaultProperties: [],
            id: outputProxyUpstream1.proxyDownstream[0].id,
            refId: outputProxyUpstream1.proxyDownstream[0].refId,
            ip: outputProxyUpstream1.proxyDownstream[0].ip,
            mask: outputProxyUpstream1.proxyDownstream[0].mask,
            type: outputProxyUpstream1.proxyDownstream[0].type,
            runner: outputProxyUpstream1.proxyDownstream[0].runner,
            status: outputProxyUpstream1.proxyDownstream[0].status,
          },
        ],
        runner: outputProxyUpstream1.runner,
        insertDate: outputProxyUpstream1.insertDate,
      });
      expect((<jest.Mock>filterAndSortProxyUpstream).mock.calls[0][0][1]).toEqual<Omit<ProxyUpstreamModel, 'clone'>>({
        id: outputProxyUpstream2.id,
        listenAddr: outputProxyUpstream2.listenAddr,
        listenPort: outputProxyUpstream2.listenPort,
        proxyDownstream: [
          <ProxyDownstreamModel & Pick<DefaultModel<ProxyDownstreamModel>, 'IS_DEFAULT_MODEL'> & { _defaultProperties: Array<keyof ProxyDownstreamModel> }>{
            IS_DEFAULT_MODEL: true,
            _defaultProperties: ['ip', 'mask'],
            id: outputProxyUpstream2.proxyDownstream[0].id,
            refId: outputProxyUpstream2.proxyDownstream[0].refId,
            ip: expect.any(String),
            mask: expect.any(Number),
            type: outputProxyUpstream2.proxyDownstream[0].type,
            runner: outputProxyUpstream2.proxyDownstream[0].runner,
            status: outputProxyUpstream2.proxyDownstream[0].status,
          },
        ],
        runner: outputProxyUpstream2.runner,
        insertDate: outputProxyUpstream2.insertDate,
      });
      expect((<jest.Mock>filterAndSortProxyUpstream).mock.calls[0][0][2]).toEqual<Omit<ProxyUpstreamModel, 'clone'>>({
        id: outputProxyUpstream3.id,
        listenAddr: outputProxyUpstream3.listenAddr,
        listenPort: outputProxyUpstream3.listenPort,
        proxyDownstream: [
          <ProxyDownstreamModel & Pick<DefaultModel<ProxyDownstreamModel>, 'IS_DEFAULT_MODEL'> & { _defaultProperties: Array<keyof ProxyDownstreamModel> }>{
            IS_DEFAULT_MODEL: true,
            _defaultProperties: ['ip', 'mask'],
            id: outputProxyUpstream3.proxyDownstream[0].id,
            refId: outputProxyUpstream3.proxyDownstream[0].refId,
            ip: expect.any(String),
            mask: expect.any(Number),
            type: outputProxyUpstream3.proxyDownstream[0].type,
            runner: outputProxyUpstream3.proxyDownstream[0].runner,
            status: outputProxyUpstream3.proxyDownstream[0].status,
          },
        ],
        runner: outputProxyUpstream3.runner,
        insertDate: outputProxyUpstream3.insertDate,
      });
      expect((<jest.Mock>filterAndSortProxyUpstream).mock.calls[0][0][3]).toEqual<Omit<ProxyUpstreamModel, 'clone'>>({
        id: outputProxyUpstream4.id,
        listenAddr: outputProxyUpstream4.listenAddr,
        listenPort: outputProxyUpstream4.listenPort,
        proxyDownstream: [
          <ProxyDownstreamModel & Pick<DefaultModel<ProxyDownstreamModel>, 'IS_DEFAULT_MODEL'> & { _defaultProperties: Array<keyof ProxyDownstreamModel> }>{
            IS_DEFAULT_MODEL: true,
            _defaultProperties: ['id', 'refId', 'ip', 'mask', 'type'],
            id: expect.any(String),
            refId: expect.any(String),
            ip: expect.any(String),
            mask: expect.any(Number),
            type: expect.anything(),
            runner: outputProxyUpstream4.proxyDownstream[0].runner,
            status: outputProxyUpstream4.proxyDownstream[0].status,
          },
        ],
        runner: outputProxyUpstream4.runner,
        insertDate: outputProxyUpstream4.insertDate,
      });
      expect((<FilterModel<ProxyUpstreamModel>>(<jest.Mock>filterAndSortProxyUpstream).mock.calls[0][1]).getCondition('proxyDownstream')).toEqual(inputFilterWithRefIdFilter.getCondition('proxyDownstream'));
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(total).toEqual(1);
    });
  });

  describe(`Get proxy by id`, () => {
    let inputId: string;
    let outgoingIpAddress: string;
    let outputMystRunner1: RunnerModel<MystIdentityModel>;
    let outputMystConnectRunner1: RunnerModel<[MystIdentityModel, VpnProviderModel]>;
    let outputProxyDownstreamRunner1: RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyDownstreamModel]>;
    let outputProxyUpstreamRunner1: RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>;
    let outputVpnProvider1: VpnProviderModel;
    let outputProxyUpstream: ProxyUpstreamModel;

    beforeEach(() => {
      inputId = '11111111-1111-1111-1111-777777777777';

      outgoingIpAddress = '26.45.101.6';

      outputMystRunner1 = new RunnerModel<MystIdentityModel>({
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
      outputMystRunner1.label = {
        $namespace: MystIdentityModel.name,
        id: '11111111-1111-1111-1111-222222222222',
        identity: 'identity1',
      };
      outputMystConnectRunner1 = new RunnerModel<[MystIdentityModel, VpnProviderModel]>({
        id: '11111111-1111-1111-1111-333333333333',
        serial: 'myst-connect-serial',
        name: 'myst-connect-name',
        service: RunnerServiceEnum.MYST_CONNECT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.NONE,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputMystConnectRunner1.label = [
        {
          $namespace: MystIdentityModel.name,
          id: '11111111-1111-1111-1111-222222222222',
          identity: 'identity1',
        },
        {
          $namespace: VpnProviderModel.name,
          id: '11111111-1111-1111-1111-444444444444',
          userIdentity: 'identity1',
          providerIdentity: 'provider-identity1',
        },
      ];
      outputProxyDownstreamRunner1 = new RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyDownstreamModel]>({
        id: '11111111-1111-1111-1111-555555555555',
        serial: 'proxy-proxyDownstream-serial',
        name: 'proxy-downstream-name',
        service: RunnerServiceEnum.ENVOY,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketUri: '10.10.10.1',
        socketPort: 10001,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputProxyDownstreamRunner1.label = [
        {
          $namespace: MystIdentityModel.name,
          id: '11111111-1111-1111-1111-222222222222',
        },
        {
          $namespace: VpnProviderModel.name,
          id: '11111111-1111-1111-1111-444444444444',
        },
        {
          $namespace: ProxyDownstreamModel.name,
          id: '11111111-1111-1111-1111-666666666666',
        },
      ];
      outputProxyUpstreamRunner1 = new RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>({
        id: inputId,
        serial: 'proxy-upstream-serial',
        name: 'proxy-upstream-name',
        service: RunnerServiceEnum.SOCAT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketUri: '10.10.10.2',
        socketPort: 3128,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputProxyUpstreamRunner1.label = [
        {
          $namespace: MystIdentityModel.name,
          id: '11111111-1111-1111-1111-222222222222',
        },
        {
          $namespace: VpnProviderModel.name,
          id: '11111111-1111-1111-1111-444444444444',
        },
        {
          $namespace: ProxyUpstreamModel.name,
          id: '11111111-1111-1111-1111-666666666666',
        },
      ];

      outputVpnProvider1 = new VpnProviderModel({
        id: (<VpnProviderModel><unknown>outputMystConnectRunner1.label.find((v) => v.$namespace === VpnProviderModel.name)).id,
        userIdentity: (<VpnProviderModel><unknown>outputMystConnectRunner1.label.find((v) => v.$namespace === VpnProviderModel.name)).userIdentity,
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: (<VpnProviderModel><unknown>outputMystConnectRunner1.label.find((v) => v.$namespace === VpnProviderModel.name)).providerIdentity,
        providerStatus: VpnProviderStatusEnum.ONLINE,
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        ip: '59.10.56.111',
        mask: 32,
        country: 'GB',
        runner: outputMystRunner1,
        isRegister: true,
        proxyCount: 0,
        insertDate: new Date(),
      });

      outputProxyUpstream = new ProxyUpstreamModel({
        id: (<ProxyUpstreamModel><unknown>outputProxyUpstreamRunner1.label.find((v) => v.$namespace === ProxyUpstreamModel.name)).id,
        listenAddr: outgoingIpAddress,
        listenPort: outputProxyUpstreamRunner1.socketPort,
        proxyDownstream: [
          new ProxyDownstreamModel({
            id: (<VpnProviderModel><unknown>outputProxyDownstreamRunner1.label.find((v) => v.$namespace === ProxyDownstreamModel.name)).id,
            refId: (<VpnProviderModel><unknown>outputProxyDownstreamRunner1.label.find((v) => v.$namespace === VpnProviderModel.name)).id,
            ip: outputVpnProvider1.ip,
            mask: outputVpnProvider1.mask,
            type: ProxyTypeEnum.MYST,
            runner: outputProxyDownstreamRunner1,
            status: ProxyStatusEnum.ONLINE,
          }),
        ],
        runner: outputProxyUpstreamRunner1,
        insertDate: new Date(),
      });
    });

    it(`Should error get proxy by id when get upstream runner`, async () => {
      dockerRunnerRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.getById(inputId);

      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            service: RunnerServiceEnum.SOCAT,
          },
          {
            $opr: 'eq',
            label: {
              $namespace: ProxyUpstreamModel.name,
              id: inputId,
            },
          },
        ]),
      );
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get proxy by id and return empty records`, async () => {
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result] = await repository.getById(inputId);

      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            service: RunnerServiceEnum.SOCAT,
          },
          {
            $opr: 'eq',
            label: {
              $namespace: ProxyUpstreamModel.name,
              id: inputId,
            },
          },
        ]),
      );
      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it(`Should error get proxy by id when get dependency runner info`, async () => {
      dockerRunnerRepository.getAll
        .mockResolvedValueOnce([null, [outputProxyUpstreamRunner1], 1])
        .mockResolvedValueOnce([new UnknownException()]);
      mystProviderRepository.getById.mockResolvedValue([null, null]);
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outgoingIpAddress]);

      const [error] = await repository.getById(inputId);

      expect(dockerRunnerRepository.getAll).toHaveBeenCalledTimes(2);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            service: RunnerServiceEnum.SOCAT,
          },
          {
            $opr: 'eq',
            label: {
              $namespace: ProxyUpstreamModel.name,
              id: inputId,
            },
          },
        ]),
      );
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[1][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            label: {
              $namespace: VpnProviderModel.name,
              id: outputProxyUpstreamRunner1.label.find((v) => v.$namespace === VpnProviderModel.name).id,
            },
          },
        ]),
      );
      expect(mystProviderRepository.getById).toHaveBeenCalled();
      expect(mystProviderRepository.getById).toHaveBeenCalledWith(expect.anything(), outputProxyUpstreamRunner1.label.find((v) => v.$namespace === VpnProviderModel.name).id);
      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get proxy by id when get vpn provider info`, async () => {
      dockerRunnerRepository.getAll
        .mockResolvedValueOnce([null, [outputProxyUpstreamRunner1], 1])
        .mockResolvedValueOnce([null, [], 0]);
      mystProviderRepository.getById.mockResolvedValue([new UnknownException()]);
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outgoingIpAddress]);

      const [error] = await repository.getById(inputId);

      expect(dockerRunnerRepository.getAll).toHaveBeenCalledTimes(2);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            service: RunnerServiceEnum.SOCAT,
          },
          {
            $opr: 'eq',
            label: {
              $namespace: ProxyUpstreamModel.name,
              id: inputId,
            },
          },
        ]),
      );
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[1][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            label: {
              $namespace: VpnProviderModel.name,
              id: outputProxyUpstreamRunner1.label.find((v) => v.$namespace === VpnProviderModel.name).id,
            },
          },
        ]),
      );
      expect(mystProviderRepository.getById).toHaveBeenCalled();
      expect(mystProviderRepository.getById).toHaveBeenCalledWith(expect.anything(), outputProxyUpstreamRunner1.label.find((v) => v.$namespace === VpnProviderModel.name).id);
      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get proxy by id when get outgoing ip address`, async () => {
      dockerRunnerRepository.getAll
        .mockResolvedValueOnce([null, [outputProxyUpstreamRunner1], 1])
        .mockResolvedValueOnce([null, [], 0]);
      mystProviderRepository.getById.mockResolvedValue([null, null]);
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.getById(inputId);

      expect(dockerRunnerRepository.getAll).toHaveBeenCalledTimes(2);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            service: RunnerServiceEnum.SOCAT,
          },
          {
            $opr: 'eq',
            label: {
              $namespace: ProxyUpstreamModel.name,
              id: inputId,
            },
          },
        ]),
      );
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[1][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            label: {
              $namespace: VpnProviderModel.name,
              id: outputProxyUpstreamRunner1.label.find((v) => v.$namespace === VpnProviderModel.name).id,
            },
          },
        ]),
      );
      expect(mystProviderRepository.getById).toHaveBeenCalled();
      expect(mystProviderRepository.getById).toHaveBeenCalledWith(expect.anything(), outputProxyUpstreamRunner1.label.find((v) => v.$namespace === VpnProviderModel.name).id);
      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get proxy by id`, async () => {
      dockerRunnerRepository.getAll
        .mockResolvedValueOnce([null, [outputProxyUpstreamRunner1], 1])
        .mockResolvedValueOnce([null, [outputMystConnectRunner1, outputProxyDownstreamRunner1, outputProxyUpstreamRunner1], 3]);
      mystProviderRepository.getById.mockResolvedValue([null, outputVpnProvider1]);
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outgoingIpAddress]);

      const [error, result] = await repository.getById(inputId);

      expect(dockerRunnerRepository.getAll).toHaveBeenCalledTimes(2);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            service: RunnerServiceEnum.SOCAT,
          },
          {
            $opr: 'eq',
            label: {
              $namespace: ProxyUpstreamModel.name,
              id: inputId,
            },
          },
        ]),
      );
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[1][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            label: {
              $namespace: VpnProviderModel.name,
              id: outputProxyUpstreamRunner1.label.find((v) => v.$namespace === VpnProviderModel.name).id,
            },
          },
        ]),
      );
      expect(mystProviderRepository.getById).toHaveBeenCalled();
      expect(mystProviderRepository.getById).toHaveBeenCalledWith(expect.anything(), outputProxyUpstreamRunner1.label.find((v) => v.$namespace === VpnProviderModel.name).id);
      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(error).toBeNull();
      expect(result).toEqual<Omit<ProxyUpstreamModel, 'clone'>>({
        id: outputProxyUpstream.id,
        listenAddr: outputProxyUpstream.listenAddr,
        listenPort: outputProxyUpstream.listenPort,
        proxyDownstream: [
          <ProxyDownstreamModel & Pick<DefaultModel<ProxyDownstreamModel>, 'IS_DEFAULT_MODEL'> & { _defaultProperties: Array<keyof ProxyDownstreamModel> }>{
            IS_DEFAULT_MODEL: true,
            _defaultProperties: [],
            id: outputProxyUpstream.proxyDownstream[0].id,
            refId: outputProxyUpstream.proxyDownstream[0].refId,
            ip: outputProxyUpstream.proxyDownstream[0].ip,
            mask: outputProxyUpstream.proxyDownstream[0].mask,
            type: outputProxyUpstream.proxyDownstream[0].type,
            runner: outputProxyUpstream.proxyDownstream[0].runner,
            status: outputProxyUpstream.proxyDownstream[0].status,
          },
        ],
        runner: outputProxyUpstream.runner,
        insertDate: outputProxyUpstream.insertDate,
      });
    });
  });

  describe(`Create new proxy`, () => {
    let inputProxyWithPort: ProxyUpstreamModel;
    let inputProxyWithoutPort: ProxyUpstreamModel;
    let outgoingIpAddress: string;
    let outputMystRunner: RunnerModel<MystIdentityModel>;
    let outputVpnProvider: VpnProviderModel;
    let outputMystConnectRunner1: RunnerModel<[MystIdentityModel, VpnProviderModel]>;
    let outputProxyUpstreamRunnerWithPort: RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>;
    let outputProxyUpstreamRunnerWithoutPort: RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>;
    let outputProxyDownstreamRunner: RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyDownstreamModel]>;

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
      inputProxyWithoutPort = defaultModelFactory(
        ProxyUpstreamModel,
        {
          id: 'default-id',
          listenAddr: 'listen-addr-default',
          listenPort: 0,
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
        ['id', 'listenAddr', 'listenPort', 'insertDate'],
      );

      outgoingIpAddress = '26.45.101.6';

      outputMystRunner = new RunnerModel<MystIdentityModel>({
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
      outputMystRunner.label = {
        $namespace: MystIdentityModel.name,
        id: '11111111-1111-1111-1111-222222222222',
        identity: 'identity1',
      };

      outputVpnProvider = new VpnProviderModel({
        id: '44444444-4444-4444-4444-444444444444',
        userIdentity: outputMystRunner.label.identity,
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'provider-identity1',
        providerStatus: VpnProviderStatusEnum.ONLINE,
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        ip: '59.10.56.111',
        mask: 32,
        country: 'GB',
        runner: outputMystRunner,
        isRegister: true,
        proxyCount: 0,
        insertDate: new Date(),
      });

      outputMystConnectRunner1 = new RunnerModel<[MystIdentityModel, VpnProviderModel]>({
        id: '11111111-1111-1111-1111-333333333333',
        serial: 'myst-connect-serial',
        name: 'myst-connect-name',
        service: RunnerServiceEnum.MYST_CONNECT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.NONE,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputMystConnectRunner1.label = [
        {
          $namespace: MystIdentityModel.name,
          id: outputMystRunner.label.id,
          identity: outputVpnProvider.userIdentity,
        },
        {
          $namespace: VpnProviderModel.name,
          id: outputVpnProvider.id,
          userIdentity: outputVpnProvider.userIdentity,
          providerIdentity: outputVpnProvider.providerIdentity,
        },
      ];

      outputProxyUpstreamRunnerWithPort = new RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>({
        id: 'socat-runner-id',
        serial: 'socat-runner-serial',
        name: `${RunnerServiceEnum.SOCAT}-${outputMystRunner.label.identity}`,
        service: RunnerServiceEnum.SOCAT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketPort: inputProxyWithPort.listenPort,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputProxyUpstreamRunnerWithPort.label = [
        {
          $namespace: MystIdentityModel.name,
          id: outputMystRunner.label.id,
        },
        {
          $namespace: VpnProviderModel.name,
          id: outputVpnProvider.id,
        },
        {
          $namespace: ProxyUpstreamModel.name,
          id: '11111111-1111-1111-1111-555555555555',
        },
      ];

      outputProxyUpstreamRunnerWithoutPort = new RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>({
        id: 'socat-runner-id',
        serial: 'socat-runner-serial',
        name: `${RunnerServiceEnum.SOCAT}-${outputMystRunner.label.identity}`,
        service: RunnerServiceEnum.SOCAT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketPort: 3030,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputProxyUpstreamRunnerWithoutPort.label = [
        {
          $namespace: MystIdentityModel.name,
          id: outputMystRunner.label.id,
        },
        {
          $namespace: VpnProviderModel.name,
          id: outputVpnProvider.id,
        },
        {
          $namespace: ProxyUpstreamModel.name,
          id: '11111111-1111-1111-1111-555555555555',
        },
      ];

      outputProxyDownstreamRunner = new RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyDownstreamModel]>({
        id: 'envoy-runner-id',
        serial: 'envoy-runner-serial',
        name: `${RunnerServiceEnum.ENVOY}-${outputMystRunner.label.identity}`,
        service: RunnerServiceEnum.ENVOY,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketPort: 10001,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputProxyDownstreamRunner.label = [
        {
          $namespace: MystIdentityModel.name,
          id: outputMystRunner.label.id,
        },
        {
          $namespace: VpnProviderModel.name,
          id: outputVpnProvider.id,
        },
        {
          $namespace: ProxyDownstreamModel.name,
          id: '11111111-1111-1111-1111-666666666666',
        },
      ];
    });

    it(`Should error create new proxy when get vpn provider info`, async () => {
      mystProviderRepository.getById.mockResolvedValue([new UnknownException()]);
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outgoingIpAddress]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error] = await repository.create(inputProxyWithPort);

      expect(mystProviderRepository.getById).toHaveBeenCalled();
      expect(mystProviderRepository.getById).toHaveBeenCalledWith(expect.anything(), inputProxyWithPort.proxyDownstream[0].refId);
      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toHaveLength(1);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            label: {
              $namespace: VpnProviderModel.name,
              id: inputProxyWithPort.proxyDownstream[0].refId,
            },
          },
        ]),
      );
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error create new proxy when get outgoing ip addr`, async () => {
      mystProviderRepository.getById.mockResolvedValue([null, outputVpnProvider]);
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([new UnknownException()]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error] = await repository.create(inputProxyWithPort);

      expect(mystProviderRepository.getById).toHaveBeenCalled();
      expect(mystProviderRepository.getById).toHaveBeenCalledWith(expect.anything(), inputProxyWithPort.proxyDownstream[0].refId);
      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toHaveLength(1);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            label: {
              $namespace: VpnProviderModel.name,
              id: inputProxyWithPort.proxyDownstream[0].refId,
            },
          },
        ]),
      );
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error create new proxy when get runner dependency`, async () => {
      mystProviderRepository.getById.mockResolvedValue([null, outputVpnProvider]);
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outgoingIpAddress]);
      dockerRunnerRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.create(inputProxyWithPort);

      expect(mystProviderRepository.getById).toHaveBeenCalled();
      expect(mystProviderRepository.getById).toHaveBeenCalledWith(expect.anything(), inputProxyWithPort.proxyDownstream[0].refId);
      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toHaveLength(1);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            label: {
              $namespace: VpnProviderModel.name,
              id: inputProxyWithPort.proxyDownstream[0].refId,
            },
          },
        ]),
      );
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error create new proxy when exist proxy upstream and downstream`, async () => {
      mystProviderRepository.getById.mockResolvedValue([null, outputVpnProvider]);
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outgoingIpAddress]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [outputProxyUpstreamRunnerWithPort, outputProxyDownstreamRunner], 2]);

      const [error] = await repository.create(inputProxyWithPort);

      expect(mystProviderRepository.getById).toHaveBeenCalled();
      expect(mystProviderRepository.getById).toHaveBeenCalledWith(expect.anything(), inputProxyWithPort.proxyDownstream[0].refId);
      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toHaveLength(1);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            label: {
              $namespace: VpnProviderModel.name,
              id: inputProxyWithPort.proxyDownstream[0].refId,
            },
          },
        ]),
      );
      expect(error).toBeInstanceOf(ExistException);
    });

    it(`Should error create new proxy when remove proxy downstream because proxy downstream exist but upstream not exists`, async () => {
      mystProviderRepository.getById.mockResolvedValue([null, outputVpnProvider]);
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outgoingIpAddress]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [outputProxyDownstreamRunner], 1]);
      dockerRunnerRepository.remove.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.create(inputProxyWithPort);

      expect(mystProviderRepository.getById).toHaveBeenCalled();
      expect(mystProviderRepository.getById).toHaveBeenCalledWith(expect.anything(), inputProxyWithPort.proxyDownstream[0].refId);
      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toHaveLength(1);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            label: {
              $namespace: VpnProviderModel.name,
              id: inputProxyWithPort.proxyDownstream[0].refId,
            },
          },
        ]),
      );
      expect(dockerRunnerRepository.remove).toHaveBeenCalled();
      expect(dockerRunnerRepository.remove).toHaveBeenCalledWith(outputProxyDownstreamRunner.id);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error create new proxy with port when create upstream runner`, async () => {
      mystProviderRepository.getById.mockResolvedValue([null, outputVpnProvider]);
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outgoingIpAddress]);
      dockerRunnerRepository.getAll.mockResolvedValueOnce([null, [outputMystConnectRunner1], 1]);
      identifierMock.generateId.mockReturnValueOnce(outputProxyUpstreamRunnerWithPort.label.find((v) => v.$namespace === ProxyUpstreamModel.name).id);
      dockerRunnerRepository.create.mockResolvedValueOnce([new UnknownException()]);

      const [error] = await repository.create(inputProxyWithPort);

      expect(mystProviderRepository.getById).toHaveBeenCalled();
      expect(mystProviderRepository.getById).toHaveBeenCalledWith(expect.anything(), inputProxyWithPort.proxyDownstream[0].refId);
      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toHaveLength(1);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            label: {
              $namespace: VpnProviderModel.name,
              id: inputProxyWithPort.proxyDownstream[0].refId,
            },
          },
        ]),
      );
      expect(identifierMock.generateId).toHaveBeenCalledTimes(1);
      expect(dockerRunnerRepository.create).toHaveBeenCalledTimes(1);
      expect(dockerRunnerRepository.create.mock.calls[0][0]).toEqual<Omit<defaultModelType<RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>> & { _defaultProperties: Array<keyof RunnerModel> }, 'clone' | 'isDefaultProperty' | 'getDefaultProperties'>>({
        IS_DEFAULT_MODEL: true,
        _defaultProperties: ['id', 'serial', 'status', 'insertDate'],
        id: expect.anything(),
        serial: expect.anything(),
        name: `${RunnerServiceEnum.SOCAT}-${outputMystRunner.label.identity}`,
        service: RunnerServiceEnum.SOCAT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketPort: inputProxyWithPort.listenPort,
        label: [
          {
            $namespace: MystIdentityModel.name,
            id: outputMystRunner.label.id,
          },
          {
            $namespace: VpnProviderModel.name,
            id: outputVpnProvider.id,
          },
          {
            $namespace: ProxyUpstreamModel.name,
            id: outputProxyUpstreamRunnerWithPort.label.find((v) => v.$namespace === ProxyUpstreamModel.name).id,
          },
        ],
        status: expect.anything(),
        insertDate: expect.anything(),
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error create new proxy without port when create upstream runner`, async () => {
      mystProviderRepository.getById.mockResolvedValue([null, outputVpnProvider]);
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outgoingIpAddress]);
      dockerRunnerRepository.getAll.mockResolvedValueOnce([null, [outputMystConnectRunner1], 1]);
      identifierMock.generateId.mockReturnValueOnce(outputProxyUpstreamRunnerWithoutPort.label.find((v) => v.$namespace === ProxyUpstreamModel.name).id);
      dockerRunnerRepository.create.mockResolvedValueOnce([new UnknownException()]);

      const [error] = await repository.create(inputProxyWithoutPort);

      expect(mystProviderRepository.getById).toHaveBeenCalled();
      expect(mystProviderRepository.getById).toHaveBeenCalledWith(expect.anything(), inputProxyWithoutPort.proxyDownstream[0].refId);
      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toHaveLength(1);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            label: {
              $namespace: VpnProviderModel.name,
              id: inputProxyWithPort.proxyDownstream[0].refId,
            },
          },
        ]),
      );
      expect(identifierMock.generateId).toHaveBeenCalledTimes(1);
      expect(dockerRunnerRepository.create).toHaveBeenCalledTimes(1);
      expect(dockerRunnerRepository.create.mock.calls[0][0]).toEqual<Omit<defaultModelType<RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>> & { _defaultProperties: Array<keyof RunnerModel> }, 'clone' | 'isDefaultProperty' | 'getDefaultProperties'>>({
        IS_DEFAULT_MODEL: true,
        _defaultProperties: ['id', 'serial', 'status', 'insertDate'],
        id: expect.anything(),
        serial: expect.anything(),
        name: `${RunnerServiceEnum.SOCAT}-${outputMystRunner.label.identity}`,
        service: RunnerServiceEnum.SOCAT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        label: [
          {
            $namespace: MystIdentityModel.name,
            id: outputMystRunner.label.id,
          },
          {
            $namespace: VpnProviderModel.name,
            id: outputVpnProvider.id,
          },
          {
            $namespace: ProxyUpstreamModel.name,
            id: outputProxyUpstreamRunnerWithPort.label.find((v) => v.$namespace === ProxyUpstreamModel.name).id,
          },
        ],
        status: expect.anything(),
        insertDate: expect.anything(),
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error create new proxy with port when create downstream runner`, async () => {
      mystProviderRepository.getById.mockResolvedValue([null, outputVpnProvider]);
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outgoingIpAddress]);
      dockerRunnerRepository.getAll.mockResolvedValueOnce([null, [outputMystConnectRunner1], 1]);
      identifierMock.generateId
        .mockReturnValueOnce(outputProxyUpstreamRunnerWithPort.label.find((v) => v.$namespace === ProxyUpstreamModel.name).id)
        .mockReturnValueOnce(outputProxyDownstreamRunner.label.find((v) => v.$namespace === ProxyDownstreamModel.name).id);
      dockerRunnerRepository.create
        .mockResolvedValueOnce([null, outputProxyUpstreamRunnerWithPort])
        .mockResolvedValueOnce([new UnknownException()]);

      const [error] = await repository.create(inputProxyWithPort);

      expect(mystProviderRepository.getById).toHaveBeenCalled();
      expect(mystProviderRepository.getById).toHaveBeenCalledWith(expect.anything(), inputProxyWithPort.proxyDownstream[0].refId);
      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toHaveLength(1);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            label: {
              $namespace: VpnProviderModel.name,
              id: inputProxyWithPort.proxyDownstream[0].refId,
            },
          },
        ]),
      );
      expect(identifierMock.generateId).toHaveBeenCalledTimes(2);
      expect(dockerRunnerRepository.create).toHaveBeenCalledTimes(2);
      expect(dockerRunnerRepository.create.mock.calls[0][0]).toEqual<Omit<defaultModelType<RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>> & { _defaultProperties: Array<keyof RunnerModel> }, 'clone' | 'isDefaultProperty' | 'getDefaultProperties'>>({
        IS_DEFAULT_MODEL: true,
        _defaultProperties: ['id', 'serial', 'status', 'insertDate'],
        id: expect.anything(),
        serial: expect.anything(),
        name: `${RunnerServiceEnum.SOCAT}-${outputMystRunner.label.identity}`,
        service: RunnerServiceEnum.SOCAT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketPort: inputProxyWithPort.listenPort,
        label: [
          {
            $namespace: MystIdentityModel.name,
            id: outputMystRunner.label.id,
          },
          {
            $namespace: VpnProviderModel.name,
            id: outputVpnProvider.id,
          },
          {
            $namespace: ProxyUpstreamModel.name,
            id: outputProxyUpstreamRunnerWithPort.label.find((v) => v.$namespace === ProxyUpstreamModel.name).id,
          },
        ],
        status: expect.anything(),
        insertDate: expect.anything(),
      });
      expect(dockerRunnerRepository.create.mock.calls[1][0]).toEqual<Omit<defaultModelType<RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyDownstreamModel]>> & { _defaultProperties: Array<keyof RunnerModel> }, 'clone' | 'isDefaultProperty' | 'getDefaultProperties'>>({
        IS_DEFAULT_MODEL: true,
        _defaultProperties: ['id', 'serial', 'status', 'insertDate'],
        id: expect.anything(),
        serial: expect.anything(),
        name: `${RunnerServiceEnum.ENVOY}-${outputMystRunner.label.identity}`,
        service: RunnerServiceEnum.ENVOY,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketPort: inputProxyWithPort.listenPort,
        label: [
          {
            $namespace: MystIdentityModel.name,
            id: outputMystRunner.label.id,
          },
          {
            $namespace: VpnProviderModel.name,
            id: outputVpnProvider.id,
          },
          {
            $namespace: ProxyDownstreamModel.name,
            id: outputProxyDownstreamRunner.label.find((v) => v.$namespace === ProxyDownstreamModel.name).id,
          },
        ],
        status: expect.anything(),
        insertDate: expect.anything(),
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully create new proxy`, async () => {
      mystProviderRepository.getById.mockResolvedValue([null, outputVpnProvider]);
      systemInfoRepository.getOutgoingIpAddress.mockResolvedValue([null, outgoingIpAddress]);
      dockerRunnerRepository.getAll.mockResolvedValueOnce([null, [outputMystConnectRunner1], 1]);
      identifierMock.generateId
        .mockReturnValueOnce(outputProxyUpstreamRunnerWithPort.label.find((v) => v.$namespace === ProxyUpstreamModel.name).id)
        .mockReturnValueOnce(outputProxyDownstreamRunner.label.find((v) => v.$namespace === ProxyDownstreamModel.name).id);
      dockerRunnerRepository.create
        .mockResolvedValueOnce([null, outputProxyUpstreamRunnerWithPort])
        .mockResolvedValueOnce([null, outputProxyDownstreamRunner]);

      const [error, result] = await repository.create(inputProxyWithPort);

      expect(mystProviderRepository.getById).toHaveBeenCalled();
      expect(mystProviderRepository.getById).toHaveBeenCalledWith(expect.anything(), inputProxyWithPort.proxyDownstream[0].refId);
      expect(systemInfoRepository.getOutgoingIpAddress).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toHaveLength(1);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            label: {
              $namespace: VpnProviderModel.name,
              id: inputProxyWithPort.proxyDownstream[0].refId,
            },
          },
        ]),
      );
      expect(identifierMock.generateId).toHaveBeenCalledTimes(2);
      expect(dockerRunnerRepository.create).toHaveBeenCalledTimes(2);
      expect(dockerRunnerRepository.create.mock.calls[0][0]).toEqual<Omit<defaultModelType<RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>> & { _defaultProperties: Array<keyof RunnerModel> }, 'clone' | 'isDefaultProperty' | 'getDefaultProperties'>>({
        IS_DEFAULT_MODEL: true,
        _defaultProperties: ['id', 'serial', 'status', 'insertDate'],
        id: expect.anything(),
        serial: expect.anything(),
        name: `${RunnerServiceEnum.SOCAT}-${outputMystRunner.label.identity}`,
        service: RunnerServiceEnum.SOCAT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketPort: inputProxyWithPort.listenPort,
        label: [
          {
            $namespace: MystIdentityModel.name,
            id: outputMystRunner.label.id,
          },
          {
            $namespace: VpnProviderModel.name,
            id: outputVpnProvider.id,
          },
          {
            $namespace: ProxyUpstreamModel.name,
            id: outputProxyUpstreamRunnerWithPort.label.find((v) => v.$namespace === ProxyUpstreamModel.name).id,
          },
        ],
        status: expect.anything(),
        insertDate: expect.anything(),
      });
      expect(dockerRunnerRepository.create.mock.calls[1][0]).toEqual<Omit<defaultModelType<RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyDownstreamModel]>> & { _defaultProperties: Array<keyof RunnerModel> }, 'clone' | 'isDefaultProperty' | 'getDefaultProperties'>>({
        IS_DEFAULT_MODEL: true,
        _defaultProperties: ['id', 'serial', 'status', 'insertDate'],
        id: expect.anything(),
        serial: expect.anything(),
        name: `${RunnerServiceEnum.ENVOY}-${outputMystRunner.label.identity}`,
        service: RunnerServiceEnum.ENVOY,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketPort: inputProxyWithPort.listenPort,
        label: [
          {
            $namespace: MystIdentityModel.name,
            id: outputMystRunner.label.id,
          },
          {
            $namespace: VpnProviderModel.name,
            id: outputVpnProvider.id,
          },
          {
            $namespace: ProxyDownstreamModel.name,
            id: outputProxyDownstreamRunner.label.find((v) => v.$namespace === ProxyDownstreamModel.name).id,
          },
        ],
        status: expect.anything(),
        insertDate: expect.anything(),
      });
      expect(error).toBeNull();
      expect(result).toEqual<Omit<ProxyUpstreamModel, 'clone'>>({
        id: outputProxyUpstreamRunnerWithPort.label.find((v) => v.$namespace === ProxyUpstreamModel.name).id,
        listenAddr: outgoingIpAddress,
        listenPort: outputProxyUpstreamRunnerWithPort.socketPort,
        proxyDownstream: [
          <ProxyDownstreamModel & Pick<DefaultModel<ProxyDownstreamModel>, 'IS_DEFAULT_MODEL'> & { _defaultProperties: Array<keyof ProxyDownstreamModel> }>{
            IS_DEFAULT_MODEL: true,
            _defaultProperties: [],
            id: outputProxyDownstreamRunner.label.find((v) => v.$namespace === ProxyDownstreamModel.name).id,
            refId: outputVpnProvider.id,
            ip: outputVpnProvider.ip,
            mask: outputVpnProvider.mask,
            type: ProxyTypeEnum.MYST,
            runner: outputProxyDownstreamRunner,
            status: ProxyStatusEnum.ONLINE,
          },
        ],
        runner: outputProxyUpstreamRunnerWithPort,
        insertDate: new Date(),
      });
    });
  });

  describe(`Remove proxy`, () => {
    let inputId: string;
    let outputProxyDownstreamRunner1: RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyDownstreamModel]>;
    let outputProxyUpstreamRunner1: RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>;

    beforeEach(() => {
      inputId = '11111111-1111-1111-1111-777777777777';

      outputProxyDownstreamRunner1 = new RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyDownstreamModel]>({
        id: '11111111-1111-1111-1111-555555555555',
        serial: 'proxy-proxyDownstream-serial',
        name: 'proxy-downstream-name',
        service: RunnerServiceEnum.ENVOY,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketUri: '10.10.10.1',
        socketPort: 10001,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputProxyDownstreamRunner1.label = [
        {
          $namespace: MystIdentityModel.name,
          id: '11111111-1111-1111-1111-222222222222',
        },
        {
          $namespace: VpnProviderModel.name,
          id: '11111111-1111-1111-1111-444444444444',
        },
        {
          $namespace: ProxyDownstreamModel.name,
          id: '11111111-1111-1111-1111-666666666666',
        },
      ];

      outputProxyUpstreamRunner1 = new RunnerModel<[MystIdentityModel, VpnProviderModel, ProxyUpstreamModel]>({
        id: inputId,
        serial: 'proxy-upstream-serial',
        name: 'proxy-upstream-name',
        service: RunnerServiceEnum.SOCAT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.TCP,
        socketUri: '10.10.10.2',
        socketPort: 3128,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputProxyUpstreamRunner1.label = [
        {
          $namespace: MystIdentityModel.name,
          id: '11111111-1111-1111-1111-222222222222',
        },
        {
          $namespace: VpnProviderModel.name,
          id: '11111111-1111-1111-1111-444444444444',
        },
        {
          $namespace: ProxyUpstreamModel.name,
          id: '11111111-1111-1111-1111-666666666666',
        },
      ];
    });

    it(`Should error remove proxy when get proxy upstream runner`, async () => {
      dockerRunnerRepository.getAll.mockResolvedValueOnce([new UnknownException()]);

      const [error] = await repository.remove(inputId);

      expect(dockerRunnerRepository.getAll).toHaveBeenCalledTimes(1);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            service: RunnerServiceEnum.SOCAT,
          },
          {
            $opr: 'eq',
            label: {
              $namespace: ProxyUpstreamModel.name,
              id: inputId,
            },
          },
        ]),
      );
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error remove proxy when get proxy downstream runner`, async () => {
      dockerRunnerRepository.getAll
        .mockResolvedValueOnce([null, [outputProxyUpstreamRunner1], 1])
        .mockResolvedValueOnce([new UnknownException()]);

      const [error] = await repository.remove(inputId);

      expect(dockerRunnerRepository.getAll).toHaveBeenCalledTimes(2);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            service: RunnerServiceEnum.SOCAT,
          },
          {
            $opr: 'eq',
            label: {
              $namespace: ProxyUpstreamModel.name,
              id: inputId,
            },
          },
        ]),
      );
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[1][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            service: RunnerServiceEnum.ENVOY,
          },
          {
            $opr: 'eq',
            label: {
              $namespace: VpnProviderModel.name,
              id: outputProxyUpstreamRunner1.label.find((v) => v.$namespace === VpnProviderModel.name).id,
            },
          },
        ]),
      );
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error remove proxy when get remove downstream runner`, async () => {
      dockerRunnerRepository.getAll
        .mockResolvedValueOnce([null, [outputProxyUpstreamRunner1], 1])
        .mockResolvedValueOnce([null, [outputProxyDownstreamRunner1], 1]);
      dockerRunnerRepository.remove.mockResolvedValueOnce([new UnknownException()]);

      const [error] = await repository.remove(inputId);

      expect(dockerRunnerRepository.getAll).toHaveBeenCalledTimes(2);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            service: RunnerServiceEnum.SOCAT,
          },
          {
            $opr: 'eq',
            label: {
              $namespace: ProxyUpstreamModel.name,
              id: inputId,
            },
          },
        ]),
      );
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[1][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            service: RunnerServiceEnum.ENVOY,
          },
          {
            $opr: 'eq',
            label: {
              $namespace: VpnProviderModel.name,
              id: outputProxyUpstreamRunner1.label.find((v) => v.$namespace === VpnProviderModel.name).id,
            },
          },
        ]),
      );
      expect(dockerRunnerRepository.remove).toHaveBeenCalledTimes(1);
      expect(dockerRunnerRepository.remove).toHaveBeenNthCalledWith(1, outputProxyDownstreamRunner1.id);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error remove proxy when get remove upstream runner (not found downstream runner)`, async () => {
      dockerRunnerRepository.getAll
        .mockResolvedValueOnce([null, [outputProxyUpstreamRunner1], 1])
        .mockResolvedValueOnce([null, [], 0]);
      dockerRunnerRepository.remove.mockResolvedValueOnce([new UnknownException()]);

      const [error] = await repository.remove(inputId);

      expect(dockerRunnerRepository.getAll).toHaveBeenCalledTimes(2);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            service: RunnerServiceEnum.SOCAT,
          },
          {
            $opr: 'eq',
            label: {
              $namespace: ProxyUpstreamModel.name,
              id: inputId,
            },
          },
        ]),
      );
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[1][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            service: RunnerServiceEnum.ENVOY,
          },
          {
            $opr: 'eq',
            label: {
              $namespace: VpnProviderModel.name,
              id: outputProxyUpstreamRunner1.label.find((v) => v.$namespace === VpnProviderModel.name).id,
            },
          },
        ]),
      );
      expect(dockerRunnerRepository.remove).toHaveBeenCalledTimes(1);
      expect(dockerRunnerRepository.remove).toHaveBeenNthCalledWith(1, outputProxyUpstreamRunner1.id);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully remove proxy (not found downstream runner)`, async () => {
      dockerRunnerRepository.getAll
        .mockResolvedValueOnce([null, [outputProxyUpstreamRunner1], 1])
        .mockResolvedValueOnce([null, [], 0]);
      dockerRunnerRepository.remove.mockResolvedValueOnce([null, null]);

      const [error, result] = await repository.remove(inputId);

      expect(dockerRunnerRepository.getAll).toHaveBeenCalledTimes(2);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            service: RunnerServiceEnum.SOCAT,
          },
          {
            $opr: 'eq',
            label: {
              $namespace: ProxyUpstreamModel.name,
              id: inputId,
            },
          },
        ]),
      );
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[1][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            service: RunnerServiceEnum.ENVOY,
          },
          {
            $opr: 'eq',
            label: {
              $namespace: VpnProviderModel.name,
              id: outputProxyUpstreamRunner1.label.find((v) => v.$namespace === VpnProviderModel.name).id,
            },
          },
        ]),
      );
      expect(dockerRunnerRepository.remove).toHaveBeenCalledTimes(1);
      expect(dockerRunnerRepository.remove).toHaveBeenNthCalledWith(1, outputProxyUpstreamRunner1.id);
      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it(`Should successfully remove proxy (found downstream runner)`, async () => {
      dockerRunnerRepository.getAll
        .mockResolvedValueOnce([null, [outputProxyUpstreamRunner1], 1])
        .mockResolvedValueOnce([null, [outputProxyDownstreamRunner1], 1]);
      dockerRunnerRepository.remove
        .mockResolvedValueOnce([null, null])
        .mockResolvedValueOnce([null, null]);

      const [error, result] = await repository.remove(inputId);

      expect(dockerRunnerRepository.getAll).toHaveBeenCalledTimes(2);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            service: RunnerServiceEnum.SOCAT,
          },
          {
            $opr: 'eq',
            label: {
              $namespace: ProxyUpstreamModel.name,
              id: inputId,
            },
          },
        ]),
      );
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[1][0]).getConditionList()).toEqual(
        expect.arrayContaining<FilterInstanceType<RunnerModel> & { $opr: FilterOperationType }>([
          {
            $opr: 'eq',
            service: RunnerServiceEnum.ENVOY,
          },
          {
            $opr: 'eq',
            label: {
              $namespace: VpnProviderModel.name,
              id: outputProxyUpstreamRunner1.label.find((v) => v.$namespace === VpnProviderModel.name).id,
            },
          },
        ]),
      );
      expect(dockerRunnerRepository.remove).toHaveBeenCalledTimes(2);
      expect(dockerRunnerRepository.remove).toHaveBeenNthCalledWith(1, outputProxyDownstreamRunner1.id);
      expect(dockerRunnerRepository.remove).toHaveBeenNthCalledWith(2, outputProxyUpstreamRunner1.id);
      expect(error).toBeNull();
      expect(result).toBeNull();
    });
  });
});
