import {ClassConstructor, ModelRequireProp} from '@src-core/utility';

export interface DefaultModel<T> {
  isDefaultProperty(property: keyof T): boolean;

  getDefaultProperties(): Array<keyof T>;
}

export function defaultModelFactory<T>(cls: ClassConstructor<T>, properties: Partial<T>, defaultProperties: Array<keyof T>): T & DefaultModel<T> {
  const GenericExtendClass = class extends (<any>cls) implements DefaultModel<T> {
    constructor(props: ModelRequireProp<typeof cls.prototype>, private readonly _defaultProperties: Array<keyof T>) {
      super(props);
    }

    isDefaultProperty(property: keyof T): boolean {
      return this._defaultProperties.includes(property);
    }

    getDefaultProperties(): Array<keyof T> {
      return this._defaultProperties;
    }
  };

  const genericExtendInstance = new (<any>GenericExtendClass)({...defaultProperties, ...properties}, defaultProperties);
  const proxyInstance = new Proxy(genericExtendInstance, {
    get(target, prop, receiver) {
      return Reflect.get(target, prop, receiver);
    },
    set(obj, prop, value) {
      obj['_defaultProperties'] = obj['_defaultProperties'].filter((v) => v != prop);

      obj[prop] = value;

      return true;
    },
  });

  return <T & DefaultModel<T>>proxyInstance;
}
