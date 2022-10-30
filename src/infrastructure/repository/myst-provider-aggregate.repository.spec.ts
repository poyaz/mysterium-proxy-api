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
import {defaultModelFactory} from '@src-core/model/defaultModel';
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
        id: identifierMock.generateId(),
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
          id: identifierMock.generateId(),
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
        id: identifierMock.generateId(),
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
          id: identifierMock.generateId(),
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
        id: identifierMock.generateId(),
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
          id: identifierMock.generateId(),
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
      outputVpnProviderResultData1.runner = outputRunnerMystData1;
      outputVpnProviderResultData1.providerStatus = VpnProviderStatusEnum.ONLINE;
      outputVpnProviderResultData1.isRegister = true;
      outputVpnProviderResultData2 = outputVpnProviderData2.clone();
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
    let outputRunnerMystData1: RunnerModel<VpnProviderModel>;

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

      outputRunnerMystData1 = new RunnerModel({
        id: '44444444-4444-4444-4444-444444444444',
        serial: 'myst1 runner serial',
        name: 'myst1 runner name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        label: <RunnerObjectLabel<VpnProviderModel>>{
          $namespace: VpnProviderModel.name,
          id: outputVpnProviderData.id,
          providerIdentity: outputVpnProviderData.providerIdentity,
        },
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
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

    it(`Should error get vpn info by id for aggregation when fail on on get all data from runner`, async () => {
      mystProviderApiRepository.getById.mockResolvedValue([null, outputVpnProviderData]);
      dockerRunnerRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.getById(inputRunnerModel, inputId);

      expect(mystProviderApiRepository.getById).toHaveBeenCalled();
      expect(mystProviderApiRepository.getById).toBeCalledWith(inputRunnerModel, inputId);
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect([
        (<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('status'),
        (<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service'),
        (<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label'),
      ]).toEqual(expect.arrayContaining([
        {
          $opr: 'eq',
          status: RunnerStatusEnum.RUNNING,
        },
        {
          $opr: 'eq',
          service: RunnerServiceEnum.MYST,
        },
        {
          $opr: 'eq',
          label: {
            $namespace: VpnProviderModel.name,
            id: outputVpnProviderData.id,
            providerIdentity: outputVpnProviderData.providerIdentity,
          },
        },
      ]));
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get vpn info by id for aggregation and 'isRegister' false because not found any runner`, async () => {
      mystProviderApiRepository.getById.mockResolvedValue([null, outputVpnProviderData]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result] = await repository.getById(inputRunnerModel, inputId);

      expect(mystProviderApiRepository.getById).toHaveBeenCalled();
      expect(mystProviderApiRepository.getById).toBeCalledWith(inputRunnerModel, inputId);
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect([
        (<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('status'),
        (<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service'),
        (<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label'),
      ]).toEqual(expect.arrayContaining([
        {
          $opr: 'eq',
          status: RunnerStatusEnum.RUNNING,
        },
        {
          $opr: 'eq',
          service: RunnerServiceEnum.MYST,
        },
        {
          $opr: 'eq',
          label: {
            $namespace: VpnProviderModel.name,
            id: outputVpnProviderData.id,
            providerIdentity: outputVpnProviderData.providerIdentity,
          },
        },
      ]));
      expect(error).toBeNull();
      expect(result.isRegister).toEqual(false);
    });

    it(`Should successfully get vpn info by id for aggregation and 'isRegister' true`, async () => {
      mystProviderApiRepository.getById.mockResolvedValue([null, outputVpnProviderData]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [outputRunnerMystData1], 1]);

      const [error, result] = await repository.getById(inputRunnerModel, inputId);

      expect(mystProviderApiRepository.getById).toHaveBeenCalled();
      expect(mystProviderApiRepository.getById).toBeCalledWith(inputRunnerModel, inputId);
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect([
        (<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('status'),
        (<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service'),
        (<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label'),
      ]).toEqual(expect.arrayContaining([
        {
          $opr: 'eq',
          status: RunnerStatusEnum.RUNNING,
        },
        {
          $opr: 'eq',
          service: RunnerServiceEnum.MYST,
        },
        {
          $opr: 'eq',
          label: {
            $namespace: VpnProviderModel.name,
            id: outputVpnProviderData.id,
            providerIdentity: outputVpnProviderData.providerIdentity,
          },
        },
      ]));
      expect(error).toBeNull();
      expect(result).toMatchObject(<VpnProviderModel>{
        id: outputVpnProviderData.id,
        runner: outputRunnerMystData1,
        isRegister: true,
      });
    });
  });
});
