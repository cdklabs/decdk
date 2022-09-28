import * as reflect from 'jsii-reflect';

export function isEnum(
  type: reflect.Type | undefined
): type is reflect.EnumType {
  return type instanceof reflect.EnumType;
}

export function isEnumLikeClass(
  cls: reflect.Type | undefined
): cls is reflect.ClassType {
  if (!cls) {
    return false;
  }

  if (!(cls instanceof reflect.ClassType)) {
    return false;
  }
  return (
    enumLikeClassMethods(cls).length > 0 ||
    enumLikeClassProperties(cls).length > 0
  );
}

export function enumLikeClassMethods(cls: reflect.ClassType) {
  return cls.allMethods.filter(
    (m) =>
      m.static &&
      m.returns &&
      m.returns.type.type &&
      m.returns.type.type.extends(cls)
  );
}

export function enumLikeClassProperties(cls: reflect.ClassType) {
  return cls.allProperties.filter(
    (p) => p.static && p.type.type && p.type.type.extends(cls)
  );
}
