import * as cdk from 'aws-cdk-lib';
import autoscaling = require('aws-cdk-lib/aws-autoscaling');
import ec2 = require('aws-cdk-lib/aws-ec2');
import elbv2 = require('aws-cdk-lib/aws-elasticloadbalancingv2');
import { Construct } from 'constructs';

export class Vpc1Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'vpc-1')

    const alb = new elbv2.ApplicationLoadBalancer(this, 'alb-1', {
      vpc,
      internetFacing: true,
    })


  }
}

const app = new cdk.App()
new Vpc1Stack(app, 'vpc-1-stack')
app.synth()