export interface IIdentifier {
  generateId(): string;
  generateId(data: string): string;
}
