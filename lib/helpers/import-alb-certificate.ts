import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

export const importAlbCertificate = (
  scope: Construct,
  certSsmParam: string,
): elbv2.ListenerCertificate => {
  const domainCertArn = ssm.StringParameter.valueForStringParameter(
    scope,
    certSsmParam,
  );

  return elbv2.ListenerCertificate.fromArn(domainCertArn);
};
