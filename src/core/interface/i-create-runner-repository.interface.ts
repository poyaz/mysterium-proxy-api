import {RunnerModel, RunnerServiceEnum} from '@src-core/model/runner.model';
import {AsyncReturn} from '@src-core/utility';

export interface ICreateRunnerRepositoryInterface {
  readonly serviceType: RunnerServiceEnum;

  create<T = string>(model: RunnerModel<T>): Promise<AsyncReturn<Error, RunnerModel<T>>>;
}
