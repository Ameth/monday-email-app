import axios from 'axios'
import fs from 'fs'
import path from 'path'

async function descargarArchivo(url, nombreArchivo) {
  try {

     // Definimos la carpeta donde se guardará el archivo
     const carpeta = path.resolve('src', 'attachments');

     // Verificamos si la carpeta existe; si no, la creamos
     if (!fs.existsSync(carpeta)) {
       fs.mkdirSync(carpeta, { recursive: true }); // Crea la carpeta y subcarpetas si es necesario
     }

    // Creamos la ruta completa para el archivo
    const rutaArchivo = path.join(carpeta, nombreArchivo);

    // Hacemos la petición GET al archivo y escribimos su contenido directamente en el archivo local
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream', // Indicamos que queremos recibir el contenido como un stream
    })

    // Guardamos el archivo localmente usando un stream
    const writer = fs.createWriteStream(rutaArchivo)

    // Pipe para escribir los datos del archivo descargado en el archivo local
    response.data.pipe(writer)

    // Esperamos a que se complete la escritura
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log('Archivo descargado y guardado localmente:', rutaArchivo)
        resolve(rutaArchivo) // Devolvemos la ruta del archivo una vez finalizado
      })
      writer.on('error', (error) => {
        console.error('Error al escribir el archivo localmente:', error)
        reject(error)
      })
    })
  } catch (error) {
    console.error('Error al descargar el archivo:', error)
    throw error // Lanzamos el error para que el flujo lo maneje
  }
}

export default descargarArchivo
