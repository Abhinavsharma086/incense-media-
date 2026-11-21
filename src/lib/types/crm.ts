export interface Deal {
  id: string;
  name: string;
  value: number;
  stage: string;
  probability: number;
  expectedCloseDate: string | null;
  services: string | null;
  notes: string | null;
  leadId: string;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  lead?: { fullName: string; companyName: string; email: string };
  assignedTo?: { firstName: string; lastName: string };
}

export interface FollowUp {
  id: string;
  leadId: string;
  type: string;
  scheduledAt: string;
  status: string;
  priority: string;
  reminderAt: string | null;
  notes: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  lead?: { fullName: string; companyName: string; email: string; phone: string };
}

export interface LeadScoreRule {
  id: string;
  action: string;
  points: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MediaCampaign {
  id: string;
  name: string;
  clientName: string;
  platform: string;
  service: string;
  startDate: string;
  endDate: string | null;
  budget: number;
  adSpend: number;
  objective: string;
  status: string;
  notes: string | null;
  impressions: number;
  reach: number;
  clicks: number;
  leadsGenerated: number;
  qualifiedLeads: number;
  conversions: number;
  revenue: number;
  assignedToId: string | null;
  assignedTo?: { firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}
