import {AsyncReturn} from '@src-core/utility';

export interface IGenericRepositoryInterface<T> {
  getAll<F>(filter?: F): Promise<AsyncReturn<Error, Array<T>>>;

  getById(id: string): Promise<AsyncReturn<Error, T | null>>;

  add(model: T): Promise<AsyncReturn<Error, T>>;

  update<F>(model: F): Promise<AsyncReturn<Error, null>>;

  remove(id: string): Promise<AsyncReturn<Error, null>>;
}
