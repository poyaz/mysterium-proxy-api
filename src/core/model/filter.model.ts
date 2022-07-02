import {KnownKeys, PickOne} from '../utility';

export enum SortEnum {
  ASC = 'asc',
  DESC = 'desc',
}

export type FilterOperationType = 'eq' | 'neq' | 'gte' | 'gt' | 'lte' | 'lt';

export type FilterInstanceType<T> =
  PickOne<Partial<Omit<Pick<T, { [K in keyof T]: T[K] extends Function ? never : K }[keyof T]>, 'id' | 'deleteDate'>>>;

export type PartialSort<T> = {
  [P in keyof T]?: SortEnum;
};

export class FilterModel<T> {
  readonly page: number = 1;
  readonly limit: number = 100;
  private _sort: Array<PartialSort<T>> = [];
  private readonly _conditions: Array<FilterInstanceType<T> & { $opr: FilterOperationType }> = [];

  constructor(props?: { page?: number, limit?: number }) {
    if (props?.page && props?.page > 0) {
      this.page = props.page;
    }
    if (props?.limit && props?.limit > 0) {
      this.limit = props.limit;
    }
  }

  addSortBy(item: PartialSort<T>) {
    this._sort.push(item);
    this._sort = [...new Set(this._sort)];
  }

  getSortBy(key: KnownKeys<T>): SortEnum | null {
    const find = this._sort.filter((v) => Object.hasOwnProperty.call(v, key));
    if (!find || (find && find.length !== 1)) {
      return null;
    }

    return find[0][key];
  }

  getLengthOfSortBy(): number {
    return this._sort.length;
  }

  addCondition(item: FilterInstanceType<T> & { $opr: FilterOperationType }) {
    this._conditions.push(item);
  }

  getCondition(key: KnownKeys<T>): FilterInstanceType<T> | null {
    const find = this._conditions.filter((v) => Object.hasOwnProperty.call(v, key));
    if (!find || (find && find.length !== 1)) {
      return null;
    }

    return find[0];
  }

  getLengthOfCondition(): number {
    return this._conditions.length;
  }
}

