import columnMapping from '../config/columnMapping.js'
import { getColumnsList } from '../getData.js'

export async function getVariables() {
  const variablesMapping = columnMapping.variables
  const dataColumns = await getColumnsList({ pulseId: 7534845375 }) // Obtiene las columnas actuales de Monday

  // console.log('columnas:', dataColumns.items[0])

  // Transformamos el objeto de variables en un array de objetos con los datos necesarios y verificamos los títulos
  const formattedVariables = Object.entries(variablesMapping).map(
    ([key, { id, title }]) => {
      if (key === 'name') {
        return {
          variableName: key,
          columnId: id,
          columnTitle: title,
        }
      }
      const mondayColumn = dataColumns.items[0]?.column_values.find(
        (col) => col.id === id
      )
      //   console.log('mondayColumn:', mondayColumn)
      return {
        variableName: key,
        columnId: id,
        columnTitle: mondayColumn
          ? mondayColumn.column.title
          : `Title not found (original: ${title})`,
      }
    }
  )

  const mappingData = {
    emails: columnMapping.emails,
    subject: columnMapping.subject,
    bodyTemplate: columnMapping.bodyTemplate,
    variables: formattedVariables,
  }

  return mappingData
}
