import * as cdk from 'aws-cdk-lib';
import { Construct, IConstruct } from 'constructs';
import { SubFragment } from '../parser/private/sub';
import {
  assertBoolean,
  assertList,
  assertListOfForm,
  assertNumber,
  assertString,
} from '../parser/private/types';
import { assertExpression } from '../parser/template';
import { ResourceOverride } from '../parser/template/overrides';
import { ResourceTag } from '../parser/template/tags';
import { isCdkConstructExpression, ResourceLike } from '../type-resolution';
import { TypedTemplateExpression } from '../type-resolution/expression';
import { EvaluationContext } from './context';
import { applyOverride } from './overrides';

export class Evaluator {
  private currentResource?: ResourceLike;

  constructor(public readonly context: EvaluationContext) {}

  public evaluateTemplate() {
    return this.context.template.resources.forEach((logicalId, resource) =>
      this.evaluateResource(logicalId, resource)
    );
  }

  public evaluateResource(
    logicalId: string,
    resource: ResourceLike
  ): IConstruct {
    this.currentResource = resource;

    const construct = this.evaluate(resource);
    this.applyTags(construct, resource.tags);
    this.applyDependsOn(construct, resource.dependsOn);
    if (isCdkConstructExpression(resource)) {
      this.applyOverrides(construct, resource.overrides);
    }

    this.context.addReferenceable(logicalId, {
      primaryValue: construct,
      attributes: construct,
    });

    return construct;
  }

  public evaluate(x: TypedTemplateExpression): any {
    const ev = this.evaluate.bind(this);

    switch (x.type) {
      case 'string':
      case 'number':
      case 'boolean':
        return x.value;
      case 'date':
        return x.date;
      case 'array':
        return this.evaluateArray(x.array);
      case 'struct':
      case 'object':
        return this.evaluateObject(x.fields);
      case 'intrinsic':
        switch (x.fn) {
          case 'base64':
            return this.fnBase64(assertString(ev(x.expression)));
          case 'cidr':
            return this.fnCidr();
          case 'findInMap':
            return this.fnFindInMap(
              x.mappingName,
              assertString(ev(x.key1)),
              assertString(ev(x.key2))
            );
          case 'getAtt':
            return this.fnGetAtt(x.logicalId, assertString(ev(x.attribute)));
          case 'getAzs':
            return this.fnGetAzs(assertString(ev(x.region)));
          case 'if':
            return this.fnIf(x.conditionName, x.then, x.else);
          case 'importValue':
            return this.fnImportValue(assertString(ev(x.export)));
          case 'join':
            return this.fnJoin(
              x.separator,
              assertListOfForm(x.array, assertExpression)
            );
          case 'ref':
            return this.ref(x.logicalId);
          case 'select':
            return this.fnSelect(
              assertNumber(ev(x.index)),
              assertList(ev(x.array))
            );
          case 'split':
            return this.fnSplit(x.separator, assertString(ev(x.value)));
          case 'sub':
            return this.fnSub(
              x.fragments,
              this.evaluateObject(x.additionalContext)
            );
          case 'transform':
            return this.fnTransform(
              x.transformName,
              this.evaluateObject(x.parameters)
            );
          case 'and':
            return this.fnAnd(x.operands.map(ev).map(assertBoolean));
          case 'or':
            return this.fnOr(x.operands.map(ev).map(assertBoolean));
          case 'not':
            return this.fnNot(assertBoolean(ev(x.operand)));
          case 'equals':
            return this.fnEquals(ev(x.value1), ev(x.value2));
        }
      case 'enum':
        return this.enum(x.fqn, x.choice);
      case 'staticProperty':
        return this.enum(x.fqn, x.property);
      case 'any':
        return ev(x.value);
      case 'void':
        return;
      case 'lazyResource':
        return this.invoke(
          x.call.fqn,
          x.call.method,
          this.evaluateArray(x.call.args.array)
        );
      case 'construct':
      case 'resource':
        return this.initializer(x.fqn, [
          this.context.stack,
          x.logicalId,
          ev(x.props),
        ]);
      case 'initializer':
        return this.initializer(x.fqn, this.evaluateArray(x.args.array));
      case 'staticMethodCall':
        return this.invoke(x.fqn, x.method, this.evaluateArray(x.args.array));
    }
  }
  public evaluateObject(
    xs: Record<string, TypedTemplateExpression>
  ): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(xs).map(([k, v]) => [k, this.evaluate(v)])
    );
  }

  public evaluateArray(xs: TypedTemplateExpression[]) {
    return xs.map(this.evaluate.bind(this));
  }

  public evaluateCondition(conditionName: string) {
    const condition = this.context.condition(conditionName);
    const result = this.evaluate(condition);
    if (typeof result !== 'boolean') {
      throw new Error(
        `Condition does not evaluate to boolean: ${JSON.stringify(result)}`
      );
    }
    return result;
  }

  protected invoke(fqn: string, method: string, parameters: unknown[]): any {
    const typeClass = this.context.resolveClass(fqn);
    return typeClass[method](...parameters);
  }

  protected initializer(fqn: string, parameters: unknown[]): any {
    const typeClass = this.context.resolveClass(fqn);
    return new typeClass(...parameters);
  }

  protected enum(fqn: string, choice: string): any {
    const typeClass = this.context.resolveClass(fqn);
    return typeClass[choice];
  }

  protected fnBase64(x: string) {
    return Buffer.from(x).toString('base64');
  }

  protected fnCidr() {
    throw new Error('Fn::Cidr not implemented');
  }

  protected fnFindInMap(mappingName: string, key1: string, key2: string) {
    const map = this.context.mapping(mappingName);
    const inner = map.get(key1);
    if (!inner) {
      throw new Error(
        `Mapping ${mappingName} has no key '${key1}' (available: ${Object.keys(
          map
        )})`
      );
    }
    const ret = inner.get(key2);
    if (ret === undefined) {
      throw new Error(
        `Mapping ${mappingName}[${key1}] has no key '${key2}' (available: ${Object.keys(
          inner
        )})`
      );
    }
    return ret;
  }

  protected fnGetAtt(logicalId: string, attr: string) {
    const c = this.context.referenceable(logicalId);
    const ret = c.attributes?.[attr];
    if (ret === undefined) {
      throw new Error(`Fn::GetAtt: ${logicalId} has no attribute ${attr}`);
    }
    return ret;
  }

  protected fnGetAzs(region: string) {
    return cdk.Fn.getAzs(region);
  }

  protected fnIf(
    conditionName: string,
    ifYes: TypedTemplateExpression,
    ifNo: TypedTemplateExpression
  ) {
    const evaled = this.evaluateCondition(conditionName);
    return evaled ? this.evaluate(ifYes) : this.evaluate(ifNo);
  }

  protected fnImportValue(exportName: string) {
    return cdk.Fn.importValue(exportName);
  }

  protected fnJoin(separator: string, array: TypedTemplateExpression[]) {
    return cdk.Fn.join(separator, this.evaluateArray(array));
  }

  protected ref(logicalId: string) {
    const c = this.context.referenceable(logicalId);
    if (!c) {
      throw new Error(`Ref: unknown identifier: ${logicalId}`);
    }

    if (!(c.primaryValue instanceof Construct)) {
      return c.primaryValue;
    }

    switch (this.currentResource?.type) {
      case 'resource':
        return cdk.Fn.ref(
          this.context.stack.getLogicalId(
            c.primaryValue.node.defaultChild as cdk.CfnElement
          )
        );
      case 'construct':
      default:
        return c.primaryValue;
    }
  }

  protected fnSelect(index: number, elements: unknown[]) {
    if (index < 0 || elements.length <= index) {
      throw new Error(
        `Fn::Select: index ${index} of out range: [0..${elements.length - 1}]`
      );
    }

    // @todo
    // Need to resolve to intrinsic function, since index can be not a number
    // @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-select.html#w2ab1c31c28c56c15
    return elements[index]!;
  }

  protected fnSplit(separator: string, value: string) {
    return cdk.Fn.split(separator, value);
  }

  protected fnSub(
    fragments: SubFragment[],
    additionalContext: Record<string, unknown>
  ) {
    return fragments
      .map((part) => {
        switch (part.type) {
          case 'literal':
            return part.content;
          case 'ref':
            if (part.logicalId in additionalContext) {
              return additionalContext[part.logicalId];
            }
            return this.ref(part.logicalId);
          case 'getatt':
            return this.fnGetAtt(part.logicalId, part.attr);
        }
      })
      .join('');
  }

  protected fnTransform(
    transformName: string,
    parameters: Record<string, unknown>
  ) {
    return cdk.Fn.transform(transformName, parameters);
  }
  protected fnAnd(_operands: boolean[]): boolean {
    // @todo
    throw Error('not implemented');
    // return operands.every((x) => x);
    // return cdk.Fn.conditionAnd(...operands) as any;
  }

  protected fnOr(_operands: boolean[]): boolean {
    // @todo
    throw Error('not implemented');
    // return operands.some((x) => x);
    // return cdk.Fn.conditionOr(...operands);
  }

  protected fnNot(_operand: boolean): boolean {
    // @todo
    throw Error('not implemented');
    // return !operand;
    // return cdk.Fn.conditionNot(operand);
  }

  protected fnEquals(_value1: unknown, _value2: unknown): boolean {
    // @todo
    throw Error('not implemented');
    // return assertString(value1) === assertString(value2);
    // return cdk.Fn.conditionEquals(value1, value2);
  }

  protected applyTags(resource: IConstruct, tags: ResourceTag[] = []) {
    tags.forEach((tag: ResourceTag) => {
      cdk.Tags.of(resource).add(tag.key, tag.value);
    });
  }

  protected applyDependsOn(from: IConstruct, dependencies: string[] = []) {
    from.node?.addDependency(
      ...dependencies.map((to) => this.context.stack.node.findChild(to))
    );
  }

  protected applyOverrides(
    resource: IConstruct,
    overrides: ResourceOverride[]
  ) {
    const ev = this.evaluate.bind(this);
    overrides.forEach((override: ResourceOverride) => {
      applyOverride(resource, override, ev);
    });
  }
}
