import {IProxyServiceInterface} from '@src-core/interface/i-proxy-service.interface';
import {IProviderServiceInterface} from '@src-core/interface/i-provider-service.interface';

type CombineProviderProxyInterface = Pick<IProxyServiceInterface, 'create'> & Pick<IProviderServiceInterface, 'down'>;

export interface IProviderProxyInterface extends CombineProviderProxyInterface {
}
