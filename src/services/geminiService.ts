import { GoogleGenAI, Type, Modality } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables. Please set it in the Secrets panel or a .env file.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async <T>(fn: () => Promise<T>, retries = 5, baseDelay = 4000): Promise<T> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRetryable = error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.code === 500 || error?.message?.includes('500');
      
      if (attempt < retries && isRetryable) {
        const waitTime = Math.pow(2, attempt) * baseDelay + Math.random() * 2000;
        console.warn(`Operation failed (attempt ${attempt + 1}/${retries + 1}). Retrying in ${Math.round(waitTime)}ms...`, error);
        await delay(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries reached");
};

export const analyzeArticle = async (input: string) => {
  const isUrl = input.startsWith("http");
  let articleContent = "";
  const currentTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  if (isUrl) {
    try {
      const fetchRes = await fetch("/api/fetch-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: input }),
      });
      if (fetchRes.ok) {
        const data = await fetchRes.json();
        articleContent = data.content;
      }
    } catch (e) {
      console.error("Failed to fetch article content via server:", e);
    }
  }
  
  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: isUrl 
      ? `You are a professional journalist assistant. (Current Time: ${currentTime})
         I have fetched the content from the URL: ${input}. 
         
         CONTENT:
         ${articleContent || "Failed to fetch content directly. Please use Google Search to find information about this URL."}
         
         Analyze this content carefully. Provide the analysis in BOTH Korean and English.
         Ensure the 'content' and 'draftArticle' fields are detailed and at least 1,500 characters long each.
         Divide the text into clear paragraphs.
         Identify key entities (people, companies, organizations), a timeline of events, and find at least 3 related articles/URLs.
         
         Formatting Rules:
         - For 'contentKr' and 'contentEn': Use HTML tags for emphasis (<span class='text-red-500 font-bold'>...</span> for critical, <span class='text-blue-500 font-bold'>...</span> for factual, <span class='text-green-500 font-bold'>...</span> for positive).
         - For 'draftArticleKr' and 'draftArticleEn': Do NOT use any HTML tags (no < >). Use Markdown bold (**text**) for emphasis and ensure clear paragraph separation with double newlines.`
      : `You are a professional journalist assistant. (Current Time: ${currentTime})
         Search for and analyze the most recent and relevant news articles about: ${input}. 
         Provide the analysis in BOTH Korean and English.
         Ensure the 'content' and 'draftArticle' fields are detailed and at least 1,500 characters long each.
         Divide the text into clear paragraphs.
         Identify key entities (people, companies, organizations), a timeline of events, and find at least 3 related articles/URLs.
         
         Formatting Rules:
         - For 'contentKr' and 'contentEn': Use HTML tags for emphasis (<span class='text-red-500 font-bold'>...</span> for critical, <span class='text-blue-500 font-bold'>...</span> for factual, <span class='text-green-500 font-bold'>...</span> for positive).
         - For 'draftArticleKr' and 'draftArticleEn': Do NOT use any HTML tags (no < >). Use Markdown bold (**text**) for emphasis and ensure clear paragraph separation with double newlines.`,
    config: {
      systemInstruction: "You are Zen4U, a specialized AI assistant for professional journalists. Your primary goal is to provide accurate, real-time news analysis. Always prioritize information found in the provided CONTENT or via Google Search. Distinguish clearly between verified facts and inferences. Provide all text fields in both Korean and English versions. For 'content' and 'draftArticle', ensure high detail and a minimum length of 1,500 characters. For 'draftArticle', strictly avoid HTML tags and use Markdown bold (**text**) for readability. For 'content', use specific HTML colors (red, blue, green) as requested. Ensure the 'analysis' field is extremely detailed, providing deep context, historical background, and potential future implications. Create a very specific and relevant 'imagePrompt' that captures the essence of the article, including key figures and the specific environment mentioned. Also extract key entities, a timeline of events, and related articles for visualization purposes.",
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          titleKr: { type: Type.STRING },
          titleEn: { type: Type.STRING },
          contentKr: { type: Type.STRING },
          contentEn: { type: Type.STRING },
          summaryKr: { type: Type.STRING },
          summaryEn: { type: Type.STRING },
          analysisKr: { type: Type.STRING },
          analysisEn: { type: Type.STRING },
          factsKr: { type: Type.ARRAY, items: { type: Type.STRING } },
          factsEn: { type: Type.ARRAY, items: { type: Type.STRING } },
          inferencesKr: { type: Type.ARRAY, items: { type: Type.STRING } },
          inferencesEn: { type: Type.ARRAY, items: { type: Type.STRING } },
          draftArticleKr: { type: Type.STRING },
          draftArticleEn: { type: Type.STRING },
          imagePrompt: { 
            type: Type.STRING, 
            description: "A highly detailed and descriptive prompt for image generation. It MUST include specific descriptions of the key people (if any), the setting, the mood, and the core event of the article to ensure the generated image is highly relevant. Use professional photography terms." 
          },
          entities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                type: { type: Type.STRING, description: "Person, Company, Organization, etc." },
                description: { type: Type.STRING },
                nameEn: { type: Type.STRING },
                typeEn: { type: Type.STRING },
                descriptionEn: { type: Type.STRING },
                background: { type: Type.STRING },
                backgroundEn: { type: Type.STRING },
                keyAchievements: { type: Type.ARRAY, items: { type: Type.STRING } },
                keyAchievementsEn: { type: Type.ARRAY, items: { type: Type.STRING } },
                recentNews: { type: Type.STRING },
                recentNewsEn: { type: Type.STRING }
              },
              required: [
                "name", "type", "description", "nameEn", "typeEn", "descriptionEn",
                "background", "backgroundEn", "keyAchievements", "keyAchievementsEn",
                "recentNews", "recentNewsEn"
              ]
            }
          },
          timeline: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                event: { type: Type.STRING },
                dateEn: { type: Type.STRING },
                eventEn: { type: Type.STRING }
              },
              required: ["date", "event", "dateEn", "eventEn"]
            }
          },
          relatedArticles: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                url: { type: Type.STRING },
                relationship: { type: Type.STRING, description: "How this article relates to the main topic" },
                titleEn: { type: Type.STRING },
                relationshipEn: { type: Type.STRING }
              },
              required: ["title", "url", "relationship", "titleEn", "relationshipEn"]
            }
          }
        },
        required: [
          "titleKr", "titleEn", "contentKr", "contentEn", 
          "summaryKr", "summaryEn", "analysisKr", "analysisEn", 
          "factsKr", "factsEn", "inferencesKr", "inferencesEn", 
          "draftArticleKr", "draftArticleEn", "imagePrompt",
          "entities", "timeline", "relatedArticles"
        ]
      }
    }
  }));

  try {
    const text = response.text || "{}";
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse Gemini response:", e);
    throw new Error("Failed to analyze the article. Please try again with a different link or search term.");
  }
};

export const generateNewsImage = async (prompt: string, style: string, aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "16:9", retries = 7) => {
  const stylePrompts: Record<string, string> = {
    realistic: "Professional photojournalism style, high resolution, realistic lighting, 8k, news agency style.",
    webtoon: "Modern Korean webtoon style, clean lines, vibrant colors, digital manhwa aesthetic.",
    drawing: "Artistic hand-drawn sketch, charcoal and pencil, expressive lines, editorial illustration style.",
    videoart: "Cinematic video art style, motion blur, glitch effects, neon accents, futuristic digital art."
  };

  const fullPrompt = `${prompt}. Style: ${stylePrompts[style] || stylePrompts.realistic}`;
  
  // Use gemini-2.5-flash-image as default for better compatibility
  let currentModel = 'gemini-2.5-flash-image';

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: {
          parts: [{ text: fullPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
            ...(currentModel === 'gemini-3.1-flash-image-preview' ? { imageSize: "1K" } : {})
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (error: any) {
      const isQuotaError = error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429;
      const isPermissionError = error?.message?.includes('403') || error?.status === 'PERMISSION_DENIED' || error?.code === 403;
      const isRetryable = error?.message?.includes('500') || error?.code === 500 || isQuotaError;
      
      // If permission denied on 3.1, it's a final failure for that model
      if (isPermissionError && currentModel === 'gemini-3.1-flash-image-preview') {
         console.error("Permission denied for gemini-3.1-flash-image-preview.");
         throw new Error("PERMISSION_DENIED_IMAGE");
      }

      // If permission denied on 2.5, it's also a final failure
      if (isPermissionError) {
        console.error("Permission denied for image generation.");
        throw new Error("PERMISSION_DENIED_IMAGE");
      }

      if (attempt < retries && isRetryable) {
        const baseWait = isQuotaError ? 6000 : 3000;
        const waitTime = Math.pow(2, attempt) * baseWait + Math.random() * 2000;
        console.warn(`Image generation failed (attempt ${attempt + 1}/${retries + 1}). Retrying in ${Math.round(waitTime)}ms...`, error);
        await delay(waitTime);
        continue;
      }
      console.error("Image generation final failure:", error);
      throw error;
    }
  }
  return null;
};

export const generateNewsVideo = async (prompt: string, retries = 2) => {
  const fullPrompt = `Cinematic news video art style about: ${prompt}. Motion blur, dynamic camera movement, high resolution, professional news aesthetic.`;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: fullPrompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) return null;

      const response = await fetch(downloadLink, {
        method: 'GET',
        headers: {
          'x-goog-api-key': process.env.GEMINI_API_KEY || '',
        },
      });
      
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error: any) {
      const isRetryable = error?.message?.includes('500') || error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.code === 500;
      
      if (attempt < retries && isRetryable) {
        const waitTime = Math.pow(2, attempt) * 5000 + Math.random() * 2000;
        console.warn(`Video generation failed (attempt ${attempt + 1}/${retries + 1}). Retrying in ${Math.round(waitTime)}ms...`, error);
        await delay(waitTime);
        continue;
      }
      console.error("Video generation final failure:", error);
      throw error;
    }
  }
  return null;
};

export const chatWithAnchor = async (history: { role: string, parts: { text: string }[] }[], message: string) => {
  const currentTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    history: history,
    config: {
      systemInstruction: `You are 'Anchor Nahyun' (앵커 나현), a professional and friendly news anchor. 
      Your personality is sophisticated, intelligent, yet warm and approachable. 
      You are the face of Zen4U, an AI-powered news analysis platform.
      When users talk to you, respond like a real news anchor would—articulate, well-informed, and engaging.
      Use a polite and professional tone (존댓말).
      You have access to real-time world information via Google Search. 
      Current Date and Time: ${currentTime}.
      Always provide accurate, up-to-date information based on the latest news and events.
      If a user asks about recent events, use your search tool to give the most current details.
      Keep your responses concise but meaningful.
      Always maintain your identity as Anchor Nahyun.`,
      tools: [{ googleSearch: {} }],
    },
  });

  const response = await withRetry(() => chat.sendMessage({ message }));
  return response.text;
};

export const getQualityCoachFeedback = async (articleText: string, language: 'kr' | 'en') => {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following news article draft and provide professional journalistic feedback.
      
      ARTICLE TEXT:
      ${articleText}
      
      Provide feedback on:
      1. Logic Flow (논리 흐름): Is the argument structured well?
      2. Bias Risk (편향 위험도): Are there any biased expressions or one-sided views?
      3. Verification Needed (검증 필요 문장): List specific sentences that need factual verification.
      4. Engagement Tips (클릭 유도력 보완 조언): How to make the headline or lead more engaging?
      5. Reader Comprehension (독자 이해도): What is the estimated difficulty level for general readers?
      
      Respond in ${language === 'kr' ? 'Korean' : 'English'}.`,
      config: {
        systemInstruction: "You are Anchor Nahyun, a professional news quality coach. Provide sharp, constructive, and detailed journalistic feedback. Return a JSON object.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            logicFlow: { type: Type.STRING },
            biasRisk: { type: Type.STRING },
            verificationNeeded: { type: Type.ARRAY, items: { type: Type.STRING } },
            engagementTips: { type: Type.STRING },
            readerComprehension: { type: Type.STRING }
          },
          required: ["logicFlow", "biasRisk", "verificationNeeded", "engagementTips", "readerComprehension"]
        }
      }
    });

    try {
      const text = response.text || "{}";
      const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse quality coach feedback:", e);
      throw new Error("Failed to get quality coach feedback.");
    }
  });
};

export const convertArticle = async (articleText: string, type: 'card' | 'shorts' | 'broadcast' | 'sns', language: 'kr' | 'en', aspectRatio: string = '1:1') => {
  return withRetry(async () => {
    const typePrompts: Record<string, string> = {
      card: `Card News (카드뉴스): Create a series of 5-7 concise, impactful slides with a headline and key points for each. 
             IMPORTANT: The content and visual prompts MUST be optimized for a ${aspectRatio} aspect ratio. 
             - If 1:1: Focus on centered, balanced compositions.
             - If 16:9: Focus on wide, cinematic landscapes.
             - If 9:16: Focus on vertical, portrait-oriented subjects.
             Return a JSON object with a 'slides' array, where each slide has 'title', 'content', and a 'visualPrompt' (a descriptive prompt for generating an image for this specific slide).`,
      shorts: "Shorts Script (쇼츠 대본): Create a fast-paced, engaging script for a 60-second vertical video. Include visual cues and a strong hook.",
      broadcast: "Broadcast Report (방송 리포트): Create a professional TV news report script, including anchor intro, reporter narration, and soundbite placeholders.",
      sns: "SNS Summary (SNS 요약): Create a catchy, emoji-rich summary suitable for Instagram, X (Twitter), or Facebook, including relevant hashtags."
    };

    const config: any = {
      systemInstruction: "You are a creative media specialist. Your goal is to transform news content into engaging formats for different platforms. Maintain accuracy while adapting the tone and structure to the target format.",
    };

    if (type === 'card') {
      config.responseMimeType = "application/json";
      config.responseSchema = {
        type: Type.OBJECT,
        properties: {
          slides: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                visualPrompt: { type: Type.STRING, description: "A detailed visual description for generating an image that represents this slide's content." }
              },
              required: ["title", "content", "visualPrompt"]
            }
          }
        },
        required: ["slides"]
      };
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Convert the following news article into the specified format: ${typePrompts[type]}.
      
      ARTICLE TEXT:
      ${articleText}
      
      Respond in ${language === 'kr' ? 'Korean' : 'English'}.`,
      config: config
    });

    if (type === 'card') {
      try {
        const text = response.text || "{}";
        const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(jsonStr);
      } catch (e) {
        console.error("Failed to parse card news JSON:", e);
        return { slides: [{ title: "Error", content: "Failed to generate card news." }] };
      }
    }

    return response.text;
  });
};

export const rewriteArticleByPerspective = async (articleText: string, perspective: string, language: 'kr' | 'en') => {
  return withRetry(async () => {
    const perspectivePrompts: Record<string, string> = {
      reader: language === 'kr' ? '독자 관점 (생활 밀착형 정보와 실질적 영향 중심)' : 'Reader Perspective (Focus on lifestyle information and practical impact)',
      corporate: language === 'kr' ? '기업 관점 (산업 동향, 비즈니스 기회 및 경제적 가치 중심)' : 'Corporate Perspective (Focus on industry trends, business opportunities, and economic value)',
      government: language === 'kr' ? '정부 관점 (정책 방향, 공익성 및 사회적 안정 중심)' : 'Government Perspective (Focus on policy direction, public interest, and social stability)',
      worker: language === 'kr' ? '노동자 관점 (고용 안정, 근로 환경 및 권익 보호 중심)' : 'Worker Perspective (Focus on job security, working environment, and rights protection)',
      foreign: language === 'kr' ? '해외 언론 관점 (글로벌 트렌드, 국제적 위상 및 객관적 분석 중심)' : 'Foreign Media Perspective (Focus on global trends, international status, and objective analysis)'
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Rewrite the following news article from the ${perspectivePrompts[perspective] || perspective}. 
      Maintain the core facts but change the tone, focus, and narrative to match the specified perspective.
      
      ARTICLE TEXT:
      ${articleText}
      
      Respond in ${language === 'kr' ? 'Korean' : 'English'}.`,
    });

    return response.text;
  });
};

export const generateTTS = async (text: string) => {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read the following news article as a professional, authoritative, and sophisticated news anchor named Nahyun. 
      The tone should perfectly match a standard news broadcast—calm, clear, and highly articulate. 
      Maintain a steady, medium reading speed that ensures every word is delivered with the weight and clarity of a real news report. 
      Avoid being overly emotional; instead, focus on a smart, diligent, and trustworthy delivery.
      
      TEXT:
      ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      // Gemini TTS returns raw PCM (16-bit, mono, 24kHz).
      // We need to add a WAV header to make it playable by the browser's <audio> tag.
      const pcmData = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
      const sampleRate = 24000;
      const numChannels = 1;
      const bitsPerSample = 16;
      
      const header = new ArrayBuffer(44);
      const view = new DataView(header);
      
      // RIFF identifier
      view.setUint32(0, 0x52494646, false); // "RIFF"
      // File length
      view.setUint32(4, 36 + pcmData.length, true);
      // RIFF type
      view.setUint32(8, 0x57415645, false); // "WAVE"
      // Format chunk identifier
      view.setUint32(12, 0x666d7420, false); // "fmt "
      // Format chunk length
      view.setUint32(16, 16, true);
      // Sample format (1 is PCM)
      view.setUint16(20, 1, true);
      // Channel count
      view.setUint16(22, numChannels, true);
      // Sample rate
      view.setUint32(24, sampleRate, true);
      // Byte rate (sampleRate * numChannels * bitsPerSample/8)
      view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
      // Block align (numChannels * bitsPerSample/8)
      view.setUint16(32, numChannels * (bitsPerSample / 8), true);
      // Bits per sample
      view.setUint16(34, bitsPerSample, true);
      // Data chunk identifier
      view.setUint32(36, 0x64617461, false); // "data"
      // Data chunk length
      view.setUint32(40, pcmData.length, true);
      
      const wavBlob = new Blob([header, pcmData], { type: 'audio/wav' });
      return URL.createObjectURL(wavBlob);
    }
    return null;
  });
};

export const detectCoverageDeficiency = async (articleText: string, language: 'kr' | 'en') => {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following news article draft for coverage deficiencies (취재 부족 요소 감지).
      
      ARTICLE TEXT:
      ${articleText}
      
      Evaluate the following points:
      1. Field Interviews (현장 인터뷰): Are there quotes from people on the scene or relevant experts?
      2. Opposing Views (반대 의견): Are multiple perspectives or opposing arguments presented?
      3. Data Sources (데이터 출처): How many distinct data sources or references are mentioned?
      4. Logic Flow (논리 흐름): Is the narrative structure sound?
      5. Bias Risk (편향 위험): Is there a risk of bias or one-sided reporting?
      6. Verification Sentences (검증 필요 문장): Identify sentences that require factual double-checking.
      7. Clickability (클릭 유도력): How engaging is the content for potential readers?
      8. Reader Comprehension (독자 이해도): Is the content easy for the general public to understand?
      
      Respond in ${language === 'kr' ? 'Korean' : 'English'}.`,
      config: {
        systemInstruction: "You are a professional news editor and coverage auditor. Your goal is to identify what is missing or weak in a news article to improve its quality and credibility. Return a JSON object.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            missingInterviews: { type: Type.STRING },
            opposingViews: { type: Type.STRING },
            dataSourceCount: { type: Type.STRING },
            logicFlow: { type: Type.STRING },
            biasRisk: { type: Type.STRING },
            verificationSentences: { type: Type.ARRAY, items: { type: Type.STRING } },
            clickability: { type: Type.STRING },
            readerComprehension: { type: Type.STRING }
          },
          required: [
            "missingInterviews", "opposingViews", "dataSourceCount", 
            "logicFlow", "biasRisk", "verificationSentences", 
            "clickability", "readerComprehension"
          ]
        }
      }
    });

    try {
      const text = response.text || "{}";
      const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse coverage deficiency analysis:", e);
      throw new Error("Failed to analyze coverage deficiency.");
    }
  });
};

export const detectDuplicateStory = async (storyIdea: string, existingArticles: any[]) => {
  const currentTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `당신은 전문 뉴스 에디터입니다. (현재 시각: ${currentTime})
      
      새 기사 아이디어: "${storyIdea}"
      
      요청사항:
      1. 구글 검색을 통해 현재 온라인상에 이 아이디어와 유사한 기사가 이미 있는지 철저히 조사하세요.
      2. 사내 기존 기사들(${existingArticles.length}건)과도 비교하세요.
      3. 검색 결과와 비교하여 중복 위험도를 정확하게 판별하세요.
      4. 다른 매체와 차별화할 수 있는 구체적인 포인트와 개선 제안을 제시하세요.
      
      기존 사내 기사 목록:
      ${existingArticles.slice(0, 5).map(a => `- ${a.title}`).join('\n')}
      
      JSON으로 응답:
      {
        "overallRisk": "높음/중간/낮음",
        "similarArticles": [
          {"title": "기사 제목", "reporter": "매체명/기자", "similarity": 85, "date": "발행일"}
        ],
        "differentiationPoints": ["차별화 포인트 1", "차별화 포인트 2"],
        "improvementSuggestions": ["개선 제안 1", "개선 제안 2"],
        "recommendedApproach": "추천 취재 방향"
      }`,
      config: { 
        systemInstruction: "You are a professional news editor. Use Google Search to find real-time existing articles and compare them with the user's idea. Provide a detailed duplication analysis in JSON format.",
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const generateInterviewQuestions = async (topic: string) => {
  const currentTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `인터뷰 주제/대상: "${topic}" (현재 시각: ${currentTime})
      
      요청사항:
      1. 구글 검색을 통해 해당 주제나 인물에 대한 최신 이슈, 논란, 성과 등을 파악하세요.
      2. 현재 시점에서 가장 날카롭고 구체적인 질문을 생성하세요.
      3. 기업(관계자), 정부(정책 담당자), 전문가(학계/연구원) 그룹별로 가장 적절한 질문을 각 3개씩 제안하세요.
      
      JSON 응답 형식:
      {
        "corporate": ["질문 1", "질문 2", "질문 3"],
        "government": ["질문 1", "질문 2", "질문 3"],
        "expert": ["질문 1", "질문 2", "질문 3"]
      }`,
      config: { 
        systemInstruction: "You are a professional investigative journalist. Use Google Search to find current context about the interview topic and generate sharp, relevant questions. Return a JSON object.",
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const getTrendingNews = async () => {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Find the top 3 most trending and breaking news stories in Korea right now. Provide them as a list with a category and a short headline for each.",
      config: {
        systemInstruction: "You are a news researcher. Find the top 3 trending news in Korea. Return a JSON array of objects, each with 'category' (e.g., IT, Economy, Society, Politics) and 'headline' (the actual news title).",
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              headline: { type: Type.STRING }
            },
            required: ["category", "headline"]
          }
        }
      }
    });

    try {
      const text = response.text || "[]";
      const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse trending news:", e);
      return [
        { category: "IT/기술", headline: "AI 반도체 시장의 급격한 변화와 전망" },
        { category: "경제", headline: "글로벌 금리 동결 기조와 국내 증시 영향" },
        { category: "사회", headline: "저출산 고령화 사회 대응을 위한 새로운 정책 제언" }
      ];
    }
  });
};

export const generateRealTimeReporterArticles = async (reporterName: string, specialties: string[]) => {
  const currentTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a professional journalist assistant. 
      Find the MOST RECENT and HOT news articles (as of ${currentTime}) related to these specialties: ${specialties.join(", ")}.
      Based on the real-world search results, generate a detailed news article for reporter '${reporterName}'.
      
      Requirements:
      1. The article MUST be based on actual news found via Google Search.
      2. The content MUST be extremely detailed and long, at least 2,000 characters to ensure it meets the 1,500 character minimum requirement.
      3. Use a professional, journalistic tone.
      4. Provide a highly descriptive image prompt for the article.
      5. The date of the article should be the current date: ${new Date().toISOString().split('T')[0]}.
      
      Return a JSON object with the article details.
      Respond in Korean.`,
      config: {
        systemInstruction: "You are a news generation expert. Use Google Search to find real-time trending news. Generate a high-quality, extremely long-form news article (minimum 2,000 characters) in Korean. Return a JSON object.",
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            date: { type: Type.STRING },
            imagePrompt: { type: Type.STRING }
          },
          required: ["title", "content", "date", "imagePrompt"]
        }
      }
    });

    try {
      const text = response.text || "{}";
      const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
      const articleData = JSON.parse(jsonStr);
      
      // Generate image based on prompt
      const imageUrl = await generateNewsImage(articleData.imagePrompt, 'realistic');
      
      return {
        ...articleData,
        image: imageUrl || `https://picsum.photos/seed/${reporterName}${Date.now()}/1200/800`
      };
    } catch (e) {
      console.error(`Failed to generate real-time article for ${reporterName}:`, e);
      throw e;
    }
  });
};

export const checkCredibility = async (articleText: string) => {
  const currentTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `기사 본문: "${articleText}" (현재 시각: ${currentTime})
      
      다음 항목들을 분석하고 JSON으로 응답:
      {
        "credibilityScore": 0-100,
        "riskLevel": "낮음/중간/높음",
        "checks": {
          "hasDataSource": true/false,
          "hasInterviews": true/false,
          "hasCounterargument": true/false,
          "sourceDiversity": true/false,
          "dataFreshness": true/false,
          "claimAttribution": true/false
        },
        "detailedFindings": [
          {"category": "카테고리", "status": "✔/⚠/✗", "message": "설명"}
        ],
        "improvementSuggestions": ["제안1", "제안2", "제안3"]
      }`,
      config: {
        systemInstruction: "You are a professional news fact-checker and credibility auditor. Analyze the provided text based on journalistic standards. Use Google Search to verify claims if necessary. Return a JSON object.",
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const getReportingRoute = async (topic: string) => {
  const currentTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `주제: "${topic}" (현재 시각: ${currentTime})
      
      이 주제에 관련된 취재 대상을 JSON으로 제시:
      {
        "companies": [
          {
            "name": "회사명",
            "priority": "매우 높음/높음/중간",
            "priorityScore": 0-100,
            "reason": "추천 이유",
            "department": "연락 부서"
          }
        ],
        "government": [
          {
            "agency": "기관명",
            "priority": "매우 높음/높음/중간",
            "priorityScore": 0-100,
            "division": "담당 부서"
          }
        ],
        "experts": [
          {
            "expertise": ["분야1", "분야2"],
            "priority": "매우 높음/높음/중간",
            "priorityScore": 0-100
          }
        ]
      }
      기업 최소 3개, 정부기관 2-3개, 전문가 2-3개 추천.`,
      config: {
        systemInstruction: "You are a news assignment editor. Identify the best companies, government agencies, and expert fields to contact for the given topic. Use Google Search to find relevant entities. Return a JSON object.",
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const predictImpact = async (title: string, summary: string, category: string) => {
  const currentTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `기사 제목: "${title}"
      기사 요약: "${summary}"
      카테고리: "${category}"
      (현재 시각: ${currentTime})
      
      영향력을 JSON으로 예측:
      {
        "impactScore": 0-100,
        "impactLevel": "높음/중간/낮음",
        "impactFactors": {
          "controversy": {"level": "높음/중간/낮음", "score": 0-100},
          "commentLikelihood": {"level": "높음/중간/낮음", "score": 0-100},
          "viralityScore": {"level": "높음/중간/낮음", "score": 0-100},
          "mediaQuotabilityScore": {"level": "높음/중간/낮음", "score": 0-100}
        },
        "optimalPublishingTime": [
          {"time": "HH:MM-HH:MM", "day": "평일/주말", "reason": "이유"}
        ],
        "recommendedChannels": [
          {"channel": "페이스북", "priority": "1순위", "expectedReach": "50,000-100,000"}
        ],
        "cautions": ["주의사항1", "주의사항2"],
        "predictedMetrics": {
          "estimatedViews": "예상 조회수",
          "estimatedComments": "예상 댓글",
          "estimatedMediaCitations": "예상 언론 인용"
        }
      }`,
      config: {
        systemInstruction: "You are a news analytics expert. Predict the potential impact and reach of a news story based on its content and current trends. Use Google Search to understand the current media landscape. Return a JSON object.",
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const brainstormIdeas = async (interests: string, trends: string) => {
  const currentTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `관심 분야: ${interests}
      현재 트렌드: ${trends}
      (현재 시각: ${currentTime})
      
      5-10개의 기사 아이디어를 JSON으로 생성:
      {
        "ideas": [
          {
            "id": "idea_1",
            "title": "기사 제목",
            "difficulty": "쉬움/중간/높음",
            "difficultyStars": 1-5,
            "estimatedDays": 예상 일수,
            "keyPeople": ["인물1", "인물2"],
            "requiredData": ["데이터1", "데이터2"],
            "newsValue": "높음/중간/낮음"
          }
        ],
        "additionalIdeas": ["빠른 아이디어1", "아이디어2"],
        "trendAnalysis": {
          "hotTopics": ["현재 핫 토픽"],
          "emergingTopics": ["떠오르는 토픽"]
        }
      }
      각 아이디어는 실제 구현 가능하고 뉴스 가치 있어야 함.`,
      config: {
        systemInstruction: "You are a creative news director. Generate innovative and high-value article ideas based on the user's interests and current trends. Use Google Search to find the latest trends. Return a JSON object.",
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "{}");
  });
};
