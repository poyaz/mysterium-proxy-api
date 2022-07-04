import {registerAs} from '@nestjs/config';
import {SquidConfigInterface} from '@src-loader/configure/interface/squid-config.interface';
import {resolve} from 'path';

export default registerAs('squid', (): SquidConfigInterface => {
  return {
    pwdFile: process.env.SQUID_PWD_FILE || resolve('storage', 'tmp', 'squid-pwd.htpasswd'),
  };
});
