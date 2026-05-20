export interface Tank {
  id: number
  name: string
  emoji: string
  liters: number
  type: 'freshwater' | 'saltwater' | 'coldwater'
  subtype: string
  setup_date: string
  filter_type: string
  notes: string
  created_at: string
}

export interface TankUpdate {
  name?: string
  emoji?: string
  liters?: number
  filter_type?: string
  notes?: string
}

export interface TankCreate {
  name: string
  emoji?: string
  liters: number
  type: string
  subtype: string
  setup_date: string
  filter_type?: string
  notes?: string
}

export interface Inhabitant {
  id: number
  tank_id: number
  name: string
  species: string
  count: number
  emoji: string
  added_date: string
  notes: string
  created_at: string
}

export interface InhabitantCreate {
  tank_id: number
  name?: string
  species?: string
  count?: number
  emoji?: string
  added_date?: string
  notes?: string
}

export interface Event {
  id: number
  tank_id: number
  type: EventType
  title: string
  scheduled_date: string
  scheduled_time: string
  recurrence: string
  completed_at: string | null
  note: string
  created_at: string
}

export type EventType = 'feed' | 'water_change' | 'clean_filter' | 'test_water' | 'trim_plants' | 'medicate' | 'top_off' | 'other'

export interface EventCreate {
  tank_id: number
  type: EventType
  title?: string
  scheduled_date?: string
  scheduled_time?: string
  recurrence?: string
  note?: string
}

export interface WaterParam {
  id: number
  tank_id: number
  tested_at: string
  ammonia: number | null
  nitrite: number | null
  nitrate: number | null
  ph: number | null
  temperature: number | null
  gh: number | null
  kh: number | null
  notes: string
}

export interface WaterParamCreate {
  tank_id: number
  tested_at?: string
  ammonia?: number | null
  nitrite?: number | null
  nitrate?: number | null
  ph?: number | null
  temperature?: number | null
  gh?: number | null
  kh?: number | null
  notes?: string
}

export interface ParamRange {
  id: number
  tank_subtype: string
  ammonia_min: number | null
  ammonia_max: number | null
  nitrite_min: number | null
  nitrite_max: number | null
  nitrate_min: number | null
  nitrate_max: number | null
  ph_min: number | null
  ph_max: number | null
  temp_min: number | null
  temp_max: number | null
  gh_min: number | null
  gh_max: number | null
  kh_min: number | null
  kh_max: number | null
}

export interface DashboardTank extends Tank {
  inhabitant_count: number
  pending_events: number
  overdue_events: number
  latest_params: WaterParam | null
}

export interface DashboardResponse {
  tanks: DashboardTank[]
  today_count: number
  overdue_count: number
}

export interface User {
  id: number
  username: string
  email: string
  created_at: string
}

export interface AuthResponse {
  token: string
  user: User
}

export const EVENT_TYPES: { value: EventType; label: string; emoji: string }[] = [
  { value: 'feed', label: 'Feed', emoji: '🍕' },
  { value: 'water_change', label: 'Water Change', emoji: '💧' },
  { value: 'clean_filter', label: 'Clean Filter', emoji: '🧹' },
  { value: 'test_water', label: 'Test Water', emoji: '🔬' },
  { value: 'trim_plants', label: 'Trim Plants', emoji: '✂️' },
  { value: 'medicate', label: 'Medicate', emoji: '💊' },
  { value: 'top_off', label: 'Top Off', emoji: '➕' },
  { value: 'other', label: 'Other', emoji: '📋' },
]

export const TANK_TYPES = ['freshwater', 'saltwater', 'coldwater'] as const

export const SUBTYPES: Record<string, string[]> = {
  freshwater: ['community', 'planted', 'nano', 'cichlid', 'brackish'],
  saltwater: ['reef', 'fowlr', 'sw_nano', 'macroalgae'],
  coldwater: ['goldfish', 'pond', 'temperate'],
}

export const RECURRENCE_OPTIONS = [
  { value: '', label: 'None' },
  { value: '1d', label: 'Every Day' },
  { value: '2d', label: 'Every 2 Days' },
  { value: '3d', label: 'Every 3 Days' },
  { value: '7d', label: 'Weekly' },
  { value: '14d', label: 'Every 2 Weeks' },
  { value: '30d', label: 'Monthly' },
]
