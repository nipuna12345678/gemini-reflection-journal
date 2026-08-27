import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// 1. Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Lazy Google GenAI Client
let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured. Please set a valid Gemini API key.');
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

// 2. Gemini Model Resilience & Fallback Protocol
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash'
] as const;

interface GeminiRequestConfig {
  contents: any;
  systemInstruction?: string;
  config?: {
    temperature?: number;
    topP?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
    responseSchema?: any;
  };
}

async function generateContentWithFallback(requestConfig: GeminiRequestConfig): Promise<{ text: string; modelUsed: string }> {
  const ai = getGenAI();
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      console.log(`[Gemini] Attempting content generation with model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: requestConfig.contents,
        config: {
          systemInstruction: requestConfig.systemInstruction,
          temperature: requestConfig.config?.temperature ?? 0.7,
          topP: requestConfig.config?.topP ?? 0.95,
          maxOutputTokens: requestConfig.config?.maxOutputTokens ?? 2048,
          responseMimeType: requestConfig.config?.responseMimeType,
          responseSchema: requestConfig.config?.responseSchema,
        },
      });

      const responseText = response.text || '';
      if (responseText.trim().length > 0) {
        return { text: responseText, modelUsed: model };
      }
    } catch (err: any) {
      console.warn(`[Gemini Fallback] Model ${model} failed with error:`, err?.message || err);
      lastError = err;
      // Continue to next model in fallback chain
    }
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    timestamp: new Date().toISOString(),
  });
});

// API: Multi-turn Reflection & Journal Conversation
app.post('/api/gemini/reflect', async (req, res) => {
  try {
    // Defensive Payload Ingestion (Null-Safe Destructuring)
    const data = req.body && typeof req.body === 'object' ? req.body : {};
    const prompt = typeof data.prompt === 'string' ? data.prompt.trim() : '';
    const mode = typeof data.mode === 'string' ? data.mode : 'reflection';
    const history = Array.isArray(data.history) ? data.history : [];
    const entryContext = typeof data.entryContext === 'string' ? data.entryContext : '';

    if (!prompt && history.length === 0) {
      return res.status(400).json({ error: 'Prompt or conversation history is required.' });
    }

    // System prompt tailored for thoughtful reflection, brainstorming, and journaling
    const modeInstructions: Record<string, string> = {
      reflection:
        'You are an empathetic, insightful journaling companion. Offer deep, compassionate reflections, highlight unstated emotional themes, gently challenge assumptions, and ask 1-2 open-ended questions to deepen self-awareness.',
      brainstorm:
        'You are an expansive creative thinking partner. Provide structured, actionable, multi-angle brainstorming ideas, creative analogies, and high-impact next steps based on the user’s thought.',
      action_plan:
        'You are a clear-headed executive coach. Break down the user’s thoughts into prioritized, realistic, measurable action items with potential obstacles and mitigations.',
      mindful_inquiry:
        'You are a calm, presence-focused mindfulness guide. Help the user explore sensations, emotional grounding, cognitive reframing, and non-judgmental acceptance.',
      freeform:
        'You are an attentive conversational partner. Respond naturally, warmly, and helpfully to the user’s writing, providing thoughtful analysis and encouragement.',
    };

    const activeModePrompt = modeInstructions[mode] || modeInstructions.reflection;

    const systemInstruction = `${activeModePrompt}
Formatting instructions:
- Use clean Markdown with clear headings and bullet points where helpful.
- Keep tone empowering, thoughtful, and private.
- Never judge or dismiss the user's feelings.
- Conclude with a helpful reflection summary or key takeaways.`;

    // Construct conversation contents
    const contents: any[] = [];

    if (entryContext) {
      contents.push({
        role: 'user',
        parts: [{ text: `[Journal Context / Initial Entry Topic]:\n${entryContext}` }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: `I understand the context of this reflection session. I am ready to guide and explore this with you.` }],
      });
    }

    for (const item of history) {
      if (item && typeof item.content === 'string') {
        contents.push({
          role: item.role === 'user' ? 'user' : 'model',
          parts: [{ text: item.content }],
        });
      }
    }

    if (prompt) {
      contents.push({
        role: 'user',
        parts: [{ text: prompt }],
      });
    }

    const { text, modelUsed } = await generateContentWithFallback({
      contents,
      systemInstruction,
    });

    res.json({
      text,
      modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API /api/gemini/reflect Error]:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate reflection from Gemini.',
    });
  }
});

// API: Generate Insights / Title / Summary for a Journal Entry
app.post('/api/gemini/analyze-entry', async (req, res) => {
  try {
    const data = req.body && typeof req.body === 'object' ? req.body : {};
    const content = typeof data.content === 'string' ? data.content.trim() : '';
    const messages = Array.isArray(data.messages) ? data.messages : [];
    const summaryType = typeof data.summaryType === 'string' ? data.summaryType : 'concise_overview';

    if (!content && messages.length === 0) {
      return res.status(400).json({ error: 'Content is required for analysis.' });
    }

    const transcript = [
      content ? `Initial Entry:\n${content}` : '',
      ...messages.map((m: any) => `${m.role === 'user' ? 'User' : 'Gemini'}: ${m.content}`),
    ].filter(Boolean).join('\n\n');

    let summaryFocusInstruction = 'Provide a 2-3 sentence executive summary of the entry and reflections.';
    if (summaryType === 'key_themes') {
      summaryFocusInstruction = 'Focus the summary specifically on identifying and unpacking key themes, recurring thought patterns, and core motifs.';
    } else if (summaryType === 'action_items') {
      summaryFocusInstruction = 'Focus the summary on concrete, prioritized action items, decisions made, and clear next steps.';
    } else if (summaryType === 'emotional_arc') {
      summaryFocusInstruction = 'Focus the summary on the emotional trajectory, shifts in perspective, tensions explored, and emotional resolutions.';
    } else if (summaryType === 'creative_sparks') {
      summaryFocusInstruction = 'Focus the summary on creative possibilities, lateral ideas, novel analogies, and provocative insights.';
    } else if (summaryType === 'deep_takeaways') {
      summaryFocusInstruction = 'Focus the summary on deep philosophical principles, self-discoveries, and life lessons.';
    }

    const prompt = `Analyze the following user journal/reflection session and return a JSON object with:
1. "title": A concise, evocative title (3-7 words) summarizing the core theme.
2. "summary": ${summaryFocusInstruction}
3. "keyTakeaways": An array of 2-4 key takeaways or insights.
4. "actionItems": An array of 1-4 concrete actionable next steps or recommendations.
5. "keyThemes": An array of 2-4 central thematic topics explored.
6. "tags": An array of 2-5 relevant tags/topics (lowercase single or double words).
7. "sentiment": One of "Optimistic", "Reflective", "Challenged", "Energized", "Peaceful", "Determined", "Neutral".
8. "summaryType": "${summaryType}"

Journal Transcript:
${transcript}`;

    const { text, modelUsed } = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
      },
    });

    let parsedResult = {};
    try {
      parsedResult = JSON.parse(text);
    } catch {
      parsedResult = {
        title: 'Personal Reflection',
        summary: text.slice(0, 150),
        keyTakeaways: ['Reflected on current thoughts and goals'],
        actionItems: ['Review journal thoughts and reflect on next milestones'],
        keyThemes: ['Self-reflection', 'Growth'],
        tags: ['reflection', 'journal'],
        sentiment: 'Reflective',
        summaryType,
      };
    }

    res.json({
      analysis: parsedResult,
      modelUsed,
    });
  } catch (error: any) {
    console.error('[API /api/gemini/analyze-entry Error]:', error);
    res.status(500).json({
      error: error.message || 'Failed to analyze journal entry.',
    });
  }
});

// API: Specialized Custom Summary Generator
app.post('/api/gemini/summarize', async (req, res) => {
  try {
    const data = req.body && typeof req.body === 'object' ? req.body : {};
    const content = typeof data.content === 'string' ? data.content.trim() : '';
    const messages = Array.isArray(data.messages) ? data.messages : [];
    const summaryType = typeof data.summaryType === 'string' ? data.summaryType : 'concise_overview';

    if (!content && messages.length === 0) {
      return res.status(400).json({ error: 'Content or conversation messages are required to summarize.' });
    }

    const transcript = [
      content ? `Initial Entry:\n${content}` : '',
      ...messages.map((m: any) => `${m.role === 'user' ? 'User' : 'Gemini'}: ${m.content}`),
    ].filter(Boolean).join('\n\n');

    const summaryPrompts: Record<string, string> = {
      key_themes: `You are an expert thematic analyst. Extract and articulate the 3-5 primary themes, recurring motifs, and psychological or strategic patterns present in this journal entry. Provide a 2-3 paragraph breakdown with clear bold theme titles and bullet points.`,
      concise_overview: `You are an executive editor. Provide a clear, crisp, and beautifully structured 2-3 sentence overview that captures the essence of this journal reflection session without fluff.`,
      action_items: `You are a high-performance executive coach. Transform this reflection into a prioritized, bulleted list of 3-6 concrete action items with suggested next steps and potential obstacles.`,
      emotional_arc: `You are an empathetic emotional intelligence guide. Analyze the emotional arc and mindset shifts revealed in this journal session—highlighting beginning states, breakthrough insights, and concluding state of mind.`,
      creative_sparks: `You are a creative muse and innovator. Extract 4-6 expansive creative reframes, lateral possibilities, and inspiring thought experiments inspired by this journal session.`,
      deep_takeaways: `You are a philosophical mentor. Synthesize 3-5 enduring principles, core values, and life lessons distilled from this user's reflection.`,
    };

    const targetPrompt = summaryPrompts[summaryType] || summaryPrompts.concise_overview;

    const fullPrompt = `${targetPrompt}

Journal Entry Transcript:
${transcript}`;

    const { text, modelUsed } = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      systemInstruction: 'Format your response in clean, elegant Markdown. Be insightful, concise, and empowering.',
    });

    res.json({
      summary: text,
      summaryType,
      modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API /api/gemini/summarize Error]:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate tailored summary.',
    });
  }
});

// API: Aggregate Summary Across Multiple Journal Entries
app.post('/api/gemini/aggregate-summary', async (req, res) => {
  try {
    const data = req.body && typeof req.body === 'object' ? req.body : {};
    const entries = Array.isArray(data.entries) ? data.entries : [];

    if (entries.length === 0) {
      return res.status(400).json({ error: 'At least one entry is required.' });
    }

    const compiledText = entries
      .slice(0, 15)
      .map(
        (e: any, idx: number) =>
          `[Entry ${idx + 1} - ${e.date || 'Recent'}] (${e.mode || 'Reflection'}): ${e.title || 'Untitled'}\nSummary: ${e.summary || e.initialPrompt || ''}\nKey Takeaways: ${(e.keyTakeaways || []).join(', ')}`
      )
      .join('\n\n---\n\n');

    const prompt = `You are an insightful life coach synthesizing a user's recent private reflection history. Review these entries and provide an inspiring, high-level growth overview:
- Primary recurring themes and values
- Notable emotional arcs or shifts
- Key breakthroughs and patterns
- 2-3 forward-looking recommendations or prompts for future self-reflection.

Entries to synthesize:
${compiledText}`;

    const { text, modelUsed } = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: 'Provide a structured, inspiring, and deeply perceptive synthesis in clean Markdown format.',
    });

    res.json({
      synthesis: text,
      modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API /api/gemini/aggregate-summary Error]:', error);
    res.status(500).json({
      error: error.message || 'Failed to synthesize journal history.',
    });
  }
});

// Start Server and mount Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
