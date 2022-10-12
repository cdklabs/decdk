import * as fs from 'fs';
import * as path from 'path';
import * as reflect from 'jsii-reflect';
import { Property } from 'jsii-reflect';
import { hasPropsParam } from '../type-system';

export function generateDeCDKSpecs(typeSystem: reflect.TypeSystem) {
  const moduleName = 'aws_lambda';
  const constructs = getConstructs(typeSystem, moduleName);
  const resourcesSpecs = buildSpecsForResources(constructs, typeSystem);
  return {
    ...currentSchemaVersion(),
    ModuleTypes: {
      [`aws-cdk-lib.${moduleName}`]: {
        ResourceTypes: resourcesSpecs,
      },
    },
  };
}

function currentSchemaVersion() {
  return JSON.parse(
    fs
      .readFileSync(
        path.join(__dirname, '../../src/specs', 'specs.version.json')
      )
      .toString()
  );
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

function buildSpecsForResources(
  constructs: reflect.ClassType[],
  typeSystem: reflect.TypeSystem
) {
  const specsList = constructs.map((c: reflect.ClassType) => {
    return {
      [c.name]: {
        Properties: buildSpecsForResourceProperties(c, typeSystem),
      },
    };
  });
  return mergeToObject(specsList);
}

function buildSpecsForResourceProperties(
  c: reflect.ClassType,
  typeSystem: reflect.TypeSystem
) {
  if (!hasPropsParam(c, 2)) return;

  const propFqn = c.initializer?.parameters?.[2]?.type.fqn;
  if (propFqn != undefined) {
    const propInterface = typeSystem.findInterface(propFqn);

    return mergeToObject(
      propInterface.allProperties.map((p: Property) => ({
        [p.name]: {
          Remarks: p.docs.remarks,
          Summary: p.docs.summary,
          Required: p.optional ? 'False' : 'True',
          Type: formatSpecsType(p.type),
          ItemType: formatItemType(p.type),
        },
      }))
    );
  }
  return {};
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

function mergeToObject(list: any[]) {
  return Object.assign({}, ...list);
}
