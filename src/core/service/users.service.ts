import {Injectable} from '@nestjs/common';
import {IUsersService} from '../interface/i-users-service.interface';
import {UsersModel} from '../model/users.model';

@Injectable()
export class UsersService implements IUsersService {
  async findAll() {
    return [];
  }

  async findOne(id: string) {
    return [];
  }

  async create(model: UsersModel) {
    return [];
  }

  async update(model: UsersModel) {
    return [];
  }

  async remove(id: string) {
    return [];
  }
}
