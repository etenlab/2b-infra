import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CommonStack } from '../../lib/stacks/common-stack';

describe('CommonStack', () => {
    const app = new cdk.App();

    const commonStack = new CommonStack(app, 'CommonStack', {
        cidr: '10.0.0.0/16',
        envName: 'test',
        vpcSsmParam: 'test-vpc-ssm',
        ecsExecRoleSsmParam: 'test-exec-role-ssm',
        ecsTaskRoleSsmParam: 'test-task-role-ssm',
        ecsClusterName: 'test-ecs-cluster',
        albArnSsmParam: 'test-alb-arn-ssm',
        albSecurityGroupSsmParam: 'test-alb-sg-ssm',
        domainCertSsmParam: 'domain-cert-ssm',
        natGatewaysCount: 0,
        appPrefix: 'qa',
        rootDomainName: 'example.com'
    });

    const template = Template.fromStack(commonStack);

    test('Creates all required components', () => {

        template.resourceCountIs('AWS::EC2::VPC', 1);
        template.resourcePropertiesCountIs('AWS::EC2::Subnet', { MapPublicIpOnLaunch: true }, 2);
        template.resourcePropertiesCountIs('AWS::EC2::Subnet', { MapPublicIpOnLaunch: false }, 4);
        template.resourceCountIs('AWS::EC2::RouteTable', 6);
        template.resourceCountIs('AWS::EC2::SubnetRouteTableAssociation', 6);
        template.resourceCountIs('AWS::EC2::Route', 2);
        template.resourceCountIs('AWS::EC2::InternetGateway', 1);
        template.resourceCountIs('AWS::EC2::VPCGatewayAttachment', 1);
        template.resourceCountIs('AWS::SSM::Parameter', 6);
        template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
        template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
        template.resourceCountIs('AWS::ECS::Cluster', 1);
        template.resourceCountIs('AWS::IAM::Role', 2);
        template.resourceCountIs('AWS::IAM::Policy', 2);
        template.resourceCountIs('AWS::Route53::HostedZone', 1);
        template.resourceCountIs('AWS::CertificateManager::Certificate', 1);
    });
});
