import Store from 'electron-store'
import { app } from 'electron'

export interface CloudConfig {
  token: string | null
  email: string | null
  userName: string | null
  serverUrl: string
  autoBackup: 'off' | 'daily' | 'weekly'
  lastAutoBackup: string | null
  backupOnCashClose: boolean
}

const store = new Store({
  name: 'cloud-config',
  cwd: app.getPath('userData'),
  defaults: {
    cloud_token: null,
    cloud_email: null,
    cloud_user_name: null,
    cloud_server_url: 'https://cannagest-cloud.test',
    cloud_auto_backup: 'off',
    cloud_last_auto_backup: null,
    cloud_backup_on_cash_close: false,
  } as Record<string, any>,
})

export function getCloudConfig(): CloudConfig {
  return {
    token: store.get('cloud_token') as string | null,
    email: store.get('cloud_email') as string | null,
    userName: store.get('cloud_user_name') as string | null,
    serverUrl: store.get('cloud_server_url') as string,
    autoBackup: store.get('cloud_auto_backup') as CloudConfig['autoBackup'],
    lastAutoBackup: store.get('cloud_last_auto_backup') as string | null,
    backupOnCashClose: store.get('cloud_backup_on_cash_close') as boolean,
  }
}

export function setCloudToken(token: string, email: string, userName: string): void {
  store.set('cloud_token', token)
  store.set('cloud_email', email)
  store.set('cloud_user_name', userName)
}

export function clearCloudToken(): void {
  store.set('cloud_token', null)
  store.set('cloud_email', null)
  store.set('cloud_user_name', null)
}

export function setAutoBackup(mode: CloudConfig['autoBackup']): void {
  store.set('cloud_auto_backup', mode)
}

export function setLastAutoBackup(date: string): void {
  store.set('cloud_last_auto_backup', date)
}

export function setServerUrl(url: string): void {
  store.set('cloud_server_url', url)
}

export function setBackupOnCashClose(enabled: boolean): void {
  store.set('cloud_backup_on_cash_close', enabled)
}

export function isCloudLoggedIn(): boolean {
  return !!store.get('cloud_token')
}
