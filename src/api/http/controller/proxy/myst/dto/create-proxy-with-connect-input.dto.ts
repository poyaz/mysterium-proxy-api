import {OmitType} from '@nestjs/swagger';
import {CreateProxyInputDto} from '@src-api/http/controller/proxy/dto/create-proxy-input.dto';
import {ProxyUpstreamModel} from '@src-core/model/proxy.model';

export class CreateProxyWithConnectInputDto extends OmitType(CreateProxyInputDto, ['providerId'] as const) {
  static toModel(providerId: string, dto: CreateProxyWithConnectInputDto): ProxyUpstreamModel {
    const createDto = new CreateProxyInputDto();
    createDto.providerId = providerId;
    createDto.listenPort = dto.listenPort;

    return CreateProxyInputDto.toModel(createDto);
  }
}
