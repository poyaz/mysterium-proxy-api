import {mock, MockProxy} from 'jest-mock-extended';
import {MystIdentityAggregateRepository} from './myst-identity-aggregate.repository';
import {IGenericRepositoryInterface} from '@src-core/interface/i-generic-repository.interface';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {Test, TestingModule} from '@nestjs/testing';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {IRunnerRepositoryInterface} from '@src-core/interface/i-runner-repository.interface';
import {IAccountIdentityFileRepository} from '@src-core/interface/i-account-identity-file.repository';
import {FilterModel} from '@src-core/model/filter.model';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';
import {
  RunnerExecEnum, RunnerLabelNamespace,
  RunnerModel,
  RunnerObjectLabel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum,
  RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {ExistException} from '@src-core/exception/exist.exception';
import {IProxyApiRepositoryInterface} from '@src-core/interface/i-proxy-api-repository.interface';
import {NotFoundException} from '@src-core/exception/not-found.exception';
import {UpdateModel} from '@src-core/model/update.model';
import {RepositoryException} from '@src-core/exception/repository.exception';

describe('MystIdentityAggregateRepository', () => {
  let repository: MystIdentityAggregateRepository;
  let mystIdentityFileRepository: MockProxy<IAccountIdentityFileRepository>;
  let mystIdentityPgRepository: MockProxy<IGenericRepositoryInterface<MystIdentityModel>>;
  let dockerRunnerRepository: MockProxy<IRunnerRepositoryInterface>;
  let proxyApiRepository: MockProxy<IProxyApiRepositoryInterface>;
  let identifierMock: MockProxy<IIdentifier>;
  let fakeIdentifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    mystIdentityFileRepository = mock<IAccountIdentityFileRepository>();
    mystIdentityPgRepository = mock<IGenericRepositoryInterface<MystIdentityModel>>();
    dockerRunnerRepository = mock<IRunnerRepositoryInterface>();
    proxyApiRepository = mock<IProxyApiRepositoryInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    fakeIdentifierMock = mock<IIdentifier>();
    fakeIdentifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProviderTokenEnum.MYST_IDENTITY_FILE_REPOSITORY,
          useValue: mystIdentityFileRepository,
        },
        {
          provide: ProviderTokenEnum.MYST_IDENTITY_PG_REPOSITORY,
          useValue: mystIdentityPgRepository,
        },
        {
          provide: ProviderTokenEnum.DOCKER_RUNNER_REPOSITORY,
          useValue: dockerRunnerRepository,
        },
        {
          provide: ProviderTokenEnum.MYST_API_REPOSITORY,
          useValue: proxyApiRepository,
        },
        {
          provide: MystIdentityAggregateRepository,
          inject: [
            ProviderTokenEnum.MYST_IDENTITY_FILE_REPOSITORY,
            ProviderTokenEnum.MYST_IDENTITY_PG_REPOSITORY,
            ProviderTokenEnum.DOCKER_RUNNER_REPOSITORY,
            ProviderTokenEnum.MYST_API_REPOSITORY,
          ],
          useFactory: (
            mystIdentityFileRepository: IAccountIdentityFileRepository,
            mystIdentityPgRepository: IGenericRepositoryInterface<MystIdentityModel>,
            dockerRunnerRepository: IRunnerRepositoryInterface,
            proxyApiRepository: IProxyApiRepositoryInterface,
          ) =>
            new MystIdentityAggregateRepository(
              mystIdentityFileRepository,
              mystIdentityPgRepository,
              dockerRunnerRepository,
              proxyApiRepository,
            ),
        },
      ],
    }).compile();

    repository = module.get<MystIdentityAggregateRepository>(MystIdentityAggregateRepository);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe(`Get all identity and fill aggregate data`, () => {
    let inputPaginationFilter: FilterModel<MystIdentityModel>;
    let inputIdentityFilter: FilterModel<MystIdentityModel>;
    let inputIsUseFilter: FilterModel<MystIdentityModel>;
    let outputIdentityData1: MystIdentityModel;
    let outputIdentityData2: MystIdentityModel;
    let outputIdentityData3: MystIdentityModel;
    let outputIdentityData4: MystIdentityModel;
    let outputFileData1: string;
    let outputFileData2: string;
    let outputFileData3: string;
    let outputFileNotMatchData4: string;
    let outputRunnerMystData1: RunnerModel<MystIdentityModel>;
    let outputRunnerMystConnectData2: RunnerModel<[MystIdentityModel, VpnProviderModel]>;
    let outputRunnerMystData3: RunnerModel<MystIdentityModel>;
    let outputRunnerMystConnectData4: RunnerModel<[MystIdentityModel, VpnProviderModel]>;
    let outputRunnerMystNotMatchData5: RunnerModel<MystIdentityModel>;

    beforeEach(() => {
      inputPaginationFilter = new FilterModel<MystIdentityModel>({page: 2, limit: 1});

      inputIdentityFilter = new FilterModel<MystIdentityModel>();
      inputIdentityFilter.addCondition({$opr: 'eq', identity: 'identity-1'});

      inputIsUseFilter = new FilterModel<MystIdentityModel>({page: 2, limit: 1});
      inputIsUseFilter.addCondition({$opr: 'eq', isUse: true});

      outputFileData1 = '/path/identity-1/identity-1.json';
      outputFileData2 = '/path/identity-2/identity-2.json';
      outputFileData3 = '/path/identity-3/identity-3.json';
      outputFileNotMatchData4 = '/path/not-match/not-match.json';

      outputIdentityData1 = new MystIdentityModel({
        id: '11111111-1111-1111-1111-111111111111',
        identity: 'identity-1',
        passphrase: 'pass 1',
        path: '/path/identity-1/',
        filename: '-',
        isUse: false,
        insertDate: new Date(),
      });
      outputIdentityData2 = new MystIdentityModel({
        id: '22222222-2222-2222-2222-222222222222',
        identity: 'identity-2',
        passphrase: 'pass 2',
        path: '/path/identity-2/',
        filename: '-',
        isUse: false,
        insertDate: new Date(),
      });
      outputIdentityData3 = new MystIdentityModel({
        id: '33333333-3333-3333-3333-333333333333',
        identity: 'identity-3',
        passphrase: 'pass 3',
        path: '/path/identity-3/',
        filename: '-',
        isUse: false,
        insertDate: new Date(),
      });
      outputIdentityData4 = new MystIdentityModel({
        id: '44444444-4444-4444-4444-444444444444',
        identity: 'identity-4',
        passphrase: 'pass 4',
        path: '/path/identity-4/',
        filename: '-',
        isUse: false,
        insertDate: new Date(),
      });

      outputRunnerMystData1 = new RunnerModel<MystIdentityModel>({
        id: '55555555-5555-5555-5555-555555555555',
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
        identity: outputIdentityData1.identity,
      };
      outputRunnerMystConnectData2 = new RunnerModel<[MystIdentityModel, VpnProviderModel]>({
        id: '66666666-6666-6666-6666-666666666666',
        serial: 'myst-connect1 runner serial',
        name: 'myst-connect1 runner name',
        service: RunnerServiceEnum.MYST_CONNECT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputRunnerMystConnectData2.label = [
        {
          $namespace: MystIdentityModel.name,
          identity: outputIdentityData1.identity,
        },
        {
          $namespace: VpnProviderModel.name,
          userIdentity: outputIdentityData1.identity,
        },
      ];
      outputRunnerMystData3 = new RunnerModel<MystIdentityModel>({
        id: '77777777-7777-7777-7777-777777777777',
        serial: 'myst2 runner serial',
        name: 'myst2 runner name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputRunnerMystData3.label = {
        $namespace: MystIdentityModel.name,
        identity: outputIdentityData2.identity,
      };
      outputRunnerMystConnectData4 = new RunnerModel<[MystIdentityModel, VpnProviderModel]>({
        id: '88888888-8888-8888-8888-888888888888',
        serial: 'myst-connect2 runner serial',
        name: 'myst-connect2 runner name',
        service: RunnerServiceEnum.MYST_CONNECT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputRunnerMystConnectData4.label = [
        {
          $namespace: MystIdentityModel.name,
          identity: outputIdentityData2.identity,
        },
        {
          $namespace: VpnProviderModel.name,
          userIdentity: outputIdentityData2.identity,
        },
      ];

      outputRunnerMystNotMatchData5 = new RunnerModel<MystIdentityModel>({
        id: '99999999-9999-9999-9999-999999999999',
        serial: 'myst5 runner serial',
        name: 'myst5 runner name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputRunnerMystNotMatchData5.label = {
        $namespace: MystIdentityModel.name,
        identity: 'identity 8',
      };
    });

    it(`Should error get all identity for aggregation when fail on get all data from file`, async () => {
      mystIdentityFileRepository.getAll.mockResolvedValue([new UnknownException()]);
      mystIdentityPgRepository.getAll.mockResolvedValue([null, [], 0]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error] = await repository.getAll();

      expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all identity for aggregation when fail on get all data from identity repository`, async () => {
      mystIdentityFileRepository.getAll.mockResolvedValue([null, [], 0]);
      mystIdentityPgRepository.getAll.mockResolvedValue([new UnknownException()]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error] = await repository.getAll();

      expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all identity for aggregation when fail on get all data from runner`, async () => {
      mystIdentityFileRepository.getAll.mockResolvedValue([null, [], 0]);
      mystIdentityPgRepository.getAll.mockResolvedValue([null, [], 0]);
      dockerRunnerRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.getAll();

      expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get all identity for aggregation (return empty records because not found any file data)`, async () => {
      mystIdentityFileRepository.getAll.mockResolvedValue([null, [], 0]);
      mystIdentityPgRepository.getAll.mockResolvedValue([null, [outputIdentityData1], 1]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [outputRunnerMystData1], 1]);

      const [error, result, totalCount] = await repository.getAll();

      expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(error).toBeNull();
      expect(result.length).toEqual(0);
      expect(totalCount).toEqual(0);
    });

    it(`Should successfully get all identity for aggregation (return empty records because not found any identity data)`, async () => {
      mystIdentityFileRepository.getAll.mockResolvedValue([null, [outputFileData1, outputFileData2], 2]);
      mystIdentityPgRepository.getAll.mockResolvedValue([null, [], 0]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [outputRunnerMystData1], 1]);

      const [error, result, totalCount] = await repository.getAll();

      expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(error).toBeNull();
      expect(result.length).toEqual(0);
      expect(totalCount).toEqual(0);
    });

    it(`Should successfully get all identity for aggregation (return empty records because not found any runner)`, async () => {
      mystIdentityFileRepository.getAll.mockResolvedValue([null, [outputFileData1], 1]);
      mystIdentityPgRepository.getAll.mockResolvedValue([null, [outputIdentityData1], 1]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result, totalCount] = await repository.getAll();

      expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(error).toBeNull();
      expect(result.length).toEqual(0);
      expect(totalCount).toEqual(0);
    });

    it(`Should successfully get all identity for aggregation (return empty records because not match myst runner)`, async () => {
      mystIdentityFileRepository.getAll.mockResolvedValue([null, [outputFileData1], 1]);
      mystIdentityPgRepository.getAll.mockResolvedValue([null, [outputIdentityData1], 1]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [outputRunnerMystNotMatchData5], 1]);

      const [error, result, totalCount] = await repository.getAll();

      expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(error).toBeNull();
      expect(result.length).toEqual(0);
      expect(totalCount).toEqual(0);
    });

    it(`Should successfully get all identity for aggregation (join file data with 'isUse' false because not found any myst-connect runner)`, async () => {
      mystIdentityFileRepository.getAll.mockResolvedValue([null, [outputFileData1], 1]);
      mystIdentityPgRepository.getAll.mockResolvedValue([null, [outputIdentityData1], 1]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [outputRunnerMystData1], 1]);

      const [error, result, totalCount] = await repository.getAll(new FilterModel());

      expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(error).toBeNull();
      expect(result.length).toEqual(1);
      expect(result[0]).toMatchObject(<MystIdentityModel>{
        id: outputIdentityData1.id,
        identity: outputIdentityData1.identity,
        path: `${outputFileData1.split(/\//g).slice(0, -1).join('/')}/`,
        filename: outputFileData1.split(/\//g).splice(-1)[0],
        isUse: false,
        insertDate: new Date(),
      });
      expect(totalCount).toEqual(1);
    });

    it(`Should successfully get all identity for aggregation with pagination (join file data with 'isUse' false because not found any myst-connect runner)`, async () => {
      mystIdentityFileRepository.getAll.mockResolvedValue([
        null,
        [outputFileData1, outputFileData2, outputFileData3, outputFileNotMatchData4],
        4,
      ]);
      mystIdentityPgRepository.getAll.mockResolvedValue([
        null,
        [outputIdentityData1, outputIdentityData2, outputIdentityData3],
        3,
      ]);
      dockerRunnerRepository.getAll.mockResolvedValue([
        null,
        [outputRunnerMystData1, outputRunnerMystData3],
        2,
      ]);

      const [error, result, totalCount] = await repository.getAll(inputPaginationFilter);

      expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(error).toBeNull();
      expect(result.length).toEqual(1);
      expect(result[0]).toMatchObject(<MystIdentityModel>{
        id: outputIdentityData2.id,
        identity: outputIdentityData2.identity,
        path: `${outputFileData2.split(/\//g).slice(0, -1).join('/')}/`,
        filename: outputFileData2.split(/\//g).splice(-1)[0],
        isUse: false,
        insertDate: new Date(),
      });
      expect(totalCount).toEqual(2);
    });

    it(`Should successfully get all identity for aggregation with 'identity' filter (join file data with 'isUse' false because not found any myst-connect runner)`, async () => {
      mystIdentityFileRepository.getAll.mockResolvedValue([
        null,
        [outputFileData1, outputFileData2, outputFileData3, outputFileNotMatchData4],
        4,
      ]);
      mystIdentityPgRepository.getAll.mockResolvedValue([null, [outputIdentityData1], 1]);
      dockerRunnerRepository.getAll.mockResolvedValue([
        null,
        [outputRunnerMystData1, outputRunnerMystData3],
        2,
      ]);

      const [error, result, totalCount] = await repository.getAll(inputIdentityFilter);

      expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect((<FilterModel<MystIdentityModel>>mystIdentityPgRepository.getAll.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: outputIdentityData1.identity,
      });
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(error).toBeNull();
      expect(result.length).toEqual(1);
      expect(result[0]).toMatchObject(<MystIdentityModel>{
        id: outputIdentityData1.id,
        identity: outputIdentityData1.identity,
        path: `${outputFileData1.split(/\//g).slice(0, -1).join('/')}/`,
        filename: outputFileData1.split(/\//g).splice(-1)[0],
        isUse: false,
        insertDate: new Date(),
      });
      expect(totalCount).toEqual(1);
    });

    it(`Should successfully get all identity for aggregation with 'isUse' filter (join file data with 'isUse' false because not found any myst-connect runner)`, async () => {
      mystIdentityFileRepository.getAll.mockResolvedValue([
        null,
        [outputFileData1, outputFileData2, outputFileData3, outputFileNotMatchData4],
        4,
      ]);
      mystIdentityPgRepository.getAll.mockResolvedValue([null, [outputIdentityData1], 1]);
      dockerRunnerRepository.getAll.mockResolvedValue([
        null,
        [outputRunnerMystData1, outputRunnerMystData3],
        2,
      ]);

      const [error, result, totalCount] = await repository.getAll(inputIsUseFilter);

      expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect((<FilterModel<MystIdentityModel>>mystIdentityPgRepository.getAll.mock.calls[0][0]).getCondition('isUse')).toMatchObject({
        $opr: 'eq',
        isUse: true,
      });
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(error).toBeNull();
      expect(result.length).toEqual(0);
      expect(totalCount).toEqual(0);
    });

    it(`Should successfully get all identity for aggregation with pagination (join file data with 'isUse' true)`, async () => {
      mystIdentityFileRepository.getAll.mockResolvedValue([
        null,
        [outputFileData1, outputFileData2, outputFileData3, outputFileNotMatchData4],
        4,
      ]);
      mystIdentityPgRepository.getAll.mockResolvedValue([
        null,
        [outputIdentityData1, outputIdentityData2, outputIdentityData3],
        3,
      ]);
      dockerRunnerRepository.getAll.mockResolvedValue([
        null,
        [
          outputRunnerMystData1,
          outputRunnerMystConnectData2,
          outputRunnerMystData3,
          outputRunnerMystConnectData4,
          outputRunnerMystNotMatchData5,
        ],
        5,
      ]);

      const [error, result, totalCount] = await repository.getAll(inputPaginationFilter);

      expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(error).toBeNull();
      expect(result.length).toEqual(1);
      expect(result[0]).toMatchObject(<MystIdentityModel>{
        id: outputIdentityData2.id,
        identity: outputIdentityData2.identity,
        path: `${outputFileData2.split(/\//g).slice(0, -1).join('/')}/`,
        filename: outputFileData2.split(/\//g).splice(-1)[0],
        isUse: true,
        insertDate: new Date(),
      });
      expect(totalCount).toEqual(2);
    });

    it(`Should successfully get all identity for aggregation with 'isUse' filter (join file data with 'isUse' true)`, async () => {
      mystIdentityFileRepository.getAll.mockResolvedValue([
        null,
        [outputFileData1, outputFileData2, outputFileData3, outputFileNotMatchData4],
        4,
      ]);
      mystIdentityPgRepository.getAll.mockResolvedValue([
        null,
        [outputIdentityData1, outputIdentityData2, outputIdentityData3],
        3,
      ]);
      dockerRunnerRepository.getAll.mockResolvedValue([
        null,
        [
          outputRunnerMystData1,
          outputRunnerMystConnectData2,
          outputRunnerMystData3,
          outputRunnerMystConnectData4,
          outputRunnerMystNotMatchData5,
        ],
        5,
      ]);

      const [error, result, totalCount] = await repository.getAll(inputIsUseFilter);

      expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(error).toBeNull();
      expect(result.length).toEqual(1);
      expect(result[0]).toMatchObject(<MystIdentityModel>{
        id: outputIdentityData2.id,
        identity: outputIdentityData2.identity,
        path: `${outputFileData2.split(/\//g).slice(0, -1).join('/')}/`,
        filename: outputFileData2.split(/\//g).splice(-1)[0],
        isUse: true,
        insertDate: new Date(),
      });
      expect(totalCount).toEqual(2);
    });
  });

  describe(`Get identity with id and fill aggregate data`, () => {
    let inputId: string;
    let outputFileData: string;
    let outputFileNotMatchData2: string;
    let outputIdentityData: MystIdentityModel;
    let outputRunnerMystData1: RunnerModel<MystIdentityModel>;
    let outputConnectRunnerMystConnectData2: RunnerModel<[MystIdentityModel, VpnProviderModel]>;
    let outputRunnerMystNotMatchData3: RunnerModel<MystIdentityModel>;

    beforeEach(() => {
      inputId = identifierMock.generateId();

      outputFileData = '/path/identity-1/identity-1.json';
      outputFileNotMatchData2 = '/path/identity-2/not-match.json';

      outputIdentityData = new MystIdentityModel({
        id: '11111111-1111-1111-1111-111111111111',
        identity: 'identity-1',
        passphrase: 'pass 1',
        path: '/path/identity-1/',
        filename: '-',
        isUse: false,
        insertDate: new Date(),
      });

      outputRunnerMystData1 = new RunnerModel<MystIdentityModel>({
        id: '55555555-5555-5555-5555-555555555555',
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
        identity: outputIdentityData.identity,
      };
      outputConnectRunnerMystConnectData2 = new RunnerModel<[MystIdentityModel, VpnProviderModel]>({
        id: '66666666-6666-6666-6666-666666666666',
        serial: 'myst-connect1 runner serial',
        name: 'myst-connect1 runner name',
        service: RunnerServiceEnum.MYST_CONNECT,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputConnectRunnerMystConnectData2.label = [
        {
          $namespace: MystIdentityModel.name,
          identity: outputIdentityData.identity,
        },
        {
          $namespace: VpnProviderModel.name,
          userIdentity: outputIdentityData.identity,
        },
      ];
      outputRunnerMystNotMatchData3 = new RunnerModel<MystIdentityModel>({
        id: '77777777-7777-7777-7777-777777777777',
        serial: 'myst3 runner serial',
        name: 'myst3 runner name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputRunnerMystNotMatchData3.label = {
        $namespace: VpnProviderModel.name,
        identity: 'identity 7',
      };
    });

    it(`Should error get identity with id for aggregation when fetch identity`, async () => {
      mystIdentityPgRepository.getById.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.getById(inputId);

      expect(mystIdentityPgRepository.getById).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get identity for aggregation with return null when can't found identity with id`, async () => {
      mystIdentityPgRepository.getById.mockResolvedValue([null, null]);

      const [error, result] = await repository.getById(inputId);

      expect(mystIdentityPgRepository.getById).toHaveBeenCalled();
      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it(`Should error get identity for aggregation when fail on get all data from file`, async () => {
      mystIdentityPgRepository.getById.mockResolvedValue([null, outputIdentityData]);
      mystIdentityFileRepository.getIdentityByFilePath.mockResolvedValue([new UnknownException()]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error] = await repository.getById(inputId);

      expect(mystIdentityPgRepository.getById).toHaveBeenCalled();
      expect(mystIdentityFileRepository.getIdentityByFilePath).toHaveBeenCalled();
      expect(mystIdentityFileRepository.getIdentityByFilePath).toHaveBeenCalledWith(outputIdentityData.path);
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          identity: outputIdentityData.identity,
        },
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get identity for aggregation with return null if file not found`, async () => {
      mystIdentityPgRepository.getById.mockResolvedValue([null, outputIdentityData]);
      mystIdentityFileRepository.getIdentityByFilePath.mockResolvedValue([null, null]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result] = await repository.getById(inputId);

      expect(mystIdentityPgRepository.getById).toHaveBeenCalled();
      expect(mystIdentityFileRepository.getIdentityByFilePath).toHaveBeenCalled();
      expect(mystIdentityFileRepository.getIdentityByFilePath).toHaveBeenCalledWith(outputIdentityData.path);
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          identity: outputIdentityData.identity,
        },
      });
      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it(`Should successfully get identity for aggregation with return null if myst runner not found`, async () => {
      mystIdentityPgRepository.getById.mockResolvedValue([null, outputIdentityData]);
      mystIdentityFileRepository.getIdentityByFilePath.mockResolvedValue([null, outputFileData]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result] = await repository.getById(inputId);

      expect(mystIdentityPgRepository.getById).toHaveBeenCalled();
      expect(mystIdentityFileRepository.getIdentityByFilePath).toHaveBeenCalled();
      expect(mystIdentityFileRepository.getIdentityByFilePath).toHaveBeenCalledWith(outputIdentityData.path);
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          identity: outputIdentityData.identity,
        },
      });
      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it(`Should successfully get identity for aggregation with return null if not match myst runner`, async () => {
      mystIdentityPgRepository.getById.mockResolvedValue([null, outputIdentityData]);
      mystIdentityFileRepository.getIdentityByFilePath.mockResolvedValue([null, outputFileData]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [outputRunnerMystNotMatchData3], 1]);

      const [error, result] = await repository.getById(inputId);

      expect(mystIdentityPgRepository.getById).toHaveBeenCalled();
      expect(mystIdentityFileRepository.getIdentityByFilePath).toHaveBeenCalled();
      expect(mystIdentityFileRepository.getIdentityByFilePath).toHaveBeenCalledWith(outputIdentityData.path);
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          identity: outputIdentityData.identity,
        },
      });
      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it(`Should successfully get identity for aggregation with with 'isUse' false`, async () => {
      mystIdentityPgRepository.getById.mockResolvedValue([null, outputIdentityData]);
      mystIdentityFileRepository.getIdentityByFilePath.mockResolvedValue([null, outputFileData]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [outputRunnerMystData1], 1]);

      const [error, result] = await repository.getById(inputId);

      expect(mystIdentityPgRepository.getById).toHaveBeenCalled();
      expect(mystIdentityFileRepository.getIdentityByFilePath).toHaveBeenCalled();
      expect(mystIdentityFileRepository.getIdentityByFilePath).toHaveBeenCalledWith(outputIdentityData.path);
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          identity: outputIdentityData.identity,
        },
      });
      expect(error).toBeNull();
      expect(result).toMatchObject(<MystIdentityModel>{
        id: outputIdentityData.id,
        identity: outputIdentityData.identity,
        path: `${outputFileData.split(/\//g).slice(0, -1).join('/')}/`,
        filename: outputFileData.split(/\//g).splice(-1)[0],
        isUse: false,
        insertDate: new Date(),
      });
    });

    it(`Should successfully get identity for aggregation with with 'isUse' true`, async () => {
      mystIdentityPgRepository.getById.mockResolvedValue([null, outputIdentityData]);
      mystIdentityFileRepository.getIdentityByFilePath.mockResolvedValue([null, outputFileData]);
      dockerRunnerRepository.getAll.mockResolvedValue([
        null,
        [outputRunnerMystData1, outputConnectRunnerMystConnectData2],
        2,
      ]);

      const [error, result] = await repository.getById(inputId);

      expect(mystIdentityPgRepository.getById).toHaveBeenCalled();
      expect(mystIdentityFileRepository.getIdentityByFilePath).toHaveBeenCalled();
      expect(mystIdentityFileRepository.getIdentityByFilePath).toHaveBeenCalledWith(outputIdentityData.path);
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          $namespace: MystIdentityModel.name,
          identity: outputIdentityData.identity,
        },
      });
      expect(error).toBeNull();
      expect(result).toMatchObject(<MystIdentityModel>{
        id: outputIdentityData.id,
        identity: outputIdentityData.identity,
        path: `${outputFileData.split(/\//g).slice(0, -1).join('/')}/`,
        filename: outputFileData.split(/\//g).splice(-1)[0],
        isUse: true,
        insertDate: new Date(),
      });
    });
  });

  describe(`Add new identity`, () => {
    let identityBasePath: string;
    let repositoryGetAllStub: jest.SpyInstance;
    let inputModel: MystIdentityModel;
    let outputMystExistData: MystIdentityModel;
    let outputMystRunnerData: RunnerModel<MystIdentityModel>;
    let outputMystAddData: MystIdentityModel;

    beforeEach(() => {
      repositoryGetAllStub = jest.spyOn(repository, 'getAll');

      identityBasePath = '/new/path/';

      inputModel = new MystIdentityModel({
        id: fakeIdentifierMock.generateId(),
        identity: 'identity 1',
        passphrase: 'pass 1',
        path: '/old/path/',
        filename: 'old-identity-file-1',
        isUse: false,
        insertDate: new Date(),
      });

      outputMystExistData = new MystIdentityModel({
        id: fakeIdentifierMock.generateId(),
        identity: 'identity 1',
        passphrase: 'pass 1',
        path: '/old/path',
        filename: 'old-identity-file-1',
        isUse: false,
        insertDate: new Date(),
      });

      outputMystRunnerData = new RunnerModel<MystIdentityModel>({
        id: identifierMock.generateId(),
        serial: '0000000000000000000000000000000000000000000000000000000000000000',
        name: `${RunnerServiceEnum.MYST}-${inputModel.identity}`,
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        socketUri: '10.10.10.1',
        socketPort: 4449,
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputMystRunnerData.label = {
        $namespace: MystIdentityModel.name,
        identity: inputModel.identity,
      };

      outputMystAddData = new MystIdentityModel({
        id: inputModel.id,
        identity: inputModel.identity,
        passphrase: inputModel.passphrase,
        path: `${identityBasePath}${inputModel.identity}/`,
        filename: `${inputModel.identity}.json`,
        isUse: false,
        insertDate: new Date(),
      });
    });

    afterEach(() => {
      repositoryGetAllStub.mockClear();
    });

    it(`Should error add new identity when error on check identity is exist or not`, async () => {
      repositoryGetAllStub.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.add(inputModel);

      expect(repositoryGetAllStub).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>repositoryGetAllStub.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: inputModel.identity,
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error add new identity when identity is exist`, async () => {
      repositoryGetAllStub.mockResolvedValue([null, [outputMystExistData], 1]);

      const [error] = await repository.add(inputModel);

      expect(repositoryGetAllStub).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>repositoryGetAllStub.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: inputModel.identity,
      });
      expect(error).toBeInstanceOf(ExistException);
    });

    it(`Should error add new identity when move file`, async () => {
      repositoryGetAllStub.mockResolvedValue([null, [], 0]);
      mystIdentityFileRepository.moveAndRenameFile.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.add(inputModel);

      expect(repositoryGetAllStub).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>repositoryGetAllStub.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: inputModel.identity,
      });
      expect(mystIdentityFileRepository.moveAndRenameFile).toHaveBeenCalled();
      expect(mystIdentityFileRepository.moveAndRenameFile).toBeCalledWith(
        `${inputModel.path}${inputModel.filename}`,
        `${inputModel.identity}.json`,
      );
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error add new identity when check identity exist in database`, async () => {
      repositoryGetAllStub.mockResolvedValue([null, [], 0]);
      mystIdentityFileRepository.moveAndRenameFile.mockResolvedValue([
        null,
        `${identityBasePath}${inputModel.identity}/${inputModel.identity}.json`,
      ]);
      mystIdentityPgRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.add(inputModel);

      expect(repositoryGetAllStub).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>repositoryGetAllStub.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: inputModel.identity,
      });
      expect(mystIdentityFileRepository.moveAndRenameFile).toHaveBeenCalled();
      expect(mystIdentityFileRepository.moveAndRenameFile).toBeCalledWith(
        `${inputModel.path}${inputModel.filename}`,
        `${inputModel.identity}.json`,
      );
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>mystIdentityPgRepository.getAll.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: inputModel.identity,
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error add new identity when create identity in database (If identity not exist)`, async () => {
      repositoryGetAllStub.mockResolvedValue([null, [], 0]);
      mystIdentityFileRepository.moveAndRenameFile.mockResolvedValue([
        null,
        `${identityBasePath}${inputModel.identity}/${inputModel.identity}.json`,
      ]);
      mystIdentityPgRepository.getAll.mockResolvedValue([null, [], 0]);
      mystIdentityPgRepository.add.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.add(inputModel);

      expect(repositoryGetAllStub).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>repositoryGetAllStub.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: inputModel.identity,
      });
      expect(mystIdentityFileRepository.moveAndRenameFile).toHaveBeenCalled();
      expect(mystIdentityFileRepository.moveAndRenameFile).toBeCalledWith(
        `${inputModel.path}${inputModel.filename}`,
        `${inputModel.identity}.json`,
      );
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>mystIdentityPgRepository.getAll.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: inputModel.identity,
      });
      expect(mystIdentityPgRepository.add).toHaveBeenCalled();
      expect(mystIdentityPgRepository.add).toBeCalledWith(<MystIdentityModel>{
        id: fakeIdentifierMock.generateId(),
        identity: inputModel.identity,
        passphrase: inputModel.passphrase,
        path: `${identityBasePath}${inputModel.identity}/`,
        filename: `${inputModel.identity}.json`,
        isUse: false,
        insertDate: new Date(),
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error add new identity when get identity after exist error on add (If identity not exist)`, async () => {
      repositoryGetAllStub.mockResolvedValue([null, [], 0]);
      mystIdentityFileRepository.moveAndRenameFile.mockResolvedValue([
        null,
        `${identityBasePath}${inputModel.identity}/${inputModel.identity}.json`,
      ]);
      mystIdentityPgRepository.getAll
        .mockResolvedValueOnce([null, [], 0])
        .mockResolvedValueOnce([new UnknownException()]);
      mystIdentityPgRepository.add.mockResolvedValue([new ExistException()]);

      const [error] = await repository.add(inputModel);

      expect(repositoryGetAllStub).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>repositoryGetAllStub.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: inputModel.identity,
      });
      expect(mystIdentityFileRepository.moveAndRenameFile).toHaveBeenCalled();
      expect(mystIdentityFileRepository.moveAndRenameFile).toBeCalledWith(
        `${inputModel.path}${inputModel.filename}`,
        `${inputModel.identity}.json`,
      );
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalledTimes(2);
      expect((<FilterModel<MystIdentityModel>>mystIdentityPgRepository.getAll.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: inputModel.identity,
      });
      expect(mystIdentityPgRepository.add).toHaveBeenCalled();
      expect(mystIdentityPgRepository.add).toBeCalledWith(<MystIdentityModel>{
        id: fakeIdentifierMock.generateId(),
        identity: inputModel.identity,
        passphrase: inputModel.passphrase,
        path: `${identityBasePath}${inputModel.identity}/`,
        filename: `${inputModel.identity}.json`,
        isUse: false,
        insertDate: new Date(),
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error add new identity when not found identity after exist error on add (If identity not exist)`, async () => {
      repositoryGetAllStub.mockResolvedValue([null, [], 0]);
      mystIdentityFileRepository.moveAndRenameFile.mockResolvedValue([
        null,
        `${identityBasePath}${inputModel.identity}/${inputModel.identity}.json`,
      ]);
      mystIdentityPgRepository.getAll.mockResolvedValue([null, [], 0]);
      mystIdentityPgRepository.add.mockResolvedValue([new ExistException()]);

      const [error] = await repository.add(inputModel);

      expect(repositoryGetAllStub).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>repositoryGetAllStub.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: inputModel.identity,
      });
      expect(mystIdentityFileRepository.moveAndRenameFile).toHaveBeenCalled();
      expect(mystIdentityFileRepository.moveAndRenameFile).toBeCalledWith(
        `${inputModel.path}${inputModel.filename}`,
        `${inputModel.identity}.json`,
      );
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalledTimes(2);
      expect((<FilterModel<MystIdentityModel>>mystIdentityPgRepository.getAll.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: inputModel.identity,
      });
      expect(mystIdentityPgRepository.add).toHaveBeenCalled();
      expect(mystIdentityPgRepository.add).toBeCalledWith(<MystIdentityModel>{
        id: fakeIdentifierMock.generateId(),
        identity: inputModel.identity,
        passphrase: inputModel.passphrase,
        path: `${identityBasePath}${inputModel.identity}/`,
        filename: `${inputModel.identity}.json`,
        isUse: false,
        insertDate: new Date(),
      });
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toBeInstanceOf(NotFoundException);
    });

    it(`Should error add new identity when fail on check runner exist`, async () => {
      repositoryGetAllStub.mockResolvedValue([null, [], 0]);
      mystIdentityFileRepository.moveAndRenameFile.mockResolvedValue([
        null,
        `${identityBasePath}${inputModel.identity}/${inputModel.identity}.json`,
      ]);
      mystIdentityPgRepository.getAll.mockResolvedValue([null, [], 0]);
      mystIdentityPgRepository.add.mockResolvedValue([null, outputMystAddData]);
      dockerRunnerRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.add(inputModel);

      expect(repositoryGetAllStub).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>repositoryGetAllStub.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: inputModel.identity,
      });
      expect(mystIdentityFileRepository.moveAndRenameFile).toHaveBeenCalled();
      expect(mystIdentityFileRepository.moveAndRenameFile).toBeCalledWith(
        `${inputModel.path}${inputModel.filename}`,
        `${inputModel.identity}.json`,
      );
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>mystIdentityPgRepository.getAll.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: inputModel.identity,
      });
      expect(mystIdentityPgRepository.add).toHaveBeenCalled();
      expect(mystIdentityPgRepository.add).toBeCalledWith(<MystIdentityModel>{
        id: fakeIdentifierMock.generateId(),
        identity: inputModel.identity,
        passphrase: inputModel.passphrase,
        path: `${identityBasePath}${inputModel.identity}/`,
        filename: `${inputModel.identity}.json`,
        isUse: false,
        insertDate: new Date(),
      });
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {userIdentity: inputModel.identity},
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error add new identity when fail on check runner exist (Skipped add identity on database if myst exist already)`, async () => {
      repositoryGetAllStub.mockResolvedValue([null, [], 0]);
      mystIdentityFileRepository.moveAndRenameFile.mockResolvedValue([
        null,
        `${identityBasePath}${inputModel.identity}/${inputModel.identity}.json`,
      ]);
      mystIdentityPgRepository.getAll.mockResolvedValue([null, [outputMystExistData], 1]);
      dockerRunnerRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.add(inputModel);

      expect(repositoryGetAllStub).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>repositoryGetAllStub.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: inputModel.identity,
      });
      expect(mystIdentityFileRepository.moveAndRenameFile).toHaveBeenCalled();
      expect(mystIdentityFileRepository.moveAndRenameFile).toBeCalledWith(
        `${inputModel.path}${inputModel.filename}`,
        `${inputModel.identity}.json`,
      );
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>mystIdentityPgRepository.getAll.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: inputModel.identity,
      });
      expect(mystIdentityPgRepository.add).toHaveBeenCalledTimes(0);
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {userIdentity: inputModel.identity},
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error add new identity when fail on check runner exist (Skipped add identity on database when exit error on add)`, async () => {
      repositoryGetAllStub.mockResolvedValue([null, [], 0]);
      mystIdentityFileRepository.moveAndRenameFile.mockResolvedValue([
        null,
        `${identityBasePath}${inputModel.identity}/${inputModel.identity}.json`,
      ]);
      mystIdentityPgRepository.getAll
        .mockResolvedValueOnce([null, [], 0])
        .mockResolvedValueOnce([null, [outputMystExistData], 1]);
      mystIdentityPgRepository.add.mockResolvedValue([new ExistException()]);
      dockerRunnerRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.add(inputModel);

      expect(repositoryGetAllStub).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>repositoryGetAllStub.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: inputModel.identity,
      });
      expect(mystIdentityFileRepository.moveAndRenameFile).toHaveBeenCalled();
      expect(mystIdentityFileRepository.moveAndRenameFile).toBeCalledWith(
        `${inputModel.path}${inputModel.filename}`,
        `${inputModel.identity}.json`,
      );
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalledTimes(2);
      expect((<FilterModel<MystIdentityModel>>mystIdentityPgRepository.getAll.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: inputModel.identity,
      });
      expect(mystIdentityPgRepository.add).toHaveBeenCalled();
      expect(mystIdentityPgRepository.add).toBeCalledWith(<MystIdentityModel>{
        id: fakeIdentifierMock.generateId(),
        identity: inputModel.identity,
        passphrase: inputModel.passphrase,
        path: `${identityBasePath}${inputModel.identity}/`,
        filename: `${inputModel.identity}.json`,
        isUse: false,
        insertDate: new Date(),
      });
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {userIdentity: inputModel.identity},
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error add new identity when fail on remove exist runner`, async () => {
      repositoryGetAllStub.mockResolvedValue([null, [], 0]);
      mystIdentityFileRepository.moveAndRenameFile.mockResolvedValue([
        null,
        `${identityBasePath}${inputModel.identity}/${inputModel.identity}.json`,
      ]);
      mystIdentityPgRepository.getAll.mockResolvedValue([null, [], 0]);
      mystIdentityPgRepository.add.mockResolvedValue([null, outputMystAddData]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [outputMystRunnerData], 1]);
      dockerRunnerRepository.remove.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.add(inputModel);

      expect(repositoryGetAllStub).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>repositoryGetAllStub.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: inputModel.identity,
      });
      expect(mystIdentityFileRepository.moveAndRenameFile).toHaveBeenCalled();
      expect(mystIdentityFileRepository.moveAndRenameFile).toBeCalledWith(
        `${inputModel.path}${inputModel.filename}`,
        `${inputModel.identity}.json`,
      );
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>mystIdentityPgRepository.getAll.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: inputModel.identity,
      });
      expect(mystIdentityPgRepository.add).toHaveBeenCalled();
      expect(mystIdentityPgRepository.add).toBeCalledWith(<MystIdentityModel>{
        id: fakeIdentifierMock.generateId(),
        identity: inputModel.identity,
        passphrase: inputModel.passphrase,
        path: `${identityBasePath}${inputModel.identity}/`,
        filename: `${inputModel.identity}.json`,
        isUse: false,
        insertDate: new Date(),
      });
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {userIdentity: inputModel.identity},
      });
      expect(dockerRunnerRepository.remove).toHaveBeenCalled();
      expect(dockerRunnerRepository.remove).toHaveBeenCalledWith(outputMystRunnerData.id);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error add new identity when create identity runner`, async () => {
      repositoryGetAllStub.mockResolvedValue([null, [], 0]);
      mystIdentityFileRepository.moveAndRenameFile.mockResolvedValue([
        null,
        `${identityBasePath}${inputModel.identity}/${inputModel.identity}.json`,
      ]);
      mystIdentityPgRepository.getAll.mockResolvedValue([null, [], 0]);
      mystIdentityPgRepository.add.mockResolvedValue([null, outputMystAddData]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);
      dockerRunnerRepository.create.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.add(inputModel);

      expect(repositoryGetAllStub).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>repositoryGetAllStub.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: inputModel.identity,
      });
      expect(mystIdentityFileRepository.moveAndRenameFile).toHaveBeenCalled();
      expect(mystIdentityFileRepository.moveAndRenameFile).toBeCalledWith(
        `${inputModel.path}${inputModel.filename}`,
        `${inputModel.identity}.json`,
      );
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>mystIdentityPgRepository.getAll.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: inputModel.identity,
      });
      expect(mystIdentityPgRepository.add).toHaveBeenCalled();
      expect(mystIdentityPgRepository.add).toBeCalledWith(<MystIdentityModel>{
        id: fakeIdentifierMock.generateId(),
        identity: inputModel.identity,
        passphrase: inputModel.passphrase,
        path: `${identityBasePath}${inputModel.identity}/`,
        filename: `${inputModel.identity}.json`,
        isUse: false,
        insertDate: new Date(),
      });
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {userIdentity: inputModel.identity},
      });
      expect(dockerRunnerRepository.create).toHaveBeenCalled();
      expect(dockerRunnerRepository.create).toBeCalledWith(<RunnerModel<MystIdentityModel>>{
        id: fakeIdentifierMock.generateId(),
        serial: '0000000000000000000000000000000000000000000000000000000000000000',
        name: `${RunnerServiceEnum.MYST}-${inputModel.identity}`,
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        label: {
          $namespace: MystIdentityModel.name,
          id: outputMystAddData.id,
          identity: inputModel.identity,
          passphrase: inputModel.passphrase,
        },
        status: RunnerStatusEnum.CREATING,
        insertDate: new Date(),
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully add new identity`, async () => {
      repositoryGetAllStub.mockResolvedValue([null, [], 0]);
      mystIdentityFileRepository.moveAndRenameFile.mockResolvedValue([
        null,
        `${identityBasePath}${inputModel.identity}/${inputModel.identity}.json`,
      ]);
      mystIdentityPgRepository.getAll.mockResolvedValue([null, [], 0]);
      mystIdentityPgRepository.add.mockResolvedValue([null, outputMystAddData]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);
      dockerRunnerRepository.create.mockResolvedValue([null]);

      const [error, result] = await repository.add(inputModel);

      expect(repositoryGetAllStub).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>repositoryGetAllStub.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: inputModel.identity,
      });
      expect(mystIdentityFileRepository.moveAndRenameFile).toHaveBeenCalled();
      expect(mystIdentityFileRepository.moveAndRenameFile).toBeCalledWith(
        `${inputModel.path}${inputModel.filename}`,
        `${inputModel.identity}.json`,
      );
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<MystIdentityModel>>mystIdentityPgRepository.getAll.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: inputModel.identity,
      });
      expect(mystIdentityPgRepository.add).toHaveBeenCalled();
      expect(mystIdentityPgRepository.add).toBeCalledWith(<MystIdentityModel>{
        id: fakeIdentifierMock.generateId(),
        identity: inputModel.identity,
        passphrase: inputModel.passphrase,
        path: `${identityBasePath}${inputModel.identity}/`,
        filename: `${inputModel.identity}.json`,
        isUse: false,
        insertDate: new Date(),
      });
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {userIdentity: inputModel.identity},
      });
      expect(dockerRunnerRepository.create).toHaveBeenCalled();
      expect(dockerRunnerRepository.create).toBeCalledWith(<RunnerModel<MystIdentityModel>>{
        id: fakeIdentifierMock.generateId(),
        serial: '0000000000000000000000000000000000000000000000000000000000000000',
        name: `${RunnerServiceEnum.MYST}-${inputModel.identity}`,
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        label: {
          $namespace: MystIdentityModel.name,
          id: outputMystAddData.id,
          identity: inputModel.identity,
          passphrase: inputModel.passphrase,
        },
        status: RunnerStatusEnum.CREATING,
        insertDate: new Date(),
      });
      expect(error).toBeNull();
      expect(result).toMatchObject(<MystIdentityModel>{
        id: fakeIdentifierMock.generateId(),
        identity: inputModel.identity,
        passphrase: inputModel.passphrase,
        path: `${identityBasePath}${inputModel.identity}/`,
        filename: `${inputModel.identity}.json`,
        isUse: false,
        insertDate: new Date(),
      });
    });
  });

  describe(`Update identity`, () => {
    let inputModel: UpdateModel<MystIdentityModel>;

    beforeEach(() => {
      inputModel = new UpdateModel<MystIdentityModel>(identifierMock.generateId(), {passphrase: 'new password'});
    });

    it(`Should successfully update identity`, async () => {
      const [error, result] = await repository.update<UpdateModel<MystIdentityModel>>(inputModel);

      expect(error).toBeNull();
      expect(result).toBeNull();
    });
  });

  // describe(`Remove identity by id`, () => {
  //   let repositoryGetByIdStub: jest.SpyInstance;
  //   let inputId: string;
  //   let identityBasePath: string;
  //   let outputIdentityData: MystIdentityModel;
  //   let outputIdentityPgData: MystIdentityModel;
  //   let outputRunnerMystData1: RunnerModel<VpnProviderModel>;
  //   let outputFileData1: string;
  //   let outputFileNotMatchData2: string;
  //
  //   beforeEach(() => {
  //     repositoryGetByIdStub = jest.spyOn(repository, 'getById');
  //
  //     inputId = identifierMock.generateId();
  //
  //     identityBasePath = '/new/path/';
  //
  //     outputIdentityData = new MystIdentityModel({
  //       id: inputId,
  //       identity: 'identity-1',
  //       passphrase: 'pass 1',
  //       path: `${identityBasePath}identity-1/`,
  //       filename: 'identity-1.json',
  //       isUse: false,
  //       insertDate: new Date(),
  //     });
  //
  //     outputRunnerMystData1 = new RunnerModel({
  //       id: '55555555-5555-5555-5555-555555555555',
  //       serial: 'myst1 runner serial',
  //       name: 'myst1 runner name',
  //       service: RunnerServiceEnum.MYST,
  //       exec: RunnerExecEnum.DOCKER,
  //       socketType: RunnerSocketTypeEnum.HTTP,
  //       label: <RunnerObjectLabel<VpnProviderModel>>{
  //         $namespace: VpnProviderModel.name,
  //         userIdentity: outputIdentityData.identity,
  //       },
  //       status: RunnerStatusEnum.RUNNING,
  //       insertDate: new Date(),
  //     });
  //
  //     outputIdentityPgData = new MystIdentityModel({
  //       id: inputId,
  //       identity: 'identity-1',
  //       passphrase: 'pass 1',
  //       path: `${identityBasePath}identity-1/`,
  //       filename: '-',
  //       isUse: false,
  //       insertDate: new Date(),
  //     });
  //
  //     outputFileData1 = `${identityBasePath}identity-1/identity-1.json`;
  //     outputFileNotMatchData2 = `${identityBasePath}identity-not-match/not-match.json`;
  //   });
  //
  //   afterEach(() => {
  //     repositoryGetByIdStub.mockClear();
  //   });
  //
  //   it(`Should error remove by id when get identity by id`, async () => {
  //     repositoryGetByIdStub.mockResolvedValue([new UnknownException()]);
  //
  //     const [error] = await repository.remove(inputId);
  //
  //     expect(repositoryGetByIdStub).toHaveBeenCalled();
  //     expect(error).toBeInstanceOf(UnknownException);
  //   });
  //
  //   it(`Should error remove by id when error in get myst runner id`, async () => {
  //     repositoryGetByIdStub.mockResolvedValue([null, outputIdentityData]);
  //     dockerRunnerRepository.getAll.mockResolvedValue([new UnknownException()]);
  //
  //     const [error] = await repository.remove(inputId);
  //
  //     expect(repositoryGetByIdStub).toHaveBeenCalled();
  //     expect(repositoryGetByIdStub).toHaveBeenCalledWith(inputId);
  //     expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
  //     expect((<FilterModel<RunnerModel<VpnProviderModel>>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
  //       $opr: 'eq',
  //       service: RunnerServiceEnum.MYST,
  //     });
  //     expect((<FilterModel<RunnerModel<VpnProviderModel>>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
  //       $opr: 'eq',
  //       label: <VpnProviderModel>{
  //         userIdentity: outputIdentityData.identity,
  //       },
  //     });
  //     expect(error).toBeInstanceOf(UnknownException);
  //   });
  //
  //   it(`Should error remove by id when error in one of task`, async () => {
  //     repositoryGetByIdStub.mockResolvedValue([null, outputIdentityData]);
  //     dockerRunnerRepository.getAll.mockResolvedValue([null, [outputRunnerMystData1], 1]);
  //     mystIdentityPgRepository.remove.mockResolvedValue([null]);
  //     mystIdentityFileRepository.remove.mockResolvedValue([new UnknownException()]);
  //     dockerRunnerRepository.remove.mockResolvedValue([null]);
  //
  //     const [error] = await repository.remove(inputId);
  //
  //     expect(repositoryGetByIdStub).toHaveBeenCalled();
  //     expect(repositoryGetByIdStub).toHaveBeenCalledWith(inputId);
  //     expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
  //     expect((<FilterModel<RunnerModel<VpnProviderModel>>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
  //       $opr: 'eq',
  //       service: RunnerServiceEnum.MYST,
  //     });
  //     expect((<FilterModel<RunnerModel<VpnProviderModel>>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
  //       $opr: 'eq',
  //       label: <VpnProviderModel>{
  //         userIdentity: outputIdentityData.identity,
  //       },
  //     });
  //     expect(mystIdentityPgRepository.remove).toHaveBeenCalled();
  //     expect(mystIdentityPgRepository.remove).toHaveBeenCalledWith(inputId);
  //     expect(mystIdentityFileRepository.remove).toHaveBeenCalled();
  //     expect(mystIdentityFileRepository.remove).toHaveBeenCalledWith(`${outputIdentityData.path}${outputIdentityData.filename}`);
  //     expect(dockerRunnerRepository.remove).toHaveBeenCalled();
  //     expect(dockerRunnerRepository.remove).toHaveBeenCalledWith(outputRunnerMystData1.id);
  //     expect(error).toBeInstanceOf(UnknownException);
  //   });
  //
  //   it(`Should successfully remove by id (find identity with id)`, async () => {
  //     repositoryGetByIdStub.mockResolvedValue([null, outputIdentityData]);
  //     dockerRunnerRepository.getAll.mockResolvedValue([null, [outputRunnerMystData1], 1]);
  //     mystIdentityPgRepository.remove.mockResolvedValue([null]);
  //     mystIdentityFileRepository.remove.mockResolvedValue([null]);
  //     dockerRunnerRepository.remove.mockResolvedValue([null]);
  //
  //     const [error] = await repository.remove(inputId);
  //
  //     expect(repositoryGetByIdStub).toHaveBeenCalled();
  //     expect(repositoryGetByIdStub).toHaveBeenCalledWith(inputId);
  //     expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
  //     expect((<FilterModel<RunnerModel<VpnProviderModel>>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
  //       $opr: 'eq',
  //       service: RunnerServiceEnum.MYST,
  //     });
  //     expect((<FilterModel<RunnerModel<VpnProviderModel>>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
  //       $opr: 'eq',
  //       label: <VpnProviderModel>{
  //         userIdentity: outputIdentityData.identity,
  //       },
  //     });
  //     expect(mystIdentityPgRepository.remove).toHaveBeenCalled();
  //     expect(mystIdentityPgRepository.remove).toHaveBeenCalledWith(inputId);
  //     expect(mystIdentityFileRepository.remove).toHaveBeenCalled();
  //     expect(mystIdentityFileRepository.remove).toHaveBeenCalledWith(`${outputIdentityData.path}${outputIdentityData.filename}`);
  //     expect(dockerRunnerRepository.remove).toHaveBeenCalled();
  //     expect(dockerRunnerRepository.remove).toHaveBeenCalledWith(outputRunnerMystData1.id);
  //     expect(error).toBeNull();
  //   });
  //
  //   it(`Should error remove by id when fetch identity from database (can't found identity with id)`, async () => {
  //     repositoryGetByIdStub.mockResolvedValue([null, null]);
  //     mystIdentityPgRepository.getById.mockResolvedValue([new UnknownException()]);
  //
  //     const [error] = await repository.remove(inputId);
  //
  //     expect(repositoryGetByIdStub).toHaveBeenCalled();
  //     expect(repositoryGetByIdStub).toHaveBeenCalledWith(inputId);
  //     expect(mystIdentityPgRepository.getById).toHaveBeenCalled();
  //     expect(error).toBeInstanceOf(UnknownException);
  //   });
  //
  //   it(`Should successfully remove by id and return null when not find any identity on database (can't find identity with id)`, async () => {
  //     repositoryGetByIdStub.mockResolvedValue([null, null]);
  //     mystIdentityPgRepository.getById.mockResolvedValue([null, null]);
  //
  //     const [error] = await repository.remove(inputId);
  //
  //     expect(repositoryGetByIdStub).toHaveBeenCalled();
  //     expect(repositoryGetByIdStub).toHaveBeenCalledWith(inputId);
  //     expect(mystIdentityPgRepository.getById).toHaveBeenCalled();
  //     expect(error).toBeNull();
  //   });
  //
  //   it(`Should error remove by id when fail get all file (can't find identity with id)`, async () => {
  //     repositoryGetByIdStub.mockResolvedValue([null, null]);
  //     mystIdentityPgRepository.getById.mockResolvedValue([null, outputIdentityPgData]);
  //     mystIdentityFileRepository.getAll.mockResolvedValue([new UnknownException()]);
  //
  //     const [error] = await repository.remove(inputId);
  //
  //     expect(repositoryGetByIdStub).toHaveBeenCalled();
  //     expect(repositoryGetByIdStub).toHaveBeenCalledWith(inputId);
  //     expect(mystIdentityPgRepository.getById).toHaveBeenCalled();
  //     expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
  //     expect(error).toBeInstanceOf(UnknownException);
  //   });
  //
  //   it(`Should successfully remove by id and return null when not find any identity on filesystem (can't find identity with id)`, async () => {
  //     repositoryGetByIdStub.mockResolvedValue([null, null]);
  //     mystIdentityPgRepository.getById.mockResolvedValue([null, outputIdentityPgData]);
  //     mystIdentityFileRepository.getAll.mockResolvedValue([null, [], 0]);
  //
  //     const [error] = await repository.remove(inputId);
  //
  //     expect(repositoryGetByIdStub).toHaveBeenCalled();
  //     expect(repositoryGetByIdStub).toHaveBeenCalledWith(inputId);
  //     expect(mystIdentityPgRepository.getById).toHaveBeenCalled();
  //     expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
  //     expect(error).toBeNull();
  //   });
  //
  //   it(`Should successfully remove by id and return null when not match any identity with file data (can't find identity with id)`, async () => {
  //     repositoryGetByIdStub.mockResolvedValue([null, null]);
  //     mystIdentityPgRepository.getById.mockResolvedValue([null, outputIdentityPgData]);
  //     mystIdentityFileRepository.getAll.mockResolvedValue([null, [outputFileNotMatchData2], 1]);
  //
  //     const [error] = await repository.remove(inputId);
  //
  //     expect(repositoryGetByIdStub).toHaveBeenCalled();
  //     expect(repositoryGetByIdStub).toHaveBeenCalledWith(inputId);
  //     expect(mystIdentityPgRepository.getById).toHaveBeenCalled();
  //     expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
  //     expect(error).toBeNull();
  //   });
  //
  //   it(`Should error remove by id when get myst runner info (can't find identity with id)`, async () => {
  //     repositoryGetByIdStub.mockResolvedValue([null, null]);
  //     mystIdentityPgRepository.getById.mockResolvedValue([null, outputIdentityPgData]);
  //     mystIdentityFileRepository.getAll.mockResolvedValue([null, [outputFileData1, outputFileNotMatchData2], 2]);
  //     dockerRunnerRepository.getAll.mockResolvedValue([new UnknownException()]);
  //
  //     const [error] = await repository.remove(inputId);
  //
  //     expect(repositoryGetByIdStub).toHaveBeenCalled();
  //     expect(repositoryGetByIdStub).toHaveBeenCalledWith(inputId);
  //     expect(mystIdentityPgRepository.getById).toHaveBeenCalled();
  //     expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
  //     expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
  //     expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
  //     expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
  //       $opr: 'eq',
  //       service: RunnerServiceEnum.MYST,
  //     });
  //     expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('volumes')).toMatchObject({
  //       $opr: 'eq',
  //       volumes: [{source: outputIdentityPgData.path}],
  //     });
  //     expect(error).toBeInstanceOf(UnknownException);
  //   });
  //
  //   it(`Should error remove by id when fail remove file after not find any runner (can't find identity with id)`, async () => {
  //     repositoryGetByIdStub.mockResolvedValue([null, null]);
  //     mystIdentityPgRepository.getById.mockResolvedValue([null, outputIdentityPgData]);
  //     mystIdentityFileRepository.getAll.mockResolvedValue([null, [outputFileData1, outputFileNotMatchData2], 2]);
  //     dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);
  //     mystIdentityFileRepository.remove.mockResolvedValue([new UnknownException()]);
  //
  //     const [error] = await repository.remove(inputId);
  //
  //     expect(repositoryGetByIdStub).toHaveBeenCalled();
  //     expect(repositoryGetByIdStub).toHaveBeenCalledWith(inputId);
  //     expect(mystIdentityPgRepository.getById).toHaveBeenCalled();
  //     expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
  //     expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
  //     expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
  //     expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
  //       $opr: 'eq',
  //       service: RunnerServiceEnum.MYST,
  //     });
  //     expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('volumes')).toMatchObject({
  //       $opr: 'eq',
  //       volumes: [{source: outputIdentityPgData.path}],
  //     });
  //     expect(mystIdentityFileRepository.remove).toHaveBeenCalled();
  //     expect(mystIdentityFileRepository.remove).toHaveBeenCalledWith(`${outputFileData1}`);
  //     expect(error).toBeInstanceOf(UnknownException);
  //   });
  //
  //   it(`Should error remove by id when fail remove runner (can't find identity with id)`, async () => {
  //     repositoryGetByIdStub.mockResolvedValue([null, null]);
  //     mystIdentityPgRepository.getById.mockResolvedValue([null, outputIdentityPgData]);
  //     mystIdentityFileRepository.getAll.mockResolvedValue([null, [outputFileData1, outputFileNotMatchData2], 2]);
  //     dockerRunnerRepository.getAll.mockResolvedValue([null, [outputRunnerMystData1], 1]);
  //     dockerRunnerRepository.remove.mockResolvedValue([new UnknownException()]);
  //
  //     const [error] = await repository.remove(inputId);
  //
  //     expect(repositoryGetByIdStub).toHaveBeenCalled();
  //     expect(repositoryGetByIdStub).toHaveBeenCalledWith(inputId);
  //     expect(mystIdentityPgRepository.getById).toHaveBeenCalled();
  //     expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
  //     expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
  //     expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
  //     expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
  //       $opr: 'eq',
  //       service: RunnerServiceEnum.MYST,
  //     });
  //     expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('volumes')).toMatchObject({
  //       $opr: 'eq',
  //       volumes: [{source: outputIdentityPgData.path}],
  //     });
  //     expect(dockerRunnerRepository.remove).toHaveBeenCalled();
  //     expect(dockerRunnerRepository.remove).toHaveBeenCalledWith(outputRunnerMystData1.id);
  //     expect(error).toBeInstanceOf(UnknownException);
  //   });
  //
  //   it(`Should successfully remove by id (can't find identity with id)`, async () => {
  //     repositoryGetByIdStub.mockResolvedValue([null, null]);
  //     mystIdentityPgRepository.getById.mockResolvedValue([null, outputIdentityPgData]);
  //     mystIdentityFileRepository.getAll.mockResolvedValue([null, [outputFileData1, outputFileNotMatchData2], 2]);
  //     dockerRunnerRepository.getAll.mockResolvedValue([null, [outputRunnerMystData1], 1]);
  //     dockerRunnerRepository.remove.mockResolvedValue([null]);
  //     mystIdentityFileRepository.remove.mockResolvedValue([null]);
  //
  //     const [error] = await repository.remove(inputId);
  //
  //     expect(repositoryGetByIdStub).toHaveBeenCalled();
  //     expect(repositoryGetByIdStub).toHaveBeenCalledWith(inputId);
  //     expect(mystIdentityPgRepository.getById).toHaveBeenCalled();
  //     expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
  //     expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
  //     expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
  //     expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
  //       $opr: 'eq',
  //       service: RunnerServiceEnum.MYST,
  //     });
  //     expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('volumes')).toMatchObject({
  //       $opr: 'eq',
  //       volumes: [{source: outputIdentityPgData.path}],
  //     });
  //     expect(dockerRunnerRepository.remove).toHaveBeenCalled();
  //     expect(dockerRunnerRepository.remove).toHaveBeenCalledWith(outputRunnerMystData1.id);
  //     expect(dockerRunnerRepository.remove).toHaveBeenCalled();
  //     expect(dockerRunnerRepository.remove).toHaveBeenCalledWith(outputRunnerMystData1.id);
  //     expect(error).toBeNull();
  //   });
  // });
});
