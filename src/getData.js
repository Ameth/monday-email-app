import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const TOKEN = process.env.TOKEN_MONDAY

export async function getEmails({ pulseId }) {
  try {


    //Consultamos el archivo en la API de Monday
    const query = `
            {
                items(ids: ${pulseId}) {
                    column_values(ids:[ "mirror__1", "mirror6__1","mirror64__1"]) {
                    ... on MirrorValue {
                            display_value
                            id
                        }
                    }
                }
            }
          `
    //Hacemos la petición POST a la API de Monday
    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        query: query,
      }),
    })

    // Parseamos el resultado de la petición
    const res = await response.json()

    // Retornamos el enlace autorizado al archivo
    // console.log(res.data.items[0])
    const toEmails = res.data.items[0].column_values[0].display_value
    const ccEmails = res.data.items[0].column_values[1].display_value
    const bccEmails = res.data.items[0].column_values[2].display_value
    // console.log(`toEmails: ${public_url}`)
    return { toEmails, ccEmails, bccEmails }
  } catch (error) {
    console.error('Error al obtener el listado de los correos:', error)
    throw error
  }
}

export async function getSubject({ pulseId }) {
  try {


    //Consultamos el valor de la columna por su ID
    const query = `
        {
          items(ids: ${pulseId}) {
            column_values(ids: "long_text__1") {
              column {
                id
                title
              }
              id
              type
              value
            }
          }
        }
          `
    //Hacemos la petición POST a la API de Monday
    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        query: query,
      }),
    })

    // Parseamos el resultado de la petición
    const res = await response.json()

    // Retornamos el enlace autorizado al archivo
    // console.log(res.data.items[0])
    const rawValue = res.data.items[0].column_values[0].value
    const jsonValue = JSON.parse(rawValue)
    // console.log(jsonValue)
    const columnValue = jsonValue?.text
    // console.log(`toEmails: ${public_url}`)
    return { columnValue }
  } catch (error) {
    console.error('Error al obtener el listado de los correos:', error)
    throw error
  }
}

export async function getBodyEmail({ pulseId }) {
  try {


    //Consultamos el valor de la columna por su ID
    const query = `
        {
          items(ids: ${pulseId}) {
            column_values(ids: "texto_largo6__1") {
              column {
                id
                title
              }
              id
              type
              value
            }
          }
        }
          `
    //Hacemos la petición POST a la API de Monday
    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        query: query,
      }),
    })

    // Parseamos el resultado de la petición
    const res = await response.json()

    // Retornamos el enlace autorizado al archivo
    // console.log(res.data.items[0])
    const rawValue = res.data.items[0].column_values[0].value
    const jsonValue = JSON.parse(rawValue)
    // console.log(jsonValue)
    const columnValue = jsonValue?.text
    // console.log(`toEmails: ${public_url}`)
    return { columnValue }
  } catch (error) {
    console.error('Error al obtener el listado de los correos:', error)
    throw error
  }
}

export async function getBodyEmailWithParams({ pulseId }) {
  try {


    //Consultamos el valor de la columna por su ID
    const query = `
        {
          items(ids: ${pulseId}) {
            column_values (ids: ["files__1","texto_largo6__1"]) {
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
    //Hacemos la petición POST a la API de Monday
    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        query: query,
      }),
    })

    // Parseamos el resultado de la petición
    const res = await response.json()

    //Name of item
    const itemName = res.data.items[0].name

    //File
    const filerawValue = res.data.items[0].column_values[0].value
    const filejsonValue = JSON.parse(filerawValue)
    const fileName = filejsonValue?.files[0]?.name

    //Body text
    const rawValue = res.data.items[0].column_values[1].value
    const jsonValue = JSON.parse(rawValue)
    const bodyText = jsonValue?.text

    //Reemplazamos los parametros del text
    const newBody = bodyText?.replaceAll("{name}", itemName).replaceAll("{file_name}", fileName)

    // console.log({itemName,fileName,bodyText,newValue})

    return { newBody }
  } catch (error) {
    console.error('Error al obtener el listado de los correos:', error)
    throw error
  }
}

export async function getAssets({ pulseId }) {
  try {


    //Consultamos el valor de la columna por su ID
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
    //Hacemos la petición POST a la API de Monday
    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        query: query,
      }),
    })

    // Parseamos el resultado de la petición
    const res = await response.json()
    const assets = res.data?.items?.[0].assets || []

    // Retornamos el enlace autorizado al archivo
    // console.log(res.data.items[0])
    const { public_url: publicUrl = null, name: fileName = null } = assets[0] || {}
    // console.log(`toEmails: ${public_url}`)
    return { publicUrl, fileName }
  } catch (error) {
    console.error('Error al obtener el listado de los correos:', error)
    throw error
  }
}