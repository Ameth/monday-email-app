import { readTokens } from "../tokenUtils.js"

export default function validateToken(req, res, next) {
  const authHeader = req.headers.authorization
  const clientToken = authHeader && authHeader.split(' ')[1]

  if (!clientToken) {
    return res.status(401).json({ error: 'Token no proporcionado' })
  }

  // Leer el token almacenado en el backend
  try {
    const { access_token } = readTokens()

    if (clientToken !== access_token) {
      return res.status(403).json({ error: 'Token no válido' })
    }

    // Token válido, continúa con la solicitud
    next()
  } catch (parseError) {
    console.error('Error al analizar el archivo de tokens:', parseError)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
