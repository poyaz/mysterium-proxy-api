export interface DockerConfigInterface {
  readonly protocol: string;
  readonly host: string;
  readonly port: number;
  readonly containerInfo: {
    readonly myst: {
      readonly image: string,
      readonly volumes: {
        readonly keystore: string;
      }
      readonly httpPort: number;
    };
    readonly mystConnect: {
      readonly image: string,
    };
  };
  readonly networkName: string;
  readonly labelNamespace: string;
  readonly realProjectPath: string;
}
