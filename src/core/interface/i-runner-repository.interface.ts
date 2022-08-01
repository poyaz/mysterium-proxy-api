import {AsyncReturn} from '@src-core/utility';
import {FilterModel} from '@src-core/model/filter.model';
import {RunnerModel, RunnerStatusEnum} from '@src-core/model/runner.model';

export interface IRunnerRepositoryInterface {
  getAll<T = string>(filter: FilterModel<RunnerModel<T>>): Promise<AsyncReturn<Error, Array<RunnerModel<T>>>>;

  create(model: RunnerModel): Promise<AsyncReturn<Error, RunnerModel>>;

  restart(id: string): Promise<AsyncReturn<Error, null>>;

  reload(id: string): Promise<AsyncReturn<Error, null>>;

  remove(id: string): Promise<AsyncReturn<Error, null>>;
}
