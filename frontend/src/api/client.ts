import type { AuthResponse, DashboardResponse, Event, EventCreate, EventOccurrence, EventUpdate, Inhabitant, InhabitantCreate, Issue, IssueCreate, IssueUpdate, ParamRange, Tank, TankCreate, TankUpdate, WaterParam, WaterParamCreate, User } from '../types'

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
  listUpcomingEvents: (tankId: number, limit = 5) => request<Event[]>(`/tanks/${tankId}/events/upcoming?limit=${limit}`),
  createEvent: (data: EventCreate) => request<Event>('/tanks/' + data.tank_id + '/events', { method: 'POST', body: JSON.stringify(data) }),
  completeEvent: (id: number, date?: string) =>
    request<void>(`/events/${id}/complete`, { method: 'PUT', body: date ? JSON.stringify({ date }) : undefined }),
  skipEventOccurrence: (id: number, date: string) =>
    request<void>(`/events/${id}/skip`, { method: 'PUT', body: JSON.stringify({ date }) }),
  rescheduleEvent: (id: number, date: string, time: string) =>
    request<void>(`/events/${id}/reschedule`, { method: 'PUT', body: JSON.stringify({ date, time }) }),
  updateEvent: (id: number, data: EventUpdate) => request<Event>(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEvent: (id: number) => request<void>(`/events/${id}`, { method: 'DELETE' }),

  // Planner
  getPlannerDay: (date: string) => request<EventOccurrence[]>(`/planner?date=${date}`),
  getPlannerRange: (start: string, end: string) => request<EventOccurrence[]>(`/planner/range?start=${start}&end=${end}`),
  getPlannerOverdue: () => request<EventOccurrence[]>('/planner/overdue'),

  // Water Params
  listParams: (tankId: number) => request<WaterParam[]>(`/tanks/${tankId}/params`),
  createParam: (data: WaterParamCreate) => request<WaterParam>(`/tanks/${data.tank_id}/params`, { method: 'POST', body: JSON.stringify(data) }),
  getLatestParam: (tankId: number) => request<WaterParam | null>(`/tanks/${tankId}/params/latest`),
  deleteParam: (id: number) => request<void>(`/params/${id}`, { method: 'DELETE' }),

  // Param Ranges
  listParamRanges: () => request<ParamRange[]>('/param-ranges'),
  updateParamRange: (data: ParamRange) => request<ParamRange>('/param-ranges', { method: 'PUT', body: JSON.stringify(data) }),

  // Issues
  listIssues: (tankId: number) => request<Issue[]>(`/tanks/${tankId}/issues`),
  createIssue: (data: IssueCreate) => request<Issue>('/tanks/' + data.tank_id + '/issues', { method: 'POST', body: JSON.stringify(data) }),
  getIssue: (id: number) => request<Issue>(`/issues/${id}`),
  updateIssue: (id: number, data: IssueUpdate) => request<Issue>(`/issues/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIssue: (id: number) => request<void>(`/issues/${id}`, { method: 'DELETE' }),
  uploadIssuePhoto: (id: number, file: File) => {
    const fd = new FormData()
    fd.append('photo', file)
    const token = localStorage.getItem('aquadock_token')
    return fetch(`${BASE}/issues/${id}/photo`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: fd,
    }).then(async res => {
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      return data as { photo_url: string }
    })
  },

  // Dashboard
  getDashboard: () => request<DashboardResponse>('/dashboard'),
}
