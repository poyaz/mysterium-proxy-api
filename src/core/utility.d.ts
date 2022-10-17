export type Maybe<T> = T | null;
export type AsyncReturn<E, D> = typeof E extends null | undefined
  ? [E]
  : D extends null | undefined
    ? [null | undefined, null | undefined]
    : D extends Array<any>
      ? [null | undefined, D, number]
      : [null | undefined, D];
export type Return<E, D> = AsyncReturn<E, D>;

export type ModelRequireProp<T> = Pick<T, { [K in keyof T]: T[K] extends Function ? never : K }[keyof T]>;

export type PickOne<T> = { [P in keyof T]: Record<P, T[P]> & Partial<Record<Exclude<keyof T, P>, undefined>> }[keyof T];

export type KnownKeys<T> = {
  [K in keyof T]: string extends K ? never : number extends K ? never : K
} extends { [_ in keyof T]: infer U } ? U : never;

export type ClassConstructor<T> = {
  new(...args: any[]): T;
};

type UniqueArray<T> =
  T extends readonly [infer X, ...infer Rest]
    ? InArray<Rest, X> extends true
    ? never
    : readonly [X, ...UniqueArray<Rest>]
    : T;

type InArray<T, X> =
  T extends readonly [X, ...infer _Rest]
    ? true
    : T extends readonly [X]
    ? true
    : T extends readonly [infer _, ...infer Rest]
      ? InArray<Rest, X>
      : false;
