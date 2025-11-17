"use client"

import { useState, useEffect } from "react"
import { Dialog, Transition } from "@headlessui/react"
import { Fragment } from "react"
import { useCustomerStore } from "../../stores/customerStore"
import { useToast } from "../../hooks/useToast"
import { formatCurrency } from "../../lib/formatters"
import Button from "../common/Button"
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  IdentificationIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  PlusIcon,
  PencilIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline"

const CustomerForm = ({ customer, onClose, onSuccess }) => {
  const { createCustomer, updateCustomer, loading } = useCustomerStore()
  const { showToast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    document_number: "",
    address: "",
    city: "",
    credit_limit: "",
    notes: "",
    active: true,
  })

  const [errors, setErrors] = useState({})
  const [activeSection, setActiveSection] = useState("basic")
  const [completedSections, setCompletedSections] = useState(new Set())

  // Secciones del formulario
  const sections = [
    { id: "basic", name: "Información Básica", icon: UserIcon },
    { id: "contact", name: "Contacto", icon: EnvelopeIcon },
    { id: "location", name: "Ubicación", icon: MapPinIcon },
    { id: "credit", name: "Crédito y Notas", icon: CurrencyDollarIcon },
  ]

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        document_number: customer.document_number || "",
        address: customer.address || "",
        city: customer.city || "",
        credit_limit: customer.credit_limit?.toString() || "",
        notes: customer.notes || "",
        active: customer.active !== undefined ? customer.active : true,
      })
      // Para edición, marcar todas las secciones como completadas
      setCompletedSections(new Set(["basic", "contact", "location", "credit"]))
    } else {
      // Reset form for new customer
      setFormData({
        name: "",
        email: "",
        phone: "",
        document_number: "",
        address: "",
        city: "",
        credit_limit: "",
        notes: "",
        active: true,
      })
      setCompletedSections(new Set())
    }
    setErrors({})
    setActiveSection("basic")
  }, [customer])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }))
    }
  }

  // Validar sección específica
  const validateSection = (sectionId) => {
    const newErrors = {}

    switch (sectionId) {
      case "basic":
        if (!formData.name.trim()) {
          newErrors.name = "El nombre es requerido"
        } else if (formData.name.trim().length < 2) {
          newErrors.name = "El nombre debe tener al menos 2 caracteres"
        }
        break

      case "contact":
        // Email opcional pero debe ser válido
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = "El email no es válido"
        }
        // Teléfono opcional pero debe tener formato válido
        if (formData.phone && formData.phone.length < 8) {
          newErrors.phone = "El teléfono debe tener al menos 8 dígitos"
        }
        break

      case "location":
        // Validaciones opcionales para ubicación
        break

      case "credit":
        // Límite de crédito no puede ser negativo
        if (formData.credit_limit && Number.parseFloat(formData.credit_limit) < 0) {
          newErrors.credit_limit = "El límite de crédito no puede ser negativo"
        }
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Continuar a la siguiente sección
  const handleContinue = () => {
    if (!validateSection(activeSection)) {
      showToast("Por favor corrige los errores antes de continuar", "error")
      return
    }

    // Marcar sección como completada
    setCompletedSections((prev) => new Set([...prev, activeSection]))

    // Ir a la siguiente sección
    const currentIndex = sections.findIndex((s) => s.id === activeSection)
    if (currentIndex < sections.length - 1) {
      setActiveSection(sections[currentIndex + 1].id)
    }
  }

  // Volver a la sección anterior
  const handleBack = () => {
    const currentIndex = sections.findIndex((s) => s.id === activeSection)
    if (currentIndex > 0) {
      setActiveSection(sections[currentIndex - 1].id)
    }
  }

  // Ir directamente a una sección
  const handleSectionClick = (sectionId) => {
    const sectionIndex = sections.findIndex((s) => s.id === sectionId)
    const currentIndex = sections.findIndex((s) => s.id === activeSection)

    // Permitir ir a secciones completadas o la siguiente sección
    if (completedSections.has(sectionId) || sectionIndex <= currentIndex + 1 || customer) {
      setActiveSection(sectionId)
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido"
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "El nombre debe tener al menos 2 caracteres"
    }

    // Email opcional pero debe ser válido
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "El email no es válido"
    }

    // Teléfono opcional pero debe tener formato válido
    if (formData.phone && formData.phone.length < 8) {
      newErrors.phone = "El teléfono debe tener al menos 8 dígitos"
    }

    // Límite de crédito no puede ser negativo
    if (formData.credit_limit && Number.parseFloat(formData.credit_limit) < 0) {
      newErrors.credit_limit = "El límite de crédito no puede ser negativo"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validar todas las secciones
    const allSectionsValid = sections.every((section) => validateSection(section.id))

    if (!allSectionsValid) {
      showToast("Por favor corrige todos los errores en el formulario", "error")
      return
    }

    // Usar la validación completa del formulario
    if (!validateForm()) {
      showToast("Por favor corrige los errores en el formulario", "error")
      return
    }

    try {
      // Limpiar campos vacíos y preparar datos
      const cleanData = { ...formData }
      Object.keys(cleanData).forEach((key) => {
        if (typeof cleanData[key] === "string" && cleanData[key].trim() === "") {
          cleanData[key] = null
        }
      })

      // Convertir credit_limit a número
      if (cleanData.credit_limit) {
        cleanData.credit_limit = Number.parseFloat(cleanData.credit_limit)
      } else {
        cleanData.credit_limit = 0
      }

      if (customer) {
        await updateCustomer(customer.id, cleanData)
        showToast("Cliente actualizado correctamente", "success")
      } else {
        await createCustomer(cleanData)
        showToast("Cliente creado correctamente", "success")
      }

      onSuccess()
    } catch (error) {
      console.error("Error guardando cliente:", error)
      showToast(error.message || "Error guardando cliente", "error")
    }
  }

  const currentSectionIndex = sections.findIndex((s) => s.id === activeSection)
  const isLastSection = currentSectionIndex === sections.length - 1

  return (
    <Transition appear show={true} as={Fragment}>
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
              {/* Dialog.Panel ajustado en ancho y alto */}
              <Dialog.Panel className="w-full max-w-7xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all flex flex-col max-h-[95vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-blue-700">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                        {customer ? (
                          <PencilIcon className="h-5 w-5 text-white" />
                        ) : (
                          <PlusIcon className="h-5 w-5 text-white" />
                        )}
                      </div>
                    </div>
                    <div className="text-left">
                      <Dialog.Title as="h3" className="text-lg font-semibold text-white">
                        {customer ? "Editar Cliente" : "Nuevo Cliente"}
                      </Dialog.Title>
                      <p className="text-xs text-blue-100 mt-0.5">
                        {customer ? "Actualiza la información del cliente" : "Completa los datos para crear el cliente"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="text-white/80 hover:text-white hover:bg-white/10 transition-colors p-1.5 rounded-lg"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Contenido Principal */}
                <div className="flex-1 overflow-hidden">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
                    {/* Sidebar */}
                    {/* Sidebar oculto en pantallas pequeñas, y se mueve a la derecha en pantallas grandes */}
                    <div className="lg:col-span-1 hidden lg:block border-r border-gray-100 bg-gray-50 p-6 overflow-y-auto">
                      <div className="lg:sticky lg:top-0 space-y-4">
                        {/* Progress indicator */}
                        <div className="mb-6">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                            <span>Progreso</span>
                            <span>
                              {completedSections.size + (isLastSection ? 1 : 0)}/{sections.length}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${
                                  ((completedSections.size + (isLastSection ? 1 : 0)) / sections.length) * 100
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>

                        {/* Navigation sections */}
                        <div className="space-y-2">
                          {sections.map((section, index) => {
                            const isCompleted = completedSections.has(section.id)
                            const isCurrent = activeSection === section.id
                            const isAccessible = isCompleted || index <= currentSectionIndex + 1 || customer

                            return (
                              <button
                                key={section.id}
                                onClick={() => handleSectionClick(section.id)}
                                disabled={!isAccessible}
                                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-all duration-200 ${
                                  isCurrent
                                    ? "bg-primary-50 text-primary-700 border-2 border-primary-200 shadow-sm"
                                    : isCompleted
                                      ? "bg-green-50 text-green-700 border-2 border-green-200 hover:bg-green-100"
                                      : isAccessible
                                        ? "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-2 border-transparent"
                                        : "text-gray-400 border-2 border-transparent cursor-not-allowed"
                                }`}
                              >
                                <section.icon className="h-5 w-5 mr-3" />
                                <span className="font-medium">{section.name}</span>
                                <div className="ml-auto">
                                  {isCompleted && !isCurrent && <CheckCircleIcon className="h-4 w-4 text-green-600" />}
                                  {isCurrent && <div className="w-2 h-2 bg-primary-600 rounded-full"></div>}
                                </div>
                              </button>
                            )
                          })}
                        </div>

                        {/* Vista previa del cliente */}
                        {formData.name && (
                          <div className="mt-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Vista Previa</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">Nombre:</span>
                                <span className="text-xs font-medium text-gray-900 truncate ml-2">
                                  {formData.name || "Sin nombre"}
                                </span>
                              </div>
                              {formData.email && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">Email:</span>
                                  <span className="text-xs font-medium text-gray-900 truncate ml-2">
                                    {formData.email}
                                  </span>
                                </div>
                              )}
                              {formData.phone && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">Teléfono:</span>
                                  <span className="text-xs font-medium text-gray-900">{formData.phone}</span>
                                </div>
                              )}
                              {formData.credit_limit && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">Límite:</span>
                                  <span className="text-xs font-bold text-green-600">
                                    {formatCurrency(Number.parseFloat(formData.credit_limit))}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contenido del formulario */}
                    <div className="lg:col-span-3 flex flex-col">
                      <div className="flex-1 overflow-y-auto max-h-[calc(95vh-200px)] p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                          {/* Sección Información Básica */}
                          {activeSection === "basic" && (
                            <div className="space-y-6">
                              <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-6 border border-primary-100">
                                <div className="flex items-center mb-4">
                                  <UserIcon className="h-6 w-6 text-primary-600 mr-3" />
                                  <h3 className="text-lg font-semibold text-primary-900">Información Básica</h3>
                                </div>

                                <div className="space-y-6">
                                  {/* Nombre */}
                                  <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                      Nombre completo *
                                    </label>
                                    <input
                                      type="text"
                                      name="name"
                                      id="name"
                                      value={formData.name}
                                      onChange={handleChange}
                                      className={`block w-full px-4 py-3 border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                                        errors.name
                                          ? "border-red-300 bg-red-50"
                                          : "border-gray-300 hover:border-gray-400 bg-white"
                                      }`}
                                      placeholder="Ingresa el nombre completo del cliente"
                                    />
                                    {errors.name && (
                                      <p className="mt-2 text-sm text-red-600 flex items-center">
                                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                                        {errors.name}
                                      </p>
                                    )}
                                  </div>

                                  {/* Número de documento */}
                                  <div>
                                    <label
                                      htmlFor="document_number"
                                      className="block text-sm font-medium text-gray-700 mb-2"
                                    >
                                      Número de Documento
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="text"
                                        name="document_number"
                                        id="document_number"
                                        value={formData.document_number}
                                        onChange={handleChange}
                                        className="block w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent hover:border-gray-400 transition-all bg-white"
                                        placeholder="DNI, CUIT, CUIL, Pasaporte, etc."
                                      />
                                      <IdentificationIcon className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500">
                                      Puede ser DNI, CUIT, CUIL, Pasaporte o cualquier documento de identificación
                                    </p>
                                  </div>

                                  {/* Estado (solo para edición) */}
                                  {customer && (
                                    <div className="p-4 bg-white rounded-lg border border-primary-200">
                                      <div className="flex items-center space-x-3">
                                        <input
                                          id="active"
                                          name="active"
                                          type="checkbox"
                                          checked={formData.active}
                                          onChange={handleChange}
                                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="active" className="text-sm font-medium text-gray-700">
                                          Cliente activo y disponible
                                        </label>
                                      </div>
                                      <p className="mt-2 text-xs text-gray-500 ml-7">
                                        Los clientes inactivos no aparecerán en las búsquedas del punto de venta
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Sección Contacto */}
                          {activeSection === "contact" && (
                            <div className="space-y-6">
                              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                                <div className="flex items-center mb-4">
                                  <EnvelopeIcon className="h-6 w-6 text-green-600 mr-3" />
                                  <h3 className="text-lg font-semibold text-green-900">Información de Contacto</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Email */}
                                  <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                      Correo electrónico
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="email"
                                        name="email"
                                        id="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className={`block w-full px-4 py-3 pl-12 border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                                          errors.email
                                            ? "border-red-300 bg-red-50"
                                            : "border-gray-300 hover:border-gray-400 bg-white"
                                        }`}
                                        placeholder="cliente@ejemplo.com"
                                      />
                                      <EnvelopeIcon className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
                                    </div>
                                    {errors.email && (
                                      <p className="mt-2 text-sm text-red-600 flex items-center">
                                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                                        {errors.email}
                                      </p>
                                    )}
                                  </div>

                                  {/* Teléfono */}
                                  <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                                      Número de teléfono
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="tel"
                                        name="phone"
                                        id="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className={`block w-full px-4 py-3 pl-12 border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                                          errors.phone
                                            ? "border-red-300 bg-red-50"
                                            : "border-gray-300 hover:border-gray-400 bg-white"
                                        }`}
                                        placeholder="+54 11 1234-5678"
                                      />
                                      <PhoneIcon className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
                                    </div>
                                    {errors.phone && (
                                      <p className="mt-2 text-sm text-red-600 flex items-center">
                                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                                        {errors.phone}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Información adicional */}
                                <div className="mt-6 p-4 bg-white rounded-lg border border-green-200">
                                  <div className="flex items-start">
                                    <InformationCircleIcon className="h-5 w-5 text-green-600 mt-0.5 mr-2" />
                                    <div className="text-sm text-green-800">
                                      <p className="font-medium">Información de contacto:</p>
                                      <ul className="mt-1 list-disc list-inside space-y-1 text-xs">
                                        <li>El email se usará para enviar facturas y notificaciones</li>
                                        <li>El teléfono es útil para confirmar pedidos y entregas</li>
                                        <li>Ambos campos son opcionales pero recomendados</li>
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Sección Ubicación */}
                          {activeSection === "location" && (
                            <div className="space-y-6">
                              <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-100">
                                <div className="flex items-center mb-4">
                                  <MapPinIcon className="h-6 w-6 text-purple-600 mr-3" />
                                  <h3 className="text-lg font-semibold text-purple-900">Información de Ubicación</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Dirección */}
                                  <div className="md:col-span-2">
                                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                                      Dirección completa
                                    </label>
                                    <input
                                      type="text"
                                      name="address"
                                      id="address"
                                      value={formData.address}
                                      onChange={handleChange}
                                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent hover:border-gray-400 transition-all bg-white"
                                      placeholder="Calle, número, piso, departamento"
                                    />
                                  </div>

                                  {/* Ciudad */}
                                  <div>
                                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                                      Ciudad
                                    </label>
                                    <input
                                      type="text"
                                      name="city"
                                      id="city"
                                      value={formData.city}
                                      onChange={handleChange}
                                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent hover:border-gray-400 transition-all bg-white"
                                      placeholder="Ciudad o localidad"
                                    />
                                  </div>
                                </div>

                                {/* Información adicional */}
                                <div className="mt-6 p-4 bg-white rounded-lg border border-purple-200">
                                  <div className="flex items-start">
                                    <InformationCircleIcon className="h-5 w-5 text-purple-600 mt-0.5 mr-2" />
                                    <div className="text-sm text-purple-800">
                                      <p className="font-medium">Datos de ubicación:</p>
                                      <ul className="mt-1 list-disc list-inside space-y-1 text-xs">
                                        <li>Útil para entregas a domicilio</li>
                                        <li>Ayuda a organizar rutas de reparto</li>
                                        <li>Información opcional pero recomendada</li>
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Sección Crédito y Notas */}
                          {activeSection === "credit" && (
                            <div className="space-y-6">
                              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-100">
                                <div className="flex items-center mb-4">
                                  <CurrencyDollarIcon className="h-6 w-6 text-orange-600 mr-3" />
                                  <h3 className="text-lg font-semibold text-orange-900">Crédito y Notas</h3>
                                </div>

                                <div className="space-y-6">
                                  {/* Límite de crédito */}
                                  <div>
                                    <label
                                      htmlFor="credit_limit"
                                      className="block text-sm font-medium text-gray-700 mb-2"
                                    >
                                      Límite de crédito
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        name="credit_limit"
                                        id="credit_limit"
                                        value={formData.credit_limit}
                                        onChange={handleChange}
                                        min="0"
                                        step="0.01"
                                        className={`block w-full px-4 py-3 pl-12 border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-lg font-semibold ${
                                          errors.credit_limit
                                            ? "border-red-300 bg-red-50"
                                            : "border-gray-300 hover:border-gray-400 bg-white"
                                        }`}
                                        placeholder="0.00"
                                      />
                                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">
                                        $
                                      </span>
                                    </div>
                                    {errors.credit_limit && (
                                      <p className="mt-2 text-sm text-red-600 flex items-center">
                                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                                        {errors.credit_limit}
                                      </p>
                                    )}
                                    <p className="mt-2 text-xs text-gray-500">
                                      Monto máximo que el cliente puede deber. Dejar en 0 para no permitir crédito.
                                    </p>
                                  </div>

                                  {/* Vista previa del límite */}
                                  {formData.credit_limit && Number.parseFloat(formData.credit_limit) > 0 && (
                                    <div className="p-4 bg-white rounded-lg border border-orange-200">
                                      <div className="text-center">
                                        <p className="text-sm text-gray-600 mb-1">Límite de crédito configurado:</p>
                                        <p className="text-2xl font-bold text-green-600">
                                          {formatCurrency(Number.parseFloat(formData.credit_limit))}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          El cliente podrá realizar compras a crédito hasta este monto
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Notas */}
                                  <div>
                                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                                      Notas adicionales
                                    </label>
                                    <div className="relative">
                                      <textarea
                                        name="notes"
                                        id="notes"
                                        rows={4}
                                        value={formData.notes}
                                        onChange={handleChange}
                                        className="block w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent hover:border-gray-400 transition-all resize-none bg-white"
                                        placeholder="Información adicional sobre el cliente, preferencias, historial, etc."
                                      />
                                      <DocumentTextIcon className="h-5 w-5 text-gray-400 absolute left-4 top-4" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </form>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer con navegación - ACTUALIZADO con botones como ProductForm */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="py-2.5 px-5 text-sm font-medium rounded-lg"
                  >
                    Cancelar
                  </Button>

                  <Button
                    type="submit"
                    loading={loading}
                    onClick={handleSubmit}
                    className="py-2.5 px-5 text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg shadow-sm"
                    disabled={loading}
                  >
                    {loading ? (
                      "Guardando..."
                    ) : (
                      <>
                        <CheckCircleIcon className="h-4 w-4 mr-1.5 inline" />
                        {customer ? "Actualizar Cliente" : "Crear Cliente"}
                      </>
                    )}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default CustomerForm
