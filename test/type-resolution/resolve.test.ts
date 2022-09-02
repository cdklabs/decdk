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
