import {Test, TestingModule} from '@nestjs/testing';
import {MystProviderService} from './myst-provider.service';
import {mock, MockProxy} from 'jest-mock-extended';
import {IRunnerServiceInterface} from '@src-core/interface/i-runner-service.interface';
import {IMystApiRepositoryInterface} from '@src-core/interface/i-myst-api-repository.interface';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {FilterInstanceType, FilterModel, FilterOperationType} from '@src-core/model/filter.model';
import {
  VpnProviderIpTypeEnum,
  VpnProviderModel,
  VpnProviderName,
  VpnProviderStatusEnum,
  VpnServiceTypeEnum,
} from '@src-core/model/vpn-provider.model';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {DefaultModel} from '@src-core/model/defaultModel';
import {ProviderIdentityInUseException} from '@src-core/exception/provider-identity-in-use.exception';
import {NotFoundException} from '@src-core/exception/not-found.exception';
import {IMystIdentityServiceInterface} from '@src-core/interface/i-myst-identity-service.interface';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {NotFoundMystIdentityException} from '@src-core/exception/not-found-myst-identity.exception';
import {
  RunnerExecEnum,
  RunnerModel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {NotRunningServiceException} from '@src-core/exception/not-running-service.exception';
import {ProviderIdentityNotConnectingException} from '@src-core/exception/provider-identity-not-connecting.exception';
import {ProxyProviderInUseException} from '@src-core/exception/proxy-provider-in-use.exception';

describe('MystProviderService', () => {
  let service: MystProviderService;
  let mystApiRepository: MockProxy<IMystApiRepositoryInterface>;
  let dockerRunnerService: MockProxy<IRunnerServiceInterface>;
  let mystIdentityService: MockProxy<IMystIdentityServiceInterface>;
  let identifierMock: MockProxy<IIdentifier>;
  let fakeIdentifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    mystApiRepository = mock<IMystApiRepositoryInterface>();
    dockerRunnerService = mock<IRunnerServiceInterface>();
    mystIdentityService = mock<IMystIdentityServiceInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    fakeIdentifierMock = mock<IIdentifier>();
    fakeIdentifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProviderTokenEnum.MYST_PROVIDER_AGGREGATE_REPOSITORY,
          useValue: mystApiRepository,
        },
        {
          provide: ProviderTokenEnum.DOCKER_RUNNER_SERVICE,
          useValue: dockerRunnerService,
        },
        {
          provide: ProviderTokenEnum.MYST_IDENTITY_SERVICE,
          useValue: mystIdentityService,
        },
        {
          provide: MystProviderService,
          inject: [
            ProviderTokenEnum.MYST_PROVIDER_AGGREGATE_REPOSITORY,
            ProviderTokenEnum.DOCKER_RUNNER_SERVICE,
            ProviderTokenEnum.MYST_IDENTITY_SERVICE,
          ],
          useFactory: (
            mystApiRepository: IMystApiRepositoryInterface,
            dockerRunnerService: IRunnerServiceInterface,
            mystIdentityService: IMystIdentityServiceInterface,
          ) =>
            new MystProviderService(mystApiRepository, dockerRunnerService, mystIdentityService),
        },
      ],
    }).compile();

    service = module.get<MystProviderService>(MystProviderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe(`Get all provider`, () => {
    let inputWithFilter: FilterModel<VpnProviderModel>;
    let inputWithoutFilter: FilterModel<VpnProviderModel>;
    let outputVpnModel1: VpnProviderModel;

    beforeEach(() => {
      inputWithFilter = new FilterModel<VpnProviderModel>();
      inputWithFilter.addCondition({$opr: 'eq', country: 'GB'});

      inputWithoutFilter = new FilterModel<VpnProviderModel>();

      outputVpnModel1 = new VpnProviderModel({
        id: identifierMock.generateId(),
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'providerIdentity1',
        providerStatus: VpnProviderStatusEnum.ONLINE,
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        country: 'GB',
        isRegister: false,
        proxyCount: 0,
        insertDate: new Date(),
      });
    });

    it(`Should error get all provider without filter`, async () => {
      mystApiRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.getAll();

      expect(mystApiRepository.getAll).toHaveBeenCalled();
      expect(mystApiRepository.getAll.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getAll.mock.calls[0][1]).toBeUndefined();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all provider with filter`, async () => {
      mystApiRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.getAll(inputWithFilter);

      expect(mystApiRepository.getAll).toHaveBeenCalled();
      expect(mystApiRepository.getAll.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getAll.mock.calls[0][1]).toBeInstanceOf(FilterModel);
      expect((<FilterModel<VpnProviderModel>>mystApiRepository.getAll.mock.calls[0][1]).getLengthOfCondition()).toEqual(1);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all provider with empty filter`, async () => {
      mystApiRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.getAll(inputWithoutFilter);

      expect(mystApiRepository.getAll).toHaveBeenCalled();
      expect(mystApiRepository.getAll.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getAll.mock.calls[0][1]).toBeInstanceOf(FilterModel);
      expect((<FilterModel<VpnProviderModel>>mystApiRepository.getAll.mock.calls[0][1]).getLengthOfCondition()).toEqual(0);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get all provider with empty records`, async () => {
      mystApiRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result, total] = await service.getAll();

      expect(mystApiRepository.getAll).toHaveBeenCalled();
      expect(mystApiRepository.getAll.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getAll.mock.calls[0][1]).toBeUndefined();
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
      expect(total).toEqual(0);
    });

    it(`Should successfully get all provider`, async () => {
      mystApiRepository.getAll.mockResolvedValue([null, [outputVpnModel1], 1]);

      const [error, result, total] = await service.getAll();

      expect(mystApiRepository.getAll).toHaveBeenCalled();
      expect(mystApiRepository.getAll.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getAll.mock.calls[0][1]).toBeUndefined();
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual<Omit<VpnProviderModel, 'clone'>>({
        id: outputVpnModel1.id,
        serviceType: outputVpnModel1.serviceType,
        providerName: outputVpnModel1.providerName,
        providerIdentity: outputVpnModel1.providerIdentity,
        providerStatus: outputVpnModel1.providerStatus,
        providerIpType: outputVpnModel1.providerIpType,
        country: outputVpnModel1.country,
        isRegister: outputVpnModel1.isRegister,
        proxyCount: outputVpnModel1.proxyCount,
        insertDate: outputVpnModel1.insertDate,
      });
      expect(total).toEqual(1);
    });
  });

  describe(`Get by id`, () => {
    let inputId: string;
    let outputVpnModel: VpnProviderModel;

    beforeEach(() => {
      inputId = identifierMock.generateId();

      outputVpnModel = new VpnProviderModel({
        id: identifierMock.generateId(),
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'providerIdentity1',
        providerStatus: VpnProviderStatusEnum.ONLINE,
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        country: 'GB',
        isRegister: false,
        proxyCount: 0,
        insertDate: new Date(),
      });
    });

    it(`Should error get provider by id`, async () => {
      mystApiRepository.getById.mockResolvedValue([new UnknownException()]);

      const [error] = await service.getById(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById).toHaveBeenCalledWith(expect.anything(), inputId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get provider by id if not found`, async () => {
      mystApiRepository.getById.mockResolvedValue([null, null]);

      const [error] = await service.getById(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById).toHaveBeenCalledWith(expect.anything(), inputId);
      expect(error).toBeInstanceOf(NotFoundException);
    });

    it(`Should successfully get provider by id`, async () => {
      mystApiRepository.getById.mockResolvedValue([null, outputVpnModel]);

      const [error, result] = await service.getById(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById).toHaveBeenCalledWith(expect.anything(), inputId);
      expect(error).toBeNull();
      expect(result).toEqual<Omit<VpnProviderModel, 'clone'>>({
        id: outputVpnModel.id,
        serviceType: outputVpnModel.serviceType,
        providerName: outputVpnModel.providerName,
        providerIdentity: outputVpnModel.providerIdentity,
        providerStatus: outputVpnModel.providerStatus,
        providerIpType: outputVpnModel.providerIpType,
        country: outputVpnModel.country,
        isRegister: outputVpnModel.isRegister,
        proxyCount: outputVpnModel.proxyCount,
        insertDate: outputVpnModel.insertDate,
      });
    });
  });

  describe(`Connect to vpn`, () => {
    let inputId: string;
    let outputProviderRegisterModel: VpnProviderModel;
    let outputProviderModel: VpnProviderModel;
    let outputMystIdentityNotUseModel1: MystIdentityModel;
    let outputRunnerNotRunningModel: RunnerModel<MystIdentityModel>;
    let outputRunnerRunningModel: RunnerModel<MystIdentityModel>;

    beforeEach(() => {
      inputId = identifierMock.generateId();

      outputProviderRegisterModel = new VpnProviderModel({
        id: identifierMock.generateId(),
        userIdentity: 'userIdentity1',
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'providerIdentity1',
        providerStatus: VpnProviderStatusEnum.ONLINE,
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        country: 'GB',
        isRegister: true,
        proxyCount: 0,
        insertDate: new Date(),
      });

      outputProviderModel = new VpnProviderModel({
        id: identifierMock.generateId(),
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'providerIdentity1',
        providerStatus: VpnProviderStatusEnum.ONLINE,
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        country: 'GB',
        isRegister: false,
        proxyCount: 0,
        insertDate: new Date(),
      });

      outputMystIdentityNotUseModel1 = new MystIdentityModel({
        id: identifierMock.generateId(),
        identity: 'identity1',
        passphrase: 'passphrase identity1',
        path: '/path/of/identity1',
        filename: 'identity1.json',
        isUse: false,
        insertDate: new Date(),
      });

      outputRunnerNotRunningModel = new RunnerModel<MystIdentityModel>({
        id: identifierMock.generateId(),
        serial: 'serial',
        name: 'name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketUri: '10.10.10.1',
        socketPort: 4449,
        status: RunnerStatusEnum.CREATING,
        insertDate: new Date(),
      });

      outputRunnerRunningModel = new RunnerModel<MystIdentityModel>({
        id: identifierMock.generateId(),
        serial: 'serial',
        name: 'name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketUri: '10.10.10.1',
        socketPort: 4449,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
    });

    it(`Should error connect to vpn when fetch provider info`, async () => {
      mystApiRepository.getById.mockResolvedValue([new UnknownException()]);

      const [error] = await service.up(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getById.mock.calls[0][1]).toEqual(inputId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error connect to vpn when fetch provider not found`, async () => {
      mystApiRepository.getById.mockResolvedValue([null, null]);

      const [error] = await service.up(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getById.mock.calls[0][1]).toEqual(inputId);
      expect(error).toBeInstanceOf(NotFoundException);
    });

    it(`Should error connect to vpn when fetch provider isRegister`, async () => {
      mystApiRepository.getById.mockResolvedValue([null, outputProviderRegisterModel]);

      const [error] = await service.up(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getById.mock.calls[0][1]).toEqual(inputId);
      expect(error).toBeInstanceOf(ProviderIdentityInUseException);
    });

    it(`Should error connect to vpn when get identity not used`, async () => {
      mystApiRepository.getById.mockResolvedValue([null, outputProviderModel]);
      mystIdentityService.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.up(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getById.mock.calls[0][1]).toEqual(inputId);
      expect(mystIdentityService.getAll).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>mystIdentityService.getAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(1);
      expect((<FilterModel<MystIdentityModel>>mystIdentityService.getAll.mock.calls[0][0]).getCondition('isUse')).toEqual({
        $opr: 'eq',
        isUse: false,
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error connect to vpn when not found any free identity`, async () => {
      mystApiRepository.getById.mockResolvedValue([null, outputProviderModel]);
      mystIdentityService.getAll.mockResolvedValue([null, [], 0]);

      const [error] = await service.up(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getById.mock.calls[0][1]).toEqual(inputId);
      expect(mystIdentityService.getAll).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>mystIdentityService.getAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(1);
      expect((<FilterModel<MystIdentityModel>>mystIdentityService.getAll.mock.calls[0][0]).getCondition('isUse')).toEqual({
        $opr: 'eq',
        isUse: false,
      });
      expect(error).toBeInstanceOf(NotFoundMystIdentityException);
    });

    it(`Should error connect to vpn when get runner of free myst identity`, async () => {
      mystApiRepository.getById.mockResolvedValue([null, outputProviderModel]);
      mystIdentityService.getAll.mockResolvedValue([null, [outputMystIdentityNotUseModel1], 1]);
      dockerRunnerService.findAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.up(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getById.mock.calls[0][1]).toEqual(inputId);
      expect(mystIdentityService.getAll).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>mystIdentityService.getAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(1);
      expect((<FilterModel<MystIdentityModel>>mystIdentityService.getAll.mock.calls[0][0]).getCondition('isUse')).toEqual<FilterInstanceType<MystIdentityModel> & { $opr: FilterOperationType }>({
        $opr: 'eq',
        isUse: false,
      });
      expect(dockerRunnerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(2);
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getCondition('service')).toEqual<FilterInstanceType<RunnerModel<MystIdentityModel>> & { $opr: FilterOperationType }>({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getCondition('label')).toEqual<FilterInstanceType<RunnerModel<MystIdentityModel>> & { $opr: FilterOperationType }>({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          id: outputMystIdentityNotUseModel1.id,
        },
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error connect to vpn when not found myst runner`, async () => {
      mystApiRepository.getById.mockResolvedValue([null, outputProviderModel]);
      mystIdentityService.getAll.mockResolvedValue([null, [outputMystIdentityNotUseModel1], 1]);
      dockerRunnerService.findAll.mockResolvedValue([null, [], 0]);

      const [error] = await service.up(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getById.mock.calls[0][1]).toEqual(inputId);
      expect(mystIdentityService.getAll).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>mystIdentityService.getAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(1);
      expect((<FilterModel<MystIdentityModel>>mystIdentityService.getAll.mock.calls[0][0]).getCondition('isUse')).toEqual<FilterInstanceType<MystIdentityModel> & { $opr: FilterOperationType }>({
        $opr: 'eq',
        isUse: false,
      });
      expect(dockerRunnerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(2);
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getCondition('service')).toEqual<FilterInstanceType<RunnerModel<MystIdentityModel>> & { $opr: FilterOperationType }>({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getCondition('label')).toEqual<FilterInstanceType<RunnerModel<MystIdentityModel>> & { $opr: FilterOperationType }>({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          id: outputMystIdentityNotUseModel1.id,
        },
      });
      expect(error).toBeInstanceOf(NotRunningServiceException);
    });

    it(`Should error connect to vpn when myst runner status is not running`, async () => {
      mystApiRepository.getById.mockResolvedValue([null, outputProviderModel]);
      mystIdentityService.getAll.mockResolvedValue([null, [outputMystIdentityNotUseModel1], 1]);
      dockerRunnerService.findAll.mockResolvedValue([null, [outputRunnerNotRunningModel], 1]);

      const [error] = await service.up(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getById.mock.calls[0][1]).toEqual(inputId);
      expect(mystIdentityService.getAll).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>mystIdentityService.getAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(1);
      expect((<FilterModel<MystIdentityModel>>mystIdentityService.getAll.mock.calls[0][0]).getCondition('isUse')).toEqual<FilterInstanceType<MystIdentityModel> & { $opr: FilterOperationType }>({
        $opr: 'eq',
        isUse: false,
      });
      expect(dockerRunnerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(2);
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getCondition('service')).toEqual<FilterInstanceType<RunnerModel<MystIdentityModel>> & { $opr: FilterOperationType }>({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getCondition('label')).toEqual<FilterInstanceType<RunnerModel<MystIdentityModel>> & { $opr: FilterOperationType }>({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          id: outputMystIdentityNotUseModel1.id,
        },
      });
      expect(error).toBeInstanceOf(NotRunningServiceException);
    });

    it(`Should error connect to vpn when forcing to disconnect before connecting`, async () => {
      mystApiRepository.getById.mockResolvedValue([null, outputProviderModel]);
      mystIdentityService.getAll.mockResolvedValue([null, [outputMystIdentityNotUseModel1], 1]);
      dockerRunnerService.findAll.mockResolvedValue([null, [outputRunnerRunningModel], 1]);
      mystApiRepository.disconnect.mockResolvedValue([new UnknownException()]);

      const [error] = await service.up(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getById.mock.calls[0][1]).toEqual(inputId);
      expect(mystIdentityService.getAll).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>mystIdentityService.getAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(1);
      expect((<FilterModel<MystIdentityModel>>mystIdentityService.getAll.mock.calls[0][0]).getCondition('isUse')).toEqual<FilterInstanceType<MystIdentityModel> & { $opr: FilterOperationType }>({
        $opr: 'eq',
        isUse: false,
      });
      expect(dockerRunnerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(2);
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getCondition('service')).toEqual<FilterInstanceType<RunnerModel<MystIdentityModel>> & { $opr: FilterOperationType }>({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getCondition('label')).toEqual<FilterInstanceType<RunnerModel<MystIdentityModel>> & { $opr: FilterOperationType }>({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          id: outputMystIdentityNotUseModel1.id,
        },
      });
      expect(mystApiRepository.disconnect).toHaveBeenCalled();
      expect(mystApiRepository.disconnect).toHaveBeenCalledWith(
        expect.objectContaining<Pick<RunnerModel, 'socketType' | 'socketUri' | 'socketPort'>>({
          socketType: RunnerSocketTypeEnum.HTTP,
          socketUri: outputRunnerRunningModel.socketUri,
          socketPort: outputRunnerRunningModel.socketPort,
        }),
        true,
      );
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error connect to vpn when trying connect vpn`, async () => {
      mystApiRepository.getById.mockResolvedValue([null, outputProviderModel]);
      mystIdentityService.getAll.mockResolvedValue([null, [outputMystIdentityNotUseModel1], 1]);
      dockerRunnerService.findAll.mockResolvedValue([null, [outputRunnerRunningModel], 1]);
      mystApiRepository.disconnect.mockResolvedValue([null, null]);
      mystApiRepository.connect.mockResolvedValue([new UnknownException()]);

      const [error] = await service.up(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getById.mock.calls[0][1]).toEqual(inputId);
      expect(mystIdentityService.getAll).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>mystIdentityService.getAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(1);
      expect((<FilterModel<MystIdentityModel>>mystIdentityService.getAll.mock.calls[0][0]).getCondition('isUse')).toEqual<FilterInstanceType<MystIdentityModel> & { $opr: FilterOperationType }>({
        $opr: 'eq',
        isUse: false,
      });
      expect(dockerRunnerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(2);
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getCondition('service')).toEqual<FilterInstanceType<RunnerModel<MystIdentityModel>> & { $opr: FilterOperationType }>({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getCondition('label')).toEqual<FilterInstanceType<RunnerModel<MystIdentityModel>> & { $opr: FilterOperationType }>({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          id: outputMystIdentityNotUseModel1.id,
        },
      });
      expect(mystApiRepository.disconnect).toHaveBeenCalled();
      expect(mystApiRepository.disconnect).toHaveBeenCalledWith(
        expect.objectContaining<Pick<RunnerModel, 'socketType' | 'socketUri' | 'socketPort'>>({
          socketType: RunnerSocketTypeEnum.HTTP,
          socketUri: outputRunnerRunningModel.socketUri,
          socketPort: outputRunnerRunningModel.socketPort,
        }),
        true,
      );
      expect(mystApiRepository.connect).toHaveBeenCalled();
      expect(mystApiRepository.connect).toHaveBeenCalledWith(
        expect.objectContaining<Pick<RunnerModel, 'socketType' | 'socketUri' | 'socketPort'>>({
          socketType: RunnerSocketTypeEnum.HTTP,
          socketUri: outputRunnerRunningModel.socketUri,
          socketPort: outputRunnerRunningModel.socketPort,
        }),
        expect.objectContaining<Pick<VpnProviderModel, 'userIdentity' | 'providerIdentity'>>({
          userIdentity: outputMystIdentityNotUseModel1.identity,
          providerIdentity: outputProviderModel.providerIdentity,
        }),
      );
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully connect to vpn`, async () => {
      mystApiRepository.getById.mockResolvedValue([null, outputProviderModel]);
      mystIdentityService.getAll.mockResolvedValue([null, [outputMystIdentityNotUseModel1], 1]);
      dockerRunnerService.findAll.mockResolvedValue([null, [outputRunnerRunningModel], 1]);
      mystApiRepository.disconnect.mockResolvedValue([null, null]);
      mystApiRepository.connect.mockResolvedValue([null, outputProviderRegisterModel]);

      const [error, result] = await service.up(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getById.mock.calls[0][1]).toEqual(inputId);
      expect(mystIdentityService.getAll).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>mystIdentityService.getAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(1);
      expect((<FilterModel<MystIdentityModel>>mystIdentityService.getAll.mock.calls[0][0]).getCondition('isUse')).toEqual<FilterInstanceType<MystIdentityModel> & { $opr: FilterOperationType }>({
        $opr: 'eq',
        isUse: false,
      });
      expect(dockerRunnerService.findAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getLengthOfCondition()).toEqual(2);
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getCondition('service')).toEqual<FilterInstanceType<RunnerModel<MystIdentityModel>> & { $opr: FilterOperationType }>({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
      expect((<FilterModel<RunnerModel<MystIdentityModel>>>dockerRunnerService.findAll.mock.calls[0][0]).getCondition('label')).toEqual<FilterInstanceType<RunnerModel<MystIdentityModel>> & { $opr: FilterOperationType }>({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          id: outputMystIdentityNotUseModel1.id,
        },
      });
      expect(mystApiRepository.disconnect).toHaveBeenCalled();
      expect(mystApiRepository.disconnect).toHaveBeenCalledWith(
        expect.objectContaining<Pick<RunnerModel, 'socketType' | 'socketUri' | 'socketPort'>>({
          socketType: RunnerSocketTypeEnum.HTTP,
          socketUri: outputRunnerRunningModel.socketUri,
          socketPort: outputRunnerRunningModel.socketPort,
        }),
        true,
      );
      expect(mystApiRepository.connect).toHaveBeenCalled();
      expect(mystApiRepository.connect).toHaveBeenCalledWith(
        expect.objectContaining<Pick<RunnerModel, 'socketType' | 'socketUri' | 'socketPort'>>({
          socketType: RunnerSocketTypeEnum.HTTP,
          socketUri: outputRunnerRunningModel.socketUri,
          socketPort: outputRunnerRunningModel.socketPort,
        }),
        expect.objectContaining<Pick<VpnProviderModel, 'userIdentity' | 'providerIdentity'>>({
          userIdentity: outputMystIdentityNotUseModel1.identity,
          providerIdentity: outputProviderModel.providerIdentity,
        }),
      );
      expect(error).toBeNull();
      expect(result).toMatchObject<Omit<VpnProviderModel, 'clone'>>({
        id: outputProviderRegisterModel.id,
        userIdentity: outputProviderRegisterModel.userIdentity,
        serviceType: outputProviderRegisterModel.serviceType,
        providerName: outputProviderRegisterModel.providerName,
        providerIdentity: outputProviderRegisterModel.providerIdentity,
        providerStatus: outputProviderRegisterModel.providerStatus,
        providerIpType: outputProviderRegisterModel.providerIpType,
        country: outputProviderRegisterModel.country,
        isRegister: outputProviderRegisterModel.isRegister,
        proxyCount: outputProviderRegisterModel.proxyCount,
        insertDate: outputProviderRegisterModel.insertDate,
      });
    });
  });

  describe(`Disconnect from vpn`, () => {
    let inputId: string;
    let outputProviderNotRegisterModel: VpnProviderModel;
    let outputProviderRegisterWithProxyCount: VpnProviderModel;
    let outputProviderRegisterNotRunningModel: VpnProviderModel;
    let outputProviderRegisterRunningModel: VpnProviderModel;

    beforeEach(() => {
      inputId = identifierMock.generateId();

      outputProviderNotRegisterModel = new VpnProviderModel({
        id: identifierMock.generateId(),
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'providerIdentity1',
        providerStatus: VpnProviderStatusEnum.ONLINE,
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        country: 'GB',
        isRegister: false,
        proxyCount: 0,
        insertDate: new Date(),
      });

      outputProviderRegisterWithProxyCount = new VpnProviderModel({
        id: identifierMock.generateId(),
        userIdentity: 'userIdentity1',
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'providerIdentity1',
        providerStatus: VpnProviderStatusEnum.ONLINE,
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        country: 'GB',
        isRegister: true,
        runner: new RunnerModel<VpnProviderModel>({
          id: identifierMock.generateId(),
          serial: 'serial',
          name: 'name',
          service: RunnerServiceEnum.MYST,
          exec: RunnerExecEnum.DOCKER,
          socketType: RunnerSocketTypeEnum.HTTP,
          socketUri: '10.10.10.1',
          socketPort: 4449,
          status: RunnerStatusEnum.RUNNING,
          insertDate: new Date(),
        }),
        proxyCount: 1,
        insertDate: new Date(),
      });

      outputProviderRegisterNotRunningModel = new VpnProviderModel({
        id: identifierMock.generateId(),
        userIdentity: 'userIdentity1',
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'providerIdentity1',
        providerStatus: VpnProviderStatusEnum.ONLINE,
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        country: 'GB',
        isRegister: true,
        runner: new RunnerModel<VpnProviderModel>({
          id: identifierMock.generateId(),
          serial: 'serial',
          name: 'name',
          service: RunnerServiceEnum.MYST,
          exec: RunnerExecEnum.DOCKER,
          socketType: RunnerSocketTypeEnum.HTTP,
          socketUri: '10.10.10.1',
          socketPort: 4449,
          status: RunnerStatusEnum.CREATING,
          insertDate: new Date(),
        }),
        proxyCount: 0,
        insertDate: new Date(),
      });

      outputProviderRegisterRunningModel = new VpnProviderModel({
        id: identifierMock.generateId(),
        userIdentity: 'userIdentity1',
        serviceType: VpnServiceTypeEnum.WIREGUARD,
        providerName: VpnProviderName.MYSTERIUM,
        providerIdentity: 'providerIdentity1',
        providerStatus: VpnProviderStatusEnum.ONLINE,
        providerIpType: VpnProviderIpTypeEnum.RESIDENTIAL,
        country: 'GB',
        isRegister: true,
        runner: new RunnerModel<VpnProviderModel>({
          id: identifierMock.generateId(),
          serial: 'serial',
          name: 'name',
          service: RunnerServiceEnum.MYST,
          exec: RunnerExecEnum.DOCKER,
          socketType: RunnerSocketTypeEnum.HTTP,
          socketUri: '10.10.10.1',
          socketPort: 4449,
          status: RunnerStatusEnum.RUNNING,
          insertDate: new Date(),
        }),
        proxyCount: 0,
        insertDate: new Date(),
      });
    });

    it(`Should error disconnect from vpn when fetch provider info`, async () => {
      mystApiRepository.getById.mockResolvedValue([new UnknownException()]);

      const [error] = await service.down(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getById.mock.calls[0][1]).toEqual(inputId);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error disconnect from vpn when fetch provider not found`, async () => {
      mystApiRepository.getById.mockResolvedValue([null, null]);

      const [error] = await service.down(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getById.mock.calls[0][1]).toEqual(inputId);
      expect(error).toBeInstanceOf(NotFoundException);
    });

    it(`Should error disconnect from vpn when fetch provider not register`, async () => {
      mystApiRepository.getById.mockResolvedValue([null, outputProviderNotRegisterModel]);

      const [error] = await service.down(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getById.mock.calls[0][1]).toEqual(inputId);
      expect(error).toBeInstanceOf(ProviderIdentityNotConnectingException);
    });

    it(`Should error disconnect from vpn when the list of proxy run on provider`, async () => {
      mystApiRepository.getById.mockResolvedValue([null, outputProviderRegisterWithProxyCount]);

      const [error] = await service.down(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getById.mock.calls[0][1]).toEqual(inputId);
      expect(error).toBeInstanceOf(ProxyProviderInUseException);
    });

    it(`Should error disconnect from vpn when myst runner is not running`, async () => {
      mystApiRepository.getById.mockResolvedValue([null, outputProviderRegisterNotRunningModel]);

      const [error] = await service.down(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getById.mock.calls[0][1]).toEqual(inputId);
      expect(error).toBeInstanceOf(NotRunningServiceException);
    });

    it(`Should error disconnect from vpn when trying disconnect vpn`, async () => {
      mystApiRepository.getById.mockResolvedValue([null, outputProviderRegisterRunningModel]);
      mystApiRepository.disconnect.mockResolvedValue([new UnknownException()]);

      const [error] = await service.down(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getById.mock.calls[0][1]).toEqual(inputId);
      expect(mystApiRepository.disconnect).toHaveBeenCalled();
      expect(mystApiRepository.disconnect).toHaveBeenCalledWith(
        expect.objectContaining<Pick<RunnerModel, 'socketType' | 'socketUri' | 'socketPort'>>({
          socketType: RunnerSocketTypeEnum.HTTP,
          socketUri: outputProviderRegisterRunningModel.runner.socketUri,
          socketPort: outputProviderRegisterRunningModel.runner.socketPort,
        }),
      );
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully disconnect from vpn`, async () => {
      mystApiRepository.getById.mockResolvedValue([null, outputProviderRegisterRunningModel]);
      mystApiRepository.disconnect.mockResolvedValue([null, null]);

      const [error, result] = await service.down(inputId);

      expect(mystApiRepository.getById).toHaveBeenCalled();
      expect(mystApiRepository.getById.mock.calls[0][0]).toMatchObject(<DefaultModel<VpnProviderModel>>{IS_DEFAULT_MODEL: true});
      expect(mystApiRepository.getById.mock.calls[0][1]).toEqual(inputId);
      expect(mystApiRepository.disconnect).toHaveBeenCalled();
      expect(mystApiRepository.disconnect).toHaveBeenCalledWith(
        expect.objectContaining<Pick<RunnerModel, 'socketType' | 'socketUri' | 'socketPort'>>({
          socketType: RunnerSocketTypeEnum.HTTP,
          socketUri: outputProviderRegisterRunningModel.runner.socketUri,
          socketPort: outputProviderRegisterRunningModel.runner.socketPort,
        }),
      );
      expect(error).toBeNull();
      expect(result).toBeNull();
    });
  });
});
