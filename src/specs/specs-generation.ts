import * as fs from 'fs';
import * as path from 'path';
import * as reflect from 'jsii-reflect';
import { hasPropsParam } from '../type-system';

interface PropertySpec {
  Remarks: string;
  Summary: string;
  Required: boolean;
  Type: string;
  ItemType?: string;
}

interface ParameterSpec {
  readonly Summary: string;
  readonly Type: string;
}

interface MethodSpec {
  readonly Summary: string;
  readonly Static: boolean;
  readonly Parameters: Record<string, ParameterSpec>;
  readonly ReturnType?: string;
}

interface ResourceTypeSpec {
  readonly Properties: Record<string, PropertySpec>;
  readonly Methods: Record<string, MethodSpec>;
  readonly PublicProperties: Record<string, PropertySpec>;
}

interface ModuleTypeSpec {
  readonly ResourceTypes: Record<string, ResourceTypeSpec>;
}

interface RootSpec {
  readonly schemaVersion: string;
  readonly ModuleTypes: Record<string, ModuleTypeSpec>;
}

export function generateDeCDKSpecs(typeSystem: reflect.TypeSystem): RootSpec {
  const moduleName = 'aws_lambda';

  return {
    schemaVersion: currentSchemaVersion(),
    ModuleTypes: Object.fromEntries([
      [`aws-cdk-lib.${moduleName}`, moduleTypeSpec(typeSystem, moduleName)],
    ]),
  };
}

function currentSchemaVersion(): string {
  return JSON.parse(
    fs
      .readFileSync(
        path.join(__dirname, '../../src/specs', 'specs.version.json')
      )
      .toString()
  ).schemaVersion;
}

function getConstructs(typeSystem: reflect.TypeSystem, namespace: string) {
  const constructType = typeSystem.findClass('constructs.Construct');
  const cfnResourceType = typeSystem.findClass('aws-cdk-lib.CfnResource');

  return typeSystem.classes.filter(
    (c) =>
      c.extends(constructType) &&
      !c.extends(cfnResourceType) &&
      !c.abstract &&
      c.spec.namespace === namespace
  );
}

function moduleTypeSpec(
  typeSystem: reflect.TypeSystem,
  moduleName: string
): ModuleTypeSpec {
  const constructs = getConstructs(typeSystem, moduleName);
  return {
    ResourceTypes: Object.fromEntries(
      constructs.map((c) => [c.name, resourceTypeSpec(typeSystem, c)])
    ),
  };
}

function getPublicProperties(c: reflect.ClassType) {
  return Object.fromEntries(
    c.allProperties.filter((p) => !p.protected).map(propertySpec)
  );
}

function resourceTypeSpec(
  typeSystem: reflect.TypeSystem,
  c: reflect.ClassType
): ResourceTypeSpec {
  return {
    Properties: getProperties(typeSystem, c),
    Methods: getMethods(c),
    PublicProperties: getPublicProperties(c),
  };
}

function getProperties(
  typeSystem: reflect.TypeSystem,
  c: reflect.ClassType
): Record<string, PropertySpec> {
  if (!hasPropsParam(c, 2)) {
    return {};
  }

  const propFqn = c.initializer?.parameters?.[2]?.type.fqn;
  if (propFqn != undefined) {
    const propInterface = typeSystem.findInterface(propFqn);

    return Object.fromEntries(propInterface.allProperties.map(propertySpec));
  }

  return {};
}

function getMethods(c: reflect.ClassType): Record<string, MethodSpec> {
  return Object.fromEntries(
    Object.entries(c.getMethods(false)).map(([name, method]) => [
      method.static ? methodFQN(method) : name,
      methodSpec(method),
    ])
  );
}

function methodSpec(m: reflect.Method): MethodSpec {
  const returnType = formatSpecsType(m.returns.type);
  return {
    Parameters: Object.fromEntries(
      m.parameters.map((p) => [p.name, parameterSpec(p)])
    ),
    Summary: m.docs.summary,
    Static: m.static,
    ReturnType: returnType.length > 0 ? returnType : undefined,
  };
}

function parameterSpec(parameter: reflect.Parameter): ParameterSpec {
  return {
    Summary: parameter.docs.summary,
    Type: formatSpecsType(parameter.type),
  };
}

function propertySpec(p: reflect.Property): [string, PropertySpec] {
  return [
    p.name,
    {
      Remarks: p.docs.remarks,
      Summary: p.docs.summary,
      Required: !p.optional,
      Type: formatSpecsType(p.type),
      ItemType: formatItemType(p.type),
    },
  ];
}

function formatSpecsType(type: reflect.TypeReference): string {
  if (type.fqn != null) {
    return type.fqn;
  } else if (type.primitive != null) {
    return type.primitive.charAt(0).toUpperCase() + type.primitive.slice(1);
  } else if (type.arrayOfType != null) {
    return 'List';
  } else if (type.mapOfType != null) {
    return 'Map';
  } else {
    return '';
  }
}

function formatItemType(type: reflect.TypeReference) {
  if (type.arrayOfType != null) {
    return formatSpecsType(type.arrayOfType);
  }
  if (type.mapOfType != null) {
    return formatSpecsType(type.mapOfType);
  }
  return undefined;
}

function methodFQN(method: reflect.Method): string {
  return `${method.parentType.fqn}.${method.name}`;
}