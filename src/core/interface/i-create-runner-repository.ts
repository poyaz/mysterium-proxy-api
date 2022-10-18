import {RunnerModel} from '@src-core/model/runner.model';
import {AsyncReturn} from '@src-core/utility';

export interface ICreateRunnerRepository {
  create<T = string>(model: RunnerModel<T>): Promise<AsyncReturn<Error, RunnerModel<T>>>;
}
