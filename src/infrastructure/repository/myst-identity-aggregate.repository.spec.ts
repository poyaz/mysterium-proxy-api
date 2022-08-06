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
  RunnerExecEnum,
  RunnerModel,
  RunnerObjectLabel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum, RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {UnknownException} from '@src-core/exception/unknown.exception';

describe('MystIdentityAggregateRepository', () => {
  let repository: MystIdentityAggregateRepository;
  let mystIdentityFileRepository: MockProxy<IAccountIdentityFileRepository>;
  let mystIdentityPgRepository: MockProxy<IGenericRepositoryInterface<MystIdentityModel>>;
  let dockerRunnerRepository: MockProxy<IRunnerRepositoryInterface>;
  let identifierMock: MockProxy<IIdentifier>;
  let fakeIdentifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    mystIdentityFileRepository = mock<IAccountIdentityFileRepository>();
    mystIdentityPgRepository = mock<IGenericRepositoryInterface<MystIdentityModel>>();
    dockerRunnerRepository = mock<IRunnerRepositoryInterface>();

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
          provide: MystIdentityAggregateRepository,
          inject: [
            ProviderTokenEnum.MYST_IDENTITY_FILE_REPOSITORY,
            ProviderTokenEnum.MYST_IDENTITY_PG_REPOSITORY,
            ProviderTokenEnum.DOCKER_RUNNER_REPOSITORY,
          ],
          useFactory: (
            mystIdentityFileRepository: IAccountIdentityFileRepository,
            mystIdentityPgRepository: IGenericRepositoryInterface<MystIdentityModel>,
            dockerRunnerRepository: IRunnerRepositoryInterface,
          ) =>
            new MystIdentityAggregateRepository(
              mystIdentityFileRepository,
              mystIdentityPgRepository,
              dockerRunnerRepository,
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
    let outputRunnerMystData1: RunnerModel<VpnProviderModel>;
    let outputRunnerMystData2: RunnerModel<VpnProviderModel>;
    let outputRunnerMystNotMatchData3: RunnerModel<VpnProviderModel>;

    beforeEach(() => {
      inputPaginationFilter = new FilterModel<MystIdentityModel>({page: 2, limit: 1});

      inputIdentityFilter = new FilterModel<MystIdentityModel>();
      inputIdentityFilter.addCondition({$opr: 'eq', identity: 'identity-1'});

      inputIsUseFilter = new FilterModel<MystIdentityModel>({page: 2, limit: 1});
      inputIsUseFilter.addCondition({$opr: 'eq', isUse: true});

      outputFileData1 = '/path/identity-1.json';
      outputFileData2 = '/path/identity-2.json';
      outputFileData3 = '/path/identity-3.json';
      outputFileNotMatchData4 = '/path/not-match.json';

      outputIdentityData1 = new MystIdentityModel({
        id: '11111111-1111-1111-1111-111111111111',
        identity: 'identity-1',
        passphrase: 'pass 1',
        path: '-',
        filename: 'identity-1',
        isUse: false,
        insertDate: new Date(),
      });
      outputIdentityData2 = new MystIdentityModel({
        id: '22222222-2222-2222-2222-222222222222',
        identity: 'identity-2',
        passphrase: 'pass 2',
        path: '-',
        filename: 'identity-2',
        isUse: false,
        insertDate: new Date(),
      });
      outputIdentityData3 = new MystIdentityModel({
        id: '33333333-3333-3333-3333-333333333333',
        identity: 'identity-3',
        passphrase: 'pass 3',
        path: '-',
        filename: 'identity-3',
        isUse: false,
        insertDate: new Date(),
      });
      outputIdentityData4 = new MystIdentityModel({
        id: '44444444-4444-4444-4444-444444444444',
        identity: 'identity-4',
        passphrase: 'pass 4',
        path: '-',
        filename: 'identity-4',
        isUse: false,
        insertDate: new Date(),
      });

      outputRunnerMystData1 = new RunnerModel({
        id: '55555555-5555-5555-5555-555555555555',
        serial: 'myst1 runner serial',
        name: 'myst1 runner name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        label: <RunnerObjectLabel<VpnProviderModel>>{
          $namespace: VpnProviderModel.name,
          userIdentity: outputIdentityData1.identity,
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
          userIdentity: outputIdentityData2.identity,
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
          userIdentity: 'identity 7',
        },
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
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
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
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
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
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
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
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
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
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
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
      expect(error).toBeNull();
      expect(result.length).toEqual(0);
      expect(totalCount).toEqual(0);
    });

    it(`Should successfully get all identity for aggregation (join file data with 'isUse' false because not found any runner)`, async () => {
      mystIdentityFileRepository.getAll.mockResolvedValue([null, [outputFileData1], 1]);
      mystIdentityPgRepository.getAll.mockResolvedValue([null, [outputIdentityData1], 1]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result, totalCount] = await repository.getAll(new FilterModel());

      expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
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

    it(`Should successfully get all identity for aggregation with pagination (join file data with 'isUse' false because not found any runner)`, async () => {
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
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result, totalCount] = await repository.getAll(inputPaginationFilter);

      expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
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
      expect(totalCount).toEqual(3);
    });

    it(`Should successfully get all identity for aggregation with 'identity' filter (join file data with 'isUse' false because not found any runner)`, async () => {
      mystIdentityFileRepository.getAll.mockResolvedValue([
        null,
        [outputFileData1, outputFileData2, outputFileData3, outputFileNotMatchData4],
        4,
      ]);
      mystIdentityPgRepository.getAll.mockResolvedValue([null, [outputIdentityData1], 1]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result, totalCount] = await repository.getAll(inputIdentityFilter);

      expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect((<FilterModel<MystIdentityModel>>mystIdentityPgRepository.getAll.mock.calls[0][0]).getCondition('identity')).toMatchObject({
        $opr: 'eq',
        identity: outputIdentityData1.identity,
      });
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
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

    it(`Should successfully get all identity for aggregation with 'isUse' filter (join file data with 'isUse' false because not found any runner)`, async () => {
      mystIdentityFileRepository.getAll.mockResolvedValue([
        null,
        [outputFileData1, outputFileData2, outputFileData3, outputFileNotMatchData4],
        4,
      ]);
      mystIdentityPgRepository.getAll.mockResolvedValue([null, [outputIdentityData1], 1]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result, totalCount] = await repository.getAll(inputIsUseFilter);

      expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect((<FilterModel<MystIdentityModel>>mystIdentityPgRepository.getAll.mock.calls[0][0]).getCondition('isUse')).toMatchObject({
        $opr: 'eq',
        isUse: true,
      });
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
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
        [outputRunnerMystData1, outputRunnerMystData2, outputRunnerMystNotMatchData3],
        3,
      ]);

      const [error, result, totalCount] = await repository.getAll(inputPaginationFilter);

      expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
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
      expect(totalCount).toEqual(3);
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
        [outputRunnerMystData1, outputRunnerMystData2, outputRunnerMystNotMatchData3],
        3,
      ]);

      const [error, result, totalCount] = await repository.getAll(inputIsUseFilter);

      expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toHaveBeenCalled();
      expect(mystIdentityPgRepository.getAll).toBeCalledWith(expect.objectContaining({skipPagination: true}));
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
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
    let outputFileData1: string;
    let outputFileNotMatchData2: string;
    let outputIdentityData: MystIdentityModel;
    let outputRunnerMystData1: RunnerModel<VpnProviderModel>;
    let outputRunnerMystNotMatchData2: RunnerModel<VpnProviderModel>;

    beforeEach(() => {
      inputId = identifierMock.generateId();

      outputFileData1 = '/path/identity-1.json';
      outputFileNotMatchData2 = '/path/not-match.json';

      outputIdentityData = new MystIdentityModel({
        id: '11111111-1111-1111-1111-111111111111',
        identity: 'identity-1',
        passphrase: 'pass 1',
        path: '-',
        filename: 'identity-1',
        isUse: false,
        insertDate: new Date(),
      });

      outputRunnerMystData1 = new RunnerModel({
        id: '55555555-5555-5555-5555-555555555555',
        serial: 'myst1 runner serial',
        name: 'myst1 runner name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        label: <RunnerObjectLabel<VpnProviderModel>>{
          $namespace: VpnProviderModel.name,
          userIdentity: outputIdentityData.identity,
        },
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
      outputRunnerMystNotMatchData2 = new RunnerModel({
        id: '77777777-7777-7777-7777-777777777777',
        serial: 'myst3 runner serial',
        name: 'myst3 runner name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        label: <RunnerObjectLabel<VpnProviderModel>>{
          $namespace: VpnProviderModel.name,
          userIdentity: 'identity 7',
        },
        status: RunnerStatusEnum.RUNNING,
        insertDate: new Date(),
      });
    });

    it(`Should error get identity with id for aggregation when fetch identity`, async () => {
      mystIdentityPgRepository.getById.mockResolvedValue([new UnknownException()]);

      const [error] = await repository.getById(inputId);

      expect(mystIdentityPgRepository.getById).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get identity for aggregation and return null when can't found identity with id`, async () => {
      mystIdentityPgRepository.getById.mockResolvedValue([null, null]);

      const [error, result] = await repository.getById(inputId);

      expect(mystIdentityPgRepository.getById).toHaveBeenCalled();
      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it(`Should error get identity for aggregation when fail on get all data from file`, async () => {
      mystIdentityPgRepository.getById.mockResolvedValue([null, outputIdentityData]);
      mystIdentityFileRepository.getAll.mockResolvedValue([new UnknownException()]);
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error] = await repository.getById(inputId);

      expect(mystIdentityPgRepository.getById).toHaveBeenCalled();
      expect(mystIdentityFileRepository.getAll).toHaveBeenCalled();
      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('service')).toMatchObject({
        $opr: 'eq',
        service: RunnerServiceEnum.MYST,
      });
      expect((<FilterModel<RunnerModel>>dockerRunnerRepository.getAll.mock.calls[0][0]).getCondition('label')).toMatchObject({
        $opr: 'eq',
        label: {
          userIdentity: outputIdentityData.identity,
        },
      });
      expect(error).toBeInstanceOf(UnknownException);
    });
  });
});
