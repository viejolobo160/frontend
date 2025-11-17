import axios from "axios"

// Configuración base de la API
const API_BASE_URL = import.meta.env.VITE_API_URL


// NUEVO: Cache simple para requests GET
const requestCache = new Map()
const CACHE_DURATION = 5000 // 5 segundos

// NUEVO: Queue para controlar requests simultáneos
const requestQueue = new Map()

// Crear instancia de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: false,
})

// NUEVO: Función para generar clave de cache
const getCacheKey = (config) => {
  return `${config.method?.toUpperCase()}_${config.url}_${JSON.stringify(config.params || {})}`
}

// NUEVO: Función para verificar si un request está en progreso
const getQueueKey = (config) => {
  return `${config.method?.toUpperCase()}_${config.url}_${JSON.stringify(config.params || {})}_${JSON.stringify(config.data || {})}`
}

// Interceptor para agregar el token a las requests
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // NUEVO: Implementar cache para requests GET
    if (config.method?.toLowerCase() === 'get') {
      const cacheKey = getCacheKey(config)
      const cached = requestCache.get(cacheKey)
      
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`📦 Cache hit para ${config.url}`)
        // Retornar respuesta desde cache
        return Promise.reject({
          __cached: true,
          data: cached.data,
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        })
      }
    }

    // NUEVO: Evitar requests duplicados simultáneos
    const queueKey = getQueueKey(config)
    if (requestQueue.has(queueKey)) {
      console.log(`⏳ Request duplicado detectado, esperando: ${config.url}`)
      try {
        return await requestQueue.get(queueKey)
      } catch (error) {
        requestQueue.delete(queueKey)
        throw error
      }
    }

    // Log de requests en desarrollo
    if (import.meta.env.DEV) {
      console.log(`🌐 ${config.method?.toUpperCase()} ${config.url}`, config.data || config.params)
    }

    return config
  },
  (error) => {
    console.error("❌ Error en request interceptor:", error)
    return Promise.reject(error)
  },
)

// CORREGIDO: Interceptor para manejar respuestas y errores mejorado
api.interceptors.response.use(
  (response) => {
    const queueKey = getQueueKey(response.config)
    requestQueue.delete(queueKey)

    // NUEVO: Guardar en cache si es GET
    if (response.config.method?.toLowerCase() === 'get') {
      const cacheKey = getCacheKey(response.config)
      requestCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      })
    }

    // Log de respuestas exitosas en desarrollo
    if (import.meta.env.DEV) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`)
    }
    return response
  },
  async (error) => {
    // NUEVO: Manejar respuestas desde cache
    if (error.__cached) {
      console.log(`📦 Retornando desde cache: ${error.config.url}`)
      return Promise.resolve({
        data: error.data,
        status: error.status,
        statusText: error.statusText,
        headers: error.headers,
        config: error.config
      })
    }

    const originalRequest = error.config
    const queueKey = getQueueKey(originalRequest)
    requestQueue.delete(queueKey)

    // Manejar diferentes tipos de errores
    if (error.response) {
      const { status, data } = error.response

      switch (status) {
        case 401:
          console.warn("🔐 Token expirado o inválido")
          localStorage.removeItem("token")
          localStorage.removeItem("user")
          if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
            window.location.href = "/login"
          }
          break
        case 403:
          console.error("🚫 Sin permisos para esta acción")
          break
        case 404:
          console.error("🔍 Recurso no encontrado")
          break
        case 429:
          if (!originalRequest._retry) {
            originalRequest._retry = true
            const retryAfter = Math.min(Number.parseInt(error.response.headers["retry-after"]) || 3, 5) // Máximo 5 segundos
            console.warn(`⏳ Rate limit excedido, esperando ${retryAfter} segundos...`)

            // NUEVO: Implementar backoff exponencial
            const backoffDelay = Math.min(1000 * Math.pow(2, originalRequest._retryCount || 0), 5000)
            originalRequest._retryCount = (originalRequest._retryCount || 0) + 1

            if (originalRequest._retryCount <= 2) { // Máximo 2 reintentos
              await new Promise((resolve) => setTimeout(resolve, backoffDelay))
              return api(originalRequest)
            }
          }
          console.error("🚦 Rate limit excedido - demasiadas solicitudes")
          break
        case 500:
          console.error("💥 Error interno del servidor")
          break
        default:
          console.error(`❌ Error ${status}:`, data?.message || error.message)
      }

      // Mejorar el manejo del mensaje de error
      if (data?.message) {
        error.message = data.message
      } else if (data?.error) {
        error.message = data.error
      }
    } else if (error.request) {
      console.error("🌐 Error de conexión:", error.message)
      error.message = "No se pudo conectar con el servidor. Verifica tu conexión a internet."
    } else {
      console.error("⚙️ Error de configuración:", error.message)
      error.message = "Error en la configuración de la solicitud"
    }

    return Promise.reject(error)
  },
)

// NUEVO: Función para limpiar cache
export const clearApiCache = () => {
  requestCache.clear()
  console.log("🧹 Cache de API limpiado")
}

// NUEVO: Función para limpiar cache específico
export const clearCacheForUrl = (url) => {
  for (const [key] of requestCache) {
    if (key.includes(url)) {
      requestCache.delete(key)
    }
  }
  console.log(`🧹 Cache limpiado para: ${url}`)
}

export default api
