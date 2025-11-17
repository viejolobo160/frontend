import { useEffect, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/contexts/ToastContext"

/**
 * Hook personalizado para manejar atajos de teclado globales
 * 
 * Atajos disponibles:
 * - F1: Ir a Ventas
 * - F6: Ir a Caja (Cierre de caja)
 * - F10: Ir a Stock (Carga de productos)
 * - F12: Cerrar sesión
 */
export const useKeyboardShortcuts = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  const { showToast } = useToast()

  const handleKeyPress = useCallback(
    async (event) => {
      // Ignorar si el usuario está escribiendo en un input, textarea o select
      const activeElement = document.activeElement
      const isTyping =
        activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.tagName === "SELECT" ||
        activeElement.isContentEditable

      // Detectar las teclas F1, F6, F10, F12
      const key = event.key

      // F1 - Ir a Ventas
      if (key === "F1") {
        event.preventDefault() // Prevenir comportamiento por defecto del navegador
        if (location.pathname !== "/ventas") {
          navigate("/ventas")
          showToast("Navegando a Ventas", "info")
        }
        return
      }

      // F6 - Ir a Caja (Cierre de caja)
      if (key === "F6") {
        event.preventDefault()
        if (location.pathname !== "/caja") {
          navigate("/caja")
          showToast("Navegando a Control de Caja", "info")
        }
        return
      }

      // F10 - Ir a Stock (Carga de productos)
      if (key === "F10") {
        event.preventDefault()
        if (location.pathname !== "/stock") {
          navigate("/stock")
          showToast("Navegando a Gestión de Stock", "info")
        }
        return
      }

      // F12 - Cerrar sesión
      if (key === "F12") {
        event.preventDefault()
        
        // Confirmar cierre de sesión
        const confirmed = window.confirm("¿Estás seguro de que deseas cerrar sesión?")
        if (confirmed) {
          try {
            await logout()
            navigate("/login")
            showToast("Sesión cerrada correctamente", "success")
          } catch (error) {
            console.error("Error al cerrar sesión:", error)
            showToast("Error al cerrar sesión", "error")
          }
        }
        return
      }
    },
    [navigate, location, logout, showToast]
  )

  useEffect(() => {
    // Agregar event listener cuando el componente se monta
    document.addEventListener("keydown", handleKeyPress)

    // Limpiar event listener cuando el componente se desmonta
    return () => {
      document.removeEventListener("keydown", handleKeyPress)
    }
  }, [handleKeyPress])

  // Retornar información sobre los atajos disponibles
  return {
    shortcuts: [
      { key: "F1", action: "Ir a Ventas", path: "/ventas" },
      { key: "F6", action: "Ver Cierre de Caja", path: "/caja" },
      { key: "F10", action: "Carga de Productos", path: "/stock" },
      { key: "F12", action: "Cerrar Sesión", path: null },
    ],
  }
}
