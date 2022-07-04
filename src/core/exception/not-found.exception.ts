import {ExceptionEnum} from '@src-core/enum/exception.enum';

export class NotFoundException extends Error {
  readonly isOperation: boolean;

  constructor() {
    super('Your path or object request not found!');

    this.name = ExceptionEnum.NOT_FOUND_ERROR;
    this.isOperation = true;
  }
}
