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
  albListenerSsmParam: config.albListenerSsmParam,
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
  dbCredentialSecret: config.dbCredentialSecret,
  dbSecurityGroupSsmParam: config.dbSecurityGroupSsmParam,
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
      albArnSsmParam: config.albArnSsmParam,
      albSecurityGroupSsmParam: config.albSecurityGroupSsmParam,
      albListenerSsmParam: config.albListenerSsmParam,
      dbSecurityGroupSsmParam: config.dbSecurityGroupSsmParam,
      vpcSsmParam: config.vpcSsmParam,
      ecsExecRoleSsmParam: config.defaultEcsExecRoleSsmParam,
      ecsTaskRoleSsmParam: config.defaultEcsTaskRoleSsmParam,
      ecsClusterName: config.ecsClusterName,
      domainCertSsmParam: config.domainCertSsmParam,
      rootDomainName: config.rootDomainName,
      subdomain: service.subdomain,
      dockerPort: service.dockerPort,
      dockerLabels: service.dockerLabels,
      command: service.command,
      albPort: service.albPort,
      routingPriority: service.priority,
      serviceName: service.serviceName,
      dockerImageUrl: service.dockerImageUrl,
      cpu: service.cpu || 512,
      memory: service.memory || 1024,
      serviceTasksCount: service.taskCount || 1,
      healthCheckPath: service.healthCheckPath || '/',
      environmentVars: service.environment,
      secrets: Object.entries(service.secrets || {}).map(([key, value]) => {
        return {
          taskDefSecretName: key,
          secretsManagerSecretName: config.dbCredentialSecret,
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
