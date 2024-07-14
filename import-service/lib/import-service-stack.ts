import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3notification from 'aws-cdk-lib/aws-s3-notifications';
import 'dotenv/config';

const responseHeaders = {
  "Access-Control-Allow-Origin": "'*'",
  "Access-Control-Allow-Headers": 
  "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
  "Access-Control-Allow-Methods": "'OPTIONS,GET,PUT'"
}

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'ImportServiceStackBucket', {
      cors: [
        {
          maxAge: 60 * 60,
          allowedOrigins: ['*'],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.DELETE],
          allowedHeaders: ['*'],
        },
      ],
    });

    const basicAuthorizerLambda = lambda.Function.fromFunctionArn(
      this,
      'BasicAuthorizerFunction',
      process.env.BASIC_AUTHORIZER_ARN!,
    );

    const authRole = new iam.Role(this, 'authorizer-role', {
      roleName: 'authorizer-role',
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      inlinePolicies: {
        allowLambdaInvocation: iam.PolicyDocument.fromJson({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['lambda:InvokeFunction', 'lambda:InvokeAsync'],
              Resource: process.env.BASIC_AUTHORIZER_ARN!,
            },
          ],
        }),
      },
    });

    const authorizer = new apigateway.TokenAuthorizer(this, 'basicAuthorizer', {
      handler: basicAuthorizerLambda,
      resultsCacheTtl: cdk.Duration.seconds(0),
      assumeRole: authRole,
    });

    const importProductsFileLambda = new lambda.Function(this, 'ImportProductsFileFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: new lambda.AssetCode('lambda'),
      handler: 'importProductsFile.handler',
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
    });

    const importFileParserLambda = new lambda.Function(this, 'ImportFileParserFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: new lambda.AssetCode('lambda'),
      handler: 'importFileParser.handler',
      environment: {
        BUCKET_NAME: bucket.bucketName,
        SQS_QUEUE_URL: process.env.SQS_QUEUE_URL!,
      },
    });

    const importProductsFilePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:PutObject'],
      resources: [`${bucket.bucketArn}/*`],
    });
    importProductsFileLambda.addToRolePolicy(importProductsFilePolicy);

    const importFileParserPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 'sqs:SendMessage'],
      resources: [`${bucket.bucketArn}/*`, process.env.SQS_QUEUE_ARN!],
    });
    importFileParserLambda.addToRolePolicy(importFileParserPolicy);

    const api = new apigateway.RestApi(this, 'ImportServiceAPI', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
        allowCredentials: true,
      },
      cloudWatchRole: true,
    });

    api.addGatewayResponse('GatewayResponseUnauthorized', {
      type: cdk.aws_apigateway.ResponseType.UNAUTHORIZED,
      responseHeaders,
      statusCode: '401',
    });

    api.addGatewayResponse('GatewayResponseAccessDenied', {
      type: cdk.aws_apigateway.ResponseType.ACCESS_DENIED,
      responseHeaders,
      statusCode: '403',
    });

    const importResource = api.root.addResource('import');
    importResource.addMethod('GET', new apigateway.LambdaIntegration(importProductsFileLambda), {
      authorizer,
      requestParameters: {
        'method.request.header.Authorization': true,
      },
    });

    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3notification.LambdaDestination(importFileParserLambda),
      { prefix: 'uploaded/' }
    );
  }
}
