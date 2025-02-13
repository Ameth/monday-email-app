import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const TOKEN = process.env.TOKEN_MONDAY

// Caché para almacenar los datos de la consulta y evitar llamadas duplicadas
const mondayCache = new Map()

async function fetchMondayData(pulseId) {
  // Si ya hemos hecho la consulta antes, retornamos el caché
  if (mondayCache.has(pulseId)) {
    return mondayCache.get(pulseId)
  }

  const query = `
    {
      items(ids: ${pulseId}) {
        column_values {
          column {
            title
          }
          ... on MirrorValue {
            display_value
          }
          ... on FormulaValue {
            display_value
          }
          ... on BoardRelationValue {
            display_value 
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

  // console.log('Se ejecuto el fetch')

  const res = await response.json()

  // Validamos si la respuesta contiene errores y los manejamos
  if (res.errors) {
    console.warn('Se encontraron errores en la consulta de Monday:', res.errors)
  }

  // Validamos que haya datos antes de continuar
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

  // Guardamos en caché para futuras llamadas
  mondayCache.set(pulseId, item)

  return item
}

const variablesValues = ({ variableMapping, columnValues, item }) => {
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
          } else if ('text' in columnValue) {
            acc[variableName] = columnValue.text // Si es texto (incluso si es un string vacío)
          } else if ('date' in columnValue) {
            acc[variableName] = columnValue.date // Si es fecha
          } else {
            acc[variableName] = columnValue || `{${variableName}}` // Si no hay coincidencia, toma el valor completo
          }
        } else {
          acc[variableName] = `{${variableName}}` // Si columnValue es null o undefined
        }
      }
      return acc
    },
    {}
  )

  // console.log('Variables:', variables)

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

const replaceRecursive = (text, variables) => {
  let previousText

  do {
    previousText = text // Guardamos el estado previo
    text = text.replace(
      /\{(.*?)\}/g,
      (_, variable) => variables[variable] ?? `{${variable}}`
    )
  } while (text !== previousText) // Repetimos hasta que no haya más cambios

  return text
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
    const item = await fetchMondayData(pulseId)

    const columnValues = item.column_values.reduce((acc, col) => {
      // Ignorar columnas nulas que generaron error en la consulta
      if (!col) return acc

      if (col.type === 'text' && col.value) {
        try {
          acc[col.id] = { text: JSON.parse(col.value) }
        } catch (error) {
          acc[col.id] = { text: col.value }
        }
      } else if (
        col.type === 'mirror' ||
        col.type === 'board_relation' ||
        col.type === 'formula'
      ) {
        acc[col.id] = { text: col.display_value }
      } else {
        acc[col.id] = col.value ? JSON.parse(col.value) : null
      }
      return acc
    }, {})

    const rawSubjectText = columnValues[subjectColumnId]?.text || ''

    // Recuperamos el valor de las variables
    const variables = variablesValues({ variableMapping, columnValues, item })

    // Realizamos el reemplazo de las variables en el texto
    const subject = replaceRecursive(rawSubjectText, variables)

    return { subject }
  } catch (error) {
    console.error('Error al obtener el asunto:', error)
    // throw error
    return { subject: '' }
  }
}

export async function getBodyEmail({ pulseId, bodyColumnId, variableMapping }) {
  try {
    const item = await fetchMondayData(pulseId)

    const columnValues = item.column_values.reduce((acc, col) => {
      // Ignorar columnas nulas que generaron error en la consulta
      if (!col) return acc

      if (col.type === 'text' && col.value) {
        try {
          acc[col.id] = { text: JSON.parse(col.value) }
        } catch (error) {
          acc[col.id] = { text: col.value }
        }
      } else if (
        col.type === 'mirror' ||
        col.type === 'board_relation' ||
        col.type === 'formula'
      ) {
        acc[col.id] = { text: col.display_value }
      } else {
        acc[col.id] = col.value ? JSON.parse(col.value) : null
      }
      return acc
    }, {})

    // console.log(columnValues)

    const rawBodyText = columnValues[bodyColumnId]?.text || ''

    // Recuperamos el valor de las variables
    const variables = variablesValues({ variableMapping, columnValues, item })

    // Realizamos el reemplazo de las variables en el texto del cuerpo
    const newBody = replaceRecursive(rawBodyText, variables)

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
