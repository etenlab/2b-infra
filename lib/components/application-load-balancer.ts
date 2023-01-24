import 'source-map-support/register';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

export interface AppLoadBalancerProps {
  envName: string;
  vpc: ec2.IVpc;
  certArn: string;
  healthCheckPath?: string;
  healthCheckPort?: string;
}

export interface AlbPortMapping {
  listenerPort: number;
  targetGroupPort: number;
}

interface AlbTargetGroupProps {
  serviceName: string;
  vpc: ec2.IVpc;
  port: number;
  healthCheckPath?: string;
  healthCheckPort?: string;
}

interface AlbListenerProps {
  serviceName: string;
  vpc: ec2.IVpc;
  port: number;
  targetGroup: elbv2.ApplicationTargetGroup;
  protocol: elbv2.ApplicationProtocol;
  certArn?: string;
}

export class ApplicationLoadBalancer extends Construct {
  private alb: elbv2.ApplicationLoadBalancer;
  private targetGroups: elbv2.ApplicationTargetGroup[] = [];
  private albSg: ec2.SecurityGroup;
  private listeners: elbv2.ApplicationListener[] = [];

  constructor(scope: Construct, id: string, props: AppLoadBalancerProps) {
    super(scope, id);

    this.albSg = new ec2.SecurityGroup(this, `${props.envName}AlbSg`, {
      vpc: props.vpc,
      description: `${props.envName} ALB security group`,
      securityGroupName: `${props.envName}-alb-sg`,
    });

    // props.albPortMappings.forEach((mapping) => {
    //   this.albSg.addIngressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(mapping.listenerPort));
    // });

    this.alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc: props.vpc,
      internetFacing: true,
      loadBalancerName: `${props.envName}-alb`,
      securityGroup: this.albSg,
      ipAddressType: elbv2.IpAddressType.IPV4,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      idleTimeout: cdk.Duration.seconds(10),
    });

    // props.albPortMappings.forEach((mapping) => {
    //   const targetGroupProps: c8FargateAlbTargetGroupProps = {
    //     port: mapping.targetGroupPort,
    //     serviceName: props.serviceName,
    //     vpc: props.vpc,
    //     healthCheckPath: props.healthCheckPath,
    //     healthCheckPort: props.healthCheckPort,
    //   };

    //   const tg = this.addTargetGroup(targetGroupProps);
    //   this.listeners.push(
    //     this.addListener({
    //       port: mapping.listenerPort,
    //       serviceName: props.serviceName,
    //       vpc: props.vpc,
    //       certArn: props.certArn,
    //       protocol: props.protocol,
    //       targetGroup: tg,
    //     })
    //   );
    //   this.targetGroups.push(tg);
    // });
  }

  //   private addTargetGroup(props: AlbTargetGroupProps): elbv2.ApplicationTargetGroup {
  //     const targetGroup = new elbv2.ApplicationTargetGroup(this, `TargetGroup${props.port}`, {
  //       targetGroupName: `${props.serviceName}-target-group-${props.port}`,
  //       targetType: elbv2.TargetType.IP,
  //       protocol: elbv2.ApplicationProtocol.HTTP,
  //       port: props.port,
  //       vpc: props.vpc,
  //       deregistrationDelay: cdk.Duration.seconds(30),
  //       healthCheck: {
  //         path: props.healthCheckPath ? props.healthCheckPath : '/',
  //         port: props.healthCheckPort ? props.healthCheckPort : 'traffic-port',
  //       },
  //     });

  //     return targetGroup;
  //   }

  //   private addListener(props: FargateAlbListenerProps): elbv2.ApplicationListener {
  //     return this.alb.addListener(`lbListener${props.port}`, {
  //       protocol: props.protocol,
  //       port: props.port,
  //       defaultTargetGroups: [props.targetGroup],
  //       certificates: [elbv2.ListenerCertificate.fromArn(props.certArn)],
  //     });
  //   }
  public getAlb():  elbv2.ApplicationLoadBalancer {
    return this.alb
  }

  public getAlbArn():  string {
    return this.alb.loadBalancerArn
  }
}
