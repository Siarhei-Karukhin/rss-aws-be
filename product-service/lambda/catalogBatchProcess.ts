import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import { isValidBody } from './createProduct';

const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: any) => {
  try {
    const records = event.Records;
    
    for (const record of records) {
      const body = JSON.parse(record.body);

      if (!isValidBody(body)) {
        throw new Error('Invalid data in .csv file');
      }

      const id = uuidv4();

      const newProduct = {
        id,
        title: body?.title,
        description: body?.description,
        price: body?.price,
      };

      const newStock = {
        product_id: id,
        count: body?.count,
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

    console.log('The data from the .csv file is written to the database');
  } catch (error) {
    console.error('Error while writing data to .csv file', error);
  }

  return null;
};
