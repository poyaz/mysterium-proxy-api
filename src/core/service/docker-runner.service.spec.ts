import {Test, TestingModule} from '@nestjs/testing';
import {DockerRunnerService} from './docker-runner.service';
import {mock, MockProxy} from 'jest-mock-extended';
import {IRunnerRepositoryInterface} from '@src-core/interface/i-runner-repository.interface';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {FilterModel} from '@src-core/model/filter.model';
import {
  RunnerExecEnum,
  RunnerModel,
  RunnerObjectLabel,
  RunnerServiceEnum,
  RunnerSocketTypeEnum, RunnerStatusEnum,
} from '@src-core/model/runner.model';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';

describe('DockerRunnerService', () => {
  let service: DockerRunnerService;
  let dockerRunnerRepository: MockProxy<IRunnerRepositoryInterface>;
  let identifierMock: MockProxy<IIdentifier>;
  let fakeIdentifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    dockerRunnerRepository = mock<IRunnerRepositoryInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    fakeIdentifierMock = mock<IIdentifier>();
    fakeIdentifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProviderTokenEnum.DOCKER_RUNNER_REPOSITORY,
          useValue: dockerRunnerRepository,
        },
        {
          provide: DockerRunnerService,
          inject: [ProviderTokenEnum.DOCKER_RUNNER_REPOSITORY],
          useFactory: (dockerRunnerRepository: MockProxy<IRunnerRepositoryInterface>) =>
            new DockerRunnerService(dockerRunnerRepository),
        },
      ],
    }).compile();

    service = module.get<DockerRunnerService>(DockerRunnerService);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe(`Find all docker service`, () => {
    let filterModel: FilterModel<RunnerModel>;

    beforeEach(() => {
      filterModel = new FilterModel<RunnerModel>();
    });

    it(`Should error get all docker service when fetch data`, async () => {
      dockerRunnerRepository.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await service.findAll(filterModel);

      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get all docker service`, async () => {
      dockerRunnerRepository.getAll.mockResolvedValue([null, [], 0]);

      const [error, result, totalCount] = await service.findAll(filterModel);

      expect(dockerRunnerRepository.getAll).toHaveBeenCalled();
      expect(error).toBeNull();
      expect(result.length).toEqual(0);
      expect(totalCount).toEqual(0);
    });
  });

  describe(`Create new docker service`, () => {
    let inputRunnerModel: RunnerModel;
    let outputRunnerModel: RunnerModel;

    beforeEach(() => {
      inputRunnerModel = new RunnerModel({
        id: fakeIdentifierMock.generateId(),
        serial: 'runner serial',
        name: 'runner name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        status: RunnerStatusEnum.CREATING,
        insertDate: new Date(),
      });

      outputRunnerModel = new RunnerModel({
        id: identifierMock.generateId(),
        serial: 'runner serial',
        name: 'runner name',
        service: RunnerServiceEnum.MYST,
        exec: RunnerExecEnum.DOCKER,
        socketType: RunnerSocketTypeEnum.HTTP,
        status: RunnerStatusEnum.CREATING,
        insertDate: new Date(),
      });
    });

    it(`Should error create docker service`, async () => {
      dockerRunnerRepository.create.mockResolvedValue([new UnknownException()]);

      const [error] = await service.create(inputRunnerModel);

      expect(dockerRunnerRepository.create).toHaveBeenCalled();
      expect(dockerRunnerRepository.create).toBeCalledWith(expect.objectContaining({
        id: fakeIdentifierMock.generateId(),
      }));
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully create docker service`, async () => {
      dockerRunnerRepository.create.mockResolvedValue([null, outputRunnerModel]);

      const [error, result] = await service.create(inputRunnerModel);

      expect(dockerRunnerRepository.create).toHaveBeenCalled();
      expect(dockerRunnerRepository.create).toBeCalledWith(expect.objectContaining({
        id: fakeIdentifierMock.generateId(),
      }));
      expect(error).toBeNull();
      expect(result).toMatchObject({
        id: outputRunnerModel.id,
        serial: outputRunnerModel.serial,
        name: outputRunnerModel.name,
        service: outputRunnerModel.service,
        exec: outputRunnerModel.exec,
        socketType: outputRunnerModel.socketType,
        status: outputRunnerModel.status,
        insertDate: outputRunnerModel.insertDate,
      });
    });
  });

  describe(`Restart docker service`, () => {
    let inputId: string;

    beforeEach(() => {
      inputId = identifierMock.generateId();
    });

    it(`Should error restart docker`, async () => {
      dockerRunnerRepository.restart.mockResolvedValue([new UnknownException()]);

      const [error] = await service.restart(inputId);

      expect(dockerRunnerRepository.restart).toHaveBeenCalled();
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully restart docker`, async () => {
      dockerRunnerRepository.restart.mockResolvedValue([null, null]);

      const [error] = await service.restart(inputId);

      expect(dockerRunnerRepository.restart).toHaveBeenCalled();
      expect(error).toBeNull();
    });
  });
});
