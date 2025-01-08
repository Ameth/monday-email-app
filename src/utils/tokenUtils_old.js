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

// Leer tokens de un usuario
export const readTokens = () => {
  const filePath = getTokenFilePath()

  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivos de tokens no encontrados.`)
  }

  try {
    const tokens = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return tokens
  } catch (error) {
    console.error(`Error al leer el archivo de tokens.`, error)
    throw new Error(`Error al leer el archivo de tokens.`, error)
  }
}

// Guardar tokens de un usuario
export const saveTokens = (tokens) => {
  const filePath = getTokenFilePath()

  try {
    // Agregar el correo del usuario a los tokens almacenados
    const tokensToSave = {
      ...tokens,
    }

    fs.writeFileSync(filePath, JSON.stringify(tokensToSave, null, 2))
  } catch (error) {
    console.error(`Error al guardar los tokens:`, error)
    throw new Error('Error al guardar los tokens.')
  }
}
