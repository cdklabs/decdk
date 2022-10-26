import * as cdk from 'aws-cdk-lib';
import {
  CfnDeletionPolicy,
  CfnHook,
  CfnResource,
  CfnRule,
  ICfnConditionExpression,
  ICfnRuleConditionExpression,
  Token,
} from 'aws-cdk-lib';
import { Construct, IConstruct } from 'constructs';
import {
  AnnotationsContext,
  RuntimeError,
  intrinsicToLongForm,
} from '../error-handling';
import { SubFragment } from '../parser/private/sub';
import { assertString } from '../parser/private/types';
import {
  GetPropIntrinsic,
  IntrinsicExpression,
  LazyLogicalId,
  RefIntrinsic,
} from '../parser/template';
import { ResourceOverride } from '../parser/template/overrides';
import { ResourceTag } from '../parser/template/tags';
import {
  CdkConstruct,
  CdkObject,
  CfnResource as CfnResourceNode,
  isCdkConstructExpression,
  ResourceLike,
} from '../type-resolution';
import {
  InstanceMethodCallExpression,
  StaticMethodCallExpression,
} from '../type-resolution/callables';
import {
  TypedArrayExpression,
  TypedTemplateExpression,
} from '../type-resolution/expression';
import { ResolveReferenceExpression } from '../type-resolution/references';
import { EvaluationContext } from './context';
import { DeCDKCfnOutput } from './outputs';
import { applyOverride } from './overrides';
import {
  CfnResourceReference,
  ConstructReference,
  getPropDot,
  SimpleReference,
  ValueOnlyReference,
} from './references';

export class Evaluator {
  constructor(public readonly context: EvaluationContext) {}

  public evaluateTemplate(ctx: AnnotationsContext) {
    this.evaluateParameters(ctx.child('Parameters'));
    this.evaluateMetadata(ctx.child('Metadata'));
    this.evaluateRules(ctx.child('Rules'));
    this.evaluateMappings(ctx.child('Mappings'));
    this.evaluateConditions(ctx.child('Conditions'));
    this.evaluateTransform(ctx.child('Transform'));
    this.evaluateResources(ctx.child('Resources'));
    this.evaluateOutputs(ctx.child('Outputs'));
    this.evaluateHooks(ctx.child('Hooks'));
  }

  private evaluateMappings(ctx: AnnotationsContext) {
    const scope = new Construct(this.context.stack, '$Mappings');
    this.context.template.mappings.forEach((mapping, mapName) =>
      ctx.child(mapName).wrap(() => {
        new cdk.CfnMapping(scope, mapName, {
          mapping: mapping.toObject(),
        }).overrideLogicalId(mapName);
      })
    );
  }

  private evaluateParameters(ctx: AnnotationsContext) {
    this.context.template.parameters.forEach((param, paramName) => {
      ctx.child(paramName).wrap(() => {
        new cdk.CfnParameter(
          this.context.stack,
          paramName,
          param
        ).overrideLogicalId(paramName);
        this.context.addReference(new SimpleReference(paramName));
      });
    });
  }

  private evaluateResources(ctx: AnnotationsContext) {
    this.context.template.resources.forEach((logicalId, resource) =>
      ctx.child(logicalId).wrap((c) => this.evaluateResource(resource, c))
    );
  }

  private evaluateOutputs(ctx: AnnotationsContext) {
    const scope = new Construct(this.context.stack, '$Outputs');
    this.context.template.outputs.forEach((output, outputId) => {
      ctx.child(outputId).wrap(() => {
        new DeCDKCfnOutput(scope, outputId, {
          value: this.evaluate(output.value, ctx),
          description: output.description,
          exportName: output.exportName
            ? this.evaluate(output.exportName, ctx)
            : output.exportName,
          condition: output.conditionName,
        }).overrideLogicalId(outputId);
      });
    });
  }

  private evaluateTransform(ctx: AnnotationsContext) {
    ctx.wrap(() => {
      this.context.template.transform.forEach((t) => {
        this.context.stack.addTransform(t);
      });
    });
  }

  private evaluateMetadata(ctx: AnnotationsContext) {
    this.context.template.metadata.forEach((v, k) => {
      ctx.child(k).wrap(() => {
        this.context.stack.addMetadata(k, v);
      });
    });
  }

  private evaluateRules(ctx: AnnotationsContext) {
    const scope = new Construct(this.context.stack, '$Rules');
    this.context.template.rules.forEach((rule, name) => {
      ctx.child(name).wrap(() => {
        new CfnRule(scope, name, rule).overrideLogicalId(name);
      });
    });
  }

  private evaluateHooks(ctx: AnnotationsContext) {
    const scope = new Construct(this.context.stack, '$Hooks');
    this.context.template.hooks.forEach((hook, name) => {
      ctx.child(name).wrap(() => {
        new CfnHook(scope, name, hook).overrideLogicalId(name);
      });
    });
  }

  private evaluateConditions(ctx: AnnotationsContext) {
    const scope = new Construct(this.context.stack, '$Conditions');
    this.context.template.conditions.forEach((condition, logicalId) => {
      ctx.child(logicalId).wrap(() => {
        const conditionFn = this.evaluate(condition, ctx);
        new cdk.CfnCondition(scope, logicalId, {
          expression: conditionFn,
        }).overrideLogicalId(logicalId);
      });
    });
  }

  public evaluateResource(resource: ResourceLike, ctx: AnnotationsContext) {
    const construct = this.evaluate(resource, ctx);

    // If this is the result of a call to a method with no
    // return type (void), then there is nothing else to do here.
    if (construct == null) return;

    this.applyTags(construct, resource.tags);
    this.applyDependsOn(construct, resource.dependsOn);
    if (isCdkConstructExpression(resource)) {
      this.applyOverrides(
        construct,
        resource.overrides,
        ctx.child('Overrides')
      );
    }

    this.context.addReference(
      this.referenceForResourceLike(resource.logicalId, construct)
    );
  }

  private referenceForResourceLike(logicalId: string, value: unknown) {
    if (!Construct.isConstruct(value)) {
      return new ValueOnlyReference(logicalId, value);
    }

    if (cdk.CfnResource.isCfnResource(value)) {
      return new CfnResourceReference(logicalId, value);
    }

    return new ConstructReference(logicalId, value as Construct);
  }

  public evaluate(x: TypedTemplateExpression, ctx: AnnotationsContext): any {
    try {
      switch (x.type) {
        case 'null':
          return undefined;
        case 'string':
        case 'number':
        case 'boolean':
          return x.value;
        case 'date':
          return x.date;
        case 'array':
          return this.evaluateArray(x.array, ctx);
        case 'struct':
        case 'object':
          return this.evaluateObject(x.fields, ctx);
        case 'resolve-reference':
          return this.resolveReference(x.reference, ctx);
        case 'intrinsic':
          return this.evaluateIntrinsic(x, ctx);
        case 'enum':
          return this.enum(x.fqn, x.choice);
        case 'staticProperty':
          return this.enum(x.fqn, x.property);
        case 'any':
          return this.evaluate(x.value, ctx);
        case 'void':
          return;
        case 'lazyResource':
          return this.invoke(x.call, ctx.child('Call'));
        case 'construct':
          return this.initializeConstruct(x, ctx);
        case 'cdkObject':
          return this.initializeCdkObject(x, ctx);
        case 'resource':
          return this.initializeCfnResource(x, ctx);
        case 'initializer':
          return this.initializer(x.fqn, this.evaluateArray(x.args.array, ctx));
        case 'staticMethodCall':
          return this.invoke(x, ctx);
      }
    } catch (error) {
      ctx.error(RuntimeError.wrap(error));
    }
  }

  protected initializeCfnResource(x: CfnResourceNode, ctx: AnnotationsContext) {
    const resource = this.initializer(x.fqn, [
      this.context.stack,
      x.logicalId,
      this.evaluate(x.props, ctx.child('Properties')),
    ]) as CfnResource;

    resource.cfnOptions.creationPolicy = x.creationPolicy
      ? this.evaluate(x.creationPolicy, ctx.child('CreationPolicy'))
      : undefined;
    resource.cfnOptions.updatePolicy = x.updatePolicy
      ? this.evaluate(x.updatePolicy, ctx.child('UpdatePolicy'))
      : undefined;
    resource.cfnOptions.metadata = x.metadata;
    resource.cfnOptions.updateReplacePolicy =
      x.updateReplacePolicy as CfnDeletionPolicy;
    resource.cfnOptions.deletionPolicy = x.deletionPolicy as CfnDeletionPolicy;

    return resource;
  }

  protected initializeConstruct(x: CdkConstruct, ctx: AnnotationsContext) {
    return this.initializer(x.fqn, [
      this.context.stack,
      x.logicalId,
      this.evaluate(x.props, ctx.child('Properties')),
    ]);
  }

  protected initializeCdkObject(x: CdkObject, ctx: AnnotationsContext) {
    return this.initializer(x.fqn, [
      this.evaluate(x.props, ctx.child('Properties')),
    ]);
  }

  protected lazyLogicalId(x: LazyLogicalId) {
    if (x.value) {
      return x.value;
    }
    throw new Error(x.errorMessage);
  }

  protected fnLength(x: unknown) {
    return cdk.Fn.len(x);
  }

  protected toJsonString(x: unknown) {
    return cdk.Fn.toJsonString(x);
  }

  public evaluateObject(
    xs: Record<string, TypedTemplateExpression>,
    ctx: AnnotationsContext
  ): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(xs).map(([k, v]) => [k, this.evaluate(v, ctx.child(k))])
    );
  }

  public evaluateArray(xs: TypedTemplateExpression[], ctx: AnnotationsContext) {
    return xs.map((x) => this.evaluate(x, ctx));
  }

  public evaluateIntrinsic(x: IntrinsicExpression, ctx: AnnotationsContext) {
    if (x.fn === 'lazyLogicalId') {
      return this.lazyLogicalId(x);
    }

    return ctx.child(intrinsicToLongForm(x.fn)).wrap((intrinsicCtx) => {
      const ev = (y: TypedTemplateExpression) => this.evaluate(y, intrinsicCtx);
      const maybeEv = (y?: TypedTemplateExpression): any =>
        y ? ev(y) : undefined;

      switch (x.fn) {
        case 'base64':
          return this.fnBase64(assertString(ev(x.expression)));
        case 'cidr':
          return this.fnCidr(ev(x.ipBlock), ev(x.count), maybeEv(x.netMask));
        case 'findInMap':
          return this.fnFindInMap(
            assertString(ev(x.mappingName)),
            assertString(ev(x.key1)),
            assertString(ev(x.key2))
          );
        case 'getAtt':
          return this.fnGetAtt(x.logicalId, assertString(ev(x.attribute)));
        case 'getProp':
          return this.fnGetProp(x.logicalId, assertString(x.property));
        case 'getAzs':
          return this.fnGetAzs(assertString(ev(x.region)));
        case 'if':
          return this.fnIf(x.conditionName, x.then, x.else, intrinsicCtx);
        case 'importValue':
          return this.fnImportValue(assertString(ev(x.export)));
        case 'join':
          return this.fnJoin(assertString(x.separator), ev(x.list));
        case 'ref':
          return this.cfnRef(x.logicalId);
        case 'select':
          return this.fnSelect(ev(x.index), ev(x.objects));
        case 'split':
          return this.fnSplit(x.separator, assertString(ev(x.value)));
        case 'sub':
          return this.fnSub(
            x.fragments,
            this.evaluateObject(x.additionalContext, intrinsicCtx)
          );
        case 'transform':
          return this.fnTransform(
            x.transformName,
            this.evaluateObject(x.parameters, intrinsicCtx)
          );
        case 'and':
          return this.fnAnd(x.operands.map((o) => ev(o)));
        case 'or':
          return this.fnOr(x.operands.map((o) => ev(o)));
        case 'not':
          return this.fnNot(ev(x.operand));
        case 'equals':
          return this.fnEquals(ev(x.value1), ev(x.value2));
        case 'args':
          return this.evaluateArray(x.array, intrinsicCtx);
        case 'length':
          return this.fnLength(ev(x.list));
        case 'toJsonString':
          return this.toJsonString(this.evaluateObject(x.value, intrinsicCtx));
      }
    });
  }

  public evaluateCondition(conditionName: string, ctx: AnnotationsContext) {
    const condition = this.context.condition(conditionName);
    const result = this.evaluate(condition, ctx);
    if (typeof result !== 'boolean') {
      throw new Error(
        `Condition does not evaluate to boolean: ${JSON.stringify(result)}`
      );
    }
    return result;
  }

  protected invoke(
    call: StaticMethodCallExpression | InstanceMethodCallExpression,
    ctx: AnnotationsContext
  ) {
    const evalParams = (
      args: TypedArrayExpression,
      innerCtx: AnnotationsContext
    ) => this.evaluateArray(args.array, innerCtx.child('CDK::Args'));

    if (call.type === 'staticMethodCall') {
      return ctx.child(`${call.fqn}.${call.method}`).wrap((innerCtx) => {
        return this.invokeStaticMethod(
          call.fqn,
          call.method,
          evalParams(call.args, innerCtx)
        );
      });
    }

    return ctx
      .child(`${call.target.reference}.${call.method}`)
      .wrap((innerCtx) => {
        return this.invokeInstanceMethod(
          call.target,
          call.method,
          evalParams(call.args, innerCtx),
          innerCtx
        );
      });
  }

  private invokeInstanceMethod(
    target: ResolveReferenceExpression,
    method: string,
    parameters: any[],
    ctx: AnnotationsContext
  ) {
    const instance = this.resolveReference(target.reference, ctx);
    return instance[method](...parameters);
  }

  private invokeStaticMethod(
    fqn: string,
    method: string,
    parameters: unknown[]
  ): any {
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
    return cdk.Fn.base64(x);
  }

  protected fnCidr(ipBlock: string, count: number, sizeMask?: string) {
    return cdk.Fn.cidr(ipBlock, count, sizeMask);
  }

  protected fnFindInMap(
    mapName: string,
    topLevelKey: string,
    secondLevelKey: string
  ) {
    return cdk.Fn.findInMap(mapName, topLevelKey, secondLevelKey);
  }

  protected fnGetProp(logicalId: string, prop: string) {
    const c = this.context.reference(logicalId);
    if (!c.instance || !c.hasProp(prop)) {
      throw Error(
        `CDK::GetProp: Expected Construct Property, got: ${logicalId}.${prop}`
      );
    }
    return getPropDot(c.instance, prop);
  }

  protected fnGetAtt(logicalId: string, attribute: string) {
    const c = this.context.reference(logicalId);
    if (!c.hasAtt?.(attribute)) {
      throw Error(
        `Fn::GetAtt: Expected Cloudformation Attribute, got: ${logicalId}.${attribute}`
      );
    }
    return Token.asString(cdk.Fn.getAtt(c.ref, attribute));
  }

  protected fnGetAzs(region: string) {
    return cdk.Fn.getAzs(region);
  }

  protected fnIf(
    conditionName: string,
    ifYes: TypedTemplateExpression,
    ifNo: TypedTemplateExpression,
    ctx: AnnotationsContext
  ) {
    return cdk.Fn.conditionIf(
      conditionName,
      this.evaluate(ifYes, ctx),
      this.evaluate(ifNo, ctx)
    );
  }

  protected fnImportValue(exportName: string) {
    return cdk.Fn.importValue(exportName);
  }

  protected fnJoin(separator: string, array: any[]) {
    return cdk.Fn.join(separator, array);
  }

  protected resolveReference(
    intrinsic: RefIntrinsic | GetPropIntrinsic,
    ctx: AnnotationsContext
  ) {
    const { logicalId, fn } = intrinsic;

    if (fn !== 'ref') {
      return this.evaluateIntrinsic(intrinsic, ctx);
    }

    return ctx.child('Ref').wrap(() => {
      const c = this.context.reference(logicalId);

      if (!c.instance) {
        return this.cfnRef(logicalId);
      }

      return c.instance;
    });
  }

  protected cfnRef(logicalId: string) {
    const c = this.context.reference(logicalId);
    return cdk.Fn.ref(c.ref);
  }

  protected fnSelect(index: number, elements: any[]) {
    return cdk.Fn.select(index, elements);
  }

  protected fnSplit(separator: string, value: string) {
    return cdk.Fn.split(separator, value);
  }

  protected fnSub(
    fragments: SubFragment[],
    additionalContext: Record<string, any>
  ) {
    const asVariable = (x: string) => '${' + x + '}';
    const assertUndefinedIfEmpty = (
      x: Record<string, any>
    ): Record<string, any> | undefined => {
      if (!x || Object.keys(x).length === 0) {
        return;
      }
      return x;
    };

    const body = fragments
      .map((part) => {
        switch (part.type) {
          case 'literal':
            return part.content;
          case 'ref':
            if (part.logicalId in additionalContext) {
              return asVariable(part.logicalId);
            }
            return asVariable(this.context.reference(part.logicalId).ref);
          case 'getatt':
            const attVal = this.fnGetAtt(part.logicalId, part.attr);
            if (cdk.Token.isUnresolved(attVal)) {
              return asVariable(part.logicalId + '.' + part.attr);
            }
            return attVal;
        }
      })
      .join('');

    return cdk.Fn.sub(body, assertUndefinedIfEmpty(additionalContext));
  }

  protected fnTransform(
    transformName: string,
    parameters: Record<string, unknown>
  ) {
    return cdk.Fn.transform(transformName, parameters);
  }

  protected fnAnd(
    operands: ICfnConditionExpression[]
  ): ICfnConditionExpression {
    return cdk.Fn.conditionAnd(...operands);
  }

  protected fnOr(operands: ICfnConditionExpression[]): ICfnConditionExpression {
    return cdk.Fn.conditionOr(...operands);
  }

  protected fnNot(
    operand: ICfnConditionExpression
  ): ICfnRuleConditionExpression {
    if (Array.isArray(operand)) {
      if (operand.length != 1) {
        throw new Error('Fn::Not requires a list argument with one element');
      } else {
        return cdk.Fn.conditionNot(operand[0]);
      }
    }
    return cdk.Fn.conditionNot(operand);
  }

  protected fnEquals(
    value1: unknown,
    value2: unknown
  ): ICfnConditionExpression {
    return cdk.Fn.conditionEquals(value1, value2);
  }

  protected applyTags(resource: IConstruct, tags: ResourceTag[] = []) {
    tags.forEach((tag: ResourceTag) => {
      cdk.Tags.of(resource).add(tag.key, tag.value);
    });
  }

  protected applyDependsOn(from: IConstruct, dependencies: string[] = []) {
    from.node?.addDependency(
      ...dependencies
        .map((to) => this.context.stack.node.tryFindChild(to))
        .filter(Construct.isConstruct)
    );
  }

  protected applyOverrides(
    resource: IConstruct,
    overrides: ResourceOverride[],
    ctx: AnnotationsContext
  ) {
    const ev = (x: TypedTemplateExpression) => this.evaluate(x, ctx);
    overrides.forEach((override: ResourceOverride) => {
      applyOverride(resource, override, ev);
    });
  }
}
