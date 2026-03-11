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
  Image as ImageIcon
} from 'lucide-react';
import { UserProfile, ContentSeries, SeriesConcept, User } from './types';
import { robustFetch, safeJson } from './utils/api';
import { jsPDF } from 'jspdf';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function StrategyWizard({ seriesId, onComplete }: { seriesId: number, onComplete: () => void }) {
  const [step, setStep] = useState(0);
  
  const wizardSteps = [
    {
      title: "Navigate the Calendar",
      description: "Click on any day in the calendar (1-30) to move between days and view different content ideas for each day of your challenge."
    },
    {
      title: "Choose Your Hook",
      description: "Each day has multiple hook options. Click the dot buttons to preview different hooks and select the one that resonates most with your audience."
    },
    {
      title: "Switch Between Reel & Carousel",
      description: "Use the toggle to switch between Reel (vertical video) and Carousel (multiple image slides) formats. Both have custom layouts optimized for each platform."
    },
    {
      title: "View the Storyboard",
      description: "Click 'Show Storyboard' to see a visual frame-by-frame breakdown of your Reel. This helps you plan your video shoot or understand the content flow."
    },
    {
      title: "Call to Action",
      description: "Every day includes a customized call-to-action button text. This drives engagement by telling viewers exactly what you want them to do next."
    },
    {
      title: "Suggested Caption",
      description: "Get AI-generated captions for each day optimized for Instagram. Customize them to match your brand voice and messaging."
    },
    {
      title: "Inspiration Videos",
      description: "Find B-roll inspiration videos to enhance your content. Click the link to access a collection of relevant clips you can download and use."
    },
    {
      title: "Mark as Complete",
      description: "When you post content for a day, click 'Mark as Done' to track your progress. Complete the 3 tasks (share, post in community, engage) to unlock the next day."
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onComplete}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-8 max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-6">
          <div className="text-sm text-zinc-500 mb-2">{step + 1} of {wizardSteps.length}</div>
          <h2 className="text-2xl font-display font-bold text-zinc-900 mb-3">{wizardSteps[step].title}</h2>
          <p className="text-zinc-600 leading-relaxed">{wizardSteps[step].description}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onComplete}
            className="flex-1 px-4 py-2 rounded-lg border border-zinc-200 text-zinc-700 font-semibold hover:bg-zinc-50 transition-all"
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
            className="flex-1 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-brand-secondary transition-all"
          >
            {step === wizardSteps.length - 1 ? "Get Started" : "Next"}
          </button>
        </div>
      </motion.div>
    </motion.div>
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
  const [resetToken, setResetToken] = useState<string | null>(null);
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
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(!!token);
  const hasApiKey = true;

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
    let message = err.message || 'Something went wrong while generating content.';
    // Make error messages user-friendly
    if (message.includes('timeout') || message.includes('took too long')) {
      message = "Generation took too long. Please try a different topic or try again later.";
    }
    if (message.includes('502') || message.includes('500') || message.includes('503')) {
      message = "Service temporarily unavailable. Please wait a moment and try again.";
    }
    setError(message);
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
      const res = await robustFetch('/api/gemini/generate-options', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ profile, language: i18n.language })
      });
      if (!res.ok) {
        const data = await safeJson(res);
        throw new Error(data.error || 'Failed to generate options');
      }
      const results = await safeJson(res);
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
    try {
      // Add 5-minute absolute timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Strategy generation took too long. Please try again.')), 300000)
      );
      
      const seriesPromise = robustFetch('/api/gemini/generate-series', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ concept, profile, language: i18n.language })
      }, 2, 1000, 300000);
      
      const seriesRes = await Promise.race([seriesPromise, timeoutPromise]) as Response;
      
      if (!seriesRes.ok) {
        const data = await safeJson(seriesRes);
        throw new Error(data.error || `Generation failed (${seriesRes.status})`);
      }
      const fullSeries = await safeJson(seriesRes);
      const seriesWithMeta = {
        ...fullSeries,
        start_date: profile.startDate,
        completed_days: []
      };
      
      // Auto-save if logged in
      let savedId = null;
      if (token) {
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
          if (saveRes.ok) {
            const savedData = await safeJson(saveRes);
            savedId = savedData.id;
            setSavedStrategies(prev => [savedData, ...prev]);
          }
        } catch (err) {
          console.error("Failed to auto-save strategy:", err);
        }
      }
      
      const finalSeries = { ...seriesWithMeta, id: savedId };
      setSelectedSeries(finalSeries);
      
      // Show pulsing "Refining..." text for 4.5 seconds before transitioning
      await new Promise(resolve => setTimeout(resolve, 4500));
      setStep('detail');
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
    if (!token) return;
    try {
      const res = await robustFetch('/api/strategies', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await safeJson(res);
        setSavedStrategies(data);
        if (data.length > 0) {
          setStep('my_strategies');
        } else {
          setStep('form');
        }
      }
    } catch (err) {
      console.error("Failed to fetch strategies:", err);
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
    if (!token || !window.confirm(t('strategies.deleteConfirm'))) return;
    try {
      const res = await robustFetch(`/api/strategies/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSavedStrategies(prev => prev.filter(s => s.id !== id));
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
    <div className="min-h-screen bg-white font-sans selection:bg-brand-primary/20">
      {isInitializing ? (
        <LoadingView title={t('loading.restoringSession')} />
      ) : (
        <>
          {/* Header */}
          <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setStep('landing')}>
            <img src="/favicon.png" alt="" className="w-6 h-6" />
            <span className="font-display font-bold text-xl tracking-tight">
              <span className="md:hidden">30-Day Challenge</span>
              <span className="hidden md:inline">{t('appName')}</span>
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-500 hover:text-brand-primary hover:bg-zinc-50 transition-all border border-zinc-200"
              title="Switch language"
            >
              <span>{i18n.language === 'en' ? '🇺🇸' : '🇪🇸'}</span>
              <span>{i18n.language === 'en' ? 'EN' : 'ES'}</span>
            </button>
            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-zinc-50 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-all">
                    {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                  </div>
                </button>

                <AnimatePresence>
                  {isMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-64 bg-white rounded-3xl shadow-2xl border border-zinc-100 py-3 z-50"
                    >
                      <div className="px-6 py-3 border-b border-zinc-50 mb-2">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">{t('nav.account')}</p>
                        <p className="text-sm font-medium text-zinc-900 truncate">{user.email}</p>
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
                    setProfile(prev => ({
                      ...prev,
                      niche: data.user.niche || prev.niche,
                      products: data.user.products || prev.products,
                      problems: data.user.problems || prev.problems,
                      audience: data.user.audience || prev.audience,
                      tone: data.user.tone || prev.tone,
                      contentType: data.user.contentType || prev.contentType,
                    }));
                  }
                })
                .catch(err => console.error("Failed to fetch profile:", err));
                robustFetch('/api/strategies', {
                  headers: { 'Authorization': `Bearer ${t}` }
                })
                .then(res => safeJson(res))
                .then(data => {
                  setSavedStrategies(data);
                  if (data.length > 0) setStep('my_strategies');
                  else setStep('form');
                })
                .catch(err => {
                  console.error("Failed to fetch initial strategies:", err);
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
                setSelectedSeries({
                  ...s.data,
                  id: s.id,
                  start_date: s.start_date,
                  completed_days: s.completed_days,
                  day_checklist: s.day_checklist
                });
                setStep('detail');
              }}
              onDelete={handleDeleteStrategy}
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
            <LoadingView key="loading_series" title={t('loading.generatingSeries')} showPercentage={true} />
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
                  const res = await robustFetch('/api/strategies', {
                    method: 'POST',
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
                    const newStrategy = await safeJson(res);
                    setSavedStrategies(prev => [newStrategy, ...prev]);
                    setStep('my_strategies');
                  }
                } catch (err) {
                  console.error("Failed to save strategy:", err);
                  alert('Failed to save strategy. Please try again.');
                }
              }}
            />
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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-4xl mx-auto px-6 py-20 text-center"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/10 text-brand-primary text-sm font-semibold mb-8"
      >
        <img src="/favicon.png" alt="" className="w-4 h-4" />
        <span>{t('landing.badge')}</span>
      </motion.div>
      
      <motion.h1 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-5xl md:text-8xl font-display font-bold tracking-tight mb-8 leading-[1.1]"
      >
        {t('landing.heading1')} <br />
        <span className="text-brand-primary italic">{t('landing.heading2')}</span>
      </motion.h1>
      
      <motion.p 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-xl text-zinc-600 mb-12 max-w-2xl mx-auto leading-relaxed"
      >
        {t('landing.description')}
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="mb-12 p-8 rounded-[2.5rem] bg-brand-primary/5 border border-brand-primary/10 max-w-2xl mx-auto text-left"
      >
        <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
          <MessageSquare className="text-brand-primary" size={20} />
          {t('landing.howItWorks')}
        </h2>
        <ul className="space-y-4">
          {(t('landing.steps', { returnObjects: true }) as string[]).map((text: string, i: number) => (
            <li key={i} className="flex gap-4 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-primary text-white text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-zinc-700 leading-snug">{text}</p>
            </li>
          ))}
        </ul>
      </motion.div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
          className="group relative inline-flex items-center gap-3 px-10 py-5 bg-brand-secondary text-white rounded-full font-semibold text-lg overflow-hidden transition-all hover:bg-slate-800 shadow-xl shadow-brand-secondary/20"
        >
          <span>{user ? t('landing.startChallenge') : t('landing.loginToStart')}</span>
          <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
        </motion.button>

        {user && (
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.55 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSeeStrategies}
            className="inline-flex items-center gap-3 px-10 py-5 bg-white text-brand-secondary border-2 border-brand-secondary rounded-full font-semibold text-lg transition-all hover:bg-brand-primary/5"
          >
            <History size={20} />
            <span>{t('landing.viewStrategies')}</span>
          </motion.button>
        )}
      </div>

      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
        {[Target, Zap, Calendar].map((Icon, i) => {
          const features = t('landing.features', { returnObjects: true }) as { title: string; desc: string }[];
          const feature = features[i];
          return (
            <motion.div
              key={i}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="p-6 rounded-3xl bg-white border border-zinc-200 shadow-sm"
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center mb-4 text-brand-primary">
                <Icon size={24} />
              </div>
              <h3 className="font-display font-bold text-lg mb-2">{feature.title}</h3>
              <p className="text-zinc-500 leading-relaxed">{feature.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
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

      <h2 className="text-3xl font-display font-bold mb-2">
        {hasBusinessProfile ? t('form.title') : t('form.subtitle')}
      </h2>
      <p className="text-zinc-500 mb-10">
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
                  <label className="block text-sm font-semibold text-zinc-700">{t('form.niche.label')}</label>
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
                  <label className="block text-sm font-semibold text-zinc-700">{t('form.products.label')}</label>
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
                  <label className="block text-sm font-semibold text-zinc-700">{t('form.problems.label')}</label>
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
                  <label className="block text-sm font-semibold text-zinc-700">{t('form.audience.label')}</label>
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
                  className="w-full px-4 py-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
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
              {(t('form.contentType.options', { returnObjects: true }) as string[]).map((opt: string) => (
                <option key={opt}>{opt}</option>
              ))}
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
              {(t('form.tone.options', { returnObjects: true }) as string[]).map((opt: string) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
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

function LoadingView({ title, showPercentage = false }: { title: string, showPercentage?: boolean }) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const startTimeRef = React.useRef(Date.now());
  const estimatedDurationMs = 180000; // 3 minutes to reach 99%
  
  useEffect(() => {
    if (!showPercentage) return;
    
    const updateProgress = () => {
      const elapsedMs = Date.now() - startTimeRef.current;
      const calculatedProgress = (elapsedMs / estimatedDurationMs) * 100;
      setProgress(Math.min(calculatedProgress, 99));
    };
    
    const interval = setInterval(updateProgress, 100);
    updateProgress();
    
    return () => clearInterval(interval);
  }, [showPercentage]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 flex flex-col items-center font-sans"
      >
        <img 
          src="/logo.png" 
          alt="Escape 9 to 5" 
          className="h-32 w-auto object-contain mb-8"
        />
      </motion.div>
      
      <h2 className="text-2xl font-display font-bold mb-6 text-zinc-900">{title}</h2>
      
      {showPercentage ? (
        <div className="w-full max-w-sm mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-zinc-600">{t('loading.progress')}</span>
            {progress >= 99 ? (
              <motion.span 
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="text-sm font-bold text-brand-primary"
              >
                {t('loading.refining')}
              </motion.span>
            ) : (
              <span className="text-sm font-bold text-brand-primary">{Math.round(progress)}%</span>
            )}
          </div>
          <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
            <motion.div 
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2, ease: "linear" }}
              className="h-full bg-gradient-to-r from-[#DB2777] to-[#6D28D9]"
            />
          </div>
        </div>
      ) : (
        <div className="w-64 h-1.5 bg-zinc-100 rounded-full overflow-hidden mb-8 relative">
          <motion.div 
            animate={{ 
              x: [-256, 256],
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="w-full h-full bg-gradient-to-r from-[#DB2777] to-[#6D28D9] absolute"
          />
        </div>
      )}
      
      {showPercentage && (
        <p className="text-zinc-500 max-w-sm mb-4 text-sm">
          {t('loading.coffeeMessage')}
        </p>
      )}
      
      <p className="text-zinc-400 max-w-sm leading-relaxed italic text-sm">
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
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
    }
  };

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
        {mode !== 'forgot' && (
          <div className="flex p-1 bg-zinc-100 rounded-2xl mb-8">
            <button
              onClick={() => switchMode('login')}
              className={cn(
                "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all",
                mode === 'login' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              {t('auth.login')}
            </button>
            <button
              onClick={() => switchMode('register')}
              className={cn(
                "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all",
                mode === 'register' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              {t('auth.register')}
            </button>
          </div>
        )}

        <h2 className="text-3xl font-display font-bold mb-2">
          {mode === 'login' ? t('auth.welcomeBack') : mode === 'register' ? t('auth.createAccount') : t('auth.resetPassword')}
        </h2>
        
        {serverStatus && serverStatus.status !== 'connected' && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3">
            <Info size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-700 leading-relaxed">
              <p className="font-bold mb-1">{t('auth.dbIssueTitle')}</p>
              <p>{serverStatus.message || t('auth.dbIssueDesc')}</p>
            </div>
          </div>
        )}

        <p className="text-zinc-500 mb-8">
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
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">{t('auth.emailAddress')}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input 
                  required
                  type="email"
                  className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 outline-none"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-zinc-700">{t('auth.password')}</label>
                  {mode === 'login' && (
                    <button 
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs font-bold text-brand-primary hover:underline"
                    >
                      {t('auth.forgotPassword')}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                  <input 
                    required
                    type={showPassword ? "text" : "password"}
                    className="w-full pl-12 pr-12 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 outline-none"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

            <button
              disabled={loading}
              type="submit"
              className="w-full py-4 bg-brand-secondary text-white rounded-2xl font-semibold text-lg hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {loading ? t('auth.processing') : (mode === 'login' ? t('auth.login') : mode === 'register' ? t('auth.register') : t('auth.sendResetLink'))}
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
              className="p-8 rounded-[2rem] bg-white border border-zinc-200 shadow-sm hover:shadow-xl hover:border-brand-primary/30 transition-all cursor-pointer group relative"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(s.id);
                }}
                className="absolute top-6 right-6 p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all md:opacity-0 md:group-hover:opacity-100"
                title="Delete Strategy"
              >
                <Trash2 size={18} />
              </button>

              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Calendar size={24} />
                </div>
                <span className="text-xs text-zinc-400 font-medium mr-8">
                  {new Date(s.created_at).toLocaleDateString()}
                </span>
              </div>
              <h3 className="text-xl font-display font-bold mb-3 group-hover:text-brand-primary transition-colors">{s.title}</h3>
              <p className="text-zinc-500 text-sm line-clamp-2 mb-4">{s.data.description}</p>
              {(s.data.contentType || userContentType) && (
                <span className="inline-block px-3 py-1 bg-brand-primary/10 text-brand-primary text-xs font-semibold rounded-full mb-4">
                  {s.data.contentType || userContentType}
                </span>
              )}
              <div className="flex items-center gap-2 text-brand-primary font-bold text-sm">
                <span>{t('strategies.viewFull')}</span>
                <ArrowRight size={16} />
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
      className="max-w-6xl mx-auto px-6 py-12"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 mb-4 transition-colors">
            <ChevronLeft size={20} />
            <span>{t('results.editProfile')}</span>
          </button>
          <h2 className="text-4xl font-display font-bold">{t('results.title')}</h2>
          <p className="text-zinc-500 mt-2 text-lg">{t('results.description')}</p>
        </div>
      </div>

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
              <span>Select API Key Now</span>
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {options.map((option, i) => (
          <motion.div
            key={i}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="group relative flex flex-col p-8 rounded-[2rem] bg-white border border-zinc-200 shadow-sm hover:shadow-xl hover:border-brand-primary/30 transition-all cursor-pointer"
            onClick={() => onSelect(option)}
          >
            <div className="absolute top-6 right-6 w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-brand-primary group-hover:text-white transition-all">
              <ArrowRight size={20} />
            </div>
            
            <div className="mb-6 flex-grow">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-primary mb-2 block">{t('results.option')} {i + 1}</span>
              <h3 className="text-2xl font-display font-bold leading-tight mb-4">{option.title}</h3>
              <p className="text-zinc-500 leading-relaxed mb-4">{option.description}</p>
            </div>

            <div className="mt-auto pt-6 border-t border-zinc-100 space-y-4">
              <div className="flex items-center gap-3 text-sm text-zinc-600">
                <Target size={16} className="text-brand-primary" />
                <span>{option.targetAudience}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-600">
                <Sparkles size={16} className="text-brand-primary" />
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
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  
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
  const [dayChecklist, setDayChecklist] = useState<Record<number, Record<string, boolean>>>(series.day_checklist || {});
  const [showChecklistModal, setShowChecklistModal] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [membership, setMembership] = useState<{ isMember: boolean, discordUrl: string, trialUrl: string } | null>(null);
  const [showWizard, setShowWizard] = useState<boolean>(() => {
    const wizardKey = `wizard_seen_${series.id}`;
    return !localStorage.getItem(wizardKey);
  });

  const handleWizardComplete = () => {
    localStorage.setItem(`wizard_seen_${series.id}`, 'true');
    setShowWizard(false);
  };
  
  // Reset checklist when switching between strategies
  useEffect(() => {
    setDayChecklist(series.day_checklist || {});
  }, [series.id]);
  
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
      }).catch(err => console.error("Failed to save checklist progress:", err));
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
  const displayHook = currentDay.hooks ? currentDay.hooks[currentHookIndex] : currentDay.hook;
  const displayScript = currentDay.scripts ? currentDay.scripts[currentHookIndex] : currentDay.script;

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
          body: JSON.stringify({ completed_days: newCompleted })
        });
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
      let y = margin;

      // Title
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(series.title, margin, y);
      y += 15;

      // Description
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      const splitDesc = doc.splitTextToSize(series.description, 170);
      doc.text(splitDesc, margin, y);
      y += (splitDesc.length * 7) + 10;

      // Days
      series.days.forEach((day: any) => {
        // Check if we need a new page
        if (y > 240) {
          doc.addPage();
          y = margin;
        }

        const dayHook = day.hooks ? day.hooks[0] : day.hook;
        const dayScript = day.scripts ? day.scripts[0] : day.script;

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(`Day ${day.day}: ${dayHook}`, margin, y);
        y += 10;

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Script:", margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        const splitScript = doc.splitTextToSize(dayScript || "", 170);
        doc.text(splitScript, margin, y);
        y += (splitScript.length * 5) + 5;

        doc.setFont("helvetica", "bold");
        doc.text("Visuals:", margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        const splitVisuals = doc.splitTextToSize(day.visuals, 170);
        doc.text(splitVisuals, margin, y);
        y += (splitVisuals.length * 5) + 15;
      });

      doc.save(`${series.title.replace(/\s+/g, '_')}_Strategy.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      // Fallback to print if PDF generation fails
      window.print();
    }
  };

  return (
    <>
      {showWizard && <StrategyWizard seriesId={series.id} onComplete={handleWizardComplete} />}
      <div className="max-w-7xl mx-auto px-6 py-12 print:p-0">
        <div className="flex items-center justify-between mb-12 print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-all text-sm font-semibold"
        >
          <ChevronLeft size={18} />
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Sidebar Navigation */}
        <div className="lg:col-span-4 space-y-8">
          <div className="p-8 rounded-[2rem] bg-brand-secondary text-white shadow-2xl shadow-brand-secondary/20">
            <h2 className="text-3xl font-display font-bold mb-4">{series.title}</h2>
            <p className="text-slate-400 leading-relaxed mb-6">{series.description}</p>
            <div className="flex items-center gap-4 text-brand-primary font-semibold">
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

          <div className="bg-white rounded-[2rem] border border-zinc-200 p-6">
            <div className="flex items-center justify-between mb-6 px-2">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">{t('detail.calendarRoadmap')}</h3>
              <span className="text-xs font-bold text-brand-primary bg-brand-primary/10 px-2 py-1 rounded-full">
                {completedDays.length}/30 {t('detail.done')}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {series.days.map((day: any) => {
                const isCompleted = completedDays.includes(day.day);
                const dateStr = getDayDate(day.day);
                return (
                  <button
                    key={day.day}
                    onClick={() => setActiveDay(day.day)}
                    className={cn(
                      "relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all",
                      activeDay === day.day 
                        ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-110 z-10" 
                        : isCompleted
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : "bg-zinc-50 text-zinc-400 hover:bg-zinc-100"
                    )}
                  >
                    <span className="text-sm font-bold">{day.day}</span>
                    {dateStr && <span className={cn("text-[10px] font-bold mt-0.5", activeDay === day.day ? "text-white/90" : "text-zinc-500")}>{dateStr}</span>}
                    {isCompleted && activeDay !== day.day && (
                      <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                        <CheckCircle2 size={10} />
                      </div>
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
              <div className="p-5 md:p-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 md:mb-10">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center font-display font-bold text-2xl transition-colors",
                      completedDays.includes(activeDay) ? "bg-emerald-100 text-emerald-600" : "bg-brand-primary/10 text-brand-primary"
                    )}>
                      {activeDay}
                    </div>
                    <div>
                      <h3 className="text-2xl font-display font-bold">{t('detail.dayContent', { day: activeDay })}</h3>
                      <p className="text-zinc-500">{getDayDate(activeDay) || t('detail.reelStrategy')}</p>
                    </div>
                  </div>
                  
                  {/* Day completion button/banner on the right */}
                  {completedDays.includes(activeDay) ? (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-100 border-2 border-emerald-200">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-700">Day complete!</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowChecklistModal(true)}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-brand-primary/30 hover:border-brand-primary/50 hover:bg-brand-primary/5 transition-all whitespace-nowrap"
                    >
                      <CheckCircle2 size={16} className="text-brand-primary" />
                      <span className="text-sm font-semibold text-zinc-700">Complete</span>
                      <span className="text-xs font-bold text-brand-primary">{Math.round((getDayChecklistStatus(activeDay).checkedCount / 3) * 100)}%</span>
                    </button>
                  )}
                </div>

                {/* Checklist Modal */}
                {showChecklistModal && !completedDays.includes(activeDay) && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
                    >
                      <div className="bg-gradient-to-r from-brand-primary/10 to-blue-50 border-b border-brand-primary/10 px-8 py-6">
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
                            <p className="text-xs text-zinc-400 mt-0.5">Click dots to choose a hook ↓</p>
                          )}
                        </div>
                      </div>
                      {currentDay.hooks && (
                        <div className="flex items-center gap-3">
                          <div className="flex gap-2">
                            {currentDay.hooks.map((_: any, idx: number) => (
                              <button
                                key={idx}
                                onClick={() => setHookIndices(prev => ({ ...prev, [activeDay]: idx }))}
                                className={cn(
                                  "w-3 h-3 rounded-full transition-all hover:scale-125 cursor-pointer",
                                  currentHookIndex === idx ? "bg-brand-primary w-4" : "bg-zinc-300 hover:bg-zinc-400"
                                )}
                                title={`Hook ${idx + 1}`}
                              />
                            ))}
                          </div>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => setHookIndices(prev => ({ ...prev, [activeDay]: Math.max(0, currentHookIndex - 1) }))}
                              disabled={currentHookIndex === 0}
                              className="p-1.5 rounded-full bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <button 
                              onClick={() => setHookIndices(prev => ({ ...prev, [activeDay]: Math.min((currentDay.hooks?.length || 1) - 1, currentHookIndex + 1) }))}
                              disabled={currentHookIndex === (currentDay.hooks?.length || 1) - 1}
                              className="p-1.5 rounded-full bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                              <ArrowRight size={14} className="rotate-0" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="relative group">
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
                              onClick={() => setHookIndices(prev => ({ ...prev, [activeDay]: currentHookIndex - 1 }))}
                              className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-zinc-200 shadow-lg flex items-center justify-center text-zinc-400 hover:text-brand-primary hover:border-brand-primary transition-all z-10 hidden md:flex"
                            >
                              <ChevronLeft size={20} />
                            </button>
                          )}
                          {currentHookIndex < (currentDay.hooks.length - 1) && (
                            <button 
                              onClick={() => setHookIndices(prev => ({ ...prev, [activeDay]: currentHookIndex + 1 }))}
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
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-brand-primary" />
                        <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
                          {viewMode === 'carousel' ? 'Carousel Slides' : t('detail.scriptLabel')}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Reel/Carousel toggle */}
                        <div className="flex rounded-lg overflow-hidden border border-zinc-200">
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
                        {/* Storyboard toggle — only in reel mode */}
                        {viewMode === 'reel' && (
                          <button
                            onClick={() => setShowStoryboard(!showStoryboard)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                              showStoryboard
                                ? "bg-brand-primary text-white"
                                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                            )}
                          >
                            <Video size={14} />
                            <span>{showStoryboard ? t('detail.hideStoryboard') : t('detail.showStoryboard')}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {viewMode === 'carousel' ? (
                      /* ── CAROUSEL VIEW ── */
                      <div className="space-y-4">
                        {/* Cover slide */}
                        <div className="rounded-2xl border-2 border-brand-primary/20 bg-brand-primary/5 overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-2 bg-brand-primary/10 border-b border-brand-primary/20">
                            <span className="text-xs font-bold text-brand-primary uppercase tracking-widest">Slide 1 — Cover</span>
                          </div>
                          <div className="p-4 md:p-6 grid md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Copy on screen</p>
                              <p className="text-base md:text-lg font-semibold text-zinc-900 leading-snug">"{displayHook}"</p>
                            </div>
                            <div className="md:border-l md:border-brand-primary/20 md:pl-4">
                              <div className="flex items-center gap-1.5 mb-2">
                                <ImageIcon size={13} className="text-brand-primary" />
                                <p className="text-xs font-bold uppercase tracking-widest text-brand-primary">Image / Illustration</p>
                              </div>
                              <p className="text-sm text-zinc-600 italic">Bold title card with hook text overlaid on a colorful or brand-colored background. Use a striking visual or gradient.</p>
                            </div>
                          </div>
                        </div>

                        {/* Content slides — one per script paragraph */}
                        {displayScript.split('\n\n').filter((p: string) => p.trim()).map((paragraph: string, idx: number) => {
                          // Helper: Shorten copy to ~50% and add strategic line breaks
                          const shortenCopy = (text: string) => {
                            const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
                            const targetSentences = Math.max(1, Math.ceil(sentences.length / 2));
                            const shortened = sentences.slice(0, targetSentences).join('').trim();
                            // Add line break after first sentence if there are multiple remaining
                            if (sentences.slice(0, targetSentences).length > 1) {
                              const firstPeriod = shortened.indexOf('.');
                              if (firstPeriod !== -1) {
                                return shortened.substring(0, firstPeriod + 1) + '\n\n' + shortened.substring(firstPeriod + 1).trim();
                              }
                            }
                            return shortened;
                          };

                          // Helper: Generate semantic image suggestion based on content
                          const generateImageSuggestion = (text: string) => {
                            const lower = text.toLowerCase();
                            if (lower.includes('sell') || lower.includes('selling') || lower.includes('sell your')) return 'A handshake, two hands connecting, or illustration of helping/partnership';
                            if (lower.includes('money') || lower.includes('price') || lower.includes('cost')) return 'Dollar sign, coins, or abstract wealth/growth visualization';
                            if (lower.includes('connection') || lower.includes('connect')) return 'Network nodes, interconnected circles, or bridges';
                            if (lower.includes('value') || lower.includes('valuable')) return 'Gem, star, or upward arrow symbolizing worth';
                            if (lower.includes('audience') || lower.includes('customer')) return 'People/crowd illustration, megaphone, or group silhouettes';
                            if (lower.includes('trust') || lower.includes('believe')) return 'Heart, shield, or lock symbolizing security/trust';
                            if (lower.includes('transform') || lower.includes('change') || lower.includes('improve')) return 'Butterfly, growth plant, or ascending path/arrow';
                            if (lower.includes('story') || lower.includes('narrative')) return 'Open book, story bubbles, or narrative illustration';
                            if (lower.includes('problem') || lower.includes('solve')) return 'Lightbulb, puzzle piece, or check mark';
                            if (lower.includes('authentic') || lower.includes('genuine') || lower.includes('real')) return 'Mirror, fingerprint, or authentic seal/badge';
                            if (lower.includes('engage') || lower.includes('interaction')) return 'Speech bubbles, conversation illustration, or two-way arrows';
                            if (lower.includes('build') || lower.includes('create')) return 'Blueprint, construction, or building blocks';
                            return 'Relevant infographic, icon, or illustration matching the concept';
                          };

                          const shortCopy = shortenCopy(paragraph);
                          const imageSuggestion = generateImageSuggestion(paragraph);

                          return (
                            <div key={idx} className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
                              <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 border-b border-zinc-100">
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Slide {idx + 2} — Content</span>
                              </div>
                              <div className="p-4 md:p-6 grid md:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Copy on screen</p>
                                  <p className="text-sm md:text-base text-zinc-800 leading-relaxed whitespace-pre-wrap">{shortCopy}</p>
                                </div>
                                <div className="md:border-l md:border-zinc-100 md:pl-4">
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <ImageIcon size={13} className="text-brand-primary" />
                                    <p className="text-xs font-bold uppercase tracking-widest text-brand-primary">Image / Illustration</p>
                                  </div>
                                  <p className="text-sm text-zinc-600 italic">{imageSuggestion}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* CTA slide */}
                        <div className="rounded-2xl border-2 border-zinc-900/20 bg-zinc-900 overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border-b border-zinc-700">
                            <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Last Slide — CTA</span>
                          </div>
                          <div className="p-4 md:p-6 grid md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Copy on screen</p>
                              <p className="text-base md:text-lg font-semibold text-white leading-snug">{currentDay.cta}</p>
                            </div>
                            <div className="md:border-l md:border-zinc-700 md:pl-4">
                              <div className="flex items-center gap-1.5 mb-2">
                                <ImageIcon size={13} className="text-brand-primary" />
                                <p className="text-xs font-bold uppercase tracking-widest text-brand-primary">Image / Illustration</p>
                              </div>
                              <p className="text-sm text-zinc-400 italic">Your profile photo or brand logo centered on a solid brand-colored background, with CTA text below.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ── REEL VIEW ── */
                      <div className="space-y-3">
                        <div className="p-3 md:p-6 rounded-xl md:rounded-2xl bg-zinc-50 border border-zinc-100 text-base md:text-lg leading-relaxed whitespace-pre-wrap font-sans">
                          {showStoryboard ? (
                            <div className="space-y-3">
                              {displayScript.split('\n\n').map((paragraph: string, idx: number) => {
                                const storyboardLines = currentDay.visuals.split('\n');
                                const storyboardForParagraph = storyboardLines[idx];
                                return (
                                  <div key={idx}>
                                    <p>{paragraph}</p>
                                    {storyboardForParagraph && (
                                      <div className="mt-2 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs md:text-sm text-blue-900 italic">
                                        <strong className="block mb-1">{t('detail.creatorAction')}</strong>
                                        {storyboardForParagraph}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            displayScript
                          )}
                        </div>
                      </div>
                    )}
                  </section>

                  <section>
                    <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">{t('detail.ctaLabel')}</h4>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-primary/5 text-brand-primary font-semibold">
                      <ArrowRight size={18} />
                      <span>{currentDay.cta}</span>
                    </div>
                  </section>

                  <section className="pt-6 md:pt-8 border-t border-zinc-100">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">{t('detail.captionLabel')}</h4>
                    <div className="p-3 md:p-6 rounded-xl md:rounded-2xl bg-brand-secondary text-slate-300 font-mono text-xs md:text-sm leading-relaxed whitespace-pre-wrap">
                      {currentDay.caption}
                    </div>
                  </section>

                  {currentDay.searchTerms && currentDay.searchTerms.length > 0 && (
                    <section className="pt-6 md:pt-8 border-t border-zinc-100">
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
              disabled={activeDay === 30}
              onClick={() => setActiveDay(prev => Math.min(30, prev + 1))}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-secondary text-white font-semibold disabled:opacity-30 transition-all hover:bg-slate-800"
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
      </div>
    </>
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
      className="max-w-6xl mx-auto px-6 py-12"
    >
      <div className="flex items-center gap-4 mb-12">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-zinc-100 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-4xl font-display font-bold mb-2">{t('tools.title')}</h2>
          <p className="text-zinc-500">{t('tools.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {tools.map((tool, i) => (
          <motion.div
            key={tool.name}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-[2.5rem] border border-zinc-200 shadow-sm overflow-hidden flex flex-col"
          >
            <div className="aspect-video bg-zinc-100 relative group">
              <img 
                src={tool.videoPlaceholder} 
                alt={tool.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all">
                <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center text-brand-primary shadow-xl">
                  <Play size={32} className="ml-1" />
                </div>
              </div>
            </div>
            <div className="p-8 flex-grow flex flex-col">
              <h3 className="text-2xl font-display font-bold mb-4">{tool.name}</h3>
              <p className="text-zinc-600 leading-relaxed mb-8 flex-grow">{tool.description}</p>
              <a 
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold text-center hover:bg-brand-secondary transition-all shadow-lg shadow-brand-primary/20"
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
