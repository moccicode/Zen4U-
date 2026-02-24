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
}
