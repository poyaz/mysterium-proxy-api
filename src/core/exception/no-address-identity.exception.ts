import {ExceptionEnum} from '@src-core/enum/exception.enum';

export class NoAddressIdentityException extends Error {
  readonly isOperation: boolean;

  constructor() {
    super(`Can't found identity address from file!`);

    this.name = ExceptionEnum.ADDRESS_IDENTITY;
    this.isOperation = true;
  }
}
