import { expect } from 'expect';
import { isBehavioralInterface } from '../../src/type-system';
import { Testing } from '../util';

suite('Type System: Interfaces', () => {
  suite('isBehavioralInterface', () => {
    test('IntegrationOptions', async () => {
      const type = (await Testing.typeSystem).findFqn(
        'aws-cdk-lib.aws_apigateway.IntegrationOptions'
      );

      expect(isBehavioralInterface(type)).toEqual(false);
    });

    test('ITopic', async () => {
      const type = (await Testing.typeSystem).findFqn(
        'aws-cdk-lib.aws_sns.ITopic'
      );

      expect(isBehavioralInterface(type)).toEqual(true);
    });
  });
});
