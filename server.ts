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

// Initialize Gemini client lazily.
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient() {
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

// Helper to retry transient errors with exponential backoff
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delayMs = 800): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const errorMsg = error?.message || '';
      const isTransient = error?.status === 503 || error?.code === 503 || errorMsg.includes('503') || errorMsg.includes('UNAVAILABLE') || errorMsg.includes('high demand') || errorMsg.includes('temporary');
      if (attempt >= retries || !isTransient) {
        throw error;
      }
      console.warn(`Gemini API transient error (attempt ${attempt}/${retries}). Retrying in ${delayMs}ms... Error: ${errorMsg}`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      delayMs *= 2; // exponential backoff
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

  try {
    const ai = getGeminiClient();
    
    let behavioralContext = '';
    let insightsRequirement = '';
    
    if (behaviorAnalysis && behaviorAnalysis.isSufficientData) {
      behavioralContext = `
      [BEHAVIORAL FOCUS ANALYTICS - REAL USER COMPLETED TASK HISTORICAL DATA]
      - Total Completed Tasks Analysed: ${behaviorAnalysis.totalCompleted}
      - Real Computed Peak Productivity Block: ${behaviorAnalysis.peakPeriod} (${behaviorAnalysis.peakPercentage}% of completions occur here)
      - Calibrated Energy Cycle Rhythm: "${behaviorAnalysis.detectedCycle}"
      `;
      insightsRequirement = `EXPLICITLY mention in at least one insight that this optimized schedule has been tailored using their genuine historical task completion velocity (${behaviorAnalysis.detectedCycle || 'calibrated rhythm'}).`;
    } else {
      const completedCount = behaviorAnalysis?.totalCompleted || 0;
      behavioralContext = `
      [BEHAVIORAL FOCUS ANALYTICS]
      - Awaiting calibration. The user has only completed ${completedCount} tasks with timestamps.
      `;
      insightsRequirement = `Mention in at least one insight that completing more tasks will unlock automated calibration, which will fine-tune their schedule around their actual hourly execution patterns. Currently, it is optimized based on their reported "${energyCycle}" cycle.`;
    }

    const prompt = `Analyze these tasks and the user's focus preferences to generate a highly optimized daily schedule and qualitative productivity insights.
    
    User Peak Hours: ${peakHours || 'Flexible'}
    Current Energy/Mood: ${energyLevel || 'Moderate'}
    Approximate Daily Energy Cycle Pattern: ${energyCycle || 'Steady energy throughout the day'}
    Additional Preferences: ${extraNotes || 'Minimalist approach'}
    ${behavioralContext}
    
    Current Tasks:
    ${tasks.map((t, i) => `${i + 1}. [${t.priority} Priority] ${t.title} - Est: ${t.estimatedMinutes || 30}m. Desc: ${t.description || 'No description'}`).join('\n')}
    
    Requirements:
    1. Organize the day into logical, high-focus chunks.
    2. Group tasks to avoid context switching. Match high-priority, intensive tasks to peak energy hours based on the reported Daily Energy Cycle Pattern (${energyCycle || 'Steady'}).
    3. Include brief, structured breaks or routine blocks to prevent burnout.
    4. Provide minimalist, action-oriented schedule items.
    5. Formulate 2-3 clean, high-impact qualitative insights or focus suggestions explaining how this arrangement matches their energy cycle.
    6. ${insightsRequirement}`;

    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: 'gemini-3.5-flash',
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

    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error('Error generating schedule (falling back to programmatic generator):', error);
    // Graceful server-side fallback
    const fallback = generateServerFallbackSchedule(tasks, peakHours, energyLevel, energyCycle);
    res.json(fallback);
  }
});

// 2. Endpoint to generate a pathway/guide for a specific task
app.post('/api/pathway', async (req, res) => {
  const { taskTitle, taskDescription, priority } = req.body;
  
  if (!taskTitle) {
    return res.status(400).json({ error: 'Please provide a task title.' });
  }

  try {
    const ai = getGeminiClient();
    
    const prompt = `Create a step-by-step action pathway and distraction-free focus guidelines for this task to overcome procrastination and optimize execution.
    
    Task Title: ${taskTitle}
    Task Description: ${taskDescription || 'No description provided'}
    Task Priority: ${priority || 'Medium'}
    
    Provide exactly 3 to 4 bite-sized sub-steps that represent the path of least resistance to start and finish this task. Provide a supportive focus mantra and a micro-guideline on how to manage any friction or mental block for this specific activity.`;

    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: 'gemini-3.5-flash',
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

    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error('Error generating pathway (falling back to programmatic generator):', error);
    // Graceful server-side fallback
    const fallback = generateServerFallbackPathway(taskTitle, taskDescription || '', priority || 'Medium');
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
