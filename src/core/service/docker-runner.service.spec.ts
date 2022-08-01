import {Test, TestingModule} from '@nestjs/testing';
import {DockerRunnerService} from './docker-runner.service';
import {mock, MockProxy} from 'jest-mock-extended';
import {IRunnerRepositoryInterface} from '@src-core/interface/i-runner-repository.interface';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {FilterModel} from '@src-core/model/filter.model';
import {RunnerModel} from '@src-core/model/runner.model';

describe('DockerRunnerService', () => {
  let service: DockerRunnerService;
  let dockerRunnerRepository: MockProxy<IRunnerRepositoryInterface>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    dockerRunnerRepository = mock<IRunnerRepositoryInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('11111111-1111-1111-1111-111111111111');

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
});
