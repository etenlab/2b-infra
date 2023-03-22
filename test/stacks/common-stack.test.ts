import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { CommonStack } from '../../lib/stacks/common-stack';

import * as Route53Mock from '../mocks/route53-mock';

route53.HostedZone.fromLookup = Route53Mock.fromLookup;

const stackParams = {
  cidr: '10.0.0.0/16',
  envName: 'test',
  vpcSsmParam: 'test-vpc-ssm',
  ecsExecRoleSsmParam: 'test-exec-role-ssm',
  ecsTaskRoleSsmParam: 'test-task-role-ssm',
  ecsClusterName: 'test-ecs-cluster',
  albArnSsmParam: 'test-alb-arn-ssm',
  albSecurityGroupSsmParam: 'test-alb-sg-ssm',
  albListenerSsmParam: 'alb-listener-ssm',
  domainCertSsmParam: 'domain-cert-ssm',
  natGatewaysCount: 0,
  appPrefix: 'qa',
  createEnvHostedZone: false,
  rootDomainCertArn: 'arn:aws:acm:us-east-2:111111111:certificate/000000000',
};

describe('CommonStack', () => {
  test('Creates all required components of common infrastructure', () => {
    const app = new cdk.App();

    const commonStack = new CommonStack(app, 'CommonStack', stackParams);

    const template = Template.fromStack(commonStack);

    template.resourceCountIs('AWS::EC2::VPC', 1);
    template.resourcePropertiesCountIs(
      'AWS::EC2::Subnet',
      { MapPublicIpOnLaunch: true },
      2,
    );
    template.resourcePropertiesCountIs(
      'AWS::EC2::Subnet',
      { MapPublicIpOnLaunch: false },
      4,
    );
    template.resourceCountIs('AWS::EC2::RouteTable', 6);
    template.resourceCountIs('AWS::EC2::SubnetRouteTableAssociation', 6);
    template.resourceCountIs('AWS::EC2::Route', 2);
    template.resourceCountIs('AWS::EC2::InternetGateway', 1);
    template.resourceCountIs('AWS::EC2::VPCGatewayAttachment', 1);
    template.resourceCountIs('AWS::SSM::Parameter', 7);
    template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::Listener', 1);
    template.resourceCountIs('AWS::ECS::Cluster', 1);
    template.resourceCountIs('AWS::IAM::Role', 2);
    template.resourceCountIs('AWS::IAM::Policy', 2);
  });

  test('Creates new hosted zone for environment if specified', () => {
    const params = {
      ...stackParams,
      envDomainName: 'test.example.com',
      createEnvHostedZone: true,
    };

    const app = new cdk.App();

    const commonStack = new CommonStack(app, 'CommonStack', params);

    const template = Template.fromStack(commonStack);

    template.hasResourceProperties(
      'AWS::Route53::HostedZone',
      Match.objectLike({
        Name: 'test.example.com.',
      }),
    );

    template.hasResourceProperties(
      'AWS::Route53::RecordSet',
      Match.objectLike({
        Name: 'test.example.com.',
        Type: 'NS',
        TTL: '1800',
      }),
    );

    template.hasResourceProperties(
      'AWS::CertificateManager::Certificate',
      Match.objectLike({
        DomainName: 'test.example.com',
        SubjectAlternativeNames: ['*.test.example.com'],
        ValidationMethod: 'DNS',
      }),
    );
  });
});
