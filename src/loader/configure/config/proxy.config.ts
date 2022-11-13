import {registerAs} from '@nestjs/config';
import {ProxyConfigInterface} from '@src-loader/configure/interface/proxy-config.interface';

export default registerAs('proxy', (): ProxyConfigInterface => {
  return {
    globalUpstreamAddress: process.env.PROXY_GLOBAL_UPSTREAM_ADDR,
    startUpstreamPort: Number(process.env.PROXY_START_UPSTREAM_PORT || 3128),
  };
});
