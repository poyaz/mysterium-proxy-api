export class CombineException extends Error {
  readonly isOperation: boolean;
  readonly combineInfo: Array<Error>;

  constructor(errorList: Array<Error>) {
    const firstError = errorList[0];
    const isOperationFind = errorList.find((v) => 'isOperation' in v && (<any>v).isOperation === false);

    super(firstError.message);

    this.name = firstError.name;
    this.isOperation = isOperationFind ? (<any>isOperationFind).isOperation : false;
    this.combineInfo = errorList;
  }
}
