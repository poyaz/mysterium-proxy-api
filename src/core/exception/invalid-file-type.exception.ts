import {ExceptionEnum} from '@src-core/enum/exception.enum';

export class InvalidFileTypeException extends Error {
  readonly isOperation: boolean;

  constructor() {
    super('Invalid file type!');

    this.name = ExceptionEnum.INVALID_FILE_TYPE;
    this.isOperation = true;
  }
}
