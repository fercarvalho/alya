import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Users, Plus, Download, Upload, Edit, Trash2, Filter, X } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { API_BASE_URL } from '../config/api'

interface Client {
  id: string
  name: string
  email: string
  phone: string
  address: string
  cpf?: string
  cnpj?: string
  createdAt?: string
  updatedAt?: string
}

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState<{
    name: string
    email: string
    phone: string
    address: string
    documentType: 'cpf' | 'cnpj'
    cpf: string
    cnpj: string
  }>({
    name: '', email: '', phone: '', address: '', documentType: 'cpf', cpf: '', cnpj: ''
  })
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})
  const [isImportExportOpen, setIsImportExportOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Estados do modal de exportação de clientes
  const [isExportClientesModalOpen, setIsExportClientesModalOpen] = useState(false)
  const [exportarFiltrados, setExportarFiltrados] = useState(true)
  const [incluirResumo, setIncluirResumo] = useState(true)

  // filtros / ordenação
  const [sortConfig, setSortConfig] = useState<{ field: keyof Client | null, direction: 'asc' | 'desc' }>({ field: null, direction: 'asc' })
  const [filters, setFilters] = useState<{ name: string, email: string, phone: string }>({ name: '', email: '', phone: '' })

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/clients`)
        const j = await r.json()
        if (j.success) setClients(j.data)
      } catch { }
    }
    load()
  }, [])

  // Controla overlay global (classe no body) ao abrir/fechar modais
  useEffect(() => {
    const body = document?.body
    if (!body) return
    if (isImportExportOpen || isModalOpen) body.classList.add('modal-open')
    else body.classList.remove('modal-open')
    return () => { body.classList.remove('modal-open') }
  }, [isImportExportOpen, isModalOpen])

  const handleSort = (field: keyof Client) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig.field === field && sortConfig.direction === 'asc') direction = 'desc'
    setSortConfig({ field, direction })
  }

  const getSortIcon = (field: keyof Client) => {
    if (sortConfig.field !== field) return <span className="text-gray-400">↕</span>
    return sortConfig.direction === 'asc' ? <span className="text-amber-600">↑</span> : <span className="text-amber-600">↓</span>
  }

  const filteredAndSorted = useMemo(() => {
    let list = [...clients]
    if (filters.name) list = list.filter(c => c.name.toLowerCase().includes(filters.name.toLowerCase()))
    if (filters.email) list = list.filter(c => c.email.toLowerCase().includes(filters.email.toLowerCase()))
    if (filters.phone) list = list.filter(c => c.phone.includes(filters.phone))

    if (sortConfig.field) {
      list.sort((a, b) => {
        let av: any = a[sortConfig.field!]
        let bv: any = b[sortConfig.field!]
        if (typeof av === 'string') { av = av.toLowerCase(); bv = String(bv).toLowerCase() }
        if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1
        if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return list
  }, [clients, filters, sortConfig])

  const handleSelectAll = () => {
    if (selectedClients.size === clients.length) setSelectedClients(new Set())
    else setSelectedClients(new Set(clients.map(c => c.id)))
  }

  const handleSelect = (id: string) => {
    setSelectedClients(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id); else s.add(id)
      return s
    })
  }

  const clearFilters = () => setFilters({ name: '', email: '', phone: '' })

  // CRUD
  const validateForm = () => {
    const errors: { [key: string]: string } = {}

    if (!form.name.trim()) errors.name = 'Campo obrigatório'
    if (!form.email.trim()) errors.email = 'Campo obrigatório'
    if (!form.phone.trim()) errors.phone = 'Campo obrigatório'
    if (!form.address.trim()) errors.address = 'Campo obrigatório'

    // Validar CPF ou CNPJ baseado no tipo selecionado
    if (form.documentType === 'cpf' && !form.cpf.trim()) {
      errors.cpf = 'Campo obrigatório'
    } else if (form.documentType === 'cnpj' && !form.cnpj.trim()) {
      errors.cnpj = 'Campo obrigatório'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const saveClient = async () => {
    if (!validateForm()) return

    const payload = {
      id: editing?.id,
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: form.address,
      cpf: form.cpf || undefined,
      cnpj: form.cnpj || undefined
    }
    try {
      if (editing) {
        const r = await fetch(`${API_BASE_URL}/clients/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const j = await r.json(); if (j.success) setClients(prev => prev.map(c => c.id === editing.id ? j.data : c))
      } else {
        const r = await fetch(`${API_BASE_URL}/clients`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const j = await r.json(); if (j.success) setClients(prev => [j.data, ...prev])
      }
      setIsModalOpen(false); setEditing(null); setForm({ name: '', email: '', phone: '', address: '', documentType: 'cpf', cpf: '', cnpj: '' }); setFormErrors({})
    } catch (error) {
      console.error('Erro ao salvar:', error)
    }
  }

  const deleteOne = async (id: string) => {
    try {
      const r = await fetch(`${API_BASE_URL}/clients/${id}`, { method: 'DELETE' })
      const j = await r.json(); if (j.success) setClients(prev => prev.filter(c => c.id !== id))
    } catch { }
  }

  const deleteSelected = async () => {
    try {
      const ids = Array.from(selectedClients)
      await fetch(`${API_BASE_URL}/clients`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) })
      setClients(prev => prev.filter(c => !selectedClients.has(c.id)))
      setSelectedClients(new Set())
    } catch { }
  }

  // Import/Export
  const downloadModel = () => {
    window.open(`${API_BASE_URL}/modelo/clients`, '_blank')
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'clients')
    try {
      const r = await fetch(`${API_BASE_URL}/import`, { method: 'POST', body: formData })
      const j = await r.json()
      if (j.success) {
        setClients(prev => [...j.data, ...prev])
        setIsImportExportOpen(false)
      }
    } catch { }
  }

  const handleExport = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/export`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'clients', data: clients }) })
      const blob = await r.blob(); const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `clients_${new Date().toISOString().split('T')[0]}.xlsx`; a.click(); URL.revokeObjectURL(url)
    } catch { }
  }

  // Função para exportar clientes em PDF
  const exportarClientesPDF = async () => {
    try {
      setIsExportClientesModalOpen(false)

      // Obter clientes para exportar
      const clientesParaExportar = exportarFiltrados
        ? filteredAndSorted
        : clients

      // Validar se há clientes
      if (clientesParaExportar.length === 0) {
        alert('Não há clientes para exportar!')
        return
      }

      // Calcular resumo estatístico (se habilitado)
      let totalClientes = clientesParaExportar.length
      let clientesComCPF = 0
      let clientesComCNPJ = 0
      let clientesComEmail = 0
      let clientesSemEmail = 0
      let clientesComTelefone = 0
      let clientesSemTelefone = 0
      let clientesComEndereco = 0
      let clientesSemEndereco = 0

      if (incluirResumo) {
        clientesParaExportar.forEach(c => {
          if (c.cpf) clientesComCPF++
          if (c.cnpj) clientesComCNPJ++
          if (c.email && c.email.trim()) clientesComEmail++
          else clientesSemEmail++
          if (c.phone && c.phone.trim()) clientesComTelefone++
          else clientesSemTelefone++
          if (c.address && c.address.trim()) clientesComEndereco++
          else clientesSemEndereco++
        })
      }

      // Criar elemento temporário para capturar o conteúdo
      const tempElement = document.createElement('div')
      tempElement.style.position = 'absolute'
      tempElement.style.left = '-9999px'
      tempElement.style.top = '-9999px'
      tempElement.style.width = '800px'
      tempElement.style.backgroundColor = 'white'
      tempElement.style.padding = '20px'
      tempElement.style.fontFamily = 'Arial, sans-serif'

      // Construir informações de filtros aplicados
      let infoFiltros = 'Todos os clientes'
      if (exportarFiltrados) {
        const filtrosAtivos = []
        if (filters.name) filtrosAtivos.push(`Nome: ${filters.name}`)
        if (filters.email) filtrosAtivos.push(`Email: ${filters.email}`)
        if (filters.phone) filtrosAtivos.push(`Telefone: ${filters.phone}`)

        if (filtrosAtivos.length > 0) {
          infoFiltros = `Clientes filtrados: ${filtrosAtivos.join(', ')}`
        } else {
          infoFiltros = 'Todos os clientes (sem filtros ativos)'
        }
      }

      // Construir HTML do relatório
      let htmlContent = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: bold;">ALYA VELAS</h1>
          <h2 style="color: #374151; font-size: 24px; margin: 10px 0; font-weight: bold;">Relatório de Clientes</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">${infoFiltros}</p>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
      `

      // Resumo Estatístico (se habilitado)
      if (incluirResumo) {
        htmlContent += `
          <div style="margin-bottom: 30px;">
            <h3 style="color: #f59e0b; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #f59e0b; padding-bottom: 5px;">📊 Resumo Estatístico</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
              <div style="background: #fffbeb; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <div style="font-weight: bold; color: #f59e0b; margin-bottom: 5px;">Total de Clientes</div>
                <div style="font-size: 18px; font-weight: bold; color: #d97706;">${totalClientes}</div>
              </div>
              <div style="background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <div style="font-weight: bold; color: #3b82f6; margin-bottom: 5px;">Clientes com CPF</div>
                <div style="font-size: 18px; font-weight: bold; color: #2563eb;">${clientesComCPF}</div>
              </div>
              <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                <div style="font-weight: bold; color: #10b981; margin-bottom: 5px;">Clientes com CNPJ</div>
                <div style="font-size: 18px; font-weight: bold; color: #059669;">${clientesComCNPJ}</div>
              </div>
              <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                <div style="font-weight: bold; color: #10b981; margin-bottom: 5px;">Com Email</div>
                <div style="font-size: 18px; font-weight: bold; color: #059669;">${clientesComEmail}</div>
              </div>
              <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
                <div style="font-weight: bold; color: #ef4444; margin-bottom: 5px;">Sem Email</div>
                <div style="font-size: 18px; font-weight: bold; color: #dc2626;">${clientesSemEmail}</div>
              </div>
              <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                <div style="font-weight: bold; color: #10b981; margin-bottom: 5px;">Com Telefone</div>
                <div style="font-size: 18px; font-weight: bold; color: #059669;">${clientesComTelefone}</div>
              </div>
              <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
                <div style="font-weight: bold; color: #ef4444; margin-bottom: 5px;">Sem Telefone</div>
                <div style="font-size: 18px; font-weight: bold; color: #dc2626;">${clientesSemTelefone}</div>
              </div>
              <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                <div style="font-weight: bold; color: #10b981; margin-bottom: 5px;">Com Endereço</div>
                <div style="font-size: 18px; font-weight: bold; color: #059669;">${clientesComEndereco}</div>
              </div>
            </div>
          </div>
        `
      }

      // Tabela de Clientes
      htmlContent += `
        <div style="margin-bottom: 30px;">
          <h3 style="color: #f59e0b; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #f59e0b; padding-bottom: 5px;">👥 Lista de Clientes</h3>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; background: white;">
              <thead>
                <tr style="background: linear-gradient(to right, #fef3c7, #fed7aa); border-bottom: 2px solid #f59e0b;">
                  <th style="padding: 12px; text-align: left; font-weight: bold; color: #92400e; border-right: 1px solid #fbbf24;">Nome</th>
                  <th style="padding: 12px; text-align: left; font-weight: bold; color: #92400e; border-right: 1px solid #fbbf24;">CPF/CNPJ</th>
                  <th style="padding: 12px; text-align: left; font-weight: bold; color: #92400e; border-right: 1px solid #fbbf24;">Email</th>
                  <th style="padding: 12px; text-align: left; font-weight: bold; color: #92400e; border-right: 1px solid #fbbf24;">Telefone</th>
                  <th style="padding: 12px; text-align: left; font-weight: bold; color: #92400e;">Endereço</th>
                </tr>
              </thead>
              <tbody>
      `

      // Adicionar linhas da tabela
      clientesParaExportar.forEach((client, index) => {
        const documento = client.cpf || client.cnpj || '-'
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb'

        htmlContent += `
          <tr style="background: ${bgColor}; border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; color: #374151; font-weight: 500;">${client.name}</td>
            <td style="padding: 10px; color: #6b7280;">${documento}</td>
            <td style="padding: 10px; color: #374151;">${client.email}</td>
            <td style="padding: 10px; color: #374151;">${client.phone}</td>
            <td style="padding: 10px; color: #6b7280;">${client.address}</td>
          </tr>
        `
      })

      htmlContent += `
              </tbody>
            </table>
          </div>
        </div>
      `

      // Rodapé
      htmlContent += `
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            Relatório gerado automaticamente pelo sistema Alya Velas<br>
            Dados baseados em clientes ${exportarFiltrados ? 'filtrados' : 'completos'}<br>
            Para mais informações, acesse o painel administrativo
          </p>
        </div>
      `

      tempElement.innerHTML = htmlContent
      document.body.appendChild(tempElement)

      // Capturar o elemento como imagem
      const canvas = await html2canvas(tempElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })

      // Remover elemento temporário
      document.body.removeChild(tempElement)

      // Criar PDF
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // Salvar PDF
      const fileName = `Clientes_${exportarFiltrados ? 'Filtrados' : 'Completos'}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)

      alert(`✅ Relatório PDF exportado com sucesso!\nArquivo: ${fileName}\n\n📊 Dados incluídos:\n• Total de clientes: ${totalClientes}${incluirResumo ? `\n• Clientes com CPF: ${clientesComCPF}\n• Clientes com CNPJ: ${clientesComCNPJ}\n• Clientes com email: ${clientesComEmail}\n• Clientes com telefone: ${clientesComTelefone}\n• Clientes com endereço: ${clientesComEndereco}` : ''}`)

    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      alert('❌ Erro ao exportar PDF. Tente novamente.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Users className="w-8 h-8 text-amber-600" />
          Clientes
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => setIsExportClientesModalOpen(true)}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <Download className="h-5 w-5" />
            Exportar PDF
          </button>
          <button
            onClick={() => setIsImportExportOpen(true)}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <Download className="h-5 w-5" />
            Importar/Exportar
          </button>
          <button
            onClick={() => { setEditing(null); setForm({ name: '', email: '', phone: '', address: '', documentType: 'cpf', cpf: '', cnpj: '' }); setFormErrors({}); setIsModalOpen(true) }}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <Plus className="h-5 w-5" />
            Novo Cliente
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Filtre seus itens:</h2>
          </div>
          <div className="flex items-end gap-1 sm:gap-2 md:gap-3 lg:gap-4 flex-1">
            <div className="flex flex-col flex-1 min-w-0">
              <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-1 truncate">Nome</label>
              <input
                type="text"
                placeholder="Nome..."
                value={filters.name}
                onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
                className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white w-full"
              />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-1 truncate">Email</label>
              <input
                type="text"
                placeholder="Email..."
                value={filters.email}
                onChange={(e) => setFilters(prev => ({ ...prev, email: e.target.value }))}
                className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white w-full"
              />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-1 truncate">Telefone</label>
              <input
                type="text"
                placeholder="Telefone..."
                value={filters.phone}
                onChange={(e) => setFilters(prev => ({ ...prev, phone: e.target.value }))}
                className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white w-full"
              />
            </div>
          </div>
          <div className="lg:ml-auto">
            <button onClick={clearFilters} className="px-2 sm:px-3 md:px-4 py-1 sm:py-2 bg-amber-600 text-white rounded-md text-xs sm:text-sm hover:bg-amber-700 transition-colors w-full lg:w-auto">
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-4">
        {clients.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600">Nenhum cliente encontrado.</p>
            <p className="text-gray-500 text-sm mt-2">Adicione seu primeiro cliente clicando no botão "Novo Cliente".</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden overflow-x-auto">
            <div className="bg-gradient-to-r from-amber-50 to-orange-100 border-b border-amber-200 p-4 min-w-max">
              <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 lg:gap-3 min-w-[800px]">
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={clients.length > 0 && selectedClients.size === clients.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
                  />
                </div>
                <button onClick={() => handleSort('name')} className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-52 sm:w-60">
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide truncate">Nome</p>
                  {getSortIcon('name')}
                </button>
                <button onClick={() => handleSort('email')} className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-36 sm:w-44">
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide truncate">Email</p>
                  {getSortIcon('email')}
                </button>
                <button onClick={() => handleSort('phone')} className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-28 sm:w-32">
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide truncate">Telefone</p>
                  {getSortIcon('phone')}
                </button>
                <button onClick={() => handleSort('address')} className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide truncate">Endereço</p>
                  {getSortIcon('address')}
                </button>
                <div className="flex-shrink-0 w-16 sm:w-20 flex justify-center">
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">Ações</p>
                </div>
              </div>
            </div>

            {filteredAndSorted.map((c, index) => (
              <div key={c.id} className={`bg-white border-b border-gray-100 p-4 hover:bg-amber-50/30 transition-all duration-200 ${index === clients.length - 1 ? 'border-b-0' : ''}`}>
                <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 lg:gap-3 min-w-[800px]">
                  <div className="flex-shrink-0 text-left">
                    <input
                      type="checkbox"
                      checked={selectedClients.has(c.id)}
                      onChange={() => handleSelect(c.id)}
                      className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
                    />
                  </div>
                  <div className="flex-shrink-0 w-52 sm:w-60 text-left">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{c.name}</h3>
                    {(c.cpf || c.cnpj) && (
                      <p className="text-xs text-gray-500 truncate">{c.cpf || c.cnpj}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 w-36 sm:w-44 text-center">
                    <p className="text-xs sm:text-sm text-gray-600 truncate">{c.email}</p>
                  </div>
                  <div className="flex-shrink-0 w-28 sm:w-32 text-center">
                    <p className="text-xs sm:text-sm text-gray-600 truncate">{c.phone}</p>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs sm:text-sm text-gray-600 truncate">{c.address}</p>
                  </div>
                  <div className="flex-shrink-0 w-16 sm:w-20 flex gap-0.5 sm:gap-1 justify-center">
                    <button onClick={() => { setEditing(c); setForm({ name: c.name, email: c.email, phone: c.phone, address: c.address, documentType: c.cpf ? 'cpf' : 'cnpj', cpf: c.cpf || '', cnpj: c.cnpj || '' }); setIsModalOpen(true) }} className="p-0.5 sm:p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-full transition-all duration-200" title="Editar cliente">
                      <Edit className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                    <button onClick={() => deleteOne(c.id)} className="p-0.5 sm:p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-all duration-200" title="Excluir cliente">
                      <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {selectedClients.size > 0 && (
              <div className="flex justify-end p-4 bg-red-50 border-t border-red-200">
                <button onClick={deleteSelected} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                  <Trash2 className="h-4 w-4" />
                  Deletar Selecionado{selectedClients.size > 1 ? 's' : ''} ({selectedClients.size})
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Novo/Editar Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[10000] p-4" onClick={(e) => { if (e.target === e.currentTarget) { setIsModalOpen(false); setEditing(null); setFormErrors({}) } }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">{editing ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => { setIsModalOpen(false); setEditing(null); setFormErrors({}) }} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${formErrors.name ? 'border-red-500 bg-red-50' : ''
                    }`}
                />
                {formErrors.name && (
                  <div className="absolute top-full left-0 mt-1 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg z-10">
                    {formErrors.name}
                    <div className="absolute -top-1 left-2 w-2 h-2 bg-red-500 transform rotate-45"></div>
                  </div>
                )}
              </div>
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${formErrors.email ? 'border-red-500 bg-red-50' : ''
                    }`}
                />
                {formErrors.email && (
                  <div className="absolute top-full left-0 mt-1 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg z-10">
                    {formErrors.email}
                    <div className="absolute -top-1 left-2 w-2 h-2 bg-red-500 transform rotate-45"></div>
                  </div>
                )}
              </div>
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Telefone <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${formErrors.phone ? 'border-red-500 bg-red-50' : ''
                    }`}
                />
                {formErrors.phone && (
                  <div className="absolute top-full left-0 mt-1 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg z-10">
                    {formErrors.phone}
                    <div className="absolute -top-1 left-2 w-2 h-2 bg-red-500 transform rotate-45"></div>
                  </div>
                )}
              </div>
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Endereço <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${formErrors.address ? 'border-red-500 bg-red-50' : ''
                    }`}
                />
                {formErrors.address && (
                  <div className="absolute top-full left-0 mt-1 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg z-10">
                    {formErrors.address}
                    <div className="absolute -top-1 left-2 w-2 h-2 bg-red-500 transform rotate-45"></div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Tipo de Documento <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.documentType}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    documentType: e.target.value as 'cpf' | 'cnpj',
                    cpf: '', // Limpar campos ao trocar tipo
                    cnpj: ''
                  }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="cpf">CPF (Pessoa Física)</option>
                  <option value="cnpj">CNPJ (Pessoa Jurídica)</option>
                </select>
              </div>
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {form.documentType === 'cpf' ? 'CPF' : 'CNPJ'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.documentType === 'cpf' ? form.cpf : form.cnpj}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    [form.documentType]: e.target.value
                  }))}
                  placeholder={form.documentType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${(form.documentType === 'cpf' && formErrors.cpf) || (form.documentType === 'cnpj' && formErrors.cnpj) ? 'border-red-500 bg-red-50' : ''
                    }`}
                />
                {((form.documentType === 'cpf' && formErrors.cpf) || (form.documentType === 'cnpj' && formErrors.cnpj)) && (
                  <div className="absolute top-full left-0 mt-1 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg z-10">
                    {form.documentType === 'cpf' ? formErrors.cpf : formErrors.cnpj}
                    <div className="absolute -top-1 left-2 w-2 h-2 bg-red-500 transform rotate-45"></div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setIsModalOpen(false); setEditing(null); setFormErrors({}) }} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">Cancelar</button>
              <button onClick={saveClient} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Importar/Exportar */}
      {isImportExportOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setIsImportExportOpen(false) }}>
          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-b from-amber-50 to-white border-b">
              <div className="flex items-center gap-3">
                <Upload className="w-5 h-5 text-amber-700" />
                <h2 className="text-xl font-extrabold text-gray-800">Importar/Exportar Clientes</h2>
              </div>
              <button onClick={() => setIsImportExportOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {/* Body */}
            <div className="px-5 py-5">
              <p className="text-center text-sm text-gray-700 mb-5">Escolha uma das opções abaixo para gerenciar seus dados:</p>

              {/* Dica / Info box */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 mb-6 text-center">
                <p className="font-bold text-amber-800 mb-1">Primeiro baixe o modelo, depois importe!</p>
                <p className="text-amber-700 text-sm">Baixe o arquivo modelo, preencha com seus dados e depois faça o upload.</p>
                <button onClick={downloadModel} className="mt-4 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow mx-auto">
                  <Download className="w-4 h-4" /> Baixar Modelo de Clientes
                </button>
              </div>

              {/* Importar */}
              <div className="space-y-3">
                <label className="block w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white cursor-pointer shadow hover:shadow-md transition-shadow text-center">
                  <div className="px-3 py-3 flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4 opacity-90" />
                    <div className="text-center">
                      <p className="text-lg font-bold leading-tight">Selecionar Arquivo</p>
                      <p className="text-white/90 text-xs">Carregar arquivo .xlsx</p>
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
                </label>

                <button onClick={handleExport} className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white px-3 py-3 text-center shadow hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-center gap-2">
                    <Download className="w-4 h-4 opacity-90" />
                    <div className="text-center">
                      <p className="text-lg font-bold leading-tight">Exportar</p>
                      <p className="text-white/90 text-xs">Salvar dados em arquivo</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Footer */}
              <div className="mt-6">
                <button onClick={() => setIsImportExportOpen(false)} className="w-full px-6 py-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuração de Exportação de Clientes */}
      {isExportClientesModalOpen && (
        <div
          className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 pb-4 pt-[180px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsExportClientesModalOpen(false)
            }
          }}
        >
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200/50">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-amber-200/50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2">
                  <Download className="w-6 h-6 text-amber-700" />
                  Exportar Clientes em PDF
                </h2>
                <button
                  onClick={() => setIsExportClientesModalOpen(false)}
                  className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 p-2 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="space-y-6">
              <p className="text-gray-700 text-sm">
                Configure as opções de exportação:
              </p>

              {/* Opção: Exportar Filtrados */}
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <input
                  type="checkbox"
                  id="exportarFiltrados"
                  checked={exportarFiltrados}
                  onChange={(e) => setExportarFiltrados(e.target.checked)}
                  className="mt-1 w-5 h-5 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
                />
                <div className="flex-1">
                  <label htmlFor="exportarFiltrados" className="font-semibold text-gray-800 cursor-pointer block mb-1">
                    Exportar apenas clientes filtrados
                  </label>
                  <p className="text-sm text-gray-600">
                    {exportarFiltrados
                      ? 'Serão exportados apenas os clientes que estão visíveis na lista (com filtros aplicados).'
                      : 'Todos os clientes serão exportados, independente dos filtros ativos.'}
                  </p>
                </div>
              </div>

              {/* Opção: Incluir Resumo */}
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <input
                  type="checkbox"
                  id="incluirResumo"
                  checked={incluirResumo}
                  onChange={(e) => setIncluirResumo(e.target.checked)}
                  className="mt-1 w-5 h-5 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
                />
                <div className="flex-1">
                  <label htmlFor="incluirResumo" className="font-semibold text-gray-800 cursor-pointer block mb-1">
                    Incluir resumo estatístico
                  </label>
                  <p className="text-sm text-gray-600">
                    {incluirResumo
                      ? 'O PDF incluirá um resumo com totais de clientes, distribuição por tipo de documento (CPF/CNPJ) e estatísticas de dados completos.'
                      : 'Apenas a tabela de clientes será incluída no PDF.'}
                  </p>
                </div>
              </div>

              {/* Informações sobre filtros ativos */}
              {(filters.name || filters.email || filters.phone) && exportarFiltrados && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm font-semibold text-blue-800 mb-2">Filtros ativos:</p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {filters.name && <li>• Nome: {filters.name}</li>}
                    {filters.email && <li>• Email: {filters.email}</li>}
                    {filters.phone && <li>• Telefone: {filters.phone}</li>}
                  </ul>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setIsExportClientesModalOpen(false)}
                  className="flex-1 py-2 px-4 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={exportarClientesPDF}
                  className="flex-1 py-2 px-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Exportar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Clients

