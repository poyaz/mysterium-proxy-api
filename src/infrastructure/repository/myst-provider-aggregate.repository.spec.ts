import {MystProviderAggregateRepository} from './myst-provider-aggregate.repository';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {Test, TestingModule} from '@nestjs/testing';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {IRunnerRepositoryInterface} from '@src-core/interface/i-runner-repository.interface';
import {
  VpnProviderIpTypeEnum,
  VpnProviderModel,
  VpnProviderName,
  VpnProviderStatusEnum,
  VpnServiceTypeEnum,
} from '@src-core/model/vpn-provider.model';
import {FilterModel} from '@src-core/model/filter.model';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {
  RunnerExecEnum,
  RunnerModel,
  RunnerObjectLabel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {IMystApiRepositoryInterface} from '@src-core/interface/i-myst-api-repository.interface';
import {DefaultModel, defaultModelFactory, defaultModelType} from '@src-core/model/defaultModel';
import {filterAndSortVpnProvider} from '@src-infrastructure/utility/filterAndSortVpnProvider';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';

jest.mock('@src-infrastructure/utility/filterAndSortVpnProvider');

describe('MystProviderAggregateRepository', () => {
  let repository: MystProviderAggregateRepository;
  let dockerRunnerRepository: MockProxy<IRunnerRepositoryInterface>;
  let mystProviderApiRepository: MockProxy<IMystApiRepositoryInterface>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    dockerRunnerRepository = mock<IRunnerRepositoryInterface>();
    mystProviderApiRepository = mock<IMystApiRepositoryInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProviderTokenEnum.DOCKER_RUNNER_REPOSITORY,
          useValue: dockerRunnerRepository,
        },
        {
          provide: ProviderTokenEnum.MYST_PROVIDER_API_REPOSITORY,
          useValue: mystProviderApiRepository,
        },
        {
          provide: MystProviderAggregateRepository,
          inject: [ProviderTokenEnum.DOCKER_RUNNER_REPOSITORY, ProviderTokenEnum.MYST_PROVIDER_API_REPOSITORY],
          useFactory: (
            dockerRunnerRepository: MockProxy<IRunnerRepositoryInterface>,
            mystProviderApiRepository: IMystApiRepositoryInterface,
          ) => new MystProviderAggregateRepository(dockerRunnerRepository, mystProviderApiRepository),
        },
      ],
    }).compile();

    repository = module.get<MystProviderAggregateRepository>(MystProviderAggregateRepository);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe(`Get all vpn and fill aggregate data`, () => {
    let inputRunnerModel: RunnerModel;
    let inputPaginationFilter: FilterModel<VpnProviderModel>;
    let inputCountryFilter: FilterModel<VpnProviderModel>;
    let inputIsRegisterFilter: FilterModel<VpnProviderModel>;
    let outputVpnProviderData1: VpnProviderModel;
    let outputVpnProviderData2: VpnProviderModel;
    let outputVpnProviderData3: VpnProviderModel;
    let outputRunnerMystData1: RunnerModel<MystIdentityModel>;
    let outputRunnerMystConnectData1: RunnerModel<[MystIdentityModel, VpnProviderModel]>;
    let outputRunnerMystData2: RunnerModel<MystIdentityModel>;
    let outputRunnerMystConnectData2: RunnerModel<[MystIdentityModel, VpnProviderModel]>;
    let outputRunnerMystNotMatchData3: RunnerModel<MystIdentityModel>;
    let outputRunnerMystConnectNotMatchData3: RunnerModel<[MystIdentityModel, VpnProviderModel]>;
    let outputVpnProviderResultData1: VpnProviderModel;
    let outputVpnProviderResultData2: VpnProviderModel;
    let outputVpnProviderResultData3: VpnProviderModel;

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

      inputPaginationFilter = new FilterModel<VpnProviderModel>({page: 2, limit: 1});

      inputCountryFilter = new FilterModel<VpnProviderModel>();
      inputCountryFilter.addCondition({$opr: 'eq', country: 'GB'});

      inputIsRegisterFilter = new FilterModel<VpnProviderModel>({page: 2, limit: 1});
      inputIsRegisterFilter.addCondition({$opr: 'eq', isRegister: true});

      outputVpnProviderData1 = new VpnProviderModel({
        id: '11111111-1111-1111-1111-111111111111',
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'providerIdentity1',
        providerIpType: VpnProviderIpTypeEnum.HOSTING,
        country: 'GB',
        isRegister: false,
        insertDate: new Date(),
      });
      outputVpnProviderData2 = new VpnProviderModel({
        id: '22222222-2222-2222-2222-222222222222',
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'providerIdentity2',
        providerIpType: VpnProviderIpTypeEnum.HOSTING,
        country: 'GB',
        isRegister: false,
        insertDate: new Date(),
      });
      outputVpnProviderData3 = new VpnProviderModel({
        id: '33333333-3333-3333-3333-333333333333',
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'providerIdentity3',
        providerIpType: VpnProviderIpTypeEnum.HOSTING,
        country: 'GB',
        isRegister: false,
        insertDate: new Date(),
      });

      outputRunnerMystData1 = new RunnerModel<MystIdentityModel>({
        id: '44444444-4444-4444-4444-444444444444',
        serial: 'myst1 runner serial',
        name: 'myst1 runner name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputRunnerMystData1.label = {
        $namespace: MystIdentityModel.name,
        id: '11111111-1111-1111-1111-111111111111',
        identity: 'identity1',
      };
      outputRunnerMystConnectData1 = new RunnerModel<[MystIdentityModel, VpnProviderModel]>({
        id: '55555555-5555-5555-5555-555555555555',
        serial: 'myst1 runner serial',
        name: 'myst1 runner name',
        service: RunnerServiceEnum.MYST_CONNECT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.NONE,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputRunnerMystConnectData1.label = [
        {
          $namespace: MystIdentityModel.name,
          id: '11111111-1111-1111-1111-111111111111',
          identity: 'identity1',
        },
        {
          $namespace: VpnProviderModel.name,
          id: outputVpnProviderData1.id,
          userIdentity: 'identity1',
          providerIdentity: outputVpnProviderData1.providerIdentity,
        },
      ];

      outputRunnerMystData2 = new RunnerModel<MystIdentityModel>({
        id: '66666666-6666-6666-6666-666666666666',
        serial: 'myst-connect2 runner serial',
        name: 'myst-connect2 runner name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        label: <RunnerObjectLabel<VpnProviderModel>>{
          $namespace: VpnProviderModel.name,
          id: outputVpnProviderData2.id,
          providerIdentity: outputVpnProviderData2.providerIdentity,
        },
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputRunnerMystData2.label = {
        $namespace: MystIdentityModel.name,
        id: '22222222-2222-2222-2222-222222222222',
        identity: 'identity2',
      };
      outputRunnerMystConnectData2 = new RunnerModel<[MystIdentityModel, VpnProviderModel]>({
        id: '77777777-7777-7777-7777-777777777777',
        serial: 'myst-connect2 runner serial',
        name: 'myst-connect2 runner name',
        service: RunnerServiceEnum.MYST_CONNECT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.NONE,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputRunnerMystConnectData2.label = [
        {
          $namespace: MystIdentityModel.name,
          id: '22222222-2222-2222-2222-222222222222',
          identity: 'identity2',
        },
        {
          $namespace: VpnProviderModel.name,
          id: outputVpnProviderData2.id,
          userIdentity: 'identity2',
          providerIdentity: outputVpnProviderData2.providerIdentity,
        },
      ];

      outputRunnerMystNotMatchData3 = new RunnerModel<MystIdentityModel>({
        id: '88888888-8888-8888-8888-888888888888',
        serial: 'myst3 runner serial',
        name: 'myst3 runner name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputRunnerMystNotMatchData3.label = {
        $namespace: MystIdentityModel.name,
        id: '33333333-3333-3333-3333-333333333333',
        identity: 'identity3',
      };
      outputRunnerMystConnectNotMatchData3 = new RunnerModel<[MystIdentityModel, VpnProviderModel]>({
        id: '99999999-9999-9999-9999-999999999999',
        serial: 'myst-connect3 runner serial',
        name: 'myst-connect3 runner name',
        service: RunnerServiceEnum.MYST_CONNECT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.NONE,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputRunnerMystConnectNotMatchData3.label = [
        {
          $namespace: MystIdentityModel.name,
          id: '33333333-3333-3333-3333-333333333333',
          identity: 'identity3',
        },
        {
          $namespace: VpnProviderModel.name,
          id: 'not-match-id',
          userIdentity: 'identity3',
          providerIdentity: 'not-match-provider',
        },
      ];

      outputVpnProviderResultData1 = outputVpnProviderData1.clone();
      outputVpnProviderResultData1.userIdentity = outputRunnerMystData1.label.identity;
      outputVpnProviderResultData1.runner = outputRunnerMystData1;
      outputVpnProviderResultData1.providerStatus = VpnProviderStatusEnum.ONLINE;
      outputVpnProviderResultData1.isRegister = true;
      outputVpnProviderResultData2 = outputVpnProviderData2.clone();
      outputVpnProviderResultData2.userIdentity = outputRunnerMystData2.label.identity;
      outputVpnProviderResultData2.runner = outputRunnerMystData2;
      outputVpnProviderResultData2.providerStatus = VpnProviderStatusEnum.ONLINE;
      outputVpnProviderResultData2.isRegister = true;
      outputVpnProviderResultData3 = outputVpnProviderData3.clone();
    });

    it(`Should error get all vpn for aggregation when fail on get all data from vpn repository`, async () => {
      mystProviderApiRepository.getAll.mockResolvedValue([new UnknownException()]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error] = await repository.getAll(inputRunnerModel);

      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect(mystProviderApiRepository.getAll).toBeCalledWith(inputRunnerModel, undefined);
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).skipPagination).toEqual(true);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(0);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all vpn for aggregation when fail on get all data from runner`, async () => {
      mystProviderApiRepository.getAll.mockResolvedValue([null, [], 0]);
      dockerRunnerRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.getAll(inputRunnerModel);

      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect(mystProviderApiRepository.getAll).toBeCalledWith(inputRunnerModel, undefined);
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).skipPagination).toEqual(true);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(0);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get all vpn for aggregation and return empty records because not found any vpn data`, async () => {
      mystProviderApiRepository.getAll.mockResolvedValue([null, [], 0]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result, totalCount] = await repository.getAll(inputRunnerModel);

      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect(mystProviderApiRepository.getAll).toBeCalledWith(inputRunnerModel, undefined);
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).skipPagination).toEqual(true);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(0);
      expect(error).toBeNull();
      expect(result.length).toEqual(0);
      expect(totalCount).toEqual(0);
    });

    it(`Should successfully get all vpn for aggregation and 'isRegister' false because not found any runner`, async () => {
      mystProviderApiRepository.getAll.mockResolvedValue([null, [outputVpnProviderData1, outputVpnProviderData2, outputVpnProviderData3], 3]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result, totalCount] = await repository.getAll(inputRunnerModel);

      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect(mystProviderApiRepository.getAll).toBeCalledWith(inputRunnerModel, undefined);
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).skipPagination).toEqual(true);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(0);
      expect(error).toBeNull();
      expect(result.length).toEqual(3);
      expect(result[0].isRegister).toEqual(false);
      expect(result[1].isRegister).toEqual(false);
      expect(result[2].isRegister).toEqual(false);
      expect(totalCount).toEqual(3);
    });

    it(`Should successfully get all vpn for aggregation with pagination`, async () => {
      mystProviderApiRepository.getAll.mockResolvedValue([
        null,
        [outputVpnProviderData1, outputVpnProviderData2, outputVpnProviderData3],
        3,
      ]);
      dockerRunnerRepository.getAll.mockResolvedValue([
        null, [
          outputRunnerMystData1,
          outputRunnerMystConnectData1,
          outputRunnerMystData2,
          outputRunnerMystConnectData2,
          outputRunnerMystNotMatchData3,
          outputRunnerMystConnectNotMatchData3,
        ],
        6,
      ]);
      (<jest.Mock>filterAndSortVpnProvider).mockReturnValue([[outputVpnProviderResultData2], 3]);

      const [error, result, totalCount] = await repository.getAll(inputRunnerModel, inputPaginationFilter);

      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect(mystProviderApiRepository.getAll).toBeCalledWith(inputRunnerModel, expect.objectContaining({
        page: 2,
        limit: 1,
      }));
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).skipPagination).toEqual(true);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(0);
      expect(filterAndSortVpnProvider).toHaveBeenCalledWith(
        expect.arrayContaining<VpnProviderModel>([
          outputVpnProviderResultData1,
          outputVpnProviderResultData2,
          outputVpnProviderResultData3,
        ]),
        expect.anything(),
      );
      expect(error).toBeNull();
      expect(result.length).toEqual(1);
      expect(result[0]).toMatchObject(<VpnProviderModel>{
        id: outputVpnProviderData2.id,
        runner: outputRunnerMystData2,
        isRegister: true,
      });
      expect(totalCount).toEqual(3);
    });

    it(`Should successfully get all vpn for aggregation with 'country' filter`, async () => {
      mystProviderApiRepository.getAll.mockResolvedValue([
        null,
        [outputVpnProviderData1, outputVpnProviderData2, outputVpnProviderData3],
        3,
      ]);
      dockerRunnerRepository.getAll.mockResolvedValue([
        null, [
          outputRunnerMystData1,
          outputRunnerMystConnectData1,
          outputRunnerMystData2,
          outputRunnerMystConnectData2,
          outputRunnerMystNotMatchData3,
          outputRunnerMystConnectNotMatchData3,
        ],
        6,
      ]);
      (<jest.Mock>filterAndSortVpnProvider).mockReturnValue([
        [outputVpnProviderResultData1, outputVpnProviderResultData2, outputVpnProviderResultData3],
        3,
      ]);

      const [error, result, totalCount] = await repository.getAll(inputRunnerModel, inputCountryFilter);

      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<VpnProviderModel>>mystProviderApiRepository.getAll.mock.calls[0][1]).getCondition('country')).toMatchObject({
        $opr: 'eq',
        country: 'GB',
      });
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).skipPagination).toEqual(true);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(0);
      expect(filterAndSortVpnProvider).toHaveBeenCalledWith(
        expect.arrayContaining<VpnProviderModel>([
          outputVpnProviderResultData1,
          outputVpnProviderResultData2,
          outputVpnProviderResultData3,
        ]),
        expect.anything(),
      );
      expect(error).toBeNull();
      expect(result.length).toEqual(3);
      expect(result[0]).toMatchObject(<VpnProviderModel>{
        id: outputVpnProviderData1.id,
        runner: outputRunnerMystData1,
        isRegister: true,
      });
      expect(result[1]).toMatchObject(<VpnProviderModel>{
        id: outputVpnProviderData2.id,
        runner: outputRunnerMystData2,
        isRegister: true,
      });
      expect(result[2]).toMatchObject(<VpnProviderModel>{
        id: outputVpnProviderData3.id,
        isRegister: false,
      });
      expect(totalCount).toEqual(3);
    });

    it(`Should successfully get all vpn for aggregation with pagination and 'isRegister' filter`, async () => {
      mystProviderApiRepository.getAll.mockResolvedValue([
        null,
        [outputVpnProviderData1, outputVpnProviderData2, outputVpnProviderData3],
        3,
      ]);
      dockerRunnerRepository.getAll.mockResolvedValue([
        null, [
          outputRunnerMystData1,
          outputRunnerMystConnectData1,
          outputRunnerMystData2,
          outputRunnerMystConnectData2,
          outputRunnerMystNotMatchData3,
          outputRunnerMystConnectNotMatchData3,
        ],
        6,
      ]);
      (<jest.Mock>filterAndSortVpnProvider).mockReturnValue([[outputVpnProviderResultData2], 2]);

      const [error, result, totalCount] = await repository.getAll(inputRunnerModel, inputIsRegisterFilter);

      expect(mystProviderApiRepository.getAll).toHaveBeenCalled();
      expect(mystProviderApiRepository.getAll).toBeCalledWith(inputRunnerModel, expect.objectContaining({
        page: 2,
        limit: 1,
      }));
      expect((<FilterModel<VpnProviderModel>>mystProviderApiRepository.getAll.mock.calls[0][1]).getCondition('isRegister')).toMatchObject({
        $opr: 'eq',
        isRegister: true,
      });
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).skipPagination).toEqual(true);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(0);
      expect(filterAndSortVpnProvider).toHaveBeenCalledWith(
        expect.arrayContaining<VpnProviderModel>([
          outputVpnProviderResultData1,
          outputVpnProviderResultData2,
          outputVpnProviderResultData3,
        ]),
        expect.anything(),
      );
      expect(error).toBeNull();
      expect(result.length).toEqual(1);
      expect(result[0]).toMatchObject(<VpnProviderModel>{
        id: outputVpnProviderData2.id,
        runner: outputRunnerMystData2,
        isRegister: true,
      });
      expect(totalCount).toEqual(2);
    });
  });

  describe(`Get by vpn info by id and fill aggregate data`, () => {
    let inputRunnerModel: RunnerModel;
    let inputId: string;
    let outputVpnProviderData: VpnProviderModel;
    let outputRunnerMystData1: RunnerModel<MystIdentityModel>;
    let outputRunnerMystConnectData1: RunnerModel<[MystIdentityModel, VpnProviderModel]>;

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

      outputVpnProviderData = new VpnProviderModel({
        id: '11111111-1111-1111-1111-111111111111',
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'providerIdentity1',
        providerIpType: VpnProviderIpTypeEnum.HOSTING,
        country: 'GB',
        isRegister: false,
        insertDate: new Date(),
      });

      outputRunnerMystData1 = new RunnerModel<MystIdentityModel>({
        id: '44444444-4444-4444-4444-444444444444',
        serial: 'myst1 runner serial',
        name: 'myst1 runner name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputRunnerMystData1.label = {
        $namespace: MystIdentityModel.name,
        id: '11111111-1111-1111-1111-111111111111',
        identity: 'identity1',
      };
      outputRunnerMystConnectData1 = new RunnerModel<[MystIdentityModel, VpnProviderModel]>({
        id: '55555555-5555-5555-5555-555555555555',
        serial: 'myst1 runner serial',
        name: 'myst1 runner name',
        service: RunnerServiceEnum.MYST_CONNECT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.NONE,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputRunnerMystConnectData1.label = [
        {
          $namespace: MystIdentityModel.name,
          id: '11111111-1111-1111-1111-111111111111',
          identity: 'identity1',
        },
        {
          $namespace: VpnProviderModel.name,
          id: outputVpnProviderData.id,
          userIdentity: 'identity1',
          providerIdentity: outputVpnProviderData.providerIdentity,
        },
      ];
    });

    it(`Should error get vpn info by id for aggregation when fail on get by id data from vpn repository`, async () => {
      mystProviderApiRepository.getById.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.getById(inputRunnerModel, inputId);

      expect(mystProviderApiRepository.getById).toHaveBeenCalled();
      expect(mystProviderApiRepository.getById).toBeCalledWith(inputRunnerModel, inputId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get vpn info by id for aggregation and return empty data because not found any vpn by id`, async () => {
      mystProviderApiRepository.getById.mockResolvedValue([null, null]);

      const [error, result] = await repository.getById(inputRunnerModel, inputId);

      expect(mystProviderApiRepository.getById).toHaveBeenCalled();
      expect(mystProviderApiRepository.getById).toBeCalledWith(inputRunnerModel, inputId);
      expect(dockerRunnerRepository.getAll).toBeCalledTimes(0);
      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it(`Should error get vpn info by id for aggregation when fail on on get myst-connect data from runner`, async () => {
      mystProviderApiRepository.getById.mockResolvedValue([null, outputVpnProviderData]);
      dockerRunnerRepository.getAll.mockResolvedValueOnce([new UnknownException()]);

      const [error] = await repository.getById(inputRunnerModel, inputId);

      expect(mystProviderApiRepository.getById).toHaveBeenCalled();
      expect(mystProviderApiRepository.getById).toBeCalledWith(inputRunnerModel, inputId);
      expect(dockerRunnerRepository.getAll).toHaveBeenCalledTimes(1);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(2);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST_CONNECT,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toEqual({
        $opr: 'eq',
        label: {
          $namespace: VpnProviderModel.name,
          id: outputVpnProviderData.id,
        },
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get vpn info by id for aggregation and 'isRegister' false because not found any myst-connect`, async () => {
      mystProviderApiRepository.getById.mockResolvedValue([null, outputVpnProviderData]);
      dockerRunnerRepository.getAll.mockResolvedValueOnce([null, [], 0]);

      const [error, result] = await repository.getById(inputRunnerModel, inputId);

      expect(mystProviderApiRepository.getById).toHaveBeenCalled();
      expect(mystProviderApiRepository.getById).toBeCalledWith(inputRunnerModel, inputId);
      expect(dockerRunnerRepository.getAll).toHaveBeenCalledTimes(1);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(2);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST_CONNECT,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toEqual({
        $opr: 'eq',
        label: {
          $namespace: VpnProviderModel.name,
          id: outputVpnProviderData.id,
        },
      });
      expect(error).toBeNull();
      expect(result.isRegister).toEqual(false);
    });

    it(`Should error get vpn info by id for aggregation when fail on on get myst data from runner`, async () => {
      mystProviderApiRepository.getById.mockResolvedValue([null, outputVpnProviderData]);
      dockerRunnerRepository.getAll
        .mockResolvedValueOnce([null, [outputRunnerMystConnectData1], 1])
        .mockResolvedValueOnce([new UnknownException()]);

      const [error] = await repository.getById(inputRunnerModel, inputId);

      expect(mystProviderApiRepository.getById).toHaveBeenCalled();
      expect(mystProviderApiRepository.getById).toBeCalledWith(inputRunnerModel, inputId);
      expect(dockerRunnerRepository.getAll).toHaveBeenCalledTimes(2);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(2);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST_CONNECT,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toEqual({
        $opr: 'eq',
        label: {
          $namespace: VpnProviderModel.name,
          id: outputVpnProviderData.id,
        },
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[1][0]).getLengthOfCondition()).toEqual(2);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[1][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[1][0]).getCondition('label')).toEqual({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          id: (<MystIdentityModel><any>outputRunnerMystConnectData1.label.find((v) => v.$namespace === MystIdentityModel.name)).id,
        },
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get vpn info by id for aggregation and 'isRegister' true`, async () => {
      mystProviderApiRepository.getById.mockResolvedValue([null, outputVpnProviderData]);
      dockerRunnerRepository.getAll
        .mockResolvedValueOnce([null, [outputRunnerMystConnectData1], 1])
        .mockResolvedValueOnce([null, [outputRunnerMystData1], 1]);

      const [error, result] = await repository.getById(inputRunnerModel, inputId);

      expect(mystProviderApiRepository.getById).toHaveBeenCalled();
      expect(mystProviderApiRepository.getById).toBeCalledWith(inputRunnerModel, inputId);
      expect(dockerRunnerRepository.getAll).toHaveBeenCalledTimes(2);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(2);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST_CONNECT,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toEqual({
        $opr: 'eq',
        label: {
          $namespace: VpnProviderModel.name,
          id: outputVpnProviderData.id,
        },
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[1][0]).getLengthOfCondition()).toEqual(2);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[1][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[1][0]).getCondition('label')).toEqual({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          id: (<MystIdentityModel><any>outputRunnerMystConnectData1.label.find((v) => v.$namespace === MystIdentityModel.name)).id,
        },
      });
      expect(error).toBeNull();
      expect(result).toMatchObject(<VpnProviderModel>{
        id: outputVpnProviderData.id,
        userIdentity: outputRunnerMystData1.label.identity,
        providerStatus: VpnProviderStatusEnum.ONLINE,
        runner: outputRunnerMystData1,
        isRegister: true,
      });
    });
  });

  describe(`Connect to vpn`, () => {
    let inputRunner: RunnerModel<MystIdentityModel>;
    let inputVpnProvider: VpnProviderModel;
    let outputVpnProviderConnectData: VpnProviderModel;
    let outputMystConnectData: RunnerModel<[MystIdentityModel, VpnProviderModel]>;

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
        insertDate: new Date(),
      });

      outputVpnProviderConnectData = new VpnProviderModel({
        id: identifierMock.generateId(),
        userIdentity: 'identity1',
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'providerIdentity1',
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        ip: '45.84.121.22',
        country: 'GB',
        isRegister: true,
        providerStatus: VpnProviderStatusEnum.ONLINE,
        insertDate: new Date(),
      });

      outputMystConnectData = new RunnerModel<[MystIdentityModel, VpnProviderModel]>({
        id: identifierMock.generateId(),
        serial: 'myst-connect-serial',
        name: 'myst-connect-name',
        service: RunnerServiceEnum.MYST_CONNECT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.NONE,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputMystConnectData.label = [
        {
          $namespace: MystIdentityModel.name,
          id: identifierMock.generateId(),
          identity: 'identity1',
        },
        {
          $namespace: VpnProviderModel.name,
          id: inputVpnProvider.id,
          userIdentity: inputVpnProvider.userIdentity,
          providerIdentity: inputVpnProvider.providerIdentity,
        },
      ];
    });

    it(`Should error connect to vpn when execute connect api`, async () => {
      mystProviderApiRepository.connect.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.connect(inputRunner, inputVpnProvider);

      expect(mystProviderApiRepository.connect).toHaveBeenCalled();
      expect(mystProviderApiRepository.connect).toHaveBeenCalledWith(inputRunner, inputVpnProvider);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error connect to vpn when create myst-connect runner`, async () => {
      mystProviderApiRepository.connect.mockResolvedValue([null, outputVpnProviderConnectData]);
      dockerRunnerRepository.create.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.connect(inputRunner, inputVpnProvider);

      expect(mystProviderApiRepository.connect).toHaveBeenCalled();
      expect(mystProviderApiRepository.connect).toHaveBeenCalledWith(inputRunner, inputVpnProvider);
      expect(dockerRunnerRepository.create).toHaveBeenCalled();
      expect((<DefaultModel<RunnerModel>><any>dockerRunnerRepository.create.mock.calls[0][0]).IS_DEFAULT_MODEL).toEqual(true);
      expect((<DefaultModel<RunnerModel>><any>dockerRunnerRepository.create.mock.calls[0][0]).getDefaultProperties()).toEqual(
        expect.arrayContaining<keyof RunnerModel>(['id', 'serial', 'status', 'insertDate']),
      );
      expect(dockerRunnerRepository.create.mock.calls[0][0]).toEqual<defaultModelType<RunnerModel<[MystIdentityModel, VpnProviderModel]>> | { _defaultProperties: Array<any> }>({
        id: 'default-id',
        serial: 'default-serial',
        name: `${RunnerServiceEnum.MYST_CONNECT}-${inputVpnProvider.providerIdentity}`,
        service: RunnerServiceEnum.MYST_CONNECT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.NONE,
        label: [
          {
            $namespace: MystIdentityModel.name,
            id: inputRunner.label.id,
            identity: inputVpnProvider.userIdentity,
          },
          {
            $namespace: VpnProviderModel.name,
            id: inputVpnProvider.id,
            userIdentity: inputVpnProvider.userIdentity,
            providerIdentity: inputVpnProvider.providerIdentity,
          },
        ],
        status: RunnerStatusEnum.CREATING,
        insertDate: new Date(),
        IS_DEFAULT_MODEL: true,
        _defaultProperties: expect.anything(),
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully connect to vpn`, async () => {
      mystProviderApiRepository.connect.mockResolvedValue([null, outputVpnProviderConnectData]);
      dockerRunnerRepository.create.mockResolvedValue([null, outputMystConnectData]);

      const [error, result] = await repository.connect(inputRunner, inputVpnProvider);

      expect(mystProviderApiRepository.connect).toHaveBeenCalled();
      expect(mystProviderApiRepository.connect).toHaveBeenCalledWith(inputRunner, inputVpnProvider);
      expect(dockerRunnerRepository.create).toHaveBeenCalled();
      expect((<DefaultModel<RunnerModel>><any>dockerRunnerRepository.create.mock.calls[0][0]).IS_DEFAULT_MODEL).toEqual(true);
      expect((<DefaultModel<RunnerModel>><any>dockerRunnerRepository.create.mock.calls[0][0]).getDefaultProperties()).toEqual(
        expect.arrayContaining<keyof RunnerModel>(['id', 'serial', 'status', 'insertDate']),
      );
      expect(dockerRunnerRepository.create.mock.calls[0][0]).toEqual<defaultModelType<RunnerModel<[MystIdentityModel, VpnProviderModel]>> | { _defaultProperties: Array<any> }>({
        id: 'default-id',
        serial: 'default-serial',
        name: `${RunnerServiceEnum.MYST_CONNECT}-${inputVpnProvider.providerIdentity}`,
        service: RunnerServiceEnum.MYST_CONNECT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.NONE,
        label: [
          {
            $namespace: MystIdentityModel.name,
            id: inputRunner.label.id,
            identity: inputVpnProvider.userIdentity,
          },
          {
            $namespace: VpnProviderModel.name,
            id: inputVpnProvider.id,
            userIdentity: inputVpnProvider.userIdentity,
            providerIdentity: inputVpnProvider.providerIdentity,
          },
        ],
        status: RunnerStatusEnum.CREATING,
        insertDate: new Date(),
        IS_DEFAULT_MODEL: true,
        _defaultProperties: expect.anything(),
      });
      expect(error).toBeNull();
      expect(result).toEqual<Omit<VpnProviderModel, 'clone'>>({
        id: inputVpnProvider.id,
        userIdentity: inputVpnProvider.userIdentity,
        serviceType: inputVpnProvider.serviceType,
        providerName: inputVpnProvider.providerName,
        providerIdentity: inputVpnProvider.providerIdentity,
        providerIpType: inputVpnProvider.providerIpType,
        ip: outputVpnProviderConnectData.ip,
        country: inputVpnProvider.country,
        runner: inputRunner,
        isRegister: true,
        providerStatus: VpnProviderStatusEnum.ONLINE,
        insertDate: inputVpnProvider.insertDate,
      });
    });
  });

  describe(`Disconnect from vpn`, () => {
    let inputRunner: RunnerModel<MystIdentityModel>;
    let inputForce: boolean;
    let outputRunnerMystConnectData1: RunnerModel<[MystIdentityModel, VpnProviderModel]>;
    let outputVpnProviderData: VpnProviderModel;

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

      outputVpnProviderData = new VpnProviderModel({
        id: '11111111-1111-1111-1111-111111111111',
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'providerIdentity1',
        providerIpType: VpnProviderIpTypeEnum.HOSTING,
        country: 'GB',
        isRegister: false,
        insertDate: new Date(),
      });

      outputRunnerMystConnectData1 = new RunnerModel<[MystIdentityModel, VpnProviderModel]>({
        id: '55555555-5555-5555-5555-555555555555',
        serial: 'myst-connect1 runner serial',
        name: 'myst-connect1 runner name',
        service: RunnerServiceEnum.MYST_CONNECT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.NONE,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputRunnerMystConnectData1.label = [
        {
          $namespace: MystIdentityModel.name,
          id: identifierMock.generateId(),
          identity: 'identity1',
        },
        {
          $namespace: VpnProviderModel.name,
          id: outputVpnProviderData.id,
          userIdentity: 'identity1',
          providerIdentity: outputVpnProviderData.providerIdentity,
        },
      ];
    });

    it(`Should error disconnect from vpn when get myst-connect runner`, async () => {
      dockerRunnerRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.disconnect(inputRunner);

      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(2);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST_CONNECT,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toEqual({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          id: inputRunner.label.id,
        },
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error disconnect from vpn when disconnect (skip remove runner if not exist)`, async () => {
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);
      mystProviderApiRepository.disconnect.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.disconnect(inputRunner);

      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(2);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST_CONNECT,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toEqual({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          id: inputRunner.label.id,
        },
      });
      expect(mystProviderApiRepository.disconnect).toHaveBeenCalled();
      expect(mystProviderApiRepository.disconnect).toHaveBeenCalledWith(inputRunner, undefined);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error disconnect from vpn when remove myst-connect runner`, async () => {
      dockerRunnerRepository.getAll.mockResolvedValue([null, [outputRunnerMystConnectData1], 1]);
      dockerRunnerRepository.remove.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.disconnect(inputRunner);

      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(2);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST_CONNECT,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toEqual({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          id: inputRunner.label.id,
        },
      });
      expect(dockerRunnerRepository.remove).toHaveBeenCalled();
      expect(dockerRunnerRepository.remove).toHaveBeenCalledWith(outputRunnerMystConnectData1.id);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully disconnect from vpn`, async () => {
      dockerRunnerRepository.getAll.mockResolvedValue([null, [outputRunnerMystConnectData1], 1]);
      dockerRunnerRepository.remove.mockResolvedValue([null, null]);
      mystProviderApiRepository.disconnect.mockResolvedValue([null, null]);

      const [error, result] = await repository.disconnect(inputRunner);

      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(2);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST_CONNECT,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toEqual({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          id: inputRunner.label.id,
        },
      });
      expect(dockerRunnerRepository.remove).toHaveBeenCalled();
      expect(dockerRunnerRepository.remove).toHaveBeenCalledWith(outputRunnerMystConnectData1.id);
      expect(mystProviderApiRepository.disconnect).toHaveBeenCalled();
      expect(mystProviderApiRepository.disconnect).toHaveBeenCalledWith(inputRunner, undefined);
      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it(`Should successfully disconnect from vpn (with force flag)`, async () => {
      dockerRunnerRepository.getAll.mockResolvedValue([null, [outputRunnerMystConnectData1], 1]);
      dockerRunnerRepository.remove.mockResolvedValue([null, null]);
      mystProviderApiRepository.disconnect.mockResolvedValue([null, null]);

      const [error, result] = await repository.disconnect(inputRunner, inputForce);

      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(2);
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toEqual({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST_CONNECT,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toEqual({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          id: inputRunner.label.id,
        },
      });
      expect(dockerRunnerRepository.remove).toHaveBeenCalled();
      expect(dockerRunnerRepository.remove).toHaveBeenCalledWith(outputRunnerMystConnectData1.id);
      expect(mystProviderApiRepository.disconnect).toHaveBeenCalled();
      expect(mystProviderApiRepository.disconnect).toHaveBeenCalledWith(inputRunner, inputForce);
      expect(error).toBeNull();
      expect(result).toBeNull();
    });
  });

  describe(`Register identity`, () => {
    let inputRunner: RunnerModel<MystIdentityModel>;
    let inputUserIdentity: string;

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
    });

    it(`Should error register identity`, async () => {
      mystProviderApiRepository.registerIdentity.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.registerIdentity(inputRunner, inputUserIdentity);

      expect(mystProviderApiRepository.registerIdentity).toHaveBeenCalled();
      expect(mystProviderApiRepository.registerIdentity).toHaveBeenCalledWith(inputRunner, inputUserIdentity);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully register identity`, async () => {
      mystProviderApiRepository.registerIdentity.mockResolvedValue([null, null]);

      const [error, result] = await repository.registerIdentity(inputRunner, inputUserIdentity);

      expect(mystProviderApiRepository.registerIdentity).toHaveBeenCalled();
      expect(mystProviderApiRepository.registerIdentity).toHaveBeenCalledWith(inputRunner, inputUserIdentity);
      expect(error).toBeNull();
      expect(result).toBeNull();
    });
  });

  describe(`Unlock identity`, () => {
    let inputRunner: RunnerModel<MystIdentityModel>;
    let inputMystIdentity: MystIdentityModel;

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
    });

    it(`Should error unlock identity`, async () => {
      mystProviderApiRepository.unlockIdentity.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.unlockIdentity(inputRunner, inputMystIdentity);

      expect(mystProviderApiRepository.unlockIdentity).toHaveBeenCalled();
      expect(mystProviderApiRepository.unlockIdentity).toHaveBeenCalledWith(inputRunner, inputMystIdentity);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully unlock identity`, async () => {
      mystProviderApiRepository.unlockIdentity.mockResolvedValue([null, null]);

      const [error, result] = await repository.unlockIdentity(inputRunner, inputMystIdentity);

      expect(mystProviderApiRepository.unlockIdentity).toHaveBeenCalled();
      expect(mystProviderApiRepository.unlockIdentity).toHaveBeenCalledWith(inputRunner, inputMystIdentity);
      expect(error).toBeNull();
      expect(result).toBeNull();
    });
  });
});
