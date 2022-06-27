import {ExceptionEnum} from '../enum/exception.enum';
import {ExistException} from './exist.exception';

export class RepositoryException extends Error {
  readonly isOperation: boolean;
  readonly additionalInfo: Error;

  constructor(error) {
    if ('code' in error && error.code === '23505') {
      const existError = new ExistException();
      super(existError.message);

      this.name = existError.name;
      this.isOperation = existError.isOperation;

      return;
    }

    super('Repository error!');

    this.name = ExceptionEnum.REPOSITORY_ERROR;
    this.isOperation = false;
    this.additionalInfo = error;
  }
}
