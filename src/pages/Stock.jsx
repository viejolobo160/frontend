"use client"

import { useState, useEffect, useCallback } from "react"
import { useProductStore } from "../stores/productStore"
import { useStockStore } from "../stores/stockStore"
import { useCategoryStore } from "../stores/categoryStore"
import { formatCurrency, formatStock } from "../lib/formatters"
import Card from "../components/common/Card"
import Button from "../components/common/Button"
import Pagination from "../components/common/Pagination"
import ProductForm from "../components/stock/ProductForm"
import StockMovementForm from "../components/stock/StockMovementForm"
import StockAlerts from "../components/stock/StockAlerts"
import StockMovementsList from "../components/stock/StockMovementsList"
import ProductSearchStock from "../components/stock/ProductSearchStock"
import {
  PlusIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  PencilIcon,
  TrashIcon,
  ArrowsRightLeftIcon,
  ScaleIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline"

const Stock = () => {
  const {
    products,
    fetchProducts,
    deleteProduct,
    loading: productsLoading,
    pagination: productsPagination,
  } = useProductStore()
  const { fetchStockStats, fetchStockAlerts, stockAlerts } = useStockStore()
  const { categories, fetchCategories } = useCategoryStore()

  const [activeTab, setActiveTab] = useState("products")
  const [showProductForm, setShowProductForm] = useState(false)
  const [showMovementForm, setShowMovementForm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedProductForMovement, setSelectedProductForMovement] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState({
    category: "",
    stockRange: { min: "", max: "" },
    priceRange: { min: "", max: "" },
    page: 1,
    limit: 25,
  })

  // Cargar datos iniciales
  const loadInitialData = useCallback(async () => {
    try {
      await fetchCategories({ active: "true" })
      await Promise.all([
        fetchStockStats().catch((err) => console.warn("Error loading stats:", err)),
        fetchStockAlerts().catch((err) => console.warn("Error loading alerts:", err)),
      ])
    } catch (error) {
      console.error("Error loading initial data:", error)
    }
  }, [fetchCategories, fetchStockStats, fetchStockAlerts])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // Efecto para cargar productos cuando cambien los filtros
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = {
        page: filters.page,
        limit: filters.limit,
        active: "all",
      }

      // Aplicar filtros de búsqueda
      if (searchQuery.trim()) {
        params.search = searchQuery.trim()
      }

      if (filters.category) {
        params.category = filters.category
      }

      if (filters.stockRange.min) {
        params.minStock = filters.stockRange.min
      }

      if (filters.stockRange.max) {
        params.maxStock = filters.stockRange.max
      }

      if (filters.priceRange.min) {
        params.minPrice = filters.priceRange.min
      }

      if (filters.priceRange.max) {
        params.maxPrice = filters.priceRange.max
      }

      fetchProducts(params)
    }, 300) // Debounce de 300ms

    return () => clearTimeout(timeoutId)
  }, [searchQuery, filters, fetchProducts])



  // Función para manejar cambio de página
  const handlePageChange = useCallback((newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }))
  }, [])

  // Función para manejar cambio de elementos por página
  const handleItemsPerPageChange = useCallback((newLimit, newPage = 1) => {
    setFilters((prev) => ({
      ...prev,
      limit: newLimit,
      page: newPage,
    }))
  }, [])

  // Función para manejar cambios en filtros
  const handleFiltersChange = useCallback((newFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: 1, // Resetear a la primera página cuando cambien los filtros
    }))
  }, [])

  // Función para manejar búsqueda
  const handleSearchChange = useCallback((query) => {
    setSearchQuery(query)
    setFilters((prev) => ({ ...prev, page: 1 })) // Resetear página en búsqueda
  }, [])

  // Tabs con indicador de alertas
  const tabs = [
    { id: "products", name: "Productos", icon: CubeIcon },
    { id: "movements", name: "Movimientos", icon: ArrowTrendingUpIcon },
    {
      id: "alerts",
      name: "Alertas",
      icon: ExclamationTriangleIcon,
      hasAlerts: stockAlerts.length > 0,
    },
  ]

  const StatCard = ({ title, value, icon: Icon, color = "text-gray-600" }) => (
    <Card>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className={`h-8 w-8 ${color}`} />
        </div>
        <div className="ml-5">
          <dl>
            <dt className="text-sm font-medium text-gray-500">{title}</dt>
            <dd className="text-2xl font-semibold text-gray-900">{value}</dd>
          </dl>
        </div>
      </div>
    </Card>
  )

  const getCategoryName = useCallback(
    (categoryId) => {
      const category = categories.find((c) => c.id === categoryId)
      return category ? category.name : "Sin categoría"
    },
    [categories],
  )

  // Mejorar función de eliminación con mejor feedback
  const handleDeleteProduct = useCallback(
    async (product) => {
      // Mensaje de confirmación más específico
      const confirmMessage = `¿Estás seguro de que deseas eliminar el producto "${product.name}"?\n\nEsta acción no se puede deshacer.`

      if (window.confirm(confirmMessage)) {
        try {
          const result = await deleteProduct(product.id)

          // Mostrar mensaje específico según la acción realizada
          if (result.action === "deleted") {
            alert(`Producto "${product.name}" eliminado completamente de la base de datos.`)
          } else {
            alert(`Producto "${product.name}" desactivado (tiene ventas asociadas).`)
          }

          // Recargar la página actual después de eliminar
          const params = {
            page: filters.page,
            limit: filters.limit,
            active: "all",
          }
          if (searchQuery.trim()) params.search = searchQuery.trim()
          if (filters.category) params.category = filters.category
          fetchProducts(params, true)
        } catch (error) {
          console.error("Error deleting product:", error)
          alert("Error al eliminar el producto. Por favor, inténtalo de nuevo.")
        }
      }
    },
    [deleteProduct, filters, searchQuery, fetchProducts],
  )

  const handleOpenMovementForm = useCallback((product) => {
    setSelectedProductForMovement(product)
    setShowMovementForm(true)
  }, [])

  const handleCloseMovementForm = useCallback(() => {
    setShowMovementForm(false)
    setSelectedProductForMovement(null)
    // Recargar productos después de movimiento
    const params = {
      page: filters.page,
      limit: filters.limit,
      active: "all",
    }
    if (searchQuery.trim()) params.search = searchQuery.trim()
    if (filters.category) params.category = filters.category
    fetchProducts(params, true)
  }, [filters, searchQuery, fetchProducts])

  const handleOpenProductForm = useCallback((product = null) => {
    setSelectedProduct(product)
    setShowProductForm(true)
  }, [])

  const handleCloseProductForm = useCallback(() => {
    setShowProductForm(false)
    setSelectedProduct(null)
  }, [])

  const handleSaveProduct = useCallback(() => {
    // Recargar productos después de guardar
    const params = {
      page: filters.page,
      limit: filters.limit,
      active: "all",
    }
    if (searchQuery.trim()) params.search = searchQuery.trim()
    if (filters.category) params.category = filters.category
    fetchProducts(params, true)
  }, [filters, searchQuery, fetchProducts])

  const hasActiveFilters =
    searchQuery ||
    filters.category ||
    filters.stockRange.min ||
    filters.stockRange.max ||
    filters.priceRange.min ||
    filters.priceRange.max

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Stock</h1>
          <p className="mt-1 text-sm text-gray-500">Administra tu inventario y controla los movimientos de stock</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={() => handleOpenProductForm()}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm relative transition-colors duration-200 ease-in-out ${
                activeTab === tab.id
                  ? "border-primary-500 text-primary-600"
                  : tab.hasAlerts // APLICADO: Estilo de alerta a la pestaña
                    ? "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.name}
              {/* ELIMINADO: El punto amarillo, ahora la pestaña completa cambia de color */}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido de tabs */}
      {activeTab === "products" && (
        <div className="space-y-6">
          {/* Búsqueda avanzada */}
          <ProductSearchStock
            onSearch={handleSearchChange}
            onFiltersChange={handleFiltersChange}
            searchQuery={searchQuery}
            filters={filters}
          />

          {/* Tabla de productos */}
          <Card>
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Productos
                  {productsPagination.total > 0 && (
                    <span className="ml-2 text-sm text-gray-500">
                      ({productsPagination.total.toLocaleString()} total)
                    </span>
                  )}
                </h3>
                {hasActiveFilters && <span className="text-sm text-gray-500">Mostrando resultados filtrados</span>}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productsLoading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        </div>
                        <p className="mt-2">Cargando productos...</p>
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                        <CubeIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-lg font-medium">No se encontraron productos</p>
                        <p className="text-sm">
                          {hasActiveFilters
                            ? "Intenta ajustar los filtros de búsqueda"
                            : "Comienza agregando tu primer producto"}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-start">
                            <div className="h-10 w-10 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                              {product.image ? (
                                <img
                                  src={product.image || "/placeholder.svg"}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <PhotoIcon className="h-6 w-6 text-gray-400" />
                              )}
                            </div>
                            <div className="ml-4 flex-1 min-w-0">
                              <div className="flex items-center">
                                <div className="text-sm font-medium text-gray-900 truncate">{product.name}</div>
                                {product.unit_type === "kg" ? (
                                  <ScaleIcon
                                    className="h-4 w-4 text-blue-500 ml-2 flex-shrink-0"
                                    title="Por kilogramos"
                                  />
                                ) : (
                                  <CubeIcon
                                    className="h-4 w-4 text-green-500 ml-2 flex-shrink-0"
                                    title="Por unidades"
                                  />
                                )}
                              </div>
                              {product.description && (
                                <div className="text-sm text-gray-500 mt-1">
                                  <div className="line-clamp-2 max-w-xs" title={product.description}>
                                    {product.description}
                                  </div>
                                </div>
                              )}
                              {product.barcode && (
                                <div className="text-xs text-gray-400 mt-1">Código: {product.barcode}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {getCategoryName(product.category_id)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            {formatCurrency(product.price)}
                            {product.unit_type === "kg" && <div className="text-xs text-gray-500">por kg</div>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              product.stock <= product.min_stock
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {formatStock(product.stock, product.unit_type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              product.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {product.active ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleOpenMovementForm(product)}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                              title="Registrar movimiento de stock"
                            >
                              <ArrowsRightLeftIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenProductForm(product)}
                              className="text-primary-600 hover:text-primary-900 transition-colors"
                              title="Editar producto"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="Eliminar producto"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {productsPagination.pages > 1 && (
              <Pagination
                currentPage={productsPagination.page}
                totalPages={productsPagination.pages}
                totalItems={productsPagination.total}
                itemsPerPage={productsPagination.limit}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                loading={productsLoading}
              />
            )}
          </Card>
        </div>
      )}

      {activeTab === "movements" && <StockMovementsList />}

      {activeTab === "alerts" && <StockAlerts />}

      {/* Modales */}
      <ProductForm
        isOpen={showProductForm}
        product={selectedProduct}
        onClose={handleCloseProductForm}
        onSave={handleSaveProduct}
      />

      <StockMovementForm
        isOpen={showMovementForm}
        selectedProduct={selectedProductForMovement}
        onClose={handleCloseMovementForm}
        onSave={() => {}}
      />

      {/* Estilos */}
      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}

export default Stock
