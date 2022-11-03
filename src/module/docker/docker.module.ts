import {DynamicModule, Global, Logger, Module, Provider} from '@nestjs/common';
import {DockerOptions} from 'dockerode';
import {DOCKER_LOGGER, DOCKER_MODULE_OPTIONS} from './docker.constant';
import {DockerModuleAsyncOptions, DockerOptionsFactory} from './interface/async-model-factory.interface';
import {checkDockerVersion, createDockerProvider, createDockerProviderOptions, dockerLogger} from './docker.provider';
import {DockerService} from './docker.service';

@Global()
@Module({
  providers: [DockerService],
  exports: [DockerService],
})
export class DockerModule {
  static forRoot(options: DockerOptions): DynamicModule {
    return {
      module: DockerModule,
      providers: [
        ...createDockerProvider(),
        ...createDockerProviderOptions(options),
      ],
      exports: [DockerService],
    };
  }

  static forRootAsync(options: DockerModuleAsyncOptions): DynamicModule {
    return {
      module: DockerModule,
      imports: options.imports || [],
      providers: [
        ...createDockerProvider(),
        ...this.createAsyncProviders(options),
      ],
      exports: [DockerService],
    };
  }

  private static createAsyncProviders(options: DockerModuleAsyncOptions): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(options: DockerModuleAsyncOptions): Provider {
    if (options.useFactory) {
      return {
        provide: DOCKER_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    return {
      provide: DOCKER_MODULE_OPTIONS,
      inject: [options.useExisting || options.useClass],
      useFactory: async (optionsFactory: DockerOptionsFactory) => await optionsFactory.createDockerOptions(),
    };
  }
}
