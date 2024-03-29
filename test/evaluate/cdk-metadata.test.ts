import * as zlib from 'zlib';
import { Capture } from 'aws-cdk-lib/assertions';
import { expect } from 'expect';
import { Template } from '../../src/parser/template';
import { Testing } from '../util';

suite('decdk Metadata', () => {
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

    /**
     * For a real release the data might look something like this:
     * "2.{46.0!aws-cdk-lib.{Stack,CfnResource},0.0-pre.304!@cdklabs/decdk},node.js/v16.18.0!jsii-runtime.Runtime"
     * To save space, the version number might be collated, so the only safe string to check for is the following test
     */
    expect(analytics).toContain('!@cdklabs/decdk');
  });

  function extractAnalytics(analytics: string): any {
    const [version, deflate, data] = analytics.split(':');

    if (version !== 'v2' || deflate !== 'deflate64' || !data) {
      throw new Error('Unexpected Analytics Data');
    }

    return zlib.gunzipSync(Buffer.from(data, 'base64')).toString();
  }
});
