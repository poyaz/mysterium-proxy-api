import {ICreateRunnerRepositoryInterface} from '@src-core/interface/i-create-runner-repository.interface';
import {RunnerModel, RunnerServiceEnum} from '@src-core/model/runner.model';
import {AsyncReturn} from '@src-core/utility';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {RepositoryException} from '@src-core/exception/repository.exception';

export class DockerRunnerCreateStrategyRepository implements ICreateRunnerRepositoryInterface {
  readonly serviceType: RunnerServiceEnum;

  constructor(private readonly _dockerCreateList: Array<ICreateRunnerRepositoryInterface>) {
  }

  async create<T = string>(model: RunnerModel<T>): Promise<AsyncReturn<Error, RunnerModel<T>>> {
    try {
      return this._findInstance(model.service).create(model);
    } catch (error) {
      if (error instanceof UnknownException) {
        return [error];
      }

      return [new RepositoryException(error)];
    }
  }

  private _findInstance(service: RunnerServiceEnum): ICreateRunnerRepositoryInterface {
    const find = this._dockerCreateList.find((v) => v.serviceType === service);
    if (!find) {
      throw new UnknownException();
    }

    return <ICreateRunnerRepositoryInterface><any>find;
  }
}
