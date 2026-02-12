import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, User, CreditCard, Users, CheckCircle,
  Nfc, X, Search, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { NfcScanner } from '@/components/ui/nfc-scanner'
import { useToast } from '@/store/toast.store'

const STEPS = [
  { label: 'Datos Personales', icon: User },
  { label: 'Membresia', icon: CreditCard },
  { label: 'Recomendacion', icon: Users },
  { label: 'Confirmacion', icon: CheckCircle },
]

const membershipOptions = [
  { value: 'NO_FEE', label: 'Sin cuota' },
  { value: 'MONTHLY', label: 'Mensual' },
  { value: 'ANNUAL', label: 'Anual' },
]

const membershipLabels: Record<string, string> = {
  NO_FEE: 'Sin cuota',
  MONTHLY: 'Mensual',
  ANNUAL: 'Anual',
}

interface StepErrors {
  [key: string]: string
}

export default function MemberNewPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState<'left' | 'right'>('left')
  const [saving, setSaving] = useState(false)

  // Step 1 - Personal data
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dni, setDni] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')

  // Step 2 - Membership
  const [membershipType, setMembershipType] = useState('NO_FEE')
  const [membershipFee, setMembershipFee] = useState('0')
  const [nfcTagId, setNfcTagId] = useState('')
  const [nfcScannerOpen, setNfcScannerOpen] = useState(false)

  // Step 3 - Referral
  const [referralSearch, setReferralSearch] = useState('')
  const [referralResults, setReferralResults] = useState<any[]>([])
  const [selectedReferrer, setSelectedReferrer] = useState<any>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // Validation errors
  const [errors, setErrors] = useState<StepErrors>({})

  // Referral search with debounce
  useEffect(() => {
    if (!referralSearch || referralSearch.length < 2) {
      setReferralResults([])
      return
    }

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await window.api.member.searchForReferral(referralSearch)
        if (res.success) {
          setReferralResults(res.data)
        }
      } finally {
        setSearchLoading(false)
      }
    }, 300)

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [referralSearch])

  function validateStep(step: number): boolean {
    const errs: StepErrors = {}

    if (step === 0) {
      if (!firstName.trim()) errs.firstName = 'Nombre es requerido'
      if (!lastName.trim()) errs.lastName = 'Apellido es requerido'
      if (!dni.trim()) errs.dni = 'DNI es requerido'
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
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dni: dni.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        membershipType,
        membershipFee: parseFloat(membershipFee) || 0,
        nfcTagId: nfcTagId || null,
        referredById: selectedReferrer?.id || null,
      }

      const res = await window.api.member.create(data)
      if (res.success) {
        toast.success('Socio creado correctamente')
        navigate('/members/' + res.data.id)
      } else {
        toast.error(res.error || 'Error al crear socio')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const animClass = direction === 'left' ? 'step-slide-left' : 'step-slide-right'

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="bg-zinc-900 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-lime-400 via-emerald-500 to-cyan-400" />
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/members')}
            className="p-2 rounded-lg text-zinc-500 hover:text-lime-400 hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">Nuevo Socio</h1>
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
                        ? 'bg-lime-400 text-zinc-900 step-check-enter'
                        : isCurrent
                          ? 'bg-lime-400/20 text-lime-400 ring-2 ring-lime-400'
                          : 'bg-zinc-800 text-zinc-600'
                      }
                    `}
                  >
                    {isCompleted ? <Check size={18} strokeWidth={3} /> : <Icon size={18} />}
                  </div>
                  <span
                    className={`text-[10px] font-mono tracking-widest uppercase hidden sm:block ${
                      isCurrent ? 'text-lime-400' : isCompleted ? 'text-zinc-300' : 'text-zinc-600'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 mx-3 hidden sm:block">
                    <div className={`h-0.5 transition-all duration-300 ${
                      i < currentStep ? 'bg-lime-400' : 'bg-zinc-800'
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
            <StepPersonalData
              firstName={firstName} setFirstName={setFirstName}
              lastName={lastName} setLastName={setLastName}
              dni={dni} setDni={setDni}
              email={email} setEmail={setEmail}
              phone={phone} setPhone={setPhone}
              address={address} setAddress={setAddress}
              dateOfBirth={dateOfBirth} setDateOfBirth={setDateOfBirth}
              errors={errors}
            />
          )}

          {currentStep === 1 && (
            <StepMembership
              membershipType={membershipType} setMembershipType={setMembershipType}
              membershipFee={membershipFee} setMembershipFee={setMembershipFee}
              nfcTagId={nfcTagId} setNfcTagId={setNfcTagId}
              onOpenNfc={() => setNfcScannerOpen(true)}
            />
          )}

          {currentStep === 2 && (
            <StepReferral
              search={referralSearch} setSearch={setReferralSearch}
              results={referralResults}
              selected={selectedReferrer} setSelected={setSelectedReferrer}
              loading={searchLoading}
            />
          )}

          {currentStep === 3 && (
            <StepConfirmation
              data={{
                firstName, lastName, dni, email, phone, address, dateOfBirth,
                membershipType, membershipFee, nfcTagId, referrer: selectedReferrer,
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
            <CheckCircle size={16} /> Crear Socio
          </Button>
        )}
      </div>

      <NfcScanner
        open={nfcScannerOpen}
        onClose={() => setNfcScannerOpen(false)}
        onScan={(tagId) => {
          setNfcTagId(tagId)
          setNfcScannerOpen(false)
        }}
      />
    </div>
  )
}

// ============================================
// Step Components
// ============================================

function StepPersonalData({
  firstName, setFirstName, lastName, setLastName,
  dni, setDni, email, setEmail,
  phone, setPhone, address, setAddress,
  dateOfBirth, setDateOfBirth, errors,
}: any) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-sm font-mono font-bold tracking-widest text-zinc-300 uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-lime-400 inline-block" />
          Datos Personales
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Introduce los datos personales del nuevo socio. Los campos marcados con * son obligatorios.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Nombre *" value={firstName} onChange={e => setFirstName(e.target.value)} error={errors.firstName} />
        <Input label="Apellido *" value={lastName} onChange={e => setLastName(e.target.value)} error={errors.lastName} />
        <Input label="DNI *" value={dni} onChange={e => setDni(e.target.value)} error={errors.dni} />
        <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} error={errors.email} />
        <Input label="Telefono" value={phone} onChange={e => setPhone(e.target.value)} />
        <Input label="Fecha de Nacimiento" type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
        <div className="md:col-span-2">
          <Input label="Direccion" value={address} onChange={e => setAddress(e.target.value)} />
        </div>
      </div>
    </div>
  )
}

function StepMembership({
  membershipType, setMembershipType,
  membershipFee, setMembershipFee,
  nfcTagId, setNfcTagId,
  onOpenNfc,
}: any) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-sm font-mono font-bold tracking-widest text-zinc-300 uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
          Membresia y NFC
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Configura el tipo de membresia y asigna un llavero NFC si lo deseas.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Tipo de Membresia"
          options={membershipOptions}
          value={membershipType}
          onChange={e => setMembershipType(e.target.value)}
        />
        <Input
          label="Cuota (EUR)"
          type="number"
          step="0.01"
          min="0"
          value={membershipFee}
          onChange={e => setMembershipFee(e.target.value)}
        />
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-zinc-400 mb-1">Llavero NFC</label>
          <div className="flex items-center gap-2">
            <Input
              value={nfcTagId}
              readOnly
              placeholder="Sin llavero asignado"
              className="flex-1"
            />
            <Button type="button" variant="secondary" size="sm" onClick={onOpenNfc}>
              <Nfc size={16} /> Leer NFC
            </Button>
            {nfcTagId && (
              <button
                type="button"
                onClick={() => setNfcTagId('')}
                className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                title="Quitar llavero"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StepReferral({
  search, setSearch, results, selected, setSelected, loading,
}: any) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-sm font-mono font-bold tracking-widest text-zinc-300 uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
          Recomendacion
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Si este socio viene recomendado por otro, buscalo aqui. Este paso es opcional.
        </p>
      </div>

      {selected ? (
        <div className="bg-zinc-800 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-400/15 flex items-center justify-center">
              <Users size={18} className="text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-100">{selected.firstName} {selected.lastName}</p>
              <p className="text-xs text-zinc-500 font-mono">{selected.dni}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setSearch('') }}>
            <X size={14} /> Quitar
          </Button>
        </div>
      ) : (
        <div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o DNI..."
              className="block w-full rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 pl-10 pr-3 py-2 text-sm
                placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 transition-colors"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="animate-spin h-4 w-4 text-violet-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
          </div>

          {results.length > 0 && (
            <div className="mt-2 bg-zinc-800 rounded-lg border border-zinc-700 divide-y divide-zinc-700 max-h-60 overflow-y-auto">
              {results.map((m: any) => (
                <button
                  key={m.id}
                  onClick={() => { setSelected(m); setSearch('') }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-700/50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                    {m.firstName[0]}{m.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-100">{m.firstName} {m.lastName}</p>
                    <p className="text-xs text-zinc-500 font-mono truncate">{m.dni}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {search.length >= 2 && !loading && results.length === 0 && (
            <p className="text-xs text-zinc-500 mt-3 text-center font-mono">No se encontraron socios</p>
          )}
        </div>
      )}
    </div>
  )
}

function StepConfirmation({ data }: { data: any }) {
  const fields = [
    { label: 'Nombre', value: `${data.firstName} ${data.lastName}` },
    { label: 'DNI', value: data.dni },
    { label: 'Email', value: data.email },
    { label: 'Telefono', value: data.phone || '-' },
    { label: 'Direccion', value: data.address || '-' },
    { label: 'Nacimiento', value: data.dateOfBirth || '-' },
    { label: 'Membresia', value: membershipLabels[data.membershipType] || data.membershipType },
    { label: 'Cuota', value: data.membershipFee && parseFloat(data.membershipFee) > 0 ? `${data.membershipFee} EUR` : '-' },
    { label: 'Llavero NFC', value: data.nfcTagId || 'No asignado' },
    { label: 'Recomendado por', value: data.referrer ? `${data.referrer.firstName} ${data.referrer.lastName}` : 'Sin recomendacion' },
  ]

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-sm font-mono font-bold tracking-widest text-zinc-300 uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          Confirmacion
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Revisa los datos antes de crear el socio. Puedes volver a cualquier paso para corregir.
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
