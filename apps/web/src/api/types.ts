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
  role: 'ADMIN' | 'ORGANIZER';
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
