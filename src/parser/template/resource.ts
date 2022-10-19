import { fragmentToExpr } from '../private/sub';
import {
  assertAtMostOneOfFields,
  assertObject,
  assertString,
  assertStringOrListIntoList,
  parseRetentionPolicy,
} from '../private/types';
import { schema } from '../schema';
import { FactoryMethodCall, parseCall } from './calls';
import { RetentionPolicy } from './enums';
import {
  ifField,
  parseExpression,
  parseObject,
  TemplateExpression,
} from './expression';
import { parseOverrides, ResourceOverride } from './overrides';
import { parseTags, ResourceTag } from './tags';

export interface TemplateResource {
  readonly type?: string;
  readonly properties: Record<string, TemplateExpression>;
  readonly conditionName?: string;
  readonly dependencies: Set<string>;
  readonly dependsOn: Set<string>;
  readonly deletionPolicy: RetentionPolicy;
  readonly updateReplacePolicy: RetentionPolicy;
  readonly metadata: Record<string, unknown>;
  readonly tags: ResourceTag[];
  readonly overrides: ResourceOverride[];
  readonly call?: FactoryMethodCall;
  readonly creationPolicy?: TemplateExpression;
  readonly updatePolicy?: TemplateExpression;
}

export function parseTemplateResource(
  logicalId: string,
  resource: schema.Resource
): TemplateResource {
  assertAtMostOneOfFields(resource, ['Properties', 'Call']);

  if (resource.Properties != null && resource.Type == null) {
    throw new Error(`In resource '${logicalId}': missing 'Type' property.`);
  }

  const properties = parseObject(resource.Properties);
  const call = parseCall(resource.Call);
  const creationPolicy = ifField(resource, 'CreationPolicy', parseExpression);
  const updatePolicy = ifField(resource, 'UpdatePolicy', parseExpression);

  return {
    type: ifField(resource, 'Type', assertString),
    properties,
    conditionName: ifField(resource, 'Condition', assertString),
    metadata: assertObject(resource.Metadata ?? {}),
    dependencies: new Set([
      ...(ifField(resource, 'DependsOn', assertStringOrListIntoList) ?? []),
      ...findReferencedLogicalIds(properties),
      ...findReferencedLogicalIdsInCall(call),
      ...(creationPolicy
        ? findReferencedLogicalIds({ _: creationPolicy })
        : []),
      ...(updatePolicy ? findReferencedLogicalIds({ _: updatePolicy }) : []),
    ]),
    dependsOn: new Set([
      ...(ifField(resource, 'DependsOn', assertStringOrListIntoList) ?? []),
    ]),
    deletionPolicy:
      ifField(resource, 'DeletionPolicy', parseRetentionPolicy) ?? 'Delete',
    updateReplacePolicy:
      ifField(resource, 'UpdateReplacePolicy', parseRetentionPolicy) ??
      'Delete',
    tags: parseTags(resource.Tags),
    overrides: parseOverrides(resource.Overrides),
    call,
    creationPolicy,
    updatePolicy,
  };
}

function findReferencedLogicalIdsInCall(
  call: FactoryMethodCall | undefined
): string[] {
  if (call == null) {
    return [];
  }

  const result = findReferencedLogicalIds({ _: call.arguments });

  if (call.target != null) {
    const target = assertString(call.target.split('.')[0]);
    result.push(target);
  }

  return result;
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
            x.fragments.map(fragmentToExpr).forEach(recurse);
            Object.values(x.additionalContext).forEach(recurse);
            break;
          case 'transform':
            Object.values(x.parameters).forEach(recurse);
            break;
          case 'args':
            x.array.forEach(recurse);
            break;
          case 'equals':
            recurse(x.value1);
            recurse(x.value2);
            break;
          default:
            throw new Error(`Unrecognized intrinsic for evaluation: ${x.fn}`);
        }
        break;
    }
  }
}
