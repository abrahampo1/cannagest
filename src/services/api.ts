import type { IpcResponse } from '../types/api.types'

export const api = window.api

/**
 * Unwraps an IpcResponse, returning data on success or throwing on failure.
 */
export async function call<T>(promise: Promise<IpcResponse<T>>): Promise<T> {
  const response = await promise
  if (!response.success) {
    throw new Error(response.error || 'Error desconocido')
  }
  return response.data as T
}
