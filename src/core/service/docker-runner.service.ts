import {Injectable} from '@nestjs/common';
import {IRunnerServiceInterface} from '@src-core/interface/i-runner-service.interface';
import {FilterModel} from '@src-core/model/filter.model';
import {RunnerModel} from '@src-core/model/runner.model';
import {AsyncReturn} from '@src-core/utility';
import {IRunnerRepositoryInterface} from '@src-core/interface/i-runner-repository.interface';

@Injectable()
export class DockerRunnerService implements IRunnerServiceInterface {
  constructor(private readonly _dockerRunnerRepository: IRunnerRepositoryInterface) {
  }

  async findAll<T = string>(filter: FilterModel<RunnerModel<T>>): Promise<AsyncReturn<Error, Array<RunnerModel<T>>>> {
    return this._dockerRunnerRepository.getAll(filter);
  }

  async create<T = string>(model: RunnerModel<T>): Promise<AsyncReturn<Error, RunnerModel<T>>> {
    return this._dockerRunnerRepository.create(model);
  }

  async restart(id: string): Promise<AsyncReturn<Error, null>> {
    return this._dockerRunnerRepository.restart(id);
  }

  async reload(id: string): Promise<AsyncReturn<Error, null>> {
    return this._dockerRunnerRepository.reload(id);
  }

  async remove(id: string): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }

  async removeStopService(): Promise<AsyncReturn<Error, null>> {
    return Promise.resolve(undefined);
  }
}
