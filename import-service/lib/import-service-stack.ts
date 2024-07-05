import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3notification from 'aws-cdk-lib/aws-s3-notifications';
import 'dotenv/config';

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

    const api = new apigateway.RestApi(this, 'ImportServiceAPI');

    const importResource = api.root.addResource('import');
    importResource.addMethod('GET', new apigateway.LambdaIntegration(importProductsFileLambda));

    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3notification.LambdaDestination(importFileParserLambda),
      { prefix: 'uploaded/' }
    );
  }
}
