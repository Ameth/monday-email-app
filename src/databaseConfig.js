import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import dotenv from 'dotenv'

dotenv.config()

const dynamoDB = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

export default dynamoDB
