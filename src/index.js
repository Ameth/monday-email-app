import express from 'express'
import https from 'https'
import fs from 'fs'
import cors from 'cors'

import descargarArchivo from './descargarArchivo.js'
import { sendEmailWithGraph } from './mailer.js'
import { getEmails, getSubject, getAssets, getBodyEmail } from './getData.js'
import columnMapping from './columnMapping.js'

const app = express()

const PORT_HTTPS = 443
const PORT_HTTP = 80

// Habilitar CORS
app.use(cors()); // Permite solicitudes desde cualquier origen (para desarrollo)

// También puedes configurarlo para permitir orígenes específicos:
// app.use(cors({
//   origin: 'http://localhost:3000', // Reemplaza con la URL de tu frontend
//   methods: ['GET', 'POST'], // Métodos permitidos
//   allowedHeaders: ['Content-Type'], // Headers permitidos
// }));

app.use(express.json())

app.post('/webhook', async (req, res) => {
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
    for (let asset of assets) {
      const { public_url: publicUrl, name: fileName } = asset
      const rutaArchivo = fileName
        ? await descargarArchivo(publicUrl, fileName)
        : null

      if (rutaArchivo) {
        emailData.attachment.push(fileName) // Agregar nombre del archivo
        emailData.attachmentPath.push(rutaArchivo) // Agregar ruta local del archivo
      }
    }

    // Enviar la respuesta
    const statusMail = await sendEmailWithGraph({ emailData })
    res.json(emailData)
  } catch (error) {
    console.error('Error procesando el webhook:', error)
    res.status(500).json({ error: 'Error procesando el webhook' })
  }
})

app.get('/code', (req, res) => {
  const { code } = req.query || 'test'
  res.json({ code })
})

app.get('/', (req, res) => {
  res.json({ message: 'Ready' })
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

const sslOptions = {
  key: fs.readFileSync('./src/ssl/sefsigned.key'),
  cert: fs.readFileSync('./src/ssl/selfsigned.crt'),
}

https.createServer(sslOptions, app).listen(PORT_HTTPS, () => {
  console.log(`Server is running on port ${PORT_HTTPS}`)
})

app.listen(PORT_HTTP, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT_HTTP}`)
})
