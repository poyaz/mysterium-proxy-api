import {ExceptionEnum} from '../enum/exception.enum';

export class AuthenticateException extends Error {
  readonly isOperation: boolean;

  constructor() {
    super('Authenticate error!');

    this.name = ExceptionEnum.AUTHENTICATE_ERROR;
    this.isOperation = true;
  }
}
