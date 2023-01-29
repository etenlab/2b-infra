import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';

export interface FrontendStackProps extends cdk.StackProps {
  readonly envName: string;
  readonly domainName: string;
  readonly rootDomainName: string;
}

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const assetsBucket = new s3.Bucket(this, 'WebsiteBucket', {
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      accessControl: s3.BucketAccessControl.PRIVATE,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    const cloudfrontOriginAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'CloudFrontOAI');

    assetsBucket.addToResourcePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [assetsBucket.arnForObjects('*')],
      principals: [new iam.CanonicalUserPrincipal(cloudfrontOriginAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId)],
    }));

    const rootHostedZone = route53.HostedZone.fromLookup(this, 'RootHostedZone', {
      domainName: props.rootDomainName
    });

    const certificate = new acm.DnsValidatedCertificate(this, 'WebsiteCertificate',
      {
        domainName: props.domainName,
        hostedZone: rootHostedZone,
        region: 'us-east-1',
      });

    const responseHeaderPolicy = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeadersResponseHeaderPolicy', {
      comment: 'Security headers response header policy',
      securityHeadersBehavior: {
        strictTransportSecurity: {
          override: true,
          accessControlMaxAge: cdk.Duration.days(2 * 365),
          includeSubdomains: true,
          preload: true
        },
        contentTypeOptions: {
          override: true
        },
        referrerPolicy: {
          override: true,
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN
        },
        xssProtection: {
          override: true,
          protection: true,
          modeBlock: true
        },
        frameOptions: {
          override: true,
          frameOption: cloudfront.HeadersFrameOption.DENY
        }
      }
    });

    const cloudfrontDistribution = new cloudfront.Distribution(this, 'CloudFrontDistribution', {
      certificate: certificate,
      domainNames: [props.domainName],
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new origins.S3Origin(assetsBucket, {
          originAccessIdentity: cloudfrontOriginAccessIdentity
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: responseHeaderPolicy,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        compress: true,
      },
      errorResponses: [{
        httpStatus: 404,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
        ttl: cdk.Duration.seconds(10),
      }]
    });

    new route53.ARecord(this, 'CloudfrontARecord', {
      recordName: props.domainName,
      target: route53.RecordTarget.fromAlias(new route53targets.CloudFrontTarget(cloudfrontDistribution)),
      zone: rootHostedZone
    });
  }
}
