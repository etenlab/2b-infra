import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { FrontendStack, FrontendStackProps } from '../../lib/stacks/frontend-stack';

import * as Route53Mock from '../mocks/route53-mock';

route53.HostedZone.fromLookup = Route53Mock.fromLookup;

const stackParams = {
  envName: 'qa',
  appPrefix: 'testApp',
  appId: 'testapp',
  domainName: 'app.example.com',
};

describe('FrontendStack', () => {
  const app = new cdk.App();

  const frontendStack = new FrontendStack(
    app,
    'FrontendStack',
    stackParams as FrontendStackProps,
  );

  const template = Template.fromStack(frontendStack);

  test('Creates S3 bucket for website hosting', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      AccessControl: 'Private',
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256',
            },
          },
        ],
      },
      OwnershipControls: {
        Rules: [
          {
            ObjectOwnership: 'BucketOwnerEnforced',
          },
        ],
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });

    template.hasResourceProperties(
      'AWS::S3::BucketPolicy',
      Match.objectLike({
        PolicyDocument: {
          Statement: [
            {
              Action: 's3:GetObject',
              Effect: 'Allow',
              Principal: {
                CanonicalUser: {
                  'Fn::GetAtt': [Match.anyValue(), 'S3CanonicalUserId'],
                },
              },
              Resource: {
                'Fn::Join': [
                  '',
                  [
                    {
                      'Fn::GetAtt': [Match.anyValue(), 'Arn'],
                    },
                    '/*',
                  ],
                ],
              },
            },
          ],
        },
      }),
    );
  });

  test('Creates CloudFront distribution for website', () => {
    template.resourceCountIs(
      'AWS::CloudFront::CloudFrontOriginAccessIdentity',
      1,
    );

    template.resourceCountIs('AWS::IAM::Role', 1);
    template.resourceCountIs('AWS::Lambda::Function', 1);

    template.hasResourceProperties(
      'AWS::CloudFront::ResponseHeadersPolicy',
      Match.objectLike({
        ResponseHeadersPolicyConfig: {
          SecurityHeadersConfig: {
            ContentTypeOptions: {
              Override: true,
            },
            FrameOptions: {
              FrameOption: 'DENY',
              Override: true,
            },
            ReferrerPolicy: {
              Override: true,
              ReferrerPolicy: 'strict-origin-when-cross-origin',
            },
            StrictTransportSecurity: {
              AccessControlMaxAgeSec: 63072000,
              IncludeSubdomains: true,
              Override: true,
              Preload: true,
            },
            XSSProtection: {
              ModeBlock: true,
              Override: true,
              Protection: true,
            },
          },
        },
      }),
    );

    template.hasResourceProperties(
      'AWS::CloudFront::Distribution',
      Match.objectLike({
        DistributionConfig: {
          Aliases: ['app.example.com'],
          CustomErrorResponses: [
            {
              ErrorCachingMinTTL: 10,
              ErrorCode: 404,
              ResponseCode: 200,
              ResponsePagePath: '/index.html',
            },
            {
              ErrorCachingMinTTL: 10,
              ErrorCode: 403,
              ResponseCode: 200,
              ResponsePagePath: '/index.html',
            },
          ],
          DefaultCacheBehavior: {
            AllowedMethods: [
              'GET',
              'HEAD',
              'OPTIONS',
              'PUT',
              'PATCH',
              'POST',
              'DELETE',
            ],
            CachedMethods: ['GET', 'HEAD'],
            Compress: true,
            ViewerProtocolPolicy: 'redirect-to-https',
          },
          DefaultRootObject: 'index.html',
          Enabled: true,
          HttpVersion: 'http2',
          IPV6Enabled: true,
        },
      }),
    );
  });

  test('Creates Route53 record for the website', () => {
    template.hasResourceProperties(
      'AWS::Route53::RecordSet',
      Match.objectLike({
        Name: 'app.example.com.',
        Type: 'A',
      }),
    );
  });
});
