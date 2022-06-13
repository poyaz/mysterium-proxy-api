import {ExceptionEnum} from "../enum/exception.enum";

export class ExistException extends Error {
  readonly isOperation: boolean;

  constructor() {
    super('Your object already exists!');

    this.name = ExceptionEnum.EXIST_ERROR;
    this.isOperation = true;
  }
}
