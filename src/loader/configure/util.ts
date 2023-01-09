export function convertStringToBoolean(value: string): boolean {
  if (!value) {
    return false;
  }

  return ['true', 't', 'yes', 'y', '1'].indexOf(value.toLocaleLowerCase()) > -1;
}
