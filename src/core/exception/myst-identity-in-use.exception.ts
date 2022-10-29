import {ExceptionEnum} from '@src-core/enum/exception.enum';

export class MystIdentityInUseException extends Error {
  readonly isOperation: boolean;

  constructor() {
    super(`The myst identity in use! Please first disconnect service`);

    this.name = ExceptionEnum.MYST_IDENTITY_IN_USE;
    this.isOperation = true;
  }
}
