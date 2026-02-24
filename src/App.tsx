import React, { useState, useEffect } from 'react';
import { 
  Search, 
  BookOpen, 
  FileText, 
  CheckCircle2, 
  HelpCircle, 
  PenTool, 
  StickyNote, 
  Star, 
  Trash2, 
  Edit3, 
  Save,
  Loader2,
  ExternalLink,
  ChevronRight,
  Clock,
  Image as ImageIcon,
  Users,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Layout,
  ScrollText,
  Download,
  Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeArticle, generateNewsImage, generateNewsVideo } from './services/geminiService';
import { Memo, ArticleAnalysis, User } from './types';
import Auth from './components/Auth';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

type TabType = 'body' | 'analysis_summary' | 'facts' | 'memos' | 'draft' | 'community';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ArticleAnalysis | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [imageStyle, setImageStyle] = useState('realistic');
  const [memos, setMemos] = useState<Memo[]>([]);
  const [newMemo, setNewMemo] = useState('');
  const [editingMemoId, setEditingMemoId] = useState<number | null>(null);
  const [editingMemoContent, setEditingMemoContent] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('body');
  const [viewMode, setViewMode] = useState<'tabs' | 'scroll'>('tabs');
  const [language, setLanguage] = useState<'kr' | 'en'>('kr');
  const [editedDraftKr, setEditedDraftKr] = useState('');
  const [editedDraftEn, setEditedDraftEn] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMemos();
      checkApiKey();
    }
  }, [user]);

  const checkApiKey = async () => {
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(hasKey);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const fetchMemos = async () => {
    try {
      const res = await fetch('/api/memos?t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        setMemos(data);
      }
    } catch (error) {
      console.error("Fetch memos error:", error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setGeneratedImage(null);
    setGeneratedVideo(null);
    try {
      const result = await analyzeArticle(input);
      setAnalysis(result);
      setEditedDraftKr(result.draftArticleKr);
      setEditedDraftEn(result.draftArticleEn);
      if (viewMode === 'tabs') setActiveTab('body');
      
      // Auto-generate first image
      handleGenerateMedia(result.imagePrompt, imageStyle);
    } catch (error) {
      console.error("Search failed:", error);
      alert(error instanceof Error ? error.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMedia = async (prompt: string, style: string) => {
    if (style === 'videoart' && !hasApiKey) {
      const proceed = confirm("Video generation requires a paid Gemini API key. Would you like to select one now?");
      if (proceed) {
        await handleSelectKey();
      } else {
        return;
      }
    }

    setImageLoading(true);
    try {
      if (style === 'videoart') {
        const video = await generateNewsVideo(prompt);
        setGeneratedVideo(video);
        setGeneratedImage(null);
      } else {
        const img = await generateNewsImage(prompt, style);
        setGeneratedImage(img);
        setGeneratedVideo(null);
      }
    } catch (error) {
      console.error("Media generation failed:", error);
      if (error instanceof Error && error.message.includes("Requested entity was not found")) {
        alert("API Key error. Please re-select your API key.");
        setHasApiKey(false);
      }
    } finally {
      setImageLoading(false);
    }
  };

  const handleAddMemo = async () => {
    if (!newMemo.trim()) return;
    // Use the current analysis title or input as article_url, or 'General Note' if empty
    const articleUrl = analysis ? (language === 'kr' ? analysis.titleKr : analysis.titleEn) : (input.trim() || 'General Note');
    const res = await fetch('/api/memos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        article_url: articleUrl, 
        content: newMemo 
      }),
    });
    if (res.ok) {
      setNewMemo('');
      fetchMemos();
    } else {
      alert("Failed to save memo");
    }
  };

  const handleDeleteMemo = async (id: number) => {
    if (id === undefined || id === null) return;
    if (!confirm("메모를 삭제하시겠습니까?")) return;
    
    // Optimistic update
    const previousMemos = [...memos];
    setMemos(prev => prev.filter(m => m.id !== id));

    try {
      const res = await fetch(`/api/memos/${id}`, { 
        method: 'DELETE'
      });
      
      if (res.ok) {
        await fetchMemos();
      } else {
        const err = await res.json();
        alert("삭제 실패: " + (err.error || "알 수 없는 오류"));
        setMemos(previousMemos);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("서버 연결 오류가 발생했습니다.");
      setMemos(previousMemos);
    }
  };

  const handleToggleFavorite = async (memo: Memo) => {
    await fetch('/api/memos/' + memo.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: memo.is_favorite ? 0 : 1 }),
    });
    fetchMemos();
  };

  const handleUpdateMemo = async (id: number) => {
    if (id === undefined || id === null) return;
    try {
      const res = await fetch(`/api/memos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingMemoContent }),
      });
      if (res.ok) {
        setEditingMemoId(null);
        await fetchMemos();
      } else {
        const err = await res.json();
        alert("수정 실패: " + (err.error || "알 수 없는 오류"));
      }
    } catch (error) {
      console.error("Update error:", error);
      alert("서버 연결 오류가 발생했습니다.");
    }
  };

  const downloadMedia = () => {
    const link = document.createElement('a');
    if (generatedVideo) {
      link.href = generatedVideo;
      link.download = 'zen4u-news-video.mp4';
    } else if (generatedImage) {
      link.href = generatedImage;
      link.download = 'zen4u-news-image.png';
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const LanguageToggle = () => (
    <div className="flex gap-1 bg-zinc-100 p-1 rounded-lg">
      <button 
        onClick={() => setLanguage('kr')}
        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${language === 'kr' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
      >
        한국어
      </button>
      <button 
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${language === 'en' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
      >
        English
      </button>
    </div>
  );

  const ImageGenerator = () => (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2">
          {imageStyle === 'videoart' ? <Video className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
          AI {imageStyle === 'videoart' ? 'Video' : 'Illustration'}
        </h3>
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-lg">
          {[
            { id: 'realistic', label: '실사' },
            { id: 'webtoon', label: '웹툰' },
            { id: 'drawing', label: '드로잉' },
            { id: 'videoart', label: '비디오아트' }
          ].map(style => (
            <button
              key={style.id}
              onClick={() => {
                setImageStyle(style.id);
                if (analysis) handleGenerateMedia(analysis.imagePrompt, style.id);
              }}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${imageStyle === style.id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="relative aspect-video bg-zinc-50 rounded-xl overflow-hidden border border-zinc-100 flex items-center justify-center">
        {imageLoading ? (
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="w-8 h-8 text-zinc-300 animate-spin" />
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Generating {imageStyle === 'videoart' ? 'Video' : 'Media'}...</span>
          </div>
        ) : generatedVideo ? (
          <video src={generatedVideo} controls className="w-full h-full object-cover" />
        ) : generatedImage ? (
          <img src={generatedImage} alt="AI Generated News Illustration" className="w-full h-full object-cover" />
        ) : (
          <div className="text-zinc-300 flex flex-col items-center gap-2">
            <ImageIcon className="w-12 h-12" />
            <span className="text-xs">No media generated</span>
          </div>
        )}
        {!imageLoading && (generatedImage || generatedVideo) && (
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button 
              onClick={downloadMedia}
              className="p-2 bg-white/80 backdrop-blur shadow-lg rounded-full hover:bg-white transition-all"
              title="Download Media"
            >
              <Download className="w-4 h-4 text-zinc-900" />
            </button>
            <button 
              onClick={() => analysis && handleGenerateMedia(analysis.imagePrompt, imageStyle)}
              className="p-2 bg-white/80 backdrop-blur shadow-lg rounded-full hover:bg-white transition-all"
              title="Regenerate"
            >
              <RefreshCw className="w-4 h-4 text-zinc-900" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const BodySection = ({ data }: { data: ArticleAnalysis }) => (
    <div className="space-y-8">
      <section>
        <h2 className="text-4xl font-serif font-bold leading-tight mb-6">
          {language === 'kr' ? data.titleKr : data.titleEn}
        </h2>
        <ImageGenerator />
        <div className="mt-8 bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-6 border-b border-zinc-100 pb-4">
            <h3 className="text-xl font-serif font-bold">Article Body</h3>
            <LanguageToggle />
          </div>
          <div 
            className="text-zinc-600 leading-relaxed font-serif text-lg markdown-body whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: language === 'kr' ? data.contentKr : data.contentEn }}
          />
        </div>
      </section>
    </div>
  );

  const AnalysisSummarySection = ({ data }: { data: ArticleAnalysis }) => (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-zinc-400 uppercase text-[10px] font-bold tracking-widest">
            <FileText className="w-3 h-3" />
            AI Summary
          </div>
          <LanguageToggle />
        </div>
        <div 
          className="text-xl leading-relaxed text-zinc-700 font-serif markdown-body whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: language === 'kr' ? data.summaryKr : data.summaryEn }}
        />
      </div>

      <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-zinc-400 uppercase text-[10px] font-bold tracking-widest">
            <Sparkles className="w-3 h-3" />
            Detailed Journalistic Analysis
          </div>
        </div>
        <div 
          className="text-lg leading-relaxed text-zinc-700 font-serif whitespace-pre-wrap markdown-body"
          dangerouslySetInnerHTML={{ __html: language === 'kr' ? data.analysisKr : data.analysisEn }}
        />
      </div>
    </div>
  );

  const FactsSection = ({ data }: { data: ArticleAnalysis }) => (
    <div className="space-y-6">
      <div className="flex justify-end">
        <LanguageToggle />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100">
          <div className="flex items-center gap-2 mb-4 text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="font-bold text-sm uppercase tracking-wider">Facts</h3>
          </div>
          <ul className="space-y-3">
            {(language === 'kr' ? data.factsKr : data.factsEn).map((fact, i) => (
              <li key={i} className="flex gap-3 text-sm text-emerald-900 leading-relaxed">
                <span className="text-emerald-300 mt-1">•</span>
                {fact}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100">
          <div className="flex items-center gap-2 mb-4 text-amber-700">
            <HelpCircle className="w-5 h-5" />
            <h3 className="font-bold text-sm uppercase tracking-wider">Inferences</h3>
          </div>
          <ul className="space-y-3">
            {(language === 'kr' ? data.inferencesKr : data.inferencesEn).map((inf, i) => (
              <li key={i} className="flex gap-3 text-sm text-amber-900 leading-relaxed">
                <span className="text-amber-300 mt-1">•</span>
                {inf}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  const DraftSection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PenTool className="w-5 h-5 text-zinc-900" />
          <h2 className="text-2xl font-serif font-bold">AI News Draft</h2>
        </div>
        <div className="flex items-center gap-4">
          <LanguageToggle />
          <button 
            onClick={() => {
              navigator.clipboard.writeText(language === 'kr' ? editedDraftKr : editedDraftEn);
              alert('Draft copied to clipboard!');
            }}
            className="px-4 py-2 bg-zinc-900 text-white rounded-full text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2"
          >
            Copy Draft
          </button>
        </div>
      </div>
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
        <textarea 
          value={language === 'kr' ? editedDraftKr : editedDraftEn}
          onChange={(e) => language === 'kr' ? setEditedDraftKr(e.target.value) : setEditedDraftEn(e.target.value)}
          className="w-full h-[600px] p-8 font-serif text-lg leading-relaxed focus:outline-none resize-none whitespace-pre-wrap"
          placeholder="Edit your draft here..."
        />
      </div>
    </div>
  );

  const CommunitySection = () => (
    <div className="space-y-8">
      <div className="bg-zinc-900 text-white p-12 rounded-3xl text-center">
        <Users className="w-12 h-12 mx-auto mb-6 text-zinc-500" />
        <h2 className="text-3xl font-serif font-bold mb-4">Journalist Community</h2>
        <p className="text-zinc-400 max-w-md mx-auto mb-8">Connect with other reporters, share sources, and collaborate on breaking stories in real-time.</p>
        <button className="px-8 py-3 bg-white text-zinc-900 rounded-full font-bold hover:bg-zinc-100 transition-all">
          Join the Network
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-zinc-100 rounded-full" />
              <div>
                <div className="text-sm font-bold">Reporter {i}</div>
                <div className="text-[10px] text-zinc-400">2 hours ago</div>
              </div>
            </div>
            <p className="text-sm text-zinc-600 line-clamp-3">"Just finished a deep dive into the latest economic policy changes. Anyone else seeing a trend in the local sector?"</p>
            <div className="mt-4 flex items-center gap-4 text-zinc-400">
              <div className="flex items-center gap-1 text-[10px] font-bold"><MessageSquare className="w-3 h-3" /> 12</div>
              <div className="flex items-center gap-1 text-[10px] font-bold"><Star className="w-3 h-3" /> 5</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const MemoList = () => (
    <div className="space-y-4">
      {memos.map(memo => {
        const onDelete = handleDeleteMemo;
        return (
          <div key={memo.id} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm group">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-zinc-400" />
                <span className="text-[10px] text-zinc-400 font-mono">
                  {new Date(memo.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                </span>
                {memo.article_url !== 'General Note' && (
                  <span className="text-[8px] px-2 py-0.5 bg-zinc-100 rounded text-zinc-500 font-bold uppercase tracking-tighter">
                    {memo.article_url}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 transition-opacity relative z-10">
                <button 
                  onClick={(e) => {
                    console.log("Favorite Clicked", memo.id);
                    e.stopPropagation();
                    handleToggleFavorite(memo);
                  }}
                  className={`p-2 ${memo.is_favorite ? 'text-amber-400 bg-amber-50' : 'text-zinc-300 hover:bg-zinc-50'} rounded-full transition-all relative z-20 pointer-events-auto cursor-pointer`}
                  title="즐겨찾기"
                >
                  <Star className={`w-4 h-4 ${memo.is_favorite ? 'fill-current' : ''}`} />
                </button>
                <button 
                  onClick={(e) => {
                    console.log("Edit Clicked", memo.id);
                    e.stopPropagation();
                    setEditingMemoId(memo.id);
                    setEditingMemoContent(memo.content);
                  }}
                  className="p-2 text-zinc-300 hover:text-zinc-600 hover:bg-zinc-50 rounded-full transition-all relative z-20 pointer-events-auto cursor-pointer"
                  title="수정"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {editingMemoId === memo.id ? (
              <div className="space-y-2">
                <textarea 
                  value={editingMemoContent}
                  onChange={(e) => setEditingMemoContent(e.target.value)}
                  className="w-full p-2 border border-zinc-200 rounded-lg focus:ring-1 focus:ring-zinc-900"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditingMemoId(null)} className="text-xs text-zinc-500">Cancel</button>
                  <button onClick={() => handleUpdateMemo(memo.id)} className="text-xs font-bold text-zinc-900">Save</button>
                </div>
              </div>
            ) : (
              <p className="text-zinc-700 whitespace-pre-wrap">{memo.content}</p>
            )}
          </div>
        );
      })}
    </div>
  );

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] relative overflow-x-hidden">
      {/* Hidden div to ensure Tailwind doesn't purge classes used by AI content */}
      <div className="hidden text-red-500 text-blue-500 text-green-500 font-bold italic" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-serif font-bold text-xl italic">Z</span>
              </div>
              <h1 className="text-xl font-serif font-bold tracking-tight hidden sm:block">Zen4U</h1>
            </div>
            <div className="hidden md:flex flex-col border-l border-zinc-200 pl-4">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{user.company} / {user.department}</span>
              <span className="text-xs font-bold text-zinc-900">{user.name} Reporter</span>
            </div>
          </div>
          
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Enter article URL or search keywords..."
              className="w-full bg-zinc-100 border-none rounded-full py-2 pl-10 pr-4 focus:ring-2 focus:ring-zinc-900 transition-all text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 animate-spin" />}
          </form>

          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-zinc-100 p-1 rounded-lg flex gap-1">
              <button 
                onClick={() => setViewMode('tabs')}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-2 ${viewMode === 'tabs' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                <Layout className="w-3 h-3" />
                Tabs
              </button>
              <button 
                onClick={() => setViewMode('scroll')}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-2 ${viewMode === 'scroll' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                <ScrollText className="w-3 h-3" />
                Scroll
              </button>
            </div>
            <button 
              onClick={() => setUser(null)}
              className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
              title="Logout"
            >
              <Users className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {!analysis && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
              <BookOpen className="w-10 h-10 text-zinc-300" />
            </div>
            <h2 className="text-3xl font-serif font-bold mb-2">Zen4U Journalist Pro</h2>
            <p className="text-zinc-500 max-w-md">The ultimate AI workspace for modern reporting. Analyze, summarize, and draft in seconds.</p>
            
            <div className="mt-12 w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-zinc-200 text-left">
                <ImageIcon className="w-6 h-6 mb-4 text-zinc-400" />
                <h4 className="font-bold mb-2">AI Illustrations</h4>
                <p className="text-xs text-zinc-500">Generate news images in 4 distinct styles: Realistic, Webtoon, Drawing, or Video Art.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-zinc-200 text-left">
                <Sparkles className="w-6 h-6 mb-4 text-zinc-400" />
                <h4 className="font-bold mb-2">Deep Analysis</h4>
                <p className="text-xs text-zinc-500">Go beyond summary with journalistic analysis, fact-checking, and inference detection.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-zinc-200 text-left">
                <Users className="w-6 h-6 mb-4 text-zinc-400" />
                <h4 className="font-bold mb-2">Reporter Network</h4>
                <p className="text-xs text-zinc-500">Connect with colleagues and share insights in the integrated community hub.</p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-zinc-900 animate-spin mb-4" />
            <p className="text-zinc-500 font-medium animate-pulse">Zen4U is processing your request...</p>
          </div>
        )}

        {analysis && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Content */}
            <div className="lg:col-span-9 space-y-12">
              {viewMode === 'tabs' ? (
                <>
                  <div className="flex overflow-x-auto pb-2 custom-scrollbar gap-2 border-b border-zinc-200">
                    {[
                      { id: 'body', label: '본문 & 사진', icon: BookOpen },
                      { id: 'analysis_summary', label: '요약 & 분석', icon: Sparkles },
                      { id: 'facts', label: '사실 & 추론', icon: CheckCircle2 },
                      { id: 'memos', label: '메모', icon: StickyNote },
                      { id: 'draft', label: '기사 작성', icon: PenTool },
                      { id: 'community', label: '커뮤니티', icon: Users }
                    ].map(tab => (
                      <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`px-6 py-3 text-sm font-medium transition-all relative whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
                      >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        {activeTab === tab.id && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900" />}
                      </button>
                    ))}
                  </div>

                      <AnimatePresence mode="wait">
                    <motion.div 
                      key={activeTab}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      {activeTab === 'body' && (
                        <div className="space-y-8">
                          <section>
                            <h2 className="text-4xl font-serif font-bold leading-tight mb-6">
                              {language === 'kr' ? analysis.titleKr : analysis.titleEn}
                            </h2>
                            <ImageGenerator />
                            <div className="mt-8 bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
                              <div className="flex items-center justify-between mb-6 border-b border-zinc-100 pb-4">
                                <h3 className="text-xl font-serif font-bold">Article Body</h3>
                                <LanguageToggle />
                              </div>
                              <div 
                                className="text-zinc-600 leading-relaxed font-serif text-lg markdown-body whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{ __html: language === 'kr' ? analysis.contentKr : analysis.contentEn }}
                              />
                            </div>
                          </section>
                        </div>
                      )}
                      {activeTab === 'analysis_summary' && (
                        <div className="space-y-8">
                          <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-2 text-zinc-400 uppercase text-[10px] font-bold tracking-widest">
                                <FileText className="w-3 h-3" />
                                AI Summary
                              </div>
                              <LanguageToggle />
                            </div>
                            <div 
                              className="text-xl leading-relaxed text-zinc-700 font-serif markdown-body whitespace-pre-wrap"
                              dangerouslySetInnerHTML={{ __html: language === 'kr' ? analysis.summaryKr : analysis.summaryEn }}
                            />
                          </div>

                          <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-2 text-zinc-400 uppercase text-[10px] font-bold tracking-widest">
                                <Sparkles className="w-3 h-3" />
                                Detailed Journalistic Analysis
                              </div>
                            </div>
                            <div 
                              className="text-lg leading-relaxed text-zinc-700 font-serif whitespace-pre-wrap markdown-body"
                              dangerouslySetInnerHTML={{ __html: language === 'kr' ? analysis.analysisKr : analysis.analysisEn }}
                            />
                          </div>
                        </div>
                      )}
                      {activeTab === 'facts' && (
                        <div className="space-y-6">
                          <div className="flex justify-end">
                            <LanguageToggle />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100">
                              <div className="flex items-center gap-2 mb-4 text-emerald-700">
                                <CheckCircle2 className="w-5 h-5" />
                                <h3 className="font-bold text-sm uppercase tracking-wider">Facts</h3>
                              </div>
                              <ul className="space-y-3">
                                {(language === 'kr' ? analysis.factsKr : analysis.factsEn).map((fact, i) => (
                                  <li key={i} className="flex gap-3 text-sm text-emerald-900 leading-relaxed">
                                    <span className="text-emerald-300 mt-1">•</span>
                                    {fact}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100">
                              <div className="flex items-center gap-2 mb-4 text-amber-700">
                                <HelpCircle className="w-5 h-5" />
                                <h3 className="font-bold text-sm uppercase tracking-wider">Inferences</h3>
                              </div>
                              <ul className="space-y-3">
                                {(language === 'kr' ? analysis.inferencesKr : analysis.inferencesEn).map((inf, i) => (
                                  <li key={i} className="flex gap-3 text-sm text-amber-900 leading-relaxed">
                                    <span className="text-amber-300 mt-1">•</span>
                                    {inf}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                      {activeTab === 'memos' && (
                        <div className="space-y-6">
                          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                              <StickyNote className="w-5 h-5" />
                              Add New Memo
                            </h3>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                value={newMemo}
                                onChange={(e) => setNewMemo(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddMemo()}
                                placeholder="Write your thoughts or research notes..."
                                className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-zinc-900 transition-all"
                              />
                              <button 
                                onClick={handleAddMemo}
                                className="px-6 py-2 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors"
                              >
                                Add
                              </button>
                            </div>
                          </div>

                          <div className="space-y-4">
                                <MemoList />
                          </div>
                        </div>
                      )}
                      {activeTab === 'draft' && (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <PenTool className="w-5 h-5 text-zinc-900" />
                              <h2 className="text-2xl font-serif font-bold">AI News Draft</h2>
                            </div>
                            <div className="flex items-center gap-4">
                              <LanguageToggle />
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(language === 'kr' ? editedDraftKr : editedDraftEn);
                                  alert('Draft copied to clipboard!');
                                }}
                                className="px-4 py-2 bg-zinc-900 text-white rounded-full text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2"
                              >
                                Copy Draft
                              </button>
                            </div>
                          </div>
                          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                            <textarea 
                              value={language === 'kr' ? editedDraftKr : editedDraftEn}
                              onChange={(e) => language === 'kr' ? setEditedDraftKr(e.target.value) : setEditedDraftEn(e.target.value)}
                              className="w-full h-[600px] p-8 font-serif text-lg leading-relaxed focus:outline-none resize-none whitespace-pre-wrap"
                              placeholder="Edit your draft here..."
                            />
                          </div>
                        </div>
                      )}
                      {activeTab === 'community' && (
                        <div className="space-y-8">
                          <div className="bg-zinc-900 text-white p-12 rounded-3xl text-center">
                            <Users className="w-12 h-12 mx-auto mb-6 text-zinc-500" />
                            <h2 className="text-3xl font-serif font-bold mb-4">Journalist Community</h2>
                            <p className="text-zinc-400 max-w-md mx-auto mb-8">Connect with other reporters, share sources, and collaborate on breaking stories in real-time.</p>
                            <button className="px-8 py-3 bg-white text-zinc-900 rounded-full font-bold hover:bg-zinc-100 transition-all">
                              Join the Network
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-10 h-10 bg-zinc-100 rounded-full" />
                                  <div>
                                    <div className="text-sm font-bold">Reporter {i}</div>
                                    <div className="text-[10px] text-zinc-400">2 hours ago</div>
                                  </div>
                                </div>
                                <p className="text-sm text-zinc-600 line-clamp-3">"Just finished a deep dive into the latest economic policy changes. Anyone else seeing a trend in the local sector?"</p>
                                <div className="mt-4 flex items-center gap-4 text-zinc-400">
                                  <div className="flex items-center gap-1 text-[10px] font-bold"><MessageSquare className="w-3 h-3" /> 12</div>
                                  <div className="flex items-center gap-1 text-[10px] font-bold"><Star className="w-3 h-3" /> 5</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </>
              ) : (
                <div className="space-y-24">
                  <section id="body">
                    <div className="space-y-8">
                      <section>
                        <h2 className="text-4xl font-serif font-bold leading-tight mb-6">
                          {language === 'kr' ? analysis.titleKr : analysis.titleEn}
                        </h2>
                        <ImageGenerator />
                        <div className="mt-8 bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
                          <div className="flex items-center justify-between mb-6 border-b border-zinc-100 pb-4">
                            <h3 className="text-xl font-serif font-bold">Article Body</h3>
                            <LanguageToggle />
                          </div>
                          <div 
                            className="text-zinc-600 leading-relaxed font-serif text-lg markdown-body whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{ __html: language === 'kr' ? analysis.contentKr : analysis.contentEn }}
                          />
                        </div>
                      </section>
                    </div>
                  </section>
                  <section id="analysis_summary">
                    <div className="space-y-8">
                      <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-2 text-zinc-400 uppercase text-[10px] font-bold tracking-widest">
                            <FileText className="w-3 h-3" />
                            AI Summary
                          </div>
                          <LanguageToggle />
                        </div>
                        <div 
                          className="text-xl leading-relaxed text-zinc-700 font-serif markdown-body whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: language === 'kr' ? analysis.summaryKr : analysis.summaryEn }}
                        />
                      </div>

                      <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-2 text-zinc-400 uppercase text-[10px] font-bold tracking-widest">
                            <Sparkles className="w-3 h-3" />
                            Detailed Journalistic Analysis
                          </div>
                        </div>
                        <div 
                          className="text-lg leading-relaxed text-zinc-700 font-serif whitespace-pre-wrap markdown-body"
                          dangerouslySetInnerHTML={{ __html: language === 'kr' ? analysis.analysisKr : analysis.analysisEn }}
                        />
                      </div>
                    </div>
                  </section>
                  <section id="facts">
                    <div className="space-y-6">
                      <div className="flex justify-end">
                        <LanguageToggle />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100">
                          <div className="flex items-center gap-2 mb-4 text-emerald-700">
                            <CheckCircle2 className="w-5 h-5" />
                            <h3 className="font-bold text-sm uppercase tracking-wider">Facts</h3>
                          </div>
                          <ul className="space-y-3">
                            {(language === 'kr' ? analysis.factsKr : analysis.factsEn).map((fact, i) => (
                              <li key={i} className="flex gap-3 text-sm text-emerald-900 leading-relaxed">
                                <span className="text-emerald-300 mt-1">•</span>
                                {fact}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100">
                          <div className="flex items-center gap-2 mb-4 text-amber-700">
                            <HelpCircle className="w-5 h-5" />
                            <h3 className="font-bold text-sm uppercase tracking-wider">Inferences</h3>
                          </div>
                          <ul className="space-y-3">
                            {(language === 'kr' ? analysis.inferencesKr : analysis.inferencesEn).map((inf, i) => (
                              <li key={i} className="flex gap-3 text-sm text-amber-900 leading-relaxed">
                                <span className="text-amber-300 mt-1">•</span>
                                {inf}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </section>
                  <section id="memos">
                    <div className="space-y-6">
                      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                          <StickyNote className="w-5 h-5" />
                          Add New Memo
                        </h3>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={newMemo}
                            onChange={(e) => setNewMemo(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddMemo()}
                            placeholder="Write your thoughts or research notes..."
                            className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-zinc-900 transition-all"
                          />
                          <button 
                            onClick={handleAddMemo}
                            className="px-6 py-2 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <MemoList />
                      </div>
                    </div>
                  </section>
                  <section id="draft">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <PenTool className="w-5 h-5 text-zinc-900" />
                          <h2 className="text-2xl font-serif font-bold">AI News Draft</h2>
                        </div>
                        <div className="flex items-center gap-4">
                          <LanguageToggle />
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(language === 'kr' ? editedDraftKr : editedDraftEn);
                              alert('Draft copied to clipboard!');
                            }}
                            className="px-4 py-2 bg-zinc-900 text-white rounded-full text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2"
                          >
                            Copy Draft
                          </button>
                        </div>
                      </div>
                      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                        <textarea 
                          value={language === 'kr' ? editedDraftKr : editedDraftEn}
                          onChange={(e) => language === 'kr' ? setEditedDraftKr(e.target.value) : setEditedDraftEn(e.target.value)}
                          className="w-full h-[600px] p-8 font-serif text-lg leading-relaxed focus:outline-none resize-none whitespace-pre-wrap"
                          placeholder="Edit your draft here..."
                        />
                      </div>
                    </div>
                  </section>
                  <section id="community">
                    <div className="space-y-8">
                      <div className="bg-zinc-900 text-white p-12 rounded-3xl text-center">
                        <Users className="w-12 h-12 mx-auto mb-6 text-zinc-500" />
                        <h2 className="text-3xl font-serif font-bold mb-4">Journalist Community</h2>
                        <p className="text-zinc-400 max-w-md mx-auto mb-8">Connect with other reporters, share sources, and collaborate on breaking stories in real-time.</p>
                        <button className="px-8 py-3 bg-white text-zinc-900 rounded-full font-bold hover:bg-zinc-100 transition-all">
                          Join the Network
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 bg-zinc-100 rounded-full" />
                              <div>
                                <div className="text-sm font-bold">Reporter {i}</div>
                                <div className="text-[10px] text-zinc-400">2 hours ago</div>
                              </div>
                            </div>
                            <p className="text-sm text-zinc-600 line-clamp-3">"Just finished a deep dive into the latest economic policy changes. Anyone else seeing a trend in the local sector?"</p>
                            <div className="mt-4 flex items-center gap-4 text-zinc-400">
                              <div className="flex items-center gap-1 text-[10px] font-bold"><MessageSquare className="w-3 h-3" /> 12</div>
                              <div className="flex items-center gap-1 text-[10px] font-bold"><Star className="w-3 h-3" /> 5</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>

            {/* Right Column: Sidebar */}
            <div className="lg:col-span-3 space-y-6">
              <div className="sticky top-24 space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                  <h3 className="font-bold mb-4 flex items-center gap-2 text-sm">
                    <Star className="w-4 h-4 text-amber-400 fill-current" />
                    Favorites
                  </h3>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {memos.filter(m => m.is_favorite === 1).length === 0 && (
                      <p className="text-[10px] text-zinc-400 italic">No favorites yet.</p>
                    )}
                    {memos.filter(m => m.is_favorite === 1).map(memo => (
                      <div key={memo.id} className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 hover:border-zinc-300 transition-all group">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[8px] text-zinc-400 font-mono">
                            {new Date(memo.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleToggleFavorite(memo)}
                              className="p-1 text-amber-400 hover:text-zinc-300 transition-colors"
                              title="즐겨찾기 취소"
                            >
                              <Star className="w-3 h-3 fill-current" />
                            </button>
                            <button 
                              onClick={() => {
                                setEditingMemoId(memo.id);
                                setEditingMemoContent(memo.content);
                                setActiveTab('memos');
                              }}
                              className="p-1 text-zinc-300 hover:text-zinc-600 transition-colors"
                              title="수정"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => handleDeleteMemo(memo.id)}
                              className="p-1 text-zinc-300 hover:text-red-500 transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-[10px] text-zinc-700 line-clamp-3 mb-2 leading-relaxed whitespace-pre-wrap">{memo.content}</p>
                        
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-200/50">
                          <span className="text-[7px] text-zinc-400 font-bold uppercase truncate max-w-[100px]">
                            {memo.article_url}
                          </span>
                          <button 
                            onClick={() => {
                              if (memo.article_url !== 'General Note') {
                                setInput(memo.article_url);
                              }
                            }}
                            className="text-[8px] font-bold text-zinc-900 flex items-center gap-1"
                          >
                            View <ChevronRight className="w-2 h-2" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-900 text-white p-6 rounded-2xl shadow-xl">
                  <h3 className="font-serif font-bold mb-2 text-sm">Zen4U Insight</h3>
                  <p className="text-zinc-400 text-[10px] leading-relaxed mb-4">
                    Use the <strong>AI Illustration</strong> tool to create unique visuals for your story. Choose between Realistic, Webtoon, Drawing, or Video Art styles.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[8px] text-zinc-500 uppercase tracking-widest font-bold">
                      <span>Article Score</span>
                      <span>92/100</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-800 rounded-full">
                      <div className="w-[92%] h-full bg-emerald-500 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Background Image - Anchor Nahyun */}
      <div className="fixed bottom-0 right-0 w-[350px] md:w-[550px] lg:w-[750px] pointer-events-none z-0 select-none opacity-95 transition-opacity duration-1000">
        <img 
          src="/앵커 나현.png" 
          alt="Anchor Nahyun" 
          className="w-full h-auto object-contain object-right-bottom drop-shadow-2xl"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
