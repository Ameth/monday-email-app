import axios from 'axios'
import fs from 'fs'
import dotenv from 'dotenv'

import { readTokens, saveTokens } from './utils/tokenUtils.js'

// Carga las variables del archivo .env
dotenv.config()

const getInfoUserAuth = async ({ access_token }) => {
  try {
    const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    const user = response.data
    // console.log('Información del usuario:', user)

    return {
      display_name: user.displayName,
      surname: user.surname,
      given_name: user.givenName,
      email: user.mail || user.userPrincipalName,
    }
  } catch (error) {
    console.error(
      'Error al obtener la información del usuario autenticado:',
      error.response?.data || error.message
    )
    throw new Error(
      'No se pudo obtener la información del usuario autenticado.'
    )
  }
}

export const exchangeCodeForTokens = async ({ code, boardId }) => {
  const data = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.REDIRECT_URI,
  })

  // console.log('Data:', data.toString())

  try {
    const response = await axios.post(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      data.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    )

    const { access_token, refresh_token, expires_in } = response.data

    // console.log('Tokens obtenidos:', {
    //   access_token,
    //   refresh_token,
    //   expires_in,
    // })

    // saveTokens()
    const userData = await getInfoUserAuth({ access_token })

    const userTokens = {
      access_token,
      refresh_token,
      expires_in,
      ...userData,
    }

    // Almacenar los tokens asociados al email del usuario
    await saveTokens({ tokens: userTokens, boardId: boardId })

    // Enviar tokens al frontend o almacenarlos
    return { access_token, refresh_token, expires_in, email: userData.email }
  } catch (error) {
    console.error(
      'Error al intercambiar el código:',
      error.response?.data || error.message
    )
    // Lanza un error más descriptivo para el frontend

    // Lanza un error con información descriptiva
    throw new Error(
      error.response?.data?.error_description ||
        error.message ||
        'Error desconocido'
    )
  }
}

// Función para obtener un nuevo Access Token
const getNewAccessToken = async ({ refresh_token, boardId }) => {
  try {
    const data = new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      refresh_token,
      grant_type: 'refresh_token',
      redirect_uri: process.env.REDIRECT_URI, // Asegúrate de incluir esta línea
    })

    const response = await axios.post(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      data.toString(), // Convertir a string codificada
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    // console.log('Response New Access Token:', response.data)

    const {
      access_token,
      refresh_token: newRefreshToken,
      expires_in,
    } = response.data

    console.log(
      `Access Token renovado exitosamente. Expira en ${expires_in} segundos.`
    )

    // Actualiza el archivo con el nuevo accessToken y refreshToken
    const currentTokens = await readTokens({ boardId })
    currentTokens.access_token = access_token
    currentTokens.refresh_token = newRefreshToken
    await saveTokens({ tokens: currentTokens, boardId: boardId })

    return access_token
  } catch (error) {
    console.error(
      'Error al renovar el Access Token:',
      error.response?.data || error.message
    )
    return error.response?.data || error.message
  }
}

// Función para enviar el correo
export const sendEmailWithGraph = async ({ emailData, boardId }) => {
  try {
    // Cargar los tokens del usuario
    let { access_token, refresh_token, email } = await readTokens({ boardId })

    if (!email) {
      throw new Error('User email is not stored.')
    }

    console.log(`Sending mail from the account: ${email}`)

    const { send_to, copy_to, hidenCopy_to, subject, body, attachments } =
      emailData

    // Aquí recuperas el último Refresh Token y Access Token almacenados
    // let accessToken = process.env.ACCESS_TOKEN
    // let refreshToken = process.env.REFRESH_TOKEN

    // Comprueba si el Access Token está válido o renovarlo
    try {
      // Verifica si el Access Token es válido haciendo una solicitud sencilla
      await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      // throw new Error('Forzando error para renovar el token')
    } catch {
      console.log('Access Token expired. Renewing...')
      // accessToken = await getNewAccessToken(refreshToken)
      const newAccessToken = await getNewAccessToken({
        refresh_token,
        boardId,
      })

      access_token = newAccessToken
    }

    // Helper function to convert comma-separated emails to an array of recipient objects
    const formatRecipients = (emails) => {
      if (!emails) return [] // Return empty array if no emails provided
      return emails.split(',').map((email) => ({
        emailAddress: { address: email.trim() },
      }))
    }

    // Build the emailSendData JSON
    const emailSendData = {
      message: {
        subject: subject || 'No Subject',
        body: {
          contentType: 'HTML', // Puedes cambiar a "HTML" si el cuerpo del mensaje tiene formato HTML
          content: body || 'No content', // Convierte el cuerpo a HTML
        },
        toRecipients: formatRecipients(send_to),
        ccRecipients: formatRecipients(copy_to),
        bccRecipients: formatRecipients(hidenCopy_to),
        attachments, // Enviar directamente los adjuntos en memoria
      },
    }

    // console.log(JSON.stringify(emailSendData, null, 2)); // Para debug

    // Enviar el correo usando Graph API
    const response = await axios.post(
      'https://graph.microsoft.com/v1.0/me/sendMail',
      emailSendData,
      {
        headers: {
          Authorization: `Bearer ${access_token}`, // Token de autenticación
          'Content-Type': 'application/json',
        },
      }
    )

    console.log('Email sent successfully:', response.status)

    return { emailSendData, responseStatus: response.status }
  } catch (error) {
    console.error(
      'Error sending mail with Graph:',
      error.response?.data || error.message
    )
    return error.response?.data || error.message
  }
}

// Ejecutar la función
// sendEmailWithGraph();
