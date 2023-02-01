import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

import { EcsExecutionRole, EcsTaskRole, ApplicationLoadBalancer, ProjectVpc } from '../components';
import { importHostedZone } from '../helpers';

/**
 * Properties required to create shared project infrastructure
 */
export interface CommonStackProps extends cdk.StackProps {
  /** Name of the application assigned to logical id of CloudFormation components */
  readonly appPrefix: string;

  /** Name of the deployed environment */
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
  readonly rootDomainName?: string;

  /** Whether to create a separate hosted zone for deployed environment */
  readonly createEnvHostedZone?: boolean;

  /**
   * Domain name for deployed environment.
   * Required if createEnvHostedZone is "true".
   *  */
  readonly envDomainName?: string

  /**
   * ARN of ACM certificate for the root domain.
   * Required if createEnvHostedZone is "false".
   */
  readonly rootDomainCertArn?: string
}

/**
 * Creates shared project infrastructure including:
 *
 * 1. Application VPC
 * 2. Application Load Balancer
 * 3. ECS cluster and default ECS IAM roles
 * 4. [Optional] Route53 public hosted zone for env domain
 *
 */
export class CommonStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CommonStackProps) {
    super(scope, id, props);

    /** VPC */
    const vpc = new ProjectVpc(this, `${props.appPrefix}AppVpc`, {
      cidr: props.cidr,
      vpcName: `${props.envName}-vpc`,
      natGatewaysCount: props.natGatewaysCount,
    });

    new ssm.StringParameter(this, `${props.appPrefix}VpcIdSSMParam`, {
      stringValue: vpc.getVpcId(),
      description: 'Application VPC Id',
      parameterName: props.vpcSsmParam,
    });

    /** Load balancer */
    const alb = new ApplicationLoadBalancer(this, `${props.appPrefix}Alb`, {
      loadBalancerName: `${props.envName}-alb`,
      vpc: vpc.getVpc()
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

    /**
     * Create Route53 hosted zone for environment, i.e. dev.rootzone.com.
     * Note that rootzone.com must already exist in the deployed environment.
     */
    if (props.createEnvHostedZone) {
      if (!props.envDomainName || !props.rootDomainName) {
        throw new Error('Can not create hosted zone as either envDomainName or rootDomainName is not specified.')

      }
      const rootHostedZone = importHostedZone(this, props.rootDomainName, `${props.appPrefix}RootHz`)

      const envHostedZone = new route53.PublicHostedZone(this, `${props.appPrefix}${props.envName}PublicHz`, {
        zoneName: props.envDomainName,
        comment: `Public hosted zone for ${props.envName} environment`,
      });

      /**
       * Add NS records to the existing root hosted zone
       * to enable DNS validation for env certificate.
      */
      const rootZoneNsRecord = new route53.NsRecord(this, `${props.appPrefix}RootNSRecord`, {
        zone: rootHostedZone,
        recordName: props.envDomainName,
        values: envHostedZone.hostedZoneNameServers || [],
        ttl: cdk.Duration.minutes(30)
      });

      const certificate = new acm.Certificate(this, `${props.appPrefix}${props.envName}Cert`, {
        domainName: props.envDomainName,
        subjectAlternativeNames: [`*.${props.envDomainName}`],
        validation: acm.CertificateValidation.fromDns(envHostedZone),
      });

      new ssm.StringParameter(this, `${props.appPrefix}${props.envName}CertSsmParam`, {
        stringValue: certificate.certificateArn,
        description: `Certificate arn for ${props.envDomainName}`,
        parameterName: props.domainCertSsmParam,
      });
    }

    if (!props.createEnvHostedZone) {
      if (!props.rootDomainCertArn) {
        throw new Error('ACM certificate for root domain is required if subdomain is not created for the deployed environment. ')
      }
      new ssm.StringParameter(this, `${props.appPrefix}${props.envName}CertSsmParam`, {
        stringValue: props.rootDomainCertArn,
        description: `Certificate arn for root hosted zone`,
        parameterName: props.domainCertSsmParam,
      });
    }
  }
}
