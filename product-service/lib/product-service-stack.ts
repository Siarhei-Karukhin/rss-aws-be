import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';

export class RssAwsDeveloperBeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsTable = new dynamodb.Table(this, 'ProductsTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      tableName: "Products",
    });

    const stocksTable = new dynamodb.Table(this, 'StocksTable', {
      partitionKey: { name: 'product_id', type: dynamodb.AttributeType.STRING },
      tableName: "Stocks",
    });

    const getProductsListLambda = new lambda.Function(this, 'GetProductsListFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'getProductsList.handler',
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stocksTable.tableName,
      }
    });

    productsTable.grantReadWriteData(getProductsListLambda);
    stocksTable.grantReadWriteData(getProductsListLambda);

    const getProductsByIdLambda = new lambda.Function(this, 'GetProductsByIdFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'getProductsById.handler',
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stocksTable.tableName,
      }
    });

    productsTable.grantReadWriteData(getProductsByIdLambda);
    stocksTable.grantReadWriteData(getProductsByIdLambda);

    const createProductLambda = new lambda.Function(this, 'CreateProductLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'createProduct.handler',
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stocksTable.tableName,
      }
    });

    productsTable.grantReadWriteData(createProductLambda);
    stocksTable.grantReadWriteData(createProductLambda);

    const fillTablesLambda = new lambda.Function(this, 'FillTablesLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'fillTables.handler',
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stocksTable.tableName,
      }
    });

    productsTable.grantReadWriteData(fillTablesLambda);
    stocksTable.grantReadWriteData(fillTablesLambda);

    const catalogBatchProcessLambda = new lambda.Function(this, 'CatalogBatchProcessFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'catalogBatchProcess.handler',
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stocksTable.tableName,
      }
    });

    productsTable.grantReadWriteData(catalogBatchProcessLambda);
    stocksTable.grantReadWriteData(catalogBatchProcessLambda);

    const catalogItemsQueue = new sqs.Queue(this, 'CatalogItemsQueue');

    catalogItemsQueue.grantConsumeMessages(catalogBatchProcessLambda);

    catalogBatchProcessLambda.addEventSourceMapping('snsTopicBatchProcessing',{
      eventSourceArn: catalogItemsQueue.queueArn,
      batchSize: 5
    });

    const api = new apigateway.RestApi(this, 'ProductsApi');

    const getProductsListAPI = api.root.addResource('products');
    getProductsListAPI.addMethod('GET', new apigateway.LambdaIntegration(getProductsListLambda));
    getProductsListAPI.addMethod('POST', new apigateway.LambdaIntegration(createProductLambda));

    const getProductsByIdAPI = getProductsListAPI.addResource('{productId}');
    getProductsByIdAPI.addMethod('GET', new apigateway.LambdaIntegration(getProductsByIdLambda));
  }
}