import {IProxyServiceInterface} from '@src-core/interface/i-proxy-service.interface';

export interface IProviderProxyInterface extends Pick<IProxyServiceInterface, 'create'> {
}
