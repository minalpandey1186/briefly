import { ParsedMessage } from '../conversation/conversationTypes';

export type FindingCategory =
  | 'update'
  | 'decision'
  | 'deadline'
  | 'mention'
  | 'unresolved'
  | 'highlight';

export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

export type ConfidenceLevel = 'confirmed' | 'likely' | 'tentative';

export interface Finding {
  id: string;
  category: FindingCategory;
  title: string;
  summary: string;
  urgency: UrgencyLevel;
  person: string | null;
  extractedDate: string | null;
  confidence: ConfidenceLevel;
  sourceMessageIds: string[];
  evidenceSnippets: string[];
  timestamp: Date | null;
}

export interface AnalysisResult {
  findings: Finding[];
  overview: string;
  themes: string[];
  participantCount: number;
  analyzedAt: Date;
}
