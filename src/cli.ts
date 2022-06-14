import {CommandFactory} from 'nest-commander';
import {AppModule} from './app.module';

async function bootstrap() {
  await CommandFactory.run(AppModule);
}

bootstrap().catch((error) => {
  console.log(error);
  process.exit(1);
});
