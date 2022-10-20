import * as zlib from 'zlib';
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

  const analyticsData = new Capture();
  template.hasResourceProperties('AWS::CDK::Metadata', {
    Analytics: analyticsData,
  });

  const analytics = extractAnalytics(analyticsData.asString());

  // THEN
  expect(analytics).toContain('0.0.0!@cdklabs/decdk');
});

function extractAnalytics(analytics: string): any {
  const [version, deflate, data] = analytics.split(':');

  if (version !== 'v2' || deflate !== 'deflate64' || !data) {
    throw new Error('Unexpected Analytics Data');
  }

  return zlib.gunzipSync(Buffer.from(data, 'base64')).toString();
}
