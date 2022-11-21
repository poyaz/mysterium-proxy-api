import {CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor} from '@nestjs/common';
import {from, map, Observable} from 'rxjs';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {IUsersServiceInterface} from '@src-core/interface/i-users-service.interface';
import {UpdatePasswordInputDto} from '@src-api/http/controller/users/dto/update-password-input.dto';
import {PasswordMismatchException} from '@src-core/exception/password-mismatch.exception';

@Injectable()
export class ChangeOwnPasswordVerifyInterceptor implements NestInterceptor {
  constructor(
    @Inject(ProviderTokenEnum.USER_SERVICE_DEFAULT)
    private readonly _usersService: IUsersServiceInterface,
  ) {
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    const currentPassword = (<UpdatePasswordInputDto><unknown>request.body).currentPassword;
    const userId = request.params['userId'];

    if (!(currentPassword && userId)) {
      return next.handle();
    }

    const [userError, userData] = await this._usersService.findOne(userId);
    if (userError) {
      return from(Promise.resolve()).pipe(
        map(() => {
          return [userError];
        }),
      );
    }
    if (userData.password !== currentPassword) {
      return from(Promise.resolve()).pipe(
        map(() => {
          return [new PasswordMismatchException()];
        }),
      );
    }

    return next.handle();
  }
}
