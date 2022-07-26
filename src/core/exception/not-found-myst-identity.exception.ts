import {ExceptionEnum} from '@src-core/enum/exception.enum';
import {NotFoundException} from '@src-core/exception/not-found.exception';

export class NotFoundMystIdentityException extends NotFoundException {
  readonly isOperation: boolean;

  constructor() {
    super();

    this.name = ExceptionEnum.NOT_FOUND_MYST_IDENTITY_ERROR;
    this.isOperation = true;
  }
}
