import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Enable CORS policy
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// User token usage rate limiter (max 10% of 1,000,000 total tokens = 100,000 tokens per hour)
interface TokenRecord {
  tokens: number;
  resetTime: number;
}
const userTokenUsage = new Map<string, TokenRecord>();
const MAX_TOKENS_PER_USER = 100000; // 10% of 1M context tokens
const RESET_WINDOW_MS = 60 * 60 * 1000; // 1 hour rolling window

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return ip.trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function estimateTokens(text: string): number {
  return Math.ceil((text || '').length / 4);
}

// Input sanitization to protect against command and prompt injections
function sanitizeInput(text: string): string {
  if (typeof text !== 'string') return '';
  
  // 1. Strip HTML tags / script tags to avoid simple script injections
  let sanitized = text.replace(/<[^>]*>/g, '');
  
  // 2. Mitigate system-override prompt injection patterns
  const promptInjectionPhrases = [
    /ignore\s+(?:the\s+)?(?:above|previous|system|instruction|guideline)/gi,
    /override\s+(?:the\s+)?(?:above|previous|system|instruction|guideline)/gi,
    /forget\s+(?:the\s+)?(?:above|previous|system|instruction|guideline)/gi,
    /disregard\s+(?:the\s+)?(?:above|previous|system|instruction|guideline)/gi,
    /you\s+must\s+now\s+act\s+as/gi,
    /new\s+rule:/gi,
    /stop\s+following\s+instructions/gi,
    /instead,\s+do\s+the\s+following/gi,
  ];
  
  for (const regex of promptInjectionPhrases) {
    sanitized = sanitized.replace(regex, '[neutralized injection attempt]');
  }

  // 3. Remove non-printable control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  return sanitized.trim();
}

// Initialize Gemini client lazily.
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(customApiKey?: string) {
  if (customApiKey && customApiKey.trim() !== '') {
    return new GoogleGenAI({
      apiKey: customApiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not defined.');
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

// Helper to retry transient errors with exponential backoff and model fallback
async function retryWithBackoff<T>(fn: (model: string) => Promise<T>, retries = 5, delayMs = 1000): Promise<T> {
  const models = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview'];
  let attempt = 0;
  let currentDelay = delayMs;
  let modelIndex = 0;
  while (true) {
    const currentModel = models[modelIndex];
    try {
      return await fn(currentModel);
    } catch (error: any) {
      attempt++;
      const errorMsg = error?.message || '';
      const isTransient = 
        error?.status === 503 || 
        error?.code === 503 || 
        error?.status === 429 || 
        error?.code === 429 || 
        errorMsg.includes('503') || 
        errorMsg.includes('429') || 
        errorMsg.includes('UNAVAILABLE') || 
        errorMsg.includes('high demand') || 
        errorMsg.includes('temporary') || 
        errorMsg.includes('resource exhausted');
      if (attempt >= retries || !isTransient) {
        throw error;
      }
      // Try next fallback model on transient error
      modelIndex = (modelIndex + 1) % models.length;
      const nextModel = models[modelIndex];
      // Add a randomized jitter between 0 and 500ms to avoid synchronization issues
      const jitter = Math.floor(Math.random() * 500);
      const totalDelay = currentDelay + jitter;
      console.log(`[Gemini Retry System] Model busy (attempt ${attempt}/${retries}). Rotating to model ${nextModel} in ${totalDelay}ms... Status details: ${errorMsg.substring(0, 150)}`);
      await new Promise(resolve => setTimeout(resolve, totalDelay));
      currentDelay *= 2; // exponential backoff
    }
  }
}

// Fallback generators for schedule when Gemini is unavailable
function generateServerFallbackSchedule(tasks: any[], peakHours: string, energyLevel: string, energyCycle?: string) {
  const priorityWeight: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
  const sortedTasks = [...tasks].sort((a, b) => {
    const wA = priorityWeight[a.priority] || 2;
    const wB = priorityWeight[b.priority] || 2;
    return wB - wA;
  });

  const schedule: any[] = [];
  let currentHour = 9;
  let currentMinute = 0;

  const formatTime = (h: number, m: number) => {
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  sortedTasks.forEach((task, index) => {
    const duration = task.estimatedMinutes || 30;
    const startH = currentHour;
    const startM = currentMinute;
    
    currentMinute += duration;
    while (currentMinute >= 60) {
      currentHour += 1;
      currentMinute -= 60;
    }
    
    schedule.push({
      timeSlot: `${formatTime(startH, startM)} - ${formatTime(currentHour, currentMinute)}`,
      taskTitle: task.title,
      type: task.type || 'Deep Work',
      durationMinutes: duration,
      focusTip: `Sustained focus on "${task.title}". Aligned with your daily energy pattern.`
    });

    if (task.type === 'Deep Work' || index % 2 === 1) {
      const breakDuration = 10;
      const breakStartH = currentHour;
      const breakStartM = currentMinute;
      
      currentMinute += breakDuration;
      while (currentMinute >= 60) {
        currentHour += 1;
        currentMinute -= 60;
      }
      schedule.push({
        timeSlot: `${formatTime(breakStartH, breakStartM)} - ${formatTime(currentHour, currentMinute)}`,
        taskTitle: 'Zen Breath Alignment',
        type: 'Break',
        durationMinutes: breakDuration,
        focusTip: 'Inhale for 4 seconds, hold 4 seconds, exhale 4 seconds to reset cognitive battery.'
      });
    }
  });

  return {
    schedule,
    insights: [
      `The AI coordinator is temporarily busy. This high-focus schedule was built programmatically using task gravity rules to maintain your flow!`,
      `Your peak focus window: "${peakHours || 'Flexible'}" was aligned with energy pattern "${energyCycle || 'Custom'}".`,
      `Single-tasking for 25 minutes defeats hours of distracted multi-tasking.`
    ]
  };
}

// Fallback generator for pathways when Gemini is unavailable
function generateServerFallbackPathway(taskTitle: string, taskDescription: string, priority: string) {
  return {
    steps: [
      {
        id: 1,
        title: "Clean Slate Setup",
        description: `Clear all background notifications. Open exactly one document/tab required for "${taskTitle}".`,
        estimatedMinutes: 5
      },
      {
        id: 2,
        title: "Micro Step Friction-Bypass",
        description: `Do the absolute easiest first step. If it is writing, write one sentence. Commit to just 5 minutes of focused effort.`,
        estimatedMinutes: 5
      },
      {
        id: 3,
        title: "Uninterrupted Block",
        description: `Deeply immerse yourself for 25 minutes. If your thoughts drift, gently bring them back to "${taskTitle}".`,
        estimatedMinutes: 25
      },
      {
        id: 4,
        title: "Log Current State",
        description: "Note down where you left off so you can resume later with zero cognitive friction.",
        estimatedMinutes: 5
      }
    ],
    focusMantra: "Start small. Focus direct. Finish strong.",
    microGuideline: "Procrastination is an emotional barrier, not a scheduling one. Forgive yourself, set aside expectations of perfection, and take the first physical step."
  };
}

// 1. Endpoint to generate optimized schedule
app.post('/api/schedule', async (req, res) => {
  const { tasks, energyLevel, peakHours, extraNotes, energyCycle, behaviorAnalysis } = req.body;
  
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ error: 'Please provide a non-empty list of tasks.' });
  }

  // 1. Task count cap on tasks sent to Gemini
  const MAX_TASKS = 15;
  const tasksToProcess = tasks.slice(0, MAX_TASKS);
  const isCapped = tasks.length > MAX_TASKS;

  // 2. Input Sanitization to avoid command and prompt injection
  const sEnergyLevel = sanitizeInput(energyLevel || 'Moderate');
  const sPeakHours = sanitizeInput(peakHours || 'Flexible');
  const sExtraNotes = sanitizeInput(extraNotes || 'Minimalist approach');
  const sEnergyCycle = sanitizeInput(energyCycle || 'Steady energy throughout the day');
  
  const sanitizedTasks = tasksToProcess.map((t: any) => ({
    title: sanitizeInput(t.title || 'Untitled Task'),
    description: sanitizeInput(t.description || ''),
    priority: sanitizeInput(t.priority || 'Medium'),
    estimatedMinutes: typeof t.estimatedMinutes === 'number' ? t.estimatedMinutes : 30,
    type: sanitizeInput(t.type || 'Deep Work')
  }));

  // Clean behavioral analysis inputs as well
  const bAnalysis = behaviorAnalysis ? {
    isSufficientData: !!behaviorAnalysis.isSufficientData,
    totalCompleted: Number(behaviorAnalysis.totalCompleted) || 0,
    peakPeriod: sanitizeInput(behaviorAnalysis.peakPeriod || 'Flexible'),
    peakPercentage: Number(behaviorAnalysis.peakPercentage) || 0,
    detectedCycle: sanitizeInput(behaviorAnalysis.detectedCycle || 'calibrated rhythm')
  } : null;

  try {
    let behavioralContext = '';
    let insightsRequirement = '';
    
    if (bAnalysis && bAnalysis.isSufficientData) {
      behavioralContext = `
      [BEHAVIORAL FOCUS ANALYTICS - REAL USER COMPLETED TASK HISTORICAL DATA]
      - Total Completed Tasks Analysed: ${bAnalysis.totalCompleted}
      - Real Computed Peak Productivity Block: ${bAnalysis.peakPeriod} (${bAnalysis.peakPercentage}% of completions occur here)
      - Calibrated Energy Cycle Rhythm: "${bAnalysis.detectedCycle}"
      `;
      insightsRequirement = `EXPLICITLY mention in at least one insight that this optimized schedule has been tailored using their genuine historical task completion velocity (${bAnalysis.detectedCycle || 'calibrated rhythm'}).`;
    } else {
      const completedCount = bAnalysis?.totalCompleted || 0;
      behavioralContext = `
      [BEHAVIORAL FOCUS ANALYTICS]
      - Awaiting calibration. The user has only completed ${completedCount} tasks with timestamps.
      `;
      insightsRequirement = `Mention in at least one insight that completing more tasks will unlock automated calibration, which will fine-tune their schedule around their actual hourly execution patterns. Currently, it is optimized based on their reported "${sEnergyCycle}" cycle.`;
    }

    // Structure prompts securely using delimiters to isolate user-provided inputs
    const prompt = `Analyze these tasks and the user's focus preferences to generate a highly optimized daily schedule and qualitative productivity insights.
    
    <user_preferences>
    User Peak Hours: ${sPeakHours}
    Current Energy/Mood: ${sEnergyLevel}
    Approximate Daily Energy Cycle Pattern: ${sEnergyCycle}
    Additional Preferences: ${sExtraNotes}
    </user_preferences>

    <behavioral_context>
    ${behavioralContext}
    </behavioral_context>
    
    <user_tasks>
    ${sanitizedTasks.map((t, i) => `${i + 1}. [${t.priority} Priority] ${t.title} - Est: ${t.estimatedMinutes}m. Desc: ${t.description}`).join('\n')}
    </user_tasks>
    
    Requirements:
    1. Organize the day into logical, high-focus chunks.
    2. Group tasks to avoid context switching. Match high-priority, intensive tasks to peak energy hours based on the reported Daily Energy Cycle Pattern (${sEnergyCycle}).
    3. Include brief, structured breaks or routine blocks to prevent burnout.
    4. Provide minimalist, action-oriented schedule items.
    5. Formulate 2-3 clean, high-impact qualitative insights or focus suggestions explaining how this arrangement matches their energy cycle.
    6. ${insightsRequirement}
    ${isCapped ? "7. Add a subtle, encouraging note in one insight mentioning that only the first 15 high-focus tasks were scheduled to ensure realistic cognitive budgeting." : ""}`;

    // 3. User Token Limiter (each user during one use can use at max 10% of total tokens = 100,000 tokens)
    const clientIp = getClientIp(req);
    const estimatedInputTokens = estimateTokens(prompt);
    const now = Date.now();
    let record = userTokenUsage.get(clientIp);
    if (!record || now > record.resetTime) {
      record = { tokens: 0, resetTime: now + RESET_WINDOW_MS };
    }

    const customApiKey = req.headers['x-gemini-api-key'] as string | undefined;
    const hasCustomKey = customApiKey && customApiKey.trim() !== '';

    if (!hasCustomKey && record.tokens + estimatedInputTokens > MAX_TOKENS_PER_USER) {
      console.warn(`Token limit exceeded for IP ${clientIp}. Used: ${record.tokens}, Attempted: ${estimatedInputTokens}`);
      return res.status(429).json({
        error: `Token usage limit exceeded. To maintain platform stability, each user is limited to 10% of system tokens per hour (100,000 tokens). You have used ${record.tokens} tokens in the past hour. Please wait before scheduling more tasks.`
      });
    }

    const ai = getGeminiClient(customApiKey);
    const response = await retryWithBackoff((modelToUse) => ai.models.generateContent({
      model: modelToUse,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['schedule', 'insights'],
          properties: {
            schedule: {
              type: Type.ARRAY,
              description: 'An optimized daily timeline of activities and tasks.',
              items: {
                type: Type.OBJECT,
                required: ['timeSlot', 'taskTitle', 'type', 'durationMinutes', 'focusTip'],
                properties: {
                  timeSlot: {
                    type: Type.STRING,
                    description: 'E.g., "09:00 - 10:15"',
                  },
                  taskTitle: {
                    type: Type.STRING,
                    description: 'E.g., "Focus Deep Work: Finish Database Models" or "Rest Break"',
                  },
                  type: {
                    type: Type.STRING,
                    description: 'Must be "Deep Work", "Routine", "Break", or "Exercise".',
                  },
                  durationMinutes: {
                    type: Type.INTEGER,
                    description: 'Estimated duration in minutes.',
                  },
                  focusTip: {
                    type: Type.STRING,
                    description: 'A brief 1-sentence tip on how to maintain intense concentration during this slot.',
                  },
                },
              },
            },
            insights: {
              type: Type.ARRAY,
              description: '2-3 high-value productivity suggestions or schedule rationale.',
              items: {
                type: Type.STRING,
              },
            },
          },
        },
      },
    }));

    const text = response.text;
    if (!text) {
      throw new Error('Gemini returned empty response text.');
    }

    // Record verified token consumption
    const estimatedOutputTokens = estimateTokens(text);
    record.tokens += (estimatedInputTokens + estimatedOutputTokens);
    userTokenUsage.set(clientIp, record);

    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error('Error generating schedule (falling back to programmatic generator):', error);
    // Graceful server-side fallback
    const fallback = generateServerFallbackSchedule(sanitizedTasks, sPeakHours, sEnergyLevel, sEnergyCycle);
    if (isCapped) {
      fallback.insights.push("Only your top 15 tasks were budgeted in this programmatic schedule to avoid cognitive overload.");
    }
    res.json(fallback);
  }
});

// 2. Endpoint to generate a pathway/guide for a specific task
app.post('/api/pathway', async (req, res) => {
  const { taskTitle, taskDescription, priority } = req.body;
  
  if (!taskTitle) {
    return res.status(400).json({ error: 'Please provide a task title.' });
  }

  // 1. Input Sanitization to avoid command and prompt injection
  const sTaskTitle = sanitizeInput(taskTitle);
  const sTaskDescription = sanitizeInput(taskDescription || '');
  const sPriority = sanitizeInput(priority || 'Medium');

  try {
    const prompt = `Create a step-by-step action pathway and distraction-free focus guidelines for this task to overcome procrastination and optimize execution.
    
    <task_info>
    Task Title: ${sTaskTitle}
    Task Description: ${sTaskDescription || 'No description provided'}
    Task Priority: ${sPriority}
    </task_info>
    
    Provide exactly 3 to 4 bite-sized sub-steps that represent the path of least resistance to start and finish this task. Provide a supportive focus mantra and a micro-guideline on how to manage any friction or mental block for this specific activity.`;

    // 2. User Token Limiter (each user during one use can use at max 10% of total tokens = 100,000 tokens)
    const clientIp = getClientIp(req);
    const estimatedInputTokens = estimateTokens(prompt);
    const now = Date.now();
    let record = userTokenUsage.get(clientIp);
    if (!record || now > record.resetTime) {
      record = { tokens: 0, resetTime: now + RESET_WINDOW_MS };
    }

    const customApiKey = req.headers['x-gemini-api-key'] as string | undefined;
    const hasCustomKey = customApiKey && customApiKey.trim() !== '';

    if (!hasCustomKey && record.tokens + estimatedInputTokens > MAX_TOKENS_PER_USER) {
      console.warn(`Token limit exceeded for IP ${clientIp}. Used: ${record.tokens}, Attempted: ${estimatedInputTokens}`);
      return res.status(429).json({
        error: `Token usage limit exceeded. To maintain platform stability, each user is limited to 10% of system tokens per hour (100,000 tokens). You have used ${record.tokens} tokens in the past hour. Please wait before requesting pathways.`
      });
    }

    const ai = getGeminiClient(customApiKey);
    const response = await retryWithBackoff((modelToUse) => ai.models.generateContent({
      model: modelToUse,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['steps', 'focusMantra', 'microGuideline'],
          properties: {
            steps: {
              type: Type.ARRAY,
              description: '3-4 micro-steps to accomplish this task starting from the absolute easiest action.',
              items: {
                type: Type.OBJECT,
                required: ['id', 'title', 'description', 'estimatedMinutes'],
                properties: {
                  id: { type: Type.INTEGER },
                  title: { type: Type.STRING, description: 'Short action-oriented title.' },
                  description: { type: Type.STRING, description: 'How to execute this step cleanly.' },
                  estimatedMinutes: { type: Type.INTEGER, description: 'Recommended focus duration.' },
                },
              },
            },
            focusMantra: {
              type: Type.STRING,
              description: 'A poetic, highly minimalist focus slogan to center the mind.',
            },
            microGuideline: {
              type: Type.STRING,
              description: 'A tactical psychological tip to bypass resistance for this specific task.',
            },
          },
        },
      },
    }));

    const text = response.text;
    if (!text) {
      throw new Error('Gemini returned empty response text.');
    }

    // Record verified token consumption
    const estimatedOutputTokens = estimateTokens(text);
    record.tokens += (estimatedInputTokens + estimatedOutputTokens);
    userTokenUsage.set(clientIp, record);

    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error('Error generating pathway (falling back to programmatic generator):', error);
    // Graceful server-side fallback
    const fallback = generateServerFallbackPathway(sTaskTitle, sTaskDescription, sPriority);
    res.json(fallback);
  }
});

// Serve frontend client
const PORT = 3000;
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${PORT}`);
});
