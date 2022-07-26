import {AsyncReturn} from '@src-core/utility';
import {FilterModel} from '@src-core/model/filter.model';
import {RunnerModel, RunnerStatusEnum} from '@src-core/model/runner.model';

export interface IRunnerServiceInterface<T> {
  findAllByMetaData(filter: FilterModel<T>): Promise<AsyncReturn<Error, Array<RunnerModel>>>;

  create(model: RunnerModel, data: T): Promise<AsyncReturn<Error, RunnerModel>>;

  restart(id: string): Promise<AsyncReturn<Error, null>>;

  reload(id: string): Promise<AsyncReturn<Error, null>>;

  remove(id: string): Promise<AsyncReturn<Error, null>>;

  removeStopService(): Promise<AsyncReturn<Error, null>>;
}
