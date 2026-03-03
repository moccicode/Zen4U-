import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = "AIzaSyBQfuyyz_Ebwjo7e46rUiI_D6bM0bAJXso";
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const analyzeArticle = async (input: string) => {
  const isUrl = input.startsWith("http");
  let articleContent = "";

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
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: isUrl 
      ? `You are a professional journalist assistant. I have fetched the content from the URL: ${input}. 
         
         CONTENT:
         ${articleContent || "Failed to fetch content directly. Please use Google Search to find information about this URL."}
         
         Analyze this content carefully. Provide the analysis in BOTH Korean and English.
         Ensure the 'content' and 'draftArticle' fields are detailed and at least 1,500 characters long each.
         Divide the text into clear paragraphs.
         Identify key entities (people, companies, organizations), a timeline of events, and find at least 3 related articles/URLs.
         Use HTML tags for emphasis: 
         - <span class='text-red-500 font-bold'>...</span> for critical/red points
         - <span class='text-blue-500 font-bold'>...</span> for factual/blue points
         - <span class='text-green-500 font-bold'>...</span> for positive/green points
         - <i>...</i> for italics.`
      : `You are a professional journalist assistant. Search for and analyze the most recent and relevant news articles about: ${input}. 
         Provide the analysis in BOTH Korean and English.
         Ensure the 'content' and 'draftArticle' fields are detailed and at least 1,500 characters long each.
         Divide the text into clear paragraphs.
         Identify key entities (people, companies, organizations), a timeline of events, and find at least 3 related articles/URLs.
         Use HTML tags for emphasis: 
         - <span class='text-red-500 font-bold'>...</span> for critical/red points
         - <span class='text-blue-500 font-bold'>...</span> for factual/blue points
         - <span class='text-green-500 font-bold'>...</span> for positive/green points
         - <i>...</i> for italics.`,
    config: {
      systemInstruction: "You are Zen4U, a specialized AI assistant for professional journalists. Your primary goal is to provide accurate, real-time news analysis. Always prioritize information found in the provided CONTENT or via Google Search. Distinguish clearly between verified facts and inferences. Provide all text fields in both Korean and English versions. For 'content' and 'draftArticle', ensure high detail and a minimum length of 1,500 characters. Use HTML for formatting emphasis with specific colors (red, blue, green). Ensure the 'analysis' field is extremely detailed, providing deep context, historical background, and potential future implications. Create a very specific and relevant 'imagePrompt' that captures the essence of the article, including key figures and the specific environment mentioned. Also extract key entities, a timeline of events, and related articles for visualization purposes.",
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
  });

  try {
    const text = response.text || "{}";
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse Gemini response:", e);
    throw new Error("Failed to analyze the article. Please try again with a different link or search term.");
  }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateNewsImage = async (prompt: string, style: string, aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "16:9", retries = 5) => {
  const stylePrompts: Record<string, string> = {
    realistic: "Professional photojournalism style, high resolution, realistic lighting, 8k, news agency style.",
    webtoon: "Modern Korean webtoon style, clean lines, vibrant colors, digital manhwa aesthetic.",
    drawing: "Artistic hand-drawn sketch, charcoal and pencil, expressive lines, editorial illustration style.",
    videoart: "Cinematic video art style, motion blur, glitch effects, neon accents, futuristic digital art."
  };

  const fullPrompt = `${prompt}. Style: ${stylePrompts[style] || stylePrompts.realistic}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: fullPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
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
      const isRetryable = error?.message?.includes('500') || error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.code === 500;
      
      if (attempt < retries && isRetryable) {
        const waitTime = Math.pow(2, attempt) * 3000 + Math.random() * 1000;
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

  const response = await chat.sendMessage({ message });
  return response.text;
};

export const getQualityCoachFeedback = async (articleText: string, language: 'kr' | 'en') => {
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
};

export const convertArticle = async (articleText: string, type: 'card' | 'shorts' | 'broadcast' | 'sns', language: 'kr' | 'en') => {
  const typePrompts: Record<string, string> = {
    card: "Card News (카드뉴스): Create a series of 5-7 concise, impactful slides with a headline and key points for each. Return a JSON object with a 'slides' array, where each slide has 'title', 'content', and a 'visualPrompt' (a descriptive prompt for generating an image for this specific slide).",
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
};

export const getTrendingNews = async () => {
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
};
