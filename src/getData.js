import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const TOKEN = process.env.TOKEN_MONDAY

const replaceVariables = ({ variableMapping, columnValues, item }) => {

  const variables = Object.entries(variableMapping).reduce(
    (acc, [key, columnId]) => {
      // Verificamos si la variable es 'name' (o alguna otra fuera de column_values)
      if (key === 'name') {
        acc[key] = item.name || `{${key}}` // Usamos el nombre del item si es 'name'
      } else {
        const columnValue = columnValues[columnId]

        // console.log(columnValue)

        // Comprobamos el tipo de la columna para extraer el valor correcto
        if (columnValue) {
          if (columnValue.files && columnValue.files.length > 0) {
            // Si la columna es de tipo 'file', extraemos el nombre del archivo
            acc[key] = columnValue.files[0].name
          } else if (columnValue.text) {
            // Si la columna tiene 'text', usamos el texto directamente
            acc[key] = columnValue.text
          } else if (columnValue.date) {
            // Si la columna tiene 'date', usamos la fecha en formato 'aaaa-mm-dd'
            acc[key] = columnValue.date
          } else {
            // Si la columna es de otro tipo, usamos su valor como está
            acc[key] = columnValue || `{${key}}`
          }
        } else {
          // Si no encontramos la columna o su valor, dejamos la variable intacta
          acc[key] = `{${key}}`
        }
      }
      return acc
    },
    {}
  )

  return variables
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

    return { newBody }
  } catch (error) {
    console.error('Error al obtener el cuerpo del correo:', error)
    throw error
  }
}

export async function getAssets({ pulseId }) {
  try {
    const query = `
         {
            items (ids: ${pulseId}) {
                assets {
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
      },
      body: JSON.stringify({ query }),
    })

    const res = await response.json()
    const assets = res.data?.items?.[0].assets || []

    return assets // Retorna todos los archivos encontrados
  } catch (error) {
    console.error('Error al obtener los adjuntos del correo:', error)
    throw error
  }
}
