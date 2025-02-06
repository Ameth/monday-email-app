import express from 'express'
import https from 'https'
import bodyParser from 'body-parser'
import fs from 'fs'
import cors from 'cors'
import dotenv from 'dotenv'

// Load variables from .env file
dotenv.config()

import descargarArchivo from '../src/descargarArchivo.js'
import { exchangeCodeForTokens, sendEmailWithGraph } from '../src/mailer.js'
import {
  getEmails,
  getSubject,
  getAssets,
  getBodyEmail,
  getColumnsList,
  getAttachmentColumns,
} from '../src/getData.js'
// import columnMapping from '../src/config/columnMapping.js'
// import { getVariables, updateVariables } from '../src/utils/mappingVariables.js'
import {
  readTokens,
  deleteTokens,
  getAllTokens,
} from '../src/utils/tokenUtils.js'
import {
  saveColumnMapping,
  getColumnMapping,
} from '../src/utils/mappingUtils.js'

// import validateToken from '../src/middlewares/validateToken.js'

const app = express()

// const PORT_HTTPS = 443
// const PORT_HTTP = 80
const PORT_PROD = 3000

// Enable CORS
// app.use(cors()); // Allow requests from any origin (for development)
app.use(
  cors({
    origin: '*', // Allow requests from any origin (you can limit to specific domains)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
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
    const tokens = await getAllTokens()
    if (tokens.length === 0) {
      return res.status(404).json({ error: 'No tokens found in the database.' })
    }
    res.status(200).json(tokens)
  } catch (error) {
    console.error('Error retrieving all tokens:', error)
    res.status(500).json({ error: `Error retrieving all tokens: ${error}` })
  }
})

app.get('/user-info/:boardId', async (req, res) => {
  try {
    const { boardId } = req.params
    const tokens = await readTokens({ boardId })
    if (!tokens) {
      return res.status(404).json({ error: 'No tokens found for the user.' })
    }
    const { display_name, surname, given_name, email } = tokens

    res.status(200).json({
      displayName: display_name,
      surname,
      givenName: given_name,
      email,
    })
  } catch (error) {
    // console.error('Error reading user information.')
    res.status(500).json({ error: `Error reading user information: ${error}` })
  }
})

app.post('/user-logout/:boardId', async (req, res) => {
  try {
    const { boardId } = req.params
    // Llama a la función para borrar los tokens
    await deleteTokens({ boardId })
    res.status(200).json({ message: 'User logged out successfully' })
  } catch (error) {
    console.error('Error in /user-logout:', error.message)
    res.status(500).json({ error: 'Failed to log out user' })
  }
})

app.post('/exchange-code', async (req, res) => {
  try {
    const { code, boardId } = req.body

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' })
    }

    const { access_token, refresh_token, expires_in, email } =
      await exchangeCodeForTokens({
        code,
        boardId,
      })

    // console.log('Tokens obtained:', { access_token, refresh_token, expires_in })
    res.status(200).json({ access_token, refresh_token, expires_in, email })
  } catch (error) {
    // console.error('Error in /exchange-code:', error.message || error);

    res.status(500).json({
      error: error.message || 'An error occurred while processing the request.',
    })
  }
})

app.get('/column-mapping/:boardId', async (req, res) => {
  try {
    const { boardId } = req.params
    const mapping = await getColumnMapping({ boardId })
    res.status(200).json(mapping)
  } catch (error) {
    console.error('Error getting column mapping:', error)
    res
      .status(500)
      .json({ error: 'Error getting column mapping', message: error.message })
  }
})

app.put('/column-mapping/:boardId', async (req, res) => {
  try {
    const { boardId } = req.params
    const mappingData = req.body.mapping
    const result = await saveColumnMapping({ boardId, mappingData })
    res.status(200).json(result)
  } catch (error) {
    console.error('Error updating column mapping:', error)
    res.status(500).json({
      error: 'Error updating column mapping',
      message: error.message,
    })
  }
})

app.get('/column-list/:boardId', async (req, res) => {
  try {
    const { boardId } = req.params
    const columns = await getColumnsList({ boardId })
    res.status(200).json({ columns })
  } catch (error) {
    console.error('Error getting column list:', error)
    res.status(500).json({
      error: 'Error getting column list',
      message: error.message,
    })
  }
})

app.get('/column-attachment/:boardId', async (req, res) => {
  try {
    const { boardId } = req.params

    const columns = await getAttachmentColumns({ boardId })

    res.status(200).json({ columns })
  } catch (error) {
    console.error('Error getting attachment columns:', error)
    res.status(500).json({
      error: 'Error getting attachment columns',
      message: error.message,
    })
  }
})

app.post('/webhook', async (req, res) => {
  // Return the request body to set up the webhook
  if (req.body.challenge) {
    console.log(JSON.stringify(req.body, 0, 2))
    res.status(200).json({ challenge: req.body.challenge }) // Responder exactamente el challenge
  } else {
    try {
      const { boardId, pulseId } = req.body.event
      const mapping = await getColumnMapping({ boardId })
      // Get emails
      const { toEmails, ccEmails, bccEmails } = await getEmails({
        pulseId,
        emailsMapping: mapping.emails,
      })

      // Get the subject
      const { subject: subjectEmail } = await getSubject({
        pulseId,
        subjectColumnId: mapping.subject,
        variableMapping: mapping.variables,
      })

      // Get the email body with parameters
      const { bodyEmail } = await getBodyEmail({
        pulseId,
        bodyColumnId: mapping.bodyTemplate,
        variableMapping: mapping.variables,
      })

      // Get attachments
      const assets = await getAssets({
        pulseId,
        attachmentsColumnId: mapping.attachments,
      })

      // Prepare email data
      const emailData = {
        send_to: toEmails,
        copy_to: ccEmails,
        hidenCopy_to: bccEmails,
        subject: subjectEmail,
        body: bodyEmail,
        attachments: [], // Store buffers to send
      }

      // Generate attachments in memory
      for (let asset of assets) {
        const { public_url: publicUrl, name: fileName } = asset
        const buffer = await descargarArchivo(publicUrl) // Download the file in memory

        if (buffer) {
          emailData.attachments.push({
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: fileName, // File name
            contentBytes: buffer.toString('base64'), // Convert buffer to Base64
          })
        }
      }

      // Send the response
      const statusMail = await sendEmailWithGraph({ emailData, boardId })
      res.status(200).json({ statusMail })
      // res.status(200).json(emailData)
    } catch (error) {
      console.error('Error processing webhook:', error)
      res.status(500).json({ error: 'Error processing webhook' })
    }
  }
})

// app.get('/env-var', (req, res) => {
//   res.status(200).json({
//     token_monday: process.env.TOKEN_MONDAY,
//     client_id: process.env.CLIENT_ID,
//     client_secret: process.env.CLIENT_SECRET,
//     redirect_url: process.env.REDIRECT_URI,
//     aws_region: process.env.AWS_REGION,
//     aws_access_key_id: process.env.AWS_ACCESS_KEY_ID,
//     aws_secret_access_key: process.env.AWS_SECRET_ACCESS_KEY,
//   })
// })

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Ready' })
})

// Catch-all for undefined routes
// app.use((req, res) => {
//   res.status(404).json({
//     error: "Endpoint not found",
//     message: "The requested resource does not exist on this server",
//     path: req.originalUrl,s
//     method: req.method,
//   });
// });

// app.post('/webhook', (req, res) => {
//   const { boardId, pulseId } = req.body.event
//   console.log(JSON.stringify({ boardId: boardId, pulseId: pulseId }))
//   res.status(200).json({ boardId: boardId, pulseId: pulseId })
// })

// app.post('/webhook', (req, res) => {
//   console.log(JSON.stringify(req.body, 0, 2))
//   res.status(200).send(req.body)
// })

// Set up the port and SSL certificates, then start the server
// const sslOptions = {
//   key: fs.readFileSync('./src/ssl/selfsigned.key'),
//   cert: fs.readFileSync('./src/ssl/selfsigned.crt'),
// }

// https.createServer(sslOptions, app).listen(PORT_HTTPS, () => {
//   console.log(`Server is running on port ${PORT_HTTPS}`)
// })

// app.listen(PORT_HTTP, '0.0.0.0', () => {
//   console.log(`Server is running on port ${PORT_HTTP}`)
// })

app.listen(PORT_PROD, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT_PROD}`)
})

// Check environment variables
// console.log('CLIENT_ID:', process.env.CLIENT_ID);
// console.log('REDIRECT_URI:', process.env.REDIRECT_URI);

// Export as serverless function
export default app
