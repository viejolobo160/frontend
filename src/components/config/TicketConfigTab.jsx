import { useState, useEffect } from "react"
import { useConfigStore } from "@/stores/configStore"
import { useToast } from "@/contexts/ToastContext"
import Button from "@/components/common/Button"
import LoadingButton from "@/components/common/LoadingButton"
import { ReceiptPercentIcon } from "@heroicons/react/24/outline"

const TicketConfigTab = () => {
  const { ticketConfig, updateTicketConfig, fetchTicketConfig, loading } = useConfigStore()
  const { showToast } = useToast()
  const [formData, setFormData] = useState(ticketConfig)

  useEffect(() => {
    fetchTicketConfig()
  }, [])

  useEffect(() => {
    setFormData(ticketConfig)
  }, [ticketConfig])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const result = await updateTicketConfig(formData)
    
    if (result?.success) {
      showToast("La configuración de tickets se ha actualizado correctamente", "success", {
        title: "Configuración guardada"
      })
    } else {
      showToast(result?.error || "No se pudo actualizar la configuración", "error", {
        title: "Error"
      })
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <ReceiptPercentIcon className="h-6 w-6 text-blue-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Configuración de Tickets</h3>
            <p className="text-sm text-gray-500">
              Personaliza el formato y contenido de tus tickets térmicos
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="space-y-8">
          {/* Configuración General */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Configuración General</h4>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enable_print"
                  name="enable_print"
                  checked={formData.enable_print}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="enable_print" className="ml-2 block text-sm text-gray-700">
                  Habilitar impresión de tickets
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto_print"
                  name="auto_print"
                  checked={formData.auto_print}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="auto_print" className="ml-2 block text-sm text-gray-700">
                  Imprimir automáticamente (sin preguntar)
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la impresora
                  </label>
                  <input
                    type="text"
                    name="printer_name"
                    value={formData.printer_name || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre de la impresora térmica"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ancho del papel
                  </label>
                  <select
                    name="paper_width"
                    value={formData.paper_width}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={58}>58mm</option>
                    <option value={80}>80mm</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Contenido del Ticket */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Contenido del Ticket</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="show_logo"
                  name="show_logo"
                  checked={formData.show_logo}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="show_logo" className="ml-2 block text-sm text-gray-700">
                  Mostrar logo
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="show_business_info"
                  name="show_business_info"
                  checked={formData.show_business_info}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="show_business_info" className="ml-2 block text-sm text-gray-700">
                  Mostrar información del negocio
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="show_cuit"
                  name="show_cuit"
                  checked={formData.show_cuit}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="show_cuit" className="ml-2 block text-sm text-gray-700">
                  Mostrar CUIT
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="show_cashier"
                  name="show_cashier"
                  checked={formData.show_cashier}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="show_cashier" className="ml-2 block text-sm text-gray-700">
                  Mostrar cajero
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="show_customer"
                  name="show_customer"
                  checked={formData.show_customer}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="show_customer" className="ml-2 block text-sm text-gray-700">
                  Mostrar cliente
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="show_payment_method"
                  name="show_payment_method"
                  checked={formData.show_payment_method}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="show_payment_method" className="ml-2 block text-sm text-gray-700">
                  Mostrar método de pago
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="show_change"
                  name="show_change"
                  checked={formData.show_change}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="show_change" className="ml-2 block text-sm text-gray-700">
                  Mostrar vuelto
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="show_barcode"
                  name="show_barcode"
                  checked={formData.show_barcode}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="show_barcode" className="ml-2 block text-sm text-gray-700">
                  Mostrar código de barras
                </label>
              </div>
            </div>
          </div>

          {/* Formato */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Formato</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tamaño de fuente
                </label>
                <select
                  name="font_size"
                  value={formData.font_size}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="small">Pequeña</option>
                  <option value="normal">Normal</option>
                  <option value="large">Grande</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de copias
                </label>
                <input
                  type="number"
                  name="copies_count"
                  value={formData.copies_count}
                  onChange={handleChange}
                  min="1"
                  max="5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Configuración Fiscal Argentina */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Configuración Fiscal (Argentina)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de comprobante
                </label>
                <select
                  name="fiscal_type"
                  value={formData.fiscal_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TICKET">Ticket</option>
                  <option value="FACTURA_A">Factura A</option>
                  <option value="FACTURA_B">Factura B</option>
                  <option value="FACTURA_C">Factura C</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="show_tax_breakdown"
                    name="show_tax_breakdown"
                    checked={formData.show_tax_breakdown}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="show_tax_breakdown" className="ml-2 block text-sm text-gray-700">
                    Mostrar desglose de IVA
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="include_cae"
                    name="include_cae"
                    checked={formData.include_cae}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="include_cae" className="ml-2 block text-sm text-gray-700">
                    Incluir CAE (AFIP)
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Método de Impresión */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Método de Impresión</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar método de impresión
                </label>
                <select
                  name="print_method"
                  value={formData.print_method || 'serial'}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="serial">Serial USB (XPrinter XP-58) - Recomendado</option>
                  <option value="bluetooth">Bluetooth</option>
                  <option value="localserver">Servidor Local (puerto 9100)</option>
                  <option value="preview">Vista Previa Solo</option>
                </select>
                <p className="text-xs text-gray-500 mt-2 space-y-1">
                  <div>• <strong>Serial USB:</strong> Para impresoras conectadas directamente por USB</div>
                  <div>• <strong>Bluetooth:</strong> Para impresoras inalámbricas</div>
                  <div>• <strong>Servidor Local:</strong> Para Zebra Print Server en red (puerto 9100)</div>
                  <div>• <strong>Vista Previa:</strong> Solo mostrar sin imprimir (útil para pruebas)</div>
                </p>
              </div>

              {/* URL del Servidor de Impresión */}
              {formData.print_method === 'localserver' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL del Servidor de Impresión
                  </label>
                  <input
                    type="text"
                    name="local_printer_url"
                    value={formData.local_printer_url || 'http://localhost:9100'}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="http://localhost:9100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Puerto 9100 es el estándar para Zebra Print Server
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Mensajes Personalizados */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Mensajes Personalizados</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensaje de encabezado
                </label>
                <textarea
                  name="header_message"
                  value={formData.header_message || ""}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mensaje opcional en el encabezado del ticket"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensaje de pie de página
                </label>
                <textarea
                  name="footer_message"
                  value={formData.footer_message || ""}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Gracias por su compra"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Política de devoluciones
                </label>
                <textarea
                  name="return_policy"
                  value={formData.return_policy || ""}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Se aceptan devoluciones dentro de los 7 días con ticket"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setFormData(ticketConfig)}
          >
            Cancelar
          </Button>
          <LoadingButton
            type="submit"
            loading={loading}
            loadingText="Guardando..."
          >
            Guardar Cambios
          </LoadingButton>
        </div>
      </form>
    </div>
  )
}

export default TicketConfigTab
