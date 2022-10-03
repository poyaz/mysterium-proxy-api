import {ExceptionEnum} from '@src-core/enum/exception.enum';

export class NotRunningServiceException extends Error {
  readonly isOperation: boolean;

  constructor() {
    super(`The service not running or maybe stopped!`);

    this.name = ExceptionEnum.NOT_RUNNING_SERVICE;
    this.isOperation = false;
  }
}
