import {DynamicModule, Module, Provider} from '@nestjs/common';
import {DockerOptions} from 'dockerode';
import {DOCKER_MODULE_OPTIONS} from './docker.constant';
import {DockerModuleAsyncOptions, DockerOptionsFactory} from './interface/async-model-factory.interface';
import {createDockerProvider} from './docker.provider';
import {DockerService} from './docker.service';

@Module({
  providers: [DockerService],
  exports: [DockerService],
})
export class DockerModule {
  static forRoot(options: DockerOptions): DynamicModule {
    return {
      module: DockerModule,
      providers: createDockerProvider(options),
      exports: [DockerService],
    };
  }

  static forRootAsync(options: DockerModuleAsyncOptions): DynamicModule {console.log('fffffffffffff')
    return {
      module: DockerModule,
      imports: options.imports || [],
      providers: this.createAsyncProviders(options),
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
