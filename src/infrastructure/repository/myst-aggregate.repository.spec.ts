import {MystAggregateRepository} from './myst-aggregate.repository';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {Test, TestingModule} from '@nestjs/testing';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {IRunnerRepositoryInterface} from '@src-core/interface/i-runner-repository.interface';
import {
  VpnProviderIpTypeEnum,
  VpnProviderModel,
  VpnProviderName,
  VpnServiceTypeEnum,
} from '@src-core/model/vpn-provider.model';
import {IProxyApiRepositoryInterface} from '@src-core/interface/i-proxy-api-repository.interface';
import {FilterModel} from '@src-core/model/filter.model';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {
  RunnerExecEnum,
  RunnerModel, RunnerObjectLabel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';

describe('MystAggregateRepository', () => {
  let repository: MystAggregateRepository;
  let dockerRunnerRepository: MockProxy<IRunnerRepositoryInterface>;
  let mystApiRepository: MockProxy<IProxyApiRepositoryInterface>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    dockerRunnerRepository = mock<IRunnerRepositoryInterface>();
    mystApiRepository = mock<IProxyApiRepositoryInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProviderTokenEnum.DOCKER_RUNNER_REPOSITORY,
          useValue: dockerRunnerRepository,
        },
        {
          provide: ProviderTokenEnum.MYST_API_REPOSITORY,
          useValue: mystApiRepository,
        },
        {
          provide: MystAggregateRepository,
          inject: [ProviderTokenEnum.DOCKER_RUNNER_REPOSITORY, ProviderTokenEnum.MYST_API_REPOSITORY],
          useFactory: (
            dockerRunnerRepository: MockProxy<IRunnerRepositoryInterface>,
            mystApiRepository: IProxyApiRepositoryInterface,
          ) => new MystAggregateRepository(dockerRunnerRepository, mystApiRepository),
        },
      ],
    }).compile();

    repository = module.get<MystAggregateRepository>(MystAggregateRepository);

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
    let inputPaginationFilter: FilterModel<VpnProviderModel>;
    let inputCountryFilter: FilterModel<VpnProviderModel>;
    let inputIsRegisterFilter: FilterModel<VpnProviderModel>;
    let outputVpnProviderData1: VpnProviderModel;
    let outputVpnProviderData2: VpnProviderModel;
    let outputVpnProviderData3: VpnProviderModel;
    let outputRunnerMystData1: RunnerModel<VpnProviderModel>;
    let outputRunnerMystData2: RunnerModel<VpnProviderModel>;
    let outputRunnerMystNotMatchData3: RunnerModel<VpnProviderModel>;

    beforeEach(() => {
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

      outputRunnerMystData1 = new RunnerModel({
        id: '44444444-4444-4444-4444-444444444444',
        serial: 'myst1 runner serial',
        name: 'myst1 runner name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        label: <RunnerObjectLabel<VpnProviderModel>>{
          $namespace: VpnProviderModel.name,
          id: outputVpnProviderData1.id,
          providerIdentity: outputVpnProviderData1.providerIdentity,
        },
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });

      outputRunnerMystData2 = new RunnerModel({
        id: '66666666-6666-6666-6666-666666666666',
        serial: 'myst2 runner serial',
        name: 'myst2 runner name',
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

      outputRunnerMystNotMatchData3 = new RunnerModel({
        id: '77777777-7777-7777-7777-777777777777',
        serial: 'myst3 runner serial',
        name: 'myst3 runner name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        label: <RunnerObjectLabel<VpnProviderModel>>{
          $namespace: VpnProviderModel.name,
          id: '77777777-7777-7777-7777-777777777777',
          providerIdentity: 'providerIdentity7',
        },
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
    });

    it(`Should error get all vpn for aggregation when fail on get all data from vpn repository`, async () => {
      mystApiRepository.getAll.mockResolvedValue([new UnknownException()]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error] = await repository.getAll();

      expect(mystApiRepository.getAll).toHaveBeenCalled();
      expect(mystApiRepository.getAll).toBeCalledWith(undefined);
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('status')).toMatchObject({
        $opr: 'eq',
        status: RunnerStatusEnum.RUNNING,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all vpn for aggregation when fail on get all data from runner`, async () => {
      mystApiRepository.getAll.mockResolvedValue([null, [], 0]);
      dockerRunnerRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.getAll();

      expect(mystApiRepository.getAll).toHaveBeenCalled();
      expect(mystApiRepository.getAll).toBeCalledWith(undefined);
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('status')).toMatchObject({
        $opr: 'eq',
        status: RunnerStatusEnum.RUNNING,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get all vpn for aggregation and return empty records because not found any vpn data`, async () => {
      mystApiRepository.getAll.mockResolvedValue([null, [], 0]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result, totalCount] = await repository.getAll();

      expect(mystApiRepository.getAll).toHaveBeenCalled();
      expect(mystApiRepository.getAll).toBeCalledWith(undefined);
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('status')).toMatchObject({
        $opr: 'eq',
        status: RunnerStatusEnum.RUNNING,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
      expect(error).toBeNull();
      expect(result.length).toEqual(0);
      expect(totalCount).toEqual(0);
    });

    it(`Should successfully get all vpn for aggregation and 'isRegister' false because not found any runner`, async () => {
      mystApiRepository.getAll.mockResolvedValue([null, [outputVpnProviderData1, outputVpnProviderData2, outputVpnProviderData3], 3]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result, totalCount] = await repository.getAll();

      expect(mystApiRepository.getAll).toHaveBeenCalled();
      expect(mystApiRepository.getAll).toBeCalledWith(undefined);
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('status')).toMatchObject({
        $opr: 'eq',
        status: RunnerStatusEnum.RUNNING,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
      expect(error).toBeNull();
      expect(result.length).toEqual(3);
      expect(result[0].isRegister).toEqual(false);
      expect(result[1].isRegister).toEqual(false);
      expect(result[2].isRegister).toEqual(false);
      expect(totalCount).toEqual(3);
    });

    it(`Should successfully get all vpn for aggregation with pagination`, async () => {
      mystApiRepository.getAll.mockResolvedValue([null, [outputVpnProviderData2], 2]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [outputRunnerMystData1, outputRunnerMystData2, outputRunnerMystNotMatchData3], 3]);

      const [error, result, totalCount] = await repository.getAll(inputPaginationFilter);

      expect(mystApiRepository.getAll).toHaveBeenCalled();
      expect(mystApiRepository.getAll).toBeCalledWith(expect.objectContaining({page: 2, limit: 1}));
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('status')).toMatchObject({
        $opr: 'eq',
        status: RunnerStatusEnum.RUNNING,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
      expect(error).toBeNull();
      expect(result.length).toEqual(1);
      expect(result[0]).toMatchObject(<VpnProviderModel>{
        id: outputVpnProviderData2.id,
        runner: outputRunnerMystData2,
        isRegister: true,
      });
      expect(totalCount).toEqual(2);
    });

    it(`Should successfully get all vpn for aggregation with 'country' filter`, async () => {
      mystApiRepository.getAll.mockResolvedValue([null, [outputVpnProviderData1, outputVpnProviderData2, outputVpnProviderData3], 3]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [outputRunnerMystData1, outputRunnerMystData2, outputRunnerMystNotMatchData3], 3]);

      const [error, result, totalCount] = await repository.getAll(inputCountryFilter);

      expect(mystApiRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<VpnProviderModel>>mystApiRepository.getAll.mock.calls[0][0]).getCondition('country')).toMatchObject({
        $opr: 'eq',
        country: 'GB',
      });
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('status')).toMatchObject({
        $opr: 'eq',
        status: RunnerStatusEnum.RUNNING,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
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
      mystApiRepository.getAll.mockResolvedValue([null, [outputVpnProviderData1, outputVpnProviderData2, outputVpnProviderData3], 3]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [outputRunnerMystData1, outputRunnerMystData2, outputRunnerMystNotMatchData3], 3]);

      const [error, result, totalCount] = await repository.getAll(inputIsRegisterFilter);

      expect(mystApiRepository.getAll).toHaveBeenCalled();
      expect(mystApiRepository.getAll).toBeCalledWith(expect.objectContaining({page: 2, limit: 1}));
      expect((<FilterModel<VpnProviderModel>>mystApiRepository.getAll.mock.calls[0][0]).getCondition('isRegister')).toMatchObject({
        $opr: 'eq',
        isRegister: true,
      });
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('status')).toMatchObject({
        $opr: 'eq',
        status: RunnerStatusEnum.RUNNING,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
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
    let inputId: string;
    let outputVpnProviderData: VpnProviderModel;
    let outputRunnerMystData1: RunnerModel<VpnProviderModel>;

    beforeEach(() => {
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
      mystApiRepository.getById.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.getById(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById).toBeCalledWith(inputId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get vpn info by id for aggregation and return empty data because not found any vpn by id`, async () => {
      mystApiRepository.getById.mockResolvedValue([null, null]);

      const [error, result] = await repository.getById(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById).toBeCalledWith(inputId);
      expect(dockerRunnerRepository.getAll).toBeCalledTimes(0);
      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it(`Should error get vpn info by id for aggregation when fail on on get all data from runner`, async () => {
      mystApiRepository.getById.mockResolvedValue([null, outputVpnProviderData]);
      dockerRunnerRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.getById(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById).toBeCalledWith(inputId);
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
      mystApiRepository.getById.mockResolvedValue([null, outputVpnProviderData]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result] = await repository.getById(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById).toBeCalledWith(inputId);
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
      mystApiRepository.getById.mockResolvedValue([null, outputVpnProviderData]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [outputRunnerMystData1], 1]);

      const [error, result] = await repository.getById(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById).toBeCalledWith(inputId);
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
