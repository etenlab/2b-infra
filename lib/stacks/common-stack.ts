import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

import { ApplicationLoadBalancer } from '../components/application-load-balancer';
import { VPC } from '../components/vpc';
import { EcsExecutionRole } from '../components/ecs-execution-role';
import { EcsTaskRole } from '../components/ecs-task-role';

/**
 * Properties required to create shared project infrastructure
 */
export interface CommonStackProps extends cdk.StackProps {
  /** Name of the application assigned to logical id of CloudFormation components */
  readonly appPrefix: string;

  /** Name of the deployed environmend */
  readonly envName: string;

  /** VPC CIDR block */
  readonly cidr: string;

  /** SSM param name to store VPC id */
  readonly vpcSsmParam: string;

  /** SSM param name to store ECS execution role ARN */
  readonly ecsExecRoleSsmParam: string;

  /** SSM param name to store ECS task role ARN */
  readonly ecsTaskRoleSsmParam: string;

  /** SSM param name to store ACM certificate ARN */
  readonly domainCertSsmParam: string;

  /** Name of the ECS cluster to create */
  readonly ecsClusterName: string;

  /** SSM param name to store ALB ARN */
  readonly albArnSsmParam: string;

  /** SSM param name to store ALB security group id */
  readonly albSecurityGroupSsmParam: string;

  /** Number of nat gateways to create */
  readonly natGatewaysCount: number;

  /** Registered root domain name */
  readonly rootDomainName: string
}

/**
 * Creates shared project infrastructure including:
 *
 * 1. Application VPC
 * 2. Application Load Balancer
 * 3. ECS cluster and default ECS IAM roles
 * 4. Route53 public hosted zone for root domain
 *
 */
export class CommonStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CommonStackProps) {
    super(scope, id, props);

    /** VPC */
    const vpc = new VPC(this, `${props.appPrefix}AppVpc`, {
      cidr: props.cidr,
      envName: props.envName,
      natGatewaysCount: props.natGatewaysCount,
    });

    new ssm.StringParameter(this, `${props.appPrefix}VpcIdSSMParam`, {
      stringValue: vpc.getVpcId(),
      description: 'Application VPC Id',
      parameterName: props.vpcSsmParam,
    });

    /** Load balancer */
    const alb = new ApplicationLoadBalancer(this, `${props.appPrefix}Alb`, {
      envName: props.envName,
      vpc: vpc.getVpc(),
      certArn: 'string',
      healthCheckPath: '/healthcheck',
      healthCheckPort: '8080',
    });

    new ssm.StringParameter(this, `${props.appPrefix}AlbSsmParam`, {
      stringValue: alb.getAlbArn(),
      description: 'Application load balancer ARN',
      parameterName: props.albArnSsmParam,
    });

    new ssm.StringParameter(this, `${props.appPrefix}AlbSgIdSsmParam`, {
      stringValue: alb.getAlbSecurityGroupId(),
      description: 'Application load balancer security group id',
      parameterName: props.albSecurityGroupSsmParam,
    });

    /** ECS cluster */
    const cluster = new ecs.Cluster(this, `${props.appPrefix}Cluster`, {
      vpc: vpc.getVpc(),
      clusterName: props.ecsClusterName,
      containerInsights: true,
    });

    /** ECS execution role */
    const defaultExecutionRole = new EcsExecutionRole(this, `${props.appPrefix}EcsExecutionRole`, { envName: props.envName });

    new ssm.StringParameter(this, `${props.appPrefix}EcsExecRoleSsmParam`, {
      stringValue: defaultExecutionRole.getRoleArn(),
      description: 'Default ECS execution role',
      parameterName: props.ecsExecRoleSsmParam,
    });

    /** ECS task role */
    const defaultTaskRole = new EcsTaskRole(this, `${props.appPrefix}EcsTaskRole`, { envName: props.envName });

    new ssm.StringParameter(this, `${props.appPrefix}EcsTaskRoleSsmParam`, {
      stringValue: defaultTaskRole.getRoleArn(),
      description: 'Default ECS task role',
      parameterName: props.ecsTaskRoleSsmParam,
    });

    /** Route53 hosted zone */
    const rootHostedZone = new route53.PublicHostedZone(this, `${props.appPrefix}PublicHz`, {
      zoneName: props.rootDomainName,
      comment: 'Public root hosted zone',
    });

    const certificate = new acm.Certificate(this, `${props.appPrefix}RootCert`, {
      domainName: props.rootDomainName,
      subjectAlternativeNames: [`*.${props.rootDomainName}`],
      validation: acm.CertificateValidation.fromDns(rootHostedZone),
    });

    new ssm.StringParameter(this, `${props.appPrefix}CertSsmParam`, {
      stringValue: certificate.certificateArn,
      description: `Certificate arn for ${props.rootDomainName}`,
      parameterName: props.domainCertSsmParam,
    });
  }
}
