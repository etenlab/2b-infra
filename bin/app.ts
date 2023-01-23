#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkingStack } from '../lib/networking/networking-stack';
import { DatabaseStack } from '../lib/database/database-stack';
import { FargateClusterStack } from '../lib/fargate-cluster/fargate-cluster-stack';
import { getConfig } from './getConfig';

const app = new cdk.App();

const config = getConfig(app);

const networkingStack = new NetworkingStack(app, 'NetworkingStack', {
  env: {
    account: config.awsAccountId,
    region: config.awsRegion,
  },
  cidr: config.vpcCidr as string,
  envName: config.environment,
  natGatewaysCount: config.natGatewaysCount as number,
  vpcSsmParam: config.vpcSsmParam as string,
});

const databaseStack = new DatabaseStack(app, 'DatabaseStack', {
  env: {
    account: config.awsAccountId,
    region: config.awsRegion,
  },
  envName: config.environment,
  vpcSsmParam: config.vpcSsmParam as string,
});

const fargateClusterStack = new FargateClusterStack(app, 'FargateClusterStack', {
  env: {
    account: config.awsAccountId,
    region: config.awsRegion,
  },
  envName: config.environment,
  vpcSsmParam: config.vpcSsmParam as string,
});
