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
