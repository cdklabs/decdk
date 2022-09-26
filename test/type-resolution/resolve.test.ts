import * as reflect from 'jsii-reflect';
import {
  analyzeTypeReference,
  ResolvableExpressionType,
} from '../../src/type-resolution/resolve';
import { Testing } from '../util';

let typeSystem: reflect.TypeSystem;

beforeAll(async () => {
  typeSystem = await Testing.typeSystem;
});

test('aws-cdk-lib.aws_ecs.TaskDefinition is a Construct', async () => {
  // GIVEN
  const type = typeSystem.findFqn('aws-cdk-lib.aws_ecs.TaskDefinition');

  // THEN
  expect(analyzeTypeReference(type.reference)).toBe(
    ResolvableExpressionType.CONSTRUCT
  );
});

test('aws-cdk-lib.aws_ecs.TaskDefinitionProps is a data structure', async () => {
  // GIVEN
  const type = typeSystem.findFqn('aws-cdk-lib.aws_ecs.TaskDefinitionProps');

  // THEN
  expect(analyzeTypeReference(type.reference)).toBe(
    ResolvableExpressionType.STRUCT
  );
});

test('aws-cdk-lib.aws_iam.IGrantable is a behavioral interface', async () => {
  // GIVEN
  const type = typeSystem.findFqn('aws-cdk-lib.aws_iam.IGrantable');

  // THEN
  expect(analyzeTypeReference(type.reference)).toBe(
    ResolvableExpressionType.BEHAVIORAL_INTERFACE
  );
});

test('aws-cdk-lib.aws_ec2.InstanceType is a behavioral interface', async () => {
  // GIVEN
  const type = typeSystem.findFqn('aws-cdk-lib.aws_ec2.InstanceType');

  // THEN
  expect(analyzeTypeReference(type.reference)).toBe(
    ResolvableExpressionType.ENUM_LIKE_CLASS
  );
});
