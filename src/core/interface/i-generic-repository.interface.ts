import {AsyncReturn} from '@src-core/utility';

export interface IGenericRepositoryInterface<T> {
  getAll<F>(filter?: F): Promise<AsyncReturn<Error, Array<T>>>;

  getById(id: string): Promise<AsyncReturn<Error, T | null>>;

  add(model: T): Promise<AsyncReturn<Error, T>>;

  addBulk(models: Array<T>): Promise<AsyncReturn<Error, Array<T>>>;

  update<F>(model: F): Promise<AsyncReturn<Error, null>>;

  updateBulk<F>(models: Array<F>): Promise<AsyncReturn<Error, null>>;

  remove(id: string): Promise<AsyncReturn<Error, null>>;

  removeBulk(idList: Array<string>): Promise<AsyncReturn<Error, null>>;
}
