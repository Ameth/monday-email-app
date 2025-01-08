import db from '../firebaseConfig.js'

// Leer tokens desde el documento "default"
export const readTokens = async () => {
  try {
    const doc = await db.collection('tokens').doc('default').get() // Lee siempre el documento 'default'
    if (!doc.exists) {
      throw new Error('No se encontraron tokens almacenados.')
    }
    return doc.data()
  } catch (error) {
    console.error(`Error al leer los tokens:`, error)
    throw new Error('Error al leer los tokens.')
  }
}

// Guardar tokens de un usuario
export const saveTokens = async (tokens) => {
  try {
    // console.log('Intentando guardar tokens:', tokens);

    await db.collection('tokens').doc('default').set(tokens) // Guarda siempre bajo el ID 'default'
    console.log('Tokens guardados correctamente en Firestore.')
  } catch (error) {
    console.error(`Error al guardar los tokens:`, error)
    throw new Error('Error al guardar los tokens.')
  }
}
