import path from 'path';
import * as utils from '@ts-morph/common';
import * as ts from 'ts-morph';
import { AnnotationsContext } from '../error-handling';
import { SubFragment } from '../parser/private/sub';
import {
  StringLiteral,
  NumberLiteral,
  BooleanLiteral,
  LazyLogicalId,
} from '../parser/template';
import { CfnResource, CdkConstruct, CdkObject } from '../type-resolution';
import {
  StaticMethodCallExpression,
  InstanceMethodCallExpression,
} from '../type-resolution/callables';
import { TypedTemplateExpression } from '../type-resolution/expression';
import { DateLiteral } from '../type-resolution/literals';
import { EvaluationContext, EvaluationContextOptions } from './context';
import { BaseEvaluator } from './evaluate';

export interface CodeEvaluationContextOptions extends EvaluationContextOptions {
  readonly outPath: string;
  readonly stackName: string;
}
export class CodeEvaluationContext extends EvaluationContext {
  public readonly tsProject: ts.Project;
  public readonly sourceFile: ts.SourceFile;
  public readonly statements: Array<
    string | ts.WriterFunction | ts.StatementStructures
  > = [];

  constructor(opts: CodeEvaluationContextOptions) {
    super(opts);

    this.tsProject = new ts.Project({});
    this.sourceFile = this.tsProject.createSourceFile(
      path.join(opts.outPath, `${opts.stackName}.ts`),
      undefined,
      {
        overwrite: true,
        scriptKind: ts.ScriptKind.TS,
      }
    );
  }

  public addStatement(
    statement: string | ts.WriterFunction | ts.StatementStructures
  ) {
    this.statements.push(statement);
  }

  public importModule(moduleSpecifier: string, shortName?: string) {
    this.sourceFile.addImportDeclaration({
      kind: ts.StructureKind.ImportDeclaration,
      moduleSpecifier,
      defaultImport: `* as ${shortName ?? moduleSpecifier}`,
    });
  }
}

export class CodeEvaluator extends BaseEvaluator<CodeEvaluationContext> {
  public evaluateTemplate(ctx: AnnotationsContext): ts.Project {
    this.context.importModule('aws-cdk-lib', 'cdk');
    this.context.importModule('constructs');
    this.context.addStatement('super(scope, id);');

    super.evaluateTemplate(ctx);

    this.context.sourceFile.addClass({
      kind: ts.StructureKind.Class,
      name: this.context.sourceFile.getBaseNameWithoutExtension(),
      extends: 'cdk.Stack',
      isExported: true,
      ctors: [
        {
          kind: ts.StructureKind.Constructor,
          scope: ts.Scope.Public,
          parameters: [
            {
              name: 'scope',
              type: 'constructs.IConstruct',
            },
            {
              name: 'id',
              type: 'string',
            },
            {
              name: 'props',
              type: 'cdk.StackProps',
            },
          ],
          statements: this.context.statements,
        },
      ],
    });

    return this.context.tsProject;
  }
  public evaluateDescription(_ctx: AnnotationsContext) {
    if (this.context.template.description) {
      this.context.addStatement(
        `this.templateOptions.description = ${this.evaluateString(
          this.context.template.description
        )};`
      );
    }
  }
  public evaluateTemplateFormatVersion(_ctx: AnnotationsContext) {}
  public evaluateMappings(_ctx: AnnotationsContext) {}
  public evaluateParameters(_ctx: AnnotationsContext) {}

  public evaluateResources(ctx: AnnotationsContext) {
    this.context.template.resources.forEach((logicalId, resource) => {
      const initializer = this.evaluate(resource, ctx.child(logicalId));

      if (
        this.context.template.resources.directDependents(logicalId).length === 0
      ) {
        this.context.addStatement(initializer);
        return;
      }

      this.context.addStatement({
        kind: ts.StructureKind.VariableStatement,
        declarationKind: ts.VariableDeclarationKind.Const,
        declarations: [
          {
            kind: ts.StructureKind.VariableDeclaration,
            name: logicalId,
            initializer,
          },
        ],
      });
    });
  }

  public evaluateOutputs(_ctx: AnnotationsContext) {}
  public evaluateTransform(_ctx: AnnotationsContext) {}
  public evaluateMetadata(_ctx: AnnotationsContext) {}
  public evaluateRules(_ctx: AnnotationsContext) {}
  public evaluateHooks(_ctx: AnnotationsContext) {}
  public evaluateConditions(_ctx: AnnotationsContext) {}

  protected evaluateNull() {
    return 'null';
  }
  protected evaluateVoid() {
    return '';
  }
  protected evaluateDate(x: DateLiteral) {
    return `new Date(${x.date.valueOf()})`;
  }
  protected evaluatePrimitive(
    x: StringLiteral | NumberLiteral | BooleanLiteral
  ) {
    switch (x.type) {
      case 'string':
        return this.evaluateString(x.value);
      case 'number':
      case 'boolean':
        return `${x.value}`;
    }
  }
  protected evaluateString(x: string) {
    return `'${utils.StringUtils.escapeForWithinString(
      utils.StringUtils.escapeChar(x, '\\'),
      ts.QuoteKind.Single
    )}'`;
  }

  protected evaluateCfnResource(x: CfnResource, ctx: AnnotationsContext) {
    return ctx.wrap(
      () =>
        `new cdk.CfnResource(this, ${this.evaluateString(
          x.logicalId
        )}, ${this.evaluate(x.props, ctx.child('Properties'))})`
    );
  }

  protected evaluateConstruct(_x: CdkConstruct, _ctx: AnnotationsContext) {}
  protected evaluateCdkObject(_x: CdkObject, _ctx: AnnotationsContext) {}
  protected evaluateObject(
    xs: Record<string, TypedTemplateExpression>,
    ctx: AnnotationsContext
  ): any {
    return `{${Object.entries(xs)
      .map(([k, v]) => `\n  ${k}: ${this.evaluate(v, ctx.child(k))}`)
      .join()}\n}`;
  }
  protected evaluateArray(
    _xs: TypedTemplateExpression[],
    _ctx: AnnotationsContext
  ) {}
  protected evaluateCall(
    _call: StaticMethodCallExpression | InstanceMethodCallExpression,
    _ctx: AnnotationsContext
  ) {}
  protected evaluateEnum(_fqn: string, _choice: string) {}
  protected evaluateInitializer(_fqn: string, _parameters: unknown[]) {}
  protected fnBase64(_x: string) {}
  protected fnCidr(
    _ipBlock: string,
    _count: number,
    _sizeMask?: string | undefined
  ) {}
  protected fnFindInMap(
    _mapName: string,
    _topLevelKey: string,
    _secondLevelKey: string
  ) {}
  protected fnGetProp(_logicalId: string, _prop: string) {}
  protected fnGetAtt(logicalId: string, attribute: string) {
    return `${logicalId}.getAtt(${attribute})`;
  }
  protected fnGetAzs(_region: string) {}
  protected fnIf(
    _conditionName: string,
    _ifYes: TypedTemplateExpression,
    _ifNo: TypedTemplateExpression,
    _ctx: AnnotationsContext
  ) {}
  protected fnImportValue(_exportName: string) {}
  protected fnJoin(_separator: string, _array: any[]) {}
  protected fnRef(logicalId: string) {
    return `${logicalId}`;
  }
  protected fnSelect(_index: number, _elements: any[]) {}
  protected fnSplit(_separator: string, _value: string) {}
  protected fnSub(
    _fragments: SubFragment[],
    _additionalContext: Record<string, any>
  ) {}
  protected fnTransform(
    _transformName: string,
    _parameters: Record<string, unknown>
  ) {}
  protected fnAnd(_operands: unknown[]) {}
  protected fnOr(_operands: unknown[]) {}
  protected fnNot(_operand: unknown) {}
  protected fnEquals(_value1: unknown, _value2: unknown) {}
  protected fnLazyLogicalId(_x: LazyLogicalId) {}
  protected fnLength(_x: unknown) {}
  protected fnToJsonString(_x: unknown) {}
}
