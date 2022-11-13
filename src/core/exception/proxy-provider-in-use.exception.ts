import {ExceptionEnum} from '@src-core/enum/exception.enum';

export class ProxyProviderInUseException extends Error {
  readonly isOperation: boolean;

  constructor() {
    super(`The proxy is already in use on provider!`);

    this.name = ExceptionEnum.PROXY_PROVIDER_IN_USE;
    this.isOperation = true;
  }
}
