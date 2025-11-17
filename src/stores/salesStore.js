import { create } from "zustand"
import { salesService } from "../services/salesService"
import { useProductStore } from "./productStore"
import { useCashStore } from "./cashStore"
import { PAYMENT_METHODS } from "@/lib/constants"
import { validateQuantity } from "@/lib/formatters"

export const useSalesStore = create((set, get) => ({
  // Estado del carrito
  cart: [],
  cartTotal: 0,
  cartDiscount: 0,
  cartTax: 0,

  // Estado de la venta actual
  currentSale: null,
  customer: null,
  paymentMethod: PAYMENT_METHODS.EFECTIVO,

  // ACTUALIZADO: Estado para múltiples métodos de pago
  multiplePaymentMode: false,
  paymentMethods: [],

  // NUEVO: Estado para modal de cantidad
  showQuantityModal: false,
  selectedProduct: null,

  showTicketPrintModal: false,
  lastCompletedSale: null,

  // Historial de ventas con paginación
  sales: [],
  loading: false,
  error: null,
  lastFetch: null,
  lastParamsKey: null,
  pagination: {
    page: 1,
    limit: 25,
    total: 0,
    pages: 0,
  },

  // Estadísticas
  stats: {
    general: {},
    payment_methods: [],
    top_products: [],
    top_customers: [],
    hourly_stats: [],
  },
  lastFetchStats: null,

  // Estado de UI
  showPaymentModal: false,

  // Acciones básicas
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  setShowPaymentModal: (show) => set({ showPaymentModal: show }),

  // NUEVO: Acciones para modal de cantidad
  setShowQuantityModal: (show) => set({ showQuantityModal: show }),
  setSelectedProduct: (product) => set({ selectedProduct: product }),

  setShowTicketPrintModal: (show) => set({ showTicketPrintModal: show }),
  setLastCompletedSale: (sale) => set({ lastCompletedSale: sale }),

  // Función para abrir modal de cantidad con producto
  openQuantityModal: (product) => {
    set({
      selectedProduct: product,
      showQuantityModal: true
    })
  },

  // CORREGIDO: Validar que la caja esté abierta
  validateCashOpen: () => {
    const cashStore = useCashStore.getState()
    return cashStore.currentCash.isOpen
  },

  // Acciones para múltiples métodos de pago
  setMultiplePaymentMode: (enabled) => {
    set((state) => {
      if (enabled) {
        // Al activar modo múltiple, inicializar con el método actual
        const initialPayments = [
          {
            method: state.paymentMethod,
            amount: state.cartTotal - state.cartDiscount + state.cartTax,
            data: {},
          },
        ]
        return {
          multiplePaymentMode: true,
          paymentMethods: initialPayments,
        }
      } else {
        // Al desactivar, limpiar métodos múltiples
        return {
          multiplePaymentMode: false,
          paymentMethods: [],
        }
      }
    })
  },

  addPaymentMethod: (method, amount = 0) => {
    set((state) => {
      const newPaymentMethods = [
        ...state.paymentMethods,
        {
          method,
          amount,
          data: {},
        },
      ]
      return { paymentMethods: newPaymentMethods }
    })
  },

  updatePaymentMethod: (index, updates) => {
    set((state) => {
      const newPaymentMethods = [...state.paymentMethods]
      newPaymentMethods[index] = { ...newPaymentMethods[index], ...updates }
      return { paymentMethods: newPaymentMethods }
    })
  },

  removePaymentMethod: (index) => {
    set((state) => {
      const newPaymentMethods = state.paymentMethods.filter((_, i) => i !== index)
      return { paymentMethods: newPaymentMethods }
    })
  },

  // ACTUALIZADO: Acciones del carrito con soporte para unidades de medida y total exacto
  addToCart: (product, quantity, itemTotalPrice) => { // itemTotalPrice is the finalAmount from QuantityModal
    set((state) => {
      // Validate quantity against product stock
      if (quantity > product.stock) {
        console.warn(`Stock insuficiente para ${product.name}. Disponible: ${product.stock}, Solicitado: ${quantity}`);
        return state;
      }
      // Validate quantity format (e.g., for kg products, ensure it's valid decimal)
      if (!validateQuantity(quantity, product.unit_type)) {
        console.warn(`Cantidad inválida para producto ${product.name}: ${quantity}`);
        return state;
      }

      const existingItemIndex = state.cart.findIndex((item) => item.id === product.id);

      let newCart;
      let itemToAddOrUpdate = {
        ...product,
        quantity: quantity, // This is the final, rounded quantity from QuantityModal
        totalPrice: itemTotalPrice, // This is the final, rounded total amount for the item from QuantityModal
        unit_type: product.unit_type || "unidades",
      };

      if (existingItemIndex !== -1) {
        // If item exists, replace it with the new calculated quantity and total price from the modal.
        // This assumes the modal is always used to set the *exact* quantity/amount for an item.
        newCart = state.cart.map((item, index) => (index === existingItemIndex ? itemToAddOrUpdate : item));
      } else {
        // Add new item
        newCart = [...state.cart, itemToAddOrUpdate];
      }

      // Recalculate cartTotal by summing totalPrice of all items
      const cartTotal = newCart.reduce((sum, item) => sum + item.totalPrice, 0);

      // Update payment methods if in multiple payment mode
      let updatedPaymentMethods = state.paymentMethods;
      if (state.multiplePaymentMode && state.paymentMethods.length > 0) {
        const finalSaleTotal = cartTotal - state.cartDiscount + state.cartTax;
        updatedPaymentMethods = [...state.paymentMethods];
        if (updatedPaymentMethods.length === 1) {
          updatedPaymentMethods[0] = { ...updatedPaymentMethods[0], amount: finalSaleTotal };
        }
      }

      return {
        cart: newCart,
        cartTotal,
        paymentMethods: updatedPaymentMethods,
      };
    });
  },

  removeFromCart: (productId) => {
    set((state) => {
      const newCart = state.cart.filter((item) => item.id !== productId)
      const cartTotal = newCart.reduce((sum, item) => sum + item.totalPrice, 0) // Use item.totalPrice

      // Actualizar montos en modo múltiple
      let updatedPaymentMethods = state.paymentMethods
      if (state.multiplePaymentMode && state.paymentMethods.length > 0) {
        const finalTotal = cartTotal - state.cartDiscount + state.cartTax
        updatedPaymentMethods = [...state.paymentMethods]
        if (updatedPaymentMethods.length === 1) {
          updatedPaymentMethods[0] = { ...updatedPaymentMethods[0], amount: finalTotal }
        }
      }

      return {
        cart: newCart,
        cartTotal,
        paymentMethods: updatedPaymentMethods,
      }
    })
  },

  // Actualizar cantidad con validación por unidad
  updateCartItemQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(productId)
      return
    }

    set((state) => {
      const item = state.cart.find((item) => item.id === productId)
      if (!item) return state

      // Validate quantity according to unit type (e.g., integer for units, decimal for kg)
      // And round quantity for kg products to 2 decimal places
      let validatedQuantity = quantity;
      if (item.unit_type === "kg") {
        validatedQuantity = Math.round(quantity * 100) / 100; // Round to 2 decimal places
      }
      if (!validateQuantity(validatedQuantity, item.unit_type)) {
        console.warn(`Cantidad inválida para producto ${item.name}: ${validatedQuantity}`);
        return state;
      }

      // Check available stock
      if (validatedQuantity > item.stock) {
        console.warn(`Stock insuficiente para ${item.name}. Disponible: ${item.stock}, Solicitado: ${validatedQuantity}`);
        return state;
      }

      const newCart = state.cart.map((cartItem) =>
        cartItem.id === productId
          ? {
              ...cartItem,
              quantity: validatedQuantity,
              totalPrice: validatedQuantity * cartItem.price, // Recalculate totalPrice based on new quantity and unit price
            }
          : cartItem
      )
      const cartTotal = newCart.reduce((sum, item) => sum + item.totalPrice, 0)

      // Update amounts in multiple payment mode
      let updatedPaymentMethods = state.paymentMethods
      if (state.multiplePaymentMode && state.paymentMethods.length > 0) {
        const finalTotal = cartTotal - state.cartDiscount + state.cartTax
        updatedPaymentMethods = [...state.paymentMethods]
        if (updatedPaymentMethods.length === 1) {
          updatedPaymentMethods[0] = { ...updatedPaymentMethods[0], amount: finalTotal }
        }
      }

      return {
        cart: newCart,
        cartTotal,
        paymentMethods: updatedPaymentMethods,
      }
    })
  },

  clearCart: () => {
    set({
      cart: [],
      cartTotal: 0,
      cartDiscount: 0,
      customer: null,
      paymentMethod: PAYMENT_METHODS.EFECTIVO,
      multiplePaymentMode: false,
      paymentMethods: [],
    })
  },

  // Acciones de descuento
  applyDiscount: (discount) => {
    set((state) => {
      // Actualizar montos en modo múltiple
      let updatedPaymentMethods = state.paymentMethods
      if (state.multiplePaymentMode && state.paymentMethods.length > 0) {
        const finalTotal = state.cartTotal - discount + state.cartTax
        updatedPaymentMethods = [...state.paymentMethods]
        if (updatedPaymentMethods.length === 1) {
          updatedPaymentMethods[0] = { ...updatedPaymentMethods[0], amount: finalTotal }
        }
      }

      return {
        cartDiscount: discount,
        paymentMethods: updatedPaymentMethods,
      }
    })
  },

  // CORREGIDO: Acciones de cliente con validación de cuenta corriente
  setCustomer: (customer) => {
    set((state) => {
      // Si se selecciona el cliente por defecto, no permitir cuenta corriente
      const isDefaultCustomer =
        customer && customer.document_number === "00000000" && customer.name === "Consumidor Final"

      // Si el método actual es cuenta corriente y se selecciona cliente por defecto, cambiar a efectivo
      let newPaymentMethod = state.paymentMethod
      if (isDefaultCustomer && state.paymentMethod === PAYMENT_METHODS.CUENTA_CORRIENTE) {
        newPaymentMethod = PAYMENT_METHODS.EFECTIVO
      }

      return {
        customer,
        paymentMethod: newPaymentMethod,
      }
    })
  },

  // CORREGIDO: Acciones de pago con validación de cliente
  setPaymentMethod: (method) => {
    set((state) => {
      const isDefaultCustomer =
        state.customer && state.customer.document_number === "00000000" && state.customer.name === "Consumidor Final"

      // Si se intenta seleccionar cuenta corriente con cliente por defecto, no permitir
      if (method === PAYMENT_METHODS.CUENTA_CORRIENTE && (!state.customer || isDefaultCustomer)) {
        console.warn("No se puede usar cuenta corriente con cliente por defecto")
        return state // No cambiar el método de pago
      }

      // Si está en modo múltiple, actualizar el primer método
      let updatedPaymentMethods = state.paymentMethods
      if (state.multiplePaymentMode && state.paymentMethods.length > 0) {
        updatedPaymentMethods = [...state.paymentMethods]
        updatedPaymentMethods[0] = { ...updatedPaymentMethods[0], method }
      }

      return {
        paymentMethod: method,
        customer: state.customer,
        paymentMethods: updatedPaymentMethods,
      }
    })
  },

  // CORREGIDO: Procesar venta con validación de caja abierta
  processSale: async (paymentData) => {
    const state = get()

    if (state.cart.length === 0) {
      throw new Error("El carrito está vacío")
    }

    // CRÍTICO: Verificar que la caja esté abierta
    if (!state.validateCashOpen()) {
      throw new Error("No se puede procesar la venta. La caja está cerrada. Debes abrir la caja primero.")
    }

    set({ loading: true, error: null })

    try {
      console.log("=== PROCESANDO VENTA ===")
      console.log("Estado actual:", {
        customer: state.customer,
        paymentMethod: state.paymentMethod,
        multiplePaymentMode: state.multiplePaymentMode,
        paymentMethods: state.paymentMethods,
        cartTotal: state.cartTotal,
        cartDiscount: state.cartDiscount,
      })

      // Verificar si es el cliente por defecto
      const isDefaultCustomer =
        state.customer && state.customer.document_number === "00000000" && state.customer.name === "Consumidor Final"

      // Determinar customer_id
      let finalCustomerId = null

      if (state.multiplePaymentMode) {
        // Para pagos múltiples, verificar si hay cuenta corriente
        const hasCuentaCorriente = state.paymentMethods.some((pm) => pm.method === PAYMENT_METHODS.CUENTA_CORRIENTE)

        if (hasCuentaCorriente) {
          if (state.customer && !isDefaultCustomer) {
            finalCustomerId = state.customer.id
          } else {
            throw new Error("Se requiere un cliente válido para usar cuenta corriente en pagos múltiples")
          }
        } else {
          // Si no hay cuenta corriente, usar cliente actual o null
          finalCustomerId = state.customer ? state.customer.id : null
        }
      } else {
        // Lógica para pago simple
        if (state.paymentMethod === PAYMENT_METHODS.CUENTA_CORRIENTE) {
          if (state.customer && !isDefaultCustomer) {
            finalCustomerId = state.customer.id
          } else {
            throw new Error("Se requiere un cliente válido para ventas a cuenta corriente")
          }
        } else {
          finalCustomerId = state.customer ? state.customer.id : null
        }
      }

      // Preparar datos de la venta
      const saleData = {
        items: state.cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.totalPrice, 
          unit_type: item.unit_type,
        })),
        subtotal: state.cartTotal,
        discount: state.cartDiscount,
        tax: state.cartTax,
        total: state.cartTotal - state.cartDiscount + state.cartTax,
        customer_id: finalCustomerId,
        notes: null,
      }

      // Agregar datos según el modo de pago
      if (state.multiplePaymentMode && state.paymentMethods.length > 0) {
        // Modo múltiple
        saleData.payment_method = "multiple"
        saleData.payment_methods = state.paymentMethods.map((pm) => ({
          method: pm.method,
          amount: pm.amount,
          data: pm.data || {},
        }))
        saleData.payment_data = paymentData
      } else {
        // Modo simple
        saleData.payment_method = state.paymentMethod
        saleData.payment_data = paymentData
      }

      console.log("Datos de venta a enviar:", saleData)

      const response = await salesService.createSale(saleData)

      if (response.data.success) {
        const sale = response.data.data

        set((state) => ({
          sales: [sale, ...state.sales],
          currentSale: sale,
          loading: false,
          lastCompletedSale: { sale, items: sale.items || [] },
        }))

        // Actualizar stock local de productos
        const productStore = useProductStore.getState()
        state.cart.forEach((item) => {
          const product = productStore.getProductById(item.id)
          if (product) {
            productStore.updateStock(item.id, product.stock - item.quantity)
          }
        })

        // Limpiar carrito
        get().clearCart()

        // NUEVO: Actualizar estado de caja después de la venta
        const cashStore = useCashStore.getState()
        await cashStore.fetchCurrentStatus()

        console.log("🎉 === VENTA PROCESADA EXITOSAMENTE ===")
        return { success: true, sale }
      } else {
        throw new Error(response.data.message || "Error al procesar la venta")
      }
    } catch (error) {
      console.error("Error en processSale:", error)
      const errorMessage = error.response?.data?.message || error.message || "Error al procesar la venta"
      set({ loading: false, error: errorMessage })
      throw new Error(errorMessage)
    }
  },

  // Obtener ventas con paginación y caching
  fetchSales: async (params = {}, forceRefresh = false) => {
    const state = get()

    if (state.loading && !forceRefresh) {
      return state.sales
    }

    // Cache inteligente: solo usar cache si los parámetros son iguales
    const now = Date.now()
    const cacheTime = 15 * 1000 // 15 segundos para ventas
    const paramsKey = JSON.stringify(params)

    if (
      !forceRefresh &&
      state.lastFetch &&
      now - state.lastFetch < cacheTime &&
      state.lastParamsKey === paramsKey &&
      state.sales.length > 0
    ) {
      return state.sales
    }

    set({ loading: true, error: null })
    try {
      const response = await salesService.getSales(params)

      if (response.data.success) {
        set({
          sales: response.data.data.sales,
          pagination: response.data.data.pagination,
          loading: false,
          lastFetch: now,
          lastParamsKey: paramsKey,
        })
        return response.data.data.sales
      } else {
        throw new Error(response.data.message || "Error al cargar ventas")
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || error.message || "Error al cargar ventas",
        loading: false,
      })
      throw error
    }
  },

  // Obtener venta por ID
  fetchSaleById: async (id) => {
    set({ loading: true, error: null })
    try {
      const response = await salesService.getSaleById(id)

      if (response.data.success) {
        set({ loading: false })
        return response.data.data
      } else {
        throw new Error(response.data.message || "Error al cargar venta")
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || error.message || "Error al cargar venta",
        loading: false,
      })
      throw error
    }
  },

  // Cancelar venta
  cancelSale: async (id, reason) => {
    set({ loading: true, error: null })
    try {
      const response = await salesService.cancelSale(id, reason)

      if (response.data.success) {
        // Actualizar la venta en el estado local
        set((state) => ({
          sales: state.sales.map((sale) =>
            sale.id === id
              ? {
                ...sale,
                status: "cancelled",
                notes: sale.notes ? `${sale.notes} - Cancelada: ${reason}` : `Cancelada: ${reason}`,
              }
              : sale,
          ),
          loading: false,
        }))

        // NUEVO: Actualizar estado de caja después de cancelación
        const cashStore = useCashStore.getState()
        await cashStore.fetchCurrentStatus()

        return { success: true, message: response.data.message }
      } else {
        throw new Error(response.data.message || "Error al cancelar venta")
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Error al cancelar venta"
      set({
        error: errorMessage,
        loading: false,
      })
      throw new Error(errorMessage)
    }
  },

  // Obtener estadísticas con caching
  fetchStats: async (period = "today", forceRefresh = false) => {
    const state = get()

    // Cache por 60 segundos para estadísticas
    const now = Date.now()
    const cacheTime = 60 * 1000
    if (
      !forceRefresh &&
      state.lastFetchStats &&
      now - state.lastFetchStats < cacheTime &&
      Object.keys(state.stats.general).length > 0
    ) {
      return state.stats
    }

    try {
      const response = await salesService.getSalesStats(period)

      if (response.data.success) {
        set({
          stats: response.data.data,
          lastFetchStats: now,
        })
        return response.data.data
      }
    } catch (error) {
      console.error("Error al obtener estadísticas:", error)
      set({
        stats: {
          general: {},
          payment_methods: [],
          top_products: [],
          top_customers: [],
          hourly_stats: [],
        },
      })
    }
  },

  // Métodos de utilidad
  getSales: () => get().sales,

  getSaleById: (id) => get().sales.find((sale) => sale.id === id),

  getSalesByDateRange: (startDate, endDate) => {
    return get().sales.filter((sale) => {
      const saleDate = new Date(sale.created_at)
      return saleDate >= new Date(startDate) && saleDate <= new Date(endDate)
    })
  },

  getSalesByPaymentMethod: (paymentMethod) => {
    return get().sales.filter((sale) => sale.payment_method === paymentMethod)
  },

  // Obtener estadísticas del carrito actual con soporte para múltiples pagos
  getCartStats: () => {
    const state = get()
    const finalTotal = state.cartTotal - state.cartDiscount + state.cartTax

    // Calcular totales por método en modo múltiple
    const paymentBreakdown = {}
    if (state.multiplePaymentMode && state.paymentMethods.length > 0) {
      state.paymentMethods.forEach((pm) => {
        paymentBreakdown[pm.method] = (paymentBreakdown[pm.method] || 0) + pm.amount
      })
    }

    return {
      itemsCount: state.cart.length,
      totalItems: state.cart.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: state.cartTotal,
      discount: state.cartDiscount,
      tax: state.cartTax,
      total: finalTotal,
      multiplePaymentMode: state.multiplePaymentMode,
      paymentBreakdown,
      paymentMethodsCount: state.paymentMethods.length,
    }
  },

  // Validar que los pagos múltiples sumen el total
  validateMultiplePayments: () => {
    const state = get()
    if (!state.multiplePaymentMode || state.paymentMethods.length === 0) {
      return { valid: true }
    }

    const finalTotal = state.cartTotal - state.cartDiscount + state.cartTax
    const totalPayments = state.paymentMethods.reduce((sum, pm) => sum + Number.parseFloat(pm.amount || 0), 0)
    const difference = Math.abs(finalTotal - totalPayments)

    return {
      valid: difference < 0.01,
      finalTotal,
      totalPayments,
      difference,
      message: difference >= 0.01 ? `Diferencia: $${difference.toFixed(2)}` : null,
    }
  },

  // Limpiar errores
  clearError: () => set({ error: null }),
}))
