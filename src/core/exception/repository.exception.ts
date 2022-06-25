import {ExceptionEnum} from '../enum/exception.enum';

export class RepositoryException extends Error {
  readonly isOperation: boolean;
  readonly additionalInfo: Error;

  constructor(error) {
    super('Repository error!');

    this.name = ExceptionEnum.REPOSITORY_ERROR;
    this.isOperation = false;
    this.additionalInfo = error;
  }
}
