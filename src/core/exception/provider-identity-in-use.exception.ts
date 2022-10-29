import {ExceptionEnum} from '@src-core/enum/exception.enum';

export class ProviderIdentityInUseException extends Error {
  readonly isOperation: boolean;

  constructor() {
    super(`The provider is already in use!`);

    this.name = ExceptionEnum.PROVIDER_IDENTITY_IN_USE;
    this.isOperation = true;
  }
}
