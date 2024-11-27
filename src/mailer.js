import { ConfidentialClientApplication } from '@azure/msal-node'
import axios from 'axios'
import fs from 'fs'
import dotenv from 'dotenv'

// Carga las variables del archivo .env
dotenv.config()

// Función para obtener un nuevo Access Token
const getNewAccessToken = async (refreshToken) => {
  try {
    const response = await axios.post(
      'https://login.microsoftonline.com/consumers/oauth2/v2.0/token', // Endpoint para cuentas personales
      new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope:
          'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access',
      })
    )

    const { access_token, refresh_token, expires_in } = response.data

    console.log('Access Token renovado exitosamente.')

    // Guarda el nuevo Refresh Token si cambia
    if (refresh_token) {
      // Aquí debes guardar el nuevo refresh_token
      // console.log("Nuevo Refresh Token:", refresh_token);
    }

    return access_token
  } catch (error) {
    console.error(
      'Error al renovar el Access Token:',
      error.response?.data || error.message
    )
    throw error
  }
}

export default getNewAccessToken

// Función para enviar el correo
export const sendEmailWithGraph = async ({ emailData }) => {
  try {
    const {
      send_to,
      copy_to,
      hidenCopy_to,
      subject,
      body,
      attachment,
      attachmentPath,
    } = emailData

    // Aquí recuperas el último Refresh Token y Access Token almacenados
    let accessToken = process.env.ACCESS_TOKEN
    let refreshToken = process.env.REFRESH_TOKEN

    // Comprueba si el Access Token está válido o renovarlo
    try {
      // Verifica si el Access Token es válido haciendo una solicitud sencilla
      await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    } catch {
      console.log('Access Token expirado. Renovando...')
      accessToken = await getNewAccessToken(refreshToken)
    }

    // Helper function to convert comma-separated emails to an array of recipient objects
    const formatRecipients = (emails) => {
      if (!emails) return [] // Return empty array if no emails provided
      return emails.split(',').map((email) => ({
        emailAddress: { address: email.trim() },
      }))
    }

    // Prepare attachments if provided
    const attachments = attachment
      ? [
          {
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: attachment, // File name
            contentBytes: Buffer.from(fs.readFileSync(attachmentPath)).toString(
              'base64'
            ),
          },
        ]
      : []

    // Build the emailSendData JSON
    const emailSendData = {
      message: {
        subject: subject || 'Sin Asunto',
        body: {
          contentType: 'HTML', // Puedes cambiar a "HTML" si el cuerpo del mensaje tiene formato HTML
          content: body || 'Sin contenido',
        },
        toRecipients: formatRecipients(send_to),
        ccRecipients: formatRecipients(copy_to),
        bccRecipients: formatRecipients(hidenCopy_to),
        attachments, // Add attachments if they exist
      },
    }

    // console.log(JSON.stringify(emailSendData, null, 2)); // Para debug

    // Enviar el correo usando Graph API
    const response = await axios.post(
      'https://graph.microsoft.com/v1.0/me/sendMail',
      emailSendData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`, // Token de autenticación
          'Content-Type': 'application/json',
        },
      }
    )

    console.log('Correo enviado correctamente:', response.status)

    return response.status
  } catch (error) {
    console.error(
      'Error al enviar correo con Graph:',
      error.response?.data || error.message
    )
  }
}

// Ejecutar la función
// sendEmailWithGraph();
