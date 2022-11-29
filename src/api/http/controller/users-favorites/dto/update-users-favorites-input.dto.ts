import {PickType} from '@nestjs/swagger';
import {CreateUsersFavoritesInputDto} from '@src-api/http/controller/users-favorites/dto/create-users-favorites-input.dto';

export class UpdateUsersFavoritesInputDto extends PickType(CreateUsersFavoritesInputDto, ['kind', 'note']) {
}
