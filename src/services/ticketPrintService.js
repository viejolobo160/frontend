// Servicio de impresión de tickets térmicos para Argentina
import { formatCurrency, formatDate } from "@/lib/formatters"

class TicketPrintService {
  constructor() {
    this.printerName = null
    this.paperWidth = 58 // 58mm por defecto para térmica
    this.apiUrl = import.meta.env.VITE_API_URL
  }

  /**
   * Configura el servicio de impresión
   */
  configure(printerName, paperWidth = 58) {
    this.printerName = printerName
    this.paperWidth = paperWidth
  }

  /**
   * Genera un PDF térmico real de 58mm desde el backend
   */
  async generateThermalPDF(saleData, businessConfig, ticketConfig) {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }

      const response = await fetch(`${this.apiUrl}/config/ticket/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          saleData,
          businessConfig,
          ticketConfig
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Error ${response.status}: No se pudo generar el PDF`)
      }

      // Obtener el PDF como blob
      const pdfBlob = await response.blob()
      
      return {
        success: true,
        blob: pdfBlob
      }
    } catch (error) {
      console.error('Error generando PDF térmico:', error)
      return {
        success: false,
        error: error.message || 'Error al generar el PDF térmico'
      }
    }
  }

  /**
   * Genera el PDF térmico y lo abre automáticamente para impresión
   */
  async printTicket(saleData, businessConfig, ticketConfig) {
    try {
      // Generar PDF desde el backend
      const result = await this.generateThermalPDF(saleData, businessConfig, ticketConfig)
      
      if (!result.success) {
        throw new Error(result.error)
      }

      // Crear URL del blob
      const pdfUrl = URL.createObjectURL(result.blob)
      
      // Abrir en nueva ventana para imprimir
      const printWindow = window.open(pdfUrl, '_blank')
      
      if (!printWindow) {
        throw new Error('No se pudo abrir la ventana de impresión. Verifique que las ventanas emergentes estén habilitadas.')
      }

      // Limpiar la URL después de un tiempo
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl)
      }, 60000) // 1 minuto

      return { success: true }
    } catch (error) {
      console.error('Error al imprimir ticket:', error)
      return { 
        success: false, 
        error: error.message || 'Error al imprimir el ticket'
      }
    }
  }

  /**
   * Vista previa del ticket PDF en una nueva ventana
   */
  async previewTicket(saleData, businessConfig, ticketConfig) {
    try {
      // Generar PDF desde el backend
      const result = await this.generateThermalPDF(saleData, businessConfig, ticketConfig)
      
      if (!result.success) {
        throw new Error(result.error)
      }

      // Crear URL del blob
      const pdfUrl = URL.createObjectURL(result.blob)
      
      // Abrir en nueva ventana
      const previewWindow = window.open(pdfUrl, '_blank')
      
      if (!previewWindow) {
        throw new Error('No se pudo abrir la ventana de vista previa. Verifique que las ventanas emergentes estén habilitadas.')
      }

      // Limpiar la URL después de un tiempo
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl)
      }, 60000) // 1 minuto
      
      return { success: true }
    } catch (error) {
      console.error('Error al mostrar vista previa:', error)
      return { 
        success: false, 
        error: error.message || 'Error al mostrar vista previa del ticket'
      }
    }
  }

  /**
   * Descarga el ticket como PDF térmico
   */
  async downloadTicket(saleData, businessConfig, ticketConfig) {
    try {
      // Generar PDF desde el backend
      const result = await this.generateThermalPDF(saleData, businessConfig, ticketConfig)
      
      if (!result.success) {
        throw new Error(result.error)
      }

      // Crear URL del blob y descargarlo
      const pdfUrl = URL.createObjectURL(result.blob)
      const a = document.createElement('a')
      a.href = pdfUrl
      a.download = `ticket-${saleData.sale.id}-${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      // Limpiar la URL
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl)
      }, 1000)
      
      return { success: true }
    } catch (error) {
      console.error('Error al descargar ticket:', error)
      return { 
        success: false, 
        error: error.message || 'Error al descargar el ticket'
      }
    }
  }

  /**
   * Genera el HTML del ticket para impresión (DEPRECADO - solo para compatibilidad)
   * @deprecated Usar generateThermalPDF en su lugar
   */
  generateTicketHTML(saleData, businessConfig, ticketConfig) {
    const { sale, items } = saleData
    const width = this.paperWidth === 58 ? '220px' : '300px'
    
    // Determinar tamaño de fuente
    const fontSize = ticketConfig.font_size === 'small' ? '10px' : 
                     ticketConfig.font_size === 'large' ? '14px' : '12px'

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @media print {
            @page {
              margin: 0;
              size: ${this.paperWidth}mm auto;
            }
            body {
              margin: 0;
              padding: 0;
            }
          }
          
          body {
            font-family: 'Courier New', monospace;
            font-size: ${fontSize};
            line-height: 1.4;
            width: ${width};
            margin: 0 auto;
            padding: 10px;
            color: #000;
          }
          
          .ticket {
            width: 100%;
          }
          
          .center {
            text-align: center;
          }
          
          .bold {
            font-weight: bold;
          }
          
          .separator {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
          
          .double-separator {
            border-top: 2px solid #000;
            margin: 8px 0;
          }
          
          .header {
            text-align: center;
            margin-bottom: 10px;
          }
          
          .business-name {
            font-size: ${ticketConfig.font_size === 'small' ? '14px' : 
                         ticketConfig.font_size === 'large' ? '18px' : '16px'};
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .info-line {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          
          .item-row {
            margin: 5px 0;
          }
          
          .item-name {
            font-weight: bold;
          }
          
          .item-details {
            display: flex;
            justify-content: space-between;
            font-size: ${ticketConfig.font_size === 'small' ? '9px' : 
                         ticketConfig.font_size === 'large' ? '13px' : '11px'};
          }
          
          .total-section {
            margin-top: 10px;
            font-weight: bold;
          }
          
          .footer {
            text-align: center;
            margin-top: 15px;
            font-size: ${ticketConfig.font_size === 'small' ? '9px' : 
                         ticketConfig.font_size === 'large' ? '13px' : '11px'};
          }
          
          .barcode {
            text-align: center;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="ticket">
    `

    // Encabezado con información del negocio
    if (ticketConfig.show_business_info && businessConfig) {
      html += `<div class="header">`
      
      if (ticketConfig.show_logo && businessConfig.business_logo) {
        html += `<img src="${businessConfig.business_logo}" style="max-width: 80px; margin-bottom: 5px;" alt="Logo">`
      }
      
      html += `
        <div class="business-name">${businessConfig.business_name || 'MI NEGOCIO'}</div>
      `
      
      if (businessConfig.business_address) {
        html += `<div>${businessConfig.business_address}</div>`
      }
      
      if (businessConfig.business_phone) {
        html += `<div>Tel: ${businessConfig.business_phone}</div>`
      }
      
      if (ticketConfig.show_cuit && businessConfig.business_cuit) {
        html += `<div>CUIT: ${businessConfig.business_cuit}</div>`
      }
      
      if (businessConfig.business_email) {
        html += `<div>${businessConfig.business_email}</div>`
      }
      
      html += `</div>`
    }

    // Mensaje de encabezado personalizado
    if (ticketConfig.header_message) {
      html += `
        <div class="separator"></div>
        <div class="center">${ticketConfig.header_message}</div>
      `
    }

    html += `<div class="double-separator"></div>`

    // Tipo fiscal y número de comprobante
    html += `
      <div class="center bold">
        ${ticketConfig.fiscal_type || 'TICKET'} #${sale.id}
      </div>
      <div class="center">
        ${formatDate(sale.created_at, 'DD/MM/YYYY HH:mm')}
      </div>
    `

    html += `<div class="separator"></div>`

    // Información del cliente
    if (ticketConfig.show_customer && sale.customer_name && sale.customer_name !== 'Consumidor Final') {
      html += `
        <div class="info-line">
          <span>Cliente:</span>
          <span>${sale.customer_name}</span>
        </div>
      `
      
      if (sale.customer_document) {
        html += `
          <div class="info-line">
            <span>DNI/CUIT:</span>
            <span>${sale.customer_document}</span>
          </div>
        `
      }
    }

    // Información del cajero
    if (ticketConfig.show_cashier && sale.cashier_name) {
      html += `
        <div class="info-line">
          <span>Cajero:</span>
          <span>${sale.cashier_name}</span>
        </div>
      `
    }

    html += `<div class="separator"></div>`

    // Detalle de productos
    html += `<div class="bold">DETALLE DE COMPRA</div>`
    html += `<div class="separator"></div>`

    items.forEach(item => {
      const quantity = Number.parseFloat(item.quantity)
      const unitPrice = Number.parseFloat(item.unit_price)
      const totalPrice = Number.parseFloat(item.quantity) * Number.parseFloat(item.unit_price)
      
      // Determinar unidad
      const unit = item.product_unit_type === 'kg' ? 'kg' : 'un'
      
      html += `
        <div class="item-row">
          <div class="item-name">${item.product_name}</div>
          <div class="item-details">
            <span>${quantity} ${unit} x ${formatCurrency(unitPrice)}</span>
            <span>${formatCurrency(totalPrice)}</span>
          </div>
        </div>
      `
    })

    html += `<div class="double-separator"></div>`

    // Totales
    const subtotal = Number.parseFloat(sale.subtotal)
    const tax = Number.parseFloat(sale.tax || 0)
    const total = Number.parseFloat(sale.total)

    html += `
      <div class="info-line">
        <span>Subtotal:</span>
        <span>${formatCurrency(subtotal)}</span>
      </div>
    `

    // Desglose de IVA si está habilitado
    if (ticketConfig.show_tax_breakdown && tax > 0) {
      html += `
        <div class="info-line">
          <span>IVA (21%):</span>
          <span>${formatCurrency(tax)}</span>
        </div>
      `
    }

    html += `
      <div class="double-separator"></div>
      <div class="info-line total-section" style="font-size: ${ticketConfig.font_size === 'small' ? '12px' : 
                                                              ticketConfig.font_size === 'large' ? '16px' : '14px'};">
        <span>TOTAL:</span>
        <span>${formatCurrency(total)}</span>
      </div>
    `

    // Método de pago
    if (ticketConfig.show_payment_method) {
      html += `<div class="separator"></div>`
      
      if (sale.payment_method === 'multiple' && sale.payment_methods_formatted) {
        html += `<div class="bold">FORMAS DE PAGO:</div>`
        sale.payment_methods_formatted.forEach(pm => {
          const methodLabel = this.getPaymentMethodLabel(pm.method)
          html += `
            <div class="info-line">
              <span>${methodLabel}:</span>
              <span>${formatCurrency(pm.amount)}</span>
            </div>
          `
        })
      } else {
        const methodLabel = this.getPaymentMethodLabel(sale.payment_method)
        html += `
          <div class="info-line">
            <span>Forma de pago:</span>
            <span>${methodLabel}</span>
          </div>
        `
      }
    }

    // CAE (AFIP) si está configurado
    if (ticketConfig.include_cae && sale.cae) {
      html += `
        <div class="separator"></div>
        <div class="center">
          <div>CAE: ${sale.cae}</div>
          <div>Vto. CAE: ${sale.cae_expiration}</div>
        </div>
      `
    }

    // Código de barras si está habilitado
    if (ticketConfig.show_barcode) {
      html += `
        <div class="barcode">
          <svg id="barcode-${sale.id}"></svg>
        </div>
      `
    }

    // Política de devoluciones
    if (ticketConfig.return_policy) {
      html += `
        <div class="double-separator"></div>
        <div class="footer">
          <div class="bold">POLÍTICA DE DEVOLUCIONES</div>
          <div>${ticketConfig.return_policy}</div>
        </div>
      `
    }

    // Mensaje de pie de página
    if (ticketConfig.footer_message || businessConfig.business_footer_message) {
      html += `
        <div class="double-separator"></div>
        <div class="footer">
          ${ticketConfig.footer_message || businessConfig.business_footer_message}
        </div>
      `
    }

    // Información adicional del negocio
    if (businessConfig.business_slogan) {
      html += `
        <div class="footer">
          ${businessConfig.business_slogan}
        </div>
      `
    }

    if (businessConfig.business_website) {
      html += `
        <div class="footer">
          ${businessConfig.business_website}
        </div>
      `
    }

    html += `
        </div>
      </body>
      </html>
    `

    return html
  }

  /**
   * Obtiene la etiqueta legible del método de pago
   */
  getPaymentMethodLabel(method) {
    const labels = {
      efectivo: 'Efectivo',
      tarjeta_credito: 'Tarjeta de Crédito',
      tarjeta_debito: 'Tarjeta de Débito',
      transferencia: 'Transferencia',
      cuenta_corriente: 'Cuenta Corriente',
      multiple: 'Múltiples'
    }
    return labels[method] || method
  }
}

// Exportar instancia única
const ticketPrintService = new TicketPrintService()
export default ticketPrintService
