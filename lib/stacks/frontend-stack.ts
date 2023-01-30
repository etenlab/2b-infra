import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';

import { importHostedZone } from '../helpers'

/** Properties required to create infrastructure for frontend app */
export interface FrontendStackProps extends cdk.StackProps {
  /** Name of the application assigned to logical id of CloudFormation components */
  readonly appPrefix: string;

  /** Name of the deployed environmend */
  readonly envName: string;

  /**
   * Domain name to used to access app.
   * Must be a subdomain of the specified root domain.
   */
  readonly domainName: string;

  /** Registered root domain name */
  readonly rootDomainName: string
}

/**
 * Create frontend infrastructure including:
 *
 * 1. S3 bucket to store application code
 * 2. CloudFront user which can exclusively access bucket content
 * 3. CloudFront distribution to serve application code
 * 4. Route53 record and ACM certificate for application subdomain
 *
 */
export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    /** Private S3 bucket with frontend source code */
    const assetsBucket = new s3.Bucket(this, `${props.appPrefix}WebsiteBucket`, {
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      accessControl: s3.BucketAccessControl.PRIVATE,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    /** Restricts bucket access to CloudFront user only */
    const cloudfrontOriginAccessIdentity = new cloudfront.OriginAccessIdentity(this, `${props.appPrefix}CloudFrontOAI`);
    assetsBucket.addToResourcePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [assetsBucket.arnForObjects('*')],
      principals: [new iam.CanonicalUserPrincipal(cloudfrontOriginAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId)],
    }));

    /** Requests ACM certificate for Cloudfront distribution */
    const rootHostedZone = importHostedZone(this, props.rootDomainName, `${props.appPrefix}RootHz`)
    const certificate = new acm.DnsValidatedCertificate(this, `${props.appPrefix}WebsiteCertificate`,
      {
        domainName: props.domainName,
        hostedZone: rootHostedZone,
        region: 'us-east-1',
      });

    /** Configures security headers for Cloudfront responses */
    const responseHeaderPolicy = new cloudfront.ResponseHeadersPolicy(this, `${props.appPrefix}ResponseHeaderPolicy`, {
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

    /** Creates Cloudfront distribution */
    const cloudfrontDistribution = new cloudfront.Distribution(this, `${props.appPrefix}CloudFrontDistribution`, {
      certificate,
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

    /** Creates Route53 record for Cloudfront distribution */
    new route53.ARecord(this, `${props.appPrefix}CloudfrontARecord`, {
      recordName: props.domainName,
      target: route53.RecordTarget.fromAlias(new route53targets.CloudFrontTarget(cloudfrontDistribution)),
      zone: rootHostedZone
    });
  }
}
