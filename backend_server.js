/**
 * === FILE: backend_server.js ===
 * AI Newsroom Backend Server
 * 
 * Features:
 * - Reporter Network Map Data
 * - Reporter Recommendation API
 * - Duplicate Story Detection (via Gemini API)
 * - Interview Question Generation (via Gemini API)
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

// Sample Reporter Data (In-memory)
const reporters = [
  {
    id: "reporter_1",
    name: "김기자",
    newsAgency: "동아일보",
    specialty: ["반도체", "배터리", "전자"],
    articles: [
      { id: "art_1", title: "삼성SDI, 배터리 신공장 가동 시작", date: "2024-03-01", content: "삼성SDI가 차세대 배터리 생산을 위한 신규 라인을 가동하며 글로벌 시장 점유율 확대에 나섰습니다." }
    ]
  },
  {
    id: "reporter_2",
    name: "이리포터",
    newsAgency: "KBS",
    specialty: ["정치", "외교", "안보"],
    articles: [
      { id: "art_2", title: "한미 외교장관 회담, 공급망 협력 강화", date: "2024-03-02", content: "한미 양국 외교장관이 만나 핵심 광물 및 반도체 공급망 안정을 위한 전략적 파트너십을 재확인했습니다." }
    ]
  },
  {
    id: "reporter_3",
    name: "박기자",
    newsAgency: "매일경제",
    specialty: ["금융", "증시", "부동산"],
    articles: [
      { id: "art_3", title: "금리 동결 결정, 시장 반응은?", date: "2024-03-03", content: "한국은행 금융통화위원회가 기준금리 동결을 결정하면서 증시는 안도 랠리를 보이고 있습니다." }
    ]
  },
  {
    id: "reporter_4",
    name: "최기자",
    newsAgency: "한겨레",
    specialty: ["사회", "노동", "환경"],
    articles: [
      { id: "art_4", title: "탄소중립 실천을 위한 기업들의 과제", date: "2024-03-04", content: "ESG 경영이 화두가 되면서 국내 주요 기업들이 탄소 배출 저감을 위한 구체적인 로드맵을 발표하고 있습니다." }
    ]
  },
  {
    id: "reporter_5",
    name: "정리포터",
    newsAgency: "SBS",
    specialty: ["IT", "AI", "플랫폼"],
    articles: [
      { id: "art_5", title: "생성형 AI, 저널리즘의 미래를 바꾸다", date: "2024-03-05", content: "AI 기술이 기사 작성과 데이터 분석에 도입되면서 언론계의 지형 변화가 가속화되고 있습니다." }
    ]
  }
];

// 1. GET /api/newsroom/network-map - 모든 기자의 네트워크 데이터 반환
app.get('/api/newsroom/network-map', (req, res) => {
  try {
    res.json(reporters);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch network map" });
  }
});

// 2. GET /api/newsroom/reporter-recommendation/:topic - 주제별 기자 추천
app.get('/api/newsroom/reporter-recommendation/:topic', (req, res) => {
  const { topic } = req.params;
  try {
    const recommended = reporters.filter(r => 
      r.specialty.some(s => topic.includes(s)) || 
      r.articles.some(a => a.title.includes(topic))
    );
    res.json(recommended.length > 0 ? recommended : reporters.slice(0, 2));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch recommendations" });
  }
});

// 3. POST /api/newsroom/duplicate-detection - 기사 유사도 분석
app.post('/api/newsroom/duplicate-detection', async (req, res) => {
  const { storyIdea } = req.body;
  if (!storyIdea) return res.status(400).json({ error: "Story idea is required" });

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const existingArticlesText = reporters
      .flatMap(r => r.articles)
      .map(a => `- 제목: ${a.title}, 내용 요약: ${a.content.substring(0, 100)}...`)
      .join('\n');

    const prompt = `당신은 전문 기자 에디터입니다. 새로운 기사 아이디어와 기존 기사들의 유사도를 분석하여 중복 여부를 판단하고 차별화 전략을 제안하세요.

새 기사 아이디어: "${storyIdea}"

기존 기사들:
${existingArticlesText}

반드시 아래 JSON 형식으로만 응답하세요:
{
  "overallRisk": "높음/중간/낮음",
  "similarArticles": [
    {"title": "기사 제목", "reporter": "기자 이름", "similarity": 85, "date": "2024-00-00"}
  ],
  "differentiationPoints": ["차별화 포인트 1", "차별화 포인트 2"],
  "improvementSuggestions": ["개선 제안 1", "개선 제안 2"],
  "recommendedApproach": "추천 취재 방향 요약"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // JSON 파싱 (마크다운 코드 블록 제거)
    const jsonStr = text.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(jsonStr));
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "AI analysis failed" });
  }
});

// 4. POST /api/newsroom/interview-questions-quick - 인터뷰 질문 생성
app.post('/api/newsroom/interview-questions-quick', async (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: "Topic is required" });

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `기사 주제: "${topic}"

위 주제에 대해 기업, 정부/기관, 전문가별로 취재 시 활용할 수 있는 핵심 인터뷰 질문을 각 3개씩 생성하세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "corporate": ["질문 1", "질문 2", "질문 3"],
  "government": ["질문 1", "질문 2", "질문 3"],
  "expert": ["질문 1", "질문 2", "질문 3"]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonStr = text.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(jsonStr));
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "AI question generation failed" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`AI Newsroom Backend running on http://localhost:${PORT}`);
});
