export type LeadStatus = 'new' | 'contacted' | 'follow_up' | 'interested' | 'not_interested' | 'converted' | 'lost';
export type LeadPriority = 'low' | 'medium' | 'high';

export interface Lead {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  company_name?: string;
  website?: string | null;
  city?: string | null;
  industry?: string | null;
  source: string;
  campaign?: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  interested_services?: string | null;
  category?: string | null;
  domain?: string | null;
  budget?: string | null;
  lead_score?: number;
  deal_value?: number | null;
  assigned_to?: string | null;
  assigned_by?: string | null;
  assigned_at?: string | null;
  next_follow_up_date?: string | null;
  last_contact_date?: string | null;
  notes?: string;
  tags?: string[];
  is_duplicate?: boolean;
  isDuplicate?: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  user_id: string; // The user who performed the action
  user_name: string;
  activity_type: 'status_change' | 'note_added' | 'call_logged' | 'assigned' | 'email_sent' | 'meeting_scheduled' | 'created';
  description: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
}

export interface LeadComment {
  id: string;
  lead_id: string;
  user_id: string;
  user_name: string;
  comment: string;
  created_at: string;
}
