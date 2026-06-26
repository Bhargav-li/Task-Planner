import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Check, 
  Clock, 
  Zap, 
  Volume2, 
  VolumeX, 
  Eye, 
  EyeOff, 
  Wifi, 
  WifiOff, 
  Flame, 
  ArrowRight, 
  X, 
  AlertCircle,
  HelpCircle,
  Target,
  Calendar,
  Layers,
  Smile,
  Moon,
  Sun,
  CloudSun,
  CloudMoon,
  RefreshCw,
  Compass,
  Briefcase,
  Activity,
  CheckCircle,
  BarChart2,
  Settings,
  Bell
} from 'lucide-react';

// Data Interfaces
interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  estimatedMinutes: number;
  type: 'Deep Work' | 'Routine' | 'Break' | 'Exercise';
  isLongTerm: boolean;
  isCompleted: boolean;
  createdAt: number;
  completedAt?: number;
  targetDay?: string;
  targetTime?: string;
  targetTimestamp?: number;
}

interface TimelineItem {
  timeSlot: string;
  taskTitle: string;
  type: string;
  durationMinutes: number;
  focusTip: string;
  isDone?: boolean;
}

interface Pathway {
  steps: {
    id: number;
    title: string;
    description: string;
    estimatedMinutes: number;
  }[];
  focusMantra: string;
  microGuideline: string;
}

// Deadline calculation helper functions
function calculateTargetTimestamp(targetDay: string, targetTime: string): number {
  const now = new Date();
  let targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  if (targetDay === 'Tomorrow') {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (targetDay.startsWith('In ')) {
    const match = targetDay.match(/\d+/);
    if (match) {
      const days = parseInt(match[0]);
      targetDate.setDate(targetDate.getDate() + days);
    }
  }
  
  const [hours, minutes] = (targetTime || '12:00').split(':').map(Number);
  targetDate.setHours(hours, minutes, 0, 0);
  
  return targetDate.getTime();
}

function formatTimeLeft(targetTimestamp?: number): { text: string; isOverdue: boolean } {
  if (!targetTimestamp) return { text: '', isOverdue: false };
  const now = Date.now();
  const diff = targetTimestamp - now;
  
  if (diff <= 0) {
    const overdueMins = Math.floor(Math.abs(diff) / 60000);
    if (overdueMins < 60) return { text: `Overdue by ${overdueMins}m`, isOverdue: true };
    const overdueHours = Math.floor(overdueMins / 60);
    if (overdueHours < 24) return { text: `Overdue by ${overdueHours}h`, isOverdue: true };
    const overdueDays = Math.floor(overdueHours / 24);
    return { text: `Overdue by ${overdueDays}d`, isOverdue: true };
  }
  
  const totalMins = Math.floor(diff / 60000);
  if (totalMins < 60) {
    return { text: `${totalMins}m left`, isOverdue: false };
  }
  const totalHours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (totalHours < 24) {
    return { text: `${totalHours}h ${mins}m left`, isOverdue: false };
  }
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return { text: `${days}d ${hours}h left`, isOverdue: false };
}

interface CompletionBehaviorAnalysis {
  totalCompleted: number;
  morningCount: number;
  afternoonCount: number;
  eveningCount: number;
  nightCount: number;
  peakPeriod: string;
  peakPercentage: number;
  detectedCycle: string;
  suggestedScheduleAlignment: string;
  isSufficientData: boolean;
}

function analyzeUserBehavior(completedTasks: Task[]): CompletionBehaviorAnalysis {
  const validCompletions = completedTasks.filter(t => t.completedAt);
  const total = validCompletions.length;
  
  let morning = 0;
  let afternoon = 0;
  let evening = 0;
  let night = 0;
  
  validCompletions.forEach(t => {
    const d = new Date(t.completedAt!);
    const hr = d.getHours();
    if (hr >= 6 && hr < 12) morning++;
    else if (hr >= 12 && hr < 17) afternoon++;
    else if (hr >= 17 && hr < 21) evening++;
    else night++;
  });
  
  // Find peak period
  const periods = [
    { name: 'Morning (6AM - 12PM)', count: morning, type: 'Early Bird Peak' },
    { name: 'Afternoon (12PM - 5PM)', count: afternoon, type: 'Midday Focused' },
    { name: 'Evening (5PM - 9PM)', count: evening, type: 'Twilight Flow' },
    { name: 'Night (9PM - 6AM)', count: night, type: 'Night Owl Boost' }
  ];
  
  const peak = periods.reduce((max, p) => p.count > max.count ? p : max, periods[0]);
  const peakPct = total > 0 ? Math.round((peak.count / total) * 100) : 0;
  
  // Determine energy cycle
  let detectedCycle = "Balanced Steady Flow";
  let suggestedScheduleAlignment = "Steady energy throughout the day";
  
  if (total >= 3) {
    if (peak.count > 0) {
      if (peak.name.includes('Morning')) {
        detectedCycle = "🌅 Early Bird (High Morning, Post-Lunch Slump)";
        suggestedScheduleAlignment = "Group high-focus items in the morning; do routine administration and breaks in the afternoon.";
      } else if (peak.name.includes('Afternoon')) {
        detectedCycle = "☀️ Afternoon Focus (Late Peak flow)";
        suggestedScheduleAlignment = "Start slowly with routines in the morning, then group your deepest work blocks from 1 PM to 5 PM.";
      } else if (peak.name.includes('Evening')) {
        detectedCycle = "🌆 Twilight Surge (Late Day Momentum)";
        suggestedScheduleAlignment = "Focus on administrative or easy routine work during the day, reserving core deep work for late afternoon and evening.";
      } else if (peak.name.includes('Night')) {
        detectedCycle = "🦉 Night Owl Peak (Nocturnal Genius Mode)";
        suggestedScheduleAlignment = "Use silent nocturnal hours for highly intensive concentration; focus on maintenance blocks during the day.";
      }
    }
  } else {
    detectedCycle = "Awaiting Pattern Calibration...";
    suggestedScheduleAlignment = "Once you complete 3 tasks with confirmed timestamps, the engine will compute your peak hourly velocity!";
  }
  
  return {
    totalCompleted: total,
    morningCount: morning,
    afternoonCount: afternoon,
    eveningCount: evening,
    nightCount: night,
    peakPeriod: total > 0 && peak.count > 0 ? peak.name : 'No completions yet',
    peakPercentage: peakPct,
    detectedCycle,
    suggestedScheduleAlignment,
    isSufficientData: total >= 3
  };
}

// Sound Synthesis using Web Audio API (Calming Zen Sounds)
function playSingingBowl() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    const freqs = [180, 270, 360, 450, 540];
    const gains = [0.35, 0.2, 0.12, 0.06, 0.03];
    
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.frequency.setValueAtTime(f, now);
      
      if (i === 0) {
        // Subtle frequency modulation for the primary tone (gives that singing vibrato)
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.setValueAtTime(1.5, now);
        lfoGain.gain.setValueAtTime(1.0, now);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(now);
      }
      
      gainNode.gain.setValueAtTime(gains[i], now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 4.5);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 4.6);
    });
  } catch (err) {
    console.warn("Audio Context not supported or allowed by user interaction yet:", err);
  }
}

// Continuous Ambient Pink Noise (simulates soothing rain/waves)
let ambientSource: AudioBufferSourceNode | null = null;
let audioCtx: AudioContext | null = null;

function startAmbientRain() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    audioCtx = new AudioContext();
    
    const bufferSize = 4 * audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    // Pink noise formula (approximate)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.10; // scale volume
      b6 = white * 0.115926;
    }
    
    ambientSource = audioCtx.createBufferSource();
    ambientSource.buffer = noiseBuffer;
    ambientSource.loop = true;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, audioCtx.currentTime); // Warm lowpass filter
    
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    
    ambientSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    ambientSource.start();
  } catch (err) {
    console.warn("Could not start ambient rain:", err);
  }
}

function stopAmbientRain() {
  try {
    if (ambientSource) {
      ambientSource.stop();
      ambientSource.disconnect();
      ambientSource = null;
    }
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }
  } catch (err) {
    console.warn("Could not stop ambient rain:", err);
  }
}

// Fallback logic for when user is offline or API key is not present
function generateLocalSchedule(tasks: Task[], peakHours: string, energyLevel: string, energyCycle?: string): { schedule: TimelineItem[], insights: string[] } {
  const activeTasks = tasks.filter(t => !t.isCompleted);
  const sorted = [...activeTasks].sort((a, b) => {
    const priorityWeight = { High: 3, Medium: 2, Low: 1 };
    return priorityWeight[b.priority] - priorityWeight[a.priority];
  });

  const schedule: TimelineItem[] = [];
  let currentHour = 9;
  let currentMinute = 0;

  const formatTime = (h: number, m: number) => {
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  sorted.forEach((task, index) => {
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
      type: task.type,
      durationMinutes: duration,
      focusTip: `[Local Priority Rule] Focus entirely on "${task.title}". Keep notifications off.`
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
        taskTitle: 'Offline Rest & Refocus',
        type: 'Break',
        durationMinutes: breakDuration,
        focusTip: 'Gently breathe, close your eyes, and look away from screen for 10 minutes.'
      });
    }
  });

  return {
    schedule,
    insights: [
      "No active network connection detected. A local priority schedule was successfully compiled based on task gravity.",
      `Optimized around peak window: "${peakHours || 'Flexible'}", energy level: "${energyLevel || 'Balanced'}", cycle: "${energyCycle || 'Standard'}". Re-connect online to unlock Gemini analysis!`
    ]
  };
}

function generateLocalPathway(taskTitle: string, priority: string): Pathway {
  return {
    steps: [
      {
        id: 1,
        title: "Isolate Environment",
        description: "Turn off all immediate visual and audio notifications. Close irrelevant web tabs.",
        estimatedMinutes: 5
      },
      {
        id: 2,
        title: "The 5-Minute Entryway",
        description: `Commit to typing or researching something small for "${taskTitle}" for just 5 minutes.`,
        estimatedMinutes: 5
      },
      {
        id: 3,
        title: "Deep Execution",
        description: "Execute the core elements of the task using the Pomodoro/Focus timer. Allow zero interruptions.",
        estimatedMinutes: 25
      }
    ],
    focusMantra: "Deep quiet. Absolute direct focus.",
    microGuideline: `[Offline Local Pathway] High-friction starts require low-stakes actions. Start immediately, do not wait for perfection.`
  };
}

export default function App() {
  // Offline State Tracking
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Tasks State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTab, setTaskTab] = useState<'Daily' | 'LongTerm'>('Daily');
  
  // Task Inputs
  const [inputTitle, setInputTitle] = useState('');
  const [inputDesc, setInputDesc] = useState('');
  const [inputPriority, setInputPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [inputDuration, setInputDuration] = useState<number>(30);
  const [inputType, setInputType] = useState<'Deep Work' | 'Routine' | 'Break' | 'Exercise'>('Deep Work');

  // Focus Timer States
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerPreset, setTimerPreset] = useState(25); // 25, 50, 15
  const [isMuted, setIsMuted] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [selectedFocusTask, setSelectedFocusTask] = useState<Task | null>(null);

  // Gemini & Scheduling States
  const [energyLevel, setEnergyLevel] = useState<string>('Moderate');
  const [peakHours, setPeakHours] = useState<string>('Morning (8AM - 12PM)');
  const [extraNotes, setExtraNotes] = useState<string>('');
  const [energyCycle, setEnergyCycle] = useState<string>('Morning peak, afternoon slump, evening boost');
  const [aiSchedule, setAiSchedule] = useState<TimelineItem[]>([]);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);

  // Deadline & Target States
  const [settingDeadlineTask, setSettingDeadlineTask] = useState<Task | null>(null);
  const [deadlineDay, setDeadlineDay] = useState<string>('Today');
  const [deadlineTime, setDeadlineTime] = useState<string>('17:00');

  // Task Completion Timing Report States
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [completionOption, setCompletionOption] = useState<'now' | 'before'>('now');
  const [completionDay, setCompletionDay] = useState<string>('Today');
  const [completionTime, setCompletionTime] = useState<string>('12:00');

  // Active Pathway Drawer States
  const [activePathway, setActivePathway] = useState<Pathway | null>(null);
  const [pathwayTask, setPathwayTask] = useState<Task | null>(null);
  const [isGeneratingPathway, setIsGeneratingPathway] = useState(false);
  const [pathwayError, setPathwayError] = useState<string | null>(null);

  // Statistics & History State
  const [streak, setStreak] = useState(0);
  const [totalFocusMinutes, setTotalFocusMinutes] = useState(0);
  const [completedTodayCount, setCompletedTodayCount] = useState(0);

  // Dark Mode and Weather Sync States
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('focus_dark_mode');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [weatherThemeSync, setWeatherThemeSync] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('focus_weather_theme_sync');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [weatherData, setWeatherData] = useState<{
    city: string;
    temp: number;
    isDay: boolean;
    condition: string;
    sunrise: string;
    sunset: string;
    fetchedAt: number;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('focus_weather_data');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // WMO code helper for human-friendly conditions
  const getWMOCondition = (code: number): string => {
    if (code === 0) return 'Clear Sky';
    if (code >= 1 && code <= 3) return 'Partly Cloudy';
    if (code === 45 || code === 48) return 'Foggy';
    if (code >= 51 && code <= 55) return 'Light Drizzle';
    if (code >= 61 && code <= 65) return 'Rainy';
    if (code >= 71 && code <= 75) return 'Snowy';
    if (code >= 80 && code <= 82) return 'Rain Showers';
    if (code >= 95 && code <= 99) return 'Thunderstorm';
    return 'Overcast';
  };

  // Weather syncing logic
  const fetchWeatherAndSync = async (forceSync = false) => {
    if (!navigator.onLine) {
      const hours = new Date().getHours();
      const isLocalNight = hours < 6 || hours >= 19;
      if (weatherThemeSync || forceSync) {
        setIsDarkMode(isLocalNight);
      }
      setWeatherError('Offline: Fallback to device hour.');
      return;
    }

    setIsFetchingWeather(true);
    setWeatherError(null);

    const performFetch = async (lat: number, lon: number, cityName: string) => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=sunrise,sunset&timezone=auto`
        );
        if (!response.ok) throw new Error('Weather forecast fetch failure');
        const data = await response.json();
        const current = data.current_weather;
        const daily = data.daily;

        const isDay = current.is_day === 1;
        const isNight = !isDay;

        let sunriseStr = '--:--';
        let sunsetStr = '--:--';
        if (daily && daily.sunrise && daily.sunrise[0]) {
          sunriseStr = new Date(daily.sunrise[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        if (daily && daily.sunset && daily.sunset[0]) {
          sunsetStr = new Date(daily.sunset[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        const newWeatherData = {
          city: cityName,
          temp: Math.round(current.temperature),
          isDay: isDay,
          condition: getWMOCondition(current.weathercode),
          sunrise: sunriseStr,
          sunset: sunsetStr,
          fetchedAt: Date.now()
        };

        setWeatherData(newWeatherData);
        localStorage.setItem('focus_weather_data', JSON.stringify(newWeatherData));

        if (weatherThemeSync || forceSync) {
          setIsDarkMode(isNight);
        }
      } catch (err) {
        console.warn('Error fetching weather data, using hour fallback:', err);
        const hours = new Date().getHours();
        const isLocalNight = hours < 6 || hours >= 19;
        if (weatherThemeSync || forceSync) {
          setIsDarkMode(isLocalNight);
        }
        setWeatherError('Weather details unavailable. Using system hour fallback.');
      }
    };

    // Stage 1: Try browser geolocation first (with 6s timeout)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          await performFetch(lat, lon, 'Local Space');
          setIsFetchingWeather(false);
        },
        async (err) => {
          console.warn('Geolocation failed or denied, trying IP fallback:', err);
          // Stage 2: IP-based location fallback
          try {
            const ipResponse = await fetch('https://ipapi.co/json/');
            if (!ipResponse.ok) throw new Error('IP lookup failed');
            const ipData = await ipResponse.json();
            if (ipData.latitude && ipData.longitude) {
              const cityLabel = ipData.city ? `${ipData.city}, ${ipData.country_code}` : 'Approximate Area';
              await performFetch(ipData.latitude, ipData.longitude, cityLabel);
            } else {
              throw new Error('Coordinates absent');
            }
          } catch (ipErr) {
            console.warn('IP lookup fallback failed, using device clock:', ipErr);
            // Stage 3: Device hour fallback
            const hours = new Date().getHours();
            const isLocalNight = hours < 6 || hours >= 19;
            if (weatherThemeSync || forceSync) {
              setIsDarkMode(isLocalNight);
            }
            setWeatherError('Permission denied. Using system device hours.');
          }
          setIsFetchingWeather(false);
        },
        { timeout: 6000 }
      );
    } else {
      // Stage 2: IP-based location fallback direct
      try {
        const ipResponse = await fetch('https://ipapi.co/json/');
        if (!ipResponse.ok) throw new Error('IP lookup failed');
        const ipData = await ipResponse.json();
        if (ipData.latitude && ipData.longitude) {
          const cityLabel = ipData.city ? `${ipData.city}, ${ipData.country_code}` : 'Approximate Area';
          await performFetch(ipData.latitude, ipData.longitude, cityLabel);
        } else {
          throw new Error('No coordinates');
        }
      } catch (ipErr) {
        const hours = new Date().getHours();
        const isLocalNight = hours < 6 || hours >= 19;
        if (weatherThemeSync || forceSync) {
          setIsDarkMode(isLocalNight);
        }
        setWeatherError('Geolocation unsupported. Using system device hours.');
      }
      setIsFetchingWeather(false);
    }
  };

  // Toggle dark mode classes on html
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('focus_dark_mode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Handle weather sync toggle trigger and periodic fetch
  useEffect(() => {
    if (weatherThemeSync) {
      fetchWeatherAndSync();
      const interval = setInterval(() => {
        fetchWeatherAndSync();
      }, 10 * 60 * 1000);
      return () => clearInterval(interval);
    }
    localStorage.setItem('focus_weather_theme_sync', JSON.stringify(weatherThemeSync));
  }, [weatherThemeSync]);


  // Continuous Work & Notifications Settings States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [enableWorkNotifications, setEnableWorkNotifications] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('focus_enable_work_notifications');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [continuousWorkLimit, setContinuousWorkLimit] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('focus_continuous_work_limit');
      return saved ? Number(saved) : 50;
    } catch {
      return 50;
    }
  });
  const [continuousWorkSeconds, setContinuousWorkSeconds] = useState<number>(0);
  const [showWorkBreakAlert, setShowWorkBreakAlert] = useState(false);

  // Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Refs for audio and timers
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Listen to network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync Clock and dynamically handle overnight date changes
  const lastDateStrRef = useRef(new Date().toDateString());
  useEffect(() => {
    const clockInterval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      const todayStr = now.toDateString();
      if (todayStr !== lastDateStrRef.current) {
        lastDateStrRef.current = todayStr;
        // Day changed! Reset completed counts and daily tasks
        setTasks(prevTasks => {
          let tasksChanged = false;
          const updated = prevTasks.map(t => {
            if (!t.isLongTerm && t.isCompleted && t.completedAt) {
              const completedDateString = new Date(t.completedAt).toDateString();
              if (completedDateString !== todayStr) {
                tasksChanged = true;
                return {
                  ...t,
                  isCompleted: false,
                  completedAt: undefined
                };
              }
            }
            return t;
          });
          if (tasksChanged) {
            try {
              localStorage.setItem('focus_tasks', JSON.stringify(updated));
            } catch (err) {
              console.warn("Could not save to localStorage:", err);
            }
          }
          return updated;
        });
        
        setCompletedTodayCount(0);
        localStorage.setItem('focus_completed_today', '0');
        
        setStreak(0);
        localStorage.setItem('focus_streak', '0');
      }
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Load from LocalStorage and perform initial day reset if loading on a new day
  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem('focus_tasks');
      let loadedTasks: Task[] = [];
      let tasksChanged = false;
      const todayString = new Date().toDateString();

      if (savedTasks) {
        loadedTasks = JSON.parse(savedTasks);
        
        // Reset "Daily" tasks completed on a previous day
        loadedTasks = loadedTasks.map(t => {
          if (!t.isLongTerm && t.isCompleted && t.completedAt) {
            const completedDateString = new Date(t.completedAt).toDateString();
            if (completedDateString !== todayString) {
              tasksChanged = true;
              return {
                ...t,
                isCompleted: false,
                completedAt: undefined
              };
            }
          }
          return t;
        });

        setTasks(loadedTasks);
        if (tasksChanged) {
          localStorage.setItem('focus_tasks', JSON.stringify(loadedTasks));
        }
      }

      const savedSchedule = localStorage.getItem('focus_ai_schedule');
      if (savedSchedule) setAiSchedule(JSON.parse(savedSchedule));

      const savedInsights = localStorage.getItem('focus_ai_insights');
      if (savedInsights) setAiInsights(JSON.parse(savedInsights));

      const savedStreak = localStorage.getItem('focus_streak');
      if (savedStreak) setStreak(parseInt(savedStreak) || 0);

      const savedFocusMins = localStorage.getItem('focus_total_minutes');
      if (savedFocusMins) setTotalFocusMinutes(parseInt(savedFocusMins) || 0);

      // Dynamically calculate "Done Today" to ensure correctness across days
      const currentCompleted = loadedTasks.filter(
        t => t.isCompleted && t.completedAt && new Date(t.completedAt).toDateString() === todayString
      ).length;
      setCompletedTodayCount(currentCompleted);
      localStorage.setItem('focus_completed_today', String(currentCompleted));
    } catch (err) {
      console.warn("Could not load from localStorage:", err);
    }
  }, []);

  // Save changes to LocalStorage
  const saveTasksToLocal = (newTasks: Task[]) => {
    setTasks(newTasks);
    try {
      localStorage.setItem('focus_tasks', JSON.stringify(newTasks));
    } catch (err) {
      console.warn("Could not save to localStorage:", err);
    }
  };

  // Save notification settings to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('focus_enable_work_notifications', JSON.stringify(enableWorkNotifications));
    } catch (err) {
      console.warn("Could not save to localStorage:", err);
    }
  }, [enableWorkNotifications]);

  useEffect(() => {
    try {
      localStorage.setItem('focus_continuous_work_limit', String(continuousWorkLimit));
    } catch (err) {
      console.warn("Could not save to localStorage:", err);
    }
  }, [continuousWorkLimit]);

  // Request Notification Permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (err) {
        console.warn("Error requesting notification permission:", err);
        return false;
      }
    }
    return false;
  };

  // Continuous Work Tracking & Notification Logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setContinuousWorkSeconds(prev => {
          const next = prev + 1;
          const limitSeconds = continuousWorkLimit * 60;
          if (enableWorkNotifications && next >= limitSeconds) {
            // Check if no break is scheduled in the AI schedule
            const isBreakScheduled = aiSchedule.some(item => 
              item.type.toLowerCase().includes('break') || 
              item.taskTitle.toLowerCase().includes('break')
            );
            if (!isBreakScheduled) {
              // Trigger browser notification
              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification("Continuous Focus Limit Reached 🧘", {
                    body: `You have been working continuously for ${continuousWorkLimit} minutes with no break scheduled. Time for a well-deserved stretch!`,
                    icon: '/favicon.ico',
                    requireInteraction: true
                  });
                } catch (e) {
                  console.warn("Failed to trigger Notification API:", e);
                }
              }
              // Also show the in-app break dialog as a reliable backup
              setShowWorkBreakAlert(true);
              playSingingBowl();
            }
            return 0; // reset
          }
          return next;
        });
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, enableWorkNotifications, continuousWorkLimit, aiSchedule]);

  // Timer Countdown Logic
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            // Timer Finished!
            setIsTimerRunning(false);
            playSingingBowl();
            
            // Add focus minutes to stats
            const minsAdded = timerPreset;
            const newTotalMins = totalFocusMinutes + minsAdded;
            setTotalFocusMinutes(newTotalMins);
            localStorage.setItem('focus_total_minutes', String(newTotalMins));

            // Adjust completed counters if working on task
            if (selectedFocusTask) {
              const updated = tasks.map(t => {
                if (t.id === selectedFocusTask.id) {
                  return { ...t, isCompleted: true, completedAt: Date.now() };
                }
                return t;
              });
              saveTasksToLocal(updated);
              
              const newCompToday = completedTodayCount + 1;
              setCompletedTodayCount(newCompToday);
              localStorage.setItem('focus_completed_today', String(newCompToday));

              // Auto increment streak if there are tasks completed today
              if (streak === 0) {
                setStreak(1);
                localStorage.setItem('focus_streak', '1');
              }
            }
            
            // Back out of focus mode
            setIsFocusMode(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning, timerPreset, selectedFocusTask, totalFocusMinutes, completedTodayCount, streak, tasks]);

  // Ambient sound play control
  useEffect(() => {
    if (isTimerRunning && !isMuted) {
      startAmbientRain();
    } else {
      stopAmbientRain();
    }
    return () => stopAmbientRain();
  }, [isTimerRunning, isMuted]);

  // Preset configuration
  const handleSetPreset = (minutes: number) => {
    setIsTimerRunning(false);
    setTimerPreset(minutes);
    setTimerSeconds(minutes * 60);
    // 15 is standard short break preset, reset continuous focus tracking
    if (minutes === 15) {
      setContinuousWorkSeconds(0);
    }
  };

  // Handle task submission
  const handleAddTask = (e: FormEvent) => {
    e.preventDefault();
    if (!inputTitle.trim()) return;

    const newTask: Task = {
      id: Math.random().toString(36).substring(2, 9),
      title: inputTitle.trim(),
      description: inputDesc.trim(),
      priority: inputPriority,
      estimatedMinutes: Number(inputDuration) || 30,
      type: inputType,
      isLongTerm: taskTab === 'LongTerm',
      isCompleted: false,
      createdAt: Date.now()
    };

    const updatedTasks = [newTask, ...tasks];
    saveTasksToLocal(updatedTasks);

    // Reset inputs
    setInputTitle('');
    setInputDesc('');
    setInputPriority('Medium');
    setInputDuration(30);
    setInputType('Deep Work');
  };

  // Complete task with a specific timestamp
  const completeTaskWithTimestamp = (taskId: string, timestamp: number) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          isCompleted: true,
          completedAt: timestamp
        };
      }
      return t;
    });
    
    saveTasksToLocal(updated);

    // Count completions
    const currentCompleted = updated.filter(t => t.isCompleted && t.completedAt && new Date(t.completedAt).toDateString() === new Date().toDateString()).length;
    setCompletedTodayCount(currentCompleted);
    localStorage.setItem('focus_completed_today', String(currentCompleted));

    // Simple streak handling
    if (currentCompleted > 0 && streak === 0) {
      setStreak(1);
      localStorage.setItem('focus_streak', '1');
    } else if (currentCompleted === 0) {
      setStreak(0);
      localStorage.setItem('focus_streak', '0');
    }
  };

  // Mark task completed (toggles or requests completion timing)
  const toggleTaskCompletion = (task: Task) => {
    if (task.isCompleted) {
      // Direct un-complete with no modal
      const updated = tasks.map(t => {
        if (t.id === task.id) {
          return {
            ...t,
            isCompleted: false,
            completedAt: undefined
          };
        }
        return t;
      });
      saveTasksToLocal(updated);

      const currentCompleted = updated.filter(t => t.isCompleted && t.completedAt && new Date(t.completedAt).toDateString() === new Date().toDateString()).length;
      setCompletedTodayCount(currentCompleted);
      localStorage.setItem('focus_completed_today', String(currentCompleted));
      if (currentCompleted === 0) {
        setStreak(0);
        localStorage.setItem('focus_streak', '0');
      }
    } else {
      // Show timing selection modal
      setCompletingTask(task);
      setCompletionOption('now');
      setCompletionDay('Today');
      const hh = String(new Date().getHours()).padStart(2, '0');
      const mm = String(new Date().getMinutes()).padStart(2, '0');
      setCompletionTime(`${hh}:${mm}`);
    }
  };

  // Delete task
  const deleteTask = (id: string) => {
    const filtered = tasks.filter(t => t.id !== id);
    saveTasksToLocal(filtered);
    if (selectedFocusTask?.id === id) {
      setSelectedFocusTask(null);
    }
  };

  // Format digital clock
  const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDate = currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

  // Call Gemini: Plan optimized schedule
  const generateSmartSchedule = async () => {
    const activeTasks = tasks.filter(t => !t.isCompleted);
    if (activeTasks.length === 0) {
      alert("Please add some pending tasks first before generating an AI schedule.");
      return;
    }

    setIsGeneratingSchedule(true);
    
    const completedTasks = tasks.filter(t => t.isCompleted);
    const analysis = analyzeUserBehavior(completedTasks);

    // Check if offline
    if (!isOnline) {
      setTimeout(() => {
        const localData = generateLocalSchedule(tasks, peakHours, energyLevel, energyCycle);
        setAiSchedule(localData.schedule);
        setAiInsights(localData.insights);
        localStorage.setItem('focus_ai_schedule', JSON.stringify(localData.schedule));
        localStorage.setItem('focus_ai_insights', JSON.stringify(localData.insights));
        setIsGeneratingSchedule(false);
      }, 600);
      return;
    }

    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: activeTasks,
          energyLevel,
          peakHours,
          extraNotes,
          energyCycle,
          behaviorAnalysis: {
            isSufficientData: analysis.isSufficientData,
            detectedCycle: analysis.detectedCycle,
            peakPeriod: analysis.peakPeriod,
            peakPercentage: analysis.peakPercentage,
            totalCompleted: analysis.totalCompleted
          }
        })
      });

      if (!response.ok) {
        throw new Error('Server returned an error. Switching to offline schedule generator.');
      }

      const data = await response.json();
      setAiSchedule(data.schedule || []);
      setAiInsights(data.insights || []);
      localStorage.setItem('focus_ai_schedule', JSON.stringify(data.schedule || []));
      localStorage.setItem('focus_ai_insights', JSON.stringify(data.insights || []));
    } catch (err: any) {
      console.warn("Gemini schedule fetch failed, falling back to offline algorithm:", err);
      const localData = generateLocalSchedule(tasks, peakHours, energyLevel, energyCycle);
      setAiSchedule(localData.schedule);
      setAiInsights([
        "Network is transient. Generated highly structured local schedule fallback.",
        ...localData.insights
      ]);
    } finally {
      setIsGeneratingSchedule(false);
    }
  };

  // Call Gemini: Get a task guide pathway
  const handleGetPathway = async (task: Task) => {
    setPathwayTask(task);
    setActivePathway(null);
    setIsGeneratingPathway(true);
    setPathwayError(null);

    // If offline
    if (!isOnline) {
      setTimeout(() => {
        const localPathway = generateLocalPathway(task.title, task.priority);
        setActivePathway(localPathway);
        setIsGeneratingPathway(false);
      }, 700);
      return;
    }

    try {
      const response = await fetch('/api/pathway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle: task.title,
          taskDescription: task.description,
          priority: task.priority
        })
      });

      if (!response.ok) {
        throw new Error('Could not compile AI pathways.');
      }

      const data = await response.json();
      setActivePathway(data);
    } catch (err: any) {
      console.warn("Gemini pathway failed, generating offline pathway instructions:", err);
      const localPathway = generateLocalPathway(task.title, task.priority);
      setActivePathway(localPathway);
      setPathwayError("Generated offline. Some advanced cognitive reasoning was restricted, but the action guidelines are active!");
    } finally {
      setIsGeneratingPathway(false);
    }
  };

  // Focus Circle Breathing Animation Steps
  // Inhale 4s, Hold 4s, Exhale 4s, Hold 4s (Box Breathing)
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Hold Out'>('Inhale');
  const [breathSeconds, setBreathSeconds] = useState(4);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isFocusMode && isTimerRunning) {
      interval = setInterval(() => {
        setBreathSeconds(prev => {
          if (prev <= 1) {
            setBreathPhase(current => {
              if (current === 'Inhale') return 'Hold';
              if (current === 'Hold') return 'Exhale';
              if (current === 'Exhale') return 'Hold Out';
              return 'Inhale';
            });
            return 4;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isFocusMode, isTimerRunning]);

  // Format remaining time
  const formatTimerString = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Complete tasks ratio
  const filteredTasks = tasks.filter(t => t.isLongTerm === (taskTab === 'LongTerm'));
  const completedCount = filteredTasks.filter(t => t.isCompleted).length;
  const totalCount = filteredTasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2D2D2A] font-sans antialiased selection:bg-[#E5E5DF] transition-colors duration-500 pb-12">
      
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-[#FAF9F6]/80 backdrop-blur-md border-b border-[#E5E5DF] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3" id="logo-section">
          <div className="w-9 h-9 rounded-full bg-[#6B7F62] flex items-center justify-center text-white shadow-sm">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-[#1E1E1C]">Focus Task Planner</h1>
            <p className="text-xs text-[#7A7A73] font-medium tracking-wide uppercase">Minimalist Mindspace</p>
          </div>
        </div>

        {/* Real-time Clock and Date */}
        <div className="hidden md:flex items-center space-x-6 text-right" id="clock-section">
          <div>
            <div className="text-sm font-semibold text-[#1E1E1C] tracking-wide font-mono">{formattedTime}</div>
            <div className="text-xs text-[#7A7A73]">{formattedDate}</div>
          </div>
        </div>

        {/* System Settings & Network Indicators */}
        <div className="flex items-center space-x-3" id="system-indicators">
          <div className={`flex items-center px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide transition-all ${
            isOnline 
              ? 'bg-[#EBF5E9] text-[#2E7D32] border border-[#C8E6C9]' 
              : 'bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]'
          }`}>
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 mr-1.5" />
                Online (AI Active)
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 mr-1.5 animate-pulse" />
                Offline Mode
              </>
            )}
          </div>
          
          <div className="flex items-center px-3 py-1 rounded-full bg-[#F4F4F1] border border-[#E5E5DF] text-xs font-bold text-[#4B4B43]">
            <Flame className="w-3.5 h-3.5 mr-1 text-orange-500" />
            {streak} Day Streak
          </div>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center justify-center p-1.5 rounded-full bg-[#F4F4F1] border border-[#E5E5DF] hover:bg-[#E5E5DF] hover:border-[#6B7F62] text-[#4B4B43] transition-all cursor-pointer relative"
            title="Focus & Notification Settings"
          >
            <Settings className="w-4 h-4" />
            {enableWorkNotifications && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#6B7F62] rounded-full ring-2 ring-[#FAF9F6]"></span>
            )}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* Welcome / Dashboard Insights Strip */}
        <div className="bg-[#F4F4F1] border border-[#E5E5DF] rounded-2xl p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#1E1E1C] flex items-center">
              Welcome Back to Deep Focus <Smile className="w-5 h-5 ml-2 text-[#6B7F62]" />
            </h2>
            <p className="text-sm text-[#7A7A73] max-w-xl">
              We isolate noise, build clean trajectories, and support you online and offline. Put your phone away, pick your primary task, and enter focus.
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="bg-white border border-[#E5E5DF] px-4 py-3 rounded-xl text-center shadow-sm">
              <div className="text-2xl font-bold font-mono text-[#6B7F62]">{completedTodayCount}</div>
              <div className="text-[10px] uppercase tracking-wider text-[#7A7A73] font-bold">Done Today</div>
            </div>
            <div className="bg-white border border-[#E5E5DF] px-4 py-3 rounded-xl text-center shadow-sm">
              <div className="text-2xl font-bold font-mono text-[#6B7F62]">{totalFocusMinutes}m</div>
              <div className="text-[10px] uppercase tracking-wider text-[#7A7A73] font-bold">Focus Time</div>
            </div>
            <div className="bg-white border border-[#E5E5DF] px-4 py-3 rounded-xl text-center shadow-sm">
              <div className="text-2xl font-bold font-mono text-[#6B7F62]">{progressPercent}%</div>
              <div className="text-[10px] uppercase tracking-wider text-[#7A7A73] font-bold">Progress</div>
            </div>
          </div>
        </div>

        {/* Bento Board Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Column 1: Tasks Management (width: 5 cols) */}
          <section className="lg:col-span-5 bg-white border border-[#E5E5DF] rounded-2xl p-6 flex flex-col justify-between shadow-sm min-h-[500px]" id="tasks-board">
            <div>
              {/* Board Header & Tabs */}
              <div className="flex items-center justify-between border-b border-[#F0EFEB] pb-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-[#6B7F62]" />
                  <h3 className="font-bold text-base text-[#1E1E1C]">Tasks Canvas</h3>
                </div>
                <div className="flex space-x-1 bg-[#F4F4F1] p-1 rounded-lg">
                  <button 
                    onClick={() => setTaskTab('Daily')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      taskTab === 'Daily' 
                        ? 'bg-white text-[#1E1E1C] shadow-sm' 
                        : 'text-[#7A7A73] hover:text-[#1E1E1C]'
                    }`}
                  >
                    Daily
                  </button>
                  <button 
                    onClick={() => setTaskTab('LongTerm')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      taskTab === 'LongTerm' 
                        ? 'bg-white text-[#1E1E1C] shadow-sm' 
                        : 'text-[#7A7A73] hover:text-[#1E1E1C]'
                    }`}
                  >
                    Long Term
                  </button>
                </div>
              </div>

              {/* Add Task Form */}
              <form onSubmit={handleAddTask} className="space-y-3 bg-[#FAF9F6] p-4 rounded-xl border border-[#E5E5DF] mb-4">
                <div>
                  <input 
                    type="text" 
                    placeholder="Identify task title..." 
                    value={inputTitle}
                    onChange={e => setInputTitle(e.target.value)}
                    required
                    maxLength={70}
                    className="w-full bg-white border border-[#E5E5DF] rounded-lg px-3 py-2 text-sm placeholder-[#A6A69E] focus:outline-none focus:border-[#6B7F62]"
                  />
                </div>
                <div>
                  <textarea 
                    placeholder="Short description / details (optional)..." 
                    value={inputDesc}
                    onChange={e => setInputDesc(e.target.value)}
                    maxLength={140}
                    rows={2}
                    className="w-full bg-white border border-[#E5E5DF] rounded-lg px-3 py-1.5 text-xs placeholder-[#A6A69E] focus:outline-none focus:border-[#6B7F62] resize-none"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-[#7A7A73] uppercase tracking-wider mb-1">Priority</label>
                    <select
                      value={inputPriority}
                      onChange={e => setInputPriority(e.target.value as any)}
                      className="w-full bg-white border border-[#E5E5DF] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#6B7F62]"
                    >
                      <option value="High">🔴 High</option>
                      <option value="Medium">🟡 Medium</option>
                      <option value="Low">🟢 Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#7A7A73] uppercase tracking-wider mb-1">Type</label>
                    <select
                      value={inputType}
                      onChange={e => setInputType(e.target.value as any)}
                      className="w-full bg-white border border-[#E5E5DF] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#6B7F62]"
                    >
                      <option value="Deep Work">🧠 Deep Work</option>
                      <option value="Routine">⚙️ Routine</option>
                      <option value="Break">☕ Break</option>
                      <option value="Exercise">🏃 Exercise</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#7A7A73] uppercase tracking-wider mb-1">Est. Mins</label>
                    <input 
                      type="number" 
                      min={1}
                      max={240}
                      value={inputDuration}
                      onChange={e => setInputDuration(Number(e.target.value) || 30)}
                      className="w-full bg-white border border-[#E5E5DF] rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#6B7F62] h-[30px]"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#6B7F62] text-white hover:bg-[#5D6F55] transition-colors rounded-lg py-2 text-xs font-bold flex items-center justify-center space-x-1 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Insert Task to Canvas</span>
                </button>
              </form>

              {/* Tasks List */}
              <div className="space-y-2 overflow-y-auto max-h-[340px] pr-1">
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-8 px-4 bg-[#FAF9F6] border border-dashed border-[#E5E5DF] rounded-xl text-xs text-[#7A7A73] font-medium">
                    No active tasks on your canvas. Put down your thoughts.
                  </div>
                ) : (
                  filteredTasks.map((task) => (
                    <div 
                      key={task.id}
                      className={`group border rounded-xl p-3.5 transition-all ${
                        task.isCompleted 
                          ? 'bg-[#FAF9F6]/60 border-[#E5E5DF] opacity-60' 
                          : 'bg-white border-[#E5E5DF] hover:border-[#6B7F62]/60 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 max-w-[80%]">
                          <button 
                            onClick={() => toggleTaskCompletion(task)}
                            className={`mt-0.5 w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                              task.isCompleted 
                                ? 'bg-[#6B7F62] border-[#6B7F62] text-white' 
                                : 'bg-white border-[#C8C8C0] group-hover:border-[#6B7F62]'
                            }`}
                          >
                            {task.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                          <div>
                            <p className={`text-sm font-bold text-[#1E1E1C] ${task.isCompleted ? 'line-through text-[#909088]' : ''}`}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-xs text-[#7A7A73] mt-0.5 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                task.priority === 'High' 
                                  ? 'bg-[#FFEBEE] text-[#C62828]' 
                                  : task.priority === 'Medium' 
                                    ? 'bg-[#FFF8E1] text-[#F57F17]' 
                                    : 'bg-[#EBF5E9] text-[#2E7D32]'
                              }`}>
                                {task.priority} Priority
                              </span>
                              <span className="text-[10px] text-[#7A7A73] font-mono flex items-center">
                                <Clock className="w-3 h-3 mr-0.5 text-[#A6A69E]" />
                                {task.estimatedMinutes}m
                              </span>
                              <span className="text-[10px] text-[#7A7A73] font-medium bg-[#F4F4F1] px-1.5 py-0.5 rounded">
                                {task.type}
                              </span>

                              {/* Target Deadline Badge */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSettingDeadlineTask(task);
                                  setDeadlineDay(task.targetDay || 'Today');
                                  setDeadlineTime(task.targetTime || '17:00');
                                }}
                                className={`flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                                  task.targetTimestamp 
                                    ? (formatTimeLeft(task.targetTimestamp).isOverdue 
                                        ? 'bg-[#FFEBEE] border-[#FFCDD2] text-[#C62828] hover:bg-[#FFCDD2]' 
                                        : 'bg-[#EBF5E9] border-[#C8E6C9] text-[#2E7D32] hover:bg-[#D4EDDA]')
                                    : 'bg-[#FAF9F6] border-[#E5E5DF] text-[#7A7A73] hover:border-[#6B7F62]/60 hover:text-[#1E1E1C]'
                                }`}
                                title="Click to update or set target finish time"
                              >
                                <Clock className="w-3 h-3 mr-1" />
                                <span>
                                  {task.targetTimestamp 
                                    ? `${task.targetDay} @ ${task.targetTime} (${formatTimeLeft(task.targetTimestamp).text})` 
                                    : 'Set Target Time'}
                                </span>
                              </button>
                            </div>

                            {/* Dedicated Task Completion Action */}
                            {!task.isCompleted ? (
                              <button
                                type="button"
                                onClick={() => toggleTaskCompletion(task)}
                                className="mt-3 flex items-center justify-center space-x-1.5 bg-[#EBF5E9] hover:bg-[#D4EDDA] border border-[#C8E6C9] hover:border-[#A5D6A7] text-[#2E7D32] px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Complete Task</span>
                              </button>
                            ) : (
                              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-[#7A7A73]">
                                <span className="font-bold flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5 text-[#2E7D32] stroke-[3]" />
                                  <span>Finished:</span>
                                </span>
                                <span className="bg-[#FAF9F6] border border-[#E5E5DF] px-2 py-0.5 rounded text-[10px] font-mono">
                                  {task.completedAt ? new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          {!task.isCompleted && (
                            <button
                              onClick={() => {
                                handleGetPathway(task);
                                // Scroll or focus on pathway block if mobile
                                document.getElementById('pathway-panel')?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              title="Generate Step-by-Step AI Pathway"
                              className="p-1 rounded hover:bg-[#F4F4F1] text-[#6B7F62] transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-1 rounded hover:bg-[#FFEBEE] text-[#C62828] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Canvas Stats Progress Bar */}
            {totalCount > 0 && (
              <div className="mt-4 pt-4 border-t border-[#F0EFEB]">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-[#7A7A73] font-bold">Execution Quotient</span>
                  <span className="font-mono font-bold text-[#1E1E1C]">{progressPercent}%</span>
                </div>
                <div className="w-full bg-[#F4F4F1] h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#6B7F62] h-full rounded-full transition-all duration-500" 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </section>

          {/* Column 2: Minimalist Focus Timer & Zen Space (width: 4 cols) */}
          <section className="lg:col-span-4 bg-white border border-[#E5E5DF] rounded-2xl p-6 flex flex-col justify-between shadow-sm min-h-[500px]" id="focus-timer">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#F0EFEB] pb-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-[#6B7F62]" />
                  <h3 className="font-bold text-base text-[#1E1E1C]">Zen Focus Space</h3>
                </div>
                
                {/* Ambient noise audio toggle */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  title={isMuted ? "Enable Soft Rain focus soundtrack" : "Disable ambient rain"}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isMuted 
                      ? 'bg-[#FAF9F6] border-[#E5E5DF] text-[#7A7A73] hover:text-[#1E1E1C]' 
                      : 'bg-[#EBF5E9] border-[#C8E6C9] text-[#2E7D32] hover:bg-[#D4EDDA]'
                  }`}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Pin Task for Focus selection */}
              <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#E5E5DF]">
                <span className="block text-[9px] font-extrabold text-[#7A7A73] uppercase tracking-wider mb-1">Target focus task</span>
                {tasks.filter(t => !t.isCompleted).length === 0 ? (
                  <p className="text-xs text-[#A6A69E] italic">Add a task first to lock concentration.</p>
                ) : (
                  <select
                    value={selectedFocusTask?.id || ''}
                    onChange={e => {
                      const t = tasks.find(tk => tk.id === e.target.value);
                      setSelectedFocusTask(t || null);
                    }}
                    className="w-full bg-white border border-[#E5E5DF] rounded-lg px-2 py-1 text-xs text-[#2D2D2A] focus:outline-none"
                  >
                    <option value="">-- Let mind rest (No locked task) --</option>
                    {tasks.filter(t => !t.isCompleted).map(t => (
                      <option key={t.id} value={t.id}>[{t.priority}] {t.title}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Minimal Preset selectors */}
              <div className="flex items-center justify-center space-x-2">
                {[15, 25, 50].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => handleSetPreset(mins)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      timerPreset === mins 
                        ? 'bg-[#6B7F62] text-white border-[#6B7F62]' 
                        : 'bg-white text-[#7A7A73] border-[#E5E5DF] hover:border-[#6B7F62]'
                    }`}
                  >
                    {mins} Min
                  </button>
                ))}
              </div>

              {/* Huge Timer Monospace Countdown */}
              <div className="text-center py-6">
                <div className="text-6xl font-bold font-mono tracking-tight text-[#1E1E1C]">
                  {formatTimerString(timerSeconds)}
                </div>
                {selectedFocusTask && (
                  <div className="mt-2 text-xs font-semibold text-[#6B7F62] bg-[#EBF5E9] inline-block px-3 py-1 rounded-full border border-[#C8E6C9]">
                    Locked on: {selectedFocusTask.title}
                  </div>
                )}
              </div>
            </div>

            {/* Timer Actions & Focus Overlay Launchers */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer ${
                    isTimerRunning 
                      ? 'bg-[#D32F2F] text-white hover:bg-[#B71C1C]' 
                      : 'bg-[#6B7F62] text-white hover:bg-[#5D6F55]'
                  }`}
                >
                  {isTimerRunning ? 'Pause Session' : 'Start Focus'}
                </button>
                <button
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerSeconds(timerPreset * 60);
                  }}
                  className="w-full bg-[#F4F4F1] border border-[#E5E5DF] hover:bg-[#E5E5DF] text-[#1E1E1C] py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Reset Timer
                </button>
              </div>

              <button
                onClick={() => {
                  playSingingBowl();
                  setIsFocusMode(true);
                }}
                className="w-full border border-[#6B7F62] text-[#6B7F62] hover:bg-[#FAF9F6]/50 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Enter Distraction-Free Overlay</span>
              </button>
            </div>
          </section>

          {/* Column 3: Gemini Optimizers & Pathways (width: 3 cols) */}
          <section className="lg:col-span-3 space-y-6 flex flex-col justify-between" id="ai-insights">
            
            {/* Dynamic AI Pathway Box (shows first if generated) */}
            <div 
              id="pathway-panel"
              className="bg-white border border-[#E5E5DF] rounded-2xl p-5 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#F0EFEB] pb-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[#6B7F62]" />
                  <h3 className="font-bold text-sm text-[#1E1E1C]">Task Pathway</h3>
                </div>
                {activePathway && (
                  <button 
                    onClick={() => {
                      setActivePathway(null);
                      setPathwayTask(null);
                    }}
                    className="p-1 rounded hover:bg-[#F4F4F1] text-[#7A7A73]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isGeneratingPathway ? (
                <div className="py-12 text-center space-y-3">
                  <div className="relative inline-flex">
                    <div className="w-8 h-8 bg-[#6B7F62]/20 rounded-full animate-ping"></div>
                    <div className="absolute top-0 left-0 w-8 h-8 bg-[#6B7F62] rounded-full flex items-center justify-center text-white">
                      <Sparkles className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                  <p className="text-xs text-[#7A7A73] animate-pulse">Consulting Gemini for execution path...</p>
                </div>
              ) : activePathway ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#7A7A73]">Focus Mantra</h4>
                    <p className="text-sm font-bold text-[#1E1E1C] italic mt-0.5">
                      &ldquo;{activePathway.focusMantra}&rdquo;
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#7A7A73]">Micro Steps</h4>
                    {activePathway.steps.map((step, idx) => (
                      <div key={idx} className="p-2.5 bg-[#FAF9F6] border border-[#E5E5DF] rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold bg-[#6B7F62] text-white px-1.5 py-0.5 rounded-full">Step {step.id}</span>
                          <span className="text-[10px] font-mono text-[#7A7A73]">{step.estimatedMinutes}m</span>
                        </div>
                        <h5 className="text-xs font-bold text-[#1E1E1C] mt-1.5">{step.title}</h5>
                        <p className="text-[11px] text-[#7A7A73] mt-0.5 leading-relaxed">{step.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-[#EBF5E9] border border-[#C8E6C9] rounded-xl text-xs text-[#2E7D32]">
                    <div className="flex items-start">
                      <Zap className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-bold">Avoid Blockers:</span>
                        <p className="mt-0.5 text-[#2E7D32]/90 text-[11px] leading-relaxed">{activePathway.microGuideline}</p>
                      </div>
                    </div>
                  </div>

                  {pathwayError && (
                    <p className="text-[10px] text-amber-700 italic">{pathwayError}</p>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <Compass className="w-8 h-8 text-[#D0CFC9] mx-auto mb-2" />
                  <p className="text-xs text-[#7A7A73] font-medium leading-relaxed max-w-xs mx-auto">
                    Select the sparkles icon next to any task in the list to unlock an actionable step-by-step pathway.
                  </p>
                </div>
              )}
            </div>

            {/* AI Optimization Form & Schedule Button */}
            <div className="bg-white border border-[#E5E5DF] rounded-2xl p-5 shadow-sm space-y-4 flex-1">
              <div className="flex items-center space-x-2 border-b border-[#F0EFEB] pb-3">
                <Sparkles className="w-4 h-4 text-[#6B7F62]" />
                <h3 className="font-bold text-sm text-[#1E1E1C]">AI Energy Alignment</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#7A7A73] uppercase tracking-wider mb-1">Daily Energy Cycle Pattern</label>
                  <select
                    value={energyCycle}
                    onChange={e => setEnergyCycle(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E5E5DF] rounded-lg px-2 py-1.5 text-xs focus:outline-none mb-1.5"
                  >
                    <option value="Morning peak, afternoon slump, evening boost">🌅 Early Bird (High Morning, Midday Slump, Evening Rise)</option>
                    <option value="Slow morning start, afternoon hyperfocus, late night slump">🦉 Night Owl (Slow Morning, Afternoon Focus, Late Night Boost)</option>
                    <option value="Steady moderate energy throughout the day">⚖️ Steady (Constant moderate energy all day)</option>
                    <option value="Slow start, high afternoon focus, evening decline">☀️ Midday Peak (Slow start, Afternoon focus, Evening rest)</option>
                    <option value="custom">✍️ Custom Energy Pattern...</option>
                  </select>
                  {/* Show custom text input if 'custom' is selected or user typed custom */}
                  {(energyCycle === 'custom' || !['Morning peak, afternoon slump, evening boost', 'Slow morning start, afternoon hyperfocus, late night slump', 'Steady moderate energy throughout the day', 'Slow start, high afternoon focus, evening decline'].includes(energyCycle)) && (
                    <input
                      type="text"
                      placeholder="Describe energy flow (e.g., peak at 11am, crash at 4pm)..."
                      value={energyCycle === 'custom' ? '' : energyCycle}
                      onChange={e => setEnergyCycle(e.target.value)}
                      className="w-full bg-[#FAF9F6] border border-[#E5E5DF] rounded-lg px-2 py-1.5 text-xs placeholder-[#A6A69E] focus:outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#7A7A73] uppercase tracking-wider mb-1">Peak Concentration Window</label>
                  <select
                    value={peakHours}
                    onChange={e => setPeakHours(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E5E5DF] rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                  >
                    <option value="Morning (8AM - 12PM)">🌅 Morning (8AM - 12PM)</option>
                    <option value="Afternoon (1PM - 5PM)">☀️ Afternoon (1PM - 5PM)</option>
                    <option value="Evening (6PM - 10PM)">🌌 Evening (6PM - 10PM)</option>
                    <option value="Night (11PM - 3AM)">🦉 Night (11PM - 3AM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#7A7A73] uppercase tracking-wider mb-1">Current Cognitive Battery</label>
                  <div className="grid grid-cols-3 gap-1">
                    {['Exhausted', 'Moderate', 'High Energy'].map((bat) => (
                      <button
                        key={bat}
                        type="button"
                        onClick={() => setEnergyLevel(bat)}
                        className={`py-1 text-[10px] font-bold rounded-md border transition-all ${
                          energyLevel === bat 
                            ? 'bg-[#6B7F62] text-white border-[#6B7F62]' 
                            : 'bg-[#FAF9F6] text-[#7A7A73] border-[#E5E5DF]'
                        }`}
                      >
                        {bat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#7A7A73] uppercase tracking-wider mb-1">Focus Notes / Context</label>
                  <input 
                    type="text" 
                    placeholder="E.g., slightly distracted, noisy coffee shop..."
                    value={extraNotes}
                    onChange={e => setExtraNotes(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E5E5DF] rounded-lg px-2 py-1.5 text-xs placeholder-[#A6A69E] focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={generateSmartSchedule}
                  disabled={isGeneratingSchedule}
                  className="w-full bg-[#6B7F62] hover:bg-[#5D6F55] disabled:bg-[#A6A69E] text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer"
                >
                  {isGeneratingSchedule ? (
                    <span>Aligning Timeline...</span>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Assemble Optimized Day</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Cognitive Peak & Behavioral Profiler */}
            <div className="bg-white border border-[#E5E5DF] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 border-b border-[#F0EFEB] pb-3">
                <Activity className="w-4 h-4 text-[#6B7F62]" />
                <h3 className="font-bold text-sm text-[#1E1E1C]">Cognitive Peak & Behavioral Profiler</h3>
              </div>

              {(() => {
                const analysis = analyzeUserBehavior(tasks.filter(t => t.isCompleted));
                const totalCompleted = analysis.totalCompleted;
                const morningPct = totalCompleted > 0 ? Math.round((analysis.morningCount / totalCompleted) * 100) : 0;
                const afternoonPct = totalCompleted > 0 ? Math.round((analysis.afternoonCount / totalCompleted) * 100) : 0;
                const eveningPct = totalCompleted > 0 ? Math.round((analysis.eveningCount / totalCompleted) * 100) : 0;
                const nightPct = totalCompleted > 0 ? Math.round((analysis.nightCount / totalCompleted) * 100) : 0;

                return (
                  <div className="space-y-4">
                    <div>
                      <span className="block text-[9px] font-extrabold text-[#7A7A73] uppercase tracking-wider mb-0.5">Calibrated Rhythm</span>
                      <p className="text-xs font-bold text-[#1E1E1C] flex items-center gap-1.5">
                        {analysis.isSufficientData ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-[#6B7F62] animate-pulse"></span>
                            <span>{analysis.detectedCycle}</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            <span className="text-[#7A7A73]">Awaiting Calibration (Need {Math.max(0, 3 - totalCompleted)} more completions)</span>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Hourly Completion Distribution */}
                    <div className="space-y-2.5">
                      <span className="block text-[9px] font-extrabold text-[#7A7A73] uppercase tracking-wider">Completion Hourly Distribution</span>
                      
                      {/* Morning Row */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-semibold text-[#2D2D2A]">
                          <span>🌅 Morning (6AM - 12PM)</span>
                          <span className="font-mono">{analysis.morningCount} tasks ({morningPct}%)</span>
                        </div>
                        <div className="w-full bg-[#F4F4F1] h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[#6B7F62] h-full rounded-full transition-all duration-500" style={{ width: `${morningPct}%` }} />
                        </div>
                      </div>

                      {/* Afternoon Row */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-semibold text-[#2D2D2A]">
                          <span>☀️ Afternoon (12PM - 5PM)</span>
                          <span className="font-mono">{analysis.afternoonCount} tasks ({afternoonPct}%)</span>
                        </div>
                        <div className="w-full bg-[#F4F4F1] h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[#6B7F62] h-full rounded-full transition-all duration-500" style={{ width: `${afternoonPct}%` }} />
                        </div>
                      </div>

                      {/* Evening Row */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-semibold text-[#2D2D2A]">
                          <span>🌆 Evening (5PM - 9PM)</span>
                          <span className="font-mono">{analysis.eveningCount} tasks ({eveningPct}%)</span>
                        </div>
                        <div className="w-full bg-[#F4F4F1] h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[#6B7F62] h-full rounded-full transition-all duration-500" style={{ width: `${eveningPct}%` }} />
                        </div>
                      </div>

                      {/* Night Row */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-semibold text-[#2D2D2A]">
                          <span>🦉 Night (9PM - 6AM)</span>
                          <span className="font-mono">{analysis.nightCount} tasks ({nightPct}%)</span>
                        </div>
                        <div className="w-full bg-[#F4F4F1] h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[#6B7F62] h-full rounded-full transition-all duration-500" style={{ width: `${nightPct}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-[#FAF9F6] border border-[#E5E5DF] rounded-xl text-[11px] text-[#7A7A73] leading-relaxed">
                      <p className="font-bold text-[#2D2D2A] mb-0.5">💡 Focus Engine Alignment</p>
                      <span>{analysis.suggestedScheduleAlignment}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

          </section>

        </div>

        {/* Bottom Section: AI suggested schedule timeline */}
        {aiSchedule.length > 0 && (
          <section className="mt-8 bg-white border border-[#E5E5DF] rounded-2xl p-6 shadow-sm" id="smart-schedule">
            <div className="flex items-center justify-between border-b border-[#F0EFEB] pb-4 mb-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-[#6B7F62]" />
                <h3 className="font-bold text-base text-[#1E1E1C]">Optimized Cognitive Timeline</h3>
              </div>
              <button 
                onClick={() => {
                  setAiSchedule([]);
                  setAiInsights([]);
                  localStorage.removeItem('focus_ai_schedule');
                  localStorage.removeItem('focus_ai_insights');
                }}
                className="text-xs text-[#C62828] hover:underline cursor-pointer"
              >
                Clear Schedule
              </button>
            </div>

            {/* Horizontal or Grid timeline */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {aiSchedule.map((item, idx) => (
                <div 
                  key={idx}
                  className={`border rounded-xl p-4 flex flex-col justify-between relative overflow-hidden transition-all ${
                    item.isDone 
                      ? 'bg-[#FAF9F6]/50 border-[#E5E5DF] opacity-60' 
                      : 'bg-[#FAF9F6] border-[#E5E5DF] hover:border-[#6B7F62]/50 shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-[#6B7F62] bg-[#EBF5E9] px-2 py-0.5 rounded-full border border-[#C8E6C9]/40">
                        {item.timeSlot}
                      </span>
                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wide ${
                        item.type === 'Deep Work' 
                          ? 'bg-[#FFEBEE] text-[#C62828]' 
                          : item.type === 'Break' 
                            ? 'bg-[#EBF5E9] text-[#2E7D32]' 
                            : 'bg-[#FFF8E1] text-[#F57F17]'
                      }`}>
                        {item.type}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-[#1E1E1C] mt-3">{item.taskTitle}</h4>
                    <p className="text-[11px] text-[#7A7A73] mt-1 leading-relaxed">{item.focusTip}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#F0EFEB] flex items-center justify-between">
                    <span className="text-[10px] text-[#A6A69E] font-mono">{item.durationMinutes} minutes</span>
                    <button
                      onClick={() => {
                        const updatedSchedule = [...aiSchedule];
                        updatedSchedule[idx].isDone = !updatedSchedule[idx].isDone;
                        setAiSchedule(updatedSchedule);
                        localStorage.setItem('focus_ai_schedule', JSON.stringify(updatedSchedule));
                      }}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-md border cursor-pointer transition-all ${
                        item.isDone 
                          ? 'bg-[#6B7F62] border-[#6B7F62] text-white' 
                          : 'bg-white border-[#E5E5DF] text-[#7A7A73] hover:border-[#6B7F62]'
                      }`}
                    >
                      {item.isDone ? 'Finished' : 'Mark Done'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {aiInsights.length > 0 && (
              <div className="mt-6 p-4 bg-[#FAF9F6] border border-[#E5E5DF] rounded-xl">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#7A7A73] mb-2">Gemini Productivity Insights</h4>
                <ul className="space-y-1.5">
                  {aiInsights.map((insight, index) => (
                    <li key={index} className="text-xs text-[#2D2D2A] flex items-start">
                      <Sparkles className="w-3.5 h-3.5 text-[#6B7F62] mr-2 shrink-0 mt-0.5" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

      </main>

      {/* FULL SCREEN DISTRACTION-FREE FOCUS MODE OVERLAY */}
      {isFocusMode && (
        <div className="fixed inset-0 bg-[#121211] text-[#E4E4DE] z-50 flex flex-col justify-between p-8 animate-fade-in">
          
          {/* Top Panel */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#6B7F62] animate-ping" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#7A7A73]">Active Focus Sanctuary</span>
            </div>

            <button
              onClick={() => {
                stopAmbientRain();
                setIsFocusMode(false);
              }}
              className="p-2 rounded-full hover:bg-white/10 text-[#7A7A73] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Center Space: Breathing Ring & Pinned Task */}
          <div className="flex flex-col items-center justify-center space-y-10 my-auto">
            
            {/* Locked Task Title */}
            <div className="text-center space-y-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-[#7A7A73]">Currently Executing</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#FAF9F6] tracking-tight max-w-xl">
                {selectedFocusTask ? selectedFocusTask.title : "Calming Mind & Deep Resting"}
              </h2>
              {selectedFocusTask?.description && (
                <p className="text-sm text-[#7A7A73] max-w-md mx-auto">{selectedFocusTask.description}</p>
              )}
            </div>

            {/* Pulsating Focus Ring & Breathing Guidance */}
            <div className="relative flex flex-col items-center justify-center">
              {/* Outer wave ring */}
              <div className={`absolute w-56 h-56 rounded-full border border-[#6B7F62]/20 transition-all duration-[4000ms] ease-in-out ${
                isTimerRunning && (breathPhase === 'Inhale' ? 'scale-125 opacity-100' : 'scale-75 opacity-20')
              }`} />
              
              {/* Inner core circle */}
              <div className={`w-44 h-44 rounded-full bg-gradient-to-tr from-[#1E231C] to-[#2D3F28] border border-[#6B7F62]/50 flex flex-col items-center justify-center text-center p-6 transition-transform duration-[4000ms] ease-in-out ${
                isTimerRunning && (breathPhase === 'Inhale' ? 'scale-110' : 'scale-95')
              }`}>
                {isTimerRunning ? (
                  <>
                    <span className="text-xs uppercase font-bold tracking-widest text-[#6B7F62]">{breathPhase}</span>
                    <span className="text-3xl font-extrabold font-mono text-white mt-1">{breathSeconds}s</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs uppercase font-bold tracking-widest text-amber-500">PAUSED</span>
                    <span className="text-xs text-[#7A7A73] mt-1.5">Sanctuary is paused</span>
                  </>
                )}
              </div>
            </div>

            {/* Large Clock timer countdown */}
            <div className="text-center">
              <div className="text-5xl font-mono tracking-wider font-bold text-white">
                {formatTimerString(timerSeconds)}
              </div>
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`px-6 py-2 rounded-full text-xs font-bold tracking-wider uppercase cursor-pointer transition-colors ${
                    isTimerRunning 
                      ? 'bg-[#C62828] text-white hover:bg-[#B71C1C]' 
                      : 'bg-[#6B7F62] text-white hover:bg-[#5D6F55]'
                  }`}
                >
                  {isTimerRunning ? 'Pause' : 'Start'}
                </button>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="px-6 py-2 bg-[#2D2D2A] border border-[#444] text-white rounded-full text-xs font-bold transition-all hover:bg-white/10"
                >
                  {isMuted ? 'Ambient Rain: Off' : 'Ambient Rain: On'}
                </button>
              </div>
            </div>

          </div>

          {/* Bottom Panel: Zen reminders */}
          <div className="text-center text-xs text-[#7A7A73] max-w-sm mx-auto font-medium leading-relaxed">
            &ldquo;Concentration is the fine art of choosing what to ignore. Everything else can wait.&rdquo;
          </div>

        </div>
      )}

      {/* SET TARGET DEADLINE MODAL */}
      {settingDeadlineTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5DF] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-6 text-[#2D2D2A]">
            <div className="flex items-center justify-between border-b border-[#F0EFEB] pb-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-[#6B7F62]" />
                <h3 className="font-bold text-lg text-[#1E1E1C]">Set Target Finish Time</h3>
              </div>
              <button 
                onClick={() => setSettingDeadlineTask(null)}
                className="p-1.5 rounded-full hover:bg-[#F4F4F1] text-[#7A7A73] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="block text-[10px] font-extrabold text-[#7A7A73] uppercase tracking-wider mb-1">Target Task</span>
                <p className="text-sm font-bold text-[#1E1E1C]">{settingDeadlineTask.title}</p>
                {settingDeadlineTask.description && (
                  <p className="text-xs text-[#7A7A73] mt-0.5">{settingDeadlineTask.description}</p>
                )}
              </div>

              {/* 1. Day Selection */}
              <div>
                <label className="block text-[10px] font-extrabold text-[#7A7A73] uppercase tracking-wider mb-2">When should this be finished?</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    'Today',
                    'Tomorrow',
                    'In 2 days',
                    'In 3 days',
                    'In 4 days',
                    'In 5 days',
                    'In 6 days',
                    'In 7 days'
                  ].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setDeadlineDay(day)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        deadlineDay === day
                          ? 'bg-[#6B7F62] text-white border-[#6B7F62] shadow-sm'
                          : 'bg-[#FAF9F6] text-[#7A7A73] border-[#E5E5DF] hover:border-[#6B7F62]'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Hour/Minute Time Selection */}
              <div>
                <label className="block text-[10px] font-extrabold text-[#7A7A73] uppercase tracking-wider mb-1.5">By what time on that day?</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="time"
                    value={deadlineTime}
                    onChange={e => setDeadlineTime(e.target.value)}
                    required
                    className="bg-[#FAF9F6] border border-[#E5E5DF] rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-[#6B7F62] w-full"
                  />
                  
                  {/* Preset quick buttons */}
                  <div className="flex gap-1.5 shrink-0">
                    {['12:00', '17:00', '21:00'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setDeadlineTime(p)}
                        className={`px-2.5 py-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                          deadlineTime === p
                            ? 'bg-[#EBF5E9] border-[#C8E6C9] text-[#2E7D32]'
                            : 'bg-[#FAF9F6] border-[#E5E5DF] text-[#7A7A73] hover:border-[#6B7F62]'
                        }`}
                      >
                        {p === '12:00' ? 'Noon' : p === '17:00' ? '5 PM' : '9 PM'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#F0EFEB]">
              {settingDeadlineTask.targetTimestamp ? (
                <button
                  type="button"
                  onClick={() => {
                    if (settingDeadlineTask) {
                      const updatedTasks = tasks.map(t => {
                        if (t.id === settingDeadlineTask.id) {
                          const { targetDay, targetTime, targetTimestamp, ...rest } = t;
                          return rest;
                        }
                        return t;
                      });
                      saveTasksToLocal(updatedTasks);
                      setSettingDeadlineTask(null);
                    }
                  }}
                  className="bg-red-50 text-[#C62828] hover:bg-red-100 border border-red-200 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Clear Target
                </button>
              ) : (
                <div />
              )}
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSettingDeadlineTask(null)}
                  className="bg-[#FAF9F6] border border-[#E5E5DF] hover:bg-[#E5E5DF] text-[#7A7A73] py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (settingDeadlineTask) {
                      const targetTimestamp = calculateTargetTimestamp(deadlineDay, deadlineTime);
                      const updatedTasks = tasks.map(t => {
                        if (t.id === settingDeadlineTask.id) {
                          return {
                            ...t,
                            targetDay: deadlineDay,
                            targetTime: deadlineTime,
                            targetTimestamp
                          };
                        }
                        return t;
                      });
                      saveTasksToLocal(updatedTasks);
                      setSettingDeadlineTask(null);
                    }
                  }}
                  className="bg-[#6B7F62] hover:bg-[#5D6F55] text-white py-2.5 px-5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Save Target Time
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TASK COMPLETION TIMING REPORT MODAL */}
      {completingTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5DF] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-6 text-[#2D2D2A]">
            <div className="flex items-center justify-between border-b border-[#F0EFEB] pb-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-[#6B7F62]" />
                <h3 className="font-bold text-lg text-[#1E1E1C]">Log Completion Time</h3>
              </div>
              <button 
                onClick={() => setCompletingTask(null)}
                className="p-1.5 rounded-full hover:bg-[#F4F4F1] text-[#7A7A73] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="block text-[10px] font-extrabold text-[#7A7A73] uppercase tracking-wider mb-1">Completed Task</span>
                <p className="text-sm font-bold text-[#1E1E1C]">{completingTask.title}</p>
                {completingTask.description && (
                  <p className="text-xs text-[#7A7A73] mt-0.5">{completingTask.description}</p>
                )}
              </div>

              {/* Timing Selection Option */}
              <div>
                <label className="block text-[10px] font-extrabold text-[#7A7A73] uppercase tracking-wider mb-2">When was this completed?</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCompletionOption('now')}
                    className={`py-3 px-4 text-xs font-bold rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                      completionOption === 'now'
                        ? 'bg-[#EBF5E9] border-[#6B7F62] text-[#2E7D32] shadow-sm animate-pulse'
                        : 'bg-[#FAF9F6] border-[#E5E5DF] text-[#7A7A73] hover:border-[#6B7F62]'
                    }`}
                  >
                    <Check className="w-4 h-4 text-[#2E7D32]" />
                    <span className="font-bold text-xs">Right now</span>
                    <span className="text-[10px] text-[#7A7A73] font-mono font-medium">({new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCompletionOption('before')}
                    className={`py-3 px-4 text-xs font-bold rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                      completionOption === 'before'
                        ? 'bg-[#EBF5E9] border-[#6B7F62] text-[#2E7D32] shadow-sm'
                        : 'bg-[#FAF9F6] border-[#E5E5DF] text-[#7A7A73] hover:border-[#6B7F62]'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-[#2E7D32]" />
                    <span className="font-bold text-xs">At some time before</span>
                    <span className="text-[10px] text-[#7A7A73] font-medium">Specify day & hour</span>
                  </button>
                </div>
              </div>

              {completionOption === 'before' && (
                <div className="space-y-3 p-3 bg-[#FAF9F6] border border-[#E5E5DF] rounded-xl">
                  {/* Day Picker */}
                  <div>
                    <label className="block text-[9px] font-extrabold text-[#7A7A73] uppercase tracking-wider mb-1.5">Select Completion Day</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        'Today',
                        'Yesterday',
                        'In 2 days ago',
                        'In 3 days ago',
                        'In 4 days ago',
                        'In 5 days ago',
                        'In 6 days ago',
                        'In 7 days ago'
                      ].map((day) => {
                        const label = day === 'In 2 days ago' ? '2 days ago' :
                                      day === 'In 3 days ago' ? '3 days ago' :
                                      day === 'In 4 days ago' ? '4 days ago' :
                                      day === 'In 5 days ago' ? '5 days ago' :
                                      day === 'In 6 days ago' ? '6 days ago' :
                                      day === 'In 7 days ago' ? '7 days ago' : day;
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => setCompletionDay(day)}
                            className={`py-1.5 text-[10px] font-bold rounded-md border transition-all cursor-pointer ${
                              completionDay === day
                                ? 'bg-[#6B7F62] text-white border-[#6B7F62]'
                                : 'bg-white text-[#7A7A73] border-[#E5E5DF] hover:border-[#6B7F62]'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Hour Picker */}
                  <div>
                    <label className="block text-[9px] font-extrabold text-[#7A7A73] uppercase tracking-wider mb-1">Completion Time</label>
                    <input
                      type="time"
                      value={completionTime}
                      onChange={e => setCompletionTime(e.target.value)}
                      required
                      className="bg-white border border-[#E5E5DF] rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#6B7F62] w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F0EFEB]">
              <button
                type="button"
                onClick={() => setCompletingTask(null)}
                className="bg-[#FAF9F6] border border-[#E5E5DF] hover:bg-[#E5E5DF] text-[#7A7A73] py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (completingTask) {
                    let timestamp = Date.now();
                    if (completionOption === 'before') {
                      const [hh, mm] = completionTime.split(':').map(Number);
                      const target = new Date();
                      target.setHours(hh, mm, 0, 0);
                      
                      if (completionDay === 'Yesterday') {
                        target.setDate(target.getDate() - 1);
                      } else if (completionDay.includes('2 days')) {
                        target.setDate(target.getDate() - 2);
                      } else if (completionDay.includes('3 days')) {
                        target.setDate(target.getDate() - 3);
                      } else if (completionDay.includes('4 days')) {
                        target.setDate(target.getDate() - 4);
                      } else if (completionDay.includes('5 days')) {
                        target.setDate(target.getDate() - 5);
                      } else if (completionDay.includes('6 days')) {
                        target.setDate(target.getDate() - 6);
                      } else if (completionDay.includes('7 days')) {
                        target.setDate(target.getDate() - 7);
                      }
                      timestamp = target.getTime();
                    }
                    completeTaskWithTimestamp(completingTask.id, timestamp);
                    setCompletingTask(null);
                  }
                }}
                className="bg-[#6B7F62] hover:bg-[#5D6F55] text-white py-2.5 px-5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Confirm & Log Completion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM SETTINGS & NOTIFICATIONS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5DF] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-6 text-[#2D2D2A]">
            <div className="flex items-center justify-between border-b border-[#F0EFEB] pb-4">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-[#6B7F62]" />
                <h3 className="font-bold text-lg text-[#1E1E1C]">System & Notification Settings</h3>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 rounded-full hover:bg-[#F4F4F1] text-[#7A7A73] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Notifications Toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-bold text-[#1E1E1C] flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-[#6B7F62]" />
                      Continuous Work Notifications
                    </label>
                    <p className="text-xs text-[#7A7A73] mt-0.5">Alert me when I focus for too long without a break.</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const nextState = !enableWorkNotifications;
                      if (nextState) {
                        const granted = await requestNotificationPermission();
                        setEnableWorkNotifications(granted);
                      } else {
                        setEnableWorkNotifications(false);
                      }
                    }}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-all duration-300 cursor-pointer ${
                      enableWorkNotifications ? 'bg-[#6B7F62] justify-end' : 'bg-[#E5E5DF] justify-start'
                    }`}
                  >
                    <span className="bg-white w-4 h-4 rounded-full shadow-md transition-all"></span>
                  </button>
                </div>

                {/* Notification Permissions status message */}
                {enableWorkNotifications && (
                  <div className="text-[11px] p-2 bg-[#FAF9F6] border border-[#E5E5DF] rounded-lg">
                    {(() => {
                      if (!('Notification' in window)) {
                        return <span className="text-amber-700 font-medium">⚠️ Browser notifications are not supported in this browser. We will use in-app alerts fallback!</span>;
                      }
                      if (Notification.permission === 'granted') {
                        return <span className="text-[#2E7D32] font-semibold">✅ Browser notifications authorized and active.</span>;
                      }
                      if (Notification.permission === 'denied') {
                        return <span className="text-red-700 font-medium">❌ Permission denied. Enable notifications in your browser address bar settings to receive desktop alerts.</span>;
                      }
                      return <span className="text-[#7A7A73]">⌛ Awaiting permissions prompt...</span>;
                    })()}
                  </div>
                )}
              </div>

              {/* Notification Configuration Limit */}
              {enableWorkNotifications && (
                <div className="space-y-3 p-4 bg-[#FAF9F6] border border-[#E5E5DF] rounded-xl">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[10px] font-extrabold text-[#7A7A73] uppercase tracking-wider">
                        Continuous Focus Limit
                      </label>
                      <span className="text-xs font-bold text-[#1E1E1C] font-mono">
                        {continuousWorkLimit} minutes
                      </span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="120"
                      step="5"
                      value={continuousWorkLimit}
                      onChange={(e) => setContinuousWorkLimit(Number(e.target.value))}
                      className="w-full accent-[#6B7F62] h-1.5 bg-[#E5E5DF] rounded-lg cursor-pointer"
                    />
                    <span className="block text-[9px] text-[#7A7A73] mt-1 italic">
                      If no break is scheduled in the AI schedule, we will alert you once you hit this focus limit.
                    </span>
                  </div>

                  {/* Test Notification Action */}
                  <div className="flex justify-between items-center pt-2 border-t border-[#E5E5DF]">
                    <span className="text-xs font-medium text-[#7A7A73]">Test browser alert:</span>
                    <button
                      type="button"
                      onClick={() => {
                        if ('Notification' in window && Notification.permission === 'granted') {
                          new Notification("Focus Alert Test ☕", {
                            body: "This is a preview of your continuous work break notification!",
                            icon: '/favicon.ico'
                          });
                        } else {
                          // Trigger fallback
                          setShowWorkBreakAlert(true);
                          playSingingBowl();
                        }
                      }}
                      className="bg-[#FAF9F6] hover:bg-[#F4F4F1] border border-[#E5E5DF] hover:border-[#6B7F62] text-xs font-bold text-[#4B4B43] px-3 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      Trigger Test Alert
                    </button>
                  </div>
                </div>
              )}

              {/* Tracking Session Metrics */}
              <div className="p-4 bg-[#FAF9F6] border border-[#E5E5DF] rounded-xl space-y-2">
                <span className="block text-[10px] font-extrabold text-[#7A7A73] uppercase tracking-wider">
                  Session Work Telemetry
                </span>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#7A7A73]">Continuous focus tracked:</span>
                  <span className="font-mono font-bold text-[#1E1E1C]">
                    {Math.floor(continuousWorkSeconds / 60)}m {continuousWorkSeconds % 60}s
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#7A7A73]">Break scheduled on calendar:</span>
                  <span className={`font-bold ${
                    aiSchedule.some(item => item.type.toLowerCase().includes('break') || item.taskTitle.toLowerCase().includes('break'))
                      ? 'text-[#2E7D32]'
                      : 'text-amber-700'
                  }`}>
                    {aiSchedule.some(item => item.type.toLowerCase().includes('break') || item.taskTitle.toLowerCase().includes('break'))
                      ? 'Yes (Alerts suspended)'
                      : 'No break (Active guards)'}
                  </span>
                </div>

                <div className="pt-2 border-t border-[#E5E5DF] flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setContinuousWorkSeconds(0);
                    }}
                    className="text-[10px] bg-[#FFF3CD] hover:bg-[#FFEBAA] border border-[#FFE699] text-[#856404] px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer"
                  >
                    Reset Session Timer
                  </button>
                </div>
              </div>

              {/* APPEARANCE & THEME SYNC SETTINGS */}
              <div className="space-y-4 p-4 bg-[#FAF9F6] border border-[#E5E5DF] rounded-xl">
                <div className="flex items-center space-x-2 border-b border-[#E5E5DF] pb-2">
                  <Moon className="w-4 h-4 text-[#6B7F62]" />
                  <span className="text-xs font-bold text-[#1E1E1C] uppercase tracking-wider">
                    Appearance & Weather Sync
                  </span>
                </div>

                {/* Manual Dark Mode toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-[#1E1E1C] flex items-center gap-1.5">
                      {isDarkMode ? <Moon className="w-3.5 h-3.5 text-amber-500" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                      Manual Dark Theme
                    </label>
                    <p className="text-[10px] text-[#7A7A73]">Directly toggle dark mode manually.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDarkMode(!isDarkMode);
                      if (weatherThemeSync) {
                        setWeatherThemeSync(false);
                      }
                    }}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-all duration-300 cursor-pointer ${
                      isDarkMode ? 'bg-[#6B7F62] justify-end' : 'bg-[#E5E5DF] justify-start'
                    }`}
                  >
                    <span className="bg-white w-4 h-4 rounded-full shadow-md transition-all"></span>
                  </button>
                </div>

                {/* Weather & Day/Night sync toggle */}
                <div className="flex items-center justify-between pt-1 border-t border-[#F0EFEB]">
                  <div>
                    <label className="text-xs font-bold text-[#1E1E1C] flex items-center gap-1.5">
                      <CloudSun className="w-3.5 h-3.5 text-[#6B7F62]" />
                      Auto Weather Sync
                    </label>
                    <p className="text-[10px] text-[#7A7A73]">Sync theme with local day/night sunset times.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextSync = !weatherThemeSync;
                      setWeatherThemeSync(nextSync);
                      if (nextSync) {
                        fetchWeatherAndSync(true);
                      }
                    }}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-all duration-300 cursor-pointer ${
                      weatherThemeSync ? 'bg-[#6B7F62] justify-end' : 'bg-[#E5E5DF] justify-start'
                    }`}
                  >
                    <span className="bg-white w-4 h-4 rounded-full shadow-md transition-all"></span>
                  </button>
                </div>

                {/* Weather Status Dashboard */}
                {(weatherThemeSync || weatherData) && (
                  <div className="p-2.5 bg-white border border-[#E5E5DF] rounded-lg space-y-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-[#1E1E1C]">
                        {weatherData?.isDay ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
                        <span>{weatherData?.city || 'Locating Area...'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => fetchWeatherAndSync(true)}
                        disabled={isFetchingWeather}
                        className="text-[#7A7A73] hover:text-[#6B7F62] flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${isFetchingWeather ? 'animate-spin' : ''}`} />
                        <span>Sync</span>
                      </button>
                    </div>

                    {weatherData ? (
                      <div className="space-y-1 text-[#7A7A73]">
                        <div className="flex justify-between">
                          <span>Temperature & Sky:</span>
                          <span className="font-semibold text-[#1E1E1C]">
                            {weatherData.temp}°C • {weatherData.condition}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Day Cycle status:</span>
                          <span className={`font-semibold ${weatherData.isDay ? 'text-amber-600' : 'text-indigo-600'}`}>
                            {weatherData.isDay ? '🌅 Day Mode active' : '🌙 Night Mode active'}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] pt-1 border-t border-[#F0EFEB]">
                          <span>🌅 Sunrise: {weatherData.sunrise}</span>
                          <span>🌇 Sunset: {weatherData.sunset}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-2 text-[#7A7A73] italic">
                        {isFetchingWeather ? 'Retrieving coordinates & weather data...' : 'Awaiting weather synchronization...'}
                      </div>
                    )}

                    {weatherError && (
                      <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 p-1.5 rounded text-center">
                        {weatherError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#F0EFEB]">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="bg-[#6B7F62] hover:bg-[#5D6F55] text-white py-2.5 px-6 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WORK BREAK ADVISORY ALERT MODAL */}
      {showWorkBreakAlert && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-amber-400 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 text-[#2D2D2A] animate-bounce-short">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500 border border-amber-200">
                <Bell className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="font-bold text-xl text-[#1E1E1C]">Focus Break Advisory! 🧘</h3>
              <p className="text-sm text-[#7A7A73] leading-relaxed">
                You have been in continuous, deep focus for <span className="font-bold text-[#1E1E1C]">{continuousWorkLimit} minutes</span> without a scheduled break. Prolonged concentration without mental relief can cause fatigue.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowWorkBreakAlert(false);
                  handleSetPreset(15);
                  setIsTimerRunning(true);
                }}
                className="w-full bg-[#6B7F62] hover:bg-[#5D6F55] text-white py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <Smile className="w-4 h-4" />
                <span>Take a 15-Minute Break</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  // Postpone: reset continuous count back to 5 minutes below threshold (alert again in 5 minutes)
                  setContinuousWorkSeconds(Math.max(0, (continuousWorkLimit - 5) * 60));
                  setShowWorkBreakAlert(false);
                }}
                className="w-full bg-[#FAF9F6] border border-[#E5E5DF] hover:bg-[#F4F4F1] text-[#7A7A73] py-2.5 px-4 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Snooze Alert (Remind in 5 Mins)
              </button>

              <button
                type="button"
                onClick={() => {
                  // Dismiss: reset continuous count to 0 entirely
                  setContinuousWorkSeconds(0);
                  setShowWorkBreakAlert(false);
                }}
                className="w-full bg-[#FFF3CD] border border-[#FFE699] hover:bg-[#FFEBAA] text-[#856404] py-2.5 px-4 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Dismiss & Keep Working
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
