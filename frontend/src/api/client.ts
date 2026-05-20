import type { AuthResponse, DashboardResponse, Event, EventCreate, Inhabitant, InhabitantCreate, ParamRange, Tank, TankCreate, TankUpdate, WaterParam, WaterParamCreate, User } from '../types'

const BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('aquadock_token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (res.status === 204) return undefined as T

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Request failed')
  }
  return data as T
}

export const api = {
  // Auth
  register: (username: string, email: string, password: string) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) }),
  login: (username: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getStatus: () => request<User>('/auth/status'),

  // Tanks
  listTanks: () => request<Tank[]>('/tanks'),
  getTank: (id: number) => request<Tank>(`/tanks/${id}`),
  createTank: (data: TankCreate) => request<Tank>('/tanks', { method: 'POST', body: JSON.stringify(data) }),
  updateTank: (id: number, data: TankUpdate) => request<Tank>(`/tanks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTank: (id: number) => request<void>(`/tanks/${id}`, { method: 'DELETE' }),
  uploadTankPhoto: (id: number, file: File) => {
    const fd = new FormData()
    fd.append('photo', file)
    const token = localStorage.getItem('aquadock_token')
    return fetch(`${BASE}/tanks/${id}/photo`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: fd,
    }).then(async res => {
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      return data as { photo_url: string }
    })
  },

  // Inhabitants
  listInhabitants: (tankId: number) => request<Inhabitant[]>(`/tanks/${tankId}/inhabitants`),
  createInhabitant: (data: InhabitantCreate) => request<Inhabitant>(`/tanks/${data.tank_id}/inhabitants`, { method: 'POST', body: JSON.stringify(data) }),
  updateInhabitant: (id: number, data: Inhabitant) => request<Inhabitant>(`/inhabitants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInhabitant: (id: number) => request<void>(`/inhabitants/${id}`, { method: 'DELETE' }),

  // Events
  listEventsByTank: (tankId: number) => request<Event[]>(`/tanks/${tankId}/events`),
  createEvent: (data: EventCreate) => request<Event>('/tanks/' + data.tank_id + '/events', { method: 'POST', body: JSON.stringify(data) }),
  completeEvent: (id: number) => request<void>(`/events/${id}/complete`, { method: 'PUT' }),
  rescheduleEvent: (id: number, date: string, time: string) =>
    request<void>(`/events/${id}/reschedule`, { method: 'PUT', body: JSON.stringify({ date, time }) }),
  deleteEvent: (id: number) => request<void>(`/events/${id}`, { method: 'DELETE' }),

  // Planner
  getPlannerDay: (date: string) => request<Event[]>(`/planner?date=${date}`),
  getPlannerRange: (start: string, end: string) => request<Event[]>(`/planner/range?start=${start}&end=${end}`),
  getPlannerOverdue: () => request<Event[]>('/planner/overdue'),

  // Water Params
  listParams: (tankId: number) => request<WaterParam[]>(`/tanks/${tankId}/params`),
  createParam: (data: WaterParamCreate) => request<WaterParam>(`/tanks/${data.tank_id}/params`, { method: 'POST', body: JSON.stringify(data) }),
  getLatestParam: (tankId: number) => request<WaterParam | null>(`/tanks/${tankId}/params/latest`),
  deleteParam: (id: number) => request<void>(`/params/${id}`, { method: 'DELETE' }),

  // Param Ranges
  listParamRanges: () => request<ParamRange[]>('/param-ranges'),
  updateParamRange: (data: ParamRange) => request<ParamRange>('/param-ranges', { method: 'PUT', body: JSON.stringify(data) }),

  // Dashboard
  getDashboard: () => request<DashboardResponse>('/dashboard'),
}
