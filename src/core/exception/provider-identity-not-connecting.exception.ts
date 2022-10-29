import {ExceptionEnum} from '@src-core/enum/exception.enum';

export class ProviderIdentityNotConnectingException extends Error {
  readonly isOperation: boolean;

  constructor() {
    super(`The provider is not connecting!`);

    this.name = ExceptionEnum.PROVIDER_IDENTITY_NOT_CONNECTING;
    this.isOperation = true;
  }
}
