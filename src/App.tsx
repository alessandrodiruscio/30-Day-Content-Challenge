/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Calendar, 
  Target, 
  MessageSquare, 
  ShoppingBag, 
  Zap,
  ChevronLeft,
  Download,
  Share2,
  Instagram,
  Video,
  FileText,
  User as UserIcon,
  LogOut,
  History,
  Lock,
  Mail,
  Menu,
  X,
  Settings,
  Plus,
  Play,
  Eye,
  EyeOff,
  Info,
  Trash2,
  ExternalLink,
  LayoutGrid,
  Image as ImageIcon,
  BookOpen,
  Grid3X3,
  NotebookPen,
  Edit2,
  Clock,
  Pause,
  Volume2,
  ZoomIn,
  ZoomOut,
  Trophy,
  Award,
  ShieldAlert,
  XCircle,
  Loader2
} from 'lucide-react';
import { UserProfile, ContentSeries, SeriesConcept, User, Achievement } from './types';
import { robustFetch, safeJson, fetchAchievements } from './utils/api';
import { 
  generateOptions, 
  generateSeries, 
  refineScript, 
  generateDayContent,
  generateSeriesChunk,
  regenerateDayContentWithIdea
} from './services/geminiService';
import { jsPDF } from 'jspdf';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function StrategyWizard({ seriesId, onComplete }: { seriesId: number, onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0, centered: false });

  const wizardSteps = [
    {
      title: "Navigate the Calendar",
      description: "Click on any day in the calendar (1-30) to move between days and view different content ideas for each day of your challenge.",
      selector: ".wizard-calendar"
    },
    {
      title: "Choose Your Hook",
      description: "Each day has multiple hook options. Click the dot buttons to preview different hooks and select the one that resonates most with your audience.",
      selector: ".wizard-hooks"
    },
    {
      title: "Switch Between Reel & Carousel",
      description: "Use the toggle to switch between Reel (vertical video) and Carousel (multiple image slides) formats. Both have custom layouts optimized for each platform.",
      selector: ".wizard-viewmode"
    },
    {
      title: "View the Storyboard",
      description: "Click 'Show Storyboard' to see a visual frame-by-frame breakdown of your Reel. This helps you plan your video shoot or understand the content flow.",
      selector: ".wizard-storyboard"
    },
    {
      title: "Call to Action",
      description: "Every day includes a customized call-to-action button text. This drives engagement by telling viewers exactly what you want them to do next.",
      selector: ".wizard-cta"
    },
    {
      title: "Suggested Caption",
      description: "Get AI-generated captions for each day optimized for Instagram. Customize them to match your brand voice and messaging.",
      selector: ".wizard-caption"
    },
    {
      title: "Inspiration Videos",
      description: "Find B-roll inspiration videos to enhance your content. Click the link to access a collection of relevant clips you can download and use.",
      selector: ".wizard-inspiration"
    },
    {
      title: "Mark as Complete",
      description: "When you post content for a day, click 'Mark as Done' to track your progress. Complete the 3 tasks (share, post in community, engage) to unlock the next day.",
      selector: ".wizard-complete"
    }
  ];

  useEffect(() => {
    const drawSpotlight = () => {
      const canvas = document.getElementById('wizard-spotlight') as HTMLCanvasElement;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const vh = window.innerHeight;
      const vw = window.innerWidth;

      canvas.width = vw;
      canvas.height = vh;

      // Dark overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Find target element
      const targetEl = document.querySelector(wizardSteps[step].selector) as HTMLElement;
      if (targetEl) {
        let rect = targetEl.getBoundingClientRect();
        const padding = 12;
        
        // Scroll element into view if needed
        const scrollNeeded = rect.top < 100 || rect.bottom > vh - 100;
        if (scrollNeeded) {
          targetEl.scrollIntoView({ behavior: 'auto', block: 'center' });
          rect = targetEl.getBoundingClientRect(); // Update rect after scroll
        }

        const x = rect.left - padding;
        const y = rect.top - padding;
        const width = rect.width + padding * 2;
        const height = rect.height + padding * 2;
        const cornerRadius = 12;

        // Clear the spotlight area
        ctx.clearRect(x, y, width, height);

        // Draw soft feathered border
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const softFadeWidth = 30;
        for (let i = softFadeWidth; i > 0; i--) {
          const opacity = Math.pow(1 - i / softFadeWidth, 2) * 0.35;
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          const offset = i * 0.8;
          ctx.roundRect(x - offset, y - offset, width + offset * 2, height + offset * 2, cornerRadius + 4);
          ctx.stroke();
        }

        // Calculate popup position
        const isMobile = vw < 768;
        const popupWidth = isMobile ? Math.min(340, vw - 32) : 400;
        const popupHeight = isMobile ? 280 : 250; 
        
        let top = 0;
        let left = (vw - popupWidth) / 2;
        let centered = false;

        // Try to place above or below
        const spaceAbove = rect.top - 20;
        const spaceBelow = vh - rect.bottom - 20;

        if (spaceAbove > popupHeight) {
          top = rect.top - popupHeight - 20;
        } else if (spaceBelow > popupHeight) {
          top = rect.bottom + 20;
        } else {
          // No room above or below, center it and dim the highlight a bit more
          top = (vh - popupHeight) / 2;
          centered = true;
          // Redraw overlay semi-transparently over the highlight to focus on popup if centered
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(x, y, width, height);
        }

        // Constraints
        top = Math.max(20, Math.min(top, vh - popupHeight - 20));
        
        setPopupPos({ top, left, centered });
      } else {
        // Fallback for missing elements
        setPopupPos({ 
          top: (vh - 300) / 2, 
          left: (vw - Math.min(400, vw - 40)) / 2, 
          centered: true 
        });
      }
    };

    const timer = setTimeout(drawSpotlight, 100); // Small delay to let scroll transition finish
    window.addEventListener('resize', drawSpotlight);
    window.addEventListener('scroll', drawSpotlight, true);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', drawSpotlight);
      window.removeEventListener('scroll', drawSpotlight, true);
    };
  }, [step, wizardSteps]);

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-none">
      <canvas
        id="wizard-spotlight"
        className="fixed inset-0 pointer-events-auto"
        onClick={e => e.stopPropagation()}
      />
      
      <div className="fixed inset-0 flex items-start justify-start p-4 pointer-events-none">
        <motion.div
          key={step}
          initial={{ scale: 0.9, opacity: 0, y: 10 }}
          animate={{ 
            scale: 1, 
            opacity: 1, 
            top: popupPos.centered ? '50%' : popupPos.top,
            left: popupPos.centered ? '50%' : popupPos.left,
            x: popupPos.centered ? '-50%' : 0,
            y: popupPos.centered ? '-50%' : 0
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bg-white rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-zinc-100 w-full max-w-[calc(100vw-32px)] md:max-w-md pointer-events-auto overflow-hidden flex flex-col"
          style={!popupPos.centered ? { top: popupPos.top, left: popupPos.left } : {}}
          onClick={e => e.stopPropagation()}
        >
          <div className="overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-[10px] font-bold uppercase tracking-wider">
                Tip {step + 1} of {wizardSteps.length}
              </div>
              <button 
                onClick={onComplete}
                className="text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <h2 className="text-2xl font-display font-bold text-zinc-900 mb-3">{wizardSteps[step].title}</h2>
            <p className="text-zinc-600 leading-relaxed text-sm md:text-base">
              {wizardSteps[step].description}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-50">
            <button
              onClick={onComplete}
              className="px-4 py-3 rounded-xl border border-zinc-100 text-zinc-400 font-bold hover:bg-zinc-50 transition-all text-xs uppercase tracking-widest"
            >
              Skip Wizard
            </button>
            <button
              onClick={() => {
                if (step < wizardSteps.length - 1) {
                  setStep(step + 1);
                } else {
                  onComplete();
                }
              }}
              className="flex-1 px-8 py-3 rounded-xl bg-zinc-900 text-white font-bold hover:bg-zinc-800 transition-all text-xs uppercase tracking-widest shadow-lg shadow-zinc-200"
            >
              {step === wizardSteps.length - 1 ? "Start Challenge" : "Next Tip"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Confetti() {
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: any[] = [];
    const colors = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height,
        vx: (Math.random() - 0.5) * 8,
        vy: -(Math.random() * 8 + 6),
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationVel: (Math.random() - 0.5) * 0.1
      });
    }

    const animate = () => {
      ctx!.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.y += p.vy;
        p.x += p.vx;
        p.vy += 0.15;
        p.rotation += p.rotationVel;

        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rotation);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx!.restore();

        if (p.y > canvas.height + 50) particles.splice(i, 1);
      }

      if (particles.length > 0) requestAnimationFrame(animate);
      else document.body.removeChild(canvas);
    };

    animate();
  }, []);

  return null;
}

export default function App() {
  const searchParams = new URLSearchParams(window.location.search);
  const resetStep = searchParams.get('step') === 'reset_password';
  const initialResetToken = searchParams.get('token') || '';
  const { t, i18n } = useTranslation();
  const toggleLanguage = () => {
    const next = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(next);
    localStorage.setItem('language', next);
  };
  const [step, setStep] = useState<'landing' | 'form' | 'loading_options' | 'results' | 'loading_series' | 'detail' | 'auth' | 'my_strategies' | 'profile' | 'recommended_tools' | 'reset_password'>(
    (sessionStorage.getItem('currentStep') as any) || 'landing'
  );
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [membership, setMembership] = useState<{ isMember: boolean, discordUrl: string, trialUrl: string } | null>(null);
  const [resetToken] = useState<string>(initialResetToken);
  if (resetStep) {
    return (
      <ResetPasswordView
        token={resetToken}
        onSuccess={() => setStep('auth')}
        onBack={() => setStep('landing')}
      />
    );
  }
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = sessionStorage.getItem('currentProfile');
    if (saved) return JSON.parse(saved);
    return {
      niche: '',
      products: '',
      problems: '',
      audience: '',
      tone: 'Professional & Helpful',
      contentType: 'Suggestions & Advice',
      primaryCTA: '',
      startDate: new Date().toISOString().split('T')[0],
    };
  });
  const [options, setOptions] = useState<SeriesConcept[]>(() => {
    const saved = sessionStorage.getItem('currentOptions');
    if (saved) return JSON.parse(saved);
    return [];
  });
  const [selectedSeries, setSelectedSeries] = useState<ContentSeries | null>(() => {
    const saved = sessionStorage.getItem('selectedSeries');
    if (saved) return JSON.parse(saved);
    return null;
  });
  const [savedStrategies, setSavedStrategies] = useState<any[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(!!token);
  const hasApiKey = true;
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingTitle, setLoadingTitle] = useState('');

  // Smooth fluid progress bar simulation during loading
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'loading_series') {
      interval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 90) return prev; // Cap fluid simulation at 90%
          // Need to reach ~90% in ~45 seconds. 
          // 250ms interval = 4 ticks/sec. 45 secs = 180 ticks.
          // 90 / 180 = 0.5% per tick. Let's make it slighty slower initially and gradually slow down.
          const stepAmount = prev < 40 ? 0.6 : prev < 70 ? 0.3 : prev < 85 ? 0.15 : 0.05;
          return prev + stepAmount;
        });
      }, 250);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step]);

  useEffect(() => {
    const restoreSession = async () => {
      if (!token) {
        setIsInitializing(false);
        return;
      }

      try {
        const res = await robustFetch('/api/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await safeJson(res);
          if (data.user) {
            setUser(data.user);
            setProfile(prev => ({
              ...prev,
              niche: data.user.niche || prev.niche,
              products: data.user.products || prev.products,
              problems: data.user.problems || prev.problems,
              audience: data.user.audience || prev.audience,
              tone: data.user.tone || prev.tone,
              contentType: data.user.contentType || prev.contentType,
              primaryCTA: data.user.primaryCTA || prev.primaryCTA,
            }));
            robustFetch('/api/community/membership', {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(r => r.json())
            .then(d => setMembership(d))
            .catch(err => console.error("Failed to fetch membership:", err));
          }
        } else {
          // Token invalid or expired
          localStorage.removeItem('token');
          setToken(null);
        }
      } catch (err) {
        console.error("Session restoration failed:", err);
      } finally {
        setIsInitializing(false);
      }
    };

    restoreSession();
  }, []);

  const handleOpenKeySelector = () => {};

  const handleGeminiError = (err: any) => {
    console.error("Gemini Error:", err);
    let message = typeof err === 'string' ? err : (err.message || 'Something went wrong while generating content.');
    
    // Check if it's a JSON string error from our backend or Gemini
    try {
      const parsed = JSON.parse(message);
      if (parsed.error?.message) message = parsed.error.message;
    } catch {}

    if (message === 'API_KEY_MISSING') {
      message = "Gemini API key is missing. Please add it to your environment variables or secrets panel.";
    } else if (message === 'API_KEY_INVALID') {
      message = "The provided Gemini API key is invalid. Please check your API key in the secrets panel and try again.";
    } else if (message.includes('503') || message.toLowerCase().includes('high demand') || message.toLowerCase().includes('overloaded')) {
      message = "The AI is currently processing many requests. We've tried several times automatically, but it's still busy. Please wait 10 seconds and click 'Generate' again.";
    } else if (message.includes('timeout') || message.includes('took too long')) {
      message = "Generation took longer than expected. This often happens with very complex topics. Please try again or slightly simplify your niche.";
    } else if (message.includes('502') || message.includes('500')) {
      message = "Our content engine is undergoing quick maintenance. Please try again in a few seconds.";
    } else if (message.includes('safety') || message.includes('blocked')) {
      message = "Content could not be generated due to AI safety filters. Please try rephrasing your niche or target audience.";
    }
    
    setError(message);
    setLoadingProgress(0);
    // Don't jump back to landing, stay on form so they can tweak or retry
    setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('loading_options');
    setError(null);
    
    // Save profile to backend if logged in
    if (token) {
      robustFetch('/api/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      }).catch(err => console.error("Failed to auto-save profile:", err));
    }

    try {
      const results = await generateOptions(profile, i18n.language);
      if (!results || results.length === 0) {
        throw new Error("No concepts were generated. Please try again.");
      }
      setOptions(results);
      setStep('results');
    } catch (err: any) {
      handleGeminiError(err);
      setStep('form');
    }
  };

  const handleSelectConcept = async (concept: SeriesConcept) => {
    setStep('loading_series');
    setError(null);
    setLoadingProgress(2);
    setLoadingTitle(t('loading.generatingSeries'));
    
    try {
      // Step 1: Generate Skeleton
      const skeletonSeries = await generateSeries(concept, profile, i18n.language);
      setLoadingProgress(prev => Math.max(prev, 25)); // Boost it up if it was lagging
      setLoadingTitle("Step 1 of 4: Planning challenge structure...");

      // Step 2-4: Generate Chunks (in smaller batches)
      const chunks = [];
      const batchSize = 3;
      
      const genericTitles = [
        "Drafting initial video hooks...",
        "Writing scripts and captions...",
        "Formatting calendar structure...",
        "Polishing daily call-to-actions..."
      ];
      
      for (let i = 0; i < 30; i += batchSize) {
        chunks.push({
          start: i,
          end: Math.min(i + batchSize, 30),
          progress: 20 + Math.floor((i / 30) * 80),
          title: genericTitles[Math.floor(i / batchSize) % genericTitles.length]
        });
      }

      // Generate the first 3 chunks (9 days) synchronously to show the calendar quickly
      const numInitialChunks = 3;
      for (let idx = 0; idx < numInitialChunks; idx++) {
        const chunk = chunks[idx];
        setLoadingTitle(genericTitles[idx]);
        const daySubset = skeletonSeries.days.slice(chunk.start, chunk.end);
        const chunkResults = await generateSeriesChunk(daySubset, profile, concept, i18n.language);
        
        // Merge results back into skeleton
        chunkResults.forEach((res: any) => {
          const dIdx = skeletonSeries.days.findIndex((d: any) => d.day === res.day);
          if (dIdx !== -1) {
            skeletonSeries.days[dIdx].scripts = res.scripts;
            skeletonSeries.days[dIdx].visuals_list = res.visuals;
            skeletonSeries.days[dIdx].captions = res.captions;
            
            // Set defaults for the first hook
            skeletonSeries.days[dIdx].visuals = res.visuals[0];
            skeletonSeries.days[dIdx].caption = res.captions[0];
          }
        });
        
        // Boost the bar higher as chunks resolve, giving it a visible bump on top of the fluid sim
        setLoadingProgress(prev => Math.max(prev, chunk.progress));
      }
      
      const fullSeries = skeletonSeries;
      const seriesWithMeta = {
        ...fullSeries,
        start_date: profile.startDate,
        completed_days: []
      };
      
      // Auto-save if logged in
      let savedId = null;
      if (token) {
        setLoadingTitle("Preparing Calendar Phase 1...");
        try {
          const saveRes = await robustFetch('/api/strategies', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              title: fullSeries.title,
              data: { ...fullSeries, contentType: profile.contentType },
              start_date: profile.startDate
            })
          });
          
          if (!saveRes.ok) {
            const errData = await safeJson(saveRes);
            throw new Error(errData.error || `Server returned ${saveRes.status}`);
          }
          
          const savedData = await safeJson(saveRes);
          savedId = savedData.id;
          setSavedStrategies(prev => [savedData, ...prev]);
        } catch (err: any) {
          console.error("Failed to auto-save strategy:", err);
          setError(`Saving failed: ${err.message}`);
          setTimeout(() => setError(null), 5000);
        }
      }
      
      const finalSeries = { ...seriesWithMeta, id: savedId };
      setSelectedSeries(finalSeries);
      setLoadingProgress(100);
      setStep('detail');

      // 🔥 Background generation for remaining chunks
      const generateRemainingChunks = async (initialSeriesState: any) => {
        let currentSeriesState = { ...initialSeriesState };
        try {
          for (const chunk of chunks.slice(numInitialChunks)) {
            const daySubset = currentSeriesState.days.slice(chunk.start, chunk.end);
            const chunkResults = await generateSeriesChunk(daySubset, profile, concept, i18n.language);
            
            // Merge results
            chunkResults.forEach((res: any) => {
              const dIdx = currentSeriesState.days.findIndex((d: any) => d.day === res.day);
              if (dIdx !== -1) {
                currentSeriesState.days[dIdx].scripts = res.scripts;
                currentSeriesState.days[dIdx].visuals_list = res.visuals;
                currentSeriesState.days[dIdx].captions = res.captions;
                currentSeriesState.days[dIdx].visuals = res.visuals[0];
                currentSeriesState.days[dIdx].caption = res.captions[0];
              }
            });
            
            // Update React state
            setSelectedSeries({ ...currentSeriesState });
            
            // Auto-save the chunk to database if we grabbed the ID
            if (token && currentSeriesState.id) {
              await robustFetch(`/api/strategies/${currentSeriesState.id}`, {
                method: 'PATCH',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  title: currentSeriesState.title,
                  data: { ...currentSeriesState, contentType: profile.contentType },
                  start_date: profile.startDate
                })
              }).catch(e => console.error("Chunk save failed:", e));
            }
          }
        } catch (err) {
          console.error("Background chunk generation failed:", err);
        }
      };

      // Start background process without blocking
      generateRemainingChunks(finalSeries);

    } catch (err: any) {
      console.error("Generation error:", err);
      handleGeminiError(err);
      setStep('results');
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('token');
    } catch (e) {
      console.warn("Failed to clear localStorage:", e);
    }
    sessionStorage.clear();
    setToken(null);
    setUser(null);
    setIsMenuOpen(false);
    setStep('landing');
  };

  const fetchMyStrategies = async () => {
    if (!token) {
      console.log("[fetchMyStrategies] No token, aborting");
      return;
    }
    try {
      console.log("[fetchMyStrategies] Fetching strategies...");
      const res = await robustFetch('/api/strategies', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await safeJson(res);
        console.log("[fetchMyStrategies] Data received:", data);
        setSavedStrategies(data);
        if (data && data.length > 0) {
          setStep('my_strategies');
        } else {
          setStep('form');
        }
      } else {
        console.error("[fetchMyStrategies] Fetch failed with status:", res.status);
      }
    } catch (err) {
      console.error("[fetchMyStrategies] Failed to fetch strategies:", err);
    }
  };

  const handleStart = () => {
    if (!user) setStep('auth');
    else fetchMyStrategies();
  };

  const handleSaveProfile = async (updatedProfile: UserProfile) => {
    if (!token) return;
    try {
      const res = await robustFetch('/api/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedProfile)
      });
      if (res.ok) {
        setProfile(updatedProfile);
        setUser(prev => prev ? { ...prev, ...updatedProfile } : null);
        setStep('my_strategies');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteStrategy = async (id: number) => {
    if (!token) return;
    
    try {
      const res = await robustFetch(`/api/strategies/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSavedStrategies(prev => prev.filter(s => s.id !== id));
        setConfirmDeleteId(null);
      } else {
        const data = await safeJson(res);
        alert(data.error || t('strategies.deleteFailed'));
      }
    } catch (err) {
      console.error("Delete strategy failed:", err);
      alert(t('strategies.deleteFailed'));
    }
  };

  return (
    <div className="min-h-screen bg-surface-bright selection:bg-primary/20 text-on-surface font-body">
      {isInitializing ? (
        <LoadingView title={t('loading.restoringSession')} />
      ) : (
        <>
          {/* Header */}
          <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-100 shadow-signature">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group transition-transform hover:scale-[1.02]" onClick={() => setStep('landing')}>
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex flex-col items-center justify-center relative overflow-hidden shadow-lg shadow-primary/10">
                <div className="absolute top-0 left-0 right-0 h-2 bg-primary"></div>
                <span className="text-[12px] font-black text-on-surface-variant mt-1.5 tracking-tighter">30</span>
              </div>
              <div className="text-xl font-black text-on-surface tracking-tighter font-headline uppercase italic">
                30-Day Content Challenge
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <button
               onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-on-surface-variant hover:text-primary hover:bg-zinc-50 transition-all border border-zinc-200"
              title="Switch language"
            >
              <span>{i18n.language === 'en' ? '🇺🇸' : '🇪🇸'}</span>
              <span>{i18n.language === 'en' ? 'EN' : 'ES'}</span>
            </button>
            
            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-3 pl-2 pr-4 py-2 bg-surface-container rounded-2xl hover:bg-surface-container-high transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                    {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                  </div>
                  <span className="text-sm font-bold font-headline">{t('nav.account')}</span>
                </button>

                <AnimatePresence>
                  {isMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-72 bg-white rounded-[2rem] shadow-signature border border-surface-container-highest/20 py-4 z-50 overflow-hidden"
                    >
                      <div className="px-8 py-5 border-b border-surface-container mb-2 bg-surface-container-low/50">
                        <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-1 opacity-50">{t('nav.account')}</p>
                        <p className="text-sm font-bold text-on-surface truncate">{user.email}</p>
                      </div>
                      
                      <button 
                        onClick={() => {
                          fetchMyStrategies();
                          setIsMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-6 py-3 text-zinc-600 hover:bg-zinc-50 hover:text-brand-primary transition-colors text-left"
                      >
                        <History size={18} />
                        <span className="font-medium">{t('nav.myStrategies')}</span>
                      </button>

                      <button 
                        onClick={() => {
                          setStep('recommended_tools');
                          setIsMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-6 py-3 text-zinc-600 hover:bg-zinc-50 hover:text-brand-primary transition-colors text-left"
                      >
                        <Zap size={18} />
                        <span className="font-medium">{t('nav.recommendedTools')}</span>
                      </button>

                      {membership && (
                        <a 
                          href={membership.isMember ? membership.discordUrl : membership.trialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setIsMenuOpen(false)}
                          className="w-full flex items-center gap-3 px-6 py-3 text-brand-primary hover:bg-brand-primary/5 transition-colors text-left"
                        >
                          {membership.isMember ? <MessageSquare size={18} /> : <Sparkles size={18} />}
                          <span className="font-medium">{t('nav.joinCommunity')}</span>
                        </a>
                      )}

                      <button 
                        onClick={() => {
                          setStep('profile');
                          setIsMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-6 py-3 text-zinc-600 hover:bg-zinc-50 hover:text-brand-primary transition-colors text-left"
                      >
                        <Settings size={18} />
                        <span className="font-medium">{t('nav.profileSettings')}</span>
                      </button>

                      <div className="h-px bg-zinc-50 my-2" />

                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-6 py-3 text-red-500 hover:bg-red-50 transition-colors text-left"
                      >
                        <LogOut size={18} />
                        <span className="font-medium">{t('nav.logout')}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button 
                onClick={() => setStep('auth')}
                className="text-sm font-semibold text-brand-primary hover:text-brand-secondary transition-colors"
              >
                {t('nav.loginRegister')}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="pt-16">
        <AnimatePresence mode="wait">
          {step === 'landing' && (
            <LandingView key="landing" onStart={handleStart} user={user} onSeeStrategies={fetchMyStrategies} />
          )}

          {step === 'auth' && (
            <AuthView 
              key="auth" 
              initialMode={new URLSearchParams(window.location.search).get('step') === 'forgot_password' ? 'forgot' : 'login'}
              onSuccess={(t, u) => {
                setToken(t);
                setUser(u);
                try {
                  localStorage.setItem('token', t);
                } catch (e) {
                  console.warn("Failed to save to localStorage:", e);
                }
                robustFetch('/api/community/membership', {
                  headers: { 'Authorization': `Bearer ${t}` }
                })
                .then(r => r.json())
                .then(d => setMembership(d))
                .catch(err => console.error("Failed to fetch membership:", err));
                robustFetch('/api/me', {
                  headers: { 'Authorization': `Bearer ${t}` }
                })
                .then(res => safeJson(res))
                .then(data => {
                  if (data?.user) {
                    setUser(data.user);
                    setProfile(prev => ({
                      ...prev,
                      niche: data.user.niche || prev.niche,
                      products: data.user.products || prev.products,
                      problems: data.user.problems || prev.problems,
                      audience: data.user.audience || prev.audience,
                      tone: data.user.tone || prev.tone,
                      contentType: data.user.contentType || prev.contentType,
                      primaryCTA: data.user.primaryCTA || prev.primaryCTA,
                    }));
                  }
                })
                .catch(err => console.error("Failed to fetch profile:", err));
                robustFetch('/api/strategies', {
                  headers: { 'Authorization': `Bearer ${t}` }
                })
                .then(res => safeJson(res))
                .then(data => {
                  console.log("[App] Strategies fetched:", data);
                  setSavedStrategies(data);
                  if (data && data.length > 0) {
                    console.log("[App] Found strategies, switching to my_strategies step");
                    setStep('my_strategies');
                  } else {
                    console.log("[App] No strategies found, switching to form step");
                    setStep('form');
                  }
                })
                .catch(err => {
                  console.error("[App] Failed to fetch initial strategies:", err);
                  setStep('form');
                });
              }} 
              onBack={() => setStep('landing')}
            />
          )}

          {step === 'profile' && (
            <ProfileView 
              key="profile"
              profile={profile}
              onSave={handleSaveProfile}
              onBack={() => setStep('my_strategies')}
            />
          )}

          {step === 'my_strategies' && (
            <MyStrategiesView 
              key="my_strategies"
              strategies={savedStrategies}
              userContentType={profile.contentType}
              onSelect={(s) => {
                const fullSeriesData = {
                  ...s.data,
                  id: s.id,
                  start_date: s.start_date,
                  completed_days: s.completed_days,
                  day_checklist: s.day_checklist,
                  day_notes: s.day_notes
                };
                setSelectedSeries(fullSeriesData);
                sessionStorage.setItem('selectedSeries', JSON.stringify(fullSeriesData));
                setStep('detail');
              }}
              onDelete={(id) => setConfirmDeleteId(id)}
              onBack={() => setStep('landing')}
              onNew={() => setStep('form')}
            />
          )}

          {step === 'recommended_tools' && (
            <RecommendedToolsView 
              key="recommended_tools"
              onBack={() => setStep('my_strategies')}
            />
          )}

          {step === 'reset_password' && (
            <ResetPasswordView 
              key="reset_password"
              token={resetToken || ''}
              onSuccess={() => setStep('auth')}
              onBack={() => setStep('landing')}
            />
          )}

          {step === 'form' && (
            <FormView 
              key="form" 
              profile={profile} 
              setProfile={setProfile} 
              onSubmit={handleSubmit} 
              onBack={() => user ? setStep('my_strategies') : setStep('landing')}
              error={error}
              hasApiKey={hasApiKey}
              onSelectKey={handleOpenKeySelector}
            />
          )}

          {step === 'loading_options' && (
            <LoadingView key="loading_options" title={t('loading.craftingConcepts')} showPercentage={false} />
          )}

          {step === 'results' && (
            <ResultsView 
              key="results" 
              options={options} 
              onSelect={handleSelectConcept} 
              onBack={() => setStep('form')} 
              error={error}
              hasApiKey={hasApiKey}
              onSelectKey={handleOpenKeySelector}
            />
          )}

          {step === 'loading_series' && (
            <LoadingView 
              key="loading_series" 
              title={loadingTitle || t('loading.generatingSeries')} 
              progress={loadingProgress} 
              showPercentage={true} 
            />
          )}

          {step === 'detail' && selectedSeries && (
            <SeriesDetailView 
              key="detail" 
              series={selectedSeries} 
              token={token}
              profile={profile}
              onBack={() => fetchMyStrategies()}
              onSave={async (series) => {
                if (!token) return;
                try {
                  const isExisting = !!series.id;
                  const endpoint = isExisting ? `/api/strategies/${series.id}` : '/api/strategies';
                  const method = isExisting ? 'PATCH' : 'POST';
                  
                  const res = await robustFetch(endpoint, {
                    method,
                    headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                      title: series.title,
                      data: { ...series, contentType: profile.contentType },
                      start_date: series.start_date
                    })
                  });
                  if (res.ok) {
                    const savedData = await safeJson(res);
                    if (!isExisting) {
                      setSavedStrategies(prev => [savedData, ...prev]);
                      setStep('my_strategies');
                    } else {
                      // Silently update the local state for existing strategies
                      const updatedSelected = {
                        ...savedData.data,
                        id: savedData.id,
                        start_date: savedData.start_date,
                        completed_days: savedData.completed_days,
                        day_checklist: savedData.day_checklist,
                        day_notes: savedData.day_notes
                      };
                      setSelectedSeries(updatedSelected);
                      sessionStorage.setItem('selectedSeries', JSON.stringify(updatedSelected));
                      // Also update the list in background
                      setSavedStrategies(prev => prev.map(s => s.id === savedData.id ? savedData : s));
                    }
                  }
                } catch (err) {
                  console.error("Failed to save strategy:", err);
                  alert('Failed to save strategy. Please try again.');
                }
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {confirmDeleteId !== null && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setConfirmDeleteId(null)}
                className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-[2rem] p-8 shadow-2xl border border-zinc-100 overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />
                
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-6">
                  <Trash2 size={32} />
                </div>
                
                <h3 className="text-2xl font-bold mb-2">{t('strategies.deleteTitle')}</h3>
                <p className="text-zinc-500 mb-8">
                  {t('strategies.deleteDescription')}
                </p>
                
                <div className="flex gap-4">
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="flex-1 py-4 px-6 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-2xl font-bold transition-all"
                  >
                    {t('strategies.cancel')}
                  </button>
                  <button
                    onClick={() => handleDeleteStrategy(confirmDeleteId)}
                    className="flex-1 py-4 px-6 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-500/20"
                  >
                    {t('strategies.deleteNow')}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
        </>
      )}
    </div>
  );
}

function LandingView({ onStart, user, onSeeStrategies }: { onStart: () => void, user: User | null, onSeeStrategies: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-8 py-20 md:py-32 bg-surface-bright">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative z-10 text-left font-sans"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary mb-8">
              <div className="flex-shrink-0 w-5 h-5 rounded bg-primary/20 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary"></div>
                <span className="text-[8px] font-black text-primary mt-0.5 tracking-tighter">30</span>
              </div>
              <span className="text-[10px] font-black font-headline uppercase tracking-widest leading-none">30-Day Content Challenge</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold font-headline leading-[1.1] tracking-tight text-on-surface mb-8">
              {t('landing.heading1')} <br/><span className="text-primary italic">{t('landing.heading2')}</span>
            </h1>
            <p className="text-lg md:text-xl text-on-surface-variant max-w-lg mb-12 leading-relaxed font-body font-light">
              {t('landing.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={onStart}
                className="editorial-gradient text-white px-8 py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 signature-glow hover:-translate-y-1 transition-all"
              >
                {user ? t('landing.startChallenge') : t('landing.joinChallenge')}
                <ArrowRight size={22} />
              </button>
              {user && (
                <button 
                  onClick={onSeeStrategies}
                  className="bg-white border-[1.5px] border-surface-container-highest hover:bg-surface-container-low px-8 py-5 rounded-2xl font-bold text-lg transition-all"
                >
                  {t('landing.viewStrategies')}
                </button>
              )}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative"
          >
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/10 blur-[100px] rounded-full"></div>
            <div className="relative bg-white p-5 rounded-[3rem] signature-glow border border-surface-container-highest/50">
              <img 
                className="w-full h-auto rounded-[2.2rem] shadow-2xl" 
                src="https://picsum.photos/seed/setup/1200/900" 
                referrerPolicy="no-referrer"
                alt="Production Setup"
              />
              <div className="absolute -bottom-8 -left-8 bg-white p-8 rounded-3xl signature-glow border border-surface-container-highest max-w-[260px]">
                <p className="text-primary font-black text-4xl mb-1 font-headline tracking-tighter">8.4M+</p>
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest leading-none">Collective Views Secured</p>
                <div className="mt-5 h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "85%" }}
                    transition={{ duration: 1.5, delay: 0.5 }}
                    className="h-full bg-secondary" 
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="bg-surface-container-low py-32 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-secondary font-bold font-headline tracking-[0.3em] text-[10px] uppercase mb-4 block">Process</span>
            <h2 className="text-4xl md:text-5xl font-black font-headline tracking-tight mb-8 font-headline italic uppercase">{t('landing.howItWorks')}</h2>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {(() => {
              const steps = t('landing.steps', { returnObjects: true });
              const icons = [<UserIcon size={32} />, <Zap size={32} />, <FileText size={32} />, <Sparkles size={32} />];
              return Array.isArray(steps) ? steps.map((step: string, i: number) => (
                <motion.div
                  key={i}
                  initial={{ y: 30, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white p-10 rounded-[2.5rem] border border-surface-container-highest/40 transition-all hover:shadow-signature hover:-translate-y-2 group"
                >
                  <div className="w-16 h-16 bg-surface-container-low rounded-2xl flex items-center justify-center mb-10 text-primary group-hover:scale-110 transition-transform">
                    {icons[i] || <Sparkles size={32} />}
                  </div>
                  <div className="text-primary font-black text-xs mb-3 font-headline opacity-40 uppercase tracking-widest">Step 0{i+1}</div>
                  <p className="text-on-surface font-semibold leading-relaxed font-body">{step}</p>
                </motion.div>
              )) : null;
            })()}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 px-8 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-10">
            {(() => {
              const features = t('landing.features', { returnObjects: true });
              const icons = [<Target size={40} />, <Zap size={40} />, <Calendar size={40} />];
              return Array.isArray(features) ? features.map((v: any, i: number) => (
                <div key={i} className="group relative bg-surface-container-low/30 p-12 rounded-[3.5rem] border border-surface-container-highest/10 transition-all hover:bg-white hover:shadow-signature hover:scale-[1.02]">
                  <div className="mb-10 w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    {icons[i]}
                  </div>
                  <h3 className="text-2xl font-black mb-6 font-headline tracking-tight italic uppercase">{v.title}</h3>
                  <p className="text-on-surface-variant leading-relaxed font-body font-light opacity-80">{v.desc}</p>
                </div>
              )) : null;
            })()}
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <section className="py-32 px-8 bg-surface-bright text-center">
        <div className="max-w-4xl mx-auto">
          <div className="mb-10 text-primary opacity-20">
            <span className="text-8xl font-serif">"</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black font-headline tracking-tight leading-tight mb-12 italic">
            {t('landing.quote')}
          </h2>
          <div className="w-20 h-1 bg-primary/20 mx-auto rounded-full"></div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-20 px-8 border-t border-surface-container-highest/30 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12 text-on-surface font-headline">
          <div className="text-left shrink-0">
            <div className="text-3xl font-black tracking-tighter mb-3 uppercase italic">Escape 9 to 5 Club</div>
            <p className="text-sm text-on-surface-variant/70 tracking-wide font-light max-w-sm font-sans leading-relaxed">
              Build your authority and scale your presence through strategic content challenges.
            </p>
          </div>
          <p className="text-xs font-black text-on-surface-variant/40 uppercase tracking-[0.2em] order-last md:order-none shrink-0">
            © 2026 Escape 9 to 5 Club. 30-Day Content Challenge.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FormView({ profile, setProfile, onSubmit, onBack, error, hasApiKey, onSelectKey }: { 
  profile: UserProfile, 
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>,
  onSubmit: (e: React.FormEvent) => void,
  onBack: () => void,
  error: string | null,
  hasApiKey: boolean,
  onSelectKey: () => void
}) {
  const { t } = useTranslation();
  const hasBusinessProfile = !!(profile.niche && profile.products && profile.problems && profile.audience);
  const [showBusinessFields, setShowBusinessFields] = useState(!hasBusinessProfile);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-2xl mx-auto px-6 py-12"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 mb-8 transition-colors">
        <ChevronLeft size={20} />
        <span>{t('back')}</span>
      </button>

      <h2 className="text-4xl font-display font-bold mb-4 tracking-tight leading-tight">
        {hasBusinessProfile ? t('form.title') : t('form.subtitle')}
      </h2>
      <p className="text-lg text-zinc-500 mb-12 font-light leading-relaxed">
        {hasBusinessProfile 
          ? t('form.profileHint')
          : t('form.profileHintNew')}
      </p>

      {error && (
        <div className="mb-8 p-6 bg-red-50 border border-red-100 text-red-600 rounded-3xl">
          <div className="flex items-start gap-3 mb-4">
            <X className="flex-shrink-0 mt-0.5" size={18} />
            <p className="text-sm font-medium">{error}</p>
          </div>
          {!hasApiKey && (
            <button 
              type="button"
              onClick={onSelectKey}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all"
            >
              <Lock size={14} />
              <span>{t('results.selectApiKey')}</span>
            </button>
          )}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-8">
        {hasBusinessProfile && (
          <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-zinc-900">{t('form.usingProfile')}</p>
              <p className="text-xs text-zinc-500">{profile.niche}</p>
            </div>
            <button 
              type="button"
              onClick={() => setShowBusinessFields(!showBusinessFields)}
              className="text-xs font-bold text-brand-primary hover:underline"
            >
              {showBusinessFields ? t('form.hideDetails') : t('form.editDetails')}
            </button>
          </div>
        )}

        <AnimatePresence>
          {showBusinessFields && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-8 overflow-hidden"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold font-headline text-on-surface uppercase tracking-wider mb-2">{t('form.niche.label')}</label>
                  <div className="group relative">
                    <Info size={14} className="text-zinc-400 cursor-help" />
                    <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-zinc-900 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                      {t('form.niche.tooltip')}
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <Target className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                  <input 
                    required
                    type="text"
                    placeholder={t('form.niche.placeholder')}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                    value={profile.niche}
                    onChange={e => setProfile({ ...profile, niche: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold font-headline text-on-surface uppercase tracking-wider mb-2">{t('form.products.label')}</label>
                  <div className="group relative">
                    <Info size={14} className="text-zinc-400 cursor-help" />
                    <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-zinc-900 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                      {t('form.products.tooltip')}
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <ShoppingBag className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                  <input 
                    required
                    type="text"
                    placeholder={t('form.products.placeholder')}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                    value={profile.products}
                    onChange={e => setProfile({ ...profile, products: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold font-headline text-on-surface uppercase tracking-wider mb-2">{t('form.problems.label')}</label>
                  <div className="group relative">
                    <Info size={14} className="text-zinc-400 cursor-help" />
                    <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-zinc-900 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                      {t('form.problems.tooltip')}
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-4 text-zinc-400" size={20} />
                  <textarea 
                    required
                    rows={3}
                    placeholder={t('form.problems.placeholder')}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all resize-none"
                    value={profile.problems}
                    onChange={e => setProfile({ ...profile, problems: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold font-headline text-on-surface uppercase tracking-wider mb-2">{t('form.audience.label')}</label>
                  <div className="group relative">
                    <Info size={14} className="text-zinc-400 cursor-help" />
                    <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-zinc-900 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                      {t('form.audience.tooltip')}
                    </div>
                  </div>
                </div>
                <input 
                  required
                  type="text"
                  placeholder={t('form.audience.placeholder')}
                  className="w-full px-4 py-4 bg-white border border-surface-container-highest rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body text-on-surface"
                  value={profile.audience}
                  onChange={e => setProfile({ ...profile, audience: e.target.value })}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pt-4 border-t border-zinc-100 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-zinc-700">{t('form.contentType.label')}</label>
              <div className="group relative">
                <Info size={14} className="text-zinc-400 cursor-help" />
                <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-zinc-900 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                  {t('form.contentType.tooltip')}
                </div>
              </div>
            </div>
            <select 
              className="w-full px-4 py-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all appearance-none"
              value={profile.contentType}
              onChange={e => setProfile({ ...profile, contentType: e.target.value })}
            >
              {(() => {
                const options = t('form.contentType.options', { returnObjects: true });
                return Array.isArray(options) ? options.map((opt: string) => (
                  <option key={opt}>{opt}</option>
                )) : null;
              })()}
            </select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-zinc-700">{t('form.tone.label')}</label>
              <div className="group relative">
                <Info size={14} className="text-zinc-400 cursor-help" />
                <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-zinc-900 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                  {t('form.tone.tooltip')}
                </div>
              </div>
            </div>
            <select 
              className="w-full px-4 py-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all appearance-none"
              value={profile.tone}
              onChange={e => setProfile({ ...profile, tone: e.target.value })}
            >
              {(() => {
                const options = t('form.tone.options', { returnObjects: true });
                return Array.isArray(options) ? options.map((opt: string) => (
                  <option key={opt}>{opt}</option>
                )) : null;
              })()}
            </select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-zinc-700">{t('form.primaryCTA.label')}</label>
              <div className="group relative">
                <Info size={14} className="text-zinc-400 cursor-help" />
                <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-zinc-900 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                  {t('form.primaryCTA.tooltip')}
                </div>
              </div>
            </div>
            <div className="relative">
              <Zap className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
              <input 
                required
                type="text"
                placeholder={t('form.primaryCTA.placeholder')}
                className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                value={profile.primaryCTA}
                onChange={e => setProfile({ ...profile, primaryCTA: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-zinc-700">{t('form.startDate.label')}</label>
              <div className="group relative">
                <Info size={14} className="text-zinc-400 cursor-help" />
                <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-zinc-900 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                  {t('form.startDate.tooltip')}
                </div>
              </div>
            </div>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
              <input 
                required
                type="date"
                className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                value={profile.startDate}
                onChange={e => setProfile({ ...profile, startDate: e.target.value })}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-4 bg-brand-secondary text-white rounded-2xl font-semibold text-lg hover:bg-slate-800 transition-all shadow-lg shadow-brand-secondary/10 active:scale-[0.99]"
        >
          {t('form.generate')}
        </button>
      </form>
    </motion.div>
  );
}

function LoadingView({ title, showPercentage = false, progress: forcedProgress = 0 }: { title: string, showPercentage?: boolean, progress?: number }) {
  const { t } = useTranslation();
  const [internalProgress, setInternalProgress] = useState(0);
  const startTimeRef = React.useRef(Date.now());
  const estimatedDurationMs = 180000; // 3 minutes to reach 99%
  
  useEffect(() => {
    if (!showPercentage || forcedProgress > 0) return;
    
    const updateProgress = () => {
      const elapsedMs = Date.now() - startTimeRef.current;
      const calculatedProgress = (elapsedMs / estimatedDurationMs) * 100;
      setInternalProgress(Math.min(calculatedProgress, 99));
    };
    
    const interval = setInterval(updateProgress, 100);
    updateProgress();
    
    return () => clearInterval(interval);
  }, [showPercentage, forcedProgress]);

  const displayProgress = forcedProgress > 0 ? forcedProgress : internalProgress;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-8 bg-surface-bright rounded-[4rem] pt-32">
      <motion.div
        initial={{ scale: 0.95, opacity: 0.8 }}
        animate={{ scale: 1.05, opacity: 1 }}
        transition={{ 
          duration: 3,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut"
        }}
        className="mb-16"
      >
        <img 
          src="https://i.postimg.cc/xTdfLJ6P/escape9to5-club-logo-transparent.png" 
          alt="Escape 9 to 5 Club" 
          className="h-28 md:h-36 w-auto drop-shadow-2xl" 
          referrerPolicy="no-referrer"
        />
      </motion.div>
      
      <h2 className="text-3xl font-headline font-black mb-8 tracking-tight text-on-surface">{title}</h2>
      
      {showPercentage ? (
        <div className="w-full max-w-sm mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-black text-on-surface-variant uppercase tracking-widest opacity-60">{t('loading.progress')}</span>
            {displayProgress >= 99 ? (
              <motion.span 
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="text-xs font-black text-primary uppercase tracking-widest"
              >
                {t('loading.refining')}
              </motion.span>
            ) : (
              <span className="text-xs font-black text-primary uppercase tracking-widest">{Math.round(displayProgress)}%</span>
            )}
          </div>
          <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden shadow-inner">
            <motion.div 
              animate={{ width: `${displayProgress}%` }}
              transition={{ duration: 0.2, ease: "linear" }}
              className="h-full editorial-gradient"
            />
          </div>
        </div>
      ) : (
        <div className="w-80 h-1.5 bg-surface-container rounded-full overflow-hidden mb-12 relative shadow-inner">
          <motion.div 
            animate={{ 
              x: [-320, 320],
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="w-full h-full editorial-gradient absolute"
          />
        </div>
      )}
      
      {showPercentage && (
        <p className="text-on-surface-variant max-w-xs mb-6 text-sm font-body italic opacity-70">
          {t('loading.coffeeMessage')}
        </p>
      )}
      
      <p className="text-primary/60 max-w-sm leading-relaxed font-body text-xs font-medium tracking-wide">
        {t('loading.quote')}
      </p>
    </div>
  );
}

function AuthView({ onSuccess, onBack, initialMode = 'login' }: { onSuccess: (token: string, user: User) => void, onBack: () => void, initialMode?: 'login' | 'register' | 'forgot' }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [serverStatus, setServerStatus] = useState<{ status: string, message?: string } | null>(null);

  useEffect(() => {
    // Check server status on mount
    robustFetch('/api/debug/mysql')
      .then(res => safeJson(res))
      .then(data => setServerStatus(data))
      .catch(err => {
        console.warn("Server status check failed:", err);
        setServerStatus({ status: 'error', message: err.message });
      });
  }, []);

  const switchMode = (newMode: 'login' | 'register' | 'forgot') => {
    setMode(newMode);
    setError('');
    setSuccessMessage('');
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'forgot') setResetLoading(true);
    setLoading(true);
    setError('');
    setSuccessMessage('');
    
    let endpoint = '';
    if (mode === 'login') endpoint = '/api/login';
    else if (mode === 'register') endpoint = '/api/register';
    else endpoint = '/api/forgot-password';

    try {
      const res = await robustFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-No-Retry': '1' },
        body: JSON.stringify({ email, password })
      }, 0, 1000, mode === 'forgot' ? 30000 : 30000);
      const data = await safeJson(res);
      if (res.ok) {
        if (mode === 'forgot') {
          setSuccessMessage(data.message);
        } else {
          onSuccess(data.token, data.user);
        }
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(`Connection error: ${err.message || 'Please check your internet connection'}`);
    } finally {
      setLoading(false);
      if (mode === 'forgot') setResetLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto px-6 py-20"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-on-surface-variant hover:text-primary mb-8 transition-all group font-headline font-bold uppercase tracking-widest text-[10px]">
        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        <span>{t('back')}</span>
      </button>

      <div className="bg-white p-10 rounded-[3rem] border border-surface-container-highest shadow-elegant signature-glow relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 editorial-gradient" />
        

        {mode !== 'forgot' && (
          <div className="flex p-1.5 bg-surface-container-low rounded-2xl mb-10 border border-surface-container">
            <button
              onClick={() => switchMode('login')}
              className={cn(
                "flex-1 py-3 text-sm font-black font-headline rounded-xl transition-all uppercase tracking-widest",
                mode === 'login' ? "bg-white text-primary shadow-elegant" : "text-on-surface-variant opacity-40 hover:opacity-100"
              )}
            >
              {t('auth.login')}
            </button>
            <button
              onClick={() => switchMode('register')}
              className={cn(
                "flex-1 py-3 text-sm font-black font-headline rounded-xl transition-all uppercase tracking-widest",
                mode === 'register' ? "bg-white text-primary shadow-elegant" : "text-on-surface-variant opacity-40 hover:opacity-100"
              )}
            >
              {t('auth.register')}
            </button>
          </div>
        )}

        <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">
          {mode === 'login' ? t('auth.welcomeBack') : mode === 'register' ? t('auth.createAccount') : t('auth.resetPassword')}
        </h2>
        
        {serverStatus && serverStatus.status !== 'connected' && (
          <div className="mb-8 p-6 rounded-[2rem] bg-zinc-900 text-zinc-100 flex items-start gap-4 shadow-xl">
            <ShieldAlert size={24} className="text-brand-accent flex-shrink-0" />
            <div className="text-sm leading-relaxed">
              <p className="font-bold mb-1 text-white">{t('auth.dbIssueTitle')}</p>
              <p className="opacity-70 font-light">{serverStatus.message || t('auth.dbIssueDesc')}</p>
            </div>
          </div>
        )}

        <p className="text-zinc-500 mb-10 text-lg font-light leading-relaxed">
          {mode === 'forgot' 
            ? t('auth.forgotPasswordDesc')
            : t('auth.saveStrategiesDesc')}
        </p>

        {successMessage ? (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-center">
            <CheckCircle2 size={32} className="mx-auto mb-4" />
            <p className="font-medium">{successMessage}</p>
            <button 
              onClick={() => switchMode('login')}
              className="mt-6 text-brand-primary font-bold hover:underline"
            >
              {t('auth.backToLogin')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
              <label className="text-xs font-black font-headline text-on-surface-variant uppercase tracking-[0.2em] opacity-60 ml-1">{t('auth.emailAddress')}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40" size={20} />
                <input 
                  required
                  type="email"
                  className="w-full pl-12 pr-4 py-4 bg-surface-container-low border border-surface-container rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body text-on-surface"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-black font-headline text-on-surface-variant uppercase tracking-[0.2em] opacity-60">{t('auth.password')}</label>
                  {mode === 'login' && (
                    <button 
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-[10px] font-black font-headline text-primary uppercase tracking-widest hover:translate-y-[-1px] transition-transform"
                    >
                      {t('auth.forgotPassword')}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40" size={20} />
                  <input 
                    required
                    type={showPassword ? "text" : "password"}
                    className="w-full pl-12 pr-12 py-4 bg-surface-container-low border border-surface-container rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body text-on-surface"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-secondary text-sm font-bold font-body bg-secondary/5 p-4 rounded-xl border border-secondary/10">{error}</p>}

            <button
              disabled={loading}
              type="submit"
              className="w-full py-5 editorial-gradient text-white rounded-2xl font-black font-headline text-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 signature-glow uppercase tracking-tighter"
            >
              {(loading || resetLoading) ? t('auth.processing') : (mode === 'login' ? t('auth.login') : mode === 'register' ? t('auth.register') : t('auth.sendResetLink'))}
            </button>
          </form>
        )}

        {!successMessage && mode === 'forgot' && (
          <div className="mt-8 text-center space-y-4">
            <button 
              onClick={() => switchMode('login')}
              className="text-zinc-400 text-sm font-medium hover:text-zinc-600 block w-full"
            >
              {t('auth.backToLogin')}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MyStrategiesView({ strategies, userContentType, onSelect, onDelete, onBack, onNew }: { strategies: any[], userContentType?: string, onSelect: (s: any) => void, onDelete: (id: number) => void, onBack: () => void, onNew: () => void }) {
  const { t } = useTranslation();
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto px-6 py-12"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-display font-bold mb-2">{t('strategies.title')}</h2>
          <p className="text-zinc-500">{t('strategies.subtitle')}</p>
        </div>
        <button 
          onClick={onNew}
          className="flex items-center gap-2 px-6 py-4 bg-brand-primary text-white rounded-2xl font-bold hover:bg-brand-secondary transition-all shadow-lg shadow-brand-primary/20"
        >
          <Plus size={20} />
          <span>{t('strategies.createNew')}</span>
        </button>
      </div>

      {strategies.length === 0 ? (
        <div className="text-center py-20 bg-zinc-50 rounded-[2.5rem] border-2 border-dashed border-zinc-200">
          <History size={48} className="mx-auto text-zinc-300 mb-4" />
          <p className="text-zinc-500 font-medium mb-8">{t('strategies.empty')}</p>
          <button 
            onClick={onNew}
            className="px-8 py-4 bg-brand-primary text-white rounded-2xl font-bold hover:bg-brand-secondary transition-all"
          >
            {t('strategies.createFirst')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {strategies.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => onSelect(s)}
              className="card-prestige p-10 cursor-pointer group relative flex flex-col h-full bg-white transition-all duration-500 hover:shadow-signature"
            >
              <div
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(s.id);
                }}
                role="button"
                className="absolute top-6 right-6 p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all z-30 flex items-center justify-center cursor-pointer"
                title="Delete Strategy"
              >
                <Trash2 size={24} />
              </div>

              <div className="flex items-center justify-between mb-10">
                <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 group-hover:scale-110 transition-transform">
                  <Calendar size={32} />
                </div>
                <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-[0.2em] opacity-40">
                  {new Date(s.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex-grow">
                <h3 className="text-2xl font-black font-headline mb-4 group-hover:text-primary transition-colors leading-tight tracking-tight">{s.title}</h3>
                <p className="text-on-surface-variant text-sm line-clamp-2 mb-8 font-body font-light leading-relaxed opacity-70">{s.data.description}</p>
                
                {(s.data.contentType || userContentType) && (
                  <div className="mb-8">
                    <span className="inline-block px-4 py-1.5 bg-zinc-50 border border-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-wider rounded-full">
                      {s.data.contentType || userContentType}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-brand-primary font-bold text-sm group/btn">
                <span>{t('strategies.viewFull')}</span>
                <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function ProfileView({ profile, onSave, onBack }: { profile: UserProfile, onSave: (p: UserProfile) => void, onBack: () => void }) {
  const { t } = useTranslation();
  const [localProfile, setLocalProfile] = useState(profile);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave(localProfile);
    setLoading(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto px-6 py-12"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 mb-8 transition-colors">
        <ChevronLeft size={20} />
        <span>{t('back')}</span>
      </button>

      <h2 className="text-4xl font-display font-bold mb-2">{t('profile.title')}</h2>
      <p className="text-zinc-500 mb-10">{t('profile.subtitle')}</p>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-zinc-700">{t('form.niche.label')}</label>
          <div className="relative">
            <Target className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
            <input 
              required
              type="text"
              placeholder={t('form.niche.placeholder')}
              className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
              value={localProfile.niche}
              onChange={e => setLocalProfile({ ...localProfile, niche: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-semibold text-zinc-700">{t('form.products.label')}</label>
          <div className="relative">
            <ShoppingBag className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
            <input 
              required
              type="text"
              placeholder={t('form.products.placeholder')}
              className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
              value={localProfile.products}
              onChange={e => setLocalProfile({ ...localProfile, products: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-semibold text-zinc-700">{t('form.problems.label')}</label>
          <div className="relative">
            <MessageSquare className="absolute left-4 top-4 text-zinc-400" size={20} />
            <textarea 
              required
              rows={3}
              placeholder={t('form.problems.placeholder')}
              className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all resize-none"
              value={localProfile.problems}
              onChange={e => setLocalProfile({ ...localProfile, problems: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-semibold text-zinc-700">{t('form.audience.label')}</label>
          <input 
            required
            type="text"
            placeholder={t('form.audience.placeholder')}
            className="w-full px-4 py-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
            value={localProfile.audience}
            onChange={e => setLocalProfile({ ...localProfile, audience: e.target.value })}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-brand-secondary text-white rounded-2xl font-semibold text-lg hover:bg-slate-800 transition-all shadow-lg shadow-brand-secondary/10 active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? t('profile.saving') : t('profile.save')}
        </button>
      </form>
    </motion.div>
  );
}

function ResultsView({ options, onSelect, onBack, error, hasApiKey, onSelectKey }: { 
  options: SeriesConcept[], 
  onSelect: (s: SeriesConcept) => void,
  onBack: () => void,
  error: string | null,
  hasApiKey: boolean,
  onSelectKey: () => void
}) {
  const { t } = useTranslation();
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto px-8 py-20"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-24">
        <div className="max-w-2xl">
          <button onClick={onBack} className="flex items-center gap-2 text-on-surface-variant hover:text-primary mb-8 transition-all group font-headline font-bold uppercase tracking-widest text-[10px]">
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span>{t('results.editProfile')}</span>
          </button>
          <span className="text-secondary font-bold font-headline tracking-[0.3em] text-[10px] uppercase mb-4 block">Selection Stage</span>
          <h2 className="text-4xl md:text-5xl font-black font-headline tracking-tight mb-6">{t('results.title')}</h2>
          <p className="text-on-surface-variant text-lg font-light font-body leading-relaxed">{t('results.description')}</p>
        </div>
      </div>

      {error && (
        <div className="mb-12 p-8 bg-secondary/5 border border-secondary/10 text-secondary rounded-[2rem] signature-glow">
          <div className="flex items-start gap-4 mb-6">
            <ShieldAlert className="flex-shrink-0 mt-0.5" size={24} />
            <p className="text-sm font-bold font-body leading-relaxed">{error}</p>
          </div>
          {!hasApiKey && (
            <button 
              type="button"
              onClick={onSelectKey}
              className="flex items-center gap-3 px-6 py-3 bg-secondary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-secondary/20"
            >
              <Lock size={14} />
              <span>Select API Key Now</span>
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {options.map((option, i) => (
          <motion.div
            key={i}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="card-prestige p-12 cursor-pointer relative group flex flex-col min-h-[440px] bg-white hover:shadow-signature transition-all duration-500"
            onClick={() => onSelect(option)}
          >
            <div className="absolute top-10 right-10 w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface-variant/30 group-hover:bg-primary group-hover:text-white group-hover:rotate-12 transition-all duration-500">
              <ArrowRight size={28} />
            </div>
            
            <div className="flex-grow mb-12">
              <span className="inline-block px-4 py-1.5 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-8">
                {t('results.option')} {i + 1}
              </span>
              <h3 className="text-3xl font-black font-headline leading-tight mb-8 group-hover:text-primary transition-colors tracking-tight">{option.title}</h3>
              <p className="text-on-surface-variant leading-relaxed font-body font-light opacity-70">{option.description}</p>
            </div>

            <div className="pt-10 border-t border-surface-container-highest/20 flex flex-col gap-5">
              <div className="flex items-center gap-5 text-sm text-on-surface font-bold font-headline uppercase tracking-widest opacity-60">
                <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary border border-surface-container-highest/30">
                  <Target size={20} />
                </div>
                <span>{option.targetAudience}</span>
              </div>
              <div className="flex items-center gap-5 text-sm text-on-surface font-bold font-headline uppercase tracking-widest opacity-60">
                <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary border border-surface-container-highest/30">
                  <Sparkles size={20} />
                </div>
                <span>{option.theme}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function SeriesDetailView({ series, token, profile, onBack, onSave }: { series: any, token: string | null, profile: UserProfile, onBack: () => void, onSave: (s: any) => Promise<void> }) {
  const { t, i18n } = useTranslation();
  const [saving, setSaving] = useState(false);
  
  // Script editing and teleprompter state
  const [editingScript, setEditingScript] = useState<{ day: number; hook: number } | null>(null);
  const [editedScriptText, setEditedScriptText] = useState('');
  const [showVersionHistory, setShowVersionHistory] = useState<{ day: number; hook: number } | null>(null);
  const [scriptVersions, setScriptVersions] = useState<any[]>([]);
  const [versionHistorySaving, setVersionHistorySaving] = useState(false);
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [teleprompterSpeed, setTeleprompterSpeed] = useState(1);
  const [teleprompterFontSize, setTeleprompterFontSize] = useState(3);
  const [teleprompterRunning, setTeleprompterRunning] = useState(false);
  
  // Check if series data is valid
  if (!series || !series.days || !Array.isArray(series.days) || series.days.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-2xl mx-auto px-6 py-12 text-center"
      >
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
          <h2 className="text-2xl font-display font-bold text-red-600 mb-4">Error Loading Strategy</h2>
          <p className="text-red-600 mb-6">This strategy data is corrupted or incomplete. Please delete and create a new one.</p>
          <button 
            onClick={onBack}
            className="px-8 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition-all"
          >
            Back to Try Again
          </button>
        </div>
      </motion.div>
    );
  }
  
  const [activeDay, setActiveDay] = useState<number>(1);
  const [completedDays, setCompletedDays] = useState<number[]>(series.completed_days || []);
  const [hookIndices, setHookIndices] = useState<Record<number, number>>({});
  const [showStoryboard, setShowStoryboard] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'reel' | 'carousel'>('reel');
  const [detailViewMode, setDetailViewMode] = useState<'day' | 'calendar'>('day');
  const [dayChecklist, setDayChecklist] = useState<Record<number, Record<string, boolean>>>(series.day_checklist || {});
  const [dayNotes, setDayNotes] = useState<Record<number, string>>(series.day_notes || {});
  const [notesSaving, setNotesSaving] = useState<boolean>(false);
  const [showChecklistModal, setShowChecklistModal] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const notesTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [membership, setMembership] = useState<{ isMember: boolean, discordUrl: string, trialUrl: string } | null>(null);
  const [showWizard, setShowWizard] = useState<boolean>(() => {
    const hasSeenWizard = localStorage.getItem('wizard_seen_once');
    return !hasSeenWizard;
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showAchievements, setShowAchievements] = useState<boolean>(false);
  const [isTailoring, setIsTailoring] = useState<Record<number, boolean>>({});

  // Regeneration state
  const [showRegenerateModal, setShowRegenerateModal] = useState<boolean>(false);
  const [regenerateIdea, setRegenerateIdea] = useState<string>('');
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  // Trigger content generation for the active day if it's missing (skeleton to full)
  useEffect(() => {
    const currentDayData = series.days.find((d: any) => d.day === activeDay);
    if (!currentDayData) return;
    
    const hookIdx = hookIndices[activeDay] || 0;
    const hasScript = Array.isArray(currentDayData.scripts) && currentDayData.scripts[hookIdx]?.length > 20;
    const hasVisuals_field = currentDayData.visuals?.length > 10;
    const hasVisuals_list = Array.isArray(currentDayData.visuals_list) && currentDayData.visuals_list[hookIdx]?.length > 10;

    if (!hasScript || (!hasVisuals_field && !hasVisuals_list)) {
      console.warn(`[Content] Missing pre-generated content for day ${activeDay} hook ${hookIdx}. Triggering fallback tailor.`);
      tailorScriptToHook(activeDay, hookIdx);
    }
  }, [activeDay, hookIndices[activeDay]]);

  const handleWizardComplete = () => {
    localStorage.setItem('wizard_seen_once', 'true');
    setShowWizard(false);
  };
  
  // Reset checklist and notes when switching between strategies
  useEffect(() => {
    setDayChecklist(series.day_checklist || {});
    setDayNotes(series.day_notes || {});
  }, [series.id]);

  // Fetch achievements when series changes
  useEffect(() => {
    const loadAchievements = async () => {
      if (token && series.id) {
        try {
          const data = await fetchAchievements(token, series.id);
          setAchievements(data.achievements || []);
        } catch (error) {
          console.error('Failed to fetch achievements:', error);
        }
      }
    };
    loadAchievements();
  }, [series.id, token]);

  const tailorScriptToHook = async (dayNum: number, hookIdx: number) => {
    if (!token || !series.id) return;
    
    if (isTailoring[dayNum]) return;

    const targetDay = series.days.find((d: any) => d.day === dayNum);
    if (!targetDay) return;

    const existingScripts = Array.isArray(targetDay.scripts) ? targetDay.scripts : [];
    const existingScript = existingScripts[hookIdx] || '';
    const hasInitialScript = existingScripts[0] && existingScripts[0].length > 20;
    
    // Determine if we are generating for the first time OR tailoring
    const isInitialGeneration = !hasInitialScript || !targetDay.visuals;
    const needsTailoring = !isInitialGeneration && hookIdx > 0 && (!existingScript || existingScript === existingScripts[0]);

    if (!isInitialGeneration && !needsTailoring) return;

    try {
      setIsTailoring(prev => ({ ...prev, [dayNum]: true }));
      
      let updatedData: any = {};

      if (isInitialGeneration) {
        // Generate EVERYTHING for this day from skeleton
        const result = await generateDayContent(
          targetDay,
          profile,
          series,
          hookIdx,
          i18n.language || 'en'
        );
        updatedData = {
          script: result.script,
          visuals: result.visuals,
          caption: result.caption
        };
      } else {
        // Just tailor the hook
        const refinedScript = await refineScript(
          existingScripts[0], 
          targetDay.hooks[hookIdx],
          series.targetAudience,
          series.theme,
          i18n.language || 'en'
        );
        updatedData = {
          script: refinedScript,
          visuals: targetDay.visuals,
          caption: targetDay.captions?.[0] || targetDay.caption || ''
        };
      }

      const updatedSeries = JSON.parse(JSON.stringify(series));
      const dIdx = updatedSeries.days.findIndex((d: any) => d.day === dayNum);
      
      if (dIdx !== -1) {
        const day = updatedSeries.days[dIdx];
        if (!Array.isArray(day.scripts)) day.scripts = new Array(day.hooks?.length || 3).fill('');
        if (!Array.isArray(day.captions)) day.captions = new Array(day.hooks?.length || 3).fill('');
        
        day.scripts[hookIdx] = updatedData.script;
        day.visuals = updatedData.visuals;
        if (hookIdx === 0) {
          day.caption = updatedData.caption;
        }
        day.captions[hookIdx] = updatedData.caption;

        if (onSave) await onSave(updatedSeries);
      }
    } catch (err) {
      console.error("Content generation error:", err);
    } finally {
      setIsTailoring(prev => ({ ...prev, [dayNum]: false }));
    }
  };

  const handleNoteChange = (day: number, value: string) => {
    const updatedNotes = { ...dayNotes, [day]: value };
    setDayNotes(updatedNotes);
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(async () => {
      if (token && series.id) {
        setNotesSaving(true);
        try {
          await robustFetch(`/api/strategies/${series.id}/notes`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ day_notes: updatedNotes })
          });
          const updatedSeries = { ...series, day_notes: updatedNotes };
          sessionStorage.setItem('selectedSeries', JSON.stringify(updatedSeries));
        } catch (err) {
          console.error("Failed to save note:", err);
        } finally {
          setNotesSaving(false);
        }
      }
    }, 1500);
  };

  const handleRegenerateDay = async () => {
    if (!regenerateIdea.trim() || !token || !series.id) return;
    
    setIsRegenerating(true);
    setRegenerateError(null);
    
    try {
      const regeneratedDayContent = await regenerateDayContentWithIdea(
        activeDay,
        regenerateIdea,
        profile,
        series,
        i18n.language || 'en'
      );
      
      const updatedSeries = JSON.parse(JSON.stringify(series));
      const dIdx = updatedSeries.days.findIndex((d: any) => d.day === activeDay);
      
      if (dIdx !== -1) {
        // Merge the regenerated content
        updatedSeries.days[dIdx] = {
          ...updatedSeries.days[dIdx],
          ...regeneratedDayContent,
          visuals: regeneratedDayContent.visuals_list?.[0] || updatedSeries.days[dIdx].visuals
        };
        
        // Reset hook index to 0 for the newly generated day
        setHookIndices(prev => ({ ...prev, [activeDay]: 0 }));
        
        if (onSave) await onSave(updatedSeries);
        
        setShowRegenerateModal(false);
        setRegenerateIdea('');
      } else {
        setRegenerateError("Could not find the current day to update.");
      }
    } catch (err: any) {
      console.error("Failed to regenerate day:", err);
      let errorMsg = err.message || "Failed to regenerate day. Please try again.";
      if (errorMsg.includes('503') || errorMsg.includes('high demand')) {
        errorMsg = "The AI is currently processing many requests. Please wait a moment and try again.";
      }
      setRegenerateError(errorMsg);
    } finally {
      setIsRegenerating(false);
    }
  };

  // Save edited script and create version snapshot
  const saveScriptEdit = async () => {
    if (!editingScript || !token || !series.id) return;
    try {
      // Count paragraphs in old and new scripts
      const oldScript = series.days[editingScript.day - 1].scripts[editingScript.hook];
      const oldParagraphs = oldScript.split('\n\n').filter((p: string) => p.trim()).length;
      const newParagraphs = editedScriptText.split('\n\n').filter((p: string) => p.trim()).length;
      
      // Regenerate storyboard if paragraph count changed
      let updatedVisuals = currentDay.visuals;
      if (oldParagraphs !== newParagraphs) {
        const oldVisuals = currentDay.visuals.split('\n');
        const newVisuals: string[] = [];
        for (let i = 0; i < newParagraphs; i++) {
          // Keep existing creator actions if available, otherwise empty
          newVisuals.push(oldVisuals[i] || '');
        }
        updatedVisuals = newVisuals.join('\n');
      }
      
      await robustFetch(`/api/strategies/${series.id}/script`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          day_number: editingScript.day,
          hook_index: editingScript.hook,
          new_script: editedScriptText
        })
      });
      // Update local series data
      const updatedSeries = { ...series };
      updatedSeries.days[editingScript.day - 1].scripts[editingScript.hook] = editedScriptText;
      updatedSeries.days[editingScript.day - 1].visuals = updatedVisuals;
      sessionStorage.setItem('selectedSeries', JSON.stringify(updatedSeries));
      setEditingScript(null);
    } catch (err) {
      console.error("Failed to save script:", err);
    }
  };

  // Fetch version history for a script
  const fetchVersionHistory = async (day: number, hook: number) => {
    if (!token || !series.id) return;
    try {
      setVersionHistorySaving(true);
      const res = await robustFetch(`/api/strategies/${series.id}/script-versions?day=${day}&hook=${hook}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await safeJson(res);
        setScriptVersions(data.versions || []);
        setShowVersionHistory({ day, hook });
      }
    } catch (err) {
      console.error("Failed to fetch versions:", err);
    } finally {
      setVersionHistorySaving(false);
    }
  };

  // Restore a previous script version
  const restoreVersion = async (versionId: number) => {
    if (!editingScript && !showVersionHistory || !token || !series.id) return;
    const target = showVersionHistory || editingScript;
    if (!target) return;
    try {
      await robustFetch(`/api/strategies/${series.id}/script-versions/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          version_id: versionId,
          day_number: target.day,
          hook_index: target.hook
        })
      });
      // Refresh the series
      const res = await robustFetch(`/api/strategies/${series.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await safeJson(res);
        sessionStorage.setItem('selectedSeries', JSON.stringify(data));
        setShowVersionHistory(null);
        await fetchVersionHistory(target.day, target.hook);
      }
    } catch (err) {
      console.error("Failed to restore version:", err);
    }
  };
  
  const completionTasks = [
    { id: 'social', label: 'Shared on social media' },
    { id: 'community', label: 'Posted in community' },
    { id: 'engage', label: 'Engaged with 3+ creators' }
  ];
  
  const toggleTaskCheckbox = (day: number, taskId: string) => {
    const updatedChecklist = {
      ...dayChecklist,
      [day]: {
        ...dayChecklist[day],
        [taskId]: !dayChecklist[day]?.[taskId]
      }
    };
    
    setDayChecklist(updatedChecklist);
    
    // Save progress to server
    if (token && series.id) {
      robustFetch(`/api/strategies/${series.id}/progress`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ completed_days: completedDays, day_checklist: updatedChecklist })
      })
      .then(() => {
        const updatedSeries = { ...series, day_checklist: updatedChecklist };
        sessionStorage.setItem('selectedSeries', JSON.stringify(updatedSeries));
      })
      .catch(err => console.error("Failed to save checklist progress:", err));
    }
    
    // Check if all tasks are now completed
    const allChecked = completionTasks.every(task => updatedChecklist[day]?.[task.id]);
    
    if (allChecked) {
      // Close modal and show confetti
      setShowChecklistModal(false);
      setShowConfetti(true);
      // Play confetti for 2 seconds, then advance
      setTimeout(() => {
        setShowConfetti(false);
        toggleDayComplete(day);
      }, 2000);
    }
  };
  
  const getDayChecklistStatus = (day: number) => {
    const checklist = dayChecklist[day] || {};
    return {
      checklist,
      allChecked: completionTasks.every(task => checklist[task.id]),
      checkedCount: completionTasks.filter(task => checklist[task.id]).length
    };
  };
  const currentDay = series.days.find((d: any) => d.day === activeDay) || series.days[0];

  const currentHookIndex = hookIndices[activeDay] || 0;
  
  // Robust data extraction with type checking and length validation
  const getDisplayContent = () => {
    // 1. Resolve Hooks
    let displayHook = '';
    if (Array.isArray(currentDay.hooks)) {
      displayHook = currentDay.hooks[currentHookIndex] || currentDay.hooks[0] || '';
    } else {
      displayHook = currentDay.hook || '';
    }

    // 2. Resolve Scripts
    let displayScript = '';
    const scriptTemplate = Array.isArray(currentDay.scripts) 
      ? (currentDay.scripts[currentHookIndex] || currentDay.scripts[0] || '')
      : (currentDay.script || '');

    // Smart Swap for legacy strategies:
    // If we have multiple hooks but either only one script version or multiple identical scripts,
    // we swap the first paragraph of the script with the selected hook to ensure the UI updates.
    if (Array.isArray(currentDay.hooks) && currentDay.hooks.length > 1 && currentHookIndex > 0) {
      const existingScriptAtIdx = Array.isArray(currentDay.scripts) ? currentDay.scripts[currentHookIndex] : null;
      const firstScript = Array.isArray(currentDay.scripts) ? currentDay.scripts[0] : currentDay.script;
      
      // If we have a unique script for this hook already, it's not legacy
      const hasTailoredScript = existingScriptAtIdx && existingScriptAtIdx !== firstScript;
      
      if (!hasTailoredScript) {
        const selectedHook = currentDay.hooks[currentHookIndex];
        const paragraphs = scriptTemplate.split('\n\n');
        if (paragraphs.length > 0 && selectedHook) {
          // In our standard 6-part structure, paragraph 0 is the hook.
          // By replacing it, we dynamically update the script for old strategies while AI runs.
          paragraphs[0] = selectedHook;
          displayScript = paragraphs.join('\n\n');
        } else {
          displayScript = scriptTemplate;
        }
      } else {
        displayScript = scriptTemplate;
      }
    } else {
      displayScript = scriptTemplate;
    }

    // 3. Resolve Captions
    let displayCaption = '';
    if (Array.isArray(currentDay.captions)) {
      displayCaption = currentDay.captions[currentHookIndex] || currentDay.captions[0] || '';
    } else {
      displayCaption = currentDay.caption || '';
    }

    // 4. Resolve CTAs & Advice
    let displayCTA = profile.primaryCTA || currentDay.cta || '';
    let displayAdvice = '';
    
    if (Array.isArray(currentDay.ctas)) {
      displayAdvice = currentDay.ctas[currentHookIndex] || currentDay.ctas[0] || '';
    } else {
      displayAdvice = currentDay.cta || '';
    }

    // 5. Resolve Visuals (Creator Actions)
    let displayVisuals = '';
    if (Array.isArray(currentDay.visuals_list)) {
      displayVisuals = currentDay.visuals_list[currentHookIndex] || currentDay.visuals_list[0] || '';
    } else {
      displayVisuals = currentDay.visuals || '';
    }

    // --- Inject Dynamic CTA into script & visuals (Applies to ALL challenges old and new) ---
    const getCTAKeyword = () => {
      const offer = profile?.primaryCTA || series?.targetAudience || "my offer";
      const stopWords = ['THIS', 'THAT', 'WITH', 'FROM', 'YOUR', 'WHAT', 'HOW', 'ABOUT', 'THE', 'AND', 'FOR', 'GET'];
      const words = offer.split(' ');
      for (let w of words) {
        const clean = w.toUpperCase().replace(/[^A-Z]/g, '');
        if (clean.length >= 3 && clean.length <= 10 && !stopWords.includes(clean)) {
          return clean;
        }
      }
      return 'LINK';
    };
    
    const keyword = getCTAKeyword();
    const ctaOfferText = profile?.primaryCTA || series?.targetAudience || "this resource";
    const ctaContent = `And if you're interested in taking this further, comment "${keyword}" below and I'll send you the link to ${ctaOfferText}!`;
    const ctaVisualLine = `Action: Creator points down to the comments. On-screen text: "Comment ${keyword}"`;

    const hasCTA = displayScript.includes(ctaContent) || displayScript.toLowerCase().includes('comment "') || displayScript.toLowerCase().includes('comment below');
    
    if (!hasCTA) {
      let scriptParts = displayScript.split(/\n\n+/).filter((p: string) => p.trim());
      let visualParts = displayVisuals.split('\n').filter((l: string) => l.trim());
      
      if (scriptParts.length > 0) {
        scriptParts.push(ctaContent);
        
        if (visualParts.length > 0) {
          visualParts.push(ctaVisualLine);
        }
        
        displayScript = scriptParts.join('\n\n');
        displayVisuals = visualParts.join('\n');
      }
    }

    return { displayHook, displayScript, displayCaption, displayCTA, displayAdvice, displayVisuals };
  };

  const { displayHook, displayScript, displayCaption, displayCTA, displayAdvice, displayVisuals } = getDisplayContent();

  const startDate = series.start_date ? new Date(series.start_date.replace(/-/g, '/')) : null;

  useEffect(() => {
    if (token) {
      robustFetch('/api/community/membership', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setMembership(data))
      .catch(err => console.error("Failed to fetch membership:", err));
    }
  }, [token]);

  const getDayDate = (dayNumber: number) => {
    if (!startDate) return null;
    const date = new Date(startDate);
    date.setDate(date.getDate() + (dayNumber - 1));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const toggleDayComplete = async (day: number) => {
    const isMarking = !completedDays.includes(day);
    const newCompleted = isMarking
      ? [...completedDays, day]
      : completedDays.filter(d => d !== day);
    
    setCompletedDays(newCompleted);

    // Auto-advance to next day when marking as done
    if (isMarking && day < 30) {
      setActiveDay(day + 1);
    }

    if (token && series.id) {
      try {
        await robustFetch(`/api/strategies/${series.id}/progress`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ completed_days: newCompleted, day_checklist: dayChecklist })
        });
        const updatedSeries = { ...series, completed_days: newCompleted };
        sessionStorage.setItem('selectedSeries', JSON.stringify(updatedSeries));
      } catch (error) {
        console.error("Failed to sync progress:", error);
      }
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: series.title,
      text: `Check out my 30-day content challenge: ${series.title}`,
      url: window.location.href
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        throw new Error('Web Share API not supported or data not shareable');
      }
    } catch (err: any) {
      // Silently handle user cancellation
      if (err.name === 'AbortError') {
        return;
      }
      
      // Fallback to clipboard for any other error or if Web Share is unavailable
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      } catch (clipErr) {
        console.error("Clipboard fallback failed:", clipErr);
      }
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const addPageIfNeeded = (needed: number = 20) => {
        if (y + needed > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
      };

      // Cover section
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, pageWidth, 45, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text(series.title, margin, 20);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`30-Day Content Challenge  •  ${completedDays.length}/30 days completed`, margin, 30);
      if (series.start_date) {
        doc.text(`Started: ${new Date(series.start_date.replace(/-/g, '/')).toLocaleDateString()}`, margin, 38);
      }
      y = 55;

      // Description
      doc.setTextColor(60, 60, 80);
      doc.setFontSize(11);
      doc.setFont("helvetica", "italic");
      const splitDesc = doc.splitTextToSize(series.description || '', contentWidth);
      doc.text(splitDesc, margin, y);
      y += (splitDesc.length * 6) + 12;

      // Days
      series.days.forEach((day: any) => {
        addPageIfNeeded(50);

        const dayHook = day.hooks ? day.hooks[0] : day.hook;
        const dayScript = day.scripts ? day.scripts[0] : day.script;
        const isCompleted = completedDays.includes(day.day);
        const note = dayNotes[day.day];

        // Day header bar
        doc.setFillColor(isCompleted ? 209 : 238, isCompleted ? 250 : 238, isCompleted ? 229 : 255);
        doc.rect(margin - 3, y - 6, contentWidth + 6, 12, 'F');
        doc.setTextColor(isCompleted ? 5 : 67, isCompleted ? 150 : 56, isCompleted ? 105 : 202);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`Day ${day.day}${isCompleted ? '  ✓ Completed' : ''}`, margin, y);
        y += 10;

        // Hook
        doc.setTextColor(60, 60, 80);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Hook:", margin, y);
        y += 4;
        doc.setFont("helvetica", "normal");
        const splitHook = doc.splitTextToSize(dayHook || "", contentWidth);
        addPageIfNeeded(splitHook.length * 5 + 8);
        doc.text(splitHook, margin, y);
        y += (splitHook.length * 5) + 4;

        // Script
        doc.setFont("helvetica", "bold");
        doc.text("Script:", margin, y);
        y += 4;
        doc.setFont("helvetica", "normal");
        const splitScript = doc.splitTextToSize((dayScript || "").substring(0, 500), contentWidth);
        addPageIfNeeded(splitScript.length * 5 + 8);
        doc.text(splitScript, margin, y);
        y += (splitScript.length * 5) + 4;

        // Caption
        if (day.caption) {
          doc.setFont("helvetica", "bold");
          doc.text("Caption:", margin, y);
          y += 4;
          doc.setFont("helvetica", "normal");
          const splitCaption = doc.splitTextToSize(day.caption.substring(0, 300), contentWidth);
          addPageIfNeeded(splitCaption.length * 5 + 8);
          doc.text(splitCaption, margin, y);
          y += (splitCaption.length * 5) + 4;
        }

        // CTA
        if (day.cta) {
          doc.setFont("helvetica", "bold");
          doc.text("CTA:", margin, y);
          doc.setFont("helvetica", "normal");
          doc.text(` ${day.cta}`, margin + 10, y);
          y += 6;
        }

        // Journal note
        if (note && note.trim()) {
          addPageIfNeeded(20);
          doc.setFillColor(255, 251, 235);
          doc.rect(margin - 3, y - 3, contentWidth + 6, 6 + Math.ceil(note.length / 90) * 5, 'F');
          doc.setTextColor(120, 80, 0);
          doc.setFont("helvetica", "bold");
          doc.text("My Notes:", margin, y);
          y += 4;
          doc.setFont("helvetica", "normal");
          const splitNote = doc.splitTextToSize(note, contentWidth);
          doc.text(splitNote, margin, y);
          y += (splitNote.length * 5) + 4;
          doc.setTextColor(60, 60, 80);
        }

        y += 8;
      });

      doc.save(`${series.title.replace(/\s+/g, '_')}_30Day_Plan.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      // Fallback to print if PDF generation fails
      window.print();
    }
  };

  return (
    <>
      {showWizard && <StrategyWizard seriesId={series.id} onComplete={handleWizardComplete} />}

      {/* Achievements Modal */}
      <AnimatePresence>
        {showAchievements && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAchievements(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-zinc-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-display font-bold flex items-center gap-2">
                  <Trophy className="text-amber-500" size={28} />
                  Achievements
                </h2>
                <button
                  onClick={() => setShowAchievements(false)}
                  className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Unlocked Achievements */}
                {achievements.filter(a => a.unlocked_at).length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                      <Award size={16} className="text-amber-500" />
                      Unlocked ({achievements.filter(a => a.unlocked_at).length})
                    </h3>
                    <div className="space-y-3">
                      {achievements.filter(a => a.unlocked_at).map((ach: Achievement) => (
                        <div key={ach.id} className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                          <div className="flex items-start gap-3">
                            <span className="text-4xl flex-shrink-0">{ach.icon}</span>
                            <div className="flex-1">
                              <h4 className="font-bold text-amber-900">{ach.name_en}</h4>
                              <p className="text-sm text-amber-800">{ach.description_en}</p>
                              {ach.unlocked_at && (
                                <p className="text-xs text-amber-700 mt-2">
                                  Unlocked {new Date(ach.unlocked_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Locked Achievements */}
                {achievements.filter(a => !a.unlocked_at).length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">
                      Keep Going ({achievements.filter(a => !a.unlocked_at).length})
                    </h3>
                    <div className="space-y-3">
                      {achievements.filter(a => !a.unlocked_at).map((ach: Achievement) => (
                        <div key={ach.id} className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl opacity-50">
                          <div className="flex items-start gap-3">
                            <span className="text-4xl flex-shrink-0 grayscale">{ach.icon}</span>
                            <div className="flex-1">
                              <h4 className="font-bold text-zinc-700">{ach.name_en}</h4>
                              <p className="text-sm text-zinc-600">{ach.description_en}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-12 print:p-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 mb-8 sm:mb-12 print:hidden">
          <button onClick={onBack} className="flex items-center gap-2 text-on-surface-variant hover:text-primary mb-8 transition-all group font-headline font-bold uppercase tracking-widest text-[10px]">
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back to Strategies</span>
          </button>
        <div className="flex gap-4">
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-all text-sm font-semibold"
          >
            <Download size={18} />
            <span>{t('detail.exportPdf')}</span>
          </button>
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-all text-sm font-semibold"
          >
            <Share2 size={18} />
            <span>{t('detail.share')}</span>
          </button>
        </div>
      </div>

      {/* View mode toggle */}
      <div className="flex gap-2 mb-8 print:hidden">
        <button
          onClick={() => setDetailViewMode('day')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black font-headline uppercase tracking-widest transition-all",
            detailViewMode === 'day'
              ? "bg-primary text-white shadow-elegant signature-glow"
              : "border border-surface-container-highest text-on-surface-variant hover:bg-surface-container"
          )}
        >
          <NotebookPen size={15} />
          <span>Day View</span>
        </button>
        <button
          onClick={() => setDetailViewMode('calendar')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
            detailViewMode === 'calendar'
              ? "bg-brand-primary text-white shadow-sm"
              : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          )}
        >
          <Grid3X3 size={15} />
          <span>Calendar View</span>
        </button>
      </div>

      {detailViewMode === 'calendar' ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="p-10 md:p-12 rounded-[3.5rem] bg-on-surface text-white shadow-elegant shadow-black/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <h2 className="text-3xl md:text-5xl font-black font-headline mb-4 tracking-tighter">{series.title}</h2>
            <p className="text-white/60 leading-relaxed mb-8 max-w-2xl font-body font-light italic">{series.description}</p>
            <div className="flex flex-wrap items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <span className="text-primary font-black font-headline uppercase tracking-widest text-xs">{completedDays.length}/30 days completed</span>
              </div>
              {startDate && (
                <span className="text-white/50 text-sm">
                  Started {startDate.toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {series.days.map((day: any) => {
              const isCompleted = completedDays.includes(day.day);
              const dayHook = day.hooks ? day.hooks[0] : day.hook;
              const note = dayNotes[day.day];
              const dateStr = getDayDate(day.day);
              const isGenerating = !day.scripts || day.scripts.length === 0 || day.scripts[0] === "";
              return (
                <button
                  key={day.day}
                  onClick={() => { 
                    if (isGenerating) {
                      setError(`Day ${day.day} is still being generated. Please wait a moment.`);
                      setTimeout(() => setError(""), 3000);
                      return;
                    }
                    setActiveDay(day.day); 
                    setDetailViewMode('day'); 
                  }}
                  className={cn(
                    "text-left p-5 rounded-2xl border-2 transition-all hover:shadow-md group",
                    isGenerating
                      ? "border-dashed border-zinc-200 bg-zinc-50/50 opacity-60 cursor-not-allowed"
                      : isCompleted
                      ? "border-emerald-200 bg-emerald-50/50 hover:border-emerald-300"
                      : "border-zinc-100 bg-white hover:border-brand-primary/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0",
                      isGenerating ? "bg-zinc-200 text-zinc-400" : isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-brand-primary/10 text-brand-primary"
                    )}>
                      {isGenerating ? <Loader2 size={16} className="animate-spin" /> : day.day}
                    </div>
                    {isGenerating && <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Generating...</span>}
                    {isCompleted ? (
                      <div className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 size={13} />
                        <span className="text-xs font-bold">Done</span>
                      </div>
                    ) : (
                      !isGenerating && dateStr && <span className="text-xs text-zinc-400">{dateStr}</span>
                    )}
                  </div>
                  {dayHook && (
                    <p className={cn("text-xs font-medium leading-relaxed line-clamp-2 mb-2 transition-colors", isGenerating ? "text-zinc-400" : "text-zinc-700 group-hover:text-brand-primary")}>
                      {isGenerating && !dayHook ? 'Writing content script...' : dayHook}
                    </p>
                  )}
                  {note && note.trim() && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1 line-clamp-1 mt-1">
                      <span className="font-bold">Note: </span>{note}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 lg:gap-12">
        {/* Left Column: Sidebar Navigation */}
        <div className="lg:col-span-4 space-y-4 md:space-y-8">
          <div className="p-4 md:p-8 rounded-2xl md:rounded-[2rem] bg-brand-primary text-white shadow-2xl shadow-brand-primary/20">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">{series.title}</h2>
            <p className="text-white/60 leading-relaxed mb-6">{series.description}</p>
            <div className="flex items-center gap-4 text-white/80 font-semibold">
              <div className="flex items-center gap-2">
                <Instagram size={20} />
                <span>{t('detail.seriesLabel')}</span>
              </div>
              {startDate && (
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Calendar size={16} />
                  <span>{t('detail.starts')} {startDate.toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Achievements Section */}
          {achievements.some(a => a.unlocked_at) && (
            <div className="bg-white rounded-[2rem] border border-zinc-200 p-6">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <Trophy size={16} className="text-amber-500" />
                  Achievements
                </h3>
                <button
                  onClick={() => setShowAchievements(true)}
                  className="text-xs font-bold text-brand-primary hover:text-brand-secondary transition-colors"
                >
                  View All ({achievements.filter(a => a.unlocked_at).length})
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {achievements.filter(a => a.unlocked_at).slice(0, 4).map((ach: Achievement) => (
                  <div
                    key={ach.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-sm"
                    title={ach.description_en}
                  >
                    <span className="text-lg">{ach.icon}</span>
                    <span className="text-xs font-semibold text-amber-900">{ach.name_en}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-[2rem] border border-zinc-200 p-6">
            <div className="flex items-center justify-between mb-6 px-2">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">{t('detail.calendarRoadmap')}</h3>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                {completedDays.length}/30 {t('detail.done')}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-3 wizard-calendar">
              {series.days.map((day: any) => {
                const isCompleted = completedDays.includes(day.day);
                const dateStr = getDayDate(day.day);
                const isGenerating = !day.scripts || day.scripts.length === 0 || day.scripts[0] === "";
                return (
                  <button
                    key={day.day}
                    onClick={() => {
                      if (isGenerating) {
                        setError(`Day ${day.day} is still being generated. Please wait a moment.`);
                        setTimeout(() => setError(""), 3000);
                        return;
                      }
                      setActiveDay(day.day);
                    }}
                    className={cn(
                      "relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all",
                      isGenerating
                        ? "bg-zinc-50 text-zinc-300 cursor-not-allowed border border-dashed border-zinc-200"
                        : activeDay === day.day 
                        ? "bg-zinc-900 text-white shadow-lg shadow-zinc-900/20 scale-110 z-10" 
                        : isCompleted
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : "bg-zinc-50 text-zinc-400 hover:bg-zinc-100"
                    )}
                  >
                    {isGenerating ? (
                      <Loader2 size={18} className="animate-spin text-zinc-400" />
                    ) : (
                      <>
                        <span className="text-sm font-bold">{day.day}</span>
                        {dateStr && <span className={cn("text-[10px] font-bold mt-0.5", activeDay === day.day ? "text-white/90" : "text-zinc-500")}>{dateStr}</span>}
                        {isCompleted && activeDay !== day.day && (
                          <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                            <CheckCircle2 size={10} />
                          </div>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Content Detail */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeDay}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-3xl md:rounded-[2.5rem] border border-zinc-200 shadow-sm overflow-hidden"
            >
              <div className="p-4 sm:p-6 md:p-12">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-6 md:mb-10">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className={cn(
                      "w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl flex flex-shrink-0 items-center justify-center font-display font-bold text-xl sm:text-2xl transition-colors",
                      completedDays.includes(activeDay) ? "bg-emerald-100 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                    )}>
                      {activeDay}
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className="text-xl sm:text-2xl font-display font-bold truncate">{t('detail.dayContent', { day: activeDay })}</h3>
                      <p className="text-xs sm:text-sm text-zinc-500 truncate">{getDayDate(activeDay) || t('detail.reelStrategy')}</p>
                      {displayScript && (
                        <p className="text-sm text-zinc-600 font-medium mt-2 line-clamp-2 xl:line-clamp-3">
                          {displayScript.split('\n')[0].substring(0, 100)}...
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons: Positioned to the right on desktop, prominent Complete button */}
                  <div className="flex flex-row items-center gap-2 sm:gap-3 shrink-0">
                    <button
                      onClick={() => setShowRegenerateModal(true)}
                      className="flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-all text-zinc-500 hover:text-zinc-700"
                      title="Not happy with this topic? Redo this entire day."
                    >
                      <Sparkles size={16} className="flex-shrink-0 opacity-70" />
                      <span className="hidden sm:inline text-sm font-semibold">Regenerate</span>
                    </button>
                    
                    {completedDays.includes(activeDay) ? (
                      <div className="flex items-center gap-2 px-4 py-2.5 sm:py-3 rounded-xl bg-emerald-100 border-2 border-emerald-200 text-emerald-700 font-bold text-sm cursor-default">
                        <CheckCircle2 size={18} className="flex-shrink-0" />
                        <span>Done!</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowChecklistModal(true)}
                        className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5 shadow-lg shadow-indigo-600/20 text-white transition-all group"
                      >
                        <CheckCircle2 size={18} className="text-indigo-200 group-hover:text-white transition-colors flex-shrink-0" />
                        <span className="text-sm font-bold">Complete Day</span>
                        <div className="bg-indigo-900/30 px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold text-white ml-1">
                          {Math.round((getDayChecklistStatus(activeDay).checkedCount / 3) * 100)}%
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {/* Regenerate Day Modal */}
                <AnimatePresence>
                  {showRegenerateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
                      >
                        <div className="p-8">
                          <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-display font-bold text-zinc-900 flex items-center gap-2">
                              <Sparkles size={20} className="text-brand-primary" />
                              Regenerate Day {activeDay}
                            </h2>
                            <button
                              onClick={() => { setShowRegenerateModal(false); setRegenerateError(null); }}
                              disabled={isRegenerating}
                              className="text-zinc-400 hover:text-zinc-600 transition-colors disabled:opacity-50"
                            >
                              <X size={24} />
                            </button>
                          </div>
                          
                          <p className="text-sm text-zinc-600 mb-6 font-medium">
                            Not happy with this day's topic? Give the AI a new idea or direction, and it will rewrite the hooks, scripts, and captions for today.
                          </p>
                          
                          <textarea
                            value={regenerateIdea}
                            onChange={e => setRegenerateIdea(e.target.value)}
                            placeholder="e.g., Make this day about common beginner mistakes instead of advanced tips..."
                            className="w-full h-32 px-4 py-3 rounded-xl border border-zinc-200 focus:border-brand-primary outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all resize-none mb-4 text-sm"
                            disabled={isRegenerating}
                          />
                          
                          {regenerateError && (
                            <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm flex items-start gap-2">
                              <ShieldAlert size={16} className="mt-0.5 flex-shrink-0" />
                              <p className="font-semibold">{regenerateError}</p>
                            </div>
                          )}
                          
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => { setShowRegenerateModal(false); setRegenerateError(null); }}
                              disabled={isRegenerating}
                              className="px-6 py-2.5 rounded-xl font-bold text-zinc-600 hover:bg-zinc-100 transition-all disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleRegenerateDay}
                              disabled={isRegenerating || !regenerateIdea.trim()}
                              className="px-6 py-2.5 rounded-xl font-bold bg-brand-primary text-white hover:bg-brand-secondary transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                              {isRegenerating ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  Rewriting...
                                </>
                              ) : (
                                'Regenerate Now'
                              )}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Checklist Modal */}
                {showChecklistModal && !completedDays.includes(activeDay) && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
                    >
                      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100 px-8 py-6">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-xl font-display font-bold text-zinc-900">Complete Day {activeDay}</h2>
                          <button
                            onClick={() => setShowChecklistModal(false)}
                            className="text-zinc-400 hover:text-zinc-600 transition-colors"
                          >
                            <X size={24} />
                          </button>
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1 h-2 bg-zinc-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-brand-primary to-emerald-500 transition-all duration-300"
                              style={{ width: `${Math.round((getDayChecklistStatus(activeDay).checkedCount / 3) * 100)}%` }}
                            />
                          </div>
                          <span className="text-lg font-bold text-brand-primary">{Math.round((getDayChecklistStatus(activeDay).checkedCount / 3) * 100)}%</span>
                        </div>
                      </div>

                      <div className="p-8 space-y-6">
                        {completionTasks.map(task => (
                          <div key={task.id} className="flex items-center justify-between">
                            <span className="text-sm font-medium text-zinc-700">{task.label}</span>
                            {/* Switch toggle */}
                            <button
                              onClick={() => toggleTaskCheckbox(activeDay, task.id)}
                              className={cn(
                                "relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0",
                                dayChecklist[activeDay]?.[task.id]
                                  ? "bg-emerald-500 shadow-lg shadow-emerald-500/30"
                                  : "bg-zinc-300 hover:bg-zinc-400"
                              )}
                            >
                              <div
                                className={cn(
                                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md",
                                  dayChecklist[activeDay]?.[task.id] ? "right-1" : "left-1"
                                )}
                              />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="bg-zinc-50 px-8 py-5 border-t border-zinc-100 flex flex-col items-center gap-3">
                        <p className="text-xs text-zinc-600 text-center font-medium">
                          Join our Discord community to share and discuss your progress
                        </p>
                        <a
                          href="https://discord.com/channels/1304090086371102832/1480976694234845226"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-brand-primary hover:text-brand-secondary transition-colors"
                        >
                          Join the Community →
                        </a>
                      </div>
                    </motion.div>
                  </div>
                )}

                {showConfetti && (
                  <Confetti />
                )}

                <div className="space-y-8 md:space-y-10">
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Zap size={18} className="text-brand-primary" />
                        <div>
                          <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400">{t('detail.hookLabel', { index: currentHookIndex + 1 })}</h4>
                            {currentDay.hooks && currentDay.hooks.length > 1 && (
                              <p className="text-xs text-zinc-400 mt-0.5">Choose a different angle ↓</p>
                            )}
                          </div>
                        </div>
                        {currentDay.hooks && Array.isArray(currentDay.hooks) && currentDay.hooks.length > 1 && (
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1.5 p-1 bg-zinc-100/50 rounded-full border border-zinc-200/50">
                              {currentDay.hooks.map((_: any, idx: number) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    const nextIdx = idx;
                                    setHookIndices(prev => ({ ...prev, [activeDay]: nextIdx }));
                                    // If editing, close editor to prevent confusion
                                    if (editingScript) setEditingScript(null);
                                    // Pre-generated content should already exist
                                  }}
                                  className={cn(
                                    "w-3.5 h-3.5 rounded-full transition-all shadow-sm",
                                    currentHookIndex === idx 
                                      ? "bg-brand-primary scale-110 shadow-brand-primary/20" 
                                      : "bg-zinc-300 hover:bg-zinc-400"
                                  )}
                                  title={`Switch to Hook Version ${idx + 1}`}
                                />
                              ))}
                            </div>
                            <div className="flex gap-1 ml-1">
                              <button 
                                onClick={() => {
                                  const nextIdx = Math.max(0, currentHookIndex - 1);
                                  setHookIndices(prev => ({ ...prev, [activeDay]: nextIdx }));
                                  if (editingScript) setEditingScript(null);
                                }}
                                disabled={currentHookIndex === 0}
                                className="p-1 rounded-full bg-white border border-zinc-200 text-zinc-400 hover:text-brand-primary hover:border-brand-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                              >
                                <ChevronLeft size={16} />
                              </button>
                              <button 
                                onClick={() => {
                                  const nextIdx = Math.min((currentDay.hooks?.length || 1) - 1, currentHookIndex + 1);
                                  setHookIndices(prev => ({ ...prev, [activeDay]: nextIdx }));
                                  if (editingScript) setEditingScript(null);
                                }}
                                disabled={currentHookIndex === (currentDay.hooks?.length || 1) - 1}
                                className="p-1 rounded-full bg-white border border-zinc-200 text-zinc-400 hover:text-brand-primary hover:border-brand-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                              >
                                <ArrowRight size={16} />
                              </button>
                            </div>
                          </div>
                        )}
                    </div>
                    <div className="relative group wizard-hooks">
                      <div className="p-4 md:p-8 rounded-2xl md:rounded-3xl bg-zinc-50 border border-zinc-100 text-lg md:text-xl font-medium leading-relaxed italic text-zinc-800 shadow-inner">
                        <span className="text-brand-primary opacity-20 text-3xl md:text-4xl absolute top-3 left-3 md:top-4 md:left-4 font-serif">"</span>
                        <div className="px-2 md:px-4">
                          {displayHook}
                        </div>
                        <span className="text-brand-primary opacity-20 text-3xl md:text-4xl absolute bottom-3 right-3 md:bottom-4 md:right-4 font-serif">"</span>
                      </div>
                      
                      {/* Floating Navigation Arrows for "Swiping" feel */}
                      {currentDay.hooks && (
                        <>
                          {currentHookIndex > 0 && (
                            <button 
                              onClick={() => {
                                const nextIdx = currentHookIndex - 1;
                                setHookIndices(prev => ({ ...prev, [activeDay]: nextIdx }));
                              }}
                              className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-zinc-200 shadow-lg flex items-center justify-center text-zinc-400 hover:text-brand-primary hover:border-brand-primary transition-all z-10 hidden md:flex"
                            >
                              <ChevronLeft size={20} />
                            </button>
                          )}
                          {currentHookIndex < (currentDay.hooks.length - 1) && (
                            <button 
                              onClick={() => {
                                const nextIdx = currentHookIndex + 1;
                                setHookIndices(prev => ({ ...prev, [activeDay]: nextIdx }));
                              }}
                              className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-zinc-200 shadow-lg flex items-center justify-center text-zinc-400 hover:text-brand-primary hover:border-brand-primary transition-all z-10 hidden md:flex"
                            >
                              <ArrowRight size={20} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </section>

                  <section>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 mb-4">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-brand-primary flex-shrink-0" />
                        <h4 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-zinc-400">
                          {viewMode === 'carousel' ? 'Carousel Slides' : t('detail.scriptLabel')}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto">
                        {/* Reel/Carousel toggle */}
                        <div className="flex rounded-lg overflow-hidden border border-zinc-200 wizard-viewmode">
                          <button
                            onClick={() => setViewMode('reel')}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all",
                              viewMode === 'reel'
                                ? "bg-brand-primary text-white"
                                : "bg-white text-zinc-600 hover:bg-zinc-50"
                            )}
                          >
                            <Video size={13} />
                            <span>Reel</span>
                          </button>
                          <button
                            onClick={() => setViewMode('carousel')}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all border-l border-zinc-200",
                              viewMode === 'carousel'
                                ? "bg-brand-primary text-white"
                                : "bg-white text-zinc-600 hover:bg-zinc-50"
                            )}
                          >
                            <LayoutGrid size={13} />
                            <span>Carousel</span>
                          </button>
                        </div>
                        {/* Storyboard toggle — works for both reel and carousel */}
                        <button
                          onClick={() => setShowStoryboard(!showStoryboard)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all wizard-storyboard",
                            showStoryboard
                              ? "bg-brand-primary text-white"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                          )}
                        >
                          <Video size={14} />
                          <span>{showStoryboard ? t('detail.hideStoryboard') : t('detail.showStoryboard')}</span>
                        </button>
                      </div>
                    </div>

                    {viewMode === 'carousel' ? (
                      /* ── CAROUSEL VIEW ── */
                      <div className="space-y-4">
                        {/* Cover slide */}
                        <div className={`rounded-2xl border-2 overflow-hidden ${showStoryboard ? 'border-brand-primary/50 bg-brand-primary/8' : 'border-brand-primary/20 bg-brand-primary/5'}`}>
                          <div className="flex items-center justify-between px-4 py-2 bg-brand-primary/10 border-b border-brand-primary/20">
                            <span className="text-xs font-bold text-brand-primary uppercase tracking-widest">Slide 1 — Cover</span>
                            {showStoryboard && (
                              <span className="text-xs font-bold px-2 py-1 rounded-full bg-brand-primary text-white uppercase tracking-widest">🎣 Hook</span>
                            )}
                          </div>
                          <div className={`p-4 md:p-6 ${showStoryboard ? 'grid md:grid-cols-2 gap-4' : ''}`}>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Copy on screen</p>
                              <p className="text-base md:text-lg font-semibold text-zinc-900 leading-snug">"{displayHook}"</p>
                            </div>
                            {showStoryboard && (
                              <div className="md:border-l md:border-brand-primary/20 md:pl-4">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <ImageIcon size={13} className="text-brand-primary" />
                                  <p className="text-xs font-bold uppercase tracking-widest text-brand-primary">Image / Illustration</p>
                                </div>
                                <p className="text-sm text-zinc-600 italic">Bold title card with hook text overlaid on a colorful or brand-colored background. Use a striking visual or gradient.</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Content slides — one per script paragraph */}
                        {isTailoring[activeDay] ? (
                          <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border-2 border-dashed border-brand-primary/20">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              className="mb-4"
                            >
                              <Zap size={40} className="text-brand-primary fill-brand-primary/20" />
                            </motion.div>
                            <h3 className="text-lg font-bold text-zinc-900 mb-1">Tailoring Script...</h3>
                            <p className="text-sm text-zinc-500">Adapting the full script structure to your new hook angle ✨</p>
                          </div>
                        ) : (
                          (() => {
                            const splitParts = (text: string) => {
                              if (!text) return [];
                              let p = text.split(/\n\n+/).filter(p => p.trim());
                              if (p.length >= 6) return p;
                              const numbered = text.split(/\n(?=\d+\.)/).filter(p => p.trim());
                              if (numbered.length >= 6) return numbered;
                              const single = text.split(/\n+/).filter(p => p.trim());
                              if (single.length >= 6) return single;
                              return p;
                            };

                            const generateImg = (text: string) => {
                              const lower = text.toLowerCase();
                              if (lower.includes('sell') || lower.includes('selling')) return 'A handshake, two hands connecting, or illustration of helping/partnership';
                              if (lower.includes('money') || lower.includes('price')) return 'Dollar sign, coins, or abstract wealth/growth visualization';
                              if (lower.includes('connection') || lower.includes('connect')) return 'Network nodes, interconnected circles, or bridges';
                              if (lower.includes('value') || lower.includes('valuable')) return 'Gem, star, or upward arrow symbolizing worth';
                              if (lower.includes('audience') || lower.includes('customer')) return 'People/crowd illustration, megaphone, or group silhouettes';
                              if (lower.includes('trust') || lower.includes('believe')) return 'Heart, shield, or lock symbolizing security/trust';
                              if (lower.includes('transform') || lower.includes('change')) return 'Butterfly, growth plant, or ascending path/arrow';
                              if (lower.includes('problem') || lower.includes('solve')) return 'Lightbulb, puzzle piece, or check mark';
                              return 'Relevant infographic, icon, or illustration matching the concept';
                            };

                            const scriptParts = splitParts(displayScript);

                            return scriptParts.map((paragraph: string, idx: number) => {
                              const imageSuggestion = generateImg(paragraph);
                              const storyboardLines = displayVisuals.split('\n').filter(l => l.trim());
                              const storyboardForParagraph = storyboardLines[idx] || (storyboardLines.length > 0 ? storyboardLines[0] : "");
                              
                              const isCtaCheck = (p: string) => {
                                  const l = p.toLowerCase();
                                  return l.includes('comment "') || l.includes("comment '") || (l.includes('comment ') && l.includes('below')) || l.includes('dm me');
                              };
                              const isCTA = isCtaCheck(paragraph);
                              const nonCtaIdx = scriptParts.slice(0, idx).filter((p: string) => !isCtaCheck(p)).length;
                              
                              let sectionLabel, bgColor, textColor, tagBgColor;
                              
                              if (isCTA) {
                                  sectionLabel = '📲 CALL TO ACTION';
                                  bgColor = 'bg-rose-50';
                                  textColor = 'text-rose-900';
                                  tagBgColor = 'bg-rose-500';
                              } else {
                                  const sl = ['🎣 HOOK', '🤝 RELATE & SET UP THE PROBLEM', '💡 THE TURNING POINT', '⚡ THE STRUGGLE', '🎯 THE BIG LESSON', '✅ THE RESULT'];
                                  const bg = ['bg-purple-50', 'bg-blue-50', 'bg-amber-50', 'bg-orange-50', 'bg-green-50', 'bg-emerald-50'];
                                  const tc = ['text-purple-900', 'text-blue-900', 'text-amber-900', 'text-orange-900', 'text-green-900', 'text-emerald-900'];
                                  const tbg = ['bg-purple-500', 'bg-blue-500', 'bg-amber-500', 'bg-orange-500', 'bg-green-500', 'bg-emerald-500'];
                                  
                                  const cur = Math.min(nonCtaIdx, sl.length - 1);
                                  sectionLabel = sl[cur];
                                  bgColor = bg[cur];
                                  textColor = tc[cur];
                                  tagBgColor = tbg[cur];
                              }

                              return (
                                <div key={idx} className="space-y-4">
                                  <div className="flex flex-col h-full bg-white rounded-3xl overflow-hidden border border-zinc-100 shadow-sm">
                                    <div className={`p-4 text-center font-bold text-xs uppercase tracking-widest ${bgColor} ${textColor} border-b border-zinc-100`}>
                                      Slide {idx + 2} — {sectionLabel.replace(/^[^\s]+\s/, '')}
                                    </div>
                                    <div className="flex-1 p-4 md:p-8 flex flex-col justify-center">
                                      <div className={`rounded-2xl border-2 overflow-hidden ${showStoryboard ? `border-brand-primary/50 ${bgColor}` : 'border-zinc-200 bg-white'}`}>
                                        <div className={`flex items-center justify-between px-4 py-2 border-b ${showStoryboard ? 'border-brand-primary/20 bg-white/40' : 'border-zinc-100 bg-zinc-50'}`}>
                                          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Post Content</span>
                                          {showStoryboard && (
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${tagBgColor} text-white uppercase tracking-widest`}>
                                              {sectionLabel}
                                            </span>
                                          )}
                                        </div>
                                        <div className={`p-4 md:p-6 ${showStoryboard ? 'grid md:grid-cols-2 gap-4' : ''}`}>
                                          <div>
                                            <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${showStoryboard ? textColor : 'text-zinc-400'}`}>Copy on screen</p>
                                            <p className={`text-sm md:text-base leading-relaxed ${showStoryboard ? textColor : 'text-zinc-800'}`}>{paragraph}</p>
                                          </div>
                                          {showStoryboard && (
                                            <div className="md:border-l md:border-current/20 md:pl-4">
                                              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Visual Direction</p>
                                              <p className={`text-sm italic mb-4 ${textColor}`}>{imageSuggestion}</p>
                                              {storyboardForParagraph && (
                                                <div className="mt-3 p-2 rounded-lg bg-white/60 border-l-2 border-dashed border-current/30 text-xs">
                                                  <div className="flex items-start gap-2">
                                                    <span>🎬</span>
                                                    <p className={textColor}>{storyboardForParagraph}</p>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            });
                          })()
                        )}

                      </div>
                    ) : (
                      /* ── REEL VIEW ── */
                      <div className="space-y-3">
                        {editingScript && editingScript.day === activeDay && editingScript.hook === currentHookIndex ? (
                          <div className="space-y-3">
                            <textarea
                              value={editedScriptText}
                              onChange={(e) => setEditedScriptText(e.target.value)}
                              className="w-full p-3 md:p-6 rounded-xl md:rounded-2xl bg-white border-2 border-brand-primary/30 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 outline-none text-base md:text-lg leading-relaxed font-sans resize-none min-h-[200px]"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={saveScriptEdit}
                                className="flex-1 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition-all"
                              >
                                Save Edit
                              </button>
                              <button
                                onClick={() => setEditingScript(null)}
                                className="flex-1 px-4 py-2 rounded-lg border border-zinc-200 text-zinc-700 font-semibold hover:bg-zinc-50 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex gap-2 mb-3">
                              <button
                                onClick={() => {
                                  setEditingScript({ day: activeDay, hook: currentHookIndex });
                                  setEditedScriptText(displayScript);
                                }}
                                disabled={isTailoring[activeDay]}
                                className={cn(
                                  "flex items-center gap-1 px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 transition-all text-sm font-medium text-zinc-700",
                                  isTailoring[activeDay] ? "opacity-50 cursor-not-allowed" : "hover:border-brand-primary/50 hover:bg-brand-primary/5"
                                )}
                                title="Edit script"
                              >
                                <Edit2 size={14} />
                                Edit
                              </button>
                              <button
                                onClick={() => setShowTeleprompter(true)}
                                disabled={isTailoring[activeDay]}
                                className={cn(
                                  "flex items-center gap-1 px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 transition-all text-sm font-medium text-zinc-700",
                                  isTailoring[activeDay] ? "opacity-50 cursor-not-allowed" : "hover:border-brand-primary/50 hover:bg-brand-primary/5"
                                )}
                                title="Teleprompter mode"
                              >
                                <Play size={14} />
                                Teleprompter
                              </button>
                              <button
                                onClick={() => fetchVersionHistory(activeDay, currentHookIndex)}
                                disabled={isTailoring[activeDay]}
                                className={cn(
                                  "flex items-center gap-1 px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 transition-all text-sm font-medium text-zinc-700",
                                  isTailoring[activeDay] ? "opacity-50 cursor-not-allowed" : "hover:border-brand-primary/50 hover:bg-brand-primary/5"
                                )}
                                title="Version history"
                              >
                                <History size={14} />
                                History
                              </button>
                            </div>
                            <div className="p-3 md:p-6 rounded-xl md:rounded-2xl bg-zinc-50 border border-zinc-100 text-base md:text-lg leading-relaxed whitespace-pre-wrap font-sans">
                              {isTailoring[activeDay] ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    className="mb-4"
                                  >
                                    <Zap size={32} className="text-brand-primary" />
                                  </motion.div>
                                  <p className="text-sm font-bold text-zinc-900 mb-1">Adapting entire script...</p>
                                  <p className="text-xs text-zinc-500">Rewriting narrative for hook: "{displayHook}"</p>
                                </div>
                              ) : showStoryboard ? (
                                <div className="space-y-3">
                                  {(() => {
                                    const parts = displayScript.split(/\n\n+/).filter(p => p.trim());
                                    const splitParts = parts.length >= 6 ? parts : 
                                                       (displayScript.split(/\n(?=\d+\.)/).length >= 6 ? displayScript.split(/\n(?=\d+\.)/) : 
                                                       (displayScript.split(/\n/).length >= 6 ? displayScript.split(/\n/) : parts));
                                    
                                    return splitParts.filter(p => p.trim()).map((paragraph: string, idx: number) => {
                                      const storyboardLines = displayVisuals.split('\n').filter(l => l.trim());
                                      const storyboardForParagraph = storyboardLines[idx] || (storyboardLines.length > 0 ? storyboardLines[0] : "");
                                      
                                      const isCtaCheck = (p: string) => {
                                          const l = p.toLowerCase();
                                          return l.includes('comment "') || l.includes("comment '") || (l.includes('comment ') && l.includes('below')) || l.includes('dm me');
                                      };
                                      const isCTA = isCtaCheck(paragraph);
                                      const nonCtaIdx = splitParts.slice(0, idx).filter((p: string) => !isCtaCheck(p)).length;
                                      
                                      let sectionLabel, bgColor, textColor, tagBgColor;
                                      
                                      if (isCTA) {
                                        sectionLabel = '📲 CALL TO ACTION';
                                        bgColor = 'bg-rose-50';
                                        textColor = 'text-rose-900';
                                        tagBgColor = 'bg-rose-500';
                                      } else {
                                        const sl = ['🎣 HOOK', '🤝 RELATE & SET UP THE PROBLEM', '💡 THE TURNING POINT', '⚡ THE STRUGGLE', '🎯 THE BIG LESSON', '✅ THE RESULT'];
                                        const bg = ['bg-purple-50', 'bg-blue-50', 'bg-amber-50', 'bg-orange-50', 'bg-green-50', 'bg-emerald-50'];
                                        const tc = ['text-purple-900', 'text-blue-900', 'text-amber-900', 'text-orange-900', 'text-green-900', 'text-emerald-900'];
                                        const tbg = ['bg-purple-500', 'bg-blue-500', 'bg-amber-500', 'bg-orange-500', 'bg-green-500', 'bg-emerald-500'];
                                        const cur = Math.min(nonCtaIdx, sl.length - 1);
                                        sectionLabel = sl[cur];
                                        bgColor = bg[cur];
                                        textColor = tc[cur];
                                        tagBgColor = tbg[cur];
                                      }
                                      
                                      return (
                                        <div key={idx} className={`p-4 rounded-xl ${bgColor} border-l-4 ${textColor.replace('text-', 'border-')}`}>
                                          <div className="mb-2">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${tagBgColor} text-white uppercase tracking-widest`}>
                                              {sectionLabel}
                                            </span>
                                          </div>
                                          <p className={`text-sm md:text-base leading-relaxed ${textColor}`}>{paragraph}</p>
                                          {storyboardForParagraph && (
                                            <div className="mt-3 p-2 rounded-lg bg-white/60 border-l-2 border-dashed border-current/30">
                                              <div className="flex items-start gap-2">
                                                <span className="text-base flex-shrink-0">🎬</span>
                                                <div className="flex-1">
                                                  <strong className="block text-xs font-bold uppercase tracking-widest mb-1 text-zinc-600">Creator Action</strong>
                                                  <p className={`text-xs leading-relaxed ${textColor}`}>{storyboardForParagraph}</p>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              ) : (
                                displayScript
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Version History Modal */}
                    {showVersionHistory && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowVersionHistory(null)}
                      >
                        <motion.div
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.95, opacity: 0 }}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-96 overflow-y-auto"
                        >
                          <div className="sticky top-0 bg-gradient-to-r from-brand-primary/10 to-blue-50 border-b border-brand-primary/10 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                              <History size={18} className="text-brand-primary" />
                              Version History
                            </h3>
                            <button
                              onClick={() => setShowVersionHistory(null)}
                              className="text-zinc-400 hover:text-zinc-600 transition-colors"
                            >
                              <X size={20} />
                            </button>
                          </div>
                          <div className="p-4 space-y-2">
                            {scriptVersions.length === 0 ? (
                              <p className="text-sm text-zinc-500 text-center py-6">No previous versions</p>
                            ) : (
                              scriptVersions.map((version: any, idx: number) => (
                                <div
                                  key={version.id}
                                  className="p-3 rounded-lg border border-zinc-100 hover:border-brand-primary/30 hover:bg-brand-primary/5 transition-all"
                                >
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <span className="text-xs font-semibold text-zinc-500">
                                      {idx === 0 ? 'Current' : `Version ${scriptVersions.length - idx}`}
                                    </span>
                                    {idx > 0 && (
                                      <button
                                        onClick={() => restoreVersion(version.id)}
                                        className="text-xs px-2 py-1 rounded bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 transition-all font-semibold"
                                      >
                                        Restore
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-xs text-zinc-600">
                                    {new Date(version.created_at).toLocaleDateString()} {new Date(version.created_at).toLocaleTimeString()}
                                  </p>
                                  <p className="text-xs text-zinc-700 mt-2 line-clamp-2">{version.script_text.substring(0, 100)}</p>
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      </motion.div>
                    )}

                    {/* Teleprompter Overlay */}
                    {showTeleprompter && (
                      <TeleprompterOverlay
                        script={displayScript}
                        storyboard={currentDay.visuals}
                        onClose={() => {
                          setShowTeleprompter(false);
                          setTeleprompterRunning(false);
                        }}
                        speed={teleprompterSpeed}
                        fontSize={teleprompterFontSize}
                        onSpeedChange={setTeleprompterSpeed}
                        onFontSizeChange={setTeleprompterFontSize}
                        running={teleprompterRunning}
                        onRunningChange={setTeleprompterRunning}
                      />
                    )}
                  </section>

                  <section className="pt-6 md:pt-8 border-t border-zinc-100 wizard-caption">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">{t('detail.captionLabel')}</h4>
                    <div className="p-3 md:p-6 rounded-xl md:rounded-2xl bg-brand-primary/5 border border-brand-primary/10 text-zinc-700 font-mono text-xs md:text-sm leading-relaxed whitespace-pre-wrap">
                      {displayCaption}
                    </div>
                  </section>

                  {currentDay.searchTerms && currentDay.searchTerms.length > 0 && (
                    <section className="pt-6 md:pt-8 border-t border-zinc-100 wizard-inspiration">
                      <div className="flex items-center gap-2 mb-4">
                        <Play size={18} className="text-brand-primary" />
                        <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400">{t('detail.inspirationTitle')}</h4>
                      </div>
                      <p className="text-zinc-500 text-sm mb-4">{t('detail.inspirationDesc')}</p>
                      <div className="space-y-3">
                        {currentDay.searchTerms.map((term: string, idx: number) => (
                          <a
                            key={idx}
                            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(term)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 rounded-xl bg-zinc-50 border border-zinc-100 hover:border-brand-primary/30 hover:bg-brand-primary/5 transition-all group"
                          >
                            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                              <Play size={18} className="text-red-500" />
                            </div>
                            <span className="text-sm font-medium text-zinc-700 group-hover:text-brand-primary transition-colors flex-1">{term}</span>
                            <ExternalLink size={16} className="text-zinc-300 group-hover:text-brand-primary transition-colors flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Journal / Notes section */}
                  <section className="pt-6 md:pt-8 border-t border-zinc-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <BookOpen size={18} className="text-brand-primary" />
                        <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400">My Notes</h4>
                      </div>
                      {notesSaving && (
                        <span className="text-xs text-zinc-400 animate-pulse">Saving...</span>
                      )}
                    </div>
                    <textarea
                      value={dayNotes[activeDay] || ''}
                      onChange={(e) => handleNoteChange(activeDay, e.target.value)}
                      placeholder="What worked? What didn't? Any results or ideas for next time..."
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/10 outline-none resize-none text-sm text-zinc-700 placeholder:text-zinc-300 transition-all bg-zinc-50 focus:bg-white"
                    />
                  </section>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex justify-between items-center">
            <button 
              disabled={activeDay === 1}
              onClick={() => setActiveDay(prev => Math.max(1, prev - 1))}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-zinc-200 font-semibold disabled:opacity-30 transition-all hover:bg-zinc-50"
            >
              <ChevronLeft size={20} />
              <span>{t('detail.previousDay')}</span>
            </button>
            <button 
              disabled={
                activeDay === 30 || 
                (series.days[activeDay] && (!series.days[activeDay].scripts || series.days[activeDay].scripts.length === 0 || series.days[activeDay].scripts[0] === ""))
              }
              onClick={() => setActiveDay(prev => Math.min(30, prev + 1))}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-primary text-white font-semibold disabled:opacity-30 transition-all hover:bg-brand-primary/90"
            >
              <span>{t('detail.nextDay')}</span>
              <ArrowRight size={20} />
            </button>
          </div>

          {membership && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 p-10 rounded-[2.5rem] bg-brand-primary/5 border border-brand-primary/10 flex flex-col md:flex-row items-center justify-between gap-8"
            >
              <div className="text-center md:text-left">
                <h3 className="text-2xl font-display font-bold mb-2">
                  {membership.isMember ? t('detail.community.joinConversation') : t('detail.community.joinCommunity')}
                </h3>
                <p className="text-zinc-600 max-w-md">
                  {membership.isMember 
                    ? t('detail.community.connectDesc')
                    : t('detail.community.exclusiveDesc')}
                </p>
              </div>
              <a 
                href={membership.isMember ? membership.discordUrl : membership.trialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 bg-brand-primary text-white rounded-2xl font-bold shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all"
              >
                {membership.isMember ? (
                  <>
                    <MessageSquare size={20} />
                    <span>{t('detail.community.joinDiscord')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span>{t('detail.community.join')}</span>
                  </>
                )}
              </a>
            </motion.div>
          )}
        </div>
      </div>
      )}
      </div>
    </>
  );
}

function TeleprompterOverlay({
  script,
  storyboard,
  onClose,
  speed,
  fontSize,
  onSpeedChange,
  onFontSizeChange,
  running,
  onRunningChange
}: {
  script: string;
  storyboard?: string;
  onClose: () => void;
  speed: number;
  fontSize: number;
  onSpeedChange: (s: number) => void;
  onFontSizeChange: (s: number) => void;
  running: boolean;
  onRunningChange: (r: boolean) => void;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const previewRef = React.useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = React.useState(0);
  const [previewScroll, setPreviewScroll] = React.useState(0);
  const [showStoryboardLive, setShowStoryboardLive] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);

  // Scroll for full teleprompter mode - smooth with 60fps
  React.useEffect(() => {
    if (!running || !scrollRef.current || isDragging || isPaused) return;
    const interval = setInterval(() => {
      if (scrollRef.current) {
        const maxScroll = scrollRef.current.scrollHeight - scrollRef.current.clientHeight;
        setScrollPosition(prev => {
          const next = prev + (speed / 1.25);
          // Don't auto-stop at the end - stay in live mode
          if (next >= maxScroll) {
            return maxScroll;
          }
          return next;
        });
      }
    }, 16);
    return () => clearInterval(interval);
  }, [running, speed, isDragging, isPaused]);

  // Mouse/touch drag to navigate - memoized to avoid render issues
  const handleMouseDown = React.useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const pos = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart(pos);
  }, []);

  const handleMouseMove = React.useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isDragging && scrollRef.current) {
      const pos = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setScrollPosition(prev => Math.max(0, prev + (dragStart - pos)));
      setDragStart(pos);
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollPosition;
    }
  }, [scrollPosition]);

  // Preview scroll during settings - smooth
  React.useEffect(() => {
    if (running || !previewRef.current) return;
    const interval = setInterval(() => {
      if (previewRef.current) {
        const maxScroll = previewRef.current.scrollHeight - previewRef.current.clientHeight;
        setPreviewScroll(prev => {
          const next = prev + (speed / 1.25);
          if (next >= maxScroll) return 0;
          return next;
        });
      }
    }, 16);
    return () => clearInterval(interval);
  }, [running, speed]);

  React.useEffect(() => {
    if (previewRef.current) {
      previewRef.current.scrollTop = previewScroll;
    }
  }, [previewScroll]);

  if (!running) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex flex-col p-4"
      >
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-white">Teleprompter Setup</h2>
          <p className="text-zinc-400 text-sm mt-1">Adjust settings while watching the preview</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 overflow-hidden">
          {/* Preview area (takes up 2/3 on desktop) */}
          <div className="lg:col-span-2 bg-zinc-900 rounded-lg overflow-hidden border border-zinc-700 flex flex-col">
            <div className="px-4 py-3 border-b border-zinc-700 bg-zinc-800">
              <p className="text-xs font-semibold text-zinc-400 uppercase">Preview</p>
            </div>
            <div
              ref={previewRef}
              className="flex-1 overflow-hidden flex flex-col items-center justify-start pt-10 pb-10"
              style={{
                fontSize: `${fontSize * 0.5}rem`
              }}
            >
              <div className="text-white leading-loose whitespace-pre-wrap text-center px-8 max-w-2xl font-sans">
                {script}
                <div className="h-40" />
              </div>
            </div>
            <div className="px-4 py-2 border-t border-zinc-700 bg-zinc-800 text-center text-xs text-zinc-400">
              Scrolling at speed {speed.toFixed(1)}x
            </div>
          </div>

          {/* Controls (takes up 1/3 on desktop) */}
          <div className="flex flex-col gap-4">
            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-700">
              <label className="text-white text-sm font-semibold block mb-3">Speed</label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={speed}
                  onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                  className="w-full accent-brand-primary"
                />
                <div className="text-center">
                  <span className="text-2xl font-bold text-brand-primary">{speed.toFixed(1)}x</span>
                  <p className="text-xs text-zinc-400 mt-1">
                    {speed < 2 ? 'Slow' : speed < 4 ? 'Normal' : speed < 6 ? 'Fast' : 'Very Fast'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-700">
              <label className="text-white text-sm font-semibold block mb-3">Font Size</label>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => onFontSizeChange(Math.max(1, fontSize - 1))}
                  className="flex-1 px-3 py-2 rounded-lg bg-brand-primary/20 hover:bg-brand-primary/30 text-white transition-all"
                  title="Smaller"
                >
                  <ZoomOut size={18} className="mx-auto" />
                </button>
                <button
                  onClick={() => onFontSizeChange(Math.min(5, fontSize + 1))}
                  className="flex-1 px-3 py-2 rounded-lg bg-brand-primary/20 hover:bg-brand-primary/30 text-white transition-all"
                  title="Larger"
                >
                  <ZoomIn size={18} className="mx-auto" />
                </button>
              </div>
              <div className="text-center text-xs text-zinc-400">
                Size {fontSize}/5
              </div>
            </div>

            <button
              onClick={() => onRunningChange(true)}
              className="w-full py-3 rounded-lg bg-brand-primary text-white font-bold flex items-center justify-center gap-2 hover:bg-brand-primary/90 transition-all mt-auto"
            >
              <Play size={20} />
              Go Live
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-lg border border-zinc-600 text-white font-semibold hover:bg-zinc-800 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden relative cursor-grab active:cursor-grabbing">
        <div
          ref={scrollRef}
          className="w-full h-full overflow-hidden flex flex-col items-center justify-start pb-10"
          style={{
            fontSize: `${fontSize * 0.5}rem`,
            paddingTop: 'calc(50vh - 60px)'
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          <div className="text-white leading-loose whitespace-pre-wrap text-center px-8 max-w-2xl font-sans pointer-events-none">
            {showStoryboardLive && storyboard ? (
              <div className="space-y-6">
                {script.split('\n\n').map((paragraph: string, idx: number) => {
                  const storyboardLines = storyboard.split('\n');
                  const storyboardForParagraph = storyboardLines[idx];
                  return (
                    <div key={idx}>
                      <p>{paragraph}</p>
                      {storyboardForParagraph && (
                        <div className="mt-4 p-4 rounded-lg bg-blue-500/20 border border-blue-400/50 text-sm italic text-blue-200">
                          <strong className="block mb-2">Camera Action:</strong>
                          {storyboardForParagraph}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              script
            )}
            <div className="h-96" />
          </div>
        </div>

        {/* Storyboard button - left top */}
        {storyboard && (
          <div className="absolute top-6 left-6 z-40 pointer-events-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowStoryboardLive(!showStoryboardLive);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all backdrop-blur-sm text-sm font-semibold pointer-events-auto ${
                showStoryboardLive
                  ? 'bg-blue-500/30 hover:bg-blue-500/40 text-blue-100 border border-blue-400'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="Show camera actions"
            >
              <Eye size={16} />
              Storyboard
            </button>
          </div>
        )}

        {/* Pause/Exit buttons */}
        <div className="absolute top-6 right-6 flex gap-2 z-40 pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsPaused(!isPaused);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm pointer-events-auto"
          >
            <Pause size={18} />
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm pointer-events-auto"
          >
            <X size={18} />
            Exit
          </button>
        </div>
      </div>

      <div className="text-center text-white text-sm py-4 pointer-events-none">
        Drag to navigate • Toggle Storyboard to see camera actions
      </div>
    </motion.div>
  );
}

function ResetPasswordView({ token, onSuccess, onBack }: { token: string, onSuccess: () => void, onBack: () => void }) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t('resetPassword.passwordMismatch'));
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error || t('resetPassword.resetFailed'));
      }
    } catch (err) {
      setError(t('resetPassword.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto px-6 py-20 text-center"
      >
        <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-xl">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-display font-bold mb-4">{t('resetPassword.success')}</h2>
          <p className="text-zinc-500 mb-8">{t('resetPassword.successDesc')}</p>
          <button 
            onClick={onSuccess}
            className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold shadow-lg shadow-brand-primary/20"
          >
            {t('resetPassword.goToLogin')}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto px-6 py-20"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 mb-8 transition-colors">
        <ChevronLeft size={20} />
        <span>{t('back')}</span>
      </button>

      <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-xl">
        <h2 className="text-3xl font-display font-bold mb-2">{t('resetPassword.title')}</h2>
        <p className="text-zinc-500 mb-8">{t('resetPassword.subtitle')}</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700">{t('resetPassword.newPassword')}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
              <input 
                required
                type="password"
                className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 outline-none"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700">{t('resetPassword.confirmPassword')}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
              <input 
                required
                type="password"
                className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 outline-none"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

          <button
            disabled={loading}
            type="submit"
            className="w-full py-4 bg-brand-secondary text-white rounded-2xl font-semibold text-lg hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            {loading ? t('resetPassword.updating') : t('resetPassword.reset')}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

function RecommendedToolsView({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const tools = [
    {
      name: t('tools.items.ecamm.name'),
      description: t('tools.items.ecamm.description'),
      videoPlaceholder: "https://picsum.photos/seed/ecamm/800/450",
      url: "https://www.ecamm.com/"
    },
    {
      name: t('tools.items.descript.name'),
      description: t('tools.items.descript.description'),
      videoPlaceholder: "https://picsum.photos/seed/descript/800/450",
      url: "https://www.descript.com/"
    },
    {
      name: t('tools.items.socialbee.name'),
      description: t('tools.items.socialbee.description'),
      videoPlaceholder: "https://picsum.photos/seed/socialbee/800/450",
      url: "https://socialbee.io/"
    },
    {
      name: t('tools.items.youcam.name'),
      description: t('tools.items.youcam.description'),
      videoPlaceholder: "https://picsum.photos/seed/youcam/800/450",
      url: "https://www.perfectcorp.com/consumer/apps/ycv"
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto px-8 py-20"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-20">
        <div className="max-w-2xl">
          <button onClick={onBack} className="flex items-center gap-2 text-on-surface-variant hover:text-primary mb-8 transition-all group font-headline font-bold uppercase tracking-widest text-[10px]">
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span>{t('back')}</span>
          </button>
          <span className="text-secondary font-bold font-headline tracking-[0.3em] text-[10px] uppercase mb-4 block">Professional Arsenal</span>
          <h2 className="text-4xl md:text-5xl font-black font-headline tracking-tight mb-6">{t('tools.title')}</h2>
          <p className="text-on-surface-variant text-lg font-light font-body leading-relaxed">{t('tools.subtitle')}</p>
        </div>
        <div className="p-8 bg-surface-container rounded-3xl border border-surface-container-highest/30">
          <p className="text-xs font-black font-headline tracking-widest uppercase opacity-40 mb-2">Member Perks</p>
          <p className="font-bold text-primary italic">Exclusive discounts available for Challenge members.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {tools.map((tool, i) => (
          <motion.div
            key={tool.name}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="card-prestige overflow-hidden flex flex-col group bg-white hover:shadow-signature"
          >
            <div className="aspect-video bg-surface-container relative overflow-hidden">
              <img 
                src={tool.videoPlaceholder} 
                alt={tool.name} 
                className="w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-primary/5 group-hover:bg-primary/20 transition-all">
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  className="w-24 h-24 rounded-full bg-white/95 flex items-center justify-center text-primary shadow-2xl backdrop-blur-md"
                >
                  <Play size={36} fill="currentColor" className="ml-1" />
                </motion.div>
              </div>
            </div>
            <div className="p-10 flex-grow flex flex-col">
              <h3 className="text-3xl font-black font-headline mb-5 tracking-tight group-hover:text-primary transition-colors">{tool.name}</h3>
              <p className="text-on-surface-variant leading-relaxed mb-10 flex-grow font-body font-light opacity-70">{tool.description}</p>
              <a 
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-5 bg-white border-2 border-surface-container-highest text-on-surface rounded-2xl font-black font-headline text-center hover:bg-surface-bright hover:border-primary/20 transition-all uppercase tracking-tighter"
              >
                {t('tools.access', { name: tool.name })}
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
