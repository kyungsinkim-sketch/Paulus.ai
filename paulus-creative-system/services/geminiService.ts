import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Brief, StrategySection, Language, BilingualContent, DirectionCategory, ChatMessage, Slide, CanvasItem, SlideType } from "../types";
import { DeckTheme, ElementDoc, Transform, DeckDoc, SlideStyleType } from "../deck-editor";
import { spawnElements } from "./slideSpawnerService";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- UTILITIES ---

const getHash = (text: string) => {
  let hash = 0, i, chr;
  if (text.length === 0) return hash.toString();
  for (i = 0; i < text.length; i++) {
    chr = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash.toString();
};

async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error.status === 429 || error.code === 429 || (error.message && error.message.includes('429'));
    if (retries > 0 && isRateLimit) {
      console.warn(`Quota exceeded/Rate limited. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// --- PHASE 13-B: AI AUTO DRAFTING ---

/**
 * Generates a full deterministic DeckDoc draft based on a brief.
 */
export const generateAutoDraftDeck = async (brief: Brief, language: Language): Promise<DeckDoc> => {
  const langName = language === 'KO' ? 'Korean' : 'English';
  
  const systemPrompt = `
    You are a Senior Creative Strategist at PAULUS. 
    Based on the provided Client Brief, structure a professional 10-slide creative proposal.
    
    Slide Styles available: MainTitle, Standard, Strategy, Concept, Visual, DirectionBoard.
    
    Output strictly as JSON matching this schema:
    {
      "projectTitle": "string",
      "slides": [
        {
          "styleType": "SlideStyleType",
          "title": "string",
          "body": "string",
          "subtitle": "string (for MainTitle only)"
        }
      ]
    }
  `;

  const userPrompt = `
    Client Brief Content:
    ${brief.rawText || brief.overview}
    
    Objectives: ${brief.objectives}
    Target: ${brief.targetAudience}
    Message: ${brief.keyMessage}

    Generate a 10-slide proposal structure in ${langName}.
  `;

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.3
      }
    }));

    const structure = JSON.parse(response.text || "{}");
    
    const deck: DeckDoc = {
      id: `ai-draft-${Date.now()}`,
      aspectRatio: '16:9',
      theme: {
        primaryColor: '#3b82f6',
        secondaryColor: '#1e293b',
        bgColor: '#ffffff',
        textColor: '#000000',
        fontFamilyPrimary: 'Pretendard',
        fontFamilySecondary: 'Inter',
        defaultTextStyles: {}
      },
      defaults: {
        showFooterLeftTitleClient: true,
        showHeaderLeftSectionTitle: true,
        showFooterRightPageNumber: true,
        showHeaderRightBrandMark: true
      },
      slides: (structure.slides || []).map((s: any, idx: number) => ({
        id: `ai-slide-${idx}-${Date.now()}`,
        styleType: s.styleType as SlideStyleType,
        background: { type: 'color', color: '#ffffff' },
        meta: { sectionTitle: s.title, clientName: brief.targetAudience },
        overrides: {},
        elements: spawnElements(s.styleType as SlideStyleType, { 
          title: s.title, 
          body: s.body, 
          subtitle: s.subtitle 
        })
      }))
    };

    return deck;
  } catch (e) {
    console.error("AI Deck Drafting failed", e);
    throw new Error("Failed to generate AI draft.");
  }
};

// --- PHASE 13-A: AI ASSIST LAYER ---

/**
 * Brand Intelligence: Analyzes a URL or text description to propose a DeckTheme.
 */
export const analyzeBrandIntelligence = async (input: string): Promise<Partial<DeckTheme>> => {
  const prompt = `Analyze the following brand context (URL or text): "${input}". 
  Propose a professional slide deck theme. 
  Output strictly as JSON matching this structure:
  {
    "primaryColor": "Hex string",
    "secondaryColor": "Hex string",
    "bgColor": "Hex string",
    "textColor": "Hex string",
    "fontFamilyPrimary": "Font name",
    "fontFamilySecondary": "Font name"
  }`;

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        temperature: 0.2
      }
    }));
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Brand analysis failed", e);
    return {};
  }
};

/**
 * Layout Intelligence: Suggests improved coordinates/sizes for elements.
 */
export interface LayoutSuggestion {
  elementId: string;
  suggestedTransform: Transform;
  reason: string;
}

export const suggestLayoutOptimization = async (elements: ElementDoc[]): Promise<LayoutSuggestion[]> => {
  const elementData = elements.map(el => ({
    id: el.id,
    type: el.type,
    t: el.transform
  }));

  const prompt = `Analyze these slide element transforms (percentage 0-100): ${JSON.stringify(elementData)}.
  Suggest adjustments for better balance, alignment, or visual density.
  Return strictly a JSON array: 
  [{"elementId": "...", "suggestedTransform": {"x":.., "y":.., "width":.., "height":.., "rotation":..}, "reason": "..."}]`;

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        temperature: 0.1
      }
    }));
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Layout suggestion failed", e);
    return [];
  }
};

// --- PRE-EXISTING SERVICES ---

export const manageBilingualContent = async (
  currentContent: BilingualContent | undefined, 
  newText: string, 
  targetLang: Language
): Promise<{ content: BilingualContent, translatedText: string }> => {
  const content: BilingualContent = currentContent || { EN: '', KO: '' };
  const sourceLang = targetLang === 'EN' ? 'KO' : 'EN';
  content[sourceLang] = newText;
  const newHash = getHash(newText);
  if (content[targetLang] && content.sourceHash === newHash) {
      return { content, translatedText: content[targetLang]! };
  }
  const translated = await translateText(newText, targetLang);
  content[targetLang] = translated;
  content.sourceHash = newHash;
  content.lastTranslatedAt = new Date().toISOString();
  return { content, translatedText: translated };
};

export const generateText = async (prompt: string, systemInstruction?: string): Promise<string> => {
  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "You are a professional creative agency assistant.",
        temperature: 0.7,
      },
    }));
    return response.text || "";
  } catch (error) {
    console.error("Gemini Text Generation Error:", error);
    return "Error generating content. Please try again.";
  }
};

export const translateText = async (text: string, targetLang: Language): Promise<string> => {
    if (!text || !text.trim()) return "";
    try {
        const langName = targetLang === 'KO' ? 'Korean' : 'English';
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Translate the following text to ${langName}. Preserve HTML tags if any. Return only the translated text.\n\nText: ${text}`,
        }));
        return response.text || text;
    } catch (e) {
        console.error("Translation failed", e);
        return text;
    }
};

export const generateCreativeImage = async (prompt: string): Promise<string | undefined> => {
  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
    }));
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    return undefined;
  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    return undefined;
  }
};

/**
 * CLIENT BRIEF INTELLIGENCE (Spec v1.0)
 * Advanced strategic analysis into 8 core categories + Problem Definition layer.
 */
export const analyzeBrief = async (input: string | { data: string, mimeType: string }): Promise<any> => {
    const isBinary = typeof input !== 'string';
    const model = 'gemini-3-pro-preview';
    
    const systemPrompt = `
    You are an Expert Strategic Analyst at PAULUS.
    Analyze the provided Client Brief and output a STRICT JSON structure.
    
    1. Categories: Extract data for 8 core areas:
       PROJECT_OVERVIEW, OBJECTIVES, TARGET_AUDIENCE, KEY_MESSAGE, COMPETITORS, BRAND_POSITIONING_AND_TONE, DELIVERABLES_AND_CHANNELS, TIMELINE_AND_BUDGET.
    2. Problem Definition: Draft a statement answering What, Why, and Cause.
    3. Gaps: Identify missing or ambiguous info.
    4. Assumptions: List any logical assumptions made.

    Response Schema:
    {
      "categories": [
        { "key": "PROJECT_OVERVIEW", "content": "..." },
        ...
      ],
      "problemDefinition": {
        "statement": "...",
        "why": "...",
        "cause": "..."
      },
      "gaps": ["..."],
      "assumptions": ["..."]
    }
    `;

    try {
        const parts: any[] = [{ text: "Perform professional brief analysis according to spec. Return strict JSON." }];
        if (isBinary) {
            parts.push({ inlineData: { data: input.data, mimeType: input.mimeType } });
        } else {
            parts.push({ text: `Brief Source Material:\n${input}` });
        }

        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: { parts },
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                temperature: 0.1
            }
        }));
        
        return JSON.parse(response.text || "{}");
    } catch (e) {
        console.error("Brief Analysis failed", e);
        throw e;
    }
};

export const rewriteText = async (text: string, style: string): Promise<string> => {
    try {
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Rewrite the following text to be "${style}". Keep it concise.\n\nText: ${text}`,
        }));
        return response.text || text;
    } catch (e) { return text; }
};

export const summarizeTexts = async (texts: string[]): Promise<string> => {
    try {
        const joined = texts.join('\n- ');
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Summarize the following list of ideas into a structured text block with a title and bullet points.\n\nIdeas:\n- ${joined}`,
        }));
        return response.text || "";
    } catch (e) { return ""; }
};

export const summarizeChat = async (messages: ChatMessage[], language: Language): Promise<string> => {
    if (messages.length === 0) return "";
    const conversation = messages.map(m => `[${m.userId}]: ${m.text}`).join('\n');
    const langName = language === 'KO' ? 'Korean' : 'English';
    try {
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analyze the following team chat and summarize key decisions, action items, and creative ideas.\nOutput Language: ${langName}\n\nChat Log:\n${conversation}`,
        }));
        return response.text || "";
    } catch (e) { return "Summary failed."; }
};

export const generateIdeas = async (nodeLabel: string, context: string): Promise<string[]> => {
  try {
    const prompt = `Context: ${context}\nTopic: ${nodeLabel}\nGenerate 5 creative sub-concepts. Return ONLY a comma-separated list.`;
     const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    }));
    return (response.text || "").split(',').map(s => s.trim()).filter(Boolean);
  } catch (error) { return []; }
};

export const generateStrategyReport = async (brief: Brief, lang: Language): Promise<Partial<StrategySection>[]> => {
    const prompt = `Based on Brief: ${brief.overview}, generate 6-part strategy framework. Return JSON array: [{"type": "...", "title": "...", "content": "..."}]`;
    try {
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const generateCopyVariations = async (promptText: string, tone: string = "Professional", count: number = 8): Promise<Array<{ EN: string; KO: string }>> => {
  const prompt = `Generate ${count} variations of copy in both EN and KO. Tone: ${tone}. Prompt: ${promptText}. Return JSON array: [{"EN": "...", "KO": "..."}]`;
  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json", temperature: 0.8 }
    }));
    return JSON.parse(response.text || "[]");
  } catch (e) { return []; }
};

export const refineScript = async (scriptText: string, action: 'GRAMMAR' | 'TONE' | 'EXPAND', language: Language): Promise<string> => {
  const langName = language === 'KO' ? 'Korean' : 'English';
  const prompt = `Refine this script (${action}) in ${langName}. Return text only: ${scriptText}`;
  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview', contents: prompt,
    }));
    return response.text || scriptText;
  } catch (e) { return scriptText; }
};

export const breakdownScriptToStoryboard = async (scriptText: string): Promise<Array<{ description: string; dialogue: string; shotType: string }>> => {
  const prompt = `Break script into storyboard frames. Return JSON array: [{"description": "...", "dialogue": "...", "shotType": "..."}]. Script: ${scriptText}`;
  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: "application/json" }
    }));
    return JSON.parse(response.text || "[]");
  } catch (e) { return []; }
};

export const suggestDirectionItems = async (scriptText: string, category: DirectionCategory, language: Language): Promise<Array<{ name: string; description: string }>> => {
  const langName = language === 'KO' ? 'Korean' : 'English';
  const prompt = `Suggest ${category} items for this script in ${langName}. Return JSON: [{"name": "...", "description": "..."}]. Script: ${scriptText}`;
  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: "application/json" }
    }));
    return JSON.parse(response.text || "[]");
  } catch (e) { return []; }
};

export const analyzeDesignFile = async (file: File): Promise<any> => {
  const prompt = `Analyze design file metadata: ${file.name}. Return JSON with suggested theme, colors, fonts.`;
  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: "application/json" }
    }));
    return JSON.parse(response.text || "{}");
  } catch (e) { return {}; }
};

export const draftSlideContent = async (context: string[]): Promise<{ title: string; bullets: string[]; type: string }> => {
  const prompt = `Draft a slide from these thoughts: ${context.join('\n')}. Return JSON: {"title": "...", "bullets": ["..."], "type": "..."}`;
  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: "application/json" }
    }));
    return JSON.parse(response.text || "{}");
  } catch (e) { return { title: "Draft", bullets: [], type: "STRATEGY" }; }
};

export const suggestCopyImprovements = async (text: string, tone: 'CONCISE' | 'PERSUASIVE' | 'PROFESSIONAL'): Promise<string[]> => {
  const prompt = `Improve this text for tone ${tone}. Return JSON array of 3 options. Text: ${text}`;
  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: "application/json" }
    }));
    return JSON.parse(response.text || "[]");
  } catch (e) { return []; }
};

export const reviewDeckFlow = async (slides: Slide[], language: Language): Promise<string> => {
    const prompt = `Review deck flow. Slides: ${JSON.stringify(slides)}. Lang: ${language}`;
    try {
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview', contents: prompt,
        }));
        return response.text || "Analysis failed.";
    } catch (e) { return "Error."; }
};

export const findMissingSlides = async (slides: Slide[], language: Language): Promise<Array<{ insertIndex: number, title: string, type: string, reason: string }>> => {
    const prompt = `Find missing slides. Slides: ${JSON.stringify(slides)}. Return JSON array.`;
    try {
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export const optimizeDeckOrder = async (slides: Slide[], language: Language): Promise<{ reorderedIds: string[], rationale: string }> => {
    const prompt = `Optimize slide order. Return JSON: {"reorderedIds": [], "rationale": ""}`;
    try {
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(response.text || "{}");
    } catch (e) { return { reorderedIds: [], rationale: "" }; }
};

export const generateDraftSlides = async (nodes: CanvasItem[], language: Language): Promise<DraftSlideResult[]> => {
    const nodeContents = nodes.map(n => n.content).join('\n');
    const prompt = `Create slides from: ${nodeContents}. Return JSON array.`;
    try {
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(response.text || "[]");
    } catch (e) { return []; }
};

export interface DraftSlideResult {
    title: string;
    type: SlideType;
    bullets: string[];
}