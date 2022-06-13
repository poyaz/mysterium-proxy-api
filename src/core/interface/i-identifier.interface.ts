export enum I_IDENTIFIER {
  DEFAULT = 'IDENTIFIER_DEFAULT',
  NULL = 'IDENTIFIER_NULL',
}

export interface IIdentifier {
  generateId(): string;
}
