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
      throw new Error('No se encontraron tokens almacenados.')
    }
    return result.Item
  } catch (error) {
    console.error('Error al leer los tokens:', error)
    throw new Error('Error al leer los tokens.')
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
    console.log('Tokens guardados correctamente en DynamoDB.')
  } catch (error) {
    console.error('Error al guardar los tokens:', error)
    throw new Error('Error al guardar los tokens.')
  }
}
