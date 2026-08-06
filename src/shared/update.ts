export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export type UpdateState = {
  status: UpdateStatus
  version: string | null
  progress: number | null
  error: string | null
}
