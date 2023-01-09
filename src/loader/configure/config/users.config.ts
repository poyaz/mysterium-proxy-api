import {registerAs} from '@nestjs/config';
import {convertStringToBoolean} from '@src-loader/configure/util';
import {UsersConfigInterface} from '@src-loader/configure/interface/users-config.interface';

export default registerAs('users', (): UsersConfigInterface => {
  return {
    canAnonymousRegister: convertStringToBoolean(process.env.ENABLE_ANONYMOUS_REGISTER || 'true'),
  };
});
