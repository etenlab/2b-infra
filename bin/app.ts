#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CommonStack } from '../lib/stacks/common-stack';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { FargateServiceConfig, getConfig } from './getConfig';
import { AppServiceStack } from '../lib/stacks/app-service-stack';

const app = new cdk.App();

const config = getConfig(app);

const commonStack = new CommonStack(app, 'CommonStack', {
  env: {
    account: config.awsAccountId,
    region: config.awsRegion,
  },
  appPrefix: 'cb',
  cidr: config.vpcCidr as string,
  envName: config.environment,
  natGatewaysCount: config.natGatewaysCount as number,
  vpcSsmParam: config.vpcSsmParam as string,
  albArnSsmParam: config.albArnSsmParam as string,
  ecsExecRoleSsmParam: config.defaultEcsExecRoleSsmParam as string,
  ecsTaskRoleSsmParam: config.defaultEcsTaskRoleSsmParam as string,
  ecsClusterName: config.ecsClusterName as string,
  albSecurityGroupSsmParam: config.albSecurityGroupSsmParam as string,
});

const databaseStack = new DatabaseStack(app, 'DatabaseStack', {
  env: {
    account: config.awsAccountId,
    region: config.awsRegion,
  },
  envName: config.environment,
  vpcSsmParam: config.vpcSsmParam as string,
});

const databaseApiStack = new AppServiceStack(app, 'DatabaseApiStack', {
  env: {
    account: config.awsAccountId,
    region: config.awsRegion,
  },
  envName: config.environment,
  appPrefix: 'cb',
  albArnSsmParam: config.albArnSsmParam as string,
  albSecurityGroupSsmParam: config.albSecurityGroupSsmParam as string,
  vpcSsmParam: config.vpcSsmParam as string,
  ecsExecRoleSsmParam: config.defaultEcsExecRoleSsmParam as string,
  ecsTaskRoleSsmParam: config.defaultEcsTaskRoleSsmParam as string,
  ecsClusterName: config.ecsClusterName as string,
  containerPort: (config.databaseApi as FargateServiceConfig).containerPort,
  hostPort: (config.databaseApi as FargateServiceConfig).hostPort,
  serviceName: (config.databaseApi as FargateServiceConfig).serviceName,
  dockerImageUrl: (config.databaseApi as FargateServiceConfig).dockerImageUrl,
  cpu: (config.databaseApi as FargateServiceConfig).cpu,
  memory: (config.databaseApi as FargateServiceConfig).memory,
  serviceTasksCount: (config.databaseApi as FargateServiceConfig).taskCount,
  secrets: [
    {
      taskDefSecretName: 'DB_PASSWORD',
      secretsManagerSecretName: config.dbCredential as string,
      secretsMangerSecretField: 'password',
    },
    {
      taskDefSecretName: 'DB_USERNAME',
      secretsManagerSecretName: config.dbCredential as string,
      secretsMangerSecretField: 'username',
    },
  ],
});

const adminApiStack = new AppServiceStack(app, 'AdminApiStack', {
  env: {
    account: config.awsAccountId,
    region: config.awsRegion,
  },
  envName: config.environment,
  appPrefix: 'cb',
  albArnSsmParam: config.albArnSsmParam as string,
  albSecurityGroupSsmParam: config.albSecurityGroupSsmParam as string,
  vpcSsmParam: config.vpcSsmParam as string,
  ecsExecRoleSsmParam: config.defaultEcsExecRoleSsmParam as string,
  ecsTaskRoleSsmParam: config.defaultEcsTaskRoleSsmParam as string,
  ecsClusterName: config.ecsClusterName as string,
  containerPort: (config.adminApi as FargateServiceConfig).containerPort,
  hostPort: (config.adminApi as FargateServiceConfig).hostPort,
  serviceName: (config.adminApi as FargateServiceConfig).serviceName,
  dockerImageUrl: (config.adminApi as FargateServiceConfig).dockerImageUrl,
  cpu: (config.adminApi as FargateServiceConfig).cpu,
  memory: (config.adminApi as FargateServiceConfig).memory,
  serviceTasksCount: (config.databaseApi as FargateServiceConfig).taskCount,
  secrets: [],
});
