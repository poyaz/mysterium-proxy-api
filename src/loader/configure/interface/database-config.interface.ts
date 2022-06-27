export interface DatabaseConfigInterface {
  host: string,
  port: number,
  db: string,
  username: string,
  password: string,
  min?: number,
  max?: number,
  idleTimeout?: number,
  enableTls?: boolean,
  rejectUnauthorized?: boolean,
  applicationName: string,
}
