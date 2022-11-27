import {Test, TestingModule} from '@nestjs/testing';
import {AclHttpController} from './acl-http.controller';
import {mock, MockProxy} from 'jest-mock-extended';
import {IProxyAclServiceInterface} from '@src-core/interface/i-proxy-acl-service.interface';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {ProviderTokenEnum} from '@src-core/enum/provider-token.enum';
import {FilterModel} from '@src-core/model/filter.model';
import {ProxyAclMode, ProxyAclModel, ProxyAclType} from '@src-core/model/proxyAclModel';
import {FindAclQueryDto} from '@src-api/http/controller/acl/dto/find-acl-query.dto';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {defaultModelFactory} from '@src-core/model/defaultModel';
import {UsersModel} from '@src-core/model/users.model';

describe('AclHttpController', () => {
  let controller: AclHttpController;
  let proxyAclService: MockProxy<IProxyAclServiceInterface>;
  let identifierMock: MockProxy<IIdentifier>;

  beforeEach(async () => {
    proxyAclService = mock<IProxyAclServiceInterface>();

    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('00000000-0000-0000-0000-000000000000');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AclHttpController],
      providers: [
        {
          provide: ProviderTokenEnum.PROXY_ACL_SERVICE_DEFAULT,
          useValue: proxyAclService,
        },
      ],
    }).compile();

    controller = module.get<AclHttpController>(AclHttpController);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe(`Get all acl`, () => {
    let inputFilter: FindAclQueryDto;
    let inputFilterWithUserId: FindAclQueryDto;

    let outputProxyAclModel1: ProxyAclModel;

    beforeEach(() => {
      inputFilter = new FindAclQueryDto();

      inputFilterWithUserId = new FindAclQueryDto();
      inputFilterWithUserId.filters = {user: {id: identifierMock.generateId()}};

      outputProxyAclModel1 = new ProxyAclModel({
        id: identifierMock.generateId(),
        mode: ProxyAclMode.ALL,
        type: ProxyAclType.USER_PORT,
        user: {
          id: identifierMock.generateId(),
          username: 'user1',
          password: 'pass1',
          isEnable: true,
          insertDate: new Date(),
        },
        proxies: null,
        insertDate: null,
      });
    });

    it(`Should error get all acl (Without filter)`, async () => {
      proxyAclService.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.findAll(inputFilter);

      expect(proxyAclService.getAll).toHaveBeenCalled();
      expect(proxyAclService.getAll).toHaveBeenCalledWith(new FilterModel<ProxyAclModel>());
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all acl (Without filter)`, async () => {
      proxyAclService.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.findAll(inputFilter);

      expect(proxyAclService.getAll).toHaveBeenCalled();
      expect(proxyAclService.getAll.mock.calls[0][0].getConditionList()).toHaveLength(0);
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should error get all acl (With filter)`, async () => {
      proxyAclService.getAll.mockResolvedValue([new UnknownException()]);

      const [error] = await controller.findAll(inputFilterWithUserId);

      expect(proxyAclService.getAll).toHaveBeenCalled();
      expect(proxyAclService.getAll.mock.calls[0][0].getConditionList()).toHaveLength(1);
      expect(proxyAclService.getAll.mock.calls[0][0].getCondition('user')).toEqual({
        $opr: 'eq',
        user: defaultModelFactory<UsersModel>(
          UsersModel,
          {
            id: identifierMock.generateId(),
            username: expect.anything(),
            password: expect.anything(),
            insertDate: expect.anything(),
          },
          ['username', 'password', 'insertDate'],
        ),
      });
      expect(error).toBeInstanceOf(UnknownException);
    });

    it(`Should successfully get all acl (With filter)`, async () => {
      proxyAclService.getAll.mockResolvedValue([null, [outputProxyAclModel1], 1]);

      const [error, result, total] = await controller.findAll(inputFilterWithUserId);

      expect(proxyAclService.getAll).toHaveBeenCalled();
      expect(proxyAclService.getAll.mock.calls[0][0].getConditionList()).toHaveLength(1);
      expect(proxyAclService.getAll.mock.calls[0][0].getCondition('user')).toEqual({
        $opr: 'eq',
        user: defaultModelFactory<UsersModel>(
          UsersModel,
          {
            id: identifierMock.generateId(),
            username: expect.anything(),
            password: expect.anything(),
            insertDate: expect.anything(),
          },
          ['username', 'password', 'insertDate'],
        ),
      });
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(outputProxyAclModel1);
      expect(total).toEqual(1);
    });
  });
});
