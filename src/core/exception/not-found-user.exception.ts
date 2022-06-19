import {ExceptionEnum} from '../enum/exception.enum';
import {NotFoundException} from './not-found.exception';

export class NotFoundUserException extends NotFoundException {
  readonly isOperation: boolean;

  constructor() {
    super();

    this.name = ExceptionEnum.NOT_FOUND_USER_ERROR;
    this.isOperation = true;
  }
}
