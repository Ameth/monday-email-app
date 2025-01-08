import axios from 'axios'

async function descargarArchivo(url) {
  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'arraybuffer', // Recibe el contenido como array de bytes
    })

    const buffer = Buffer.from(response.data) // Crear buffer del contenido del archivo
    // console.log('Archivo descargado en memoria:', url)
    return buffer // Retornar el buffer
  } catch (error) {
    console.error('Error al descargar el archivo:', error)
    throw error // Lanzar error si ocurre
  }
}

export default descargarArchivo
