import {ClassConstructor, Return, UniqueArray} from '@src-core/utility';
import {RunnerLabelNamespace, RunnerObjectLabel} from '@src-core/model/runner.model';
import {MystIdentityModel} from '@src-core/model/myst-identity.model';
import {defaultModelType, defaultModelFactory} from '@src-core/model/defaultModel';
import {FillDataRepositoryException} from '@src-core/exception/fill-data-repository.exception';
import {
  VpnProviderIpTypeEnum,
  VpnProviderModel,
  VpnProviderName,
  VpnServiceTypeEnum,
} from '@src-core/model/vpn-provider.model';

export class DockerLabelParser<T> {
  private _models: Array<{ namespace: string, data: any }> = [];

  constructor(private readonly _label: RunnerLabelNamespace<T>) {
  }

  parseLabel(): [Error] {
    const tmpLabelList = Array.isArray(this._label) ? this._label : [this._label];
    let isError = false;

    for (const labelData of tmpLabelList) {
      if (labelData.$namespace === MystIdentityModel.name) {
        this._fillMystIdentity(labelData.$namespace, labelData);
        continue;
      }

      if (labelData.$namespace === VpnProviderModel.name) {
        this._fillVpnProvider(labelData.$namespace, labelData);
        continue;
      }

      isError = true;
      break;
    }

    if (isError) {
      return [new FillDataRepositoryException<RunnerLabelNamespace<Object>>(['$namespace'])];
    }

    return [null];
  }

  getClassInstance<S>(cls: ClassConstructor<S>): Return<Error, S> {
    const find = this._models.find((v) => v.data instanceof cls);
    if (!find) {
      return [new FillDataRepositoryException<any>([cls.name])];
    }

    return <Return<Error, S>>[null, find.data];
  }

  convertLabelToObject<S>(prefixNamespace: string, ignoreKeys: Array<keyof S> = []): Record<string, string> {
    const obj = {};

    this._models.map((dataModel) => {
      const namespace = dataModel.namespace.replace(/[A-Z]/g, m => '-' + m.toLowerCase()).replace(/^-(.+)$/, '$1');

      Object
        .keys(dataModel.data)
        .filter((v) => v !== 'clone' && v.match(/^[^_].+/))
        .filter((v) => !(<defaultModelType<any>><unknown>dataModel.data).isDefaultProperty(v))
        .filter((v) => ignoreKeys.indexOf(<any><unknown>v) === -1)
        .map((v) => {
          const key = v.replace(/[A-Z]/g, m => '-' + m.toLowerCase()).replace(/^-(.+)$/, '$1');

          obj[`${prefixNamespace}.${namespace}.${key}`] = `${dataModel.data[v]}`;
        });
    });

    return obj;
  }

  static convertObjectToLabel<T>(prefixNamespace: string, obj: Object): RunnerLabelNamespace<T> | null {
    const runnerLabelList = [];

    Object
      .keys(obj)
      .filter((v) => v.match(new RegExp(`^${prefixNamespace}\\.[^.]+\\.[^.]+`)))
      .map((v) => {
        const [, name, key] = new RegExp(`^${prefixNamespace}\\.([^.]+)\\.([^.]+)`).exec(v);
        const tempModuleName = name.replace(/-([a-z])/g, (g) => {
          return g[1].toUpperCase();
        });
        const moduleName = tempModuleName.charAt(0).toUpperCase() + tempModuleName.slice(1);
        const propertyName = key.replace(/-([a-z])/g, function (g) {
          return g[1].toUpperCase();
        });

        let namespace: string;
        switch (moduleName) {
          case MystIdentityModel.name:
            namespace = moduleName;
            break;
          case VpnProviderModel.name:
            namespace = moduleName;
            break;
        }

        const find = runnerLabelList.find((v) => v?.$namespace === namespace);
        if (!find) {
          runnerLabelList.push({$namespace: namespace, [propertyName]: obj[v]});
        } else {
          find[propertyName] = obj[v];
        }
      });

    if (runnerLabelList.length === 0) {
      return null;
    }
    if (runnerLabelList.length === 1) {
      return <RunnerLabelNamespace<T>><unknown>runnerLabelList[0];
    }

    return <RunnerLabelNamespace<T>><unknown>runnerLabelList;
  }

  private _fillMystIdentity(namespace: string, data: MystIdentityModel): void {
    const defaultProperties: Array<keyof MystIdentityModel> = ['path', 'filename', 'isUse', 'insertDate'];
    const fillObject: Pick<MystIdentityModel, 'id' | 'identity' | 'passphrase'> = {
      id: 'default-id',
      identity: 'default-identity',
      passphrase: 'default-passphrase',
    };

    if (<keyof MystIdentityModel>'id' in data) {
      fillObject.id = data.id;
    } else {
      defaultProperties.push('id');
    }

    if (<keyof MystIdentityModel>'identity' in data) {
      fillObject.identity = data.identity;
    } else {
      defaultProperties.push('identity');
    }

    if (<keyof MystIdentityModel>'passphrase' in data) {
      fillObject.passphrase = data.passphrase;
    } else {
      defaultProperties.push('passphrase');
    }

    this._models.push({
      namespace: namespace,
      data: defaultModelFactory<MystIdentityModel>(
        MystIdentityModel,
        {
          ...fillObject,
          path: 'default-path',
          filename: 'default-filename',
          isUse: false,
          insertDate: new Date(),
        },
        defaultProperties,
      ),
    });
  }

  private _fillVpnProvider(namespace: string, data: VpnProviderModel): void {
    const defaultProperties: Array<keyof VpnProviderModel> = ['serviceType', 'providerName', 'providerIpType', 'country', 'isRegister', 'insertDate'];
    const fillObject: Pick<VpnProviderModel, 'id' | 'userIdentity' | 'providerIdentity'> = {
      id: 'default-id',
      userIdentity: 'default-userIdentity',
      providerIdentity: 'default-providerIdentity',
    };

    if (<keyof VpnProviderModel>'id' in data) {
      fillObject.id = data.id;
    } else {
      defaultProperties.push('id');
    }

    if (<keyof VpnProviderModel>'userIdentity' in data) {
      fillObject.userIdentity = data.userIdentity;
    } else {
      defaultProperties.push('userIdentity');
    }

    if (<keyof VpnProviderModel>'providerIdentity' in data) {
      fillObject.providerIdentity = data.providerIdentity;
    } else {
      defaultProperties.push('providerIdentity');
    }

    this._models.push({
      namespace: namespace,
      data: defaultModelFactory<VpnProviderModel>(
        VpnProviderModel,
        {
          ...fillObject,
          serviceType: VpnServiceTypeEnum.WIREGUARD,
          providerName: VpnProviderName.MYSTERIUM,
          providerIpType: VpnProviderIpTypeEnum.HOSTING,
          country: 'GB',
          isRegister: false,
          insertDate: new Date(),
        },
        defaultProperties,
      ),
    });
  }
}
