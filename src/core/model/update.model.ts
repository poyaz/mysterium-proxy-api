export type UpdateInstanceType<T> = Partial<Omit<Pick<T, { [K in keyof T]: T[K] extends Function ? never : K }[keyof T]>, 'id' | 'insertDate'>>;

export class UpdateModel<T> {
  id: string;

  constructor(id: string, props: UpdateInstanceType<T>) {
    this.id = id;
    delete props['id'];
    delete props['insertDate'];

    Object.assign(this, props);
  }
}
