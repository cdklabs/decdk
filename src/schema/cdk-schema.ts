import chalk from 'chalk';
import * as reflect from 'jsii-reflect';
import { hasPropsParam } from '../type-system';
import { schemaForIntrinsicFunctions } from './intrinsics';
import {
  SchemaContext,
  schemaForEnumLikeClass,
  schemaForTypeReference,
} from './jsii2schema';

/* eslint-disable no-console */

export interface RenderSchemaOptions {
  warnings?: boolean;

  /**
   * Use colors when printing ouput.
   * @default true if tty is enabled
   */
  colors?: boolean;
}

function overrideDefinition() {
  return {
    additionalProperties: false,
    type: 'object',
    properties: {
      ChildConstructPath: {
        type: 'string',
        pattern: '[a-zA-Z0-9\\-\\._]+',
      },
      RemoveResource: {
        type: 'boolean',
      },
      Delete: {
        type: 'object',
        properties: {
          Path: {
            type: 'string',
            pattern: '[a-zA-Z0-9\\-\\._]+',
          },
        },
        required: ['Path'],
      },
      Update: {
        type: 'object',
        properties: {
          Path: {
            type: 'string',
            pattern: '[a-zA-Z0-9\\-\\._]+',
          },
          Value: {},
        },
        required: ['Path'],
      },
    },
    required: ['ChildConstructPath'],
    oneOf: [
      {
        required: ['Delete'],
      },
      {
        required: ['Update'],
      },
      {
        required: ['RemoveResource'],
      },
    ],
  };
}

function dependsOnDefinition() {
  return {
    additionalProperties: false,
    type: ['array', 'string'],
    items: {
      type: 'string',
    },
  };
}

export function renderFullSchema(
  typeSystem: reflect.TypeSystem,
  options: RenderSchemaOptions = {}
) {
  if (!process.stdin.isTTY || options.colors === false) {
    // Disable chalk color highlighting
    process.env.FORCE_COLOR = '0';
  }

  // Find all constructs and top-level classes
  const constructType = typeSystem.findClass('constructs.Construct');
  const cfnResourceType = typeSystem.findClass('aws-cdk-lib.CfnResource');

  const constructs = typeSystem.classes.filter(
    (c) => c.extends(constructType) && !c.extends(cfnResourceType)
  );
  const cdkClasses = typeSystem.classes.filter(
    (c) => !c.extends(constructType)
  );

  const deconstructs: ClassAndProps[] = [
    ...constructs.map((c) => unpackTopLevel(c, 2)),
    ...cdkClasses.map((c) => unpackTopLevel(c, 0)),
  ].filter((c): c is ClassAndProps => !!c);

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const output = require('../../cloudformation.schema.json');

  output.definitions = output.definitions || {};

  const ctx = SchemaContext.root(output.definitions, {
    string: 'StringExpression',
    number: 'NumberExpression',
    boolean: 'BooleanExpression',
  });

  schemaForIntrinsicFunctions(ctx);

  for (const deco of deconstructs) {
    addResource(schemaForResource(deco, ctx));
  }

  // Top-level static method calls
  {
    for (const type of typeSystem.classes) {
      addResource(schemaForEnumLikeClass(type, ctx));
    }
  }

  output.properties.$schema = {
    type: 'string',
  };

  if (options.warnings) {
    printWarnings(ctx);
  }

  function addResource(resource?: { $ref: string }) {
    if (resource) {
      output.properties.Resources.patternProperties[
        '^[a-zA-Z0-9]+$'
      ].anyOf.push(resource);
    }
  }

  return output;
}

function printWarnings(node: SchemaContext, indent = '') {
  if (!node.hasWarningsOrErrors) {
    return;
  }

  console.error(indent + node.name);

  for (const warning of node.warnings) {
    console.error(chalk.yellow(indent + '  ' + warning));
  }

  for (const error of node.errors) {
    console.error(chalk.red(indent + '  ' + error));
  }

  if (!node.root) {
    indent += '  ';
  }

  for (const child of node.children) {
    printWarnings(child, indent);
  }
}

export function schemaForResource(
  construct: ClassAndProps,
  ctx: SchemaContext
) {
  ctx = ctx.child('resource', construct.class.fqn);

  return ctx.define(construct.class.fqn, () => {
    return {
      additionalProperties: false,
      properties: {
        Properties: schemaForProps(construct.propsTypeRef, ctx),
        Call: schemaForCall(construct.class, ctx),
        On: {
          type: 'string',
        },
        Type: {
          enum: [construct.class.fqn],
          type: 'string',
        },
        Tags: {
          type: 'array',
          items: ctx.define('Tag', () => {}),
        },
        DependsOn: ctx.define('DependsOn', dependsOnDefinition),
        Overrides: {
          type: 'array',
          items: ctx.define('Override', overrideDefinition),
        },
      },
      required: ['Type'],
    };
  });
}

function schemaForProps(
  propsTypeRef: reflect.TypeReference | undefined,
  ctx: SchemaContext
) {
  if (!propsTypeRef) {
    return;
  }

  return schemaForTypeReference(propsTypeRef, ctx);
}

function schemaForCall(_classType: reflect.ClassType, _ctx: SchemaContext) {
  return {
    type: 'object',
  };
}

function unpackTopLevel(
  klass: reflect.ClassType,
  propsParamAt: number
): ClassAndProps | undefined {
  if (!hasPropsParam(klass, propsParamAt)) {
    return undefined;
  }

  return {
    class: klass,
    propsTypeRef: klass.initializer?.parameters?.[propsParamAt]?.type,
  };
}

export interface ClassAndProps {
  class: reflect.ClassType;
  propsTypeRef?: reflect.TypeReference;
}
