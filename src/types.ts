export interface Memo {
  id: number;
  article_url: string;
  content: string;
  created_at: string;
  is_favorite: number;
}

export interface User {
  id: number;
  company: string;
  department: string;
  name: string;
  email: string;
}

export interface ArticleAnalysis {
  titleKr: string;
  titleEn: string;
  contentKr: string;
  contentEn: string;
  summaryKr: string;
  summaryEn: string;
  analysisKr: string;
  analysisEn: string;
  factsKr: string[];
  factsEn: string[];
  inferencesKr: string[];
  inferencesEn: string[];
  draftArticleKr: string;
  draftArticleEn: string;
  imagePrompt: string;
  entities: { 
    name: string, 
    type: string, 
    description: string, 
    nameEn: string, 
    typeEn: string, 
    descriptionEn: string,
    background: string,
    backgroundEn: string,
    keyAchievements: string[],
    keyAchievementsEn: string[],
    recentNews: string,
    recentNewsEn: string
  }[];
  timeline: { date: string, event: string, dateEn: string, eventEn: string }[];
  relatedArticles: { title: string, url: string, relationship: string, titleEn: string, relationshipEn: string }[];
}

export interface QualityCoachFeedback {
  logicFlow: string;
  biasRisk: string;
  verificationNeeded: string[];
  engagementTips: string;
  readerComprehension: string;
}

export interface CoverageDeficiency {
  missingInterviews: string;
  opposingViews: string;
  dataSourceCount: string;
  logicFlow: string;
  biasRisk: string;
  verificationSentences: string[];
  clickability: string;
  readerComprehension: string;
}

export interface SavedDraft {
  id: number;
  title: string;
  contentKr: string;
  contentEn: string;
  created_at: string;
  is_favorite: boolean;
}

export interface Post {
  id: number;
  user_id: number;
  user_name: string;
  user_company: string;
  category: 'coverage' | 'idea' | 'tips';
  title: string;
  content: string;
  link_url?: string;
  link_title?: string;
  link_description?: string;
  link_image?: string;
  file_url?: string;
  file_name?: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  user_name: string;
  content: string;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: 'comment' | 'mention' | 'like';
  message: string;
  is_read: number;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'anchor';
  text: string;
  buttons?: { label: string, value: string }[];
}

export interface TimelineItem {
  year: number;
  event: string;
  impact: '높음' | '중간' | '낮음';
  details: string;
}

export interface TimelineData {
  timeline: TimelineItem[];
  reportingTips: string[];
}

export interface CredibilityCheck {
  category: string;
  status: '✔' | '⚠' | '✗';
  message: string;
}

export interface CredibilityData {
  credibilityScore: number;
  riskLevel: '낮음' | '중간' | '높음';
  checks: {
    hasDataSource: boolean;
    hasInterviews: boolean;
    hasCounterargument: boolean;
    sourceDiversity: boolean;
    dataFreshness: boolean;
    claimAttribution: boolean;
  };
  detailedFindings: CredibilityCheck[];
  improvementSuggestions: string[];
}

export interface ReportingRouteItem {
  name?: string;
  agency?: string;
  expertise?: string[];
  priority: '매우 높음' | '높음' | '중간';
  priorityScore: number;
  reason?: string;
  department?: string;
  division?: string;
}

export interface ReportingRouteData {
  companies: ReportingRouteItem[];
  government: ReportingRouteItem[];
  experts: ReportingRouteItem[];
}

export interface ImpactPredictionData {
  impactScore: number;
  impactLevel: '높음' | '중간' | '낮음';
  impactFactors: {
    controversy: { level: '높음' | '중간' | '낮음', score: number };
    commentLikelihood: { level: '높음' | '중간' | '낮음', score: number };
    viralityScore: { level: '높음' | '중간' | '낮음', score: number };
    mediaQuotabilityScore: { level: '높음' | '중간' | '낮음', score: number };
  };
  optimalPublishingTime: { time: string, day: string, reason: string }[];
  recommendedChannels: { channel: string, priority: string, expectedReach: string }[];
  cautions: string[];
  predictedMetrics: {
    estimatedViews: string;
    estimatedComments: string;
    estimatedMediaCitations: string;
  };
}

export interface BrainstormingIdea {
  id: string;
  title: string;
  difficulty: '쉬움' | '중간' | '높음';
  difficultyStars: number;
  estimatedDays: number;
  keyPeople: string[];
  requiredData: string[];
  newsValue: '높음' | '중간' | '낮음';
}

export interface BrainstormingData {
  ideas: BrainstormingIdea[];
  additionalIdeas: string[];
  trendAnalysis: {
    hotTopics: string[];
    emergingTopics: string[];
  };
}
