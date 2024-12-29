import express from 'express'
// import https from 'https'
import bodyParser from 'body-parser'
// import fs from 'fs'
import cors from 'cors'

import descargarArchivo from '../src/descargarArchivo.js'
import { exchangeCodeForTokens, sendEmailWithGraph } from '../src/mailer.js'
import {
  getEmails,
  getSubject,
  getAssets,
  getBodyEmail,
} from '../src/getData.js'
import columnMapping from '../src/columnMapping.js'
import { readTokens } from '../src/tokenUtils.js'

import validateToken from '../src/middlewares/validateToken.js'

const app = express()

const PORT_HTTPS = 443
const PORT_HTTP = 80

// Habilitar CORS
// app.use(cors()); // Permite solicitudes desde cualquier origen (para desarrollo)
app.use(
  cors({
    origin: '*', // Permitir solicitudes desde cualquier origen (puedes limitar a dominios específicos)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Métodos permitidos
    allowedHeaders: ['Content-Type', 'Authorization'], // Cabeceras permitidas
  })
)

app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.sendStatus(200)
})

app.use(express.json())

app.use(bodyParser.json())

app.get('/user-info', async (req, res) => {
  try {
    const tokens = await readTokens()
    const { display_name, surname, given_name, email } = tokens

    res.status(200).json({
      displayName: display_name,
      surname,
      givenName: given_name,
      email,
    })
  } catch (error) {
    // console.error('Error al leer la información del usuario.')
    res.status(500).json({ error: 'Error al leer la información del usuario.' })
  }
})

app.post('/exchange-code', async (req, res) => {
  try {
    const { code } = req.body

    if (!code) {
      return res
        .status(400)
        .json({ error: 'El código de autorización es requerido' })
    }

    const { access_token, refresh_token, expires_in, email } =
      await exchangeCodeForTokens({
        code,
      })

    // console.log('Tokens obtenidos:', { access_token, refresh_token, expires_in })
    res.status(200).json({ access_token, refresh_token, expires_in, email })
  } catch (error) {
    // console.error('Error en /exchange-code:', error.message || error);

    res.status(500).json({
      error: error.message || 'Ocurrió un error al procesar la solicitud.',
    })
  }
})

app.post('/webhook', async (req, res) => {
  //Devolver el cuerpo de la solicitud para configurar el webhook
  if (req.body.challenge) {
    console.log(JSON.stringify(req.body, 0, 2))
    res.status(200).send(req.body)
  } else {
    //info
    const { pulseId } = req.body.event

    try {
      // Obtener los correos
      const { toEmails, ccEmails, bccEmails } = await getEmails({
        pulseId,
        emailsMapping: columnMapping.emails,
      })

      // Obtener el asunto
      const { subject: subjectEmail } = await getSubject({
        pulseId,
        subjectColumnId: columnMapping.subject,
        variableMapping: columnMapping.variables,
      })

      // Obtener el cuerpo del correo con parámetros
      const { newBody: bodyEmail } = await getBodyEmail({
        pulseId,
        bodyColumnId: columnMapping.bodyTemplate,
        variableMapping: columnMapping.variables,
      })

      // Obtener los archivos adjuntos
      const assets = await getAssets({ pulseId })

      // Preparar datos del correo
      const emailData = {
        send_to: toEmails,
        copy_to: ccEmails,
        hidenCopy_to: bccEmails,
        subject: subjectEmail,
        body: bodyEmail,
        attachment: [],
        attachmentPath: [],
      }

      //Generar los archivos adjuntos
      // for (let asset of assets) {
      //   const { public_url: publicUrl, name: fileName } = asset
      //   const rutaArchivo = fileName
      //     ? await descargarArchivo(publicUrl, fileName)
      //     : null

      //   if (rutaArchivo) {
      //     emailData.attachment.push(fileName) // Agregar nombre del archivo
      //     emailData.attachmentPath.push(rutaArchivo) // Agregar ruta local del archivo
      //   }
      // }

      // Enviar la respuesta
      const statusMail = await sendEmailWithGraph({ emailData })
      // res.status(200).json(emailData)
      res.status(200).json({ statusMail })
    } catch (error) {
      console.error('Error procesando el webhook:', error)
      res.status(500).json({ error: 'Error procesando el webhook' })
    }
  }
})

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Ready' })
})

// app.post('/webhook', (req, res) => {
//   const { boardId, pulseId } = req.body.event
//   console.log(JSON.stringify({ boardId: boardId, pulseId: pulseId }))
//   res.status(200).json({ boardId: boardId, pulseId: pulseId })
// })

// app.post('/webhook', (req, res) => {
//   console.log(JSON.stringify(req.body, 0, 2))
//   res.status(200).send(req.body)
// })

// Configurar el puerto y los certificados SSL, luego iniciar el servidor
// const sslOptions = {
//   key: fs.readFileSync('./src/ssl/sefsigned.key'),
//   cert: fs.readFileSync('./src/ssl/selfsigned.crt'),
// }

// https.createServer(sslOptions, app).listen(PORT_HTTPS, () => {
//   console.log(`Server is running on port ${PORT_HTTPS}`)
// })

// app.listen(PORT_HTTP, '0.0.0.0', () => {
//   console.log(`Server is running on port ${PORT_HTTP}`)
// })

//Verificar las variables de entorno
// console.log('CLIENT_ID:', process.env.CLIENT_ID);
// console.log('REDIRECT_URI:', process.env.REDIRECT_URI);

// Exportar como función serverless
export default app
