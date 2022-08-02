import {ExceptionEnum} from '@src-core/enum/exception.enum';
import {ExistException} from '@src-core/exception/exist.exception';

export class RepositoryException extends Error {
  readonly isOperation: boolean;
  readonly additionalInfo: Error;
  readonly combineInfo: Array<Error>;

  constructor(error)
  constructor(error: Array<Error>) {
    if (!Array.isArray(error) && 'code' in error && (<any>error).code === '23505') {
      const existError = new ExistException();
      super(existError.message);

      this.name = existError.name;
      this.isOperation = existError.isOperation;

      return;
    }

    super('Repository error!');

    this.name = ExceptionEnum.REPOSITORY_ERROR;
    this.isOperation = false;

    if (!Array.isArray(error)) {
      this.additionalInfo = error;
      this.combineInfo = [];
    } else {
      this.additionalInfo = error[0];
      this.combineInfo = error;
    }
  }
}
