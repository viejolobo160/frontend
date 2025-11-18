import { useState, useEffect } from 'react'
import { useToast } from '@/contexts/ToastContext'
import Button from '@/components/common/Button'
import LoadingButton from '@/components/common/LoandingButton'
import { PrinterIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import api from '@/config/api'

export default function PrinterConfigModal({ isOpen, onClose, onPrinterSelected }) {
  const { showToast } = useToast()
  const [printers, setPrinters] = useState([])
  const [selectedPrinter, setSelectedPrinter] = useState(null)
  const [loading, setLoading] = useState(false)
  const [detectingPrinters, setDetectingPrinters] = useState(false)
  const [printerStatus, setPrinterStatus] = useState(null)
  const [step, setStep] = useState('detect') // detect, select, test

  useEffect(() => {
    if (isOpen) {
      checkPrinterStatus()
    }
  }, [isOpen])

  const checkPrinterStatus = async () => {
    try {
      const response = await api.get('/ticket/printers/status')
      if (response.data.success) {
        setPrinterStatus(response.data.data)
        if (response.data.data.connected) {
          setStep('test')
        }
      }
    } catch (error) {
      console.error('Error checking printer status:', error)
    }
  }

  const detectPrinters = async () => {
    setDetectingPrinters(true)
    try {
      const response = await api.get('/ticket/printers/detect')
      if (response.data.success) {
        setPrinters(response.data.data)
        if (response.data.data.length === 0) {
          showToast('No se detectaron impresoras. Conecte una impresora USB y vuelva a intentar.', 'warning')
        } else {
          showToast(`Se detectaron ${response.data.data.length} impresora(s)`, 'success')
          setStep('select')
        }
      }
    } catch (error) {
      console.error('Error detecting printers:', error)
      showToast('Error al detectar impresoras: ' + error.message, 'error')
    } finally {
      setDetectingPrinters(false)
    }
  }

  const connectPrinter = async (printer) => {
    setLoading(true)
    try {
      const response = await api.post('/ticket/printers/connect', {
        portPath: printer.path,
        baudRate: 9600
      })
      
      if (response.data.success) {
        setSelectedPrinter(printer)
        setPrinterStatus({
          connected: true,
          portName: printer.path
        })
        showToast(`Impresora conectada: ${printer.path}`, 'success')
        setStep('test')
      }
    } catch (error) {
      console.error('Error connecting printer:', error)
      showToast('Error al conectar impresora: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const testPrint = async () => {
    setLoading(true)
    try {
      const response = await api.post('/ticket/printers/test')
      if (response.data.success) {
        showToast('Ticket de prueba enviado a la impresora', 'success')
        if (onPrinterSelected && selectedPrinter) {
          onPrinterSelected({
            name: selectedPrinter.path,
            type: 'USB',
            path: selectedPrinter.path,
            lastConnection: new Date().toISOString()
          })
        }
        onClose()
      }
    } catch (error) {
      console.error('Error testing printer:', error)
      showToast('Error al imprimir ticket de prueba: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <PrinterIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Configurar Impresora Térmica</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step: Detect */}
          {step === 'detect' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Conecte su impresora térmica USB a la computadora y presione "Detectar impresoras".
              </p>
              
              {printerStatus?.connected && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-green-900">Impresora conectada</p>
                    <p className="text-green-700 text-xs">{printerStatus.portName}</p>
                  </div>
                </div>
              )}

              <LoadingButton
                onClick={detectPrinters}
                loading={detectingPrinters}
                className="w-full"
              >
                Detectar Impresoras
              </LoadingButton>
            </div>
          )}

          {/* Step: Select */}
          {step === 'select' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Seleccione la impresora a utilizar:
              </p>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {printers.map((printer) => (
                  <button
                    key={printer.path}
                    onClick={() => connectPrinter(printer)}
                    disabled={loading}
                    className={`w-full text-left p-3 rounded-lg border-2 transition ${
                      selectedPrinter?.path === printer.path
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">
                          {printer.manufacturer || 'Dispositivo USB'}
                        </p>
                        <p className="text-xs text-gray-500">{printer.path}</p>
                        {printer.serialNumber && (
                          <p className="text-xs text-gray-500">SN: {printer.serialNumber}</p>
                        )}
                      </div>
                      {loading && selectedPrinter?.path === printer.path && (
                        <div className="animate-spin">
                          <PrinterIcon className="h-5 w-5 text-blue-600" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {printers.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-3">
                  <p className="text-sm text-yellow-800">
                    No se encontraron impresoras. Verifique la conexión USB.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => setStep('detect')}
                  variant="outline"
                  className="flex-1"
                >
                  Volver
                </Button>
              </div>
            </div>
          )}

          {/* Step: Test */}
          {step === 'test' && (
            <div className="space-y-4">
              {selectedPrinter ? (
                <>
                  <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    <div className="text-sm">
                      <p className="font-medium text-green-900">Impresora conectada</p>
                      <p className="text-green-700 text-xs">{selectedPrinter.path}</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600">
                    Presione el botón de abajo para realizar una prueba de impresión:
                  </p>

                  <LoadingButton
                    onClick={testPrint}
                    loading={loading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Imprimir Prueba
                  </LoadingButton>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    La impresora está conectada. Presione el botón para realizar una prueba de impresión:
                  </p>

                  <LoadingButton
                    onClick={testPrint}
                    loading={loading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Imprimir Prueba
                  </LoadingButton>
                </>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => setStep('detect')}
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                >
                  Cambiar Impresora
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
