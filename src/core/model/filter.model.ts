import {KnownKeys, PickOne} from '../utility';

export type FilterOperationType = 'eq' | 'neq' | 'gte' | 'gt' | 'lte' | 'lt';

export type FilterInstanceType<T> =
  PickOne<Partial<Omit<Pick<T, { [K in keyof T]: T[K] extends Function ? never : K }[keyof T]>, 'id' | 'deleteDate'>>>;

export class FilterModel<T> {
  readonly page: number = 1;
  readonly limit: number = 100;
  private readonly _conditions: Array<FilterInstanceType<T> & { $opr: FilterOperationType }> = [];

  constructor(props?: { page?: number, limit?: number }) {
    if (props?.page && props?.page > 0) {
      this.page = props.page;
    }
    if (props?.limit && props?.limit > 0) {
      this.limit = props.limit;
    }
  }

  addCondition(item: FilterInstanceType<T> & { $opr: FilterOperationType }) {
    this._conditions.push(item);
  }

  getCondition(key: KnownKeys<T>): FilterInstanceType<T> | null {
    const find = this._conditions.filter((v) => Object.hasOwnProperty.call(v, key));
    if (!find || (find && find.length !== 1)) {
      return null;
    }
    delete find[0].$opr;

    return find[0];
  }

  getLength(): number {
    return this._conditions.length;
  }
}

