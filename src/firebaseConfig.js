import admin from 'firebase-admin'
import dotenv from 'dotenv'

// import { fileURLToPath } from 'url';
// import fs from 'fs'
// import path from 'path';

dotenv.config()

// Definir __dirname para ES6
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// Inicializar Firebase Admin
// const serviceAccount = JSON.parse(
//   fs.readFileSync(path.resolve(__dirname, './src/config/serviceAccountKey.json'), 'utf8')
// );

const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_CREDENTIALS, 'base64').toString('utf8')
)

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

const db = admin.firestore()
export default db
