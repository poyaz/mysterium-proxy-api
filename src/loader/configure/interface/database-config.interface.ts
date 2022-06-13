interface DatabaseConfigInterface {
  host: string,
  port: number,
  db: string,
  username: string,
  password: string,
  max?: number,
  idleTimeout?: number,
}
