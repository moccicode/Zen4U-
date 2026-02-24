import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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
         Use HTML tags for emphasis: 
         - <span class='text-red-500 font-bold'>...</span> for critical/red points
         - <span class='text-blue-500 font-bold'>...</span> for factual/blue points
         - <span class='text-green-500 font-bold'>...</span> for positive/green points
         - <i>...</i> for italics.`
      : `You are a professional journalist assistant. Search for and analyze the most recent and relevant news articles about: ${input}. 
         Provide the analysis in BOTH Korean and English.
         Ensure the 'content' and 'draftArticle' fields are detailed and at least 1,500 characters long each.
         Divide the text into clear paragraphs.
         Use HTML tags for emphasis: 
         - <span class='text-red-500 font-bold'>...</span> for critical/red points
         - <span class='text-blue-500 font-bold'>...</span> for factual/blue points
         - <span class='text-green-500 font-bold'>...</span> for positive/green points
         - <i>...</i> for italics.`,
    config: {
      systemInstruction: "You are Zen4U, a specialized AI assistant for professional journalists. Your primary goal is to provide accurate, real-time news analysis. Always prioritize information found in the provided CONTENT or via Google Search. Distinguish clearly between verified facts and inferences. Provide all text fields in both Korean and English versions. For 'content' and 'draftArticle', ensure high detail and a minimum length of 1,500 characters. Use HTML for formatting emphasis with specific colors (red, blue, green). Ensure the 'analysis' field is extremely detailed, providing deep context, historical background, and potential future implications.",
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
          imagePrompt: { type: Type.STRING }
        },
        required: [
          "titleKr", "titleEn", "contentKr", "contentEn", 
          "summaryKr", "summaryEn", "analysisKr", "analysisEn", 
          "factsKr", "factsEn", "inferencesKr", "inferencesEn", 
          "draftArticleKr", "draftArticleEn", "imagePrompt"
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

export const generateNewsImage = async (prompt: string, style: string) => {
  const stylePrompts: Record<string, string> = {
    realistic: "Professional photojournalism style, high resolution, realistic lighting, 8k, news agency style.",
    webtoon: "Modern Korean webtoon style, clean lines, vibrant colors, digital manhwa aesthetic.",
    drawing: "Artistic hand-drawn sketch, charcoal and pencil, expressive lines, editorial illustration style.",
    videoart: "Cinematic video art style, motion blur, glitch effects, neon accents, futuristic digital art."
  };

  const fullPrompt = `${prompt}. Style: ${stylePrompts[style] || stylePrompts.realistic}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: fullPrompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

export const generateNewsVideo = async (prompt: string) => {
  const fullPrompt = `Cinematic news video art style about: ${prompt}. Motion blur, dynamic camera movement, high resolution, professional news aesthetic.`;
  
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
    await new Promise(resolve => setTimeout(resolve, 5000));
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
};
