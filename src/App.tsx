import React, { useState, useEffect, useRef } from 'react';
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
  Video,
  Send,
  User as UserIcon,
  Home,
  Plus,
  ThumbsUp,
  Paperclip,
  Bell,
  Filter,
  MoreVertical,
  Link as LinkIcon,
  AtSign,
  ArrowRight,
  ArrowLeft,
  Copy,
  Eye,
  X,
  Volume2,
  VolumeX,
  Play,
  ChevronLeft,
  ShieldAlert,
  Building2,
  Landmark,
  GraduationCap,
  Check,
  LayoutGrid,
  MessageCircle,
  History,
  TrendingUp,
  Lightbulb,
  Map
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { io, Socket } from 'socket.io-client';
import * as d3 from 'd3';
import { toPng } from 'html-to-image';
import { 
  analyzeArticle, 
  generateNewsImage, 
  generateNewsVideo, 
  chatWithAnchor, 
  getTrendingNews, 
  getQualityCoachFeedback, 
  convertArticle, 
  generateTTS, 
  rewriteArticleByPerspective, 
  detectCoverageDeficiency,
  detectDuplicateStory,
  generateInterviewQuestions,
  generateRealTimeReporterArticles,
  checkCredibility,
  getReportingRoute,
  predictImpact,
  brainstormIdeas
} from './services/geminiService';
import { 
  Memo, 
  ArticleAnalysis, 
  User, 
  Post, 
  Comment, 
  Notification, 
  ChatMessage, 
  QualityCoachFeedback, 
  CoverageDeficiency, 
  SavedDraft,
  CredibilityData,
  ReportingRouteData,
  ImpactPredictionData,
  BrainstormingData
} from './types';
import Auth from './components/Auth';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

type TabType = 'home' | 'body' | 'analysis_summary' | 'facts' | 'memos' | 'draft' | 'community' | 'smart_search' | 'auto_conversion';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ArticleAnalysis | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [imageStyle, setImageStyle] = useState('realistic');
  const [memos, setMemos] = useState<Memo[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("memos") || "[]");
    } catch {
      return [];
    }
  });
  const [newMemo, setNewMemo] = useState('');
  const [editingMemoId, setEditingMemoId] = useState<number | null>(null);
  const [editingMemoContent, setEditingMemoContent] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [viewMode, setViewMode] = useState<'tabs' | 'scroll'>('tabs');
  const [language, setLanguage] = useState<'kr' | 'en'>('kr');
  const [editedDraftKr, setEditedDraftKr] = useState('');
  const [editedDraftEn, setEditedDraftEn] = useState('');
  const [qualityFeedback, setQualityFeedback] = useState<QualityCoachFeedback | null>(null);
  const [isCoaching, setIsCoaching] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [showPerspectiveMenu, setShowPerspectiveMenu] = useState(false);
  const [coverageDeficiency, setCoverageDeficiency] = useState<CoverageDeficiency | null>(null);
  const [isAnalyzingCoverage, setIsAnalyzingCoverage] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("saved_drafts") || "[]");
    } catch {
      return [];
    }
  });
  const [conversionResult, setConversionResult] = useState<any | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [selectedConversionType, setSelectedConversionType] = useState<'card' | 'shorts' | 'broadcast' | 'sns' | null>(null);
  const [cardImageStyle, setCardImageStyle] = useState('realistic');
  const [cardAspectRatio, setCardAspectRatio] = useState<'1:1' | '9:16' | '16:9'>('1:1');
  const [cardImages, setCardImages] = useState<Record<number, string>>({});
  const [failedCardImages, setFailedCardImages] = useState<Record<number, boolean>>({});
  const [isGeneratingCardImages, setIsGeneratingCardImages] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);

  // Community State
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeCategory, setActiveCategory] = useState<'all' | 'coverage' | 'idea' | 'tips'>('all');
  const [newsroomSubTab, setNewsroomSubTab] = useState<'feed' | 'network' | 'duplicate' | 'interview' | 'credibility' | 'route' | 'impact' | 'brainstorm'>('feed');
  const [reporters, setReporters] = useState<any[]>([]);
  const [duplicateResult, setDuplicateResult] = useState<any>(null);
  const [interviewResult, setInterviewResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [storyIdea, setStoryIdea] = useState('');
  const [interviewTopic, setInterviewTopic] = useState('');
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [isRequestingCollab, setIsRequestingCollab] = useState<string | null>(null);
  const [isRefreshingNews, setIsRefreshingNews] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'latest' | 'popular'>('latest');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [newsroomAISearchResult, setNewsroomAISearchResult] = useState<any>(null);
  const [isNewsroomAISearching, setIsNewsroomAISearching] = useState(false);

  // New AI Newsroom Features State
  const [credibilityText, setCredibilityText] = useState('');
  const [credibilityResult, setCredibilityResult] = useState<CredibilityData | null>(null);
  const [routeTopic, setRouteTopic] = useState('');
  const [routeResult, setRouteResult] = useState<ReportingRouteData | null>(null);
  const [impactTitle, setImpactTitle] = useState('');
  const [impactSummary, setImpactSummary] = useState('');
  const [impactCategory, setImpactCategory] = useState('IT/기술');
  const [impactResult, setImpactResult] = useState<ImpactPredictionData | null>(null);
  const [brainstormInterests, setBrainstormInterests] = useState('');
  const [brainstormTrends, setBrainstormTrends] = useState('');
  const [brainstormResult, setBrainstormResult] = useState<BrainstormingData | null>(null);
  const [isFeatureAnalyzing, setIsFeatureAnalyzing] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [newPostData, setNewPostData] = useState({
    title: '',
    content: '',
    category: 'coverage' as 'coverage' | 'idea' | 'tips',
    link_url: '',
    file: null as File | null
  });

  const socketRef = useRef<Socket | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    localStorage.setItem("saved_drafts", JSON.stringify(savedDrafts));
  }, [savedDrafts]);

  useEffect(() => {
    const removeInert = () => {
      document.querySelectorAll("[inert]").forEach(el => el.removeAttribute("inert"));
    };

    removeInert(); // 처음 1번

    // 이후 다시 붙는 것까지 잡기 (가벼움)
    const obs = new MutationObserver(removeInert);
    obs.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ["inert"] });

    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (user) {
      fetchMemos();
      checkApiKey();
      fetchPosts();
      fetchNotifications();

      // Socket.io setup
      socketRef.current = io();
      socketRef.current.emit('join', user.id);
      socketRef.current.on('notification', (notif: Notification) => {
        setNotifications(prev => [notif, ...prev]);
      });

      // Initial anchor message
      if (chatMessages.length === 0) {
        const loadTrending = async () => {
          try {
            const trending = await getTrendingNews();
            setChatMessages([
              {
                role: 'anchor',
                text: "안녕하세요, 기자님! 기분 좋은 하루 보내고 계신가요? 오늘 주목할 이슈 3개를 준비했어요!",
                buttons: trending.map((item: any) => ({
                  label: item.category,
                  value: item.headline
                }))
              }
            ]);
          } catch (error) {
            console.error("Failed to load trending news:", error);
            setChatMessages([
              {
                role: 'anchor',
                text: "안녕하세요, 기자님! 기분 좋은 하루 보내고 계신가요? 오늘 주목할 이슈 3개를 준비했어요!",
                buttons: [
                  { label: "IT/기술", value: "AI 반도체 시장의 급격한 변화와 전망" },
                  { label: "경제", value: "글로벌 금리 동결 기조와 국내 증시 영향" },
                  { label: "사회", value: "저출산 고령화 사회 대응을 위한 새로운 정책 제언" }
                ]
              }
            ]);
          }
        };
        loadTrending();
      }

      return () => {
        socketRef.current?.disconnect();
      };
    }

    // User requested console logic
    const timer = setTimeout(() => {
      document.querySelectorAll("button").forEach(b => {
        if (b.textContent?.trim() === "DELETE") {
          b.addEventListener("click", () => alert("진짜 클릭 들어옴"));
        }
      });
    }, 1000); // Wait for render

    return () => clearTimeout(timer);
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

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const history = chatMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));
      const response = await chatWithAnchor(history, userMessage);
      setChatMessages(prev => [...prev, { role: 'anchor', text: response || '' }]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages(prev => [...prev, { role: 'anchor', text: "죄송합니다. 대화 중에 오류가 발생했습니다." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const AnchorNahyunImage = ({ className = "" }: { className?: string }) => (
    <div className={`relative ${className}`}>
      <img 
        src="/앵커 나현.png" 
        alt="Anchor Nahyun" 
        className="w-full h-auto object-contain drop-shadow-2xl"
        referrerPolicy="no-referrer"
      />
    </div>
  );

  const NetworkGraph = ({ data }: { data: { nodes: any[], links: any[] } }) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
      if (!svgRef.current || !data.nodes.length) return;

      const width = 1000;
      const height = 600;
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const simulation = d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.links).id((d: any) => d.id).distance(150))
        .force("charge", d3.forceManyBody().strength(-500))
        .force("center", d3.forceCenter(width / 2, height / 2));

      const link = svg.append("g")
        .selectAll("line")
        .data(data.links)
        .enter().append("line")
        .attr("stroke", "#efe5c3")
        .attr("stroke-width", 2);

      const node = svg.append("g")
        .selectAll("circle")
        .data(data.nodes)
        .enter().append("circle")
        .attr("r", (d: any) => d.type === 'main' ? 24 : 16)
        .attr("fill", (d: any) => d.type === 'main' ? "#d7be69" : "#efe5c3")
        .attr("stroke", "#fff")
        .attr("stroke-width", 3)
        .attr("class", (d: any) => d.type === 'main' ? "shimmer-gold" : "cursor-pointer")
        .on("click", (event, d: any) => {
          if (d.type === 'related' && d.url) {
            window.open(d.url, '_blank');
          }
        })
        .call(d3.drag<SVGCircleElement, any>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }));

      const label = svg.append("g")
        .selectAll("text")
        .data(data.nodes)
        .enter().append("text")
        .text((d: any) => d.id)
        .attr("font-size", "13px")
        .attr("font-weight", "700")
        .attr("dx", 28)
        .attr("dy", 5)
        .attr("fill", "#7f723f");

      simulation.on("tick", () => {
        link
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);

        node
          .attr("cx", (d: any) => d.x)
          .attr("cy", (d: any) => d.y);

        label
          .attr("x", (d: any) => d.x)
          .attr("y", (d: any) => d.y);
      });

      return () => { simulation.stop(); };
    }, [data]);

    return (
      <div className="bg-gold-50/30 rounded-[2rem] border border-gold-100 overflow-hidden shadow-inner">
        <svg ref={svgRef} viewBox="0 0 1000 600" className="w-full h-auto" />
      </div>
    );
  };

  const SmartSearchContent = () => {
    if (!analysis) return null;

    const mainTitle = language === 'kr' ? analysis.titleKr : analysis.titleEn;
    const graphData = {
      nodes: [
        { id: mainTitle.substring(0, 30) + "...", type: 'main' },
        ...analysis.relatedArticles.map(a => ({ 
          id: (language === 'kr' ? a.title : a.titleEn).substring(0, 30) + "...", 
          type: 'related',
          url: a.url
        }))
      ],
      links: analysis.relatedArticles.map(a => ({
        source: mainTitle.substring(0, 30) + "...",
        target: (language === 'kr' ? a.title : a.titleEn).substring(0, 30) + "..."
      }))
    };

    return (
      <div className="space-y-16 relative">
        <div className="flex justify-end">
          <LanguageToggle />
        </div>

        {/* Key Entities Section */}
        <section>
          <div className="flex items-center gap-4 mb-10">
            <div className="w-14 h-14 bg-gold-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-gold-600/30 shimmer-gold">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-4xl font-serif font-bold text-zinc-900 tracking-tight">
                {language === 'kr' ? '핵심 인물 & 기업 추출' : 'Key Entities & Companies'}
              </h2>
              <p className="text-gold-600 text-xs mt-1 font-serif italic">Identifying the major players.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {analysis.entities.map((entity, i) => (
              <button 
                key={i} 
                onClick={() => setSelectedEntity(entity)}
                className="text-left bg-white p-6 rounded-[2rem] border border-gold-100 shadow-sm hover:border-gold-500 hover:shadow-xl hover:shadow-gold-500/10 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gold-50 rounded-full -mr-12 -mt-12 opacity-50 group-hover:bg-gold-100 transition-colors" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gold-600 bg-gold-50 px-2 py-0.5 rounded-md group-hover:bg-gold-500 group-hover:text-white transition-all">
                      {language === 'kr' ? entity.type : entity.typeEn}
                    </span>
                    <AtSign className="w-4 h-4 text-gold-300 group-hover:text-gold-500 transition-colors" />
                  </div>
                  <h3 className="font-bold text-xl text-zinc-900 mb-2 group-hover:text-gold-700 transition-colors">
                    {language === 'kr' ? entity.name : entity.nameEn}
                  </h3>
                  <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2 mb-4">
                    {language === 'kr' ? entity.description : entity.descriptionEn}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-gold-500">
                    {language === 'kr' ? '자세히 보기' : 'View Details'} <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Entity Detail Modal */}
        <AnimatePresence>
          {selectedEntity && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-gold-200"
              >
                <div className="p-10">
                  <div className="flex justify-between items-start mb-10">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-gold-600 bg-gold-50 px-4 py-1.5 rounded-full">
                        {language === 'kr' ? selectedEntity.type : selectedEntity.typeEn}
                      </span>
                      <h3 className="text-4xl font-serif font-bold text-zinc-900 mt-4">
                        {language === 'kr' ? selectedEntity.name : selectedEntity.nameEn}
                      </h3>
                    </div>
                    <button 
                      onClick={() => setSelectedEntity(null)}
                      className="p-3 hover:bg-gold-50 rounded-full transition-colors group"
                    >
                      <X className="w-8 h-8 text-zinc-300 group-hover:text-gold-500 transition-colors" />
                    </button>
                  </div>
                  
                  <div className="space-y-10 custom-scrollbar max-h-[55vh] overflow-y-auto pr-6">
                    <section>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-gold-500 mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> {language === 'kr' ? '개요' : 'Overview'}
                      </h4>
                      <p className="text-zinc-700 leading-relaxed text-lg font-serif">
                        {language === 'kr' ? selectedEntity.description : selectedEntity.descriptionEn}
                      </p>
                    </section>

                    <section>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-gold-500 mb-4 flex items-center gap-2">
                        <Layout className="w-4 h-4" /> {language === 'kr' ? '배경 정보' : 'Background'}
                      </h4>
                      <p className="text-zinc-600 leading-relaxed">
                        {language === 'kr' ? selectedEntity.background : selectedEntity.backgroundEn}
                      </p>
                    </section>

                    <section>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-gold-500 mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> {language === 'kr' ? '주요 성과' : 'Key Achievements'}
                      </h4>
                      <ul className="grid grid-cols-1 gap-3">
                        {(language === 'kr' ? selectedEntity.keyAchievements : selectedEntity.keyAchievementsEn).map((ach: string, ai: number) => (
                          <li key={ai} className="flex items-start gap-4 text-zinc-600 bg-gold-50/30 p-4 rounded-2xl border border-gold-100">
                            <div className="w-2 h-2 rounded-full bg-gold-400 mt-2 shrink-0" />
                            <span className="text-sm">{ach}</span>
                          </li>
                        ))}
                      </ul>
                    </section>

                    <section>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-gold-500 mb-4 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> {language === 'kr' ? '최근 관련 소식' : 'Recent News'}
                      </h4>
                      <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100 text-zinc-700 italic font-serif leading-relaxed">
                        "{language === 'kr' ? selectedEntity.recentNews : selectedEntity.recentNewsEn}"
                      </div>
                    </section>
                  </div>

                  <button 
                    onClick={() => setSelectedEntity(null)}
                    className="mt-12 w-full py-5 bg-gold-600 text-white rounded-[1.5rem] font-bold hover:bg-gold-700 transition-all shadow-xl shadow-gold-600/20 flex items-center justify-center gap-2"
                  >
                    {language === 'kr' ? '확인 완료' : 'Got it'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Network Visualization */}
        <section>
          <div className="flex items-center gap-4 mb-10">
            <div className="w-14 h-14 bg-gold-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-gold-600/30 shimmer-gold">
              <RefreshCw className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-4xl font-serif font-bold text-zinc-900 tracking-tight">
                {language === 'kr' ? '관련 기사 네트워크 시각화' : 'Related Articles Network'}
              </h2>
              <p className="text-gold-600 text-xs mt-1 font-serif italic">Mapping the information landscape.</p>
            </div>
          </div>
          <NetworkGraph data={graphData} />
          <div className="mt-10 grid grid-cols-1 gap-4">
            {analysis.relatedArticles.map((article, i) => (
              <a 
                key={i} 
                href={article.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-6 bg-white border border-gold-100 rounded-[2rem] hover:border-gold-400 hover:bg-gold-50/20 transition-all group shadow-sm hover:shadow-md relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gold-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-gold-50 flex items-center justify-center text-gold-600 border border-gold-100 group-hover:bg-gold-600 group-hover:text-white transition-all shadow-sm">
                    <LinkIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-zinc-900 group-hover:text-gold-700 transition-colors mb-1 font-serif">
                      {language === 'kr' ? article.title : article.titleEn}
                    </div>
                    <div className="text-xs text-gold-500 font-bold uppercase tracking-widest flex items-center gap-3">
                      <span className="px-3 py-1 bg-gold-50 rounded-lg border border-gold-100">
                        {language === 'kr' ? article.relationship : article.relationshipEn}
                      </span>
                      <span className="text-zinc-300">•</span>
                      <span className="group-hover:translate-x-1 transition-transform flex items-center gap-1.5 text-gold-600">
                        Read full article <ExternalLink className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-8 h-8 text-gold-200 group-hover:text-gold-500 transition-all group-hover:translate-x-1" />
              </a>
            ))}
          </div>
        </section>

        {/* Timeline Section */}
        <section>
          <div className="flex items-center gap-4 mb-10">
            <div className="w-14 h-14 bg-gold-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-gold-600/30 shimmer-gold">
              <Clock className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-4xl font-serif font-bold text-zinc-900 tracking-tight">
                {language === 'kr' ? '시간 흐름 타임라인' : 'Timeline of Events'}
              </h2>
              <p className="text-gold-600 text-xs mt-1 font-serif italic">Chronological analysis of the story.</p>
            </div>
          </div>
          <div className="relative pl-10 border-l-2 border-gold-100 space-y-10">
            {analysis.timeline.map((item, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[49px] top-0 w-6 h-6 rounded-full bg-white border-4 border-gold-500 shadow-lg shadow-gold-500/20" />
                <div className="bg-white p-6 rounded-[2rem] border border-gold-100 shadow-sm hover:shadow-md transition-all">
                  <span className="text-xs font-bold text-gold-600 mb-2 block uppercase tracking-widest">
                    {language === 'kr' ? item.date : item.dateEn}
                  </span>
                  <p className="text-zinc-800 font-medium text-lg leading-relaxed">
                    {language === 'kr' ? item.event : item.eventEn}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  };

  const HomeContent = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-12 relative">
      <div className="absolute -left-40 top-0 w-[500px] opacity-10 pointer-events-none hidden xl:block">
        {AnchorNahyunImage({})}
      </div>
      <div className="space-y-10 relative z-10">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-6xl font-serif font-bold leading-tight text-zinc-900">
              안녕하세요, <span className="text-gold-600">{user?.name}</span> 기자님!
            </h1>
            <h1 className="text-6xl font-serif font-bold leading-tight text-zinc-900">
              오늘의 뉴스를 분석해 드릴까요?
            </h1>
          </div>
          <div className="space-y-2">
            <p className="text-zinc-500 text-xl font-serif">
              Zen4U는 기자님들의 빠르고 정확한 취재를 돕는 AI 파트너입니다.
            </p>
            <p className="text-zinc-500 text-xl font-serif">
              궁금한 뉴스 키워드나 URL을 입력해 보세요.
            </p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="relative max-w-xl group">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="뉴스 키워드 또는 기사 URL을 입력하세요..."
            className="w-full bg-white border border-gold-100 rounded-[2rem] px-8 py-6 pr-20 shadow-2xl shadow-gold-500/10 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all text-xl outline-none"
          />
          <button 
            type="submit"
            className="absolute right-3 top-3 bottom-3 px-6 bg-gold-600 text-white rounded-[1.5rem] hover:bg-gold-700 transition-all shadow-lg shadow-gold-600/20 group-hover:scale-105 shimmer-gold"
          >
            <Search className="w-7 h-7" />
          </button>
        </form>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gold-100 shadow-2xl shadow-gold-500/5 flex flex-col h-[600px]">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gold-50">
            <div className="w-8 h-8 bg-gold-50 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-gold-600" />
            </div>
            <h3 className="font-bold text-zinc-900">앵커 나현과 대화하기</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-6 mb-6 custom-scrollbar pr-3">
            {chatMessages.length === 0 && (
              <div className="text-center py-20 text-zinc-300">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20 text-gold-500" />
                <p className="text-sm font-serif italic">나현 앵커에게 궁금한 점을 물어보세요.</p>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className="space-y-3">
                <div className={`flex items-end gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'anchor' && (
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gold-100 shrink-0 mb-1 bg-white shadow-sm">
                      <img src="/앵커 나현.png" alt="Nahyun" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-gold-600 text-white rounded-tr-none shadow-lg shadow-gold-600/20' 
                      : 'bg-gold-50 text-zinc-800 rounded-tl-none border border-gold-100'
                  }`}>
                    <Markdown>{msg.text}</Markdown>
                  </div>
                </div>
                {msg.buttons && (
                  <div className="flex flex-wrap gap-2 ml-12">
                    {msg.buttons.map((btn, bi) => (
                      <button
                        key={bi}
                        onClick={() => handleSearch(undefined, btn.value)}
                        className="px-4 py-2 bg-white border border-gold-200 rounded-full text-[11px] font-bold text-gold-600 hover:bg-gold-500 hover:text-white hover:border-gold-500 transition-all shadow-sm"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start items-end gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gold-100 shrink-0 mb-1 bg-white shadow-sm">
                  <img src="/앵커 나현.png" alt="Nahyun" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="bg-gold-50 p-4 rounded-2xl rounded-tl-none border border-gold-100">
                  <Loader2 className="w-5 h-5 animate-spin text-gold-400" />
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSendChatMessage} className="relative">
            <input 
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="메시지를 입력하세요..."
              className="w-full bg-gold-50/30 border border-gold-100 rounded-2xl px-6 py-4 pr-14 focus:ring-2 focus:ring-gold-500 focus:bg-white transition-all outline-none"
            />
            <button 
              type="submit"
              disabled={chatLoading}
              className="absolute right-3 top-3 bottom-3 px-3 text-gold-400 hover:text-gold-600 transition-colors"
            >
              <Send className="w-6 h-6" />
            </button>
          </form>
        </div>
      </div>

      <div className="relative">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-zinc-100 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-zinc-100 rounded-full blur-3xl opacity-50" />
        {AnchorNahyunImage({ className: "w-full max-w-2xl mx-auto relative z-10 scale-125" })}
      </div>
    </div>
  );

  const fetchMemos = async () => {
    try {
      const res = await fetch('/api/memos?t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        setMemos(data);
        localStorage.setItem("memos", JSON.stringify(data));
      }
    } catch (error) {
      console.error("Fetch memos error:", error);
    }
  };

  // Community Functions
  const fetchPosts = async () => {
    const params = new URLSearchParams();
    if (activeCategory !== 'all') params.append('category', activeCategory);
    if (searchQuery) params.append('search', searchQuery);
    params.append('sort', sortMode);

    try {
      const res = await fetch(`/api/posts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (error) {
      console.error("Fetch posts error:", error);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/notifications/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Fetch notifications error:", error);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData();
    formData.append('user_id', user.id.toString());
    formData.append('category', newPostData.category);
    formData.append('title', newPostData.title);
    formData.append('content', newPostData.content);
    formData.append('link_url', newPostData.link_url);
    if (newPostData.file) {
      formData.append('file', newPostData.file);
    }

    const url = editingPostId ? `/api/posts/${editingPostId}` : '/api/posts';
    const method = editingPostId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        body: formData
      });
      if (res.ok) {
        setIsCreatingPost(false);
        setEditingPostId(null);
        setNewPostData({ title: '', content: '', category: 'coverage', link_url: '', file: null });
        fetchPosts();
        if (editingPostId) {
          const updatedPost = await fetch(`/api/posts/${editingPostId}`).then(r => r.json());
          setSelectedPost(updatedPost);
        }
      }
    } catch (error) {
      console.error("Post action error:", error);
    }
  };

  const handleLikePost = async (postId: number) => {
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
      if (res.ok) {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, like_count: p.like_count + 1 } : p));
        if (selectedPost?.id === postId) {
          setSelectedPost(prev => prev ? { ...prev, like_count: prev.like_count + 1 } : null);
        }
      }
    } catch (error) {
      console.error("Like post error:", error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedPost || !newComment.trim()) return;

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: selectedPost.id,
          user_id: user.id,
          content: newComment
        })
      });
      if (res.ok) {
        setNewComment('');
        fetchComments(selectedPost.id);
        setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, comment_count: p.comment_count + 1 } : p));
      }
    } catch (error) {
      console.error("Add comment error:", error);
    }
  };

  const fetchComments = async (postId: number) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (error) {
      console.error("Fetch comments error:", error);
    }
  };

  const markNotificationRead = async (id: number) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      }
    } catch (error) {
      console.error("Mark notification read error:", error);
    }
  };

  const fetchReporters = async () => {
    try {
      const res = await fetch('/api/newsroom/network-map');
      if (res.ok) {
        const data = await res.json();
        setReporters(data);
        return data;
      }
    } catch (error) {
      console.error("Fetch reporters error:", error);
    }
    return null;
  };

  const handleRefreshRealTimeNews = async (targetReporters?: any[]) => {
    if (isRefreshingNews) return;
    const sourceReporters = targetReporters || reporters;
    if (!sourceReporters || sourceReporters.length === 0) return;

    setIsRefreshingNews(true);
    try {
      const updatedReporters = await Promise.all(sourceReporters.map(async (reporter) => {
        try {
          const newArticle = await generateRealTimeReporterArticles(reporter.name, reporter.specialty);
          return {
            ...reporter,
            articles: [
              {
                id: `realtime_${Date.now()}_${reporter.id}`,
                ...newArticle
              }
            ]
          };
        } catch (err) {
          console.error(`Failed to refresh news for ${reporter.name}:`, err);
          return reporter;
        }
      }));
      setReporters(updatedReporters);
    } catch (error) {
      console.error("Refresh news error:", error);
      alert("실시간 뉴스 업데이트 중 오류가 발생했습니다.");
    } finally {
      setIsRefreshingNews(false);
    }
  };

  const handleDuplicateDetection = async () => {
    if (!storyIdea.trim()) return;
    setIsAnalyzing(true);
    setDuplicateResult(null);
    try {
      const existingArticles = reporters.flatMap(r => r.articles);
      const data = await detectDuplicateStory(storyIdea, existingArticles);
      setDuplicateResult(data);
    } catch (error) {
      console.error("Duplicate detection error:", error);
      alert("분석 중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNewsroomAISearch = async (query: string) => {
    if (!query.trim()) return;
    setIsNewsroomAISearching(true);
    setNewsroomAISearchResult(null);
    try {
      const result = await analyzeArticle(query);
      setNewsroomAISearchResult(result);
    } catch (error) {
      console.error("Newsroom AI search error:", error);
    } finally {
      setIsNewsroomAISearching(false);
    }
  };

  const handleCredibilityCheck = async () => {
    if (!credibilityText.trim()) return;
    setIsFeatureAnalyzing(true);
    setCredibilityResult(null);
    try {
      const data = await checkCredibility(credibilityText);
      if (data && data.checks) {
        setCredibilityResult(data);
      } else {
        alert("신뢰도 분석에 실패했습니다.");
      }
    } catch (error) {
      console.error("Credibility check error:", error);
      alert("신뢰도 분석 중 오류가 발생했습니다.");
    } finally {
      setIsFeatureAnalyzing(false);
    }
  };

  const handleReportingRoute = async () => {
    if (!routeTopic.trim()) return;
    setIsFeatureAnalyzing(true);
    setRouteResult(null);
    try {
      const data = await getReportingRoute(routeTopic);
      if (data && (data.companies || data.government || data.experts)) {
        setRouteResult(data);
      } else {
        alert("취재 경로 분석에 실패했습니다.");
      }
    } catch (error) {
      console.error("Reporting route error:", error);
      alert("취재 경로 분석 중 오류가 발생했습니다.");
    } finally {
      setIsFeatureAnalyzing(false);
    }
  };

  const handleImpactPrediction = async () => {
    if (!impactTitle.trim() || !impactSummary.trim()) return;
    setIsFeatureAnalyzing(true);
    setImpactResult(null);
    try {
      const data = await predictImpact(impactTitle, impactSummary, impactCategory);
      if (data && data.impactFactors) {
        setImpactResult(data);
      } else {
        alert("영향력 예측에 실패했습니다.");
      }
    } catch (error) {
      console.error("Impact prediction error:", error);
      alert("영향력 예측 중 오류가 발생했습니다.");
    } finally {
      setIsFeatureAnalyzing(false);
    }
  };

  const handleBrainstorming = async () => {
    if (!brainstormInterests.trim()) return;
    setIsFeatureAnalyzing(true);
    setBrainstormResult(null);
    try {
      const data = await brainstormIdeas(brainstormInterests, brainstormTrends);
      if (data && data.ideas) {
        setBrainstormResult(data);
      } else {
        alert("아이디어 생성에 실패했습니다.");
      }
    } catch (error) {
      console.error("Brainstorming error:", error);
      alert("아이디어 생성 중 오류가 발생했습니다.");
    } finally {
      setIsFeatureAnalyzing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'community') {
      fetchPosts();
      fetchReporters();
      if (!searchQuery.trim()) {
        setNewsroomAISearchResult(null);
      }
    }
    if (activeTab === 'community' && newsroomSubTab === 'network') {
      fetchReporters().then((data) => {
        if (data) {
          handleRefreshRealTimeNews(data);
        }
      });
    }
  }, [activeTab, newsroomSubTab, activeCategory, sortMode, searchQuery]);

  const handleGenerateInterviewQuestions = async () => {
    if (!interviewTopic.trim()) return;
    setIsAnalyzing(true);
    setInterviewResult(null);
    try {
      const data = await generateInterviewQuestions(interviewTopic);
      setInterviewResult(data);
    } catch (error) {
      console.error("Interview generation error:", error);
      alert("질문 생성 중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(id);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const handleRequestCollaboration = async (reporter: any) => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    setIsRequestingCollab(reporter.id);
    try {
      const res = await fetch('/api/newsroom/collaboration-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: reporter.id,
          requesterName: user.name,
          requesterCompany: user.company
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
      }
    } catch (error) {
      console.error("Collab request error:", error);
      alert("요청 중 오류가 발생했습니다.");
    } finally {
      setIsRequestingCollab(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'community') {
      const timer = setTimeout(() => {
        fetchPosts();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  const handleSearch = async (e?: React.FormEvent, searchValue?: string) => {
    if (e) e.preventDefault();
    const query = searchValue || input;
    if (!query.trim()) return;
    
    if (searchValue) setInput(searchValue);
    
    setLoading(true);
    setGeneratedImage(null);
    setGeneratedVideo(null);
    try {
      const result = await analyzeArticle(query);
      setAnalysis(result);
      setEditedDraftKr(result.draftArticleKr);
      setEditedDraftEn(result.draftArticleEn);
      if (viewMode === 'tabs') setActiveTab('smart_search');
      
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
    } catch (error: any) {
      console.error("Media generation failed:", error);
      const isQuotaError = error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429;
      const isPermissionError = error?.message?.includes('PERMISSION_DENIED_IMAGE');
      
      if (isPermissionError && !hasApiKey) {
        const proceed = confirm("Image generation requires a personal API key with Imagen access. Would you like to select one now?");
        if (proceed) await handleSelectKey();
      } else if (isQuotaError && !hasApiKey) {
        const proceed = confirm("API quota exceeded. Using your own paid Gemini API key can resolve this. Would you like to select one now?");
        if (proceed) await handleSelectKey();
      } else if (error instanceof Error && error.message.includes("Requested entity was not found")) {
        alert("API Key error. Please re-select your API key.");
        setHasApiKey(false);
      } else {
        alert("Media generation failed. Please try again later.");
      }
    } finally {
      setImageLoading(false);
    }
  };

  const handlePerspectiveShift = async (perspective: string) => {
    const currentDraft = language === 'kr' ? editedDraftKr : editedDraftEn;
    if (!currentDraft.trim()) return;

    setIsRewriting(true);
    setShowPerspectiveMenu(false);
    try {
      const rewritten = await rewriteArticleByPerspective(currentDraft, perspective, language);
      if (rewritten) {
        if (language === 'kr') {
          setEditedDraftKr(rewritten);
        } else {
          setEditedDraftEn(rewritten);
        }
      }
    } catch (error) {
      console.error("Perspective shift failed:", error);
      alert("Failed to rewrite article from the selected perspective.");
    } finally {
      setIsRewriting(false);
    }
  };

  const handleSaveAndAnalyze = async () => {
    const draft = language === 'kr' ? editedDraftKr : editedDraftEn;
    if (!draft.trim()) return;

    setIsAnalyzingCoverage(true);
    setCoverageDeficiency(null);
    try {
      const result = await detectCoverageDeficiency(draft, language);
      setCoverageDeficiency(result);
      
      // Save the draft
      const newSavedDraft: SavedDraft = {
        id: Date.now(),
        title: analysis?.titleKr || (language === 'kr' ? '제목 없음' : 'Untitled'),
        contentKr: editedDraftKr,
        contentEn: editedDraftEn,
        created_at: new Date().toISOString(),
        is_favorite: false
      };
      setSavedDrafts(prev => [newSavedDraft, ...prev]);

      // Also trigger standard coaching if not already done
      if (!qualityFeedback) {
        handleQualityCoach();
      }

      alert(language === 'kr' ? '기사가 저장되었으며 AI 분석이 완료되었습니다.' : 'Article saved and AI analysis complete.');
    } catch (error) {
      console.error("Coverage analysis failed:", error);
      alert("Failed to analyze coverage deficiency.");
    } finally {
      setIsAnalyzingCoverage(false);
    }
  };

  const toggleFavoriteDraft = (id: number) => {
    setSavedDrafts(prev => prev.map(d => d.id === id ? { ...d, is_favorite: !d.is_favorite } : d));
  };

  const deleteSavedDraft = (id: number) => {
    if (window.confirm(language === 'kr' ? '정말 삭제하시겠습니까?' : 'Are you sure you want to delete this draft?')) {
      setSavedDrafts(prev => prev.filter(d => d.id !== id));
    }
  };

  const SavedDraftsList = () => {
    if (savedDrafts.length === 0) return null;

    return (
      <div className="mt-12 space-y-6">
        <h3 className="text-xl font-serif font-bold flex items-center gap-2">
          <Clock className="w-5 h-5" />
          {language === 'kr' ? '저장된 기사 초안' : 'Saved News Drafts'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedDrafts.map(draft => (
            <motion.div 
              key={draft.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h4 className="font-bold text-zinc-900 line-clamp-1 mb-1">{draft.title}</h4>
                  <p className="text-xs text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(draft.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => toggleFavoriteDraft(draft.id)}
                    className={`p-2 rounded-full transition-colors ${draft.is_favorite ? 'text-amber-400 bg-amber-50' : 'text-zinc-300 hover:bg-zinc-50'}`}
                  >
                    <Star className={`w-4 h-4 ${draft.is_favorite ? 'fill-current' : ''}`} />
                  </button>
                  <button 
                    onClick={() => deleteSavedDraft(draft.id)}
                    className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-zinc-600 line-clamp-2 mb-4">
                {language === 'kr' ? draft.contentKr : draft.contentEn}
              </p>
              <button 
                onClick={() => {
                  setEditedDraftKr(draft.contentKr);
                  setEditedDraftEn(draft.contentEn);
                  
                  // Scroll to the top of the draft section
                  const draftSection = document.getElementById('draft');
                  if (draftSection) {
                    draftSection.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                  
                  alert(language === 'kr' ? '초안이 불러와졌습니다.' : 'Draft loaded.');
                }}
                className="w-full py-2 bg-zinc-50 text-zinc-600 rounded-xl text-xs font-bold hover:bg-zinc-100 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3 h-3" />
                {language === 'kr' ? '불러오기' : 'Load Draft'}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  const handleQualityCoach = async () => {
    const draft = language === 'kr' ? editedDraftKr : editedDraftEn;
    if (!draft.trim()) return;

    setIsCoaching(true);
    setQualityFeedback(null);
    try {
      const feedback = await getQualityCoachFeedback(draft, language);
      setQualityFeedback(feedback);
    } catch (error) {
      console.error("Quality coach failed:", error);
      alert("Failed to get quality coach feedback.");
    } finally {
      setIsCoaching(false);
    }
  };

  const handleConvertArticle = async (type: 'card' | 'shorts' | 'broadcast' | 'sns') => {
    // Priority: Analysis content > Draft
    const content = analysis 
      ? (language === 'kr' ? analysis.contentKr : analysis.contentEn)
      : (language === 'kr' ? editedDraftKr : editedDraftEn);
      
    if (!content || !content.trim()) {
      alert(language === 'kr' ? "분석된 기사 내용이 없습니다." : "No article content to convert.");
      return;
    }

    setSelectedConversionType(type);
    setIsConverting(true);
    setConversionResult(null);
    setCardImages({});
    setFailedCardImages({});
    
    try {
      const result = await convertArticle(content, type, language, cardAspectRatio);
      setConversionResult(result);
      setCurrentSlideIdx(0);
      setIsConverting(false); // Show text results immediately to the user

      // If it's card news, generate images for each slide in the background
      if (type === 'card' && result && result.slides) {
        setIsGeneratingCardImages(true);
        
        // Generate images with a smaller delay to speed up the process
        for (let i = 0; i < result.slides.length; i++) {
          try {
            // Reduced delay to 1s for better responsiveness while still respecting rate limits
            if (i > 0) await new Promise(resolve => setTimeout(resolve, 1000));
            
            const imgUrl = await generateNewsImage(result.slides[i].visualPrompt, cardImageStyle, cardAspectRatio);
            if (imgUrl) {
              setCardImages(prev => ({ ...prev, [i]: imgUrl }));
              setFailedCardImages(prev => ({ ...prev, [i]: false }));
            }
          } catch (err) {
            console.error(`Failed to generate image for slide ${i}:`, err);
            setFailedCardImages(prev => ({ ...prev, [i]: true }));
          }
        }
        setIsGeneratingCardImages(false);
      }
    } catch (error: any) {
      console.error("Conversion failed:", error);
      setIsConverting(false);
      
      const isQuotaError = error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429;
      const isPermissionError = error?.message?.includes('PERMISSION_DENIED_IMAGE');
      
      if (isPermissionError && !hasApiKey) {
        const proceed = confirm("Image generation requires a personal API key with Imagen access. Would you like to select one now?");
        if (proceed) await handleSelectKey();
      } else if (isQuotaError && !hasApiKey) {
        const proceed = confirm("API quota exceeded during card generation. Using your own paid Gemini API key can resolve this. Would you like to select one now?");
        if (proceed) await handleSelectKey();
      } else {
        alert("Failed to convert article. Please try again later.");
      }
    }
  };

  const handleRetryCardImage = async (idx: number) => {
    if (!conversionResult || !conversionResult.slides[idx]) return;
    
    setFailedCardImages(prev => ({ ...prev, [idx]: false }));
    try {
      const imgUrl = await generateNewsImage(conversionResult.slides[idx].visualPrompt, cardImageStyle, cardAspectRatio);
      if (imgUrl) {
        setCardImages(prev => ({ ...prev, [idx]: imgUrl }));
      } else {
        setFailedCardImages(prev => ({ ...prev, [idx]: true }));
      }
    } catch (err) {
      console.error(`Retry failed for slide ${idx}:`, err);
      setFailedCardImages(prev => ({ ...prev, [idx]: true }));
      
      const isQuotaError = (err as any)?.message?.includes('429') || (err as any)?.status === 'RESOURCE_EXHAUSTED' || (err as any)?.code === 429;
      const isPermissionError = (err as any)?.message?.includes('PERMISSION_DENIED_IMAGE');
      
      if (isPermissionError && !hasApiKey) {
        if (confirm("Image generation requires a personal API key with Imagen access. Would you like to select one now?")) {
          await handleSelectKey();
        }
      } else if (isQuotaError && !hasApiKey) {
        if (confirm("API quota exceeded. Using your own paid Gemini API key can resolve this. Would you like to select one now?")) {
          await handleSelectKey();
        }
      }
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

  const deleteMemo = async (id: number) => {
    if (id === undefined || id === null) return;
    if (!confirm("메모를 삭제하시겠습니까?")) return;
    
    // Optimistic update with localStorage sync
    setMemos(prev => {
      const next = prev.filter(m => m.id !== id);
      localStorage.setItem("memos", JSON.stringify(next));
      return next;
    });

    try {
      const res = await fetch(`/api/memos/${id}`, { 
        method: 'DELETE'
      });
      
      if (res.ok) {
        await fetchMemos();
      } else {
        const err = await res.json();
        alert("삭제 실패: " + (err.error || "알 수 없는 오류"));
        await fetchMemos();
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("서버 연결 오류가 발생했습니다.");
      await fetchMemos();
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
    <div className="flex gap-1 bg-gold-50 p-1 rounded-xl border border-gold-100">
      <button 
        onClick={() => setLanguage('kr')}
        className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${language === 'kr' ? 'bg-gold-600 text-white shadow-md shadow-gold-600/20' : 'text-gold-400 hover:text-gold-600'}`}
      >
        한국어
      </button>
      <button 
        onClick={() => setLanguage('en')}
        className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${language === 'en' ? 'bg-gold-600 text-white shadow-md shadow-gold-600/20' : 'text-gold-400 hover:text-gold-600'}`}
      >
        English
      </button>
    </div>
  );

  const ImageGenerator = () => (
    <div className="bg-white p-8 rounded-[2rem] border border-gold-100 shadow-xl shadow-gold-500/5 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif font-bold text-zinc-900 flex items-center gap-3 text-lg">
          <div className="w-8 h-8 bg-gold-500 rounded-lg flex items-center justify-center">
            {imageStyle === 'videoart' ? <Video className="w-4 h-4 text-white" /> : <ImageIcon className="w-4 h-4 text-white" />}
          </div>
          AI {imageStyle === 'videoart' ? 'Video' : 'Illustration'}
        </h3>
        <div className="flex gap-1 bg-gold-50 p-1 rounded-xl border border-gold-100">
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
              className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${imageStyle === style.id ? 'bg-gold-600 text-white shadow-md shadow-gold-600/20' : 'text-gold-400 hover:text-gold-600'}`}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="relative aspect-video bg-gold-50/30 rounded-[1.5rem] overflow-hidden border border-gold-100 flex items-center justify-center group">
        {imageLoading ? (
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-10 h-10 text-gold-400 animate-spin" />
            <span className="text-xs text-gold-600 font-bold uppercase tracking-widest animate-pulse">Generating {imageStyle === 'videoart' ? 'Video' : 'Media'}...</span>
          </div>
        ) : generatedVideo ? (
          <video src={generatedVideo} controls className="w-full h-full object-cover" />
        ) : generatedImage ? (
          <img src={generatedImage} alt="AI Generated News Illustration" className="w-full h-full object-cover" />
        ) : (
          <div className="text-gold-200 flex flex-col items-center gap-4">
            <ImageIcon className="w-16 h-16" />
            <span className="text-sm font-serif italic">No media generated</span>
          </div>
        )}
        {!imageLoading && (generatedImage || generatedVideo) && (
          <div className="absolute bottom-6 right-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={downloadMedia}
              className="p-3 bg-white/90 backdrop-blur shadow-xl rounded-2xl hover:bg-gold-600 hover:text-white transition-all border border-gold-100"
              title="Download Media"
            >
              <Download className="w-5 h-5" />
            </button>
            <button 
              onClick={() => analysis && handleGenerateMedia(analysis.imagePrompt, imageStyle)}
              className="p-3 bg-white/90 backdrop-blur shadow-xl rounded-2xl hover:bg-gold-600 hover:text-white transition-all border border-gold-100"
              title="Regenerate"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const handlePlayTTS = async (text: string) => {
    if (ttsLoading) return;
    
    // If audio is already playing, stop it
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      return;
    }

    setTtsLoading(true);
    try {
      // Remove HTML tags and markdown-like syntax for cleaner TTS
      const cleanText = text
        .replace(/<[^>]*>?/gm, '') 
        .replace(/#+\s/g, '')
        .replace(/\*\*/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

      const url = await generateTTS(cleanText);
      if (url) {
        // Revoke previous blob URL if it exists
        if (audioUrl && audioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(audioUrl);
        }
        setAudioUrl(url);
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play();
        }
      }
    } catch (error) {
      console.error("TTS failed:", error);
      alert("Failed to generate voice.");
    } finally {
      setTtsLoading(false);
    }
  };

  const BodySection = ({ data }: { data: ArticleAnalysis }) => (
    <div className="space-y-10">
      <section>
        <h2 className="text-5xl font-serif font-bold leading-tight mb-10 text-zinc-900">
          {language === 'kr' ? data.titleKr : data.titleEn}
        </h2>
        <ImageGenerator />
        <div className="mt-10 bg-white p-10 rounded-[2.5rem] border border-gold-100 shadow-xl shadow-gold-500/5">
          <div className="flex items-center justify-between mb-8 border-b border-gold-50 pb-6">
            <div className="flex items-center gap-6">
              <h3 className="text-2xl font-serif font-bold text-zinc-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-gold-500 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                Article Body
              </h3>
              
              <button
                onClick={() => handlePlayTTS(language === 'kr' ? data.contentKr : data.contentEn)}
                disabled={ttsLoading}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg ${
                  ttsLoading 
                    ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' 
                    : 'bg-gold-50 text-gold-600 hover:bg-gold-600 hover:text-white border border-gold-200'
                }`}
              >
                {ttsLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
                {language === 'kr' ? '나현 앵커의 음성으로 듣기' : 'Listen with Anchor Nahyun'}
              </button>
              <audio ref={audioRef} onEnded={() => setAudioUrl(null)} className="hidden" />
            </div>
            <LanguageToggle />
          </div>
          <div 
            className="text-zinc-700 leading-relaxed font-serif text-xl markdown-body whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: language === 'kr' ? data.contentKr : data.contentEn }}
          />
        </div>
      </section>
    </div>
  );

  const AnalysisSummarySection = ({ data }: { data: ArticleAnalysis }) => (
    <div className="space-y-10">
      <div className="bg-white p-10 rounded-[2.5rem] border border-gold-100 shadow-xl shadow-gold-500/5">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3 text-gold-600 uppercase text-xs font-bold tracking-widest">
            <div className="w-8 h-8 bg-gold-50 rounded-lg flex items-center justify-center border border-gold-100">
              <FileText className="w-4 h-4" />
            </div>
            AI Summary
          </div>
          <LanguageToggle />
        </div>
        <div 
          className="text-2xl leading-relaxed text-zinc-800 font-serif markdown-body whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: language === 'kr' ? data.summaryKr : data.summaryEn }}
        />
      </div>

      <div className="bg-white p-10 rounded-[2.5rem] border border-gold-100 shadow-xl shadow-gold-500/5">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3 text-gold-600 uppercase text-xs font-bold tracking-widest">
            <div className="w-8 h-8 bg-gold-50 rounded-lg flex items-center justify-center border border-gold-100">
              <Sparkles className="w-4 h-4" />
            </div>
            Detailed Journalistic Analysis
          </div>
        </div>
        <div 
          className="text-xl leading-relaxed text-zinc-700 font-serif whitespace-pre-wrap markdown-body"
          dangerouslySetInnerHTML={{ __html: language === 'kr' ? data.analysisKr : data.analysisEn }}
        />
      </div>
    </div>
  );

  const AutoConversionSection = () => {
    const downloadCard = async (index: number) => {
      const ref = cardRefs.current[index];
      if (!ref) return;
      try {
        const dataUrl = await toPng(ref, { quality: 0.95, pixelRatio: 2 });
        const link = document.createElement('a');
        link.download = `card-news-${index + 1}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Failed to download card:', err);
      }
    };

    return (
      <div className="space-y-10">
        <div className="flex justify-end">
          <LanguageToggle />
        </div>
        {/* Article -> Auto Conversion Section */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-gold-100 shadow-xl shadow-gold-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold-50 rounded-full -mr-32 -mt-32 opacity-20 pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gold-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-gold-600/30 shimmer-gold">
                  <RefreshCw className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-serif font-bold text-zinc-900 tracking-tight">
                    {language === 'kr' ? '기사 → 자동 변환' : 'Article → Auto Conversion'}
                  </h2>
                  <p className="text-gold-600 text-xs mt-1 font-serif italic">Transform your story for any platform instantly.</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-8 mb-10 p-6 bg-gold-50/30 rounded-3xl border border-gold-100">
              <div className="space-y-3">
                <label className="text-xs font-bold text-gold-600 uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  {language === 'kr' ? '이미지 컨셉' : 'Image Concept'}
                </label>
                <div className="flex gap-2">
                  {[
                    { id: 'realistic', label: '실사' },
                    { id: 'webtoon', label: '웹툰' },
                    { id: 'drawing', label: '드로잉' },
                    { id: 'videoart', label: '비디오아트' }
                  ].map(style => (
                    <button
                      key={style.id}
                      onClick={() => setCardImageStyle(style.id)}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border ${
                        cardImageStyle === style.id 
                          ? 'bg-gold-600 text-white border-gold-600 shadow-lg shadow-gold-600/20' 
                          : 'bg-white text-gold-400 border-gold-100 hover:border-gold-300'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-px h-12 bg-gold-200 hidden md:block" />

              <div className="space-y-3">
                <label className="text-xs font-bold text-gold-600 uppercase tracking-widest flex items-center gap-2">
                  <Layout className="w-4 h-4" />
                  {language === 'kr' ? '카드 크기 (비율)' : 'Card Size (Ratio)'}
                </label>
                <div className="flex gap-2">
                  {[
                    { id: '1:1', label: '1:1 (정사각형)' },
                    { id: '9:16', label: '9:16 (세로)' },
                    { id: '16:9', label: '16:9 (가로)' }
                  ].map(ratio => (
                    <button
                      key={ratio.id}
                      onClick={() => setCardAspectRatio(ratio.id as any)}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border ${
                        cardAspectRatio === ratio.id 
                          ? 'bg-gold-600 text-white border-gold-600 shadow-lg shadow-gold-600/20' 
                          : 'bg-white text-gold-400 border-gold-100 hover:border-gold-300'
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
              {[
                { id: 'card', label: '카드뉴스', labelEn: 'Card News', icon: Layout, desc: 'Visual slides' },
                { id: 'shorts', label: '쇼츠 대본', labelEn: 'Shorts Script', icon: Video, desc: '60s vertical' },
                { id: 'broadcast', label: '방송 리포트', labelEn: 'Broadcast Report', icon: MessageSquare, desc: 'TV script' },
                { id: 'sns', label: 'SNS 요약', labelEn: 'SNS Summary', icon: Send, desc: 'Catchy posts' }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleConvertArticle(type.id as any)}
                  disabled={isConverting}
                  className={`p-8 rounded-3xl border transition-all flex flex-col items-center gap-4 group relative overflow-hidden ${
                    selectedConversionType === type.id
                      ? 'bg-gold-600 border-gold-600 text-white shadow-2xl shadow-gold-600/40 shimmer-gold'
                      : 'bg-gold-50/20 border-gold-100 text-zinc-600 hover:border-gold-400 hover:bg-white hover:shadow-xl hover:shadow-gold-500/10'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-2 transition-colors ${
                    selectedConversionType === type.id ? 'bg-white/20' : 'bg-gold-50 group-hover:bg-gold-100'
                  }`}>
                    <type.icon className={`w-8 h-8 ${selectedConversionType === type.id ? 'text-white' : 'text-gold-600 group-hover:scale-110 transition-transform'}`} />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-base mb-1">{language === 'kr' ? type.label : type.labelEn}</div>
                    <div className={`text-[10px] uppercase tracking-widest opacity-60 font-bold ${selectedConversionType === type.id ? 'text-white' : 'text-gold-600'}`}>
                      {type.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {isConverting && (
              <div className="flex flex-col items-center justify-center py-20 bg-gold-50/30 rounded-[2rem] border border-dashed border-gold-200 animate-pulse">
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-gold-600 animate-spin mb-6" />
                  <Sparkles className="w-6 h-6 text-gold-400 absolute -top-2 -right-2 animate-bounce" />
                </div>
                <p className="text-gold-700 font-serif italic text-lg mb-2">
                  {language === 'kr' ? '나현 앵커가 기사를 변환하고 있습니다...' : 'Anchor Nahyun is converting your article...'}
                </p>
                {isGeneratingCardImages && (
                  <p className="text-gold-500 text-sm animate-pulse">
                    {language === 'kr' ? '각 슬라이드에 맞는 이미지를 생성 중입니다...' : 'Generating images for each slide...'}
                  </p>
                )}
              </div>
            )}

            {conversionResult && !isConverting && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                {selectedConversionType === 'card' && typeof conversionResult === 'object' ? (
                  <div className="flex flex-col items-center gap-10">
                    {/* Carousel Container */}
                    <div className="relative w-full max-w-5xl flex items-center justify-center gap-4">
                      {/* Prev Button */}
                      <button
                        onClick={() => setCurrentSlideIdx(prev => Math.max(0, prev - 1))}
                        disabled={currentSlideIdx === 0}
                        className={`p-3 rounded-full border border-gold-200 transition-all shadow-lg z-20 ${
                          currentSlideIdx === 0 ? 'bg-zinc-50 text-zinc-300' : 'bg-white text-gold-600 hover:bg-gold-600 hover:text-white'
                        }`}
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>

                      {/* Card Display Area */}
                      <div className="flex-1 flex justify-center min-h-[600px]">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={currentSlideIdx}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="w-full flex flex-col items-center gap-6"
                          >
                            {/* Visual Card - Display version */}
                            <div 
                              className={`${
                                cardAspectRatio === '1:1' ? 'aspect-square max-w-[500px]' : 
                                cardAspectRatio === '9:16' ? 'aspect-[9/16] max-w-[350px]' : 'aspect-video max-w-[800px]'
                              } w-full bg-zinc-900 rounded-[2.5rem] p-6 flex flex-col relative overflow-hidden border border-gold-500/30 shadow-2xl`}
                            >
                              {/* Background Decoration */}
                              <div className="absolute top-0 right-0 w-48 h-48 bg-gold-600/10 rounded-full -mr-24 -mt-24 blur-3xl" />
                              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gold-600/10 rounded-full -ml-24 -mb-24 blur-3xl" />
                              
                              <div className="relative z-10 flex flex-col h-full">
                                <div className="flex items-center justify-between mb-4 shrink-0">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gold-600 rounded-lg flex items-center justify-center shadow-lg">
                                      <span className="text-white font-serif font-bold text-lg italic">Z</span>
                                    </div>
                                    <span className="text-gold-500 font-bold tracking-widest text-[10px] uppercase">Zen4U News</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-gold-500/50 text-[10px] font-bold uppercase tracking-widest">
                                      Slide {currentSlideIdx + 1} / {conversionResult.slides.length}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex-1 flex flex-col min-h-0">
                                  <h3 className={`font-serif font-bold text-white leading-tight mb-3 shrink-0 ${
                                    cardAspectRatio === '9:16' ? 'text-lg' : 'text-base'
                                  }`}>
                                    {conversionResult.slides[currentSlideIdx].title}
                                  </h3>
                                  
                                  <div className={`flex-1 flex gap-4 min-h-0 ${
                                    cardAspectRatio === '16:9' ? 'flex-row items-center' : 'flex-col'
                                  }`}>
                                    {cardImages[currentSlideIdx] ? (
                                      <div className={`rounded-2xl overflow-hidden border border-white/10 shrink-0 shadow-xl ${
                                        cardAspectRatio === '16:9' ? 'w-[35%] aspect-square' : 'w-full aspect-[2/1]'
                                      }`}>
                                        <img 
                                          src={cardImages[currentSlideIdx]} 
                                          alt={`Slide ${currentSlideIdx + 1}`} 
                                          className="w-full h-full object-cover"
                                          referrerPolicy="no-referrer"
                                        />
                                      </div>
                                    ) : failedCardImages[currentSlideIdx] ? (
                                      <div className={`rounded-2xl bg-red-500/5 border border-dashed border-red-500/20 flex flex-col items-center justify-center shrink-0 gap-3 ${
                                        cardAspectRatio === '16:9' ? 'w-[35%] aspect-square' : 'w-full aspect-[2/1]'
                                      }`}>
                                        <p className="text-red-400 text-[10px] font-serif italic">Image failed</p>
                                        <button 
                                          onClick={() => handleRetryCardImage(currentSlideIdx)}
                                          className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-[8px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1"
                                        >
                                          <RefreshCw className="w-2 h-2" />
                                          Retry
                                        </button>
                                      </div>
                                    ) : (
                                      isGeneratingCardImages && (
                                        <div className={`rounded-2xl bg-white/5 border border-dashed border-white/10 flex items-center justify-center shrink-0 ${
                                          cardAspectRatio === '16:9' ? 'w-[35%] aspect-square' : 'w-full aspect-[2/1]'
                                        }`}>
                                          <RefreshCw className="w-5 h-5 text-gold-500/30 animate-spin" />
                                        </div>
                                      )
                                    )}
                                    
                                    <div className={`overflow-y-auto pr-2 custom-scrollbar ${
                                      cardAspectRatio === '16:9' ? 'flex-1' : ''
                                    }`}>
                                      <p className={`text-zinc-300 leading-relaxed font-serif ${
                                        cardAspectRatio === '9:16' ? 'text-sm' : 'text-xs'
                                      }`}>
                                        {conversionResult.slides[currentSlideIdx].content}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 shrink-0">
                                  <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">© Zen4U Journal</span>
                                  <div className="flex gap-1.5">
                                    {conversionResult.slides.map((_: any, i: number) => (
                                      <button 
                                        key={i} 
                                        onClick={() => setCurrentSlideIdx(i)}
                                        className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentSlideIdx ? 'bg-gold-500 w-4' : 'bg-white/10 hover:bg-white/30'}`} 
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Bar */}
                            <div className="flex gap-3 justify-center">
                              <button
                                onClick={() => downloadCard(currentSlideIdx)}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-gold-600 hover:bg-gold-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-gold-600/20 group text-sm"
                              >
                                <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                {language === 'kr' ? '현재 슬라이드 다운로드' : 'Download Current'}
                              </button>
                              <button
                                onClick={async () => {
                                  for (let i = 0; i < conversionResult.slides.length; i++) {
                                    await downloadCard(i);
                                    // Small delay between downloads to prevent browser issues
                                    await new Promise(r => setTimeout(r, 300));
                                  }
                                }}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl font-bold transition-all shadow-lg shadow-zinc-900/20 group text-sm"
                              >
                                <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                {language === 'kr' ? '전체 슬라이드 다운로드' : 'Download All'}
                              </button>
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      {/* Next Button */}
                      <button
                        onClick={() => setCurrentSlideIdx(prev => Math.min(conversionResult.slides.length - 1, prev + 1))}
                        disabled={currentSlideIdx === conversionResult.slides.length - 1}
                        className={`p-3 rounded-full border border-gold-200 transition-all shadow-lg z-20 ${
                          currentSlideIdx === conversionResult.slides.length - 1 ? 'bg-zinc-50 text-zinc-300' : 'bg-white text-gold-600 hover:bg-gold-600 hover:text-white'
                        }`}
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </div>

                    {/* Hidden Download Helper - Off-screen but rendered for high-quality export */}
                    <div className="absolute -left-[9999px] -top-[9999px] pointer-events-none">
                      {conversionResult.slides.map((slide: any, idx: number) => (
                        <div 
                          key={`download-${idx}`}
                          ref={el => { cardRefs.current[idx] = el; }}
                          className={`${
                            cardAspectRatio === '1:1' ? 'w-[1080px] h-[1080px]' : 
                            cardAspectRatio === '9:16' ? 'w-[1080px] h-[1920px]' : 'w-[1920px] h-[1080px]'
                          } bg-zinc-900 p-12 flex flex-col relative overflow-hidden`}
                        >
                          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gold-600/10 rounded-full -mr-48 -mt-48 blur-[100px]" />
                          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gold-600/10 rounded-full -ml-48 -mb-48 blur-[100px]" />
                          
                          <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-8 shrink-0">
                              <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-gold-600 rounded-2xl flex items-center justify-center shadow-2xl">
                                  <span className="text-white font-serif font-bold text-3xl italic">Z</span>
                                </div>
                                <span className="text-gold-500 font-bold tracking-[0.3em] text-2xl uppercase">Zen4U News</span>
                              </div>
                              <span className="text-gold-500/50 text-xl font-bold uppercase tracking-widest">Slide {idx + 1}</span>
                            </div>
                            
                            <div className="flex-1 flex flex-col min-h-0">
                              <h3 className={`font-serif font-bold text-white leading-tight mb-8 shrink-0 ${
                                cardAspectRatio === '9:16' ? 'text-5xl' : 'text-4xl'
                              }`}>
                                {slide.title}
                              </h3>
                              
                              <div className={`flex-1 flex gap-10 min-h-0 ${
                                cardAspectRatio === '16:9' ? 'flex-row items-center' : 'flex-col'
                              }`}>
                                {cardImages[idx] && (
                                  <div className={`rounded-[3rem] overflow-hidden border border-white/10 shrink-0 shadow-2xl ${
                                    cardAspectRatio === '16:9' ? 'w-[35%] aspect-square' : 'w-full aspect-[2/1]'
                                  }`}>
                                    <img src={cardImages[idx]} className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <p className={`text-zinc-300 leading-relaxed font-serif ${
                                    cardAspectRatio === '9:16' ? 'text-3xl' : 'text-2xl'
                                  }`}>
                                    {slide.content}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-8 shrink-0">
                              <span className="text-zinc-500 text-xl font-bold uppercase tracking-widest">© Zen4U Journal</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Thumbnail Strip */}
                    <div className="flex gap-4 overflow-x-auto p-4 max-w-full custom-scrollbar">
                      {conversionResult.slides.map((slide: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentSlideIdx(idx)}
                          className={`shrink-0 w-32 aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                            idx === currentSlideIdx ? 'border-gold-500 scale-105 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'
                          }`}
                        >
                          {cardImages[idx] ? (
                            <img src={cardImages[idx]} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 font-bold">
                              Slide {idx + 1}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-900 text-white p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-gold-500/30">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gold-400 via-gold-600 to-gold-400" />
                    <div className="absolute top-0 right-0 p-8">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(conversionResult);
                          alert('Copied to clipboard!');
                        }}
                        className="p-4 bg-white/10 hover:bg-gold-600 rounded-2xl transition-all text-white/70 hover:text-white shadow-lg group"
                        title="Copy to clipboard"
                      >
                        <Copy className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-10 h-10 bg-gold-500/20 rounded-full flex items-center justify-center border border-gold-500/30">
                        <Sparkles className="w-5 h-5 text-gold-400" />
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-gold-500 block mb-1">AI Transformation</span>
                        <h3 className="text-xl font-serif font-bold text-white">
                          {selectedConversionType === 'card' && (language === 'kr' ? '카드뉴스 결과' : 'Card News Result')}
                          {selectedConversionType === 'shorts' && (language === 'kr' ? '쇼츠 대본 결과' : 'Shorts Script Result')}
                          {selectedConversionType === 'broadcast' && (language === 'kr' ? '방송 리포트 결과' : 'Broadcast Report Result')}
                          {selectedConversionType === 'sns' && (language === 'kr' ? 'SNS 요약 결과' : 'SNS Summary Result')}
                        </h3>
                      </div>
                    </div>
                    <div className="prose prose-invert max-w-none font-serif text-xl leading-relaxed whitespace-pre-wrap text-zinc-300 bg-white/5 p-8 rounded-2xl border border-white/5">
                      {typeof conversionResult === 'string' ? conversionResult : JSON.stringify(conversionResult, null, 2)}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const FactsSection = ({ data }: { data: ArticleAnalysis }) => (
    <div className="space-y-8">
      <div className="flex justify-end">
        <LanguageToggle />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-emerald-50/30 p-8 rounded-[2rem] border border-emerald-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6 text-emerald-700">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base uppercase tracking-widest">Facts</h3>
          </div>
          <ul className="space-y-4">
            {(language === 'kr' ? data.factsKr : data.factsEn).map((fact, i) => (
              <li key={i} className="flex gap-4 text-base text-emerald-900 leading-relaxed font-serif">
                <span className="text-emerald-400 mt-1.5">•</span>
                {fact}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gold-50/30 p-8 rounded-[2rem] border border-gold-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6 text-gold-700">
            <div className="w-10 h-10 bg-gold-100 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base uppercase tracking-widest">Inferences</h3>
          </div>
          <ul className="space-y-4">
            {(language === 'kr' ? data.inferencesKr : data.inferencesEn).map((inf, i) => (
              <li key={i} className="flex gap-4 text-base text-gold-900 leading-relaxed font-serif">
                <span className="text-gold-400 mt-1.5">•</span>
                {inf}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  const DraftSection = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gold-600 rounded-2xl flex items-center justify-center shadow-lg shadow-gold-600/20">
            <PenTool className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-serif font-bold text-zinc-900">AI News Draft</h2>
            <p className="text-gold-600 text-xs mt-1 font-serif italic">Refine your story with AI assistance.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LanguageToggle />
        </div>
      </div>
      <div className="bg-white border border-gold-100 rounded-[2.5rem] shadow-2xl shadow-gold-500/5 overflow-hidden">
        <textarea 
          value={language === 'kr' ? editedDraftKr : editedDraftEn}
          onChange={(e) => language === 'kr' ? setEditedDraftKr(e.target.value) : setEditedDraftEn(e.target.value)}
          className="w-full h-[700px] p-10 font-serif text-xl leading-relaxed focus:outline-none resize-none whitespace-pre-wrap bg-gold-50/10"
          placeholder="Edit your draft here..."
        />
      </div>

      {/* Quality Coach Section */}
      <div className="mt-12 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gold-600 rounded-2xl flex items-center justify-center shadow-lg shadow-gold-600/20 shimmer-gold">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-serif font-bold text-zinc-900">기사 품질 코치 (Quality Coach)</h2>
              <p className="text-gold-600 text-xs mt-1 font-serif italic">AI Anchor Nahyun's professional evaluation.</p>
            </div>
          </div>
          <button 
            onClick={handleQualityCoach}
            disabled={isCoaching}
            className="px-8 py-4 bg-gold-600 text-white rounded-2xl font-bold hover:bg-gold-700 transition-all shadow-xl shadow-gold-600/20 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCoaching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {language === 'kr' ? '품질 분석 시작' : 'Start Analysis'}
          </button>
        </div>

        {qualityFeedback ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2rem] border border-gold-100 shadow-xl shadow-gold-500/5 space-y-6">
              <div className="flex items-center gap-3 text-gold-600">
                <Layout className="w-5 h-5" />
                <h3 className="font-bold uppercase tracking-widest text-sm">논리 흐름 (Logic Flow)</h3>
              </div>
              <p className="text-zinc-700 font-serif leading-relaxed">{qualityFeedback.logicFlow}</p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-gold-100 shadow-xl shadow-gold-500/5 space-y-6">
              <div className="flex items-center gap-3 text-gold-600">
                <Filter className="w-5 h-5" />
                <h3 className="font-bold uppercase tracking-widest text-sm">편향 위험도 (Bias Risk)</h3>
              </div>
              <p className="text-zinc-700 font-serif leading-relaxed">{qualityFeedback.biasRisk}</p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-gold-100 shadow-xl shadow-gold-500/5 space-y-6 md:col-span-2">
              <div className="flex items-center gap-3 text-gold-600">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="font-bold uppercase tracking-widest text-sm">검증 필요 문장 (Verification Needed)</h3>
              </div>
              <ul className="space-y-3">
                {qualityFeedback.verificationNeeded.map((sentence, i) => (
                  <li key={i} className="flex gap-3 text-zinc-700 font-serif italic bg-gold-50/50 p-4 rounded-xl border border-gold-50">
                    <span className="text-gold-400 font-bold">#</span>
                    {sentence}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-gold-100 shadow-xl shadow-gold-500/5 space-y-6">
              <div className="flex items-center gap-3 text-gold-600">
                <AtSign className="w-5 h-5" />
                <h3 className="font-bold uppercase tracking-widest text-sm">클릭 유도력 조언 (Engagement Tips)</h3>
              </div>
              <p className="text-zinc-700 font-serif leading-relaxed">{qualityFeedback.engagementTips}</p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-gold-100 shadow-xl shadow-gold-500/5 space-y-6">
              <div className="flex items-center gap-3 text-gold-600">
                <BookOpen className="w-5 h-5" />
                <h3 className="font-bold uppercase tracking-widest text-sm">독자 이해도 (Reader Comprehension)</h3>
              </div>
              <p className="text-zinc-700 font-serif leading-relaxed">{qualityFeedback.readerComprehension}</p>
            </div>
          </div>
        ) : (
          <div className="bg-gold-50/30 border border-dashed border-gold-200 rounded-[2.5rem] p-20 text-center">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-gold-100">
              <Sparkles className="w-10 h-10 text-gold-200" />
            </div>
            <p className="text-gold-400 font-serif italic text-lg">
              {isCoaching ? '나현 앵커가 기사를 꼼꼼히 분석하고 있습니다...' : '기사 작성을 마치고 품질 코칭을 받아보세요.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const CommunitySection = () => (
    <div className="space-y-10">
      <div className="bg-zinc-900 text-white p-16 rounded-[3rem] text-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold-500 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold-500 rounded-full blur-[100px]" />
        </div>
        <div className="relative z-10">
          <div className="w-20 h-20 bg-gold-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-gold-500/30">
            <Users className="w-10 h-10 text-gold-500" />
          </div>
          <h2 className="text-4xl font-serif font-bold mb-6 tracking-tight">AI Newsroom</h2>
          <p className="text-zinc-400 max-w-lg mx-auto mb-10 text-lg leading-relaxed font-serif italic">Connect with other reporters, share sources, and collaborate on breaking stories in real-time.</p>
          <button 
            onClick={() => setActiveTab('community')}
            className="px-10 py-4 bg-gold-600 text-white rounded-2xl font-bold hover:bg-gold-700 transition-all shadow-2xl shadow-gold-600/40 text-lg"
          >
            Join the Network
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-gold-100 shadow-xl shadow-gold-500/5 hover:shadow-gold-500/10 transition-all group cursor-pointer">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gold-50 rounded-2xl flex items-center justify-center text-gold-600 font-bold border border-gold-100 group-hover:bg-gold-600 group-hover:text-white transition-colors shadow-sm">
                R{i}
              </div>
              <div>
                <div className="text-base font-bold text-zinc-900 group-hover:text-gold-600 transition-colors">Reporter {i}</div>
                <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">2 hours ago</div>
              </div>
            </div>
            <p className="text-base text-zinc-600 line-clamp-3 leading-relaxed font-serif italic">"Just finished a deep dive into the latest economic policy changes. Anyone else seeing a trend in the local sector?"</p>
            <div className="mt-6 pt-6 border-t border-gold-50 flex items-center gap-6 text-gold-400">
              <div className="flex items-center gap-2 text-xs font-bold"><MessageSquare className="w-4 h-4" /> 12</div>
              <div className="flex items-center gap-2 text-xs font-bold"><Star className="w-4 h-4" /> 5</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const MemoList = () => (
    <div className="space-y-6">
      {memos.map(memo => (
        <div key={memo.id} className="bg-white p-8 rounded-[2rem] border border-gold-100 shadow-sm hover:shadow-xl hover:shadow-gold-500/5 transition-all group">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gold-50 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-gold-500" />
              </div>
              <span className="text-xs text-zinc-400 font-mono">
                {new Date(memo.created_at).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}
              </span>
              {memo.article_url !== 'General Note' && (
                <span className="text-[10px] px-3 py-1 bg-gold-50 rounded-full text-gold-600 font-bold uppercase tracking-widest border border-gold-100">
                  {memo.article_url}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 transition-opacity relative z-10">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite(memo);
                }}
                className={`p-2.5 ${memo.is_favorite ? 'text-gold-500 bg-gold-50' : 'text-zinc-300 hover:bg-zinc-50'} rounded-full transition-all relative z-20 pointer-events-auto cursor-pointer border border-transparent ${memo.is_favorite ? 'border-gold-200' : ''}`}
                title="즐겨찾기"
              >
                <Star className={`w-5 h-5 ${memo.is_favorite ? 'fill-current' : ''}`} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingMemoId(memo.id);
                  setEditingMemoContent(memo.content);
                }}
                className="p-2.5 text-zinc-300 hover:text-gold-600 hover:bg-gold-50 rounded-full transition-all relative z-20 pointer-events-auto cursor-pointer border border-transparent hover:border-gold-200"
                title="수정"
              >
                <Edit3 className="w-5 h-5" />
              </button>
              
              <button
                type="button"
                className="p-2.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all relative z-20 pointer-events-auto cursor-pointer border border-transparent hover:border-red-200"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  deleteMemo(memo.id);
                }}
                title="삭제"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {editingMemoId === memo.id ? (
            <div className="space-y-4">
              <textarea 
                value={editingMemoContent}
                onChange={(e) => setEditingMemoContent(e.target.value)}
                className="w-full p-4 border border-gold-200 rounded-2xl focus:ring-2 focus:ring-gold-500 outline-none bg-gold-50/20"
                rows={4}
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setEditingMemoId(null)} className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-600">Cancel</button>
                <button onClick={() => handleUpdateMemo(memo.id)} className="px-6 py-2 bg-gold-600 text-white rounded-full text-xs font-bold shadow-lg shadow-gold-600/20 hover:bg-gold-700 transition-all">Save Changes</button>
              </div>
            </div>
          ) : (
            <p className="text-zinc-700 whitespace-pre-wrap leading-relaxed font-serif text-lg">{memo.content}</p>
          )}
        </div>
      ))}
    </div>
  );

  const ReporterNetworkMap = () => (
    <div className="space-y-8 relative">
      {isRefreshingNews && (
        <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-[2.5rem]">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-gold-100 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-gold-100 border-t-gold-600 rounded-full animate-spin" />
            <div className="text-center">
              <div className="text-lg font-bold text-zinc-900">실시간 뉴스 수집 중...</div>
              <div className="text-xs text-zinc-500 mt-1 font-serif italic">온라인 상의 최신 기사를 분석하여 리포트를 생성하고 있습니다.</div>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gold-100 shadow-sm">
        <div>
          <h3 className="text-xl font-serif font-bold text-zinc-900">취재 네트워크 맵</h3>
          <p className="text-sm text-zinc-500">기자들의 전문 분야와 실시간 핫 이슈 기사를 확인하세요.</p>
        </div>
        <button
          onClick={() => handleRefreshRealTimeNews()}
          disabled={isRefreshingNews}
          className="flex items-center gap-2 px-6 py-3 bg-gold-600 text-white rounded-2xl font-bold hover:bg-gold-700 transition-all shadow-lg shadow-gold-600/20 disabled:opacity-50"
        >
          {isRefreshingNews ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <RefreshCw className="w-5 h-5" />
          )}
          실시간 뉴스 업데이트
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reporters.map(reporter => (
          <div key={reporter.id} className="bg-white p-6 rounded-3xl border border-gold-100 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gold-50 rounded-2xl flex items-center justify-center text-gold-600 font-bold border border-gold-100">
                {reporter.name[0]}
              </div>
              <div>
                <div className="text-lg font-bold text-zinc-900">{reporter.name}</div>
                <div className="text-xs text-zinc-400 font-bold uppercase tracking-widest">{reporter.newsAgency}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {reporter.specialty.map((s: string) => (
                <span key={s} className="px-2 py-1 bg-zinc-50 text-zinc-600 text-[10px] font-bold rounded-lg border border-zinc-100">
                  {s}
                </span>
              ))}
            </div>
            <div className="pt-4 border-t border-zinc-50">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">최근 기사 (클릭하여 보기)</div>
              {reporter.articles.map((a: any) => (
                <div 
                  key={a.id} 
                  onClick={() => setSelectedArticle({ ...a, reporterName: reporter.name, newsAgency: reporter.newsAgency })}
                  className="text-xs text-zinc-700 line-clamp-1 font-serif italic cursor-pointer hover:text-gold-600 hover:underline transition-all mb-1"
                >
                  "{a.title}"
                </div>
              ))}
            </div>
            <button 
              onClick={() => handleRequestCollaboration(reporter)}
              disabled={isRequestingCollab === reporter.id}
              className="w-full mt-6 py-3 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isRequestingCollab === reporter.id ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Users className="w-4 h-4" />
              )}
              협업 요청하기
            </button>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedArticle && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-3xl max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="relative h-64 w-full">
                <img 
                  src={selectedArticle.image} 
                  alt={selectedArticle.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => setSelectedArticle(null)}
                  className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
                <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="text-[10px] text-gold-400 font-bold uppercase tracking-widest mb-2">{selectedArticle.newsAgency} • {selectedArticle.reporterName}</div>
                  <h3 className="text-2xl font-serif font-bold text-white leading-tight">{selectedArticle.title}</h3>
                </div>
              </div>
              <div className="p-10 overflow-y-auto flex-1 custom-scrollbar">
                <div className="flex items-center gap-4 mb-8 text-xs text-zinc-400 font-bold uppercase tracking-widest">
                  <Clock className="w-4 h-4" /> {selectedArticle.date}
                </div>
                <p className="text-zinc-700 text-lg leading-relaxed font-serif whitespace-pre-wrap">
                  {selectedArticle.content}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  const DuplicateStoryDetector = () => (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-[2.5rem] border border-gold-100 shadow-sm">
        <h3 className="text-xl font-serif font-bold mb-4">기사 중복 감지 및 차별화 분석</h3>
        <p className="text-sm text-zinc-500 mb-6">새로운 기사 아이디어를 입력하면 기존 기사들과의 유사도를 분석하고 AI가 차별화 포인트를 제안합니다.</p>
        <div className="space-y-4">
          <textarea 
            value={storyIdea}
            onChange={(e) => setStoryIdea(e.target.value)}
            placeholder="기사 아이디어나 핵심 내용을 입력하세요..."
            className="w-full p-6 bg-zinc-50 border border-zinc-100 rounded-3xl focus:ring-2 focus:ring-gold-500 outline-none min-h-[150px] text-zinc-700 font-serif"
          />
          <button 
            onClick={handleDuplicateDetection}
            disabled={isAnalyzing || !storyIdea.trim()}
            className="w-full py-4 bg-gold-600 text-white rounded-2xl font-bold hover:bg-gold-700 transition-all shadow-xl shadow-gold-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isAnalyzing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ShieldAlert className="w-5 h-5" />}
            유사도 분석 시작
          </button>
        </div>
      </div>

      {duplicateResult && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-zinc-900 text-white p-8 rounded-[2.5rem] shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full animate-pulse ${
                  duplicateResult.overallRisk === '높음' ? 'bg-red-500' : 
                  duplicateResult.overallRisk === '중간' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                <span className="text-sm font-bold uppercase tracking-widest">중복 위험도: {duplicateResult.overallRisk}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-gold-500 text-xs font-bold uppercase tracking-widest mb-4">차별화 포인트</h4>
                <ul className="space-y-3">
                  {duplicateResult.differentiationPoints.map((p: string, i: number) => (
                    <li key={i} className="flex gap-3 text-sm text-zinc-300">
                      <span className="text-gold-500 font-bold">0{i+1}</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-gold-500 text-xs font-bold uppercase tracking-widest mb-4">개선 제안</h4>
                <ul className="space-y-3">
                  {duplicateResult.improvementSuggestions.map((s: string, i: number) => (
                    <li key={i} className="flex gap-3 text-sm text-zinc-300">
                      <div className="w-1.5 h-1.5 bg-gold-500 rounded-full mt-1.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/10">
              <h4 className="text-gold-500 text-xs font-bold uppercase tracking-widest mb-2">추천 취재 방향</h4>
              <p className="text-sm text-zinc-400 leading-relaxed italic">"{duplicateResult.recommendedApproach}"</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gold-100 shadow-sm">
            <h4 className="text-zinc-900 font-bold mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gold-500" /> 유사 기사 목록
            </h4>
            <div className="space-y-4">
              {duplicateResult.similarArticles.map((art: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <div>
                    <div className="text-sm font-bold text-zinc-900">{art.title}</div>
                    <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">{art.reporter} • {art.date}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-gold-600">{art.similarity}% 유사</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );

  const InterviewQuestionGenerator = () => (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-[2.5rem] border border-gold-100 shadow-sm">
        <h3 className="text-xl font-serif font-bold mb-4">AI 인터뷰 질문 생성기</h3>
        <p className="text-sm text-zinc-500 mb-6">취재 주제를 입력하면 기업, 정부, 전문가별 맞춤형 인터뷰 질문을 자동으로 생성합니다.</p>
        <div className="flex gap-4">
          <input 
            type="text"
            value={interviewTopic}
            onChange={(e) => setInterviewTopic(e.target.value)}
            placeholder="예: 반도체 공급망 위기와 국내 기업의 대응 전략"
            className="flex-1 px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-gold-500 outline-none text-zinc-700 font-serif"
          />
          <button 
            onClick={handleGenerateInterviewQuestions}
            disabled={isAnalyzing || !interviewTopic.trim()}
            className="px-8 bg-gold-600 text-white rounded-2xl font-bold hover:bg-gold-700 transition-all shadow-xl shadow-gold-600/20 disabled:opacity-50 flex items-center gap-2"
          >
            {isAnalyzing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <MessageSquare className="w-5 h-5" />}
            질문 생성
          </button>
        </div>
      </div>

      {interviewResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[
            { id: 'corporate', label: '기업 대상', icon: Building2, color: 'blue', questions: interviewResult.corporate },
            { id: 'government', label: '정부/기관 대상', icon: Landmark, color: 'emerald', questions: interviewResult.government },
            { id: 'expert', label: '전문가 대상', icon: GraduationCap, color: 'gold', questions: interviewResult.expert }
          ].map(section => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={section.id} 
              className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm flex flex-col"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${section.color}-50 text-${section.color}-600`}>
                  <section.icon className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-zinc-900">{section.label}</h4>
              </div>
              <div className="space-y-4 flex-1">
                {section.questions.map((q: string, i: number) => (
                  <div key={i} className="group relative p-4 bg-zinc-50 rounded-2xl border border-zinc-100 hover:border-gold-200 transition-all">
                    <p className="text-xs text-zinc-700 leading-relaxed pr-8">{q}</p>
                    <button 
                      onClick={() => handleCopy(q, `${section.id}-${i}`)}
                      className="absolute top-4 right-4 text-zinc-300 hover:text-gold-500 transition-colors"
                    >
                      {copyStatus === `${section.id}-${i}` ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    {copyStatus === `${section.id}-${i}` && (
                      <span className="absolute -top-8 right-0 bg-zinc-900 text-white text-[8px] px-2 py-1 rounded">복사됨</span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const CredibilityChecker = () => (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-[2.5rem] border border-gold-100 shadow-sm">
        <h3 className="text-xl font-serif font-bold mb-4">기사 신뢰도 점검</h3>
        <p className="text-sm text-zinc-500 mb-6">기사 본문을 입력하면 AI가 6가지 항목을 기준으로 신뢰도를 분석합니다.</p>
        <div className="space-y-4">
          <textarea 
            value={credibilityText}
            onChange={(e) => setCredibilityText(e.target.value)}
            placeholder="기사 본문을 입력하세요..."
            className="w-full p-6 bg-zinc-50 border border-zinc-100 rounded-3xl focus:ring-2 focus:ring-gold-500 outline-none min-h-[200px] text-zinc-700 font-serif"
          />
          <button 
            onClick={handleCredibilityCheck}
            disabled={isFeatureAnalyzing || !credibilityText.trim()}
            className="w-full py-4 bg-gold-600 text-white rounded-2xl font-bold hover:bg-gold-700 transition-all shadow-xl shadow-gold-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isFeatureAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            신뢰도 분석 시작
          </button>
        </div>
      </div>

      {credibilityResult && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 bg-zinc-900 text-white p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
              <div className="relative w-32 h-32 mb-6">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64" cy="64" r="58"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-white/10"
                  />
                  <circle
                    cx="64" cy="64" r="58"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={364.4}
                    strokeDashoffset={364.4 * (1 - credibilityResult.credibilityScore / 100)}
                    className="text-gold-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black">{credibilityResult.credibilityScore}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Score</span>
                </div>
              </div>
              <h4 className="text-lg font-bold mb-1">신뢰도: {credibilityResult.riskLevel}</h4>
              <p className="text-xs text-zinc-400">분석 결과 기반 위험도</p>
            </div>

            <div className="md:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gold-100 shadow-sm">
              <h4 className="text-xs font-bold text-gold-600 uppercase tracking-widest mb-6">핵심 체크리스트</h4>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: '데이터 출처', key: 'hasDataSource' },
                  { label: '인터뷰 포함', key: 'hasInterviews' },
                  { label: '반대 의견', key: 'hasCounterargument' },
                  { label: '출처 다양성', key: 'sourceDiversity' },
                  { label: '데이터 신선도', key: 'dataFreshness' },
                  { label: '주장 귀속', key: 'claimAttribution' }
                ].map(check => (
                  <div key={check.key} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    {(credibilityResult?.checks as any)?.[check.key] ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <X className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-sm font-bold text-zinc-700">{check.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gold-100 shadow-sm">
            <h4 className="text-xs font-bold text-gold-600 uppercase tracking-widest mb-6">상세 분석 결과</h4>
            <div className="space-y-4">
              {credibilityResult?.detailedFindings?.map((finding, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <span className={`text-xl font-bold ${
                    finding.status === '✔' ? 'text-emerald-500' : 
                    finding.status === '⚠' ? 'text-amber-500' : 'text-red-500'
                  }`}>{finding.status}</span>
                  <div>
                    <div className="text-sm font-bold text-zinc-900 mb-1">{finding.category}</div>
                    <p className="text-xs text-zinc-500 leading-relaxed">{finding.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gold-600 text-white p-8 rounded-[2.5rem] shadow-xl">
            <h4 className="text-white/70 text-xs font-bold uppercase tracking-widest mb-6">개선 제안 (Improvement Suggestions)</h4>
            <ul className="space-y-3">
              {credibilityResult?.improvementSuggestions?.map((suggestion, i) => (
                <li key={i} className="flex gap-3 text-sm font-medium">
                  <div className="w-1.5 h-1.5 bg-white rounded-full mt-1.5 shrink-0" />
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </div>
  );

  const ReportingRouteAdvisor = () => (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-[2.5rem] border border-gold-100 shadow-sm">
        <h3 className="text-xl font-serif font-bold mb-4">취재 루트 추천</h3>
        <p className="text-sm text-zinc-500 mb-6">기사 주제를 입력하면 취재해야 할 기업, 정부기관, 전문가를 추천해 드립니다.</p>
        <div className="flex gap-4">
          <input 
            type="text"
            value={routeTopic}
            onChange={(e) => setRouteTopic(e.target.value)}
            placeholder="예: 국내 자율주행 기술 현황과 법적 쟁점"
            className="flex-1 px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-gold-500 outline-none text-zinc-700 font-serif"
          />
          <button 
            onClick={handleReportingRoute}
            disabled={isFeatureAnalyzing || !routeTopic.trim()}
            className="px-8 bg-gold-600 text-white rounded-2xl font-bold hover:bg-gold-700 transition-all shadow-xl shadow-gold-600/20 disabled:opacity-50 flex items-center gap-2"
          >
            {isFeatureAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Map className="w-5 h-5" />}
            루트 추천
          </button>
        </div>
      </div>

      {routeResult && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {[
            { id: 'companies', label: '추천 기업', icon: Building2, color: 'blue', items: routeResult.companies },
            { id: 'government', label: '정부/공공기관', icon: Landmark, color: 'emerald', items: routeResult.government },
            { id: 'experts', label: '전문가/학계', icon: GraduationCap, color: 'gold', items: routeResult.experts }
          ].map(section => (
            <div key={section.id} className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${section.color}-50 text-${section.color}-600`}>
                  <section.icon className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-zinc-900">{section.label}</h4>
              </div>
              <div className="space-y-4 flex-1">
                {section.items.map((item, i) => (
                  <div key={i} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-zinc-900">{item.name || item.agency || item.expertise?.join(', ')}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.priority === '매우 높음' ? 'bg-red-50 text-red-600' : 
                        item.priority === '높음' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>{item.priority}</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-200 rounded-full mb-3 overflow-hidden">
                      <div 
                        className={`h-full bg-${section.color}-500`} 
                        style={{ width: `${item.priorityScore}%` }}
                      />
                    </div>
                    {item.reason && <p className="text-[10px] text-zinc-500 leading-relaxed mb-2 italic">"{item.reason}"</p>}
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gold-600 uppercase tracking-widest">
                      <AtSign className="w-3 h-3" />
                      {item.department || item.division || '관련 분야 전문가'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );

  const ImpactPredictor = () => (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-[2.5rem] border border-gold-100 shadow-sm">
        <h3 className="text-xl font-serif font-bold mb-4">뉴스 영향력 예측</h3>
        <p className="text-sm text-zinc-500 mb-6">기사 제목과 요약을 입력하면 AI가 예상 영향력과 최적의 발행 전략을 제안합니다.</p>
        <div className="space-y-4">
          <input 
            type="text"
            value={impactTitle}
            onChange={(e) => setImpactTitle(e.target.value)}
            placeholder="기사 제목을 입력하세요..."
            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-gold-500 outline-none text-zinc-700 font-serif"
          />
          <textarea 
            value={impactSummary}
            onChange={(e) => setImpactSummary(e.target.value)}
            placeholder="기사 요약이나 핵심 내용을 입력하세요..."
            className="w-full p-6 bg-zinc-50 border border-zinc-100 rounded-3xl focus:ring-2 focus:ring-gold-500 outline-none min-h-[120px] text-zinc-700 font-serif"
          />
          <div className="flex gap-4">
            <select 
              value={impactCategory}
              onChange={(e) => setImpactCategory(e.target.value)}
              className="px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-gold-500 outline-none text-zinc-700 font-serif appearance-none"
            >
              {['IT/기술', '경제', '사회', '정치', '문화', '국제'].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button 
              onClick={handleImpactPrediction}
              disabled={isFeatureAnalyzing || !impactTitle.trim() || !impactSummary.trim()}
              className="flex-1 py-4 bg-gold-600 text-white rounded-2xl font-bold hover:bg-gold-700 transition-all shadow-xl shadow-gold-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isFeatureAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
              영향력 예측 시작
            </button>
          </div>
        </div>
      </div>

      {impactResult && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-zinc-900 text-white p-8 rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gold-500 mb-4">예상 영향력 점수</div>
              <div className="text-7xl font-black mb-4">{impactResult.impactScore}</div>
              <div className={`px-4 py-1 rounded-full text-xs font-bold ${
                impactResult.impactLevel === '높음' ? 'bg-red-500' : 
                impactResult.impactLevel === '중간' ? 'bg-amber-500' : 'bg-emerald-500'
              }`}>영향력: {impactResult.impactLevel}</div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-gold-100 shadow-sm">
              <h4 className="text-xs font-bold text-gold-600 uppercase tracking-widest mb-6">4대 영향력 요소</h4>
              <div className="space-y-6">
                {[
                  { label: '논쟁성 (Controversy)', key: 'controversy' },
                  { label: '댓글 가능성 (Engagement)', key: 'commentLikelihood' },
                  { label: 'SNS 확산성 (Virality)', key: 'viralityScore' },
                  { label: '언론 인용도 (Quotability)', key: 'mediaQuotabilityScore' }
                ].map(factor => (
                  <div key={factor.key}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-zinc-700">{factor.label}</span>
                      <span className="text-xs font-bold text-gold-600">{(impactResult.impactFactors as any)[factor.key].score}%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gold-500" 
                        style={{ width: `${(impactResult.impactFactors as any)[factor.key].score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gold-100 shadow-sm">
              <h4 className="text-xs font-bold text-gold-600 uppercase tracking-widest mb-6">최적 발행 시간</h4>
              <div className="space-y-4">
                {impactResult?.optimalPublishingTime?.map((time, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <Clock className="w-5 h-5 text-gold-500" />
                    <div>
                      <div className="text-sm font-bold text-zinc-900">{time.day} {time.time}</div>
                      <p className="text-[10px] text-zinc-500">{time.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-gold-100 shadow-sm">
              <h4 className="text-xs font-bold text-gold-600 uppercase tracking-widest mb-6">추천 채널 및 예상 도달</h4>
              <div className="space-y-4">
                {impactResult?.recommendedChannels?.map((channel, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gold-500 flex items-center justify-center text-white text-xs font-bold">
                        {channel.priority}
                      </div>
                      <span className="text-sm font-bold text-zinc-900">{channel.channel}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-gold-600">{channel.expectedReach}</div>
                      <div className="text-[8px] text-zinc-400 uppercase tracking-widest">Expected Reach</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 text-white p-8 rounded-[2.5rem] shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {impactResult?.predictedMetrics && Object.entries(impactResult.predictedMetrics).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div className="text-[10px] font-bold text-gold-500 uppercase tracking-widest mb-2">
                    {key === 'estimatedViews' ? '예상 조회수' : key === 'estimatedComments' ? '예상 댓글' : '예상 언론 인용'}
                  </div>
                  <div className="text-2xl font-black">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );

  const BrainstormingEngine = () => (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-[2.5rem] border border-gold-100 shadow-sm">
        <h3 className="text-xl font-serif font-bold mb-4">AI 브레인스토밍 엔진</h3>
        <p className="text-sm text-zinc-500 mb-6">관심 분야와 현재 트렌드를 입력하면 AI가 참신한 기사 아이디어를 제안합니다.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input 
            type="text"
            value={brainstormInterests}
            onChange={(e) => setBrainstormInterests(e.target.value)}
            placeholder="예: 인공지능, 기후 위기, 로컬 비즈니스"
            className="px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-gold-500 outline-none text-zinc-700 font-serif"
          />
          <input 
            type="text"
            value={brainstormTrends}
            onChange={(e) => setBrainstormTrends(e.target.value)}
            placeholder="예: 생성형 AI, 탄소 중립, 1인 가구"
            className="px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-gold-500 outline-none text-zinc-700 font-serif"
          />
        </div>
        <button 
          onClick={handleBrainstorming}
          disabled={isFeatureAnalyzing || !brainstormInterests.trim()}
          className="w-full py-4 bg-gold-600 text-white rounded-2xl font-bold hover:bg-gold-700 transition-all shadow-xl shadow-gold-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isFeatureAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lightbulb className="w-5 h-5" />}
          아이디어 생성
        </button>
      </div>

      {brainstormResult && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {brainstormResult?.ideas?.map((idea, i) => (
              <div key={i} className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm hover:shadow-md transition-all flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                    idea.newsValue === '높음' ? 'bg-red-50 text-red-600' : 
                    idea.newsValue === '중간' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>가치: {idea.newsValue}</span>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, idx) => (
                      <Star key={idx} className={`w-3 h-3 ${idx < idea.difficultyStars ? 'text-gold-500 fill-gold-500' : 'text-zinc-200'}`} />
                    ))}
                  </div>
                </div>
                <h4 className="text-lg font-bold text-zinc-900 mb-4 leading-tight">{idea.title}</h4>
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap gap-2">
                    {idea.keyPeople.map((person, idx) => (
                      <span key={idx} className="px-2 py-1 bg-zinc-50 text-[10px] text-zinc-500 rounded-lg border border-zinc-100">@{person}</span>
                    ))}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    <span className="font-bold text-zinc-500">필요 데이터:</span> {idea.requiredData.join(', ')}
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-zinc-50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                    <Clock className="w-3 h-3" />
                    예상 {idea.estimatedDays}일 소요
                  </div>
                  <button 
                    onClick={() => {
                      setNewPostData({ ...newPostData, title: idea.title, category: 'idea' });
                      setIsCreatingPost(true);
                    }}
                    className="text-[10px] font-bold text-gold-600 hover:text-gold-700 flex items-center gap-1"
                  >
                    기사 작성 시작 <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-zinc-900 text-white p-8 rounded-[2.5rem] shadow-xl">
              <h4 className="text-gold-500 text-xs font-bold uppercase tracking-widest mb-6">추가 아이디어 (Quick Ideas)</h4>
              <div className="space-y-3">
                {brainstormResult?.additionalIdeas?.map((idea, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                    <div className="w-1.5 h-1.5 bg-gold-500 rounded-full" />
                    <span className="text-sm text-zinc-300">{idea}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-gold-100 shadow-sm">
              <h4 className="text-xs font-bold text-gold-600 uppercase tracking-widest mb-6">트렌드 분석 (Trend Analysis)</h4>
              <div className="space-y-6">
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Hot Topics</div>
                  <div className="flex flex-wrap gap-2">
                    {brainstormResult?.trendAnalysis?.hotTopics?.map((topic, i) => (
                      <span key={i} className="px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full">{topic}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Emerging Topics</div>
                  <div className="flex flex-wrap gap-2">
                    {brainstormResult?.trendAnalysis?.emergingTopics?.map((topic, i) => (
                      <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full">{topic}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );

  const CommunityView = () => (
    <div className="max-w-4xl mx-auto space-y-10 relative">
      <div className="flex flex-col gap-8 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 bg-gold-50 p-1 rounded-2xl border border-gold-100">
            {[
              { id: 'feed', label: '뉴스룸 피드', icon: LayoutGrid },
              { id: 'network', label: '네트워크 맵', icon: Users },
              { id: 'duplicate', label: '중복 감지', icon: ShieldAlert },
              { id: 'interview', label: '인터뷰 준비', icon: MessageCircle },
              { id: 'credibility', label: '신뢰도 점검', icon: CheckCircle2 },
              { id: 'route', label: '취재 루트', icon: Map },
              { id: 'impact', label: '영향력 예측', icon: TrendingUp },
              { id: 'brainstorm', label: '브레인스토밍', icon: Lightbulb }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setNewsroomSubTab(tab.id as any)}
                className={`px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  newsroomSubTab === tab.id ? 'bg-white text-gold-600 shadow-lg' : 'text-gold-400 hover:text-gold-600'
                }`}
              >
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {newsroomSubTab === 'feed' && (
          <div className="space-y-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <h2 className="text-4xl font-serif font-bold text-zinc-900">공유 게시판</h2>
                <div className="flex items-center gap-2 bg-gold-50 p-1 rounded-xl border border-gold-100">
                  {(['all', 'coverage', 'idea', 'tips'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                        activeCategory === cat ? 'bg-white text-gold-600 shadow-md' : 'text-gold-400 hover:text-gold-600'
                      }`}
                    >
                      {cat === 'all' ? '전체' : cat === 'coverage' ? '취재' : cat === 'idea' ? '아이디어' : '제보'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 md:w-72">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
                  <input
                    type="text"
                    placeholder="게시판에서 직접 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNewsroomAISearch(searchQuery);
                    }}
                    className="w-full pl-12 pr-12 py-3 bg-white border border-gold-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/20 shadow-inner"
                  />
                  <button
                    onClick={() => handleNewsroomAISearch(searchQuery)}
                    disabled={isNewsroomAISearching || !searchQuery.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gold-500 hover:text-gold-700 transition-colors disabled:opacity-30"
                    title="AI 스마트 검색"
                  >
                    {isNewsroomAISearching ? (
                      <div className="w-4 h-4 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <button
                  onClick={() => setIsCreatingPost(true)}
                  className="p-3 bg-gold-600 text-white rounded-full shadow-xl shadow-gold-600/20 hover:scale-110 transition-transform active:scale-95"
                  title="글쓰기"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            </div>

            {newsroomAISearchResult && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900 text-white p-8 rounded-[2.5rem] border border-gold-500/30 shadow-2xl relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-4">
                  <button 
                    onClick={() => setNewsroomAISearchResult(null)}
                    className="text-white/30 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gold-600 rounded-xl flex items-center justify-center shadow-lg shadow-gold-600/20">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif font-bold text-gold-500">AI 스마트 검색 결과</h3>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Real-time AI Analysis for "{searchQuery}"</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <h4 className="text-2xl font-serif font-bold leading-tight">{newsroomAISearchResult.titleKr}</h4>
                    <div 
                      className="text-white/70 text-sm leading-relaxed font-serif whitespace-pre-wrap line-clamp-6 group-hover:line-clamp-none transition-all duration-500"
                      dangerouslySetInnerHTML={{ __html: newsroomAISearchResult.contentKr }}
                    />
                    <div className="flex flex-wrap gap-2">
                      {newsroomAISearchResult.factsKr.slice(0, 3).map((fact: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-gold-400 font-medium">
                          • {fact}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-inner">
                      <img 
                        src={`https://picsum.photos/seed/${searchQuery}/800/600`} 
                        alt="AI Search Result" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                      <h5 className="text-[10px] font-bold text-gold-500 uppercase tracking-widest mb-2">AI 인사이트</h5>
                      <p className="text-xs text-white/60 italic leading-relaxed">
                        {newsroomAISearchResult.summaryKr}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex items-center justify-between border-b border-gold-100 pb-4">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setSortMode('latest')}
                  className={`text-xs font-bold flex items-center gap-2 transition-colors ${sortMode === 'latest' ? 'text-gold-600' : 'text-zinc-400 hover:text-gold-400'}`}
                >
                  <Clock className="w-4 h-4" /> 최신순
                </button>
                <button
                  onClick={() => setSortMode('popular')}
                  className={`text-xs font-bold flex items-center gap-2 transition-colors ${sortMode === 'popular' ? 'text-gold-600' : 'text-zinc-400 hover:text-gold-400'}`}
                >
                  <Sparkles className="w-4 h-4" /> 인기순
                </button>
              </div>
              <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest bg-zinc-50 px-3 py-1 rounded-full border border-zinc-100">
                {posts.length} Shared Items
              </div>
            </div>

            <div className="grid gap-6">
              {posts.length > 0 ? (
                posts.map(post => (
                  <motion.div
                    layout
                    key={post.id}
                    onClick={() => {
                      setSelectedPost(post);
                      fetchComments(post.id);
                    }}
                    className="bg-white p-8 rounded-[2.5rem] border border-gold-100 shadow-sm hover:shadow-2xl hover:shadow-gold-500/10 transition-all cursor-pointer group relative overflow-hidden"
                  >
                    {post.like_count > 5 && (
                      <div className="absolute top-0 right-0 bg-gold-500 text-white px-4 py-1.5 rounded-bl-2xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg">
                        <Star className="w-3 h-3 fill-current" /> Popular
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gold-50 flex items-center justify-center font-bold text-gold-600 relative border border-gold-100">
                          {post.user_name[0]}
                          <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1 border-2 border-white shadow-sm" title="기자 인증">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                          </div>
                        </div>
                        <div>
                          <div className="text-base font-bold text-zinc-900 flex items-center gap-2">
                            {post.user_name}
                            <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-emerald-100">Verified</span>
                          </div>
                          <div className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
                            {post.user_company} • {new Date(post.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                        post.category === 'coverage' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        post.category === 'idea' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gold-50 text-gold-600 border-gold-100'
                      }`}>
                        {post.category}
                      </span>
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-zinc-900 mb-3 group-hover:text-gold-600 transition-colors leading-tight">{post.title}</h3>
                    <p className="text-zinc-600 line-clamp-2 mb-6 leading-relaxed font-serif">{post.content}</p>
                    
                    <div className="flex items-center gap-8 text-zinc-400">
                      <div className="flex items-center gap-2 text-xs font-bold group-hover:text-gold-500 transition-colors">
                        <MessageSquare className="w-4 h-4" /> {post.comment_count}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold group-hover:text-gold-500 transition-colors">
                        <ThumbsUp className="w-4 h-4" /> {post.like_count}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold group-hover:text-gold-500 transition-colors">
                        <Eye className="w-4 h-4" /> {post.view_count}
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-gold-200">
                  <Search className="w-12 h-12 text-gold-200 mx-auto mb-4" />
                  <p className="text-zinc-400 font-medium">검색 결과가 없습니다.</p>
                  <p className="text-xs text-zinc-300 mt-1">다른 키워드로 검색해보세요.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {newsroomSubTab === 'network' && ReporterNetworkMap()}
        {newsroomSubTab === 'duplicate' && DuplicateStoryDetector()}
        {newsroomSubTab === 'interview' && InterviewQuestionGenerator()}
        {newsroomSubTab === 'credibility' && CredibilityChecker()}
        {newsroomSubTab === 'route' && ReportingRouteAdvisor()}
        {newsroomSubTab === 'impact' && ImpactPredictor()}
        {newsroomSubTab === 'brainstorm' && BrainstormingEngine()}
      </div>
    </div>
  );

  const PostDetailView = ({ post }: { post: Post }) => (
    <div className="max-w-4xl mx-auto bg-white rounded-[2.5rem] border border-gold-100 shadow-2xl shadow-gold-500/10 overflow-hidden relative">
      <div className="absolute -right-24 bottom-0 w-96 opacity-25 pointer-events-none hidden lg:block">
        {AnchorNahyunImage({})}
      </div>
      <div className="absolute -left-20 top-40 w-64 opacity-10 pointer-events-none hidden lg:block">
        {AnchorNahyunImage({})}
      </div>
      <div className="p-10 border-b border-gold-50 relative z-10">
        <button
          onClick={() => setSelectedPost(null)}
          className="mb-8 flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-gold-600 transition-colors uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" /> Back to AI Newsroom
        </button>
        
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gold-600 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-gold-600/20">
              {post.user_name[0]}
            </div>
            <div>
              <div className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                {post.user_name}
                <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-emerald-100">Verified</span>
              </div>
              <div className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">
                {post.user_company} • {new Date(post.created_at).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleLikePost(post.id)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold-50 text-gold-600 hover:bg-gold-100 transition-all text-xs font-bold border border-gold-100 shadow-sm"
            >
              <ThumbsUp className="w-4 h-4" /> {post.like_count}
            </button>
            {user?.id === post.user_id && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingPostId(post.id);
                    setNewPostData({
                      title: post.title,
                      content: post.content,
                      category: post.category,
                      link_url: post.link_url || '',
                      file: null
                    });
                    setIsCreatingPost(true);
                  }}
                  className="p-2.5 text-zinc-300 hover:text-gold-600 hover:bg-gold-50 rounded-full transition-all border border-transparent hover:border-gold-100"
                  title="수정"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <button
                  onClick={async () => {
                    if (confirm('게시글을 삭제하시겠습니까?')) {
                      const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
                      if (res.ok) {
                        setSelectedPost(null);
                        fetchPosts();
                      }
                    }
                  }}
                  className="p-2.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all border border-transparent hover:border-red-100"
                  title="삭제"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <h1 className="text-4xl font-serif font-bold text-zinc-900 mb-8 leading-tight">{post.title}</h1>
        <div className="prose prose-zinc max-w-none text-zinc-700 leading-relaxed mb-10 whitespace-pre-wrap font-serif text-xl">
          {post.content}
        </div>

        {post.link_url && (
          <a
            href={post.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-6 bg-gold-50/30 rounded-[2rem] border border-gold-100 hover:border-gold-300 transition-all mb-6 group shadow-sm hover:shadow-md"
          >
            <div className="flex gap-6">
              {post.link_image && (
                <img 
                  src={post.link_image} 
                  alt="" 
                  className="w-28 h-28 object-cover rounded-2xl shadow-md border-2 border-white"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 bg-gold-500 rounded flex items-center justify-center">
                    <LinkIcon className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-[10px] font-bold text-gold-600 uppercase tracking-widest">Shared Link</span>
                </div>
                <div className="text-lg font-bold text-zinc-900 mb-2 line-clamp-1 group-hover:text-gold-600 transition-colors">{post.link_title || post.link_url}</div>
                <div className="text-sm text-zinc-500 line-clamp-2 leading-relaxed font-serif">{post.link_description}</div>
              </div>
              <ExternalLink className="w-5 h-5 text-gold-300 shrink-0 self-center group-hover:text-gold-600 transition-colors" />
            </div>
          </a>
        )}

        {post.file_url && (
          <a
            href={post.file_url}
            download={post.file_name}
            className="flex items-center gap-4 p-6 bg-gold-50/30 rounded-[2rem] border border-gold-100 hover:border-gold-300 transition-all group shadow-sm hover:shadow-md"
          >
            <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform border border-gold-50">
              <Paperclip className="w-6 h-6 text-gold-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-gold-400 uppercase tracking-widest mb-1">Attached File</div>
              <div className="text-base font-bold text-zinc-900 truncate group-hover:text-gold-600 transition-colors">{post.file_name}</div>
            </div>
            <Download className="w-5 h-5 text-gold-300 group-hover:text-gold-600 transition-colors" />
          </a>
        )}
      </div>

      <div className="p-10 bg-gold-50/20 border-t border-gold-100">
        <h3 className="text-xl font-serif font-bold text-zinc-900 mb-8 flex items-center gap-3">
          <div className="w-8 h-8 bg-gold-500 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          Comments ({comments.length})
        </h3>

        <div className="space-y-8 mb-10">
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-4 group">
              <div className="w-10 h-10 rounded-xl bg-gold-100 flex items-center justify-center text-sm font-bold text-gold-600 shrink-0 border border-gold-200">
                {comment.user_name[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-bold text-zinc-900">{comment.user_name}</span>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{new Date(comment.created_at).toLocaleString()}</span>
                </div>
                <p className="text-base text-zinc-600 leading-relaxed font-serif">
                  {comment.content.split(/(@\S+)/).map((part, i) => 
                    part.startsWith('@') ? <span key={i} className="text-gold-600 font-bold">{part}</span> : part
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddComment} className="relative group">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="댓글을 입력하세요... (@기자이름으로 멘션 가능)"
            className="w-full p-6 pr-16 bg-white border border-gold-100 rounded-[2rem] text-lg font-serif focus:outline-none focus:ring-2 focus:ring-gold-500 shadow-inner min-h-[120px] resize-none"
          />
          <button
            type="submit"
            className="absolute right-4 bottom-4 p-3 bg-gold-600 text-white rounded-2xl shadow-xl shadow-gold-600/20 hover:scale-110 transition-transform active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );

  const NotificationDropdown = () => (
    <div className="absolute right-0 mt-3 w-96 bg-white rounded-[2rem] border border-gold-100 shadow-2xl z-[100] overflow-hidden">
      <div className="p-6 border-b border-gold-50 flex justify-between items-center bg-gold-50/30">
        <h3 className="text-xs font-bold text-gold-600 uppercase tracking-widest">Notifications</h3>
        <button onClick={() => setShowNotifications(false)} className="text-zinc-400 hover:text-gold-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="max-h-[32rem] overflow-y-auto custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-zinc-300 text-sm italic font-serif">No notifications yet.</div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              onClick={() => markNotificationRead(notif.id)}
              className={`p-5 border-b border-gold-50 hover:bg-gold-50/50 transition-all cursor-pointer group ${notif.is_read ? 'opacity-60' : 'bg-gold-50/20'}`}
            >
              <div className="flex gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${
                  notif.type === 'comment' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                  notif.type === 'mention' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gold-50 text-gold-600 border-gold-100'
                }`}>
                  {notif.type === 'comment' ? <MessageSquare className="w-5 h-5" /> :
                   notif.type === 'mention' ? <AtSign className="w-5 h-5" /> : <ThumbsUp className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-zinc-900 leading-relaxed mb-1 group-hover:text-gold-600 transition-colors">{notif.message}</p>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{new Date(notif.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const CreatePostModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsCreatingPost(false)}
        className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gold-100"
      >
        <div className="p-8 border-b border-gold-50 flex justify-between items-center bg-gold-50/30">
          <div>
            <h2 className="text-2xl font-serif font-bold text-zinc-900">{editingPostId ? '게시글 수정' : '새 게시글 작성'}</h2>
            <p className="text-gold-600 text-xs mt-1 font-serif italic">Share your insights with the journalist network.</p>
          </div>
          <button onClick={() => { setIsCreatingPost(false); setEditingPostId(null); }} className="p-3 hover:bg-gold-100 rounded-full transition-colors text-zinc-400 hover:text-gold-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleCreatePost} className="p-10 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {(['coverage', 'idea', 'tips'] as const).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setNewPostData(prev => ({ ...prev, category: cat }))}
                className={`py-3 rounded-2xl text-xs font-bold uppercase tracking-widest border transition-all ${
                  newPostData.category === cat 
                    ? 'bg-gold-600 text-white border-gold-600 shadow-lg shadow-gold-600/20' 
                    : 'bg-gold-50 text-gold-400 border-gold-100 hover:border-gold-300'
                }`}
              >
                {cat === 'coverage' ? '취재정보' : cat === 'idea' ? '기사아이디어' : '제보/자료'}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="제목을 입력하세요"
            value={newPostData.title}
            onChange={(e) => setNewPostData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full p-5 bg-gold-50/30 border border-gold-100 rounded-2xl text-lg font-serif focus:outline-none focus:ring-2 focus:ring-gold-500 focus:bg-white transition-all outline-none"
            required
          />
          <textarea
            placeholder="내용을 입력하세요..."
            value={newPostData.content}
            onChange={(e) => setNewPostData(prev => ({ ...prev, content: e.target.value }))}
            className="w-full p-5 bg-gold-50/30 border border-gold-100 rounded-2xl text-lg font-serif focus:outline-none focus:ring-2 focus:ring-gold-500 focus:bg-white transition-all min-h-[250px] resize-none outline-none"
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
              <input
                type="url"
                placeholder="기사 링크 (선택)"
                value={newPostData.link_url}
                onChange={(e) => setNewPostData(prev => ({ ...prev, link_url: e.target.value }))}
                className="w-full pl-12 pr-4 py-4 bg-gold-50/30 border border-gold-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:bg-white transition-all outline-none"
              />
            </div>
            <div className="relative">
              <Paperclip className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
              <input
                type="file"
                onChange={(e) => setNewPostData(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                className="w-full pl-12 pr-4 py-4 bg-gold-50/30 border border-gold-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:bg-white transition-all file:hidden outline-none"
              />
              <span className="absolute left-12 top-1/2 -translate-y-1/2 text-xs text-gold-400 pointer-events-none truncate max-w-[150px]">
                {newPostData.file ? newPostData.file.name : '파일 첨부 (선택)'}
              </span>
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-5 bg-gold-600 text-white rounded-[1.5rem] font-bold shadow-2xl shadow-gold-600/30 hover:bg-gold-700 transition-all flex items-center justify-center gap-3 text-lg"
          >
            <Send className="w-5 h-5" /> {editingPostId ? '게시글 수정하기' : '게시글 등록하기'}
          </button>
        </form>
      </motion.div>
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
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gold-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-6">
          <div className="flex items-center gap-6 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold-600 rounded-xl flex items-center justify-center shadow-lg shadow-gold-600/20">
                <span className="text-white font-serif font-bold text-2xl italic">Z</span>
              </div>
              <h1 className="text-2xl font-serif font-bold tracking-tight hidden sm:block text-zinc-900">Zen4U</h1>
            </div>
            <div className="hidden md:flex flex-col border-l border-gold-200 pl-6">
              <span className="text-[10px] text-gold-600 font-bold uppercase tracking-widest">{user.company} / {user.department}</span>
              <span className="text-xs font-bold text-zinc-900">{user.name} Reporter</span>
            </div>
          </div>
          
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
            <input 
              type="text" 
              placeholder="Enter article URL or search keywords..."
              className="w-full bg-gold-50/50 border border-gold-100 rounded-full py-3 pl-12 pr-4 focus:ring-2 focus:ring-gold-500 focus:bg-white transition-all text-sm shadow-inner"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-500 animate-spin" />}
          </form>

          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-3 text-gold-400 hover:text-gold-600 hover:bg-gold-50 rounded-full transition-all relative"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {notifications.some(n => !n.is_read) && (
                  <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
                )}
              </button>
              {showNotifications && <NotificationDropdown />}
            </div>
            <div className="bg-gold-50 p-1 rounded-xl flex gap-1 border border-gold-100">
              <button 
                onClick={() => setViewMode('tabs')}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 ${viewMode === 'tabs' ? 'bg-white text-gold-700 shadow-sm' : 'text-gold-400 hover:text-gold-600'}`}
              >
                <Layout className="w-3 h-3" />
                Tabs
              </button>
              <button 
                onClick={() => setViewMode('scroll')}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 ${viewMode === 'scroll' ? 'bg-white text-gold-700 shadow-sm' : 'text-gold-400 hover:text-gold-600'}`}
              >
                <ScrollText className="w-3 h-3" />
                Scroll
              </button>
            </div>
            <button 
              onClick={() => setUser(null)}
              className="p-3 text-gold-400 hover:text-gold-600 hover:bg-gold-50 rounded-full transition-all"
              title="Logout"
            >
              <Users className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Floating Anchor Nahyun */}
        <div className="fixed bottom-6 right-6 w-32 md:w-48 z-50 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 0.8, x: 0 }}
            whileHover={{ opacity: 1, scale: 1.05 }}
            className="pointer-events-auto"
          >
            {AnchorNahyunImage({ className: "drop-shadow-[0_20px_50px_rgba(184,134,11,0.3)]" })}
          </motion.div>
        </div>

        {!analysis && !loading && (
          HomeContent()
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
                    {[
                      { id: 'home', label: '홈', icon: Home },
                      { id: 'smart_search', label: '스마트 기사탐색', icon: Search },
                      { id: 'body', label: '본문 & 사진', icon: BookOpen },
                      { id: 'analysis_summary', label: '요약 & 분석', icon: Sparkles },
                      { id: 'auto_conversion', label: '기사 자동변환', icon: RefreshCw },
                      { id: 'facts', label: '사실 & 추론', icon: CheckCircle2 },
                      { id: 'memos', label: '메모', icon: StickyNote },
                      { id: 'draft', label: '기사 작성', icon: PenTool },
                      { id: 'community', label: 'AI 뉴스룸', icon: Users }
                    ].map(tab => (
                      <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`p-4 rounded-2xl text-sm font-bold transition-all flex items-center gap-3 border ${
                          activeTab === tab.id 
                            ? 'bg-gold-600 text-white border-gold-600 shadow-lg shadow-gold-600/20 shimmer-gold' 
                            : 'bg-white text-zinc-500 border-gold-100 hover:border-gold-300 hover:bg-gold-50/50'
                        }`}
                      >
                        <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-gold-500'}`} />
                        {tab.label}
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
                      {activeTab === 'home' && HomeContent()}
                      {activeTab === 'smart_search' && SmartSearchContent()}
                      {activeTab === 'body' && BodySection({ data: analysis })}
                      {activeTab === 'analysis_summary' && AnalysisSummarySection({ data: analysis })}
                      {activeTab === 'auto_conversion' && AutoConversionSection()}
                      {activeTab === 'facts' && FactsSection({ data: analysis })}
                      {activeTab === 'memos' && (
                        <div className="space-y-6 relative">
                          <div className="absolute -left-20 top-0 w-56 opacity-20 pointer-events-none hidden lg:block">
                            {AnchorNahyunImage({})}
                          </div>
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
                                {MemoList()}
                          </div>
                        </div>
                      )}
                      {activeTab === 'draft' && (
                        <div className="space-y-6 relative">
                          <div className="absolute -right-28 top-20 w-80 opacity-20 pointer-events-none hidden lg:block">
                            {AnchorNahyunImage({})}
                          </div>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <PenTool className="w-5 h-5 text-zinc-900" />
                              <h2 className="text-2xl font-serif font-bold">AI News Draft</h2>
                            </div>
                            <div className="flex items-center gap-3">
                              <LanguageToggle />
                              
                              <div className="relative">
                                <button 
                                  onClick={() => setShowPerspectiveMenu(!showPerspectiveMenu)}
                                  disabled={isRewriting}
                                  className="px-4 py-2 bg-gold-50 text-gold-600 border border-gold-200 rounded-full text-sm font-bold hover:bg-gold-100 transition-colors flex items-center gap-2"
                                >
                                  {isRewriting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                                  {language === 'kr' ? '기자 관점 전환' : 'Perspective Shift'}
                                </button>
                                
                                <AnimatePresence>
                                  {showPerspectiveMenu && (
                                    <motion.div 
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: 10 }}
                                      className="absolute right-0 mt-2 w-48 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 overflow-hidden"
                                    >
                                      {[
                                        { id: 'reader', labelKr: '독자 관점', labelEn: 'Reader' },
                                        { id: 'corporate', labelKr: '기업 관점', labelEn: 'Corporate' },
                                        { id: 'government', labelKr: '정부 관점', labelEn: 'Government' },
                                        { id: 'worker', labelKr: '노동자 관점', labelEn: 'Worker' },
                                        { id: 'foreign', labelKr: '해외 언론 관점', labelEn: 'Foreign Media' }
                                      ].map(p => (
                                        <button 
                                          key={p.id}
                                          onClick={() => handlePerspectiveShift(p.id)}
                                          className="w-full text-left px-4 py-3 text-sm hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
                                        >
                                          {language === 'kr' ? p.labelKr : p.labelEn}
                                        </button>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>

                              <button 
                                onClick={handleSaveAndAnalyze}
                                disabled={isAnalyzingCoverage}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-full text-sm font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                              >
                                {isAnalyzingCoverage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {language === 'kr' ? '저장 및 AI 분석' : 'Save & Analyze'}
                              </button>

                              <button 
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.onchange = (e: any) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      alert(language === 'kr' ? `${file.name} 사진을 불러왔습니다.` : `Loaded photo: ${file.name}`);
                                    }
                                  };
                                  input.click();
                                }}
                                className="px-4 py-2 bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-full text-sm font-bold hover:bg-zinc-200 transition-colors flex items-center gap-2"
                              >
                                <ImageIcon className="w-4 h-4" />
                                {language === 'kr' ? '갤러리 사진 불러오기' : 'Load Gallery Photo'}
                              </button>

                              <button 
                                onClick={() => {
                                  alert(language === 'kr' ? '기사가 독자페이지로 성공적으로 전송되었습니다.' : 'Article sent to Reader Page successfully.');
                                }}
                                className="px-4 py-2 bg-gold-600 text-white rounded-full text-sm font-bold hover:bg-gold-700 transition-colors flex items-center gap-2 shadow-lg shadow-gold-600/20"
                              >
                                <Send className="w-4 h-4" />
                                {language === 'kr' ? '독자페이지로 전송' : 'Send to Reader Page'}
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

                          {coverageDeficiency && (
                            <motion.div 
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-zinc-900 text-white p-8 rounded-3xl shadow-2xl space-y-6 border border-white/10"
                            >
                              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                                <div className="p-2 bg-white/10 rounded-xl">
                                  <Sparkles className="w-6 h-6 text-emerald-400" />
                                </div>
                                <div>
                                  <h3 className="text-xl font-bold flex items-center gap-2">
                                    🧠 {language === 'kr' ? '취재 부족 감지 AI' : 'Coverage Deficiency AI'}
                                  </h3>
                                  <p className="text-zinc-400 text-sm">
                                    {language === 'kr' ? 'AI가 말함: ⚠ 현재 기사에서 부족한 요소' : 'AI says: ⚠ Missing elements in current article'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                  <div className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                                    <div>
                                      <p className="text-zinc-400 text-xs uppercase tracking-wider font-bold mb-1">
                                        {language === 'kr' ? '현장 인터뷰' : 'Field Interview'}
                                      </p>
                                      <p className="text-sm">{coverageDeficiency.missingInterviews}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                                    <div>
                                      <p className="text-zinc-400 text-xs uppercase tracking-wider font-bold mb-1">
                                        {language === 'kr' ? '반대 의견' : 'Opposing Views'}
                                      </p>
                                      <p className="text-sm">{coverageDeficiency.opposingViews}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                                    <div>
                                      <p className="text-zinc-400 text-xs uppercase tracking-wider font-bold mb-1">
                                        {language === 'kr' ? '데이터 출처' : 'Data Sources'}
                                      </p>
                                      <p className="text-sm">{coverageDeficiency.dataSourceCount}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                                    <div>
                                      <p className="text-zinc-400 text-xs uppercase tracking-wider font-bold mb-1">
                                        {language === 'kr' ? '논리 흐름' : 'Logic Flow'}
                                      </p>
                                      <p className="text-sm">{coverageDeficiency.logicFlow}</p>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="space-y-4">
                                  <div className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                                    <div>
                                      <p className="text-zinc-400 text-xs uppercase tracking-wider font-bold mb-1">
                                        {language === 'kr' ? '편향 위험' : 'Bias Risk'}
                                      </p>
                                      <p className="text-sm">{coverageDeficiency.biasRisk}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                                    <div>
                                      <p className="text-zinc-400 text-xs uppercase tracking-wider font-bold mb-1">
                                        {language === 'kr' ? '클릭 유도력' : 'Clickability'}
                                      </p>
                                      <p className="text-sm">{coverageDeficiency.clickability}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                                    <div>
                                      <p className="text-zinc-400 text-xs uppercase tracking-wider font-bold mb-1">
                                        {language === 'kr' ? '독자 이해도' : 'Reader Comprehension'}
                                      </p>
                                      <p className="text-sm">{coverageDeficiency.readerComprehension}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                                    <div>
                                      <p className="text-zinc-400 text-xs uppercase tracking-wider font-bold mb-1">
                                        {language === 'kr' ? '검증 필요 문장' : 'Verification Needed'}
                                      </p>
                                      <ul className="list-disc list-inside text-sm space-y-1">
                                        {coverageDeficiency.verificationSentences.map((s, i) => (
                                          <li key={i} className="text-zinc-300 italic">"{s}"</li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {SavedDraftsList()}
                        </div>
                      )}
                      {activeTab === 'community' && (
                        selectedPost ? PostDetailView({ post: selectedPost }) : CommunityView()
                      )}
                    </motion.div>
                  </AnimatePresence>
                </>
              ) : (
                <div className="space-y-24">
                  <section id="home">
                    {HomeContent()}
                  </section>
                  <section id="smart_search">
                    {SmartSearchContent()}
                  </section>
                  <section id="body">
                    {BodySection({ data: analysis })}
                  </section>
                  <section id="analysis_summary">
                    {AnalysisSummarySection({ data: analysis })}
                  </section>
                  <section id="auto_conversion">
                    {AutoConversionSection()}
                  </section>
                  <section id="facts">
                    {FactsSection({ data: analysis })}
                  </section>
                  <section id="memos">
                    <div className="space-y-6 relative">
                      <div className="absolute -left-20 top-0 w-56 opacity-20 pointer-events-none hidden lg:block">
                        {AnchorNahyunImage({})}
                      </div>
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
                        {MemoList()}
                      </div>
                    </div>
                  </section>
                  <section id="draft">
                    <div className="space-y-6 relative">
                      <div className="absolute -right-28 top-20 w-80 opacity-20 pointer-events-none hidden lg:block">
                        {AnchorNahyunImage({})}
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <PenTool className="w-5 h-5 text-zinc-900" />
                          <h2 className="text-2xl font-serif font-bold">AI News Draft</h2>
                        </div>
                        <div className="flex items-center gap-3">
                          <LanguageToggle />
                          
                          <div className="relative">
                            <button 
                              onClick={() => setShowPerspectiveMenu(!showPerspectiveMenu)}
                              disabled={isRewriting}
                              className="px-4 py-2 bg-gold-50 text-gold-600 border border-gold-200 rounded-full text-sm font-bold hover:bg-gold-100 transition-colors flex items-center gap-2"
                            >
                              {isRewriting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                              {language === 'kr' ? '기자 관점 전환' : 'Perspective Shift'}
                            </button>
                            
                            <AnimatePresence>
                              {showPerspectiveMenu && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 10 }}
                                  className="absolute right-0 mt-2 w-48 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 overflow-hidden"
                                >
                                  {[
                                    { id: 'reader', labelKr: '독자 관점', labelEn: 'Reader' },
                                    { id: 'corporate', labelKr: '기업 관점', labelEn: 'Corporate' },
                                    { id: 'government', labelKr: '정부 관점', labelEn: 'Government' },
                                    { id: 'worker', labelKr: '노동자 관점', labelEn: 'Worker' },
                                    { id: 'foreign', labelKr: '해외 언론 관점', labelEn: 'Foreign Media' }
                                  ].map(p => (
                                    <button 
                                      key={p.id}
                                      onClick={() => handlePerspectiveShift(p.id)}
                                      className="w-full text-left px-4 py-3 text-sm hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
                                    >
                                      {language === 'kr' ? p.labelKr : p.labelEn}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <button 
                            onClick={handleSaveAndAnalyze}
                            disabled={isAnalyzingCoverage}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-full text-sm font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                          >
                            {isAnalyzingCoverage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {language === 'kr' ? '저장 및 AI 분석' : 'Save & Analyze'}
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

                      {coverageDeficiency && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-zinc-900 text-white p-8 rounded-3xl shadow-2xl space-y-6 border border-white/10"
                        >
                          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                            <div className="p-2 bg-white/10 rounded-xl">
                              <Sparkles className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold flex items-center gap-2">
                                🧠 {language === 'kr' ? '취재 부족 감지 AI' : 'Coverage Deficiency AI'}
                              </h3>
                              <p className="text-zinc-400 text-sm">
                                {language === 'kr' ? 'AI가 말함: ⚠ 현재 기사에서 부족한 요소' : 'AI says: ⚠ Missing elements in current article'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                                <div>
                                  <p className="text-zinc-400 text-xs uppercase tracking-wider font-bold mb-1">
                                    {language === 'kr' ? '현장 인터뷰' : 'Field Interview'}
                                  </p>
                                  <p className="text-sm">{coverageDeficiency.missingInterviews}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                                <div>
                                  <p className="text-zinc-400 text-xs uppercase tracking-wider font-bold mb-1">
                                    {language === 'kr' ? '반대 의견' : 'Opposing Views'}
                                  </p>
                                  <p className="text-sm">{coverageDeficiency.opposingViews}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                                <div>
                                  <p className="text-zinc-400 text-xs uppercase tracking-wider font-bold mb-1">
                                    {language === 'kr' ? '데이터 출처' : 'Data Sources'}
                                  </p>
                                  <p className="text-sm">{coverageDeficiency.dataSourceCount}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                                <div>
                                  <p className="text-zinc-400 text-xs uppercase tracking-wider font-bold mb-1">
                                    {language === 'kr' ? '논리 흐름' : 'Logic Flow'}
                                  </p>
                                  <p className="text-sm">{coverageDeficiency.logicFlow}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              <div className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                                <div>
                                  <p className="text-zinc-400 text-xs uppercase tracking-wider font-bold mb-1">
                                    {language === 'kr' ? '편향 위험' : 'Bias Risk'}
                                  </p>
                                  <p className="text-sm">{coverageDeficiency.biasRisk}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                                <div>
                                  <p className="text-zinc-400 text-xs uppercase tracking-wider font-bold mb-1">
                                    {language === 'kr' ? '클릭 유도력' : 'Clickability'}
                                  </p>
                                  <p className="text-sm">{coverageDeficiency.clickability}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                                <div>
                                  <p className="text-zinc-400 text-xs uppercase tracking-wider font-bold mb-1">
                                    {language === 'kr' ? '독자 이해도' : 'Reader Comprehension'}
                                  </p>
                                  <p className="text-sm">{coverageDeficiency.readerComprehension}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                                <div>
                                  <p className="text-zinc-400 text-xs uppercase tracking-wider font-bold mb-1">
                                    {language === 'kr' ? '검증 필요 문장' : 'Verification Needed'}
                                  </p>
                                  <ul className="list-disc list-inside text-sm space-y-1">
                                    {coverageDeficiency.verificationSentences.map((s, i) => (
                                      <li key={i} className="text-zinc-300 italic">"{s}"</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {SavedDraftsList()}
                    </div>
                  </section>
                  <section id="community">
                    {selectedPost ? <PostDetailView post={selectedPost} /> : <CommunityView />}
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
                    {memos.filter(m => m.is_favorite === 1).length === 0 && savedDrafts.filter(d => d.is_favorite).length === 0 && (
                      <p className="text-[10px] text-zinc-400 italic">No favorites yet.</p>
                    )}
                    
                    {/* Saved Drafts Favorites */}
                    {savedDrafts.filter(d => d.is_favorite).map(draft => (
                      <div key={`draft-${draft.id}`} className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 hover:border-emerald-300 transition-all group">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <PenTool className="w-3 h-3 text-emerald-600" />
                            <span className="text-[8px] text-zinc-400 font-mono">
                              {new Date(draft.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => toggleFavoriteDraft(draft.id)}
                              className="p-1 text-amber-400 hover:text-zinc-300 transition-colors"
                              title="즐겨찾기 취소"
                            >
                              <Star className="w-3 h-3 fill-current" />
                            </button>
                            <button 
                              onClick={() => {
                                setEditedDraftKr(draft.contentKr);
                                setEditedDraftEn(draft.contentEn);
                                setActiveTab('draft');
                                alert(language === 'kr' ? '초안이 불러와졌습니다.' : 'Draft loaded.');
                              }}
                              className="p-1 text-zinc-300 hover:text-zinc-600 transition-colors"
                              title="불러오기"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <h4 className="text-[10px] font-bold text-zinc-900 line-clamp-1 mb-1">{draft.title}</h4>
                        <p className="text-[9px] text-zinc-600 line-clamp-2 leading-relaxed">{language === 'kr' ? draft.contentKr : draft.contentEn}</p>
                      </div>
                    ))}

                    {/* Memos Favorites */}
                    {memos.filter(m => m.is_favorite === 1).map(memo => (
                      <div key={memo.id} className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 hover:border-zinc-300 transition-all group">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[8px] text-zinc-400 font-mono">
                            {new Date(memo.created_at).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}
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
                              onClick={() => deleteMemo(memo.id)}
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

      <AnimatePresence>
        {isCreatingPost && CreatePostModal()}
      </AnimatePresence>
    </div>
  );
}
