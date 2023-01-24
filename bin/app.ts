#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkingStack } from '../lib/networking/networking-stack';
import { DatabaseStack } from '../lib/database/database-stack';
import { FargateClusterStack } from '../lib/fargate-cluster/fargate-cluster-stack';
import { FargateServiceConfig, getConfig, getContextVariable } from './getConfig';
import { FargateServiceStack } from '../lib/fargate-service/fargate-service-stack';

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
  ecsExecRoleSsmParam: config.ecsExecRoleSsmParam as string,
  ecsTaskRoleSsmParam: config.ecsTaskRoleSsmParam as string,
});

const databaseApiStack = new FargateServiceStack(app, 'DatabaseApiStack', {
  env: {
    account: config.awsAccountId,
    region: config.awsRegion,
  },
  envName: config.environment,
  vpcSsmParam: config.vpcSsmParam as string,
  ecsExecRoleSsmParam: config.defaultEcsExecRoleSsmParam as string,
  ecsTaskRoleSsmParam: config.edefaultEcsTaskRoleSsmParam as string,
  containerPort: (config.databaseApi as FargateServiceConfig).containerPort,
  hostPort: (config.databaseApi as FargateServiceConfig).hostPort,
  serviceName: (config.databaseApi as FargateServiceConfig).serviceName,
  dockerImageUrl: (config.databaseApi as FargateServiceConfig).dockerImageUrl,
  cpu: (config.databaseApi as FargateServiceConfig).cpu,
  memory: (config.databaseApi as FargateServiceConfig).memory,
  secrets: [
    {
      taskDefSecretName: 'DB_PASSWORD',
      secretsManagerSecretName: config.dbCredential as string,
      secretsMangerSecretField: 'password'
    },
    {
      taskDefSecretName: 'DB_USERNAME',
      secretsManagerSecretName: config.dbCredential as string,
      secretsMangerSecretField: 'username'
    },
  ]
});

const adminApiStack = new FargateServiceStack(app, 'AdminApiStack', {
  env: {
    account: config.awsAccountId,
    region: config.awsRegion,
  },
  envName: config.environment,
  vpcSsmParam: config.vpcSsmParam as string,
  ecsExecRoleSsmParam: config.defaultEcsExecRoleSsmParam as string,
  ecsTaskRoleSsmParam: config.edefaultEcsTaskRoleSsmParam as string,
  containerPort: (config.adminApi as FargateServiceConfig).containerPort,
  hostPort: (config.adminApi as FargateServiceConfig).hostPort,
  serviceName: (config.adminApi as FargateServiceConfig).serviceName,
  dockerImageUrl: (config.adminApi as FargateServiceConfig).dockerImageUrl,
  cpu: (config.adminApi as FargateServiceConfig).cpu,
  memory: (config.adminApi as FargateServiceConfig).memory,
  secrets: []
});
