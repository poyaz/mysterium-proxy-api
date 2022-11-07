import {Test, TestingModule} from '@nestjs/testing';
import {ProxyService} from './proxy.service';
import {mock, MockProxy} from 'jest-mock-extended';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {IProxyRepositoryInterface} from '@src-core/interface/i-proxy-repository.interface';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {FilterModel} from '@src-core/model/filter.model';
import {ProxyDownstreamModel, ProxyStatusEnum, ProxyTypeEnum, ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {
  RunnerExecEnum,
  RunnerModel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';

describe('ProxyService', () => {
  let service: ProxyService;
  let proxyRepository: MockProxy<IProxyRepositoryInterface>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    proxyRepository = mock<IProxyRepositoryInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const proxyRepositoryProvider = 'proxy-repository';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: proxyRepositoryProvider,
          useValue: proxyRepository,
        },
        {
          provide: ProxyService,
          inject: [proxyRepositoryProvider],
          useFactory: (proxyRepository: IProxyRepositoryInterface) => new ProxyService(proxyRepository),
        },
      ],
    }).compile();

    service = module.get<ProxyService>(ProxyService);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe(`Get all proxy`, () => {
    let inputFilter: FilterModel<ProxyUpstreamModel>;
    let outputRunnerDownstreamModel: RunnerModel<MystIdentityModel>;
    let outputDownstreamProxyModel: ProxyDownstreamModel;
    let outputRunnerUpstreamModel: RunnerModel<[MystIdentityModel, VpnProviderModel]>;
    let outputProxyUpstreamModel: ProxyUpstreamModel;

    beforeEach(() => {
      inputFilter = new FilterModel<ProxyUpstreamModel>();

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

    it(`Should error get all proxy without filter`, async () => {
      proxyRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.getAll();

      expect(proxyRepository.getAll).toHaveBeenCalled();
      expect(proxyRepository.getAll).toHaveBeenCalledWith(undefined);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all proxy with filter`, async () => {
      proxyRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.getAll(inputFilter);

      expect(proxyRepository.getAll).toHaveBeenCalled();
      expect(proxyRepository.getAll).toHaveBeenCalledWith(inputFilter);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get all proxy and return empty records`, async () => {
      proxyRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result, total] = await service.getAll(inputFilter);

      expect(proxyRepository.getAll).toHaveBeenCalled();
      expect(proxyRepository.getAll).toHaveBeenCalledWith(inputFilter);
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
      expect(total).toEqual(0);
    });

    it(`Should successfully get all proxy`, async () => {
      proxyRepository.getAll.mockResolvedValue([null, [outputProxyUpstreamModel], 1]);

      const [error, result, total] = await service.getAll(inputFilter);

      expect(proxyRepository.getAll).toHaveBeenCalled();
      expect(proxyRepository.getAll).toHaveBeenCalledWith(inputFilter);
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(outputProxyUpstreamModel);
      expect(total).toEqual(1);
    });
  });
});
