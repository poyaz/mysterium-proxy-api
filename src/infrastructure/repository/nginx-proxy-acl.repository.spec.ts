import {NginxProxyAclRepository} from './nginx-proxy-acl.repository';
import {mock, MockProxy} from 'jest-mock-extended';
import {IIdentifier} from '@src-core/interface/i-identifier.interface';
import {Test, TestingModule} from '@nestjs/testing';
import {FilterModel} from '@src-core/model/filter.model';
import {ProxyAclMode, ProxyAclModel, ProxyAclType} from '@src-core/model/proxyAclModel';
import * as fsAsync from 'fs/promises';
import {defaultModelFactory} from '@src-core/model/defaultModel';
import {UsersModel} from '@src-core/model/users.model';
import {ProxyUpstreamModel} from '@src-core/model/proxy.model';
import {RepositoryException} from '@src-core/exception/repository.exception';
import {InvalidAclFileException} from '@src-core/exception/invalid-acl-file.exception';
import {UnknownException} from '@src-core/exception/unknown.exception';
import {ExistException} from '@src-core/exception/exist.exception';

jest.mock('fs/promises');

// @todo: think about parse file with line number for create and remove line
describe('NginxProxyAclRepository', () => {
  let repository: NginxProxyAclRepository;
  let identifierMock: MockProxy<IIdentifier>;

  let aclPath: string;

  beforeEach(async () => {
    identifierMock = mock<IIdentifier>();
    identifierMock.generateId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    aclPath = '/path/of/acl/file.conf';

    const identifierProvider = 'identifier-provider';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: identifierProvider,
          useValue: identifierMock,
        },
        {
          provide: NginxProxyAclRepository,
          inject: [identifierProvider],
          useFactory: (identifierMock: IIdentifier) => new NginxProxyAclRepository(identifierMock, aclPath),
        },
      ],
    }).compile();

    repository = module.get<NginxProxyAclRepository>(NginxProxyAclRepository);

    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe(`Get all acl`, () => {
    let inputFilter: FilterModel<ProxyAclModel>;
    let inputUserIdFilter: FilterModel<ProxyAclModel>;
    let inputNotFoundUserIdFilter: FilterModel<ProxyAclModel>;
    let outputFileInvalidPolicy: string;
    let outputFileNoPolicy: string;
    let outputFileInvalidAclRow: string;
    let outputFileAllPolicy: string;
    let outputFileAllWithOtherPolicy: string;
    let outputFileOtherPolicy: string;

    beforeEach(() => {
      inputFilter = new FilterModel<ProxyAclModel>();

      inputUserIdFilter = new FilterModel<ProxyAclModel>();
      inputUserIdFilter.addCondition({
        $opr: 'eq',
        user: defaultModelFactory<UsersModel>(
          UsersModel,
          {
            id: '00000000-0000-0000-0000-333333333333',
            username: 'default-username',
            password: 'default-password',
            insertDate: new Date(),
          },
          ['username', 'password', 'insertDate'],
        ),
      });

      inputNotFoundUserIdFilter = new FilterModel<ProxyAclModel>();
      inputNotFoundUserIdFilter.addCondition({
        $opr: 'eq',
        user: defaultModelFactory<UsersModel>(
          UsersModel,
          {
            id: '00000000-0000-0000-0000-999999999999',
            username: 'default-username',
            password: 'default-password',
            insertDate: new Date(),
          },
          ['username', 'password', 'insertDate'],
        ),
      });

      outputFileInvalidPolicy = [
        '',
        'map $remote_user:$http_x_node_proxy_port $access_status {',
        '',
      ].join('\n');

      outputFileNoPolicy = [
        '',
        'map $remote_user:$http_x_node_proxy_port $access_status {',
        '    default 403;',
        '}',
        '',
      ].join('\n');

      outputFileInvalidAclRow = [
        '',
        'map $remote_user:$http_x_node_proxy_port $access_status {',
        '    default 403;',
        '',
        `    ### id: 22222222-2222-2222-2222-111111111111`,
        `    ### userId: 00000000-0000-0000-0000-333333333333`,
        `    ### date: ${Date.now()}`,
        '    ~user1:4000 200;',
        '',
        `    ### id: 22222222-2222-2222-2222-111111111111`,
        `    ### userId: 00000000-0000-0000-0000-333333333333`,
        '    ~user1:4000 200;',
        '}',
        '',
      ].join('\n');

      outputFileAllPolicy = [
        '',
        'map $remote_user:$http_x_node_proxy_port $access_status {',
        '    default 403;',
        '',
        `    ### id: 22222222-2222-2222-2222-111111111111`,
        `    ### userId: -`,
        `    ### date: ${Date.now()}`,
        '    ~.+:[0-9]+ 200;',
        '}',
        '',
      ].join('\n');

      outputFileAllWithOtherPolicy = [
        '',
        'map $remote_user:$http_x_node_proxy_port $access_status {',
        '    default 403;',
        '',
        `    ### id: 22222222-2222-2222-2222-111111111111`,
        `    ### userId: 00000000-0000-0000-0000-333333333333`,
        `    ### date: ${Date.now()}`,
        '    ~user1:4000 200;',
        '',
        `    ### id: 22222222-2222-2222-2222-222222222222`,
        `    ### userId: -`,
        `    ### date: ${Date.now()}`,
        '    ~.+:[0-9]+ 200;',
        '}',
        '',
      ].join('\n');

      outputFileOtherPolicy = [
        '',
        'map $remote_user:$http_x_node_proxy_port $access_status {',
        '    default 403;',
        '',
        `    ### id: 22222222-2222-2222-2222-111111111111`,
        `    ### userId: 00000000-0000-0000-0000-333333333333`,
        `    ### date: ${Date.now()}`,
        '    user1:4000 200;',
        '',
        `    ### id: 22222222-2222-2222-2222-222222222222`,
        `    ### userId: 00000000-0000-0000-0000-333333333333`,
        `    ### date: ${Date.now()}`,
        '    ~user1:(6000|7000) 200;',
        '',
        `    ### id: 22222222-2222-2222-2222-333333333333`,
        `    ### userId: 00000000-0000-0000-0000-555555555555`,
        `    ### date: ${Date.now()}`,
        '    ~user2:[0-9]+ 200;',
        '',
        `    ### id: 22222222-2222-2222-2222-444444444444`,
        `    ### userId: 00000000-0000-0000-0000-333333333333`,
        `    ### date: ${Date.now()}`,
        '    user1:5000 200;',
        '',
        `    ### id: 22222222-2222-2222-2222-555555555555`,
        `    ### userId: 00000000-0000-0000-0000-333333333333`,
        `    ### date: ${Date.now()}`,
        '    ~user1:[0-9]+ 200;',
        '}',
        '',
      ].join('\n');
    });

    it(`Should error get all proxy acl when read file`, async () => {
      const fileError = new Error('File error');
      (<jest.Mock>fsAsync.readFile).mockRejectedValue(fileError);

      const [error] = await repository.getAll(inputFilter);

      expect(fsAsync.readFile).toHaveBeenCalled();
      expect(fsAsync.readFile).toHaveBeenCalledWith(aclPath, 'utf8');
      expect(error).toBeInstanceOf(RepositoryException);
      expect((error as RepositoryException).additionalInfo).toEqual(fileError);
    });

    it(`Should error get all proxy acl when data is invalid on acl file`, async () => {
      (<jest.Mock>fsAsync.readFile).mockResolvedValue(outputFileInvalidPolicy);

      const [error] = await repository.getAll(inputFilter);

      expect(fsAsync.readFile).toHaveBeenCalled();
      expect(fsAsync.readFile).toHaveBeenCalledWith(aclPath, 'utf8');
      expect(error).toBeInstanceOf(InvalidAclFileException);
    });

    it(`Should successfully get all proxy acl and return empty when not found any role`, async () => {
      (<jest.Mock>fsAsync.readFile).mockResolvedValue(outputFileNoPolicy);

      const [error, result, total] = await repository.getAll(inputFilter);

      expect(fsAsync.readFile).toHaveBeenCalled();
      expect(fsAsync.readFile).toHaveBeenCalledWith(aclPath, 'utf8');
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
      expect(total).toEqual(0);
    });

    it(`Should error get all proxy acl with invalid acl row`, async () => {
      (<jest.Mock>fsAsync.readFile).mockResolvedValue(outputFileInvalidAclRow);

      const [error] = await repository.getAll(inputFilter);

      expect(fsAsync.readFile).toHaveBeenCalled();
      expect(fsAsync.readFile).toHaveBeenCalledWith(aclPath, 'utf8');
      expect(error).toBeInstanceOf(InvalidAclFileException);
    });

    it(`Should successfully get all proxy acl with all access`, async () => {
      (<jest.Mock>fsAsync.readFile).mockResolvedValue(outputFileAllPolicy);

      const [error, result, total] = await repository.getAll(inputFilter);

      expect(fsAsync.readFile).toHaveBeenCalled();
      expect(fsAsync.readFile).toHaveBeenCalledWith(aclPath, 'utf8');
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual<ProxyAclModel>(defaultModelFactory<ProxyAclModel>(
        ProxyAclModel,
        {
          id: '22222222-2222-2222-2222-111111111111',
          mode: ProxyAclMode.ALL,
          type: ProxyAclType.USER_PORT,
          proxies: [],
          insertDate: new Date(),
        },
        ['proxies'],
      ));
      expect(total).toEqual(1);
    });

    it(`Should successfully get all proxy acl with all access and skip other acl (Without filter)`, async () => {
      (<jest.Mock>fsAsync.readFile).mockResolvedValue(outputFileAllWithOtherPolicy);

      const [error, result, total] = await repository.getAll(inputFilter);

      expect(fsAsync.readFile).toHaveBeenCalled();
      expect(fsAsync.readFile).toHaveBeenCalledWith(aclPath, 'utf8');
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual<ProxyAclModel>(defaultModelFactory<ProxyAclModel>(
        ProxyAclModel,
        {
          id: '22222222-2222-2222-2222-222222222222',
          mode: ProxyAclMode.ALL,
          type: ProxyAclType.USER_PORT,
          proxies: [],
          insertDate: new Date(),
        },
        ['proxies'],
      ));
      expect(total).toEqual(1);
    });

    it(`Should successfully get all proxy acl with other access (Without filter)`, async () => {
      (<jest.Mock>fsAsync.readFile).mockResolvedValue(outputFileOtherPolicy);

      const [error, result, total] = await repository.getAll(inputFilter);

      expect(fsAsync.readFile).toHaveBeenCalled();
      expect(fsAsync.readFile).toHaveBeenCalledWith(aclPath, 'utf8');
      expect(error).toBeNull();
      expect(result).toHaveLength(5);
      expect(result[0]).toEqual<ProxyAclModel>(defaultModelFactory<ProxyAclModel>(
        ProxyAclModel,
        {
          id: '22222222-2222-2222-2222-555555555555',
          mode: ProxyAclMode.ALL,
          type: ProxyAclType.USER_PORT,
          user: defaultModelFactory<UsersModel>(
            UsersModel,
            {
              id: '00000000-0000-0000-0000-333333333333',
              username: 'default-username',
              password: 'default-password',
              insertDate: new Date(),
            },
            ['username', 'password', 'insertDate'],
          ),
          proxies: [],
          insertDate: new Date(),
        },
        ['proxies'],
      ));
      expect(result[1]).toEqual<Omit<ProxyAclModel, 'clone'>>({
        id: '22222222-2222-2222-2222-444444444444',
        mode: ProxyAclMode.CUSTOM,
        type: ProxyAclType.USER_PORT,
        user: defaultModelFactory<UsersModel>(
          UsersModel,
          {
            id: '00000000-0000-0000-0000-333333333333',
            username: 'default-username',
            password: 'default-password',
            insertDate: new Date(),
          },
          ['username', 'password', 'insertDate'],
        ),
        proxies: [
          defaultModelFactory<ProxyUpstreamModel>(
            ProxyUpstreamModel,
            {
              id: 'default-id',
              listenAddr: 'default-listen-addr',
              listenPort: 5000,
              proxyDownstream: [],
              insertDate: new Date(),
            },
            ['id', 'listenAddr', 'proxyDownstream', 'insertDate'],
          ),
        ],
        insertDate: new Date(),
      });
      expect(result[2]).toEqual<Omit<ProxyAclModel, 'clone'>>({
        id: '22222222-2222-2222-2222-222222222222',
        mode: ProxyAclMode.CUSTOM,
        type: ProxyAclType.USER_PORT,
        user: defaultModelFactory<UsersModel>(
          UsersModel,
          {
            id: '00000000-0000-0000-0000-333333333333',
            username: 'default-username',
            password: 'default-password',
            insertDate: new Date(),
          },
          ['username', 'password', 'insertDate'],
        ),
        proxies: [
          defaultModelFactory<ProxyUpstreamModel>(
            ProxyUpstreamModel,
            {
              id: 'default-id',
              listenAddr: 'default-listen-addr',
              listenPort: 6000,
              proxyDownstream: [],
              insertDate: new Date(),
            },
            ['id', 'listenAddr', 'proxyDownstream', 'insertDate'],
          ),
          defaultModelFactory<ProxyUpstreamModel>(
            ProxyUpstreamModel,
            {
              id: 'default-id',
              listenAddr: 'default-listen-addr',
              listenPort: 7000,
              proxyDownstream: [],
              insertDate: new Date(),
            },
            ['id', 'listenAddr', 'proxyDownstream', 'insertDate'],
          ),
        ],
        insertDate: new Date(),
      });
      expect(result[3]).toEqual<Omit<ProxyAclModel, 'clone'>>({
        id: '22222222-2222-2222-2222-111111111111',
        mode: ProxyAclMode.CUSTOM,
        type: ProxyAclType.USER_PORT,
        user: defaultModelFactory<UsersModel>(
          UsersModel,
          {
            id: '00000000-0000-0000-0000-333333333333',
            username: 'default-username',
            password: 'default-password',
            insertDate: new Date(),
          },
          ['username', 'password', 'insertDate'],
        ),
        proxies: [
          defaultModelFactory<ProxyUpstreamModel>(
            ProxyUpstreamModel,
            {
              id: 'default-id',
              listenAddr: 'default-listen-addr',
              listenPort: 4000,
              proxyDownstream: [],
              insertDate: new Date(),
            },
            ['id', 'listenAddr', 'proxyDownstream', 'insertDate'],
          ),
        ],
        insertDate: new Date(),
      });
      expect(result[4]).toEqual<ProxyAclModel>(defaultModelFactory<ProxyAclModel>(
        ProxyAclModel,
        {
          id: '22222222-2222-2222-2222-333333333333',
          mode: ProxyAclMode.ALL,
          type: ProxyAclType.USER_PORT,
          user: defaultModelFactory<UsersModel>(
            UsersModel,
            {
              id: '00000000-0000-0000-0000-555555555555',
              username: 'default-username',
              password: 'default-password',
              insertDate: new Date(),
            },
            ['username', 'password', 'insertDate'],
          ),
          proxies: [],
          insertDate: new Date(),
        },
        ['proxies'],
      ));
      expect(total).toEqual(5);
    });

    it(`Should successfully get all proxy acl with all access and skip other acl (ignore user id filter)`, async () => {
      (<jest.Mock>fsAsync.readFile).mockResolvedValue(outputFileAllWithOtherPolicy);

      const [error, result, total] = await repository.getAll(inputUserIdFilter);

      expect(fsAsync.readFile).toHaveBeenCalled();
      expect(fsAsync.readFile).toHaveBeenCalledWith(aclPath, 'utf8');
      expect(error).toBeNull();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual<ProxyAclModel>(defaultModelFactory<ProxyAclModel>(
        ProxyAclModel,
        {
          id: '22222222-2222-2222-2222-222222222222',
          mode: ProxyAclMode.ALL,
          type: ProxyAclType.USER_PORT,
          proxies: [],
          insertDate: new Date(),
        },
        ['proxies'],
      ));
      expect(total).toEqual(1);
    });

    it(`Should successfully get all proxy acl with other access (With user id filter)`, async () => {
      (<jest.Mock>fsAsync.readFile).mockResolvedValue(outputFileOtherPolicy);

      const [error, result, total] = await repository.getAll(inputUserIdFilter);

      expect(fsAsync.readFile).toHaveBeenCalled();
      expect(fsAsync.readFile).toHaveBeenCalledWith(aclPath, 'utf8');
      expect(error).toBeNull();
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual<ProxyAclModel>(defaultModelFactory<ProxyAclModel>(
        ProxyAclModel,
        {
          id: '22222222-2222-2222-2222-555555555555',
          mode: ProxyAclMode.ALL,
          type: ProxyAclType.USER_PORT,
          user: defaultModelFactory<UsersModel>(
            UsersModel,
            {
              id: '00000000-0000-0000-0000-333333333333',
              username: 'default-username',
              password: 'default-password',
              insertDate: new Date(),
            },
            ['username', 'password', 'insertDate'],
          ),
          proxies: [],
          insertDate: new Date(),
        },
        ['proxies'],
      ));
      expect(result[1]).toEqual<Omit<ProxyAclModel, 'clone'>>({
        id: '22222222-2222-2222-2222-444444444444',
        mode: ProxyAclMode.CUSTOM,
        type: ProxyAclType.USER_PORT,
        user: defaultModelFactory<UsersModel>(
          UsersModel,
          {
            id: '00000000-0000-0000-0000-333333333333',
            username: 'default-username',
            password: 'default-password',
            insertDate: new Date(),
          },
          ['username', 'password', 'insertDate'],
        ),
        proxies: [
          defaultModelFactory<ProxyUpstreamModel>(
            ProxyUpstreamModel,
            {
              id: 'default-id',
              listenAddr: 'default-listen-addr',
              listenPort: 5000,
              proxyDownstream: [],
              insertDate: new Date(),
            },
            ['id', 'listenAddr', 'proxyDownstream', 'insertDate'],
          ),
        ],
        insertDate: new Date(),
      });
      expect(result[2]).toEqual<Omit<ProxyAclModel, 'clone'>>({
        id: '22222222-2222-2222-2222-222222222222',
        mode: ProxyAclMode.CUSTOM,
        type: ProxyAclType.USER_PORT,
        user: defaultModelFactory<UsersModel>(
          UsersModel,
          {
            id: '00000000-0000-0000-0000-333333333333',
            username: 'default-username',
            password: 'default-password',
            insertDate: new Date(),
          },
          ['username', 'password', 'insertDate'],
        ),
        proxies: [
          defaultModelFactory<ProxyUpstreamModel>(
            ProxyUpstreamModel,
            {
              id: 'default-id',
              listenAddr: 'default-listen-addr',
              listenPort: 6000,
              proxyDownstream: [],
              insertDate: new Date(),
            },
            ['id', 'listenAddr', 'proxyDownstream', 'insertDate'],
          ),
          defaultModelFactory<ProxyUpstreamModel>(
            ProxyUpstreamModel,
            {
              id: 'default-id',
              listenAddr: 'default-listen-addr',
              listenPort: 7000,
              proxyDownstream: [],
              insertDate: new Date(),
            },
            ['id', 'listenAddr', 'proxyDownstream', 'insertDate'],
          ),
        ],
        insertDate: new Date(),
      });
      expect(result[3]).toEqual<Omit<ProxyAclModel, 'clone'>>({
        id: '22222222-2222-2222-2222-111111111111',
        mode: ProxyAclMode.CUSTOM,
        type: ProxyAclType.USER_PORT,
        user: defaultModelFactory<UsersModel>(
          UsersModel,
          {
            id: '00000000-0000-0000-0000-333333333333',
            username: 'default-username',
            password: 'default-password',
            insertDate: new Date(),
          },
          ['username', 'password', 'insertDate'],
        ),
        proxies: [
          defaultModelFactory<ProxyUpstreamModel>(
            ProxyUpstreamModel,
            {
              id: 'default-id',
              listenAddr: 'default-listen-addr',
              listenPort: 4000,
              proxyDownstream: [],
              insertDate: new Date(),
            },
            ['id', 'listenAddr', 'proxyDownstream', 'insertDate'],
          ),
        ],
        insertDate: new Date(),
      });
      expect(total).toEqual(4);
    });

    it(`Should successfully get all proxy acl and return empty when user filter not found`, async () => {
      (<jest.Mock>fsAsync.readFile).mockResolvedValue(outputFileOtherPolicy);

      const [error, result, total] = await repository.getAll(inputNotFoundUserIdFilter);

      expect(fsAsync.readFile).toHaveBeenCalled();
      expect(fsAsync.readFile).toHaveBeenCalledWith(aclPath, 'utf8');
      expect(error).toBeNull();
      expect(result).toHaveLength(0);
      expect(total).toEqual(0);
    });
  });
});
