import db from './firebaseConfig.js'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import dynamoDB from './databaseConfig.js'

// Función para migrar los tokens
const migrateTokens = async () => {
  try {
    const tokensSnapshot = await db.collection('tokens').doc('default').get()

    if (tokensSnapshot.exists) {
      const tokensData = tokensSnapshot.data()
      const params = {
        TableName: 'tokens',
        Item: {
          documentId: 'default',
          ...tokensData,
        },
      }

      await dynamoDB.send(new PutCommand(params)) // Usando dynamoDB en lugar de client
      console.log('Tokens migrados exitosamente.')
    } else {
      console.log('No se encontraron tokens para migrar.')
    }
  } catch (error) {
    console.error('Error durante la migración de tokens:', error)
  }
}

// Función para migrar los mapeos de columnas
const migrateColumnMappings = async () => {
  try {
    const columnMappingsSnapshot = await db.collection('columnMappings').get()
    const batchPromises = []

    columnMappingsSnapshot.forEach((doc) => {
      const boardId = doc.id.replace('boardId-', '')
      const mappingData = doc.data()

      const params = {
        TableName: 'columnMapping',
        Item: {
          boardId: `boardId-${boardId}`,
          ...mappingData,
        },
      }

      batchPromises.push(dynamoDB.send(new PutCommand(params))) // Usando dynamoDB en lugar de client
    })

    await Promise.all(batchPromises)
    console.log('Mapeos de columnas migrados exitosamente.')
  } catch (error) {
    console.error('Error durante la migración de mapeos de columnas:', error)
  }
}

// Ejecutar la migración
const runMigration = async () => {
  try {
    console.log('Iniciando migración...')
    await migrateTokens()
    await migrateColumnMappings()
    console.log('Migración completa.')
  } catch (error) {
    console.error('Error durante la migración:', error)
  }
}

runMigration()