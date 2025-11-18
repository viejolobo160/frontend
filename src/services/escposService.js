/**
 * Servicio de impresión ESC/POS para el frontend
 * Se comunica con el backend para obtener los comandos ESC/POS
 */

import api from '@/config/api'

class EscposFrontendService {
  /**
   * Genera comandos ESC/POS en el backend y los retorna
   */
  async generateEscposCommands(saleId, businessConfig, ticketConfig) {
    try {
      const response = await api.post('/ticket/print-escpos', {
        saleId,
        businessConfig,
        ticketConfig
      })

      if (response.data.success) {
        return response.data.data.commands
      }
      throw new Error(response.data.message)
    } catch (error) {
      console.error('[v0] Error generando ESC/POS:', error)
      throw error
    }
  }

  /**
   * Imprime directamente usando Web Serial API (para impresoras USB/Serial)
   * Esta es la FORMA CORRECTA para XPrinter XP-58
   */
  async printViaSerialPort(escposBase64) {
    console.log('[v0] Iniciando impresión por Serial USB...')
    
    try {
      if (!navigator.serial) {
        throw new Error('Web Serial API no disponible en este navegador. Use Chrome, Edge o similar.')
      }

      const binaryString = atob(escposBase64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      console.log('[v0] Bytes a enviar:', bytes.length, 'bytes')

      // Solicitar puerto serial
      const port = await navigator.serial.requestPort({
        filters: []
      })

      console.log('[v0] Puerto seleccionado:', port)

      // Abrir puerto con configuración estándar para impresoras térmicas
      await port.open({ 
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      })

      console.log('[v0] Puerto abierto, enviando datos...')

      // Enviar datos
      const writer = port.writable.getWriter()
      await writer.write(bytes)
      writer.releaseLock()

      console.log('[v0] Datos enviados correctamente')

      // Esperar a que se procese y cerrar
      await new Promise(resolve => setTimeout(resolve, 1000))
      await port.close()

      console.log('[v0] Puerto cerrado')
      return { success: true, message: 'Ticket enviado a impresora USB correctamente' }
    } catch (error) {
      console.error('[v0] Error imprimiendo vía Serial USB:', error)
      throw error
    }
  }

  /**
   * Imprime usando Bluetooth (para impresoras inalámbricas)
   */
  async printViaBluetooth(escposBase64) {
    console.log('[v0] Iniciando impresión por Bluetooth...')
    
    try {
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth API no disponible en este navegador.')
      }

      const binaryString = atob(escposBase64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      console.log('[v0] Solicitando dispositivo Bluetooth...')

      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { name: /XPrinter/ },
          { name: /Thermal/ },
          { name: /Printer/ }
        ],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      })

      console.log('[v0] Conectando a dispositivo:', device.name)

      const server = await device.gatt.connect()
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb')
      const characteristic = await service.getCharacteristic('00002a19-0000-1000-8000-00805f9b34fb')

      console.log('[v0] Enviando datos por Bluetooth...')
      await characteristic.writeValue(bytes)

      console.log('[v0] Datos enviados correctamente')
      return { success: true, message: 'Ticket enviado a impresora Bluetooth correctamente' }
    } catch (error) {
      console.error('[v0] Error imprimiendo vía Bluetooth:', error)
      throw error
    }
  }

  /**
   * Imprime usando servidor local (para Zebra Print Server o similar)
   */
  async printViaLocalServer(escposBase64, localServerUrl = 'http://localhost:9100') {
    console.log('[v0] Iniciando impresión por servidor local:', localServerUrl)
    
    try {
      // Decodificar y preparar datos
      const binaryString = atob(escposBase64)
      
      console.log('[v0] Enviando', binaryString.length, 'bytes al servidor local')

      const response = await fetch(localServerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        body: binaryString
      })

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status} ${response.statusText}`)
      }

      console.log('[v0] Respuesta del servidor local:', response.status)
      return { success: true, message: 'Ticket enviado al servidor de impresión local' }
    } catch (error) {
      console.error('[v0] Error imprimiendo vía servidor local:', error)
      throw error
    }
  }

  /**
   * FALLBACK: Muestra preview del ticket (cuando no hay impresora disponible)
   */
  async printViaPreview(escposBase64) {
    console.log('[v0] Abriendo vista previa del ticket (fallback)')
    
    try {
      const binaryString = atob(escposBase64)
      const previewText = this.escposToText(binaryString)
      
      const previewWindow = window.open('', 'THERMAL_PREVIEW', 'width=400,height=700')
      
      if (!previewWindow) {
        throw new Error('No se pudo abrir la ventana de vista previa')
      }

      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Vista Previa Ticket Térmico</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; }
            body { 
              font-family: 'Courier New', monospace; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 20px;
              min-height: 100vh;
            }
            .container {
              max-width: 280px;
              margin: 0 auto;
            }
            .ticket { 
              background: white; 
              border: 3px solid #333;
              padding: 15px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.3);
              border-radius: 8px;
            }
            pre { 
              font-size: 11px; 
              white-space: pre-wrap;
              word-wrap: break-word;
              line-height: 1.4;
              color: #000;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffc107;
              color: #856404;
              padding: 10px;
              margin-top: 15px;
              border-radius: 4px;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="ticket">
              <pre>${previewText}</pre>
              <div class="warning">
                ⚠️ Esto es una VISTA PREVIA. Configure una impresora térmica para imprimir realmente.
              </div>
            </div>
          </div>
        </body>
        </html>
      `)
      previewWindow.document.close()

      return { success: true, message: 'Vista previa abierta (configure impresora para imprimir)' }
    } catch (error) {
      console.error('[v0] Error en vista previa:', error)
      throw error
    }
  }

  /**
   * Convierte comandos ESC/POS a texto legible
   */
  escposToText(binaryString) {
    let text = ''
    let i = 0
    
    while (i < binaryString.length) {
      const charCode = binaryString.charCodeAt(i)
      
      // Caracteres imprimibles
      if (charCode >= 32 && charCode <= 126) {
        text += binaryString.charAt(i)
      } 
      // Saltos de línea
      else if (charCode === 10) {
        text += '\n'
      } 
      // Comandos especiales (mostrarlos como referencias)
      else if (charCode === 27) {  // ESC
        text += '[ESC]'
      } 
      else if (charCode === 29) {  // GS
        text += '[GS]'
      } 
      else if (charCode === 13) {  // CR
        text += '\n'
      }
      // Caracteres de control (ignorar)
      
      i++
    }
    
    return text
  }

  /**
   * Obtiene métodos de impresión disponibles
   */
  getAvailablePrintMethods() {
    const methods = []
    
    if (navigator.serial) {
      methods.push({ value: 'serial', label: 'Serial USB (Recomendado)' })
    }
    
    if (navigator.bluetooth) {
      methods.push({ value: 'bluetooth', label: 'Bluetooth' })
    }
    
    methods.push({ value: 'localserver', label: 'Servidor Local' })
    methods.push({ value: 'preview', label: 'Vista Previa Solo' })
    
    return methods
  }
}

export default new EscposFrontendService()
