import * as fs from 'fs';
import * as path from 'path';
import * as reflect from 'jsii-reflect';
import { ClassType, Property, TypeSystem } from 'jsii-reflect';
import { hasPropsParam } from '../type-system';

interface ResourceProperty {
  Remarks: string;
  Summary: string;
  Required: 'True' | 'False';
  Type: string;
  ItemType?: string;
}

interface ResourceType {
  readonly Properties: Record<string, ResourceProperty>;
}

interface ModuleType {
  readonly ResourceTypes: Record<string, ResourceType>;
}

interface Specification {
  readonly schemaVersion: string;
  readonly ModuleTypes: Record<string, ModuleType>;
}

export function generateDeCDKSpecs(
  typeSystem: reflect.TypeSystem
): Specification {
  const moduleName = 'aws_lambda';

  return {
    schemaVersion: currentSchemaVersion(),
    ModuleTypes: Object.fromEntries([
      [`aws-cdk-lib.${moduleName}`, toModuleType(typeSystem, moduleName)],
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
      c.spec.namespace === namespace
  );
}

function toModuleType(
  typeSystem: reflect.TypeSystem,
  moduleName: string
): ModuleType {
  const constructs = getConstructs(typeSystem, moduleName);
  return {
    ResourceTypes: Object.fromEntries(
      constructs.map((c) => [c.name, toResourceType(typeSystem, c)])
    ),
  };
}

function toResourceType(typeSystem: TypeSystem, c: ClassType): ResourceType {
  if (!hasPropsParam(c, 2)) {
    return { Properties: {} };
  }

  const propFqn = c.initializer?.parameters?.[2]?.type.fqn;
  if (propFqn != undefined) {
    const propInterface = typeSystem.findInterface(propFqn);

    return {
      Properties: Object.fromEntries(
        propInterface.allProperties.map(toResourceProperty)
      ),
    };
  }

  return { Properties: {} };
}

function toResourceProperty(p: Property): [string, ResourceProperty] {
  return [
    p.name,
    {
      Remarks: p.docs.remarks,
      Summary: p.docs.summary,
      Required: p.optional ? 'False' : 'True',
      Type: formatSpecsType(p.type),
      ItemType: formatItemType(p.type),
    },
  ];
}

function formatSpecsType(type: reflect.TypeReference) {
  if (type.fqn != null) {
    return type.fqn;
  } else if (type.primitive != null) {
    return type.primitive.charAt(0).toUpperCase() + type.primitive.slice(1);
  } else if (type.arrayOfType != null) {
    return 'List';
  } else if (type.mapOfType != null) {
    return 'Map';
  } else {
    return `Unhandled Type: ${Object.keys(type)}`;
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
