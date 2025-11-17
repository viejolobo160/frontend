"use client"

import { Fragment, useState } from "react"
import { Dialog, Transition } from "@headlessui/react"
import { XMarkIcon, CommandLineIcon } from "@heroicons/react/24/outline"

/**
 * Componente para mostrar ayuda de atajos de teclado
 * Se puede invocar con Ctrl+K o desde un botón en el header
 */
const KeyboardShortcutsHelp = ({ isOpen, onClose }) => {
  const shortcuts = [
    {
      key: "F1",
      action: "Ir a Ventas",
      description: "Navega a la página de ventas para procesar transacciones",
    },
    {
      key: "F6",
      action: "Ver Cierre de Caja",
      description: "Accede al control de caja para ver estado y realizar cierre",
    },
    {
      key: "F10",
      action: "Carga de Productos",
      description: "Navega a la gestión de stock para administrar productos",
    },
    {
      key: "F12",
      action: "Cerrar Sesión",
      description: "Cierra tu sesión actual de forma segura",
    },
  ]

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <CommandLineIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900">
                      Atajos de Teclado
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  <p className="text-sm text-gray-600 mb-6">
                    Usa estos atajos para navegar más rápido por el sistema
                  </p>

                  <div className="space-y-3">
                    {shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.key}
                        className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <kbd className="inline-flex items-center justify-center min-w-[48px] h-8 px-2 text-sm font-semibold text-gray-900 bg-gray-100 border border-gray-300 rounded shadow-sm">
                          {shortcut.key}
                        </kbd>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-gray-900">{shortcut.action}</div>
                          <div className="text-xs text-gray-500 mt-1">{shortcut.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center">
                    Presiona <kbd className="px-1.5 py-0.5 text-xs bg-white border border-gray-300 rounded">?</kbd> en
                    cualquier momento para ver esta ayuda
                  </p>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default KeyboardShortcutsHelp
