import * as reflect from 'jsii-reflect';

export function isBehavioralInterface(
  type: reflect.Type | undefined
): type is reflect.InterfaceType {
  if (!type || !type.isInterfaceType()) {
    return false;
  }

  return type.name.toLocaleUpperCase().startsWith('I');
}
