
export function convertStringToBoolean(value: string): boolean {
  return ['true', 't', 'yes', 'y', '1'].indexOf(value) > -1;
}
