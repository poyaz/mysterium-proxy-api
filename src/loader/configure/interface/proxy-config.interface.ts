export interface ProxyConfigInterface {
  readonly globalUpstreamAddress: string;
  readonly startUpstreamPort: number;
  readonly nginxAclFile: string;
}
