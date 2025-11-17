"use client"

import { useState, useEffect, useCallback } from "react"
import { useCashStore } from "@/stores/cashStore"
import Button from "@/components/common/Button"
import CashSummary from "@/components/cash/CashSummary"
import CashMovementsList from "@/components/cash/CashMovementsList"
import CashOpeningForm from "@/components/cash/CashOpeningForm"
import CashCloseForm from "@/components/cash/CashCloseForm"
import CashMovementForm from "@/components/cash/CashMovementForm"
import CashHistory from "@/components/cash/CashHistory"
import {
  BanknotesIcon,
  PlusIcon,
  CalculatorIcon,
  ClockIcon,
  ListBulletIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline"

const Cash = () => {
  const { currentCash, fetchCurrentStatus, loading, error } = useCashStore()
  const [activeTab, setActiveTab] = useState("summary")
  const [showOpeningForm, setShowOpeningForm] = useState(false)
  const [showCloseForm, setShowCloseForm] = useState(false)
  const [showMovementForm, setShowMovementForm] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)

  const loadInitialStatus = useCallback(async () => {
    if (!hasInitialized && !loading) {
      console.log("🚀 Cargando estado inicial de caja...")
      setHasInitialized(true)
      try {
        await fetchCurrentStatus()
      } catch (error) {
        console.error("❌ Error loading initial status:", error)
      }
    }
  }, [hasInitialized, loading, fetchCurrentStatus])

  useEffect(() => {
    loadInitialStatus()
  }, [loadInitialStatus])

  // Mostrar loading solo en la carga inicial
  if (loading && !hasInitialized) {
    return (
      <div className="flex flex-col justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
        <p className="text-gray-600">Cargando estado de caja...</p>
      </div>
    )
  }

  // Mostrar error si existe
  if (error && hasInitialized) {
    return (
      <div className="flex flex-col justify-center items-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600 mr-3" />
            <h3 className="text-red-800 font-medium">Error al cargar la caja</h3>
          </div>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={() => {
              setHasInitialized(false)
              fetchCurrentStatus()
            }}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
            disabled={loading}
          >
            {loading ? "Cargando..." : "Reintentar"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Control de Caja</h1>
          <p className="mt-1 text-sm text-gray-500">Gestiona el efectivo y controla los movimientos de caja</p>
        </div>
        <div className="flex space-x-3">
          {!currentCash.isOpen ? (
            <Button
              onClick={() => setShowOpeningForm(true)}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg"
            >
              <ClockIcon className="h-4 w-4 mr-2" />
              Abrir Caja
            </Button>
          ) : (
            <>
              <Button
                onClick={() => setShowMovementForm(true)}
                variant="outline"
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Registrar Movimiento
              </Button>
              <Button
                onClick={() => setShowCloseForm(true)}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg"
              >
                <CalculatorIcon className="h-4 w-4 mr-2" />
                Cerrar Caja
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Estado de caja cerrada */}
      {!currentCash.isOpen && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center">
            <ClockIcon className="h-6 w-6 text-yellow-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Caja Cerrada</h3>
              <p className="text-sm text-yellow-700 mt-1">
                La caja está cerrada. Debes abrirla para comenzar a operar y procesar ventas.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "summary", name: "Resumen", icon: BanknotesIcon },
            { id: "movements", name: "Movimientos", icon: ListBulletIcon },
            { id: "history", name: "Historial", icon: ArchiveBoxIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido de tabs */}
      {activeTab === "summary" && <CashSummary />}
      {activeTab === "movements" && <CashMovementsList />}
      {activeTab === "history" && <CashHistory />}

      {/* Modales */}
      <CashOpeningForm isOpen={showOpeningForm} onClose={() => setShowOpeningForm(false)} />

      <CashCloseForm isOpen={showCloseForm} onClose={() => setShowCloseForm(false)} />

      <CashMovementForm isOpen={showMovementForm} onClose={() => setShowMovementForm(false)} />
    </div>
  )
}

export default Cash
