import {UpdateInstanceType} from '../utility';

export class UpdateModel<T> {
  id: string;

  constructor(id: string, props: UpdateInstanceType<T>) {
    this.id = id;
    delete props['id'];
    delete props['insertDate'];

    Object.assign(this, props);
  }
}
