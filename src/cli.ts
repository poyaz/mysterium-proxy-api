if (!process.env.DOCKER_REAL_PROJECT_PATH) {
  process.env.DOCKER_REAL_PROJECT_PATH = __dirname;
}

import {CommandFactory} from 'nest-commander';
import {CommandModule} from './command.module';

async function bootstrap() {
  await CommandFactory.run(CommandModule);
}

bootstrap().catch((error) => {
  console.log(error);
  process.exit(1);
});
