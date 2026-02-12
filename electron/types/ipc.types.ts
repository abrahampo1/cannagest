export interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ListParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export function ok<T>(data: T): IpcResponse<T> {
  return { success: true, data }
}

export function fail(error: string): IpcResponse<never> {
  return { success: false, error }
}
