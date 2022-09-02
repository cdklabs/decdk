import { SubFragment } from '../parser/private/sub';
import {
  assertBoolean,
  assertList,
  assertListOfForm,
  assertNumber,
  assertString,
} from '../parser/private/types';
import {
  assertExpression,
  Template,
  TemplateExpression,
  TemplateResource,
} from '../parser/template';
import { EvaluationContext, NO_VALUE } from './context';

export interface DeploymentEvaluator {}

export abstract class Evaluator<
  Context extends EvaluationContext<unknown, unknown>,
  Resource
> {
  constructor(public readonly context: Context) {}

  public evaluateTemplate(template: Template) {
    const queue = template.resourceGraph().topoQueue();

    while (!queue.isEmpty()) {
      queue.withNext((logicalId, resource) => {
        this.evaluateResource(logicalId, resource);
      });
    }
  }

  public abstract evaluateResource(
    logicalId: string,
    resource: TemplateResource
  ): Resource;

  public evaluate(x: TemplateExpression): any {
    const ev = this.evaluate.bind(this);

    switch (x.type) {
      case 'string':
      case 'boolean':
      case 'number':
        return x.value;
      case 'array':
        return this.evaluateArray(x.array);
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
    }
  }

  public evaluateObject(
    xs: Record<string, TemplateExpression>
  ): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(xs)
        .map(([k, v]) => [k, this.evaluate(v)])
        .filter(([_, v]) => v !== NO_VALUE)
    );
  }

  public evaluateArray(xs: TemplateExpression[]) {
    return xs.map(this.evaluate.bind(this)).filter((x) => x !== NO_VALUE);
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
    //@todo: need this from somewhere
    //@todo: Empty string == current region
    return this.context.azs(region) ?? [];
  }

  protected fnIf(
    conditionName: string,
    ifYes: TemplateExpression,
    ifNo: TemplateExpression
  ) {
    const evaled = this.evaluateCondition(conditionName);
    return evaled ? this.evaluate(ifYes) : this.evaluate(ifNo);
  }

  protected fnImportValue(exportName: string) {
    const exp = this.context.exportValue(exportName);
    if (exp === undefined) {
      throw new Error(`Fn::ImportValue: no such export '${exportName}'`);
    }
    return exp;
  }

  protected fnJoin(separator: string, array: TemplateExpression[]) {
    return this.evaluateArray(array).join(separator);
  }

  protected ref(logicalId: string) {
    const c = this.context.referenceable(logicalId);
    if (!c) {
      throw new Error(`Ref: unknown identifier: ${logicalId}`);
    }
    return c.primaryValue;
  }

  protected fnSelect(index: number, elements: unknown[]) {
    if (index < 0 || elements.length <= index) {
      throw new Error(
        `Fn::Select: index ${index} of out range: [0..${elements.length - 1}]`
      );
    }
    return elements[index]!;
  }

  protected fnSplit(separator: string, value: string) {
    return value.split(separator);
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
    _transformName: string,
    _parameters: Record<string, unknown>
  ) {
    throw new Error('Fn::Transform not yet supported');
  }

  protected fnAnd(operands: boolean[]) {
    return operands.every((x) => x);
  }

  protected fnOr(operands: boolean[]) {
    return operands.some((x) => x);
  }

  protected fnNot(operand: boolean) {
    return !operand;
  }

  protected fnEquals(value1: unknown, value2: unknown) {
    return assertString(value1) === assertString(value2);
  }
}
