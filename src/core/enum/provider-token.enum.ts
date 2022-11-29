export enum ProviderTokenEnum {
  DOCKER_DYNAMIC_MODULE = 'DOCKER_DYNAMIC_MODULE',

  /**
   *
   * {@link AnonymousRegisterGuard}
   */
  CAN_ANONYMOUS_REGISTER = 'CAN_ANONYMOUS_REGISTER',

  /**
   *
   * {@link AUTH_SERVICE}
   * @implements IDateTime
   */
  AUTH_SERVICE_DEFAULT = 'AUTH_SERVICE',
  /**
   *
   * {@link FAVORITES_SERVICE}
   * @implements IFavoritesServiceInterface
   */
  FAVORITES_SERVICE_DEFAULT = 'FAVORITES_SERVICE',
  /**
   *
   * {@link DATE_TIME}
   * @implements IDateTime
   */
  DATE_TIME_DEFAULT = 'DATE_TIME',
  /**
   *
   * {@link MYST_IDENTITY_SERVICE}
   * @implements IMystIdentityServiceInterface
   */
  MYST_IDENTITY_SERVICE_DEFAULT = 'MYST_IDENTITY_SERVICE',
  /**
   *
   * {@link PROXY_SERVICE}
   * @implements IProxyServiceInterface
   */
  PROXY_SERVICE_DEFAULT = 'PROXY_SERVICE',
  /**
   *
   * {@link PROXY_ACL_SERVICE}
   * @implements IProxyAclServiceInterface
   */
  PROXY_ACL_SERVICE_DEFAULT = 'PROXY_ACL_SERVICE',
  /**
   *
   * {@link USER_SERVICE}
   * @implements IUsersServiceInterface
   */
  USER_SERVICE_DEFAULT = 'USER_SERVICE',
  /**
   *
   * {@link USERS_PROXY_SERVICE}
   * @implements IUsersProxyServiceInterface
   */
  USERS_PROXY_SERVICE_DEFAULT = 'USERS_PROXY_SERVICE',
  /**
   *
   * {@link MystProviderService}
   * @implements IProviderServiceInterface
   */
  MYST_PROVIDER_SERVICE_DEFAULT = 'MYST_PROVIDER_SERVICE',
  /**
   *
   * {@link MystProviderProxyService}
   * @implements IProviderProxyInterface
   */
  MYST_PROVIDER_PROXY_SERVICE_DEFAULT = 'MYST_PROVIDER_PROXY_SERVICE',

  /**
   *
   * {@link AuthService}
   * @implements IAuthServiceInterface
   */
  AUTH_SERVICE = 'AUTH_SERVICE',
  /**
   *
   * {@link DockerRunnerService}
   * @implements IRunnerServiceInterface
   */
  DOCKER_RUNNER_SERVICE = 'DOCKER_RUNNER_SERVICE',
  /**
   *
   * {@link FavoritesService}
   * @implements IFavoritesServiceInterface
   */
  FAVORITES_SERVICE = 'FAVORITES_SERVICE',
  /**
   *
   * {@link MystIdentityService}
   * @implements IMystIdentityServiceInterface
   */
  MYST_IDENTITY_SERVICE = 'MYST_IDENTITY_SERVICE',
  /**
   *
   * {@link MystProviderService}
   * @implements IProviderServiceInterface
   */
  MYST_PROVIDER_SERVICE = 'MYST_PROVIDER_SERVICE',
  /**
   *
   * {@link MystProviderProxyService}
   * @implements IProviderProxyInterface
   */
  MYST_PROVIDER_PROXY_SERVICE = 'MYST_PROVIDER_PROXY_SERVICE',
  /**
   *
   * {@link ProxyService}
   * @implements IProxyServiceInterface
   */
  PROXY_SERVICE = 'PROXY_SERVICE',
  /**
   *
   * {@link ProxyAclService}
   * @implements IProxyAclServiceInterface
   */
  PROXY_ACL_SERVICE = 'PROXY_ACL_SERVICE',
  /**
   *
   * {@link UsersService}
   * @implements IUsersServiceInterface
   */
  USER_SERVICE = 'USER_SERVICE',
  /**
   *
   * {@link UsersProxyService}
   * @implements IUsersProxyServiceInterface
   */
  USERS_PROXY_SERVICE = 'USERS_PROXY_SERVICE',

  /**
   *
   * {@link DockerRunnerRepository}
   * @implements IRunnerRepositoryInterface
   */
  DOCKER_RUNNER_REPOSITORY = 'DOCKER_RUNNER_REPOSITORY',
  /**
   *
   * {@link DockerRunnerCreateEnvoyRepository}
   * @implements ICreateRunnerRepositoryInterface
   */
  DOCKER_RUNNER_CREATE_ENVOY_REPOSITORY = 'DOCKER_RUNNER_CREATE_ENVOY_REPOSITORY',
  /**
   *
   * {@link DockerRunnerCreateMystRepository}
   * @implements ICreateRunnerRepositoryInterface
   */
  DOCKER_RUNNER_CREATE_MYST_REPOSITORY = 'DOCKER_RUNNER_CREATE_MYST_REPOSITORY',
  /**
   *
   * {@link DockerRunnerCreateMystConnectRepository}
   * @implements ICreateRunnerRepositoryInterface
   */
  DOCKER_RUNNER_CREATE_MYST_CONNECT_REPOSITORY = 'DOCKER_RUNNER_CREATE_MYST_CONNECT_REPOSITORY',
  /**
   *
   * {@link DockerRunnerCreateSocatRepository}
   * @implements ICreateRunnerRepositoryInterface
   */
  DOCKER_RUNNER_CREATE_SOCAT_REPOSITORY = 'DOCKER_RUNNER_CREATE_SOCAT_REPOSITORY',
  /**
   *
   * {@link DockerRunnerCreateStrategyRepository}
   * @implements ICreateRunnerRepositoryInterface
   */
  DOCKER_RUNNER_CREATE_STRATEGY_REPOSITORY = 'DOCKER_RUNNER_CREATE_STRATEGY_REPOSITORY',
  /**
   *
   * {@link MystIdentityAggregateRepository}
   * @implements IGenericRepositoryInterface<MystIdentityModel>
   */
  MYST_IDENTITY_AGGREGATE_REPOSITORY = 'MYST_IDENTITY_AGGREGATE_REPOSITORY',
  /**
   *
   * {@link MystIdentityFileRepository}
   * @implements IAccountIdentityFileRepositoryInterface
   */
  MYST_IDENTITY_FILE_REPOSITORY = 'MYST_IDENTITY_FILE_REPOSITORY',
  /**
   *
   * {@link MystIdentityPgRepository}
   * @implements IGenericRepositoryInterface<MystIdentityModel>
   */
  MYST_IDENTITY_PG_REPOSITORY = 'MYST_IDENTITY_PG_REPOSITORY',
  /**
   *
   * {@link MystProviderAggregateRepository}
   * @implements IMystApiRepositoryInterface
   */
  MYST_PROVIDER_AGGREGATE_REPOSITORY = 'MYST_PROVIDER_AGGREGATE_REPOSITORY',
  /**
   *
   * {@link MystProviderApiRepository}
   * @implements IMystApiRepositoryInterface
   */
  MYST_PROVIDER_API_REPOSITORY = 'MYST_PROVIDER_API_REPOSITORY',
  /**
   *
   * {@link MystProviderCacheApiRepository}
   * @implements IMystApiRepositoryInterface
   */
  MYST_PROVIDER_CACHE_API_REPOSITORY = 'MYST_PROVIDER_CACHE_API_REPOSITORY',
  /**
   *
   * {@link NginxProxyAclRepository}
   * @implements IProxyAclRepositoryInterface
   */
  NGINX_PROXY_ACL_REPOSITORY = 'NGINX_PROXY_ACL_REPOSITORY',
  /**
   *
   * {@link NginxProxyAclAggregateRepository}
   * @implements IProxyAclRepositoryInterface
   */
  NGINX_PROXY_ACL_AGGREGATE_REPOSITORY = 'NGINX_PROXY_ACL_AGGREGATE_REPOSITORY',
  /**
   *
   * {@link ProxyAggregateRepository}
   * @implements IProxyRepositoryInterface
   */
  PROXY_AGGREGATE_REPOSITORY = 'PROXY_AGGREGATE_REPOSITORY',
  /**
   *
   * {@link UsersAdapterRepository}
   * @implements IGenericRepositoryInterface<UsersModel>
   */
  USER_ADAPTER_REPOSITORY = 'USER_ADAPTER_REPOSITORY',
  /**
   *
   * {@link UsersHtpasswdFileRepository}
   * @implements IUsersHtpasswdFileInterface
   */
  USERS_HTPASSWD_FILE_REPOSITORY = 'USERS_HTPASSWD_FILE_REPOSITORY',
  /**
   *
   * {@link UsersPgRepository}
   * @implements IGenericRepositoryInterface<UsersModel>
   */
  USERS_PG_REPOSITORY = 'USERS_PG_REPOSITORY',
  /**
   *
   * {@link UsersProxyAggregateRepository}
   * @implements IUsersProxyRepositoryInterface
   */
  USERS_PROXY_AGGREGATE_REPOSITORY = 'USERS_PROXY_AGGREGATE_REPOSITORY',

  /**
   *
   * {@link DateTime}
   * @implements IDateTime
   */
  DATE_TIME = 'DATE_TIME',
  /**
   *
   * {@link NullUuidIdentifier}
   * @implements IIdentifier
   */
  IDENTIFIER_UUID_NULL = 'IDENTIFIER_UUID_NULL',
  /**
   *
   * {@link SystemInfoRepository}
   * @implements ISystemInfoRepositoryInterface
   */
  SYSTEM_INFO_REPOSITORY = 'SYSTEM_INFO_REPOSITORY',
  /**
   *
   * {@link UuidIdentifier}
   * @implements IIdentifier
   */
  IDENTIFIER_UUID = 'IDENTIFIER_UUID',
}
