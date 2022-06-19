export interface FilterInterface {
  name: string;
  condition: string;
  value: any;
}

export class FilterModel extends Array<FilterInterface> {
}
