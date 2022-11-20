import {ExceptionEnum} from '@src-core/enum/exception.enum';

export class PasswordMismatchException extends Error {
  readonly isOperation: boolean;

  constructor() {
    super('Your password is incorrect!');

    this.name = ExceptionEnum.PASSWORD_MISMATCH;
    this.isOperation = true;
  }
}
