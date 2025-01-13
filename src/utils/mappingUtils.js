import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import dynamoDB from '../databaseConfig.js'

// Guardar datos al Firestore
export const saveColumnMapping = async ({ boardId, mappingData }) => {
  const params = {
    TableName: 'columnMapping',
    Item: {
      boardId: `boardId-${boardId}`,
      emails: {
        to: mappingData.emails?.to || '',
        cc: mappingData.emails?.cc || '',
        bcc: mappingData.emails?.bcc || '',
      },
      subject: mappingData.subject || '',
      bodyTemplate: mappingData.bodyTemplate || '',
      attachments: mappingData.attachments || '',
      variables: mappingData.variables || [], // Ahora es un array
    },
  }

  try {
    await dynamoDB.send(new PutCommand(params))
    console.log('Mapping saved successfully in DynamoDB.')
  } catch (error) {
    console.error('Error saving the mapping:', error)
    throw new Error('Error saving the mapping.')
  }
}

// Leer un mapping desde Firestore
export const getColumnMapping = async ({ boardId }) => {
  const params = {
    TableName: 'columnMapping',
    Key: { boardId: `boardId-${boardId}` },
  }

  try {
    const result = await dynamoDB.send(new GetCommand(params))
    if (!result.Item) {
      return {
        boardId,
        emails: { to: '', cc: '', bcc: '' },
        subject: '',
        bodyTemplate: '',
        attachments: '',
        variables: [],
      }
    }
    return result.Item
    } catch (error) {
    console.error('Error reading the mapping:', error)
    throw new Error('Error reading the mapping.')
    }
  }
