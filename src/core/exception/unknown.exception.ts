import {ExceptionEnum} from '@src-core/enum/exception.enum';

export class UnknownException extends Error {
  readonly isOperation: boolean;
  readonly additionalInfo?: Error;

  constructor(error?: Error) {
    super('Unknown error happened!');

    this.name = ExceptionEnum.UNKNOWN_ERROR;
    this.isOperation = false;

    if (error) {
      this.additionalInfo = error;
    }
  }
}
