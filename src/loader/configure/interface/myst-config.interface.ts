export interface MystConfigInterface {
  readonly discoveryHostAddr: string;
  readonly node: {
    readonly auth: {
      readonly username: string;
      readonly password: string;
    }
  };
  readonly basePathStore: string;
}
