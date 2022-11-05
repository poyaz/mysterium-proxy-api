export interface RedisConfigInterface {
  readonly host: string;
  readonly port: number;
  readonly db: number;
  readonly password?: string;
}
