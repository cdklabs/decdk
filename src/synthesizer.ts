import {
  DefaultStackSynthesizer,
  FileAssetLocation,
  FileAssetSource,
} from 'aws-cdk-lib';
import { DefaultStackSynthesizerProps } from 'aws-cdk-lib/core/lib/stack-synthesizers/default-synthesizer';
import * as path from 'path';

export interface DeclarativeStackSynthesizerProps
  extends DefaultStackSynthesizerProps {}

const cdkLibRoot = path.dirname(require.resolve('aws-cdk-lib'));

export class DeclarativeStackSynthesizer extends DefaultStackSynthesizer {
  constructor(props: DeclarativeStackSynthesizerProps = {}) {
    super(props);
  }

  addFileAsset(asset: FileAssetSource): FileAssetLocation {
    const assetDirName = asset.fileName && path.dirname(asset.fileName);
    if (!isSubDir(assetDirName, cdkLibRoot) && assetDirName !== '.') {
      throw new Error(
        `Asset ${asset.fileName} cannot be used. Only assets from the CDK construct library are supported.`
      );
    }

    return super.addFileAsset(asset);
  }
}

function isSubDir(dir: string | undefined, parent: string): boolean {
  if (!dir) return false;

  const path = require('path');
  const relative = path.relative(parent, dir);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}
