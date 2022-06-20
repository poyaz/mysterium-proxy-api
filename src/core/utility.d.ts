export type Maybe<T> = T | null;
export type AsyncReturn<E, R> = [Maybe<E>, Maybe<R>?];

export type ModelRequireProp<T> = Pick<T, { [K in keyof T]: T[K] extends Function ? never : K }[keyof T]>;

export type UpdateInstanceType<T> = Partial<Omit<Pick<T, { [K in keyof T]: T[K] extends Function ? never : K }[keyof T]>, 'id' | 'insertDate'>>;
