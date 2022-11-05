import {registerAs} from '@nestjs/config';
import {HtpasswdConfigInterface} from '@src-loader/configure/interface/htpasswd-config.interface';
import {resolve} from 'path';

export default registerAs('htpasswd', (): HtpasswdConfigInterface => {
  return {
    pwdFile: process.env.HTPASSWD_FILE || resolve('storage', 'tmp', 'users-pwd.htpasswd'),
  };
});
