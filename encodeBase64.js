import { readFileSync } from 'fs'

const filePath = './src/config/serviceAccountKey.json'; // Cambia esto por la ruta real
const fileContent = readFileSync(filePath);
const base64Content = fileContent.toString('base64');

console.log(base64Content);