import {ExceptionEnum} from '@src-core/enum/exception.enum';

export class PortInUseException extends Error {
  readonly isOperation: boolean;

  constructor() {
    super(`The port number is already in use!`);

    this.name = ExceptionEnum.PORT_IN_USE;
    this.isOperation = true;
  }
}
