import {
  assertAtMostOneOfFields,
  assertField,
  assertObject,
  assertString,
  assertStringOrList,
  parseRetentionPolicy,
  singletonList,
} from '../private/types';
import { schema } from '../schema';
import { parseCall } from './calls';
import { RetentionPolicy } from './enums';
import {
  ifField,
  ObjectLiteral,
  parseObject,
  TemplateExpression,
} from './expression';
import { parseOverrides, ResourceOverride } from './overrides';
import { parseTags, ResourceTag } from './tags';

export interface TemplateResource {
  readonly type: string;
  readonly properties: Record<string, TemplateExpression>;
  readonly conditionName?: string;
  readonly dependencies: Set<string>;
  readonly dependsOn: Set<string>;
  readonly deletionPolicy: RetentionPolicy;
  readonly updateReplacePolicy: RetentionPolicy;
  readonly metadata: Record<string, unknown>;
  readonly tags: ResourceTag[];
  readonly overrides: ResourceOverride[];
  readonly on?: string;
  readonly call: ObjectLiteral;

  // readonly creationPolicy?: CreationPolicy;
  // readonly updatePolicy?: UpdatePolicy;
}

export function parseTemplateResource(
  logicalId: string,
  resource: schema.Resource
): TemplateResource {
  if (resource.On != null && resource.Call == null) {
    throw new Error(
      `In resource '${logicalId}': expected to find a 'Call' property, to a method of '${resource.On}'.`
    );
  }

  assertAtMostOneOfFields(resource, ['Properties', 'Call']);

  const properties = parseObject(resource.Properties);
  const call = parseCall(resource.Call);

  return {
    type: assertString(assertField(resource, 'Type')),
    properties,
    conditionName: ifField(resource, 'Condition', assertString),
    metadata: assertObject(resource.Metadata ?? {}),
    dependencies: new Set([
      ...(ifField(resource, 'DependsOn', assertStringOrList) ?? []),
      ...singletonList(ifField(resource, 'On', assertString)),
      ...findReferencedLogicalIds(properties),
      ...findReferencedLogicalIds({ _: call }),
    ]),
    dependsOn: new Set([
      ...(ifField(resource, 'DependsOn', assertStringOrList) ?? []),
    ]),
    deletionPolicy:
      ifField(resource, 'DeletionPolicy', parseRetentionPolicy) ?? 'Delete',
    updateReplacePolicy:
      ifField(resource, 'UpdateReplacePolicy', parseRetentionPolicy) ??
      'Delete',
    tags: parseTags(resource.Tags),
    overrides: parseOverrides(resource.Overrides),
    on: ifField(resource, 'On', assertString),
    call,
  };
}

function findReferencedLogicalIds(
  xs: Record<string, TemplateExpression>,
  into: string[] = []
): string[] {
  Object.values(xs).forEach(recurse);
  return into;

  function recurse(x: TemplateExpression) {
    switch (x.type) {
      case 'array':
        x.array.forEach(recurse);
        break;
      case 'object':
        Object.values(x.fields).forEach(recurse);
        break;
      case 'intrinsic':
        switch (x.fn) {
          case 'ref':
          case 'getAtt':
          case 'getProp':
            into.push(x.logicalId);
            break;
          case 'base64':
            recurse(x.expression);
            break;
          case 'cidr':
            recurse(x.count);
            recurse(x.ipBlock);
            if (x.netMask) {
              recurse(x.netMask);
            }
            break;
          case 'findInMap':
            recurse(x.key1);
            recurse(x.key2);
            break;
          case 'getAzs':
            recurse(x.region);
            break;
          case 'if':
            recurse(x.then);
            recurse(x.else);
            break;
          case 'importValue':
            recurse(x.export);
            break;
          case 'join':
            recurse(x.list);
            break;
          case 'select':
            recurse(x.index);
            recurse(x.objects);
            break;
          case 'split':
            recurse(x.value);
            break;
          case 'sub':
            Object.values(x.additionalContext).forEach(recurse);
            break;
          case 'transform':
            Object.values(x.parameters).forEach(recurse);
            break;
          default:
            throw new Error(`Unrecognized intrinsic for evaluation: ${x.fn}`);
        }
        break;
    }
  }
}
