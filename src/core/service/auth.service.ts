import {Injectable} from '@nestjs/common';
import {IUsersServiceInterface} from '@src-core/interface/i-users-service.interface';
import {JwtService} from '@nestjs/jwt';
import {IAuthServiceInterface} from '@src-core/interface/i-auth-service.interface';
import {AsyncReturn} from '@src-core/utility';
import {FilterModel} from '@src-core/model/filter.model';
import {UsersModel} from '@src-core/model/users.model';
import {AuthenticateException} from '@src-core/exception/authenticate.exception';

@Injectable()
export class AuthService implements IAuthServiceInterface {
  constructor(
    private readonly _usersService: IUsersServiceInterface,
    private readonly _jwtService: JwtService) {
  }

  async login(username: string, password: string): Promise<AsyncReturn<Error, string>> {
    const filter = new FilterModel<UsersModel>();
    filter.addCondition({$opr: 'eq', username: username});
    const [error, usersList] = await this._usersService.findAll(filter);
    if (error) {
      return [error];
    }
    if (usersList.length === 0) {
      return [new AuthenticateException()];
    }
    if (usersList[0].password !== password) {
      return [new AuthenticateException()];
    }

    const payload = {};
    payload['userId'] = usersList[0].id;
    payload['role'] = usersList[0].role;

    const token = this._jwtService.sign(payload);

    return [null, token];
  }
}
