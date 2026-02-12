import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Package, Tag, Warehouse, CheckCircle, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/store/toast.store'

const STEPS = [
  { label: 'Info Basica', icon: Package },
  { label: 'Categoria y Precio', icon: Tag },
  { label: 'Inventario', icon: Warehouse },
  { label: 'Confirmacion', icon: CheckCircle },
]

const STEP_COLORS = ['bg-lime-400', 'bg-cyan-400', 'bg-violet-400', 'bg-emerald-400']
const STEP_RING_COLORS = ['ring-lime-400', 'ring-cyan-400', 'ring-violet-400', 'ring-emerald-400']
const STEP_BG_COLORS = ['bg-lime-400/20', 'bg-cyan-400/20', 'bg-violet-400/20', 'bg-emerald-400/20']
const STEP_TEXT_COLORS = ['text-lime-400', 'text-cyan-400', 'text-violet-400', 'text-emerald-400']

const unitOptions = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'gramo', label: 'Gramo' },
  { value: 'ml', label: 'Mililitro' },
  { value: 'kg', label: 'Kilogramo' },
]

const unitLabels: Record<string, string> = {
  unidad: 'Unidad',
  gramo: 'Gramo',
  ml: 'Mililitro',
  kg: 'Kilogramo',
}

interface StepErrors {
  [key: string]: string
}

export default function ProductNewPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState<'left' | 'right'>('left')
  const [saving, setSaving] = useState(false)

  // Step 1 - Basic info
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [description, setDescription] = useState('')

  // Step 2 - Category & Price
  const [categories, setCategories] = useState<any[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [pointsPrice, setPointsPrice] = useState('')
  const [unit, setUnit] = useState('unidad')

  // Step 3 - Inventory
  const [currentStock, setCurrentStock] = useState('0')
  const [minStock, setMinStock] = useState('0')

  // Validation errors
  const [errors, setErrors] = useState<StepErrors>({})

  useEffect(() => {
    async function loadCategories() {
      const res = await window.api.category.getAll()
      if (res.success) setCategories(res.data)
    }
    loadCategories()
  }, [])

  function validateStep(step: number): boolean {
    const errs: StepErrors = {}

    if (step === 0) {
      if (!name.trim()) errs.name = 'Nombre es requerido'
    }

    if (step === 1) {
      if (!categoryId) errs.categoryId = 'Categoria es requerida'
      if (!pointsPrice || parseFloat(pointsPrice) <= 0) errs.pointsPrice = 'Precio debe ser mayor a 0'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function goNext() {
    if (!validateStep(currentStep)) return
    setDirection('left')
    setCurrentStep(s => Math.min(s + 1, STEPS.length - 1))
  }

  function goPrev() {
    setDirection('right')
    setCurrentStep(s => Math.max(s - 1, 0))
  }

  async function handleCreate() {
    setSaving(true)
    try {
      const data: any = {
        name: name.trim(),
        sku: sku.trim() || undefined,
        description: description.trim() || undefined,
        categoryId,
        pointsPrice: parseFloat(pointsPrice),
        currentStock: parseFloat(currentStock) || 0,
        minStock: parseFloat(minStock) || 0,
        unit,
      }

      const res = await window.api.product.create(data)
      if (res.success) {
        toast.success('Producto creado correctamente')
        navigate('/products')
      } else {
        toast.error(res.error || 'Error al crear producto')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const animClass = direction === 'left' ? 'step-slide-left' : 'step-slide-right'

  const categoryOptions = categories.map(c => ({ value: c.id, label: c.name }))
  const selectedCategory = categories.find(c => c.id === categoryId)

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="bg-zinc-900 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-indigo-500 to-violet-400" />
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/products')}
            className="p-2 rounded-lg text-zinc-500 hover:text-lime-400 hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">Nuevo Producto</h1>
            <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mt-1">
              Paso {currentStep + 1} de {STEPS.length} — {STEPS[currentStep].label}
            </p>
          </div>
        </div>
      </div>

      {/* Stepper bar */}
      <div className="bg-zinc-900 rounded-xl p-6">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            const isCompleted = i < currentStep
            const isCurrent = i === currentStep
            return (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                      ${isCompleted
                        ? `${STEP_COLORS[i]} text-zinc-900 step-check-enter`
                        : isCurrent
                          ? `${STEP_BG_COLORS[i]} ${STEP_TEXT_COLORS[i]} ring-2 ${STEP_RING_COLORS[i]}`
                          : 'bg-zinc-800 text-zinc-600'
                      }
                    `}
                  >
                    {isCompleted ? <Check size={18} strokeWidth={3} /> : <Icon size={18} />}
                  </div>
                  <span
                    className={`text-[10px] font-mono tracking-widest uppercase hidden sm:block ${
                      isCurrent ? STEP_TEXT_COLORS[i] : isCompleted ? 'text-zinc-300' : 'text-zinc-600'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 mx-3 hidden sm:block">
                    <div className={`h-0.5 transition-all duration-300 ${
                      i < currentStep ? STEP_COLORS[i] : 'bg-zinc-800'
                    }`} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="bg-zinc-900 rounded-xl p-6" key={currentStep}>
        <div className={animClass}>
          {currentStep === 0 && (
            <StepBasicInfo
              name={name} setName={setName}
              sku={sku} setSku={setSku}
              description={description} setDescription={setDescription}
              errors={errors}
            />
          )}

          {currentStep === 1 && (
            <StepCategoryPrice
              categoryId={categoryId} setCategoryId={setCategoryId}
              categoryOptions={categoryOptions}
              pointsPrice={pointsPrice} setPointsPrice={setPointsPrice}
              unit={unit} setUnit={setUnit}
              errors={errors}
            />
          )}

          {currentStep === 2 && (
            <StepInventory
              currentStock={currentStock} setCurrentStock={setCurrentStock}
              minStock={minStock} setMinStock={setMinStock}
            />
          )}

          {currentStep === 3 && (
            <StepConfirmation
              data={{
                name, sku, description,
                category: selectedCategory?.name,
                pointsPrice, unit,
                currentStock, minStock,
              }}
            />
          )}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          variant="secondary"
          onClick={goPrev}
          disabled={currentStep === 0}
        >
          <ArrowLeft size={16} /> Anterior
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button onClick={goNext}>
            Siguiente <ArrowRight size={16} />
          </Button>
        ) : (
          <Button onClick={handleCreate} loading={saving}>
            <CheckCircle size={16} /> Crear Producto
          </Button>
        )}
      </div>
    </div>
  )
}

// ============================================
// Step Components
// ============================================

function StepBasicInfo({
  name, setName, sku, setSku, description, setDescription, errors,
}: any) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-sm font-mono font-bold tracking-widest text-zinc-300 uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-lime-400 inline-block" />
          Informacion Basica
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Introduce el nombre y los datos basicos del producto. Los campos marcados con * son obligatorios.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Nombre *" value={name} onChange={e => setName(e.target.value)} error={errors.name} />
        <Input label="SKU" value={sku} onChange={e => setSku(e.target.value)} placeholder="Ej: FLOR-001" />
        <div className="md:col-span-2">
          <Input label="Descripcion" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
      </div>
    </div>
  )
}

function StepCategoryPrice({
  categoryId, setCategoryId, categoryOptions,
  pointsPrice, setPointsPrice,
  unit, setUnit, errors,
}: any) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-sm font-mono font-bold tracking-widest text-zinc-300 uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
          Categoria y Precio
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Selecciona la categoria, establece el precio en puntos y la unidad de medida.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Categoria *"
          options={categoryOptions}
          placeholder="Seleccionar..."
          value={categoryId}
          onChange={e => setCategoryId(e.target.value)}
          error={errors.categoryId}
        />
        <Input
          label="Precio (puntos) *"
          type="number"
          step="0.01"
          min="0"
          value={pointsPrice}
          onChange={e => setPointsPrice(e.target.value)}
          error={errors.pointsPrice}
        />
        <Select
          label="Unidad"
          options={unitOptions}
          value={unit}
          onChange={e => setUnit(e.target.value)}
        />
      </div>
    </div>
  )
}

function StepInventory({
  currentStock, setCurrentStock, minStock, setMinStock,
}: any) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-sm font-mono font-bold tracking-widest text-zinc-300 uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
          Inventario
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Configura el stock inicial y el nivel minimo de alerta. Estos campos son opcionales.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Stock Inicial"
          type="number"
          step="0.01"
          min="0"
          value={currentStock}
          onChange={e => setCurrentStock(e.target.value)}
        />
        <Input
          label="Stock Minimo"
          type="number"
          step="0.01"
          min="0"
          value={minStock}
          onChange={e => setMinStock(e.target.value)}
        />
      </div>
    </div>
  )
}

function StepConfirmation({ data }: { data: any }) {
  const fields = [
    { label: 'Nombre', value: data.name || '-' },
    { label: 'SKU', value: data.sku || '-' },
    { label: 'Descripcion', value: data.description || '-' },
    { label: 'Categoria', value: data.category || '-' },
    { label: 'Precio', value: data.pointsPrice ? `${data.pointsPrice} pts` : '-' },
    { label: 'Unidad', value: unitLabels[data.unit] || data.unit },
    { label: 'Stock Inicial', value: data.currentStock || '0' },
    { label: 'Stock Minimo', value: data.minStock || '0' },
  ]

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-sm font-mono font-bold tracking-widest text-zinc-300 uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          Confirmacion
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Revisa los datos antes de crear el producto. Puedes volver a cualquier paso para corregir.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {fields.map((f) => (
          <div key={f.label}>
            <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">{f.label}</span>
            <p className="font-mono font-medium text-zinc-200 mt-0.5 text-sm">{f.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
