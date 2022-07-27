import {ExceptionEnum} from '@src-core/enum/exception.enum';

export class FillDataRepositoryException<T> extends Error {
  readonly isOperation: boolean;
  readonly fillProperties: Array<keyof T>;

  constructor(properties: Array<keyof T>) {
    super('Fail to filling data on repository!');

    this.name = ExceptionEnum.FILL_DATA_REPOSITORY_ERROR;
    this.isOperation = false;
    this.fillProperties = properties;
  }
}
