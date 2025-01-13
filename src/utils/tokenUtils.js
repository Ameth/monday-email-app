import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import dynamoDB from '../databaseConfig.js'

// Leer tokens desde el documento "default"
export const readTokens = async () => {
  const params = {
    TableName: 'tokens',
    Key: { documentId: 'default' },
  }

  try {
    const result = await dynamoDB.send(new GetCommand(params))
    if (!result.Item) {
      throw new Error('No stored tokens found.')
    }
    return result.Item
    } catch (error) {
    console.error('Error reading tokens:', error)
    throw new Error('Error reading tokens.')
  }
}

// Guardar tokens de un usuario
export const saveTokens = async (tokens) => {
  const params = {
    TableName: 'tokens',
    Item: {
      documentId: 'default',
      ...tokens,
    },
  }

  try {
    await dynamoDB.send(new PutCommand(params))
    console.log('Tokens successfully saved in DynamoDB.')
    } catch (error) {
    console.error('Error saving tokens:', error)
    throw new Error('Error saving tokens.')
    }
  }
