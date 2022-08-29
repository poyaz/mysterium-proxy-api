import {ExceptionEnum} from '@src-core/enum/exception.enum';

export class ParseIdentityException extends Error {
  readonly isOperation: boolean;

  constructor() {
    super(`Can't parse identity file!`);

    this.name = ExceptionEnum.PARSE_IDENTITY;
    this.isOperation = true;
  }
}
