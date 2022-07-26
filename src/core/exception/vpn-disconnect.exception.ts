import {ExceptionEnum} from '@src-core/enum/exception.enum';

export class VpnDisconnectException extends Error {
  readonly isOperation: boolean;

  constructor() {
    super('Fail to disconnect vpn service!');

    this.name = ExceptionEnum.VPN_DISCONNECT_ERROR;
    this.isOperation = true;
  }
}
