import express from 'express'
import https from 'https'
import fs from 'fs'

import descargarArchivo from './descargarArchivo.js'
import { sendEmailWithGraph } from './mailer.js'
import { getEmails, getSubject, getBodyEmail, getAssets, getBodyEmailWithParams } from './getData.js'

const app = express()

const PORT_HTTPS = 443
const PORT_HTTP = 80

app.use(express.json())

app.post('/webhook', async (req, res) => { //info
  const { boardId, pulseId } = req.body.event
  const { toEmails, ccEmails, bccEmails } = await getEmails({ pulseId })
  const { columnValue: subjectEmail } = await getSubject({ pulseId })
  const { columnValue: bodyEmail } = await getBodyEmail({ pulseId }) //Simple body text
  const { newBody: bodyEmailWithParams } = await getBodyEmailWithParams({ pulseId })
  const { publicUrl, fileName } = await getAssets({ pulseId })
  const rutaArchivo = fileName ? await descargarArchivo(publicUrl, fileName) : null
  // console.log('Informacion obtenida:', info)
  const emailData = {
    send_to: toEmails,
    copy_to: ccEmails,
    hidenCopy_to: bccEmails,
    subject: subjectEmail,
    body: bodyEmailWithParams,
    attachment: fileName,
    attachmentPath: rutaArchivo
  }
  const statusMail = await sendEmailWithGraph({ emailData })
  res.json(emailData)
})

app.get('/code', (req, res) => {
  const { code } = req.query || 'test'
  res.json({ code })
})

app.get('/', (req, res) => {
  res.json({ message: "Ready" })
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
  cert: fs.readFileSync('./src/ssl/selfsigned.crt')
}

https.createServer(sslOptions, app).listen(PORT_HTTPS, () => {
  console.log(`Server is running on port ${PORT_HTTPS}`)
})

app.listen(PORT_HTTP, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT_HTTP}`)
})
