import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const TOKEN = process.env.TOKEN_MONDAY

const replaceVariables = ({ variableMapping, columnValues, item }) => {
  const variables = variableMapping.reduce(
    (acc, { variableName, columnId }) => {
      if (columnId === 'name') {
        acc[variableName] = item.name || `{${variableName}}` // Usamos el nombre del item si es 'name'
      } else {
        const columnValue = columnValues[columnId]

        if (columnValue) {
          if (columnValue.files && columnValue.files.length > 0) {
            acc[variableName] = columnValue.files
              .map((file) => file.name)
              .join(', ') // Si es archivo
          } else if (columnValue.text) {
            acc[variableName] = columnValue.text // Si es texto
          } else if (columnValue.date) {
            acc[variableName] = columnValue.date // Si es fecha
          } else {
            acc[variableName] = columnValue || `{${variableName}}`
          }
        } else {
          acc[variableName] = `{${variableName}}`
        }
      }
      return acc
    },
    {}
  )

  return variables // Retornar variables con los valores
}

const unescapeHTML = (text) => {
  if (!text) return ''
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n/g, '<br>')
}

export async function getEmails({ pulseId, emailsMapping }) {
  try {
    const emailColumns = Object.values(emailsMapping)
    const query = `
      {
        items(ids: ${pulseId}) {
          column_values(ids:[${emailColumns
            .map((id) => `"${id}"`)
            .join(',')}]) {
             ... on MirrorValue {
                display_value
                id
                type
              }
              text
              value
              type
              id
          }
        }
      }
    `
    // console.log(query)
    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
        'API-Version': '2025-01',
      },
      body: JSON.stringify({ query }),
    })

    const res = await response.json()

    if (!res.data || !res.data.items || res.data.items.length === 0) {
      throw new Error('No se encontraron datos para el Pulse ID proporcionado.')
    }

    const columnValues = res.data.items[0].column_values

    function extractEmail(columnId) {
      const column = columnValues.find((col) => col.id === columnId)
      if (!column) return ''

      if (column.type === 'mirror') {
        return column.display_value || ''
      }

      if (column.type === 'email') {
        return column.text || ''
      }

      return ''
    }

    return {
      toEmails: extractEmail(emailsMapping.to),
      ccEmails: extractEmail(emailsMapping.cc),
      bccEmails: extractEmail(emailsMapping.bcc),
    }
  } catch (error) {
    console.error('Error al obtener los correos:', error)
    throw error
  }
}

export async function getSubject({
  pulseId,
  subjectColumnId,
  variableMapping,
}) {
  try {
    const query = `
    {
        items(ids: ${pulseId}) {
          column_values {
            column {
              id
              title
            }
            ... on MirrorValue {
              display_value
              id
              type
            }
            ... on FormulaValue {
              display_value
              id
              type
            }
            id
            type
            value
          }
          name
        }
      }
    `

    // console.log(query)
    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
        'API-Version': '2025-01',
      },
      body: JSON.stringify({ query }),
    })

    const res = await response.json()

    // 🔹 Validamos si la respuesta contiene errores y los manejamos
    if (res.errors) {
      console.warn(
        'Se encontraron errores en la consulta de Monday:',
        res.errors
      )

      // Filtramos los errores específicos de fórmulas con mirrors y continuamos
      const isFormulaMirrorError = res.errors.some(
        (error) => error.extensions.code === 'FORMULA_TO_MIRROR_NOT_SUPPORTED'
      )

      if (isFormulaMirrorError) {
        console.warn(
          'Se ignorará la columna fórmula porque usa una mirror column.'
        )
      }
    }

    // 🔹 Validamos que haya datos antes de continuar
    if (
      !res.data ||
      !res.data.items ||
      res.data.items.length === 0 ||
      !res.data.items[0]
    ) {
      throw new Error(
        'No se encontraron datos válidos en la respuesta de Monday.'
      )
    }

    const item = res.data.items[0]

    const columnValues = item.column_values.reduce((acc, col) => {
      // Ignorar columnas nulas que generaron error en la consulta
      if (!col) return acc

      if (col.type === 'text' && col.value) {
        try {
          acc[col.id] = { text: JSON.parse(col.value) }
        } catch (error) {
          acc[col.id] = { text: col.value }
        }
      } else if (col.type === 'mirror' && col.display_value) {
        acc[col.id] = { text: col.display_value }
      } else if (col.type === 'formula') {
        if (col.display_value) {
          acc[col.id] = { text: col.display_value }
        } else {
          console.warn(
            `Se ignoró la columna de fórmula '${col.id}' porque depende de una mirror column.`
          )
          acc[col.id] = { text: '' } // Evitamos null para que no rompa la app
        }
      } else {
        acc[col.id] = col.value ? JSON.parse(col.value) : null
      }
      return acc
    }, {})

    const rawSubjectText = columnValues[subjectColumnId]?.text || ''

    // Reemplazamos las variables
    const variables = replaceVariables({ variableMapping, columnValues, item })

    // Reemplazo de variables en el subject
    const subject = rawSubjectText.replace(
      /\{(.*?)\}/g,
      (_, variable) => variables[variable] || `{${variable}}`
    )

    return { subject }
  } catch (error) {
    console.error('Error al obtener el asunto:', error)
    // throw error
    return { subject: '' }
  }
}

export async function getBodyEmail({ pulseId, bodyColumnId, variableMapping }) {
  try {
    const query = `
      {
        items(ids: ${pulseId}) {
          column_values {
            column {
              id
              title
            }
            ... on MirrorValue {
              display_value
              id
              type
            }
            ... on FormulaValue {
              display_value
              id
              type
            }
            id
            type
            value
          }
          name
        }
      }
    `

    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
        'API-Version': '2025-01',
      },
      body: JSON.stringify({ query }),
    })

    const res = await response.json()

    // 🔹 Validamos si la respuesta contiene errores y los manejamos
    if (res.errors) {
      console.warn(
        'Se encontraron errores en la consulta de Monday:',
        res.errors
      )

      // Filtramos los errores específicos de fórmulas con mirrors y continuamos
      const isFormulaMirrorError = res.errors.some(
        (error) => error.extensions.code === 'FORMULA_TO_MIRROR_NOT_SUPPORTED'
      )

      if (isFormulaMirrorError) {
        console.warn(
          'Se ignorará la columna fórmula porque usa una mirror column.'
        )
      }
    }

    // 🔹 Validamos que haya datos antes de continuar
    if (
      !res.data ||
      !res.data.items ||
      res.data.items.length === 0 ||
      !res.data.items[0]
    ) {
      throw new Error(
        'No se encontraron datos válidos en la respuesta de Monday.'
      )
    }

    const item = res.data.items[0]

    const columnValues = item.column_values.reduce((acc, col) => {
      // Ignorar columnas nulas que generaron error en la consulta
      if (!col) return acc

      if (col.type === 'text' && col.value) {
        try {
          acc[col.id] = { text: JSON.parse(col.value) }
        } catch (error) {
          acc[col.id] = { text: col.value }
        }
      } else if (col.type === 'mirror' && col.display_value) {
        acc[col.id] = { text: col.display_value }
      } else if (col.type === 'formula') {
        if (col.display_value) {
          acc[col.id] = { text: col.display_value }
        } else {
          console.warn(
            `Se ignoró la columna de fórmula '${col.id}' porque depende de una mirror column.`
          )
          acc[col.id] = { text: '' } // Evitamos null para que no rompa la app
        }
      } else {
        acc[col.id] = col.value ? JSON.parse(col.value) : null
      }
      return acc
    }, {})

    // console.log(columnValues)

    const rawBodyText = columnValues[bodyColumnId]?.text || ''

    // console.log(columnValues)
    // console.log('****************************')

    // Recuperamos las variables que no están dentro de column_values (por ejemplo, 'name')
    const variables = replaceVariables({ variableMapping, columnValues, item })

    // console.log('****************************')
    // console.log(variables)

    // Realizamos el reemplazo de las variables en el texto del cuerpo
    const newBody = rawBodyText.replace(
      /\{(.*?)\}/g,
      (_, variable) => variables[variable] || `{${variable}}`
    )

    const bodyEmail = unescapeHTML(newBody)

    return { bodyEmail }
  } catch (error) {
    console.error('Error al obtener el cuerpo del correo:', error)
    // throw error
    return { bodyEmail: '' }
  }
}

export async function getColumnsMirror({ pulseId, columnId }) {
  try {
    const query = `
      query {
        items(ids: ${pulseId}) {
          column_values(ids: "${columnId}") {
            ... on MirrorValue {
              mirrored_items {
                mirrored_value {
                  __typename
                }
              }
            }
          }
        }
      }
    `

    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
        'API-Version': '2025-01',
      },
      body: JSON.stringify({ query }),
    })

    const res = await response.json()
    const mirroredItems =
      res.data?.items?.[0]?.column_values?.[0]?.mirrored_items || []

    // Verificar si refleja archivos (FileValue)
    const isMirrorFile = mirroredItems.some(
      (item) => item.mirrored_value?.__typename === 'FileValue'
    )

    return { isMirrorFile }
  } catch (error) {
    console.error('Error analyzing mirror column:', error)
    throw error
  }
}

export async function getAssets({ pulseId, attachmentsColumnId }) {
  try {
    const query = `
      query {
        items(ids: ${pulseId}) {
          column_values(ids: "${attachmentsColumnId}") {
            id
            type
            value
            ... on MirrorValue {
              mirrored_items {
                linked_item {
                  id
                }
              }
            }
          }
          assets {
            id
            public_url
            name
          }
        }
      }
    `

    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
        'API-Version': '2025-01',
      },
      body: JSON.stringify({ query }),
    })

    const res = await response.json()
    const item = res.data?.items?.[0]
    const columnValue = item?.column_values?.[0]

    if (columnValue?.type === 'mirror') {
      // Usar la función para verificar si es un mirror de archivos
      const { isMirrorFile } = await getColumnsMirror({
        pulseId,
        columnId: attachmentsColumnId,
      })

      if (isMirrorFile) {
        // Procesar archivos reflejados
        const mirroredItems = columnValue.mirrored_items || []
        const mirrorFileAssets = []

        for (const mirroredItem of mirroredItems) {
          const linkedItemId = mirroredItem.linked_item?.id

          if (linkedItemId) {
            const mirrorQuery = `
              query {
                items(ids: ${linkedItemId}) {
                  assets {
                    id
                    public_url
                    name
                  }
                }
              }
            `

            const mirrorResponse = await fetch('https://api.monday.com/v2', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${TOKEN}`,
              },
              body: JSON.stringify({ query: mirrorQuery }),
            })

            const mirrorRes = await mirrorResponse.json()
            mirrorFileAssets.push(...(mirrorRes.data?.items?.[0]?.assets || []))
          }
        }

        return mirrorFileAssets
      }
    }

    // Procesar archivos nativos
    const parsedValue = columnValue?.value
      ? JSON.parse(columnValue.value)
      : { files: [] }
    const nativeAssetIds = parsedValue.files.map((file) => file.assetId)

    const nativeFilteredAssets = item?.assets?.filter((asset) =>
      nativeAssetIds.map(String).includes(asset.id.toString())
    )

    return nativeFilteredAssets
  } catch (error) {
    console.error('Error al obtener los adjuntos del correo:', error)
    throw error
  }
}

export async function getColumnsList({ boardId }) {
  try {
    const query = `
      query {
        boards(ids: ${boardId}) {
          columns {
            id
            title
            type
          }
        }
      }
    `

    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
        'API-Version': '2025-01',
      },
      body: JSON.stringify({ query }),
    })

    const res = await response.json()

    // Asegúrate de que siempre retorna un arreglo
    return res.data?.boards?.[0]?.columns || []
  } catch (error) {
    console.error('Error getting columns list:', error)
    throw error
  }
}

export async function getFirstPulseId({ boardId }) {
  try {
    const query = `
      query {
        boards(ids: ${boardId}) {
          items_page {
            items {
              id
              name
            }
          }
        }
      }
    `

    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
        'API-Version': '2025-01',
      },
      body: JSON.stringify({ query }),
    })

    const res = await response.json()
    const items = res.data?.boards?.[0]?.items_page?.items || []
    if (items.length === 0) {
      throw new Error(`No items found in board with ID ${boardId}`)
    }

    // Retornar el primer pulseId
    return items[0].id
  } catch (error) {
    console.error('Error getting first pulseId:', error)
    throw error
  }
}

export async function getAttachmentColumns({ boardId }) {
  try {
    // Obtener el primer pulseId del board
    const pulseId = await getFirstPulseId({ boardId })

    // console.log('Pulse ID:', pulseId)

    // Obtener todas las columnas del board
    const columns = await getColumnsList({ boardId })

    // console.log('Columns:', columns)

    // Verificar que columns es un arreglo
    if (!Array.isArray(columns)) {
      throw new Error('Columns is not an array')
    }

    // Filtrar las columnas de tipo file y verificar las columnas mirror
    const attachmentColumns = []

    for (const column of columns) {
      // console.log('In loop:', column)
      if (column.type === 'file') {
        // Agregar columnas de tipo file directamente
        attachmentColumns.push(column)
      } else if (column.type === 'mirror') {
        // Verificar si la columna mirror refleja archivos (FileValue)
        const { isMirrorFile } = await getColumnsMirror({
          pulseId,
          columnId: column.id,
        })
        if (isMirrorFile) {
          attachmentColumns.push(column)
        }
      }
    }

    return attachmentColumns
  } catch (error) {
    console.error('Error getting attachment columns:', error)
    throw error
  }
}
