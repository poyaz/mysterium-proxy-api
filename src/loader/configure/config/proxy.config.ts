import {registerAs} from '@nestjs/config';
import {ProxyConfigInterface} from '@src-loader/configure/interface/proxy-config.interface';
import {resolve} from 'path';

export default registerAs('proxy', (): ProxyConfigInterface => {
  return {
    globalUpstreamAddress: process.env.PROXY_GLOBAL_UPSTREAM_ADDR,
    startUpstreamPort: Number(process.env.PROXY_START_UPSTREAM_PORT || 3128),
    nginxAclFile: process.env.NGINX_ACL_FILE || resolve('storage', 'docker', 'nginx-conf', '001-proxy-acl.conf'),
  };
});
