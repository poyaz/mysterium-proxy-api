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
  VpnServiceTypeEnum,
} from '@src-core/model/vpn-provider.model';
import {IRunnerServiceInterface} from '@src-core/interface/i-runner-service.interface';

describe('MystService', () => {
  let service: MystService;
  let proxyApiRepository: MockProxy<IGenericRepositoryInterface<VpnProviderModel>>;
  let runnerDockerService: MockProxy<IRunnerServiceInterface>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    proxyApiRepository = mock<IGenericRepositoryInterface<VpnProviderModel>>();
    runnerDockerService = mock<IRunnerServiceInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProviderTokenEnum.PROXY_API_REPOSITORY,
          useValue: proxyApiRepository,
        },
        {
          provide: ProviderTokenEnum.RUNNER_SERVICE_DOCKER,
          useValue: runnerDockerService,
        },
        {
          provide: MystService,
          inject: [ProviderTokenEnum.PROXY_API_REPOSITORY, ProviderTokenEnum.RUNNER_SERVICE_DOCKER],
          useFactory: (proxyApiRepository: IGenericRepositoryInterface<VpnProviderModel>, runnerDockerService: IRunnerServiceInterface) =>
            new MystService(proxyApiRepository, runnerDockerService),
        },
      ],
    }).compile();

    service = module.get<MystService>(MystService);
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
        providerIdentity: 'identity',
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
});
