"use client"

import { useState, useEffect } from "react"
import { Dialog, Transition } from "@headlessui/react"
import { Fragment } from "react"
import { useSalesStore } from "../../stores/salesStore"
import { useConfigStore } from "../../stores/configStore"
import { formatCurrency, formatDateTime, formatQuantity } from "../../lib/formatters"
import { useToast } from "../../contexts/ToastContext"
import ticketPrintService from "../../services/ticketPrintService"
import escposService from "../../services/escposService"
import {
  XMarkIcon,
  UserIcon,
  CreditCardIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  DevicePhoneMobileIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PrinterIcon,
  DocumentDuplicateIcon,
  ScaleIcon,
  CubeIcon,
  EyeIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline"
import LoadingSpinner from "../common/LoadingSpinner"
import Button from "../common/Button"

const SaleDetailModal = ({ isOpen, onClose, saleId, onSaleUpdated }) => {
  const { fetchSaleById, cancelSale, loading } = useSalesStore()
  const { businessConfig, ticketConfig, fetchBusinessConfig, fetchTicketConfig } = useConfigStore()
  const { showToast } = useToast()
  const [sale, setSale] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelLoading, setCancelLoading] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [printCopies, setPrintCopies] = useState(1)

  useEffect(() => {
    if (isOpen && saleId) {
      loadSaleDetail()
      if (!businessConfig?.business_name) {
        fetchBusinessConfig()
      }
      if (!ticketConfig?.enable_print) {
        fetchTicketConfig()
      }
    }
  }, [isOpen, saleId])

  useEffect(() => {
    if (showPrintModal && ticketConfig?.copies_count) {
      setPrintCopies(ticketConfig.copies_count)
    }
  }, [showPrintModal, ticketConfig])

  const loadSaleDetail = async () => {
    setLoadingDetail(true)
    try {
      const saleData = await fetchSaleById(saleId)
      setSale(saleData)
    } catch (error) {
      showToast("Error al cargar los detalles de la venta", "error")
      onClose()
    } finally {
      setLoadingDetail(false)
    }
  }

  const handlePrintTicket = async () => {
    if (!sale) return

    setPrinting(true)
    try {
      console.log('[v0] Iniciando impresión ESC/POS desde reportes...', { saleId: sale.id, printCopies })

      for (let i = 0; i < printCopies; i++) {
        console.log('[v0] Imprimiendo copia', i + 1, 'de', printCopies)
        
        const api = (await import('@/config/api')).default
        const response = await api.post('/ticket/print-escpos', {
          saleId: sale.id,
          businessConfig,
          ticketConfig
        })

        console.log('[v0] Respuesta del backend:', response.data)

        if (!response.data.success) {
          throw new Error(response.data.message || 'Error al imprimir')
        }

        if (response.data.data?.commands) {
          
          // Determine print method based on configuration
          let printResult = null
          const printMethod = ticketConfig?.print_method || 'preview' // Fallback to preview
          
          console.log('[v0] Usando método de impresión:', printMethod)
          
          switch(printMethod) {
            case 'serial':
              try {
                printResult = await escposService.printViaSerialPort(response.data.data.commands)
              } catch (serialError) {
                console.warn('[v0] Error Serial USB, intentando fallback...')
                printResult = await escposService.printViaPreview(response.data.data.commands)
              }
              break
              
            case 'bluetooth':
              try {
                printResult = await escposService.printViaBluetooth(response.data.data.commands)
              } catch (bluetoothError) {
                console.warn('[v0] Error Bluetooth, intentando fallback...')
                printResult = await escposService.printViaPreview(response.data.data.commands)
              }
              break
              
            case 'localserver':
              try {
                const localServerUrl = ticketConfig?.local_printer_url || 'http://localhost:9100'
                printResult = await escposService.printViaLocalServer(response.data.data.commands, localServerUrl)
              } catch (serverError) {
                console.warn('[v0] Error Local Server, intentando fallback...')
                printResult = await escposService.printViaPreview(response.data.data.commands)
              }
              break
              
            case 'preview':
            default:
              printResult = await escposService.printViaPreview(response.data.data.commands)
              break
          }
          
          console.log('[v0] Resultado de impresión:', printResult)
        }

        if (i < printCopies - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      showToast(
        printCopies > 1 ? `Se imprimieron ${printCopies} copias correctamente` : "El ticket se imprimió correctamente",
        "success"
      )

      setShowPrintModal(false)
    } catch (error) {
      console.error("[v0] Error al imprimir:", error)
      showToast(error.response?.data?.message || error.message || "No se pudo imprimir el ticket", "error")
    } finally {
      setPrinting(false)
    }
  }

  const handlePreviewTicket = async () => {
    if (!sale) return

    try {
      const api = (await import('@/config/api')).default
      const response = await api.post('/ticket/print-escpos', {
        saleId: sale.id,
        businessConfig,
        ticketConfig,
        preview: true
      })

      if (response.data.success) {
        const previewWindow = window.open('', 'THERMAL_PREVIEW', 'width=400,height=600')
        previewWindow.document.write(`
          <html>
          <head>
            <title>Vista Previa Ticket</title>
            <style>
              body { font-family: 'Courier New', monospace; margin: 20px; background: #f5f5f5; }
              .ticket { width: 280px; border: 1px solid #ccc; padding: 10px; background: white; margin: auto; }
              pre { font-size: 11px; white-space: pre-wrap; margin: 0; line-height: 1.4; }
            </style>
          </head>
          <body>
            <div class="ticket">
              <pre>${response.data.data.previewText || 'No disponible'}</pre>
            </div>
          </body>
          </html>
        `)
        previewWindow.document.close()
      }
    } catch (error) {
      console.error('Error en vista previa:', error)
      showToast("No se pudo mostrar la vista previa", "error")
    }
  }

  const handleDownloadTicket = () => {
    showToast("Descarga no disponible para tickets térmicos", "info")
  }

  const handleCancelSale = async () => {
    if (!cancelReason.trim()) {
      showToast("Debe ingresar una razón para cancelar la venta", "error")
      return
    }

    setCancelLoading(true)
    try {
      await cancelSale(sale.id, cancelReason)
      showToast("Venta cancelada exitosamente", "success")
      setShowCancelConfirm(false)
      setCancelReason("")
      
      if (onSaleUpdated) {
        onSaleUpdated()
      }
      
      await loadSaleDetail()
    } catch (error) {
      console.error("Error al cancelar venta:", error)
      showToast(error.response?.data?.message || "Error al cancelar la venta", "error")
    } finally {
      setCancelLoading(false)
    }
  }

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case "efectivo":
        return <BanknotesIcon className="h-5 w-5" />
      case "tarjeta_credito":
        return <CreditCardIcon className="h-5 w-5" />
      case "transferencia":
        return <BuildingLibraryIcon className="h-5 w-5" />
      case "cuenta_corriente":
        return <DevicePhoneMobileIcon className="h-5 w-5" />
      default:
        return <CreditCardIcon className="h-5 w-5" />
    }
  }

  const getPaymentMethodLabel = (method) => {
    const labels = {
      efectivo: "Efectivo",
      tarjeta_credito: "Tarjeta de Crédito",
      transferencia: "Transferencia",
      cuenta_corriente: "Cuenta Corriente",
    }
    return labels[method] || method
  }

  const renderPaymentMethodsDetail = (sale) => {
    if (sale.payment_method === "multiple" && sale.payment_methods_formatted) {
      return (
        <div className="space-y-3">
          <h5 className="text-sm font-medium text-gray-900">Métodos de Pago Múltiples</h5>
          <div className="space-y-2">
            {sale.payment_methods_formatted.map((pm, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  {getPaymentMethodIcon(pm.method)}
                  <span className="ml-2 text-sm font-medium">{getPaymentMethodLabel(pm.method)}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(pm.amount)}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">Total:</span>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(sale.total)}</span>
            </div>
          </div>
        </div>
      )
    } else {
      return (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            {getPaymentMethodIcon(sale.payment_method)}
            <span className="ml-2 text-sm font-medium">{getPaymentMethodLabel(sale.payment_method)}</span>
          </div>
          <span className="text-sm font-bold text-gray-900">{formatCurrency(sale.total)}</span>
        </div>
      )
    }
  }

  const getStatusBadge = (status) => {
    if (status === "completed") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircleIcon className="h-4 w-4 mr-1" />
          Completada
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircleIcon className="h-4 w-4 mr-1" />
          Cancelada
        </span>
      )
    }
  }

  const handlePrint = () => {
    if (ticketConfig?.enable_print) {
      setShowPrintModal(true)
    } else {
      window.print()
    }
  }

  const handleCopyToClipboard = () => {
    let paymentInfo = ""
    if (sale.payment_method === "multiple" && sale.payment_methods_formatted) {
      paymentInfo = sale.payment_methods_formatted
        .map((pm) => `${getPaymentMethodLabel(pm.method)}: ${formatCurrency(pm.amount)}`)
        .join(", ")
    } else {
      paymentInfo = getPaymentMethodLabel(sale.payment_method)
    }

    const saleInfo = `
      Venta #${sale.id}
      Fecha: ${formatDateTime(sale.created_at)}
      Cliente: ${sale.customer_name || "Cliente general"}
      Método de pago: ${paymentInfo}
      Total: ${formatCurrency(sale.total)}
      Estado: ${sale.status === "completed" ? "Completada" : "Cancelada"}
    `.trim()

    navigator.clipboard.writeText(saleInfo).then(() => {
      showToast("Información copiada al portapapeles", "success")
    })
  }

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all flex flex-col max-h-[95vh]">
                  <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                          <EyeIcon className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div>
                        <Dialog.Title as="h3" className="text-xl font-semibold text-gray-900">
                          Detalle de Venta #{saleId}
                        </Dialog.Title>
                        <div className="flex items-center space-x-2 mt-1">
                          {sale && getStatusBadge(sale.status)}
                          <span className="text-sm text-gray-500">
                            {sale && formatDateTime(sale.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleCopyToClipboard}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                        title="Copiar información"
                      >
                        <DocumentDuplicateIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handlePrint}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                        title="Imprimir"
                      >
                        <PrinterIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    {loadingDetail ? (
                      <div className="flex items-center justify-center py-12">
                        <LoadingSpinner size="lg" />
                        <span className="ml-3 text-gray-600">Cargando detalles...</span>
                      </div>
                    ) : sale ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                            <div className="flex items-center mb-4">
                              <CheckCircleIcon className="h-6 w-6 text-blue-600 mr-3" />
                              <h4 className="text-lg font-semibold text-blue-900">Información de la Venta</h4>
                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-sm text-blue-700">Fecha:</span>
                                <span className="text-sm font-medium text-blue-900">{formatDateTime(sale.created_at)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-blue-700">Cajero:</span>
                                <span className="text-sm font-medium text-blue-900">{sale.cashier_name || "Sistema"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-blue-700">Estado:</span>
                                <span className="text-sm font-medium text-blue-900">
                                  {sale.status === "completed" ? "Completada" : "Cancelada"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                            <div className="flex items-center mb-4">
                              <UserIcon className="h-6 w-6 text-green-600 mr-3" />
                              <h4 className="text-lg font-semibold text-green-900">Cliente</h4>
                            </div>
                            {sale.customer_name ? (
                              <div className="space-y-2">
                                <div className="text-sm font-medium text-green-900">{sale.customer_name}</div>
                                {sale.customer_email && <div className="text-sm text-green-700">{sale.customer_email}</div>}
                                {sale.customer_document && (
                                  <div className="text-sm text-green-700">Doc: {sale.customer_document}</div>
                                )}
                                {sale.customer_phone && (
                                  <div className="text-sm text-green-700">Tel: {sale.customer_phone}</div>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm text-green-700">Cliente general</div>
                            )}
                          </div>

                          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-100">
                            <div className="flex items-center mb-4">
                              <CreditCardIcon className="h-6 w-6 text-purple-600 mr-3" />
                              <h4 className="text-lg font-semibold text-purple-900">Resumen</h4>
                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-sm text-purple-700">Subtotal:</span>
                                <span className="text-sm font-medium text-purple-900">{formatCurrency(sale.subtotal)}</span>
                              </div>
                              {sale.discount > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-purple-700">Descuento:</span>
                                  <span className="text-sm font-medium text-red-600">-{formatCurrency(sale.discount)}</span>
                                </div>
                              )}
                              {sale.tax > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-purple-700">Impuestos:</span>
                                  <span className="text-sm font-medium text-purple-900">{formatCurrency(sale.tax)}</span>
                                </div>
                              )}
                              <div className="border-t border-purple-200 pt-3">
                                <div className="flex justify-between">
                                  <span className="text-base font-semibold text-purple-900">Total:</span>
                                  <span className="text-base font-bold text-purple-900">{formatCurrency(sale.total)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-100">
                          <div className="flex items-center mb-4">
                            <CreditCardIcon className="h-6 w-6 text-orange-600 mr-3" />
                            <h4 className="text-lg font-semibold text-orange-900">
                              {sale.payment_method === "multiple" ? "Métodos de Pago" : "Método de Pago"}
                            </h4>
                          </div>
                          {renderPaymentMethodsDetail(sale)}
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200">
                          <div className="px-6 py-4 border-b border-gray-200">
                            <h4 className="text-lg font-semibold text-gray-900">Productos Vendidos</h4>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Producto
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Cantidad
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Precio Unit.
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Subtotal
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {sale.items?.map((item, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                      <div className="flex items-center">
                                        <div className="h-10 w-10 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center mr-3">
                                          {item.product_image ? (
                                            <img
                                              src={item.product_image || "/placeholder.svg"}
                                              alt={item.product_name}
                                              className="h-full w-full object-cover"
                                            />
                                          ) : (
                                            <PhotoIcon className="h-6 w-6 text-gray-400" />
                                          )}
                                        </div>
                                        <div>
                                          <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                                          {item.product_barcode && (
                                            <div className="text-xs text-gray-500">Código: {item.product_barcode}</div>
                                          )}
                                          <div className="flex items-center text-xs text-gray-400 mt-1">
                                            {item.unit_type === "kg" ? (
                                              <>
                                                <ScaleIcon className="h-3 w-3 mr-1 text-blue-600" />
                                                <span className="text-blue-600">Por kg</span>
                                              </>
                                            ) : (
                                              <>
                                                <CubeIcon className="h-3 w-3 mr-1 text-green-600" />
                                                <span className="text-green-600">Por unidades</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                      {formatQuantity(item.quantity, item.unit_type || "unidades")}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                      {formatCurrency(item.unit_price)}
                                      {item.unit_type === "kg" && <span className="text-xs text-blue-600 ml-1">/kg</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                      {formatCurrency(item.subtotal)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {sale.notes && (
                          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">Notas</h4>
                            <p className="text-sm text-gray-700">{sale.notes}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-gray-500">No se pudieron cargar los detalles de la venta</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 p-6 border-t border-gray-100 bg-gray-50">
                    {sale && sale.status === "completed" && (
                      <Button
                        variant="outline"
                        onClick={() => setShowCancelConfirm(true)}
                        className="flex items-center text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                        Cancelar Venta
                      </Button>
                    )}
                    <div className="flex-1"></div>
                    <Button variant="outline" onClick={onClose} className="py-3 text-sm font-medium rounded-lg">
                      Cerrar
                    </Button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>

          <Transition appear show={showCancelConfirm} as={Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={() => setShowCancelConfirm(false)}>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
              </Transition.Child>

              <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                  >
                    <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                      <div className="p-6">
                        <div className="flex items-center mb-4">
                          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                          </div>
                          <div className="ml-4 text-left">
                            <h3 className="text-lg font-semibold text-gray-900">Cancelar Venta</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              Esta acción no se puede deshacer. Se revertirá el stock y los movimientos financieros.
                            </p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <label htmlFor="cancel-reason" className="block text-sm font-medium text-gray-700 mb-2">
                            Razón de la cancelación *
                          </label>
                          <textarea
                            id="cancel-reason"
                            rows={3}
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Ingrese la razón por la cual se cancela esta venta..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 p-6 border-t border-gray-100 bg-gray-50">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowCancelConfirm(false)
                            setCancelReason("")
                          }}
                          disabled={cancelLoading}
                          className="flex-1 py-3 text-sm font-medium rounded-lg"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleCancelSale}
                          loading={cancelLoading}
                          disabled={!cancelReason.trim()}
                          className="flex-1 py-3 text-sm font-medium bg-red-600 hover:bg-red-700 rounded-lg"
                        >
                          {cancelLoading ? "Cancelando..." : "Confirmar Cancelación"}
                        </Button>
                      </div>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition>
        </Dialog>
      </Transition>

      <Transition appear show={showPrintModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowPrintModal(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                        <CheckCircleIcon className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                    <div className="text-center mb-6">
                      <PrinterIcon className="mx-auto h-16 w-16 text-blue-500 mb-3" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        Imprimir Ticket
                      </h4>
                      <p className="text-sm text-gray-600">
                        ¿Desea imprimir el ticket de esta venta?
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total:</span>
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(sale?.total || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cliente:</span>
                          <span className="text-gray-900">
                            {sale?.customer_name || 'Consumidor Final'}
                          </span>
                        </div>
                        {ticketConfig?.copies_count > 1 && (
                          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                            <span className="text-gray-600">Copias:</span>
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => setPrintCopies(Math.max(1, printCopies - 1))}
                                className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                              >
                                -
                              </button>
                              <span className="font-semibold text-gray-900 w-8 text-center">
                                {printCopies}
                              </span>
                              <button
                                type="button"
                                onClick={() => setPrintCopies(Math.min(5, printCopies + 1))}
                                className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <button
                        onClick={handlePrintTicket}
                        disabled={printing}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2.5 rounded-lg flex items-center justify-center font-medium transition-colors"
                      >
                        {printing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Imprimiendo...
                          </>
                        ) : (
                          <>
                            <PrinterIcon className="h-5 w-5 mr-2" />
                            Imprimir Ticket
                          </>
                        )}
                      </button>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={handlePreviewTicket}
                          type="button"
                          className="py-2 px-3 text-sm bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
                        >
                          Vista Previa
                        </button>
                        <button
                          onClick={handleDownloadTicket}
                          type="button"
                          className="py-2 px-3 text-sm bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
                        >
                          Descargar
                        </button>
                      </div>

                      <button
                        onClick={() => setShowPrintModal(false)}
                        type="button"
                        className="w-full py-2 text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default SaleDetailModal
