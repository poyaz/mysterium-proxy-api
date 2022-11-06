import {ExceptionEnum} from '@src-core/enum/exception.enum';

export class UnlockMystIdentityException extends Error {
  readonly isOperation: boolean;

  constructor() {
    super(`Can't unlock myst identity! Maybe the passphrase is wrong`);

    this.name = ExceptionEnum.UNLOCK_MYST_IDENTITY;
    this.isOperation = true;
  }
}
