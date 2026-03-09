/**
 * === FILE: frontend_app.jsx ===
 * AI Newsroom Frontend Application
 * 
 * Features:
 * - Reporter Network Map Visualization
 * - Duplicate Story Detector UI
 * - Interview Question Generator UI
 * - Dark Theme (Slate-900) with Tailwind CSS
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldAlert, 
  MessageSquare, 
  Copy, 
  Check, 
  Search, 
  Building2, 
  Landmark, 
  GraduationCap,
  FileText,
  ChevronRight,
  Loader2
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api/newsroom';

const App = () => {
  const [activeTab, setActiveTab] = useState('network');
  const [reporters, setReporters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState(null);

  // 1. Network Map State
  const [searchTerm, setSearchTerm] = useState('');

  // 2. Duplicate Detector State
  const [storyIdea, setStoryIdea] = useState('');
  const [duplicateResult, setDuplicateResult] = useState(null);

  // 3. Interview Generator State
  const [interviewTopic, setInterviewTopic] = useState('');
  const [interviewResult, setInterviewResult] = useState(null);

  useEffect(() => {
    fetchNetworkMap();
  }, []);

  const fetchNetworkMap = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/network-map`);
      const data = await res.json();
      setReporters(data);
    } catch (err) {
      console.error("Failed to fetch network map", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateCheck = async () => {
    if (!storyIdea.trim()) return;
    setLoading(true);
    setDuplicateResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/duplicate-detection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyIdea })
      });
      const data = await res.json();
      setDuplicateResult(data);
    } catch (err) {
      alert("분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!interviewTopic.trim()) return;
    setLoading(true);
    setInterviewResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/interview-questions-quick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: interviewTopic })
      });
      const data = await res.json();
      setInterviewResult(data);
    } catch (err) {
      alert("질문 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(id);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  // --- Components ---

  const ReporterNetworkMap = () => {
    const filtered = reporters.filter(r => 
      r.name.includes(searchTerm) || 
      r.specialty.some(s => s.includes(searchTerm))
    );

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">취재 네트워크 맵</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="기자명 또는 전문분야 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(reporter => (
            <div key={reporter.id} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-blue-500/50 transition-all group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 font-bold border border-blue-500/20">
                  {reporter.name[0]}
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-100">{reporter.name}</div>
                  <div className="text-xs text-slate-400 font-medium">{reporter.newsAgency}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {reporter.specialty.map(s => (
                  <span key={s} className="px-2 py-1 bg-slate-700 text-slate-300 text-[10px] font-semibold rounded-md border border-slate-600">
                    {s}
                  </span>
                ))}
              </div>
              <div className="pt-4 border-t border-slate-700">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">최근 취재 내역</div>
                {reporter.articles.map(a => (
                  <div key={a.id} className="text-xs text-slate-400 line-clamp-1 italic">
                    "{a.title}"
                  </div>
                ))}
              </div>
              <button className="w-full mt-6 py-2.5 bg-slate-700 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                <Users className="w-4 h-4" /> 협업 요청
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const DuplicateStoryDetector = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-2">기사 중복 감지</h2>
        <p className="text-slate-400 text-sm mb-6">새로운 기사 아이디어를 입력하면 기존 데이터베이스와 비교하여 유사도를 분석합니다.</p>
        <div className="space-y-4">
          <textarea 
            value={storyIdea}
            onChange={(e) => setStoryIdea(e.target.value)}
            placeholder="기사 아이디어나 핵심 내용을 상세히 입력하세요..."
            className="w-full p-6 bg-slate-900 border border-slate-700 rounded-2xl text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none min-h-[150px] text-sm leading-relaxed"
          />
          <button 
            onClick={handleDuplicateCheck}
            disabled={loading || !storyIdea.trim()}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldAlert className="w-5 h-5" />}
            유사도 분석 시작
          </button>
        </div>
      </div>

      {duplicateResult && (
        <div className="space-y-6">
          <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  duplicateResult.overallRisk === '높음' ? 'bg-red-500 animate-pulse' : 
                  duplicateResult.overallRisk === '중간' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                <span className="text-sm font-bold text-white uppercase tracking-widest">중복 위험도: {duplicateResult.overallRisk}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-4">차별화 포인트</h4>
                <ul className="space-y-3">
                  {duplicateResult.differentiationPoints.map((p, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-300">
                      <span className="text-blue-500 font-bold">0{i+1}</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-4">개선 제안</h4>
                <ul className="space-y-3">
                  {duplicateResult.improvementSuggestions.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-300">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 p-6 bg-slate-900 rounded-xl border border-slate-700">
              <h4 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-2">추천 취재 방향</h4>
              <p className="text-sm text-slate-400 leading-relaxed italic">"{duplicateResult.recommendedApproach}"</p>
            </div>
          </div>

          <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700">
            <h4 className="text-white font-bold mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" /> 유사 기사 분석 결과
            </h4>
            <div className="space-y-4">
              {duplicateResult.similarArticles.map((art, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-700">
                  <div>
                    <div className="text-sm font-bold text-slate-100">{art.title}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{art.reporter} • {art.date}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-blue-500">{art.similarity}% 유사</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const InterviewQuestionGenerator = () => (
    <div className="space-y-8 animate-in zoom-in-95 duration-500">
      <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-2">인터뷰 질문 생성</h2>
        <p className="text-slate-400 text-sm mb-6">취재 주제를 입력하면 AI가 대상별 맞춤형 질문 리스트를 생성합니다.</p>
        <div className="flex gap-4">
          <input 
            type="text"
            value={interviewTopic}
            onChange={(e) => setInterviewTopic(e.target.value)}
            placeholder="예: 전기차 화재 안전 대책과 배터리 관리 시스템의 역할"
            className="flex-1 px-6 py-4 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
          <button 
            onClick={handleGenerateQuestions}
            disabled={loading || !interviewTopic.trim()}
            className="px-8 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-600/20"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
            질문 생성
          </button>
        </div>
      </div>

      {interviewResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[
            { id: 'corporate', label: '기업 대상', icon: Building2, color: 'blue', questions: interviewResult.corporate },
            { id: 'government', label: '정부/기관 대상', icon: Landmark, color: 'emerald', questions: interviewResult.government },
            { id: 'expert', label: '전문가 대상', icon: GraduationCap, color: 'amber', questions: interviewResult.expert }
          ].map(section => (
            <div key={section.id} className="bg-slate-800 p-6 rounded-3xl border border-slate-700 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${section.color}-500/10 text-${section.color}-500 border border-${section.color}-500/20`}>
                  <section.icon className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-100">{section.label}</h4>
              </div>
              <div className="space-y-4 flex-1">
                {section.questions.map((q, i) => (
                  <div key={i} className="group relative p-4 bg-slate-900 rounded-xl border border-slate-700 hover:border-blue-500/50 transition-all">
                    <p className="text-xs text-slate-300 leading-relaxed pr-8">{q}</p>
                    <button 
                      onClick={() => handleCopy(q, `${section.id}-${i}`)}
                      className="absolute top-4 right-4 text-slate-600 hover:text-blue-500 transition-colors"
                    >
                      {copyStatus === `${section.id}-${i}` ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">AI</div>
              AI NEWSROOM
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Professional Journalist Collaboration Platform</p>
          </div>
          <nav className="flex bg-slate-800 p-1.5 rounded-2xl border border-slate-700">
            {[
              { id: 'network', label: '네트워크 맵', icon: Users },
              { id: 'duplicate', label: '중복 감지', icon: ShieldAlert },
              { id: 'interview', label: '인터뷰 준비', icon: MessageSquare }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </nav>
        </header>

        <main>
          {activeTab === 'network' && <ReporterNetworkMap />}
          {activeTab === 'duplicate' && <DuplicateStoryDetector />}
          {activeTab === 'interview' && <InterviewQuestionGenerator />}
        </main>
      </div>
    </div>
  );
};

export default App;
