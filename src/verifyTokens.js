import db from '../firebaseConfig.js'

const verifyTokens = async () => {
  try {
    const doc = await db.collection('tokens').doc('default').get()
    if (!doc.exists) {
      console.log('No se encontraron tokens almacenados.')
    } else {
      console.log('Tokens encontrados:', doc.data())
    }
  } catch (error) {
    console.error('Error al verificar los tokens:', error)
  }
}

verifyTokens()
