import {CanActivate, ExecutionContext, Inject, Injectable} from '@nestjs/common';
import {Observable} from 'rxjs';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {UserRoleEnum} from '@src-core/enum/user-role.enum';

@Injectable()
export class AnonymousRegisterGuard implements CanActivate {
  constructor(
    @Inject(ProviderTokenEnum.CAN_ANONYMOUS_REGISTER)
    private readonly _canAnonymousRegister: boolean,
  ) {
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    if (request.user && request.user.role === UserRoleEnum.ADMIN) {
      return true;
    }

    return this._canAnonymousRegister;
  }
}
