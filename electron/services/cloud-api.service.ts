import { getCloudConfig } from '../utils/cloud-config.util'
import { createLogger } from '../utils/logger.util'
import fs from 'fs'
import path from 'path'
import https from 'https'
import { URL } from 'url'

const log = createLogger('CloudAPI')

// Herd usa certificados autofirmados en desarrollo
const httpsAgent = new https.Agent({ rejectUnauthorized: false })

interface ApiResponse<T = any> {
  ok: boolean
  status: number
  data: T
}

async function request<T = any>(
  method: string,
  endpoint: string,
  options: {
    body?: Record<string, any>
    filePath?: string
    fileField?: string
    extraFields?: Record<string, string>
    auth?: boolean
  } = {}
): Promise<ApiResponse<T>> {
  const config = getCloudConfig()
  // Forzar HTTPS - Herd redirige HTTP→HTTPS y Node.js no sigue 301
  const baseUrl = config.serverUrl.replace(/\/$/, '').replace(/^http:\/\//, 'https://')
  const url = new URL(`/api${endpoint}`, baseUrl)

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (options.auth !== false && config.token) {
    headers['Authorization'] = `Bearer ${config.token}`
  }

  let bodyData: Buffer | string | undefined
  let contentType: string | undefined

  if (options.filePath && options.fileField) {
    // Multipart form upload
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2)
    contentType = `multipart/form-data; boundary=${boundary}`

    const parts: Buffer[] = []

    // Add extra fields
    if (options.extraFields) {
      for (const [key, value] of Object.entries(options.extraFields)) {
        if (value === undefined || value === null) continue
        parts.push(Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
        ))
      }
    }

    // Add file
    const fileName = path.basename(options.filePath)
    const fileContent = fs.readFileSync(options.filePath)
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${options.fileField}"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`
    ))
    parts.push(fileContent)
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`))

    bodyData = Buffer.concat(parts)
  } else if (options.body) {
    contentType = 'application/json'
    bodyData = JSON.stringify(options.body)
  }

  if (contentType) {
    headers['Content-Type'] = contentType
  }

  if (bodyData) {
    headers['Content-Length'] = Buffer.byteLength(bodyData).toString()
  }

  return new Promise((resolve, reject) => {
    const reqOptions: https.RequestOptions = { method, headers, agent: httpsAgent }

    const req = https.request(url, reqOptions, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString('utf-8')
        let data: any
        try {
          data = JSON.parse(rawBody)
        } catch {
          data = rawBody
        }
        resolve({
          ok: res.statusCode! >= 200 && res.statusCode! < 300,
          status: res.statusCode!,
          data,
        })
      })
    })

    req.on('error', (err) => {
      log.error(`Request failed: ${method} ${endpoint}`, err.message)
      reject(err)
    })

    if (bodyData) {
      req.write(bodyData)
    }

    req.end()
  })
}

// Auth
export async function cloudRegister(name: string, email: string, password: string, passwordConfirmation: string) {
  return request('POST', '/register', {
    auth: false,
    body: { name, email, password, password_confirmation: passwordConfirmation },
  })
}

export async function cloudLogin(email: string, password: string) {
  return request('POST', '/login', {
    auth: false,
    body: { email, password },
  })
}

export async function cloudLogout() {
  return request('POST', '/logout')
}

export async function cloudMe() {
  return request('GET', '/me')
}

// Subscription
export async function cloudSubscriptionStatus() {
  return request('GET', '/subscription')
}

// Backups
export async function cloudListBackups() {
  return request('GET', '/backups')
}

export async function cloudUploadBackup(filePath: string, checksum: string, notes?: string) {
  return request('POST', '/backups', {
    filePath,
    fileField: 'file',
    extraFields: {
      checksum,
      ...(notes ? { notes } : {}),
      backup_date: new Date().toISOString(),
    },
  })
}

export async function cloudDownloadBackup(backupId: number, destPath: string): Promise<void> {
  const config = getCloudConfig()
  const baseUrl = config.serverUrl.replace(/\/$/, '').replace(/^http:\/\//, 'https://')
  const url = new URL(`/api/backups/${backupId}/download`, baseUrl)

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/octet-stream',
      },
      agent: httpsAgent,
    }, (res) => {
      if (res.statusCode !== 200) {
        const chunks: Buffer[] = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8')
          reject(new Error(`Download failed (${res.statusCode}): ${body}`))
        })
        return
      }

      const fileStream = fs.createWriteStream(destPath)
      res.pipe(fileStream)
      fileStream.on('finish', () => {
        fileStream.close()
        resolve()
      })
      fileStream.on('error', reject)
    })

    req.on('error', reject)
    req.end()
  })
}

export async function cloudDeleteBackup(backupId: number) {
  return request('DELETE', `/backups/${backupId}`)
}

