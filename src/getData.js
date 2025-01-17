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
            }
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
      },
      body: JSON.stringify({ query }),
    })

    const res = await response.json()
    const columnValues = res.data.items[0].column_values
    return {
      toEmails:
        columnValues.find((col) => col.id === emailsMapping.to)
          ?.display_value || '',
      ccEmails:
        columnValues.find((col) => col.id === emailsMapping.cc)
          ?.display_value || '',
      bccEmails:
        columnValues.find((col) => col.id === emailsMapping.bcc)
          ?.display_value || '',
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
      },
      body: JSON.stringify({ query }),
    })

    const res = await response.json()
    const item = res.data.items[0]
    const columnValues = item.column_values.reduce((acc, col) => {
      acc[col.id] = col.value ? JSON.parse(col.value) : null
      return acc
    }, {})

    // console.log(columnValues)

    const rawSubjectText = columnValues[subjectColumnId]?.text || ''

    // Recuperamos las variables que no están dentro de column_values (por ejemplo, 'name')
    const variables = replaceVariables({ variableMapping, columnValues, item })

    // Realizamos el reemplazo de las variables en el texto del asunto
    const subject = rawSubjectText.replace(
      /\{(.*?)\}/g,
      (_, variable) => variables[variable] || `{${variable}}`
    )

    return { subject }
  } catch (error) {
    console.error('Error al obtener el asunto:', error)
    throw error
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
      },
      body: JSON.stringify({ query }),
    })

    const res = await response.json()
    const item = res.data.items[0]
    const columnValues = item.column_values.reduce((acc, col) => {
      acc[col.id] = col.value ? JSON.parse(col.value) : null
      return acc
    }, {})

    const rawBodyText = columnValues[bodyColumnId]?.text || ''
    const unescapedBodyText = unescapeHTML(rawBodyText)

    // console.log(columnValues)
    // console.log('****************************')

    // Recuperamos las variables que no están dentro de column_values (por ejemplo, 'name')
    const variables = replaceVariables({ variableMapping, columnValues, item })

    // console.log('****************************')
    // console.log(variables)

    // Realizamos el reemplazo de las variables en el texto del cuerpo
    const newBody = unescapedBodyText.replace(
      /\{(.*?)\}/g,
      (_, variable) => variables[variable] || `{${variable}}`
    )

    return { newBody }
  } catch (error) {
    console.error('Error al obtener el cuerpo del correo:', error)
    throw error
  }
}

export async function getAssets({ pulseId, attachmentsColumnId }) {
  try {
    const query = `
      {
        items(ids: ${pulseId}) {
          column_values(ids: "${attachmentsColumnId}") {
            id
            value
          }
          assets {
            id
            public_url
            name
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
      },
      body: JSON.stringify({ query }),
    })

    const res = await response.json()
    const item = res.data?.items?.[0]
    const assets = item?.assets || []

    // Parsear los assetId del campo value (columna de archivos)
    const attachmentsColumnValue = item?.column_values?.[0]?.value
    const parsedValue = attachmentsColumnValue
      ? JSON.parse(attachmentsColumnValue)
      : { files: [] }
    const attachmentAssetIds = parsedValue.files.map((file) => file.assetId) // Obtener los IDs de los archivos

    // Filtrar los assets por los IDs obtenidos de la columna
    const filteredAssets = assets.filter((asset) =>
      attachmentAssetIds.map(String).includes(asset.id.toString())
    )

    // console.log('Assets:', assets)
    // console.log('Attachment IDs:', attachmentAssetIds)
    // console.log('Filtered Assets:', filteredAssets)

    return filteredAssets // Retorna solo los archivos de la columna mapeada
  } catch (error) {
    console.error('Error al obtener los adjuntos del correo:', error)
    throw error
  }
}

export async function getColumnsList({ boardId }) {
  try {
    const query = `
      {
        boards (ids: ${boardId}) {
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
      },
      body: JSON.stringify({ query }),
    })

    const res = await response.json()
    const columns = res.data.boards ? res.data.boards[0] : []
    return columns
  } catch (error) {
    console.error('Error al obtener el listado de las columnas:', error)
    throw error
  }
}
