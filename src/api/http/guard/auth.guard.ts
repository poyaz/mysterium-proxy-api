import {Injectable, CanActivate, ExecutionContext} from '@nestjs/common';
import {Observable} from 'rxjs';
import {Reflector} from '@nestjs/core';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    const disableCheckAuth = this.reflector.get<string[]>('disableCheckAuth', context.getHandler());
    if (disableCheckAuth) {
      return true;
    }

    // return validateRequest(request);

    return false;
  }
}
