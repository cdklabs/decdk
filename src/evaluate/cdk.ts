import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import * as reflect from 'jsii-reflect';
import { SubFragment } from '../parser/private/sub';
import { TemplateExpression, TemplateResource } from '../parser/template';
import { ResourceOverride } from '../parser/template/overrides';
import { ResourceTag } from '../parser/template/tags';
import { TypedContext, TypedContextOptions, TypedEvaluator } from './typed';

export type CdKContextValue = IConstruct | string | string[] | symbol;

export interface CdkContextOptions extends TypedContextOptions {
  readonly stack: cdk.Stack;
  readonly typeSystem: reflect.TypeSystem;
}

export class CdkContext extends TypedContext<CdKContextValue, any> {
  public readonly stack: cdk.Stack;

  constructor(opts: CdkContextOptions) {
    super(opts);

    this.stack = opts.stack;

    this.context.set('AWS::NoValue', { primaryValue: cdk.Aws.NO_VALUE });
    this.context.set('AWS::AccountId', { primaryValue: cdk.Aws.ACCOUNT_ID });
    // @todo at other defaults

    // @todo check how to set parameters, conditions, mappings
    // this.template?.parameters.seedDefaults(this.context);
    // this.environment?.seedContext(this.context);
  }
}

export class CdkEvaluator extends TypedEvaluator<CdkContext, IConstruct> {
  private currentResource?: TemplateResource;

  public evaluateResource(
    logicalId: string,
    resource: TemplateResource
  ): IConstruct {
    this.currentResource = resource;

    if (isCfnResourceType(resource.type)) {
      return this.evaluateCfnResource(logicalId, resource);
    }

    return this.evaluateCdkConstruct(logicalId, resource);
  }
  protected evaluateCdkConstruct(
    logicalId: string,
    resource: TemplateResource
  ): IConstruct {
    const propsTypeRef = this.context.extractPropsType(resource.type);
    const evaluatedProps = this.evaluate({
      type: 'object',
      fields: resource.properties,
    });
    const props = this.resolveType(evaluatedProps, propsTypeRef);

    const Ctor = this.context.resolveClass(resource.type);
    const cdkConstruct = new Ctor(this.context.stack, logicalId, props);

    this.applyTags(cdkConstruct, resource.tags);
    this.applyOverrides(cdkConstruct, resource.overrides);
    this.applyDependsOn(cdkConstruct, resource.dependsOn);

    this.context.addReferenceable(logicalId, {
      primaryValue: cdkConstruct,
      attributes: cdkConstruct,
    });

    return cdkConstruct;
  }

  protected evaluateCfnResource(
    logicalId: string,
    resource: TemplateResource
  ): cdk.CfnResource {
    const cfnConstruct = new cdk.CfnResource(this.context.stack, logicalId, {
      type: resource.type,
      properties: this.evaluateObject(resource.properties),
    });

    this.applyTags(cfnConstruct, resource.tags);
    this.applyDependsOn(cfnConstruct, resource.dependsOn);

    this.context.addReferenceable(logicalId, {
      primaryValue: cfnConstruct,
      attributes: cfnConstruct,
    });

    return cfnConstruct;
  }

  protected ref(logicalId: string) {
    const ref = super.ref(logicalId);

    if (this.currentResource && isCfnResourceType(this.currentResource.type)) {
      try {
        return cdk.Fn.ref(
          this.context.stack.getLogicalId(
            findConstruct(this.context.stack, logicalId).node
              .defaultChild as cdk.CfnElement
          )
        );
      } catch (_unused) {}
    }

    return ref;
  }

  protected fnGetAzs(region: string) {
    return cdk.Fn.getAzs(region);
  }

  protected fnIf(
    conditionName: string,
    ifYes: TemplateExpression,
    ifNo: TemplateExpression
  ) {
    return cdk.Fn.conditionIf(
      conditionName,
      this.evaluate(ifYes),
      this.evaluate(ifNo)
    );
  }

  protected fnImportValue(exportName: string) {
    return cdk.Fn.importValue(exportName);
  }

  protected fnJoin(separator: string, array: TemplateExpression[]) {
    return cdk.Fn.join(separator, this.evaluateArray(array));
  }

  protected fnSelect(index: number, elements: TemplateExpression[]) {
    if (index < 0 || elements.length <= index) {
      throw new Error(
        `Fn::Select: index ${index} of out range: [0..${elements.length - 1}]`
      );
    }

    return cdk.Fn.select(index, this.evaluateArray(elements));
  }

  protected fnSplit(separator: string, value: string) {
    return cdk.Fn.split(separator, value);
  }

  protected fnSub(
    fragments: SubFragment[],
    additionalContext: Record<string, unknown>
  ) {
    // @todo use cdk.fn.sub
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
    // @todo does this need be evaluated?
    return cdk.Fn.transform(transformName, parameters);
  }

  protected fnAnd(_operands: boolean[]): boolean {
    // @todo
    throw Error('not implemented');
    // return cdk.Fn.conditionAnd(...operands) as any;
  }

  protected fnOr(_operands: boolean[]): boolean {
    // @todo
    throw Error('not implemented');
    // return cdk.Fn.conditionOr(...operands);
  }

  protected fnNot(_operand: boolean): boolean {
    // @todo
    throw Error('not implemented');
    // return cdk.Fn.conditionNot(operand);
  }

  protected fnEquals(_value1: unknown, _value2: unknown): boolean {
    // @todo
    throw Error('not implemented');
    // return cdk.Fn.conditionEquals(value1, value2);
  }

  protected applyDependsOn(
    from: IConstruct,
    dependencies: Set<string> = new Set()
  ) {
    dependencies.forEach((to) =>
      from.node.addDependency(findConstruct(this.context.stack, to))
    );
  }

  protected applyTags(resource: IConstruct, tags: ResourceTag[] = []) {
    tags.forEach((tag: ResourceTag) => {
      cdk.Tags.of(resource).add(tag.key, tag.value);
    });
  }

  protected applyOverrides(
    resource: IConstruct,
    overrides: ResourceOverride[] = []
  ) {
    overrides.forEach((override: ResourceOverride) => {
      if (override.removeResource) {
        resource.node.tryRemoveChild(override.childConstructPath!);
      }

      if (override.update != null) {
        const descendent = resolvePath(resource, override.childConstructPath);
        const { path, value } = override.update;
        descendent.addOverride(path, this.evaluate(value));
      }

      if (override.delete != null) {
        const descendent = resolvePath(resource, override.childConstructPath);
        descendent.addDeletionOverride(override.delete.path);
      }
    });
  }
}

function isCfnResourceType(resourceType: string) {
  return resourceType.includes('::');
}

function findConstruct(stack: cdk.Stack, id: string) {
  const child = stack.node.tryFindChild(id);
  if (!child) {
    throw new Error(
      `Construct with ID ${id} not found (it must be defined before it is referenced)`
    );
  }
  return child;
}

function resolvePath(root: IConstruct, path?: string): cdk.CfnResource {
  const ids = path != null ? path.split('.') : [];
  const destination = ids.reduce(descend, root);
  if (cdk.CfnResource.isCfnResource(destination)) {
    return destination;
  }

  if (
    destination.node.defaultChild != null &&
    cdk.CfnResource.isCfnResource(destination.node.defaultChild)
  ) {
    return destination.node.defaultChild;
  }

  throw new Error(
    `Resource ${path} does not have a default child. Please specify the CloudFormation Resource`
  );

  function descend(construct: IConstruct, id: string): IConstruct {
    const child = construct.node.tryFindChild(id);
    if (child == null) {
      throw new Error(`${id} does not exist`);
    }
    return child;
  }
}
