import {ExceptionEnum} from '@src-core/enum/exception.enum';

export class TooManyProxyRegisteredException extends Error {
  readonly isOperation: boolean;

  constructor() {
    super(`Too many proxy registered on provider!`);

    this.name = ExceptionEnum.TOO_MANY_PROXY_REGISTERED;
    this.isOperation = true;
  }
}
