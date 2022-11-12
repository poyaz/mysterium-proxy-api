import {DockerLabelParser} from './docker-label-parser';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {RunnerLabelNamespace} from '@src-core/model/runner.model';
import {DefaultModel} from '@src-core/model/defaultModel';
import {FillDataRepositoryException} from '@src-core/exception/fill-data-repository.exception';
import {VpnProviderModel} from '@src-core/model/vpn-provider.model';
import {ProxyDownstreamModel, ProxyUpstreamModel} from '@src-core/model/proxy.model';

describe('DockerLabelParser', () => {
  it('should be defined', () => {
    expect(new DockerLabelParser({$namespace: 'any'})).toBeDefined();
  });

  describe(`Docker label parser`, () => {
    let label1: RunnerLabelNamespace<{}>;
    let parser1: DockerLabelParser<{}>;

    let label2: RunnerLabelNamespace<MystIdentityModel>;
    let parser2: DockerLabelParser<MystIdentityModel>;

    let label3: RunnerLabelNamespace<MystIdentityModel>;
    let parser3: DockerLabelParser<MystIdentityModel>;

    let label4: RunnerLabelNamespace<VpnProviderModel>;
    let parser4: DockerLabelParser<VpnProviderModel>;

    let label5: RunnerLabelNamespace<VpnProviderModel>;
    let parser5: DockerLabelParser<VpnProviderModel>;

    let label6: RunnerLabelNamespace<ProxyDownstreamModel>;
    let parser6: DockerLabelParser<ProxyDownstreamModel>;

    let label7: RunnerLabelNamespace<ProxyUpstreamModel>;
    let parser7: DockerLabelParser<ProxyUpstreamModel>;

    beforeEach(() => {
      label1 = {
        $namespace: 'custom',
      };
      parser1 = new DockerLabelParser<{}>(label1);

      label2 = {
        $namespace: MystIdentityModel.name,
        id: 'id',
        identity: 'identity',
        passphrase: 'passphrase',
      };
      parser2 = new DockerLabelParser<MystIdentityModel>(label2);

      label3 = {
        $namespace: MystIdentityModel.name,
        id: 'id',
      };
      parser3 = new DockerLabelParser<MystIdentityModel>(label3);

      label4 = {
        $namespace: VpnProviderModel.name,
        userIdentity: 'userIdentity',
        providerIdentity: 'providerIdentity',
      };
      parser4 = new DockerLabelParser<VpnProviderModel>(label4);

      label5 = {
        $namespace: VpnProviderModel.name,
        userIdentity: 'userIdentity',
      };
      parser5 = new DockerLabelParser<VpnProviderModel>(label5);

      label6 = {
        $namespace: ProxyDownstreamModel.name,
        id: 'proxy-downstream-id',
      };
      parser6 = new DockerLabelParser<ProxyDownstreamModel>(label6);

      label7 = {
        $namespace: ProxyUpstreamModel.name,
        id: 'proxy-downstream-id',
      };
      parser7 = new DockerLabelParser<ProxyUpstreamModel>(label7);
    });

    it(`Should error parse label`, () => {
      const [error] = parser1.parseLabel();

      expect(error).toBeInstanceOf(FillDataRepositoryException);
    });

    it(`Should error get class instance`, () => {
      parser2.parseLabel();

      const [error] = parser2.getClassInstance<VpnProviderModel>(VpnProviderModel);

      expect(error).toBeInstanceOf(FillDataRepositoryException);
      expect((<FillDataRepositoryException<any>>error).fillProperties).toEqual(expect.arrayContaining([VpnProviderModel.name]));
    });

    describe(`Get myst identity model`, () => {
      it(`Should parse label and get class instance for myst identity with three valid key value`, () => {
        parser2.parseLabel();

        const [error, result] = parser2.getClassInstance<MystIdentityModel>(MystIdentityModel);

        expect(error).toBeNull();
        expect(result).toBeInstanceOf(MystIdentityModel);
        expect(result).toMatchObject<Pick<MystIdentityModel, 'id' | 'identity' | 'passphrase'>>({
          id: label2.id,
          identity: label2.identity,
          passphrase: label2.passphrase,
        });
        expect(result).toEqual(expect.objectContaining({
          isDefaultProperty: expect.anything(),
          getDefaultProperties: expect.anything(),
        }));
        expect((<DefaultModel<MystIdentityModel>><unknown>result).getDefaultProperties()).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['path', 'filename', 'isUse', 'insertDate']));
      });

      it(`Should parse label and get class instance for myst identity with one valid key value`, () => {
        parser3.parseLabel();

        const [error, result] = parser3.getClassInstance<MystIdentityModel>(MystIdentityModel);

        expect(error).toBeNull();
        expect(result).toBeInstanceOf(MystIdentityModel);
        expect(result).toMatchObject<Pick<MystIdentityModel, 'id'>>({
          id: label3.id,
        });
        expect(result).toEqual(expect.objectContaining({
          isDefaultProperty: expect.anything(),
          getDefaultProperties: expect.anything(),
        }));
        expect((<DefaultModel<MystIdentityModel>><unknown>result).getDefaultProperties()).toEqual(expect.arrayContaining<keyof MystIdentityModel>(['identity', 'passphrase', 'path', 'filename', 'isUse', 'insertDate']));
      });
    });

    describe(`Get vpn provider model`, () => {
      it(`Should parse label and get class instance for vpn provider with two valid key value`, () => {
        parser4.parseLabel();

        const [error, result] = parser4.getClassInstance<VpnProviderModel>(VpnProviderModel);

        expect(error).toBeNull();
        expect(result).toBeInstanceOf(VpnProviderModel);
        expect(result).toMatchObject<Pick<VpnProviderModel, 'userIdentity' | 'providerIdentity'>>({
          userIdentity: label4.userIdentity,
          providerIdentity: label4.providerIdentity,
        });
        expect(result).toEqual(expect.objectContaining({
          isDefaultProperty: expect.anything(),
          getDefaultProperties: expect.anything(),
        }));
        expect((<DefaultModel<VpnProviderModel>><unknown>result).getDefaultProperties()).toEqual(expect.arrayContaining<keyof VpnProviderModel>(['id', 'serviceType', 'providerName', 'providerIpType', 'country', 'isRegister', 'insertDate']));
      });

      it(`Should parse label and get class instance for vpn provider with one valid key value`, () => {
        parser5.parseLabel();

        const [error, result] = parser5.getClassInstance<VpnProviderModel>(VpnProviderModel);

        expect(error).toBeNull();
        expect(result).toBeInstanceOf(VpnProviderModel);
        expect(result).toMatchObject<Pick<VpnProviderModel, 'userIdentity'>>({
          userIdentity: label5.userIdentity,
        });
        expect(result).toEqual(expect.objectContaining({
          isDefaultProperty: expect.anything(),
          getDefaultProperties: expect.anything(),
        }));
        expect((<DefaultModel<VpnProviderModel>><unknown>result).getDefaultProperties()).toEqual(expect.arrayContaining<keyof VpnProviderModel>(['id', 'serviceType', 'providerName', 'providerIdentity', 'providerIpType', 'country', 'isRegister', 'insertDate']));
      });
    });

    describe(`Get proxy downstream model`, () => {
      it(`Should parse label and get class instance for proxy downstream with valid key value`, () => {
        parser6.parseLabel();

        const [error, result] = parser6.getClassInstance<ProxyDownstreamModel>(ProxyDownstreamModel);

        expect(error).toBeNull();
        expect(result).toBeInstanceOf(ProxyDownstreamModel);
        expect(result).toMatchObject<Pick<ProxyDownstreamModel, 'id'>>({
          id: label6.id,
        });
        expect(result).toEqual(expect.objectContaining({
          isDefaultProperty: expect.anything(),
          getDefaultProperties: expect.anything(),
        }));
        expect((<DefaultModel<ProxyDownstreamModel>><unknown>result).getDefaultProperties()).toEqual(expect.arrayContaining<keyof ProxyDownstreamModel>(['refId', 'ip', 'mask', 'type', 'status']));
      });
    });

    describe(`Get proxy upstream model`, () => {
      it(`Should parse label and get class instance for proxy upstream with valid key value`, () => {
        parser7.parseLabel();

        const [error, result] = parser7.getClassInstance<ProxyUpstreamModel>(ProxyUpstreamModel);

        expect(error).toBeNull();
        expect(result).toBeInstanceOf(ProxyUpstreamModel);
        expect(result).toMatchObject<Pick<ProxyUpstreamModel, 'id'>>({
          id: label7.id,
        });
        expect(result).toEqual(expect.objectContaining({
          isDefaultProperty: expect.anything(),
          getDefaultProperties: expect.anything(),
        }));
        expect((<DefaultModel<ProxyUpstreamModel>><unknown>result).getDefaultProperties()).toEqual(expect.arrayContaining<keyof ProxyUpstreamModel>(['listenAddr', 'listenPort', 'proxyDownstream', 'insertDate']));
      });
    });
  });

  describe(`Convert label to object`, () => {
    let prefixNamespace: string;
    let label1: RunnerLabelNamespace<MystIdentityModel>;
    let parser1: DockerLabelParser<MystIdentityModel>;
    let label2: RunnerLabelNamespace<MystIdentityModel>;
    let parser2: DockerLabelParser<MystIdentityModel>;
    let label3: RunnerLabelNamespace<VpnProviderModel>;
    let parser3: DockerLabelParser<VpnProviderModel>;

    beforeEach(() => {
      prefixNamespace = 'com.test';

      label1 = {
        $namespace: MystIdentityModel.name,
      };
      parser1 = new DockerLabelParser<MystIdentityModel>(label1);

      label2 = {
        $namespace: MystIdentityModel.name,
        id: 'id',
        identity: 'identity',
        passphrase: 'passphrase',
      };
      parser2 = new DockerLabelParser<MystIdentityModel>(label2);

      label3 = {
        $namespace: VpnProviderModel.name,
        userIdentity: 'userIdentity',
        providerIdentity: 'providerIdentity',
      };
      parser3 = new DockerLabelParser<VpnProviderModel>(label3);
    });

    it(`Should return object label with empty object`, () => {
      parser1.parseLabel();

      const result = parser1.convertLabelToObject(prefixNamespace);

      expect(Object.keys(result)).toHaveLength(0);
    });

    it(`Should return object label for myst identity`, () => {
      parser2.parseLabel();

      const result = parser2.convertLabelToObject(prefixNamespace);

      expect(Object.keys(result)).toHaveLength(3);
      expect(result).toMatchObject({
        [`${prefixNamespace}.myst-identity-model.id`]: label2.id,
        [`${prefixNamespace}.myst-identity-model.identity`]: label2.identity,
        [`${prefixNamespace}.myst-identity-model.passphrase`]: label2.passphrase,
      });
    });

    it(`Should return object label for myst identity (ignore custom key)`, () => {
      parser2.parseLabel();

      const result = parser2.convertLabelToObject<MystIdentityModel>(prefixNamespace, ['passphrase']);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result).toEqual({
        [`${prefixNamespace}.myst-identity-model.id`]: label2.id,
        [`${prefixNamespace}.myst-identity-model.identity`]: label2.identity,
      });
    });

    it(`Should return object label for vpn provider`, () => {
      parser3.parseLabel();

      const result = parser3.convertLabelToObject(prefixNamespace);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result).toMatchObject({
        [`${prefixNamespace}.vpn-provider-model.user-identity`]: label3.userIdentity,
        [`${prefixNamespace}.vpn-provider-model.provider-identity`]: label3.providerIdentity,
      });
    });
  });

  describe(`Convert object to label`, () => {
    let prefixNamespace: string;
    let notMatchObj: Object;
    let oneMatchObj: Object;
    let twoMatchObj: Object;

    beforeEach(() => {
      prefixNamespace = 'com.test';

      notMatchObj = {
        'not.match.label.id': 'id',
      };

      oneMatchObj = {
        'not.match.label.id': 'id',
        [`${prefixNamespace}.myst-identity-model.id`]: 'obj1-myst-identity-id',
        [`${prefixNamespace}.myst-identity-model.identity`]: 'obj1-myst-identity-identity',
        [`${prefixNamespace}.myst-identity-model.passphrase`]: 'obj1-myst-identity-passphrase',
      };

      twoMatchObj = {
        'not.match.label.id': 'id',
        [`${prefixNamespace}.myst-identity-model.id`]: 'obj2-myst-identity-id',
        [`${prefixNamespace}.myst-identity-model.identity`]: 'obj2-myst-identity-identity',
        [`${prefixNamespace}.vpn-provider-model.user-identity`]: 'obj2-vpn-provider-userIdentity',
        [`${prefixNamespace}.vpn-provider-model.provider-identity`]: 'obj2-vpn-provider-providerIdentity',
      };
    });

    it(`Should return object empty if not found match label`, () => {
      const result = DockerLabelParser.convertObjectToLabel(prefixNamespace, notMatchObj);

      expect(result).toBeNull();
    });

    it(`Should return one label after parse object`, () => {
      const result = DockerLabelParser.convertObjectToLabel(prefixNamespace, oneMatchObj);

      expect(Object.keys(result)).toHaveLength(4);
      expect(result).toMatchObject(<RunnerLabelNamespace<MystIdentityModel>>{
        $namespace: MystIdentityModel.name,
        id: oneMatchObj[`${prefixNamespace}.myst-identity-model.id`],
        identity: oneMatchObj[`${prefixNamespace}.myst-identity-model.identity`],
        passphrase: oneMatchObj[`${prefixNamespace}.myst-identity-model.passphrase`],
      });
    });

    it(`Should return two label after parse object`, () => {
      const result = DockerLabelParser.convertObjectToLabel(prefixNamespace, twoMatchObj);

      expect(result).toHaveLength(2);
      expect(Object.keys(result[0])).toHaveLength(3);
      expect(result[0]).toMatchObject(<RunnerLabelNamespace<MystIdentityModel>>{
        $namespace: MystIdentityModel.name,
        id: twoMatchObj[`${prefixNamespace}.myst-identity-model.id`],
        identity: twoMatchObj[`${prefixNamespace}.myst-identity-model.identity`],
      });
      expect(Object.keys(result[1])).toHaveLength(3);
      expect(result[1]).toMatchObject(<RunnerLabelNamespace<VpnProviderModel>>{
        $namespace: VpnProviderModel.name,
        userIdentity: twoMatchObj[`${prefixNamespace}.vpn-provider-model.user-identity`],
        providerIdentity: twoMatchObj[`${prefixNamespace}.vpn-provider-model.provider-identity`],
      });
    });
  });
});
