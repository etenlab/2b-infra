#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CommonStack } from '../lib/stacks/common-stack';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { getConfig } from './getConfig';
import { ApiServiceStack } from '../lib/stacks/api-service-stack';
import { FrontendStack } from '../lib/stacks/frontend-stack';

const app = new cdk.App();

const config = getConfig(app);

const commonStack = new CommonStack(app, `${config.environment}CommonStack`, {
  env: {
    account: config.awsAccountId,
    region: config.awsRegion,
  },
  appPrefix: config.appPrefix,
  rootDomainName: config?.rootDomainName,
  domainCertSsmParam: config.domainCertSsmParam,
  cidr: config.vpcCidr,
  envName: config.environment,
  natGatewaysCount: config.natGatewaysCount,
  vpcSsmParam: config.vpcSsmParam,
  albArnSsmParam: config.albArnSsmParam,
  ecsExecRoleSsmParam: config.defaultEcsExecRoleSsmParam,
  ecsTaskRoleSsmParam: config.defaultEcsTaskRoleSsmParam,
  ecsClusterName: config.ecsClusterName,
  albSecurityGroupSsmParam: config.albSecurityGroupSsmParam,
  createEnvHostedZone: config.createEnvHostedZone,
  envDomainName: config.envDomainName,
  rootDomainCertArn: config.rootDomainCertArn,
});

const databaseStack = new DatabaseStack(app, `${config.environment}DatabaseStack`, {
  env: {
    account: config.awsAccountId,
    region: config.awsRegion,
  },
  appPrefix: config.appPrefix,
  envName: config.environment,
  vpcSsmParam: config.vpcSsmParam,
  isPubliclyAccessible: config.dbPublicAccess,
  dbCredentialSecret: config.dbCredentialSecret as string,
  dbSecurityGroupSsmParam: config.dbSecurityGroupSsmParam as string,
});

const showcaseAppStack = new FrontendStack(app, `${config.environment}ShowcaseAppStack`, {
  env: {
    account: config.awsAccountId,
    region: config.awsRegion,
  },
  appPrefix: config.appPrefix,
  envName: config.environment,
  domainName: config.showcaseApp.domainName,
  rootDomainName: config.rootDomainName,
});

const databaseApiStack = new ApiServiceStack(app, `${config.environment}DatabaseApiStack`, {
  env: {
    account: config.awsAccountId,
    region: config.awsRegion,
  },
  envName: config.environment,
  appPrefix: config.appPrefix,
  albArnSsmParam: config.albArnSsmParam as string,
  albSecurityGroupSsmParam: config.albSecurityGroupSsmParam as string,
  dbSecurityGroupSsmParam: config.dbSecurityGroupSsmParam as string,
  vpcSsmParam: config.vpcSsmParam as string,
  ecsExecRoleSsmParam: config.defaultEcsExecRoleSsmParam as string,
  ecsTaskRoleSsmParam: config.defaultEcsTaskRoleSsmParam as string,
  ecsClusterName: config.ecsClusterName as string,
  domainCertSsmParam: config.domainCertSsmParam as string,
  rootDomainName: config.rootDomainName as string,
  subdomain: config.databaseApi.subdomain,
  dockerPort: config.databaseApi.dockerPort,
  albPort: config.databaseApi.albPort,
  serviceName: config.databaseApi.serviceName,
  dockerImageUrl: config.databaseApi.dockerImageUrl,
  cpu: config.databaseApi.cpu,
  memory: config.databaseApi.memory,
  serviceTasksCount: config.databaseApi.taskCount,
  environmentVars: config.databaseApi.environment,
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

const adminApiStack = new ApiServiceStack(app, `${config.environment}AdminApiStack`, {
  env: {
    account: config.awsAccountId,
    region: config.awsRegion,
  },
  envName: config.environment,
  appPrefix: config.appPrefix,
  albArnSsmParam: config.albArnSsmParam as string,
  albSecurityGroupSsmParam: config.albSecurityGroupSsmParam as string,
  dbSecurityGroupSsmParam: config.dbSecurityGroupSsmParam as string,
  vpcSsmParam: config.vpcSsmParam as string,
  ecsExecRoleSsmParam: config.defaultEcsExecRoleSsmParam as string,
  ecsTaskRoleSsmParam: config.defaultEcsTaskRoleSsmParam as string,
  ecsClusterName: config.ecsClusterName as string,
  domainCertSsmParam: config.domainCertSsmParam as string,
  rootDomainName: config.rootDomainName as string,
  subdomain: config.adminApi.subdomain,
  environmentVars: config.adminApi.environment,
  dockerPort: config.adminApi.dockerPort,
  albPort: config.adminApi.albPort,
  serviceName: config.adminApi.serviceName,
  dockerImageUrl: config.adminApi.dockerImageUrl,
  cpu: config.adminApi.cpu,
  memory: config.adminApi.memory,
  serviceTasksCount: config.databaseApi.taskCount,
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
