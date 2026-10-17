export type QueueStatus =
  | 'WAITING' | 'APPROACHING' | 'CALLED' | 'DISPATCH_READY'
  | 'IN_INTERVIEW' | 'ABSENT' | 'DEFERRED' | 'COMPLETED'
  | 'WITHDRAWN' | 'EXPIRED';

export type StationStatus = 'AVAILABLE' | 'OCCUPIED' | 'PAUSED';
export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  location?: string;
  status: CampaignStatus;
  startsAt?: string;
  endsAt?: string;
  publicDisplayEnabled: boolean;
  companyId: string;
  companyName: string;
}

export interface Recruiter {
  id: string;
  fullName: string;
  email?: string;
  title?: string;
  photoUrl?: string;
}

export interface Station {
  id: string;
  label: string;
  locationLabel?: string;
  filiere?: string;
  status: StationStatus;
  posX: number;
  posY: number;
  recruiter?: Recruiter;
}

export interface Registration {
  id: string;
  studentCode: string;
  fullName?: string;
  filiere?: string;
  status: QueueStatus;
  sequenceNo: number;
  arrivalAt?: string;
  calledAt?: string;
  registeredAt?: string;
  station?: Station;
}

export interface StaffMe {
  kind: 'staff';
  id: string;
  username: string;
  displayName: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'ORGANIZER';
}

export interface StudentMe {
  kind: 'student';
  registration: Registration;
}

export type Me = StaffMe | StudentMe;

export interface CampaignPublicInfo {
  id: string;
  name: string;
  location?: string;
  status: CampaignStatus;
  companyName: string;
}

export interface RealtimeEvent {
  type: string;
  campaignId: string;
  data: Record<string, unknown>;
}

/* ---------------- Superadmin control center ---------------- */

export interface OverviewData {
  campaigns: Record<string, number>;
  students: Record<string, number>;
  stations: Record<string, number>;
  staffUsers: number;
  recentActions: AuditEvent[];
  recentBroadcasts: BroadcastSummary[];
}

export interface AuditEvent {
  id: string;
  campaignId: string;
  entityType: string;
  entityId: string;
  actorId: string;
  actorRole: string;
  action: string;
  metadata: string;
  occurredAt: string;
}

export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
  enabled: boolean;
  createdAt: string;
}

export interface AppSettingView {
  key: string;
  value: string;
  description: string;
  updatedAt: string;
  updatedBy: string;
}

export interface Template {
  id: string;
  name: string;
  title: string;
  body: string;
  type: string;
  route: string;
  active: boolean;
}

export interface BroadcastSummary {
  id: string;
  campaignId: string;
  segment: string;
  title: string;
  body: string;
  type: string;
  route: string;
  channel: string;
  status: string;
  targetCount: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: string;
  sentAt: string;
}

export interface SafeConfig {
  corsOrigins: string;
  workerIssuer: string;
  workerAudience: string;
  workerAssertionTtl: string;
  vapidPublicKey: string | null;
  vapidConfigured: boolean;
  bootstrapAdminUsername: string;
  superAdminConfigured: boolean;
}

export interface HealthStatus {
  application: string;
  database: { status: string };
  redis: { status: string };
  vapidConfigured: boolean;
  superAdminConfigured: boolean;
  pendingPushDeliveries: number;
}
