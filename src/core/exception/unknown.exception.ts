import {ExceptionEnum} from '@src-core/enum/exception.enum';

export class UnknownException extends Error {
  readonly isOperation: boolean;

  constructor() {
    super('Unknown error happened!');

    this.name = ExceptionEnum.UNKNOWN_ERROR;
    this.isOperation = false;
  }
}
