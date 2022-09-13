import {ClassConstructor, ModelRequireProp} from '@src-core/utility';

export type defaultModelType<T> = Omit<T, 'clone'> & DefaultModel<T>;

export interface DefaultModel<T> {
  isDefaultProperty(property: keyof T): boolean;

  getDefaultProperties(): Array<keyof T>;

  clone(): defaultModelType<T>;
}

export function defaultModelFactory<T>(cls: ClassConstructor<T>, properties: Partial<T>, defaultProperties: Array<keyof T>): defaultModelType<T> {
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

    clone(): defaultModelType<T> {
      const cloneDefaultProperties = [...this._defaultProperties];
      const obj = Object.assign(Object.create(this), this);
      obj._defaultProperties = cloneDefaultProperties;

      return obj;
    }
  };

  const genericExtendInstance = new (<any>GenericExtendClass)(properties, defaultProperties);
  const proxyInstance = new Proxy(genericExtendInstance, {
    get(target, prop, receiver) {
      return Reflect.get(target, prop, receiver);
    },
    set(obj, prop, value) {
      obj['_defaultProperties'] = obj['_defaultProperties'].filter((v) => v !== prop);

      obj[prop] = value;

      return true;
    },
  });

  return <defaultModelType<T>>proxyInstance;
}
