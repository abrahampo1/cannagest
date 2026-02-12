import Store from 'electron-store'
import { app } from 'electron'

const store = new Store({
  name: 'cannagest-settings',
  cwd: app.getPath('userData'),
})

export function isSetupComplete(): boolean {
  return store.get('setupComplete', false) as boolean
}

export function markSetupComplete(): void {
  store.set('setupComplete', true)
  store.set('setupCompletedAt', new Date().toISOString())
}

export function markSetupIncomplete(): void {
  store.set('setupComplete', false)
  store.delete('setupCompletedAt')
}

export function getClubName(): string {
  return store.get('clubName', 'CannaGest') as string
}

export function setClubName(name: string): void {
  store.set('clubName', name)
}

export function getSetupCompletedAt(): string | null {
  return (store.get('setupCompletedAt', null) as string | null)
}

export function clearAllSettings(): void {
  store.clear()
}

// ============================================
// Master Password Settings
// ============================================

export function getMasterPasswordSalt(): string | null {
  return (store.get('masterPasswordSalt', null) as string | null)
}

export function setMasterPasswordSalt(saltHex: string): void {
  store.set('masterPasswordSalt', saltHex)
}

export function getVerificationToken(): string | null {
  return (store.get('verificationToken', null) as string | null)
}

export function setVerificationToken(token: string): void {
  store.set('verificationToken', token)
}

export function hasMasterPassword(): boolean {
  return !!store.get('masterPasswordSalt') && !!store.get('verificationToken')
}

// ============================================
// Points Ratio (puntos por euro)
// ============================================

export function getPointsRatio(): number {
  return (store.get('pointsRatio', 100) as number)
}

export function setPointsRatio(ratio: number): void {
  store.set('pointsRatio', ratio)
}
