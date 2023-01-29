#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CommonStack } from '../lib/stacks/common-stack';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { FargateServiceConfig, FrontendAppConfig, getConfig } from './getConfig';
import { ApiServiceStack } from '../lib/stacks/api-service-stack';
import { FrontendStack } from '../lib/stacks/frontend-stack';

const app = new cdk.App();

const config = getConfig(app);

const commonStack = new CommonStack(app, 'CommonStack', {
  env: {
    account: config.awsAccountId,
    region: config.awsRegion,
  },
  appPrefix: 'cb',
  rootDomainName: config.rootDomainName as string,
  domainCertSsmParam: config.domainCertSsmParam as string,
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
  isPubliclyAccessible: config.dbPublicAccess as boolean,
  dbCredentialSecret: config.dbCredentialSecret as string,
  dbSecurityGroupSsmParam: config.dbSecurityGroupSsmParam as string,
});

const showcaseAppStack = new FrontendStack(app, 'ShowcaseApp', {
  env: {
    account: config.awsAccountId,
    region: config.awsRegion,
  },
  envName: config.environment,
  domainName: (config.showcaseApp as FrontendAppConfig).domainName,
  rootDomainName: config.rootDomainName as string,
});

const databaseApiStack = new ApiServiceStack(app, 'DatabaseApiStack', {
  env: {
    account: config.awsAccountId,
    region: config.awsRegion,
  },
  envName: config.environment,
  appPrefix: 'cb',
  albArnSsmParam: config.albArnSsmParam as string,
  albSecurityGroupSsmParam: config.albSecurityGroupSsmParam as string,
  dbSecurityGroupSsmParam: config.dbSecurityGroupSsmParam as string,
  vpcSsmParam: config.vpcSsmParam as string,
  ecsExecRoleSsmParam: config.defaultEcsExecRoleSsmParam as string,
  ecsTaskRoleSsmParam: config.defaultEcsTaskRoleSsmParam as string,
  ecsClusterName: config.ecsClusterName as string,
  domainCertSsmParam: config.domainCertSsmParam as string,
  rootDomainName: config.rootDomainName as string,
  subdomain: (config.databaseApi as FargateServiceConfig).subdomain,
  dockerPort: (config.databaseApi as FargateServiceConfig).dockerPort,
  albPort: (config.databaseApi as FargateServiceConfig).albPort,
  serviceName: (config.databaseApi as FargateServiceConfig).serviceName,
  dockerImageUrl: (config.databaseApi as FargateServiceConfig).dockerImageUrl,
  cpu: (config.databaseApi as FargateServiceConfig).cpu,
  memory: (config.databaseApi as FargateServiceConfig).memory,
  serviceTasksCount: (config.databaseApi as FargateServiceConfig).taskCount,
  environmentVars: (config.databaseApi as FargateServiceConfig).environment,
  secrets: [
    {
      taskDefSecretName: 'DB_PASSWORD',
      secretsManagerSecretName: config.dbCredentialSecret as string,
      secretsMangerSecretField: 'password',
    },
    {
      taskDefSecretName: 'DB_USERNAME',
      secretsManagerSecretName: config.dbCredentialSecret as string,
      secretsMangerSecretField: 'username',
    },
    {
      taskDefSecretName: 'DB_HOST',
      secretsManagerSecretName: config.dbCredentialSecret as string,
      secretsMangerSecretField: 'host',
    },
    {
      taskDefSecretName: 'DB_NAME',
      secretsManagerSecretName: config.dbCredentialSecret as string,
      secretsMangerSecretField: 'dbname',
    },
    {
      taskDefSecretName: 'DB_PORT',
      secretsManagerSecretName: config.dbCredentialSecret as string,
      secretsMangerSecretField: 'port',
    },
  ],
});

const adminApiStack = new ApiServiceStack(app, 'AdminApiStack', {
  env: {
    account: config.awsAccountId,
    region: config.awsRegion,
  },
  envName: config.environment,
  appPrefix: 'cb',
  albArnSsmParam: config.albArnSsmParam as string,
  albSecurityGroupSsmParam: config.albSecurityGroupSsmParam as string,
  dbSecurityGroupSsmParam: config.dbSecurityGroupSsmParam as string,
  vpcSsmParam: config.vpcSsmParam as string,
  ecsExecRoleSsmParam: config.defaultEcsExecRoleSsmParam as string,
  ecsTaskRoleSsmParam: config.defaultEcsTaskRoleSsmParam as string,
  ecsClusterName: config.ecsClusterName as string,
  domainCertSsmParam: config.domainCertSsmParam as string,
  rootDomainName: config.rootDomainName as string,
  subdomain: (config.adminApi as FargateServiceConfig).subdomain,
  environmentVars: (config.adminApi as FargateServiceConfig).environment,
  dockerPort: (config.adminApi as FargateServiceConfig).dockerPort,
  albPort: (config.adminApi as FargateServiceConfig).albPort,
  serviceName: (config.adminApi as FargateServiceConfig).serviceName,
  dockerImageUrl: (config.adminApi as FargateServiceConfig).dockerImageUrl,
  cpu: (config.adminApi as FargateServiceConfig).cpu,
  memory: (config.adminApi as FargateServiceConfig).memory,
  serviceTasksCount: (config.databaseApi as FargateServiceConfig).taskCount,
  secrets: [
    {
      taskDefSecretName: 'DB_PASSWORD',
      secretsManagerSecretName: config.dbCredentialSecret as string,
      secretsMangerSecretField: 'password',
    },
    {
      taskDefSecretName: 'DB_USERNAME',
      secretsManagerSecretName: config.dbCredentialSecret as string,
      secretsMangerSecretField: 'username',
    },
    {
      taskDefSecretName: 'DB_HOST',
      secretsManagerSecretName: config.dbCredentialSecret as string,
      secretsMangerSecretField: 'host',
    },
    {
      taskDefSecretName: 'DB_NAME',
      secretsManagerSecretName: config.dbCredentialSecret as string,
      secretsMangerSecretField: 'dbname',
    },
    {
      taskDefSecretName: 'DB_PORT',
      secretsManagerSecretName: config.dbCredentialSecret as string,
      secretsMangerSecretField: 'port',
    },
  ],
});
