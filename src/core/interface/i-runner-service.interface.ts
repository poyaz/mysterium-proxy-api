import {AsyncReturn} from '@src-core/utility';
import {FilterModel} from '@src-core/model/filter.model';
import {RunnerModel, RunnerStatusEnum} from '@src-core/model/runner.model';

export interface IRunnerServiceInterface {
  findAll(filter?: FilterModel<RunnerModel>): Promise<AsyncReturn<Error, Array<RunnerModel>>>;

  findById(id: string): Promise<AsyncReturn<Error, RunnerModel>>;

  create(model: RunnerModel): Promise<AsyncReturn<Error, RunnerModel>>;

  start(id: string): Promise<AsyncReturn<Error, null>>;

  stop(id: string): Promise<AsyncReturn<Error, null>>;

  restart(id: string): Promise<AsyncReturn<Error, null>>;

  reload(id: string): Promise<AsyncReturn<Error, null>>;

  status(id: string): Promise<AsyncReturn<Error, RunnerStatusEnum>>;

  remove(id: string): Promise<AsyncReturn<Error, null>>;
}
