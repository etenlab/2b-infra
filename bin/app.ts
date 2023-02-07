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

new CommonStack(app, `${config.environment}CommonStack`, {
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

new DatabaseStack(app, `${config.environment}DatabaseStack`, {
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

Object.entries(config.fargateApiServices).forEach(
  ([name, service]) =>
    new ApiServiceStack(app, `${config.environment}${name}`, {
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
      subdomain: service.subdomain,
      dockerPort: service.dockerPort,
      albPort: service.albPort,
      serviceName: service.serviceName,
      dockerImageUrl: service.dockerImageUrl,
      cpu: service.cpu || 512,
      memory: service.memory || 1024,
      serviceTasksCount: service.taskCount || 1,
      environmentVars: service.environment,
      secrets: Object.entries(service.secrets || {}).map(([key, value]) => {
        return {
          taskDefSecretName: key,
          secretsManagerSecretName: config.dbCredentialSecret as string,
          secretsMangerSecretField: value,
        };
      }),
    }),
);

Object.entries(config.frontendServices).forEach(
  ([name, service]) =>
    new FrontendStack(app, `${config.environment}${name}`, {
      env: {
        account: config.awsAccountId,
        region: config.awsRegion,
      },
      appPrefix: config.appPrefix,
      envName: config.environment,
      domainName: service.domainName,
      rootDomainName: config.rootDomainName,
    }),
);
