export interface ServerConfigInterface {
  readonly host: string,
  readonly http: {
    readonly port: number,
  },
  readonly https: {
    readonly port: number,
    readonly force: boolean,
  }
  readonly uploadPath: string;
}
