export interface DatabaseConfigInterface {
  readonly host: string;
  readonly port: number;
  readonly db: string;
  readonly username: string;
  readonly password: string;
  readonly min?: number;
  readonly max?: number;
  readonly idleTimeout?: number;
  readonly enableTls?: boolean;
  readonly rejectUnauthorized?: boolean;
  readonly applicationName: string;
}
