export interface ServerConfigInterface {
  host: string,
  http: {
    port: number,
  },
  https: {
    port: number,
    force: boolean,
  }
}
