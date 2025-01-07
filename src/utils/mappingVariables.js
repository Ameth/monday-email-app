import fs from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

import columnMapping from '../config/columnMapping.js'
import { getColumnsList } from '../getData.js'

// Definir __dirname para ES6
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const columnMappingFilePath = () => {
  //   const normalizedEmail = userEmail.toLowerCase().trim()
  //   return path.resolve(__dirname, './tokens', `${normalizedEmail}.json`)
  return path.resolve(__dirname, '../config', `columnMapping.js`)
}

export async function getVariables({ boardId }) {
  try {
    const dataColumns = await getColumnsList({ boardId }) // Obtiene las columnas actuales de Monday

    let boardMapping = columnMapping.boards[boardId]
    if (!boardMapping) {
      // Si el mapping no existe, crear uno vacío
      boardMapping = {
        emails: { to: '', cc: '', bcc: '' },
        subject: '',
        bodyTemplate: '',
        variables: {},
      }
    }

    // console.log('columnas:', dataColumns)

    // Transformamos el objeto de variables en un array de objetos con los datos necesarios y verificamos los títulos
    const formattedVariables = Object.entries(boardMapping.variables || {}).map(
      ([key, { id, title }]) => {
        const mondayColumn = dataColumns.columns?.find((col) => col.id === id)
        return {
          variableName: key,
          columnId: id,
          columnTitle: mondayColumn
            ? mondayColumn.title
            : `Title not found (original: ${title})`,
        }
      }
    )

    return {
      boardId,
      emails: boardMapping.emails,
      subject: boardMapping.subject,
      bodyTemplate: boardMapping.bodyTemplate,
      variables: formattedVariables,
    }
  } catch (error) {
    console.error('Error al obtener las variables:', error)
    throw new Error(
      `No se pudieron obtener los datos de mapeo de columnas. ${error.message}`
    )
  }
}

export async function updateVariables({ boardId, mappingData }) {
  try {
    const updatedMapping = {
      ...columnMapping,
      boards: {
        ...columnMapping.boards,
        [boardId]: {
          emails: mappingData.emails,
          subject: mappingData.subject,
          bodyTemplate: mappingData.bodyTemplate,
          variables: mappingData.variables,
        },
      },
    }

    const fileContent = `const columnMapping = ${JSON.stringify(
      updatedMapping,
      null,
      2
    )};
    export default columnMapping;`

    const filePath = columnMappingFilePath()

    fs.writeFileSync(filePath, fileContent, 'utf8')
    console.log('Archivo columnMapping actualizado con éxito.')
    return { message: 'Mapping updated successfully' }
  } catch (error) {
    console.error('Error al actualizar el mappingColumns:', error)
    throw new Error(`Error al actualizar el mappingColumns: ${error.message}`)
  }
}
