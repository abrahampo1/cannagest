import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft, Nfc, Search, Package, ArrowRightLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { NfcScanner } from '@/components/ui/nfc-scanner'
import { useToast } from '@/store/toast.store'
import { useAuthStore } from '@/store/auth.store'

interface CartItem {
  productId: string
  name: string
  pointsPrice: number
  quantity: number
  maxStock: number
  unit: string
}

/** Input numérico que solo aplica el valor al hacer blur o pulsar Enter.
 *  Muestra el valor redondeado a centésimas pero pasa el valor exacto al commit. */
function DeferredNumberInput({ value, onCommit, min, max, step, className }: {
  value: number
  onCommit: (v: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
}) {
  const display = Math.round(value * 100) / 100
  const [draft, setDraft] = useState(String(display))
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!editing) setDraft(String(display))
  }, [display, editing])

  function commit() {
    setEditing(false)
    const parsed = parseFloat(draft)
    if (isNaN(parsed) || parsed <= 0) {
      onCommit(min ?? 0.1)
    } else {
      onCommit(parsed)
    }
  }

  return (
    <input
      type="number"
      value={editing ? draft : display}
      onChange={e => { setEditing(true); setDraft(e.target.value) }}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur() } }}
      className={className}
      min={min}
      max={max}
      step={step}
    />
  )
}

export default function NewSalePage() {
  const toast = useToast()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [members, setMembers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [productDropdownOpen, setProductDropdownOpen] = useState(false)
  const productSearchRef = useRef<HTMLDivElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [currentRegister, setCurrentRegister] = useState<any>(null)
  const [nfcScannerOpen, setNfcScannerOpen] = useState(false)

  useEffect(() => {
    loadProducts()
    loadRegister()
  }, [])

  useEffect(() => {
    if (memberSearch.length >= 2) {
      searchMembers(memberSearch)
    }
  }, [memberSearch])

  useEffect(() => {
    if (selectedMemberId) {
      loadMemberBalance(selectedMemberId)
    }
  }, [selectedMemberId])

  async function searchMembers(search: string) {
    const res = await window.api.member.getAll({ page: 1, pageSize: 50, search })
    if (res.success) setMembers(res.data.items)
  }

  async function loadProducts() {
    const res = await window.api.product.getAll({ page: 1, pageSize: 200 })
    if (res.success) setProducts(res.data.items)
  }

  async function loadRegister() {
    const res = await window.api.cashRegister.getCurrent()
    if (res.success) setCurrentRegister(res.data)
  }

  async function loadMemberBalance(id: string) {
    const res = await window.api.member.getById(id)
    if (res.success) setSelectedMember(res.data)
  }

  async function handleNfcScan(tagId: string) {
    setNfcScannerOpen(false)
    const res = await window.api.member.getByNfc(tagId)
    if (res.success) {
      setSelectedMemberId(res.data.id)
      setSelectedMember(res.data)
      setMembers([])
      setMemberSearch('')
      toast.success(`Socio: ${res.data.firstName} ${res.data.lastName}`)
    } else {
      toast.error(res.error || 'Llavero no registrado')
    }
  }

  // Close product dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (productSearchRef.current && !productSearchRef.current.contains(e.target as Node)) {
        setProductDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function addToCart(product: any) {
    if (cart.find(c => c.productId === product.id)) {
      toast.info('Producto ya en el carrito')
      return
    }
    setCart([...cart, {
      productId: product.id,
      name: product.name,
      pointsPrice: product.pointsPrice,
      quantity: 1,
      maxStock: product.currentStock,
      unit: product.unit,
    }])
    setProductSearch('')
    setProductDropdownOpen(false)
  }

  function getUnitLabel(unit: string) {
    const labels: Record<string, string> = { gramo: 'g', gram: 'g', ml: 'ml', unit: 'ud', unidad: 'ud', kg: 'kg', litro: 'L' }
    return labels[unit] || unit
  }

  function getStepForUnit(unit: string) {
    if (['gramo', 'gram', 'ml'].includes(unit)) return 0.5
    if (['kg', 'litro'].includes(unit)) return 0.1
    return 1
  }

  function getMinForUnit(unit: string) {
    if (['unit', 'unidad'].includes(unit)) return 1
    return 0.1
  }

  function clampQty(qty: number, maxStock: number, unit: string) {
    const min = getMinForUnit(unit)
    return Math.max(min, Math.min(maxStock, qty))
  }

  function updateQuantity(productId: string, delta: number) {
    setCart(cart.map(item => {
      if (item.productId !== productId) return item
      const step = getStepForUnit(item.unit)
      return { ...item, quantity: clampQty(item.quantity + delta * step, item.maxStock, item.unit) }
    }))
  }

  function setQuantity(productId: string, qty: number) {
    setCart(cart.map(item => {
      if (item.productId !== productId) return item
      return { ...item, quantity: clampQty(qty, item.maxStock, item.unit) }
    }))
  }

  function setSubtotal(productId: string, points: number) {
    setCart(cart.map(item => {
      if (item.productId !== productId) return item
      if (item.pointsPrice <= 0) return item
      const qty = points / item.pointsPrice
      return { ...item, quantity: clampQty(qty, item.maxStock, item.unit) }
    }))
  }

  function removeFromCart(productId: string) {
    setCart(cart.filter(c => c.productId !== productId))
  }

  const totalPoints = cart.reduce((sum, item) => sum + item.pointsPrice * item.quantity, 0)
  const deficit = selectedMember ? totalPoints - selectedMember.pointsBalance : 0
  const hasInsufficientBalance = selectedMember && cart.length > 0 && deficit > 0
  const canSubmit = selectedMemberId && cart.length > 0 && selectedMember && selectedMember.pointsBalance >= totalPoints

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const data: any = {
        memberId: selectedMemberId,
        soldById: user!.id,
        items: cart.map(c => ({ productId: c.productId, quantity: c.quantity })),
      }
      if (currentRegister) data.cashRegisterId = currentRegister.id
      const res = await window.api.sale.create(data)
      if (res.success) {
        toast.success(`Venta ${res.data.saleNumber} creada`)
        navigate('/sales')
      } else {
        toast.error(res.error || 'Error al crear venta')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredProducts = products.filter(p => {
    if (p.currentStock <= 0) return false
    if (cart.find(c => c.productId === p.id)) return false
    if (!productSearch.trim()) return true
    const q = productSearch.toLowerCase()
    return p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q))
  })

  return (
    <div className="space-y-6 fade-in">
      <div className="bg-zinc-900 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-amber-500 to-yellow-400" />
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/sales')}><ArrowLeft size={16} /></Button>
          <ShoppingCart size={20} className="text-orange-400" />
          <div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">Nueva Venta</h1>
            <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mt-1">
              {currentRegister ? <Badge variant="success">Caja abierta</Badge> : <Badge variant="warning">Sin caja abierta</Badge>}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Member + Products */}
        <div className="lg:col-span-2 space-y-4">
          {/* Member selector */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
            <h3 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-lime-400 inline-block" />
              Socio
            </h3>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Buscar socio por nombre, DNI o email..."
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                />
              </div>
              <Button variant="secondary" onClick={() => setNfcScannerOpen(true)} title="Buscar por NFC">
                <Nfc size={18} />
              </Button>
            </div>
            {members.length > 0 && !selectedMemberId && (
              <div className="border border-zinc-800 rounded-lg max-h-40 overflow-y-auto divide-y divide-zinc-800">
                {members.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedMemberId(m.id); setMembers([]) }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-800 flex justify-between text-zinc-300"
                  >
                    <span>{m.firstName} {m.lastName} - {m.dni}</span>
                    <span className="text-zinc-500">{m.pointsBalance} pts</span>
                  </button>
                ))}
              </div>
            )}
            {selectedMember && (
              <div className="flex items-center justify-between bg-lime-400/10 px-4 py-3 rounded-lg border border-lime-400/20">
                <div>
                  <p className="font-mono font-medium text-zinc-100">{selectedMember.firstName} {selectedMember.lastName}</p>
                  <p className="text-[10px] font-mono tracking-widest text-lime-400 uppercase">DNI: {selectedMember.dni}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black font-mono text-lime-400">{selectedMember.pointsBalance}</p>
                  <p className="text-[10px] font-mono tracking-widest text-lime-400/60 uppercase">puntos disponibles</p>
                </div>
              </div>
            )}
          </div>

          {/* Add product */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
            <h3 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-lime-400 inline-block" />
              Agregar Producto
            </h3>
            <div className="relative" ref={productSearchRef}>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar producto por nombre o SKU..."
                  value={productSearch}
                  onChange={e => { setProductSearch(e.target.value); setProductDropdownOpen(true) }}
                  onFocus={() => setProductDropdownOpen(true)}
                  className="block w-full rounded-lg border border-zinc-700 pl-9 pr-3 py-2 text-sm bg-zinc-800 text-zinc-100 transition-colors duration-150 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-lime-400 focus:ring-lime-400"
                />
              </div>
              {productDropdownOpen && (
                <div className="absolute z-20 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-zinc-500">
                      <Package size={24} className="mx-auto mb-2 text-zinc-600" />
                      {productSearch ? 'Sin resultados' : 'No hay productos disponibles'}
                    </div>
                  ) : (
                    filteredProducts.map(p => (
                      <button
                        key={p.id}
                        onClick={() => addToCart(p)}
                        className="w-full px-3 py-2.5 text-left text-sm hover:bg-zinc-800 flex items-center justify-between gap-2 transition-colors border-b border-zinc-800 last:border-b-0"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-100 truncate">{p.name}</p>
                          <p className="text-xs text-zinc-500">{p.sku || 'Sin SKU'} · Stock: {p.currentStock} {p.unit}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold text-lime-400 whitespace-nowrap">{p.pointsPrice} pts</span>
                          <Plus size={14} className="text-zinc-500" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cart items */}
          {cart.length > 0 && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <table className="w-full">
                <thead className="bg-zinc-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Producto</th>
                    <th className="px-4 py-3 text-center text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Cantidad</th>
                    <th className="px-4 py-3 text-center text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                      <div className="flex items-center justify-center gap-1">
                        <ArrowRightLeft size={12} />
                        Precio unit.
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Subtotal (pts)</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {cart.map(item => {
                    const unitLabel = getUnitLabel(item.unit)
                    const subtotal = item.pointsPrice * item.quantity
                    return (
                      <tr key={item.productId}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-zinc-100">{item.name}</p>
                          <p className="text-xs text-zinc-500">Stock: {item.maxStock} {unitLabel}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 rounded hover:bg-zinc-800 text-zinc-400"><Minus size={14} /></button>
                            <div className="relative">
                              <DeferredNumberInput
                                value={item.quantity}
                                onCommit={v => setQuantity(item.productId, v)}
                                className="w-20 text-center border border-zinc-700 rounded px-1 py-1 text-sm pr-6 bg-zinc-800 text-zinc-100"
                                min={getMinForUnit(item.unit)}
                                max={item.maxStock}
                                step={getStepForUnit(item.unit)}
                              />
                              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 pointer-events-none">{unitLabel}</span>
                            </div>
                            <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 rounded hover:bg-zinc-800 text-zinc-400"><Plus size={14} /></button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-zinc-500">
                          {item.pointsPrice} pts/{unitLabel}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <div className="relative">
                              <DeferredNumberInput
                                value={parseFloat(subtotal.toFixed(2))}
                                onCommit={v => setSubtotal(item.productId, v)}
                                className="w-24 text-center border rounded px-1 py-1 text-sm font-semibold pr-8 border-lime-400/40 bg-zinc-800 text-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                                min={item.pointsPrice * getMinForUnit(item.unit)}
                                step={1}
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-lime-400/60 pointer-events-none">pts</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => removeFromCart(item.productId)} className="p-1 rounded text-red-400 hover:bg-red-400/10">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Summary */}
        <div className="space-y-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 sticky top-6">
            <h3 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-lime-400 inline-block" />
              Resumen
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Productos:</span>
                <span className="font-mono text-zinc-300">{cart.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Balance socio:</span>
                <span className="font-mono font-medium text-zinc-300">{selectedMember?.pointsBalance ?? '-'} pts</span>
              </div>
              <hr className="border-zinc-800" />
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Total:</span>
                <span className="text-2xl font-black font-mono text-lime-400">{totalPoints.toFixed(1)} pts</span>
              </div>
              {hasInsufficientBalance && (
                <div className="bg-red-400/10 border border-red-400/30 rounded-lg p-3">
                  <p className="text-xs text-red-400 font-medium">Balance insuficiente (faltan {deficit.toFixed(1)} pts)</p>
                </div>
              )}
            </div>
            <Button
              onClick={handleSubmit}
              loading={submitting}
              disabled={!canSubmit}
              className="w-full mt-6"
              size="lg"
            >
              Confirmar Venta
            </Button>
          </div>
        </div>
      </div>

      <NfcScanner
        open={nfcScannerOpen}
        onClose={() => setNfcScannerOpen(false)}
        onScan={handleNfcScan}
      />
    </div>
  )
}
