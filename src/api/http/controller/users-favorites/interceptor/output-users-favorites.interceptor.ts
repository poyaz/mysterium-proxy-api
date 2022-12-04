import {CallHandler, ExecutionContext, Injectable, NestInterceptor} from '@nestjs/common';
import {map, Observable} from 'rxjs';
import {Return} from '@src-core/utility';
import {FavoritesModel} from '@src-core/model/favorites.model';
import {FindUsersFavoritesOutputDto} from '@src-api/http/controller/users-favorites/dto/find-users-favorites-output.dto';

type InputMapData = Return<Error, FavoritesModel | Array<FavoritesModel>>;
type OutputMapData = Return<Error, FindUsersFavoritesOutputDto | Array<FindUsersFavoritesOutputDto>>;

@Injectable()
export class OutputUsersFavoritesInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map<InputMapData, OutputMapData>(([err, data, count]) => {
        if (err) {
          return [err];
        }

        if (typeof data !== undefined && data !== undefined && data !== null) {
          if (Array.isArray(data)) {
            const result = data.map((v) => OutputUsersFavoritesInterceptor._toObj(v));

            return [null, result, count];
          }

          if (typeof data === 'object') {
            const result = OutputUsersFavoritesInterceptor._toObj(data);

            return [null, result];
          }
        }

        return [null];
      }),
    );
  }

  private static _toObj(data: FavoritesModel): FindUsersFavoritesOutputDto {
    return {
      id: data.id,
      kind: data.kind,
      proxy: {
        id: data.usersProxy.id,
        listenAddr: data.usersProxy.listenAddr,
        listenPort: data.usersProxy.listenPort || 0,
        outgoingIp: data.usersProxy.proxyDownstream?.[0].ip,
        outgoingCountry: data.usersProxy.proxyDownstream?.[0].country,
        status: data.usersProxy.proxyDownstream?.[0].status,
        auth: {
          id: data.usersProxy.user.id,
          username: data.usersProxy.user.username,
          password: data.usersProxy.user.password,
        },
        insertDate: data.usersProxy.insertDate,
      },
      note: data.note,
      insertDate: data.insertDate,
      updateDate: data.updateDate,
    };
  }
}
