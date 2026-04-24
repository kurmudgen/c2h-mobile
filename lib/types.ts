export type UserType = 'candidate' | 'employer';

export type ClearanceLevel =
  | 'none'
  | 'secret'
  | 'top_secret'
  | 'ts_sci'
  | 'ts_sci_poly'
  | 'ts_sci_full_scope';

export type ClearanceStatus = 'active' | 'inactive' | 'expired' | 'recently_held';

export type AvailabilityStatus = 'immediate' | 'two_weeks' | 'thirty_days' | 'thirty_plus';

export type RecommendationBucket =
  | 'recommended'
  | 'strong_alternative'
  | 'hold'
  | 'not_qualified';

export type MatchOutcome = 'pending' | 'submitted' | 'rejected' | 'interview' | 'hired';

export type PipelineStatus =
  | 'pending_candidate_action'
  | 'candidate_accepted'
  | 'candidate_declined'
  | 'employer_reviewing'
  | 'employer_interested'
  | 'employer_passed'
  | 'interview_requested'
  | 'interview_scheduled'
  | 'offer_extended'
  | 'hired'
  | 'closed';

export interface Candidate {
  candidate_id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  clearance_level: ClearanceLevel;
  clearance_status: ClearanceStatus | null;
  availability_status: AvailabilityStatus | null;
  normalized_skills: string[];
  certifications: string[];
  years_total_experience: number;
  profile_completion_status: 'incomplete' | 'complete';
  target_roles: string[];
  domain_experience: string[];
  resume_text: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  seniority_level: string | null;
  compensation_target: number | null;
  compensation_minimum: number | null;
  contact_opt_in: boolean;
  submission_opt_in: boolean;
}

export interface Job {
  job_id: string;
  employer_id: string;
  title: string;
  description: string | null;
  required_clearance: ClearanceLevel | null;
  preferred_clearance: ClearanceLevel | null;
  location: string | null;
  work_model: string | null;
  required_skills: string[];
  preferred_skills: string[];
  salary_min: number | null;
  salary_max: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Match {
  match_id: string;
  candidate_id: string;
  job_id: string;
  total_score: number;
  recommendation_bucket: RecommendationBucket | null;
  pipeline_status: PipelineStatus | null;
  expires_at: string | null;
  employer_action_deadline: string | null;
  outcome: MatchOutcome;
  score_role_fit: number;
  score_clearance: number;
  score_skills: number;
  score_domain: number;
  score_recency: number;
  score_availability: number;
  score_certifications: number;
  risk_flags: string[];
  explanation_reasons: string[];
  cert_gaps: string[];
  matched_work_role: string | null;
  alignment_8140_confidence: number;
  created_at: string;
  updated_at: string;
}

export interface MatchWithJob extends Match {
  job: Job;
}

export interface MatchWithCandidate extends Match {
  candidate: Candidate;
}

export interface EmployerProfile {
  employer_id: string;
  company_name: string | null;
  industry: string | null;
  website: string | null;
  cleared_facility: boolean;
  setup_complete: boolean;
}
