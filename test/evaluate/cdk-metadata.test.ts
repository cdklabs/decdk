import { Capture } from 'aws-cdk-lib/assertions';
import { Template } from '../../src/parser/template';
import { Testing } from '../util';

test('has CDK Metadata', async () => {
  // GIVEN
  const rawTemplate = {
    Resources: {
      Topic: {
        Type: 'aws-cdk-lib.aws_sns.Topic',
      },
    },
  };
  const template = await Testing.template(
    await Template.fromObject(rawTemplate),
    {
      appProps: {
        analyticsReporting: true,
      },
    }
  );

  // THEN
  template.hasResourceProperties('AWS::CDK::Metadata', {});
});

test('has deCDK Metadata', async () => {
  // GIVEN
  const rawTemplate = {
    Resources: {
      Topic: {
        Type: 'aws-cdk-lib.aws_sns.Topic',
      },
    },
  };
  const template = await Testing.template(
    await Template.fromObject(rawTemplate),
    {
      appProps: {
        analyticsReporting: true,
      },
    }
  );

  const analytics = new Capture();
  template.hasResourceProperties('AWS::CDK::Metadata', {
    Analytics: analytics,
  });

  // THEN
  expect(analytics.asString()).toContain('v2:deflate64');
});
