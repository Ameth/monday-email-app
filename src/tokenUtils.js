import db from '../firebaseConfig.js'

import fs from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import dotenv from 'dotenv'

// Definir __dirname para ES6
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Función para construir la ruta del archivo de tokens
const getTokenFilePath = () => {
  //   const normalizedEmail = userEmail.toLowerCase().trim()
  //   return path.resolve(__dirname, './tokens', `${normalizedEmail}.json`)
  return path.resolve(__dirname, './tokens', `user.json`)
}

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
