import db from '../firebaseConfig.js'

// Guardar datos al Firestore
export const saveColumnMapping = async ({ boardId, mappingData }) => {
  try {
    const formattedData = {
      emails: {
        to: mappingData.emails?.to || '',
        cc: mappingData.emails?.cc || '',
        bcc: mappingData.emails?.bcc || '',
      },
      subject: mappingData.subject || '',
      bodyTemplate: mappingData.bodyTemplate || '',
      attachments: mappingData.attachments || '',
      variables: mappingData.variables || [], // Ahora es un array
    }

    await db
      .collection('columnMappings')
      .doc(`boardId-${boardId}`)
      .set(formattedData)
    // console.log('Mapping guardado correctamente.')
    return { message: 'Mapping saved successfully' }
  } catch (error) {
    console.error('Error al guardar el mapping:', error)
    throw new Error('Error al guardar el mapping.')
  }
}

// Leer un mapping desde Firestore
export const getColumnMapping = async ({ boardId }) => {
  try {
    const doc = await db
      .collection('columnMappings')
      .doc(`boardId-${boardId}`)
      .get()

    if (!doc.exists) {
      // Si el documento no existe, crea uno vacío
      const defaultMapping = {
        emails: { to: '', cc: '', bcc: '' },
        subject: '',
        bodyTemplate: '',
        attachments: '',
        variables: [], // Ahora es un array vacío
      }
      await db
        .collection('columnMappings')
        .doc(`boardId-${boardId}`)
        .set(defaultMapping)
      return {
        boardId,
        emails: defaultMapping.emails,
        subject: defaultMapping.subject,
        bodyTemplate: defaultMapping.bodyTemplate,
        attachments: defaultMapping.attachments,
        variables: defaultMapping.variables,
      }
    }

    const data = doc.data()

    return {
      boardId,
      emails: data.emails,
      subject: data.subject,
      bodyTemplate: data.bodyTemplate,
      attachments: data.attachments,
      variables: data.variables || [], // Retornar como array
    }
  } catch (error) {
    console.error('Error al leer el mapping:', error)
    throw new Error('Error al leer el mapping.')
  }
}
