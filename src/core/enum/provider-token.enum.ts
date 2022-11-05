export enum ProviderTokenEnum {
  DOCKER_DYNAMIC_MODULE = 'DOCKER_DYNAMIC_MODULE',

  /**
   *
   * {@link AUTH_SERVICE}
   * @implements IDateTime
   */
  AUTH_SERVICE_DEFAULT = 'AUTH_SERVICE',
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
   * {@link USER_SERVICE}
   * @implements IUsersServiceInterface
   */
  USER_SERVICE_DEFAULT = 'USER_SERVICE',
  /**
   *
   * {@link }
   * @implements IProviderServiceInterface
   */
  MYST_PROVIDER_SERVICE_DEFAULT = 'MYST_PROVIDER_SERVICE',

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
   * {@link MystService}
   * @implements IProviderServiceInterface
   */
  MYST_SERVICE = 'MYST_SERVICE',
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
   * {@link UsersService}
   * @implements IUsersServiceInterface
   */
  USER_SERVICE = 'USER_SERVICE',

  /**
   *
   * {@link DockerRunnerRepository}
   * @implements IRunnerRepositoryInterface
   */
  DOCKER_RUNNER_REPOSITORY = 'DOCKER_RUNNER_REPOSITORY',
  /**
   *
   * {@link DockerRunnerCreateMystRepository}
   * @implements ICreateRunnerRepository
   */
  DOCKER_RUNNER_CREATE_MYST_REPOSITORY = 'DOCKER_RUNNER_CREATE_MYST_REPOSITORY',
  /**
   *
   * {@link DockerRunnerCreateMystConnectRepository}
   * @implements ICreateRunnerRepository
   */
  DOCKER_RUNNER_CREATE_MYST_CONNECT_REPOSITORY = 'DOCKER_RUNNER_CREATE_MYST_CONNECT_REPOSITORY',
  /**
   *
   * {@link DockerRunnerCreateStrategyRepository}
   * @implements ICreateRunnerRepository
   */
  DOCKER_RUNNER_CREATE_STRATEGY_REPOSITORY = 'DOCKER_RUNNER_CREATE_STRATEGY_REPOSITORY',
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
   * {@link MystIdentityAggregateRepository}
   * @implements IGenericRepositoryInterface<MystIdentityModel>
   */
  MYST_IDENTITY_AGGREGATE_REPOSITORY = 'MYST_IDENTITY_AGGREGATE_REPOSITORY',
  /**
   *
   * {@link MystIdentityFileRepository}
   * @implements IAccountIdentityFileRepository
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
  USER_PG_REPOSITORY = 'USER_PG_REPOSITORY',

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
