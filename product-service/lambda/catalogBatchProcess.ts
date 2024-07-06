import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { v4 as uuidv4 } from 'uuid';

const isValidBody = (body: any) =>
  Boolean(body?.title) &&
  Boolean(body?.description) &&
  !isNaN(body?.price) &&
  !isNaN(body?.count);

const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);

const snsClient = new SNSClient();

export const handler = async (event: any) => {
  console.log('||event: ', event);
  try {
    const records = event.Records;
    console.log('||records: ', records);
    
    for (const record of records) {
      console.log('||record: ', record);
      const body = JSON.parse(record.body);
      console.log('||body: ', body);

      if (!isValidBody(body)) {
        throw new Error('Invalid data in .csv file');
      }

      const id = uuidv4();

      const newProduct = {
        id,
        title: body?.title,
        description: body?.description,
        price: Number(body?.price),
      };

      const newStock = {
        product_id: id,
        count: Number(body?.count),
      };

      await documentClient.send(new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: process.env.PRODUCTS_TABLE,
              Item: newProduct
            }
          },
          {
            Put: {
              TableName: process.env.STOCKS_TABLE,
              Item: newStock
            }
          }
        ]
      }));
    }

    try {
      const snsMessage = 'Batch of products has been successfully saved to the database!';    
      await snsClient.send(new PublishCommand({
        TopicArn: process.env.SNS_TOPIC_ARN,
        Message: snsMessage,
      }));
  
      console.log(snsMessage);
    } catch (error) {
      console.log('Failed to send in SNS', error);
    }
    
    console.log('The data from the .csv file is written to the database');
  } catch (error) {
    console.error('Error while writing data to .csv file', error);
  }

  return null;
};
