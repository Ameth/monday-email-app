import {
  GetCommand,
  PutCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb'
import dynamoDB from '../databaseConfig.js'

// Obtener todos los tokens
export const getAllTokens = async () => {
  const params = {
    TableName: 'tokens',
  }

  try {
    const result = await dynamoDB.send(new ScanCommand(params))
    return result.Items || [] // Retorna los elementos encontrados o un array vacío
  } catch (error) {
    console.error('Error retrieving all tokens:', error)
    throw new Error(`Failed to retrieve all tokens: ${error}`)
  }
}

// Leer tokens desde el documento "default"
export const readTokens = async ({ boardId }) => {
  const params = {
    TableName: 'tokens',
    Key: { boardId: `boardId-${boardId}` },
  }

  try {
    const result = await dynamoDB.send(new GetCommand(params))
    if (!result.Item) {
      console.log('No stored tokens found.')
      return null // Retorna null si no hay tokens almacenados
    }
    return result.Item
  } catch (error) {
    console.error('Failed to read tokens from database:', error)
    throw new Error(`Failed to read tokens from database: ${error}`)
  }
}

// Guardar tokens de un usuario
export const saveTokens = async ({ boardId, tokens }) => {
  const params = {
    TableName: 'tokens',
    Item: {
      boardId: `boardId-${boardId}`,
      // documentId: 'default',
      ...tokens,
    },
  }

  try {
    await dynamoDB.send(new PutCommand(params))
    console.log('Tokens successfully saved in DynamoDB.')
  } catch (error) {
    console.error('Error saving tokens:', error)
    throw new Error(`Error saving tokens: ${error}`)
  }
}

// Eliminar tokens del usuario
export const deleteTokens = async ({ boardId }) => {
  const params = {
    TableName: 'tokens',
    Key: { boardId: `boardId-${boardId}` },
  }

  try {
    await dynamoDB.send(new DeleteCommand(params))
    console.log('Tokens successfully deleted from DynamoDB.')
  } catch (error) {
    console.error('Error deleting tokens:', error)
    throw new Error(`Error deleting tokens: ${error}`)
  }
}
