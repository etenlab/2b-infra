import 'source-map-support/register';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

export interface AppLoadBalancerProps {
  envName: string;
  vpc: ec2.IVpc;
  certArn: string;
  healthCheckPath?: string;
  healthCheckPort?: string;
}

export class ApplicationLoadBalancer extends Construct {
  private alb: elbv2.ApplicationLoadBalancer;
  private albSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: AppLoadBalancerProps) {
    super(scope, id);

    this.albSecurityGroup = new ec2.SecurityGroup(this, `${props.envName}AlbSg`, {
      vpc: props.vpc,
      description: `${props.envName} ALB security group`,
      securityGroupName: `${props.envName}-alb-sg`,
    });

    this.alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc: props.vpc,
      internetFacing: true,
      loadBalancerName: `${props.envName}-alb`,
      securityGroup: this.albSecurityGroup,
      ipAddressType: elbv2.IpAddressType.IPV4,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      idleTimeout: cdk.Duration.seconds(10),
    });
  }

  public getAlb():  elbv2.ApplicationLoadBalancer {
    return this.alb
  }

  public getAlbArn():  string {
    return this.alb.loadBalancerArn
  }

  public getAlbSecurityGroupId():  string {
    return this.albSecurityGroup.securityGroupId
  }
}
