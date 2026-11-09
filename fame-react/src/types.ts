export type QueueStatus = 'WAITING' | 'ATTRIBUTED' | 'CANCELLED' | 'WITHDRAWN'

export interface PublicConfig {
  company_name: string
  vapid_public_key: string
  approaching_threshold: number
  urgent_threshold: number
  schoolapp_worker_url: string
  filieres: Filiere[]
}

export interface Filiere {
  code: string
  intitule: string
  departement: string
  accreditation: string
}

export interface CandidateProfile {
  id: number
  ensam_code: string
  first_name: string
  last_name: string
  year: string | null
  filiere_code: string | null
}

export interface QueueStatusInfo {
  status: string
  position: number | null
  filiere_code: string | null
  filiere_name: string | null
  company_name: string
  joined_at: string | null
  attributed_at: string | null
  message: string
}

export interface CandidateMe {
  candidate: CandidateProfile
  queue: QueueStatusInfo
}

export interface FiliereQueue {
  code: string
  intitule: string
  waiting: number
  attributed: number
  cancelled: number
  first_waiting: string | null
  first_waiting_joined_at: string | null
}

export interface CandidateRow {
  id: number
  ensam_code: string
  first_name: string
  last_name: string
  year: string | null
  filiere_code: string | null
  status: QueueStatus
  position: number | null
  joined_at: string | null
}

export interface HistoryItem {
  id: number
  candidate_id: number
  ensam_code: string
  organizer_username: string | null
  operation_type: string
  previous_state: string | null
  new_state: string | null
  created_at: string
}

export interface DashboardResponse {
  stats: { total_candidates: number; waiting: number; attributed: number; cancelled: number }
  waiting_by_filiere: { code: string; intitule: string; waiting: number }[]
  recent_operations: HistoryItem[]
  notification_stats: { total: number; sent: number; failed: number; pending: number }
}

export interface AttributionResult {
  operation_id: number
  candidate_id: number
  ensam_code: string
  first_name: string
  last_name: string
  filiere_code: string
  previous_position: number | null
  new_status: string
  timestamp: string
}

export interface PublicDisplay {
  company_name: string
  calls: { candidate_name: string; filiere_code: string | null; called_at: string | null }[]
  next: { position: number; candidate_name: string; filiere_code: string | null }[]
}
