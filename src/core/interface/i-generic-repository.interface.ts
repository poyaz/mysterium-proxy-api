import {AsyncReturn} from '../utility';

export interface IGenericRepositoryInterface<T> {
  getAll<F>(filter?: F): Promise<AsyncReturn<Error, Array<T>>>;

  getById(id: string): Promise<AsyncReturn<Error, T | null>>;

  add(model: T): Promise<AsyncReturn<Error, T>>;

  update(model: T): Promise<AsyncReturn<Error, null>>;

  remove(model: T): Promise<AsyncReturn<Error, null>>;
}
