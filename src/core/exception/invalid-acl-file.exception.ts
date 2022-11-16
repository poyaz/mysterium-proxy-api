import {ExceptionEnum} from '@src-core/enum/exception.enum';

export class InvalidAclFileException extends Error {
  readonly isOperation: boolean;

  constructor() {
    super('Invalid acl file!');

    this.name = ExceptionEnum.INVALID_ACL_FILE;
    this.isOperation = true;
  }
}
