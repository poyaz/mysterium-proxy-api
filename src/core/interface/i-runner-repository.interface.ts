import {AsyncReturn} from '@src-core/utility';
import {FilterModel} from '@src-core/model/filter.model';
import {RunnerModel} from '@src-core/model/runner.model';

export interface IRunnerRepositoryInterface {
  getAll<T = string>(filter: FilterModel<RunnerModel<T>>): Promise<AsyncReturn<Error, Array<RunnerModel<T>>>>;

  getById<T = string>(id: string): Promise<AsyncReturn<Error, RunnerModel<T>>>;

  create<T = string>(model: RunnerModel<T>): Promise<AsyncReturn<Error, RunnerModel<T>>>;

  restart(id: string): Promise<AsyncReturn<Error, null>>;

  reload(id: string): Promise<AsyncReturn<Error, null>>;

  remove(id: string): Promise<AsyncReturn<Error, null>>;

  removeStopService(): Promise<AsyncReturn<Error, null>>;
}
