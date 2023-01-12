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
import { EvaluationContext, IEvaluationContext } from './context';
import { DeCDKCfnOutput } from './outputs';
import { applyOverride } from './overrides';
import {
  CfnResourceReference,
  ConstructReference,
  getPropDot,
  SimpleReference,
  ValueOnlyReference,
} from './references';
import {
  AnnotationsContext,
  RuntimeError,
  intrinsicToLongForm,
} from '../error-handling';
import { SubFragment } from '../parser/private/sub';
import { assertString } from '../parser/private/types';
import {
  BooleanLiteral,
  GetPropIntrinsic,
  IntrinsicExpression,
  LazyLogicalId,
  NumberLiteral,
  RefIntrinsic,
  StringLiteral,
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
import { DateLiteral } from '../type-resolution/literals';
import { ResolveReferenceExpression } from '../type-resolution/references';

export abstract class BaseEvaluator<T extends IEvaluationContext> {
  constructor(public readonly context: T) {}

  public abstract evaluateDescription(ctx: AnnotationsContext): any;
  public abstract evaluateTemplateFormatVersion(ctx: AnnotationsContext): any;
  public abstract evaluateMappings(ctx: AnnotationsContext): any;
  public abstract evaluateParameters(ctx: AnnotationsContext): any;
  public abstract evaluateResources(ctx: AnnotationsContext): any;
  public abstract evaluateOutputs(ctx: AnnotationsContext): any;
  public abstract evaluateTransform(ctx: AnnotationsContext): any;
  public abstract evaluateMetadata(ctx: AnnotationsContext): any;
  public abstract evaluateRules(ctx: AnnotationsContext): any;
  public abstract evaluateHooks(ctx: AnnotationsContext): any;
  public abstract evaluateConditions(ctx: AnnotationsContext): any;

  protected abstract evaluateNull(): any;
  protected abstract evaluateVoid(): any;
  protected abstract evaluateDate(x: DateLiteral): any;
  protected abstract evaluatePrimitive(
    x: StringLiteral | NumberLiteral | BooleanLiteral
  ): any;
  protected abstract evaluateCfnResource(
    x: CfnResourceNode,
    ctx: AnnotationsContext
  ): any;
  protected abstract evaluateConstruct(
    x: CdkConstruct,
    ctx: AnnotationsContext
  ): any;
  protected abstract evaluateCdkObject(
    x: CdkObject,
    ctx: AnnotationsContext
  ): any;
  protected abstract evaluateObject(
    xs: Record<string, TypedTemplateExpression>,
    ctx: AnnotationsContext
  ): Record<string, unknown>;
  protected abstract evaluateArray(
    xs: TypedTemplateExpression[],
    ctx: AnnotationsContext
  ): any;

  protected abstract evaluateCall(
    call: StaticMethodCallExpression | InstanceMethodCallExpression,
    ctx: AnnotationsContext
  ): any;
  protected abstract evaluateEnum(fqn: string, choice: string): any;
  protected abstract evaluateInitializer(
    fqn: string,
    parameters: unknown[]
  ): any;

  protected abstract fnBase64(x: string): any;
  protected abstract fnCidr(
    ipBlock: string,
    count: number,
    sizeMask?: string
  ): any;
  protected abstract fnFindInMap(
    mapName: string,
    topLevelKey: string,
    secondLevelKey: string
  ): any;
  protected abstract fnGetProp(logicalId: string, prop: string): any;
  protected abstract fnGetAtt(logicalId: string, attribute: string): any;
  protected abstract fnGetAzs(region: string): any;
  protected abstract fnIf(
    conditionName: string,
    ifYes: TypedTemplateExpression,
    ifNo: TypedTemplateExpression,
    ctx: AnnotationsContext
  ): any;
  protected abstract fnImportValue(exportName: string): any;
  protected abstract fnJoin(separator: string, array: any[]): any;
  protected abstract fnRef(logicalId: string): any;
  protected abstract fnSelect(index: number, elements: any[]): any;
  protected abstract fnSplit(separator: string, value: string): any;
  protected abstract fnSub(
    fragments: SubFragment[],
    additionalContext: Record<string, any>
  ): any;
  protected abstract fnTransform(
    transformName: string,
    parameters: Record<string, unknown>
  ): any;
  protected abstract fnAnd(operands: unknown[]): any;
  protected abstract fnOr(operands: unknown[]): any;
  protected abstract fnNot(operand: unknown): any;
  protected abstract fnEquals(value1: unknown, value2: unknown): any;
  protected abstract fnLazyLogicalId(x: LazyLogicalId): any;
  protected abstract fnLength(x: unknown): any;
  protected abstract fnToJsonString(x: unknown): any;

  public evaluateTemplate(ctx: AnnotationsContext): any {
    this.evaluateDescription(ctx.child('Description'));
    this.evaluateTemplateFormatVersion(ctx.child('AWSTemplateFormatVersion'));
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

  public evaluate(x: TypedTemplateExpression, ctx: AnnotationsContext): any {
    try {
      switch (x.type) {
        case 'null':
          return this.evaluateNull();
        case 'void':
          return this.evaluateVoid();
        case 'string':
        case 'number':
        case 'boolean':
          return this.evaluatePrimitive(x);
        case 'date':
          return this.evaluateDate(x);
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
          return this.evaluateEnum(x.fqn, x.choice);
        case 'staticProperty':
          return this.evaluateEnum(x.fqn, x.property);
        case 'any':
          return this.evaluate(x.value, ctx);
        case 'lazyResource':
          return this.evaluateCall(x.call, ctx.child('Call'));
        case 'construct':
          return this.evaluateConstruct(x, ctx);
        case 'cdkObject':
          return this.evaluateCdkObject(x, ctx);
        case 'resource':
          return this.evaluateCfnResource(x, ctx);
        case 'initializer':
          return ctx
            .child(x.fqn)
            .wrap((innerCtx) =>
              this.evaluateInitializer(
                x.fqn,
                this.evaluateArray(x.args.array, innerCtx)
              )
            );
        case 'staticMethodCall':
          return this.evaluateCall(x, ctx);
      }
    } catch (error) {
      ctx.error(RuntimeError.wrap(error));
    }
  }

  protected evaluateIntrinsic(
    x: IntrinsicExpression,
    ctx: AnnotationsContext
  ): any {
    if (x.fn === 'lazyLogicalId') {
      return this.fnLazyLogicalId(x);
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
          return this.fnRef(x.logicalId);
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
          return this.fnToJsonString(
            this.evaluateObject(x.value, intrinsicCtx)
          );
      }
    });
  }

  protected resolveReference(
    intrinsic: RefIntrinsic | GetPropIntrinsic,
    ctx: AnnotationsContext
  ): any {
    const { logicalId, fn } = intrinsic;

    if (fn !== 'ref') {
      return this.evaluateIntrinsic(intrinsic, ctx);
    }

    return ctx.child('Ref').wrap(() => {
      const c = this.context.reference(logicalId);

      if (!c.instance) {
        return this.fnRef(logicalId);
      }

      return c.instance;
    });
  }
}

export class Evaluator extends BaseEvaluator<EvaluationContext> {
  public evaluateTemplate(ctx: AnnotationsContext): void {
    const cdkContext =
      this.context.template.metadata.get('AWS::CDK::Context') ?? {};
    Object.entries(cdkContext).forEach(([k, v]) =>
      this.context.stack.node.setContext(k, v)
    );
    super.evaluateTemplate(ctx);
  }

  public evaluateDescription(_ctx: AnnotationsContext) {
    this.context.stack.templateOptions.description =
      this.context.template.description;
  }

  public evaluateTemplateFormatVersion(_ctx: AnnotationsContext) {
    this.context.stack.templateOptions.templateFormatVersion =
      this.context.template.templateFormatVersion;
  }

  public evaluateMappings(ctx: AnnotationsContext) {
    const scope = new Construct(this.context.stack, '$Mappings');
    this.context.template.mappings.forEach((mapping, mapName) =>
      ctx.child(mapName).wrap(() => {
        new cdk.CfnMapping(scope, mapName, {
          mapping: mapping.toObject(),
        }).overrideLogicalId(mapName);
      })
    );
  }

  public evaluateParameters(ctx: AnnotationsContext) {
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

  public evaluateResources(ctx: AnnotationsContext) {
    this.context.template.resources.forEach((logicalId, resource) =>
      ctx.child(logicalId).wrap((c) => this._evaluateResource(resource, c))
    );
  }

  private _evaluateResource(resource: ResourceLike, ctx: AnnotationsContext) {
    const construct = this.evaluate(resource, ctx);

    // If this is the result of a call to a method with no
    // return type (void), then there is nothing else to do here.
    if (construct == null) return;

    this._applyTags(construct, resource.tags);
    this._applyDependsOn(construct, resource.dependsOn);
    if (isCdkConstructExpression(resource)) {
      this._applyOverrides(
        construct,
        resource.overrides,
        ctx.child('Overrides')
      );
    }

    this.context.addReference(
      this._referenceForResourceLike(resource.logicalId, construct)
    );
  }

  private _referenceForResourceLike(logicalId: string, value: unknown) {
    if (!Construct.isConstruct(value)) {
      return new ValueOnlyReference(logicalId, value);
    }

    if (cdk.CfnResource.isCfnResource(value)) {
      return new CfnResourceReference(logicalId, value);
    }

    return new ConstructReference(logicalId, value as Construct);
  }

  public evaluateOutputs(ctx: AnnotationsContext) {
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

  public evaluateTransform(ctx: AnnotationsContext) {
    ctx.wrap(() => {
      this.context.template.transform.forEach((t) => {
        this.context.stack.addTransform(t);
      });
    });
  }

  public evaluateMetadata(ctx: AnnotationsContext) {
    this.context.template.metadata.forEach((v, k) => {
      ctx.child(k).wrap(() => {
        this.context.stack.addMetadata(k, v);
      });
    });
  }

  public evaluateRules(ctx: AnnotationsContext) {
    const scope = new Construct(this.context.stack, '$Rules');
    this.context.template.rules.forEach((rule, name) => {
      ctx.child(name).wrap(() => {
        new CfnRule(scope, name, rule).overrideLogicalId(name);
      });
    });
  }

  public evaluateHooks(ctx: AnnotationsContext) {
    const scope = new Construct(this.context.stack, '$Hooks');
    this.context.template.hooks.forEach((hook, name) => {
      ctx.child(name).wrap(() => {
        new CfnHook(scope, name, hook).overrideLogicalId(name);
      });
    });
  }

  public evaluateConditions(ctx: AnnotationsContext) {
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

  protected evaluateNull() {
    return undefined;
  }

  protected evaluateVoid() {
    return undefined;
  }

  protected evaluatePrimitive(
    x: StringLiteral | NumberLiteral | BooleanLiteral
  ) {
    return x.value;
  }

  protected evaluateDate(x: DateLiteral) {
    return x.date;
  }

  protected evaluateCfnResource(x: CfnResourceNode, ctx: AnnotationsContext) {
    const resource = this.evaluateInitializer(x.fqn, [
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

  protected evaluateConstruct(x: CdkConstruct, ctx: AnnotationsContext) {
    return this.evaluateInitializer(x.fqn, [
      this.context.stack,
      x.logicalId,
      this.evaluate(x.props, ctx.child('Properties')),
    ]);
  }

  protected evaluateCdkObject(x: CdkObject, ctx: AnnotationsContext) {
    return this.evaluateInitializer(x.fqn, [
      this.evaluate(x.props, ctx.child('Properties')),
    ]);
  }

  protected evaluateObject(
    xs: Record<string, TypedTemplateExpression>,
    ctx: AnnotationsContext
  ): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(xs).map(([k, v]) => [k, this.evaluate(v, ctx.child(k))])
    );
  }

  protected evaluateArray(
    xs: TypedTemplateExpression[],
    ctx: AnnotationsContext
  ) {
    return xs.map((x, idx) => this.evaluate(x, ctx.child(idx)));
  }

  protected evaluateCall(
    call: StaticMethodCallExpression | InstanceMethodCallExpression,
    ctx: AnnotationsContext
  ) {
    const evalParams = (
      args: TypedArrayExpression,
      innerCtx: AnnotationsContext
    ) => this.evaluateArray(args.array, innerCtx.child('CDK::Args'));

    if (call.type === 'staticMethodCall') {
      return ctx.child(`${call.fqn}.${call.method}`).wrap((innerCtx) => {
        return this._invokeStaticMethod(
          call.fqn,
          call.method,
          evalParams(call.args, innerCtx)
        );
      });
    }

    return ctx
      .child(`${call.target.reference}.${call.method}`)
      .wrap((innerCtx) => {
        return this._invokeInstanceMethod(
          call.target,
          call.method,
          evalParams(call.args, innerCtx),
          innerCtx
        );
      });
  }

  protected evaluateEnum(fqn: string, choice: string): any {
    const typeClass = this.context.resolveClass(fqn);
    return typeClass[choice];
  }

  private _invokeInstanceMethod(
    target: ResolveReferenceExpression,
    method: string,
    parameters: any[],
    ctx: AnnotationsContext
  ) {
    const instance = this.resolveReference(target.reference, ctx);
    return instance[method](...parameters);
  }

  private _invokeStaticMethod(
    fqn: string,
    method: string,
    parameters: unknown[]
  ): any {
    const typeClass = this.context.resolveClass(fqn);
    return typeClass[method](...parameters);
  }

  protected evaluateInitializer(fqn: string, parameters: unknown[]): any {
    const typeClass = this.context.resolveClass(fqn);
    return new typeClass(...parameters);
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

  protected fnRef(logicalId: string) {
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

  protected fnLazyLogicalId(x: LazyLogicalId) {
    if (x.value) {
      return x.value;
    }
    throw new Error(x.errorMessage);
  }

  protected fnLength(x: unknown) {
    return cdk.Fn.len(x);
  }

  protected fnToJsonString(x: unknown) {
    return cdk.Fn.toJsonString(x);
  }

  private _applyTags(resource: IConstruct, tags: ResourceTag[] = []) {
    tags.forEach((tag: ResourceTag) => {
      cdk.Tags.of(resource).add(tag.key, tag.value);
    });
  }

  private _applyDependsOn(from: IConstruct, dependencies: string[] = []) {
    from.node?.addDependency(
      ...dependencies
        .map((to) => this.context.stack.node.tryFindChild(to))
        .filter(Construct.isConstruct)
    );
  }

  private _applyOverrides(
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
