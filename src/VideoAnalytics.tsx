import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, Instagram, Link2, Eye, Clock, TrendingUp,
  Heart, MessageCircle, Bookmark, Share2,
  Sparkles, AlertCircle, CheckCircle2, ThumbsUp, ThumbsDown,
  BarChart3, Loader2, ExternalLink, LogOut, User as UserIcon,
  RefreshCcw, ChevronDown, ChevronUp
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  onBack: () => void;
  token: string | null;
}

interface IgAccount {
  id: string;
  username: string;
  profile_pic: string | null;
}

interface AnalysisResult {
  media: {
    id: string;
    caption: string;
    timestamp: string;
    thumbnail_url?: string;
    media_url?: string;
    permalink: string;
    media_type: string;
    like_count: number;
    comments_count: number;
  };
  insights: {
    impressions: number;
    reach: number;
    plays: number;
    saved: number;
    shares: number;
    avg_watch_time_ms: number;
    total_watch_time_ms: number;
    video_views: number;
  };
  derived: {
    hook_rate: number;
    engagement_rate: number;
    save_rate: number;
    share_rate: number;
    avg_watch_time_sec: number;
    completion_estimate: number | null;
  };
  ai: {
    summary: string;
    went_well: string[];
    improve: string[];
    next_steps: string[];
  };
}

function StatCard({
  label, value, sub, icon: Icon, color, highlight
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; highlight?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-2xl p-4 border flex flex-col gap-2",
      highlight ? "bg-brand-primary/5 border-brand-primary/20" : "bg-white border-zinc-100"
    )}>
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", color)}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-2xl font-display font-bold">{value}</div>
        <div className="text-xs text-zinc-500 font-medium">{label}</div>
        {sub && <div className="text-[11px] text-zinc-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function RatingBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct >= 60 ? 'bg-emerald-400' : pct >= 30 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function VideoAnalytics({ onBack, token: authToken }: Props) {
  const [statusLoading, setStatusLoading] = useState(true);
  const [account, setAccount] = useState<IgAccount | null>(null);
  const [igToken, setIgToken] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Check saved token on mount
  useEffect(() => {
    const init = async () => {
      try {
        if (authToken) {
          const statusRes = await fetch('/api/instagram/status', {
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          const status = await statusRes.json();
          if (status.connected) {
            setAccount(status.account);
            setIgToken(status.token);
          }
        }
      } catch (e) {
        console.error('Status check failed', e);
      } finally {
        setStatusLoading(false);
      }
    };
    init();
  }, [authToken]);

  const handleVerifyToken = async () => {
    if (!tokenInput.trim()) return;
    setVerifying(true);
    setConnectError(null);
    try {
      const res = await fetch('/api/instagram/connect-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ accessToken: tokenInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setAccount(data.account);
      setIgToken(data.accessToken || tokenInput.trim());
      setTokenInput('');
    } catch (err: any) {
      setConnectError(err.message || 'Invalid token');
    } finally {
      setVerifying(false);
    }
  };

  const handleDisconnect = async () => {
    if (!authToken) {
      setAccount(null);
      setIgToken(null);
      return;
    }
    setDisconnecting(true);
    try {
      await fetch('/api/instagram/disconnect', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      setAccount(null);
      setIgToken(null);
      setResult(null);
    } catch (e) {
      console.error('Disconnect failed', e);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleAnalyze = async () => {
    if (!igToken || !videoUrl.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/instagram/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ videoUrl: videoUrl.trim(), accessToken: igToken })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const fmtNum = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };
  const fmtSec = (ms: number) => {
    const s = Math.round(ms / 1000);
    if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
    return `${s}s`;
  };
  const fmtPct = (n: number) => `${n.toFixed(1)}%`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-zinc-100 transition-colors flex-shrink-0">
          <ChevronLeft size={22} />
        </button>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Instagram size={20} className="text-brand-primary" />
            <h2 className="text-2xl sm:text-3xl font-display font-bold">Reel Analytics</h2>
          </div>
          <p className="text-sm text-zinc-500">Analyze your Instagram Reels and get AI-powered insights</p>
        </div>
      </div>

      {statusLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-brand-primary" />
        </div>
      )}

      {!statusLoading && (
        <>
          {/* No token — show instructions */}
          {!account && (
            <div className="bg-white border border-zinc-200 rounded-3xl p-5 sm:p-7 mb-6 shadow-sm">
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="w-full flex items-center justify-between gap-2 mb-4 group"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-primary">
                  <Sparkles size={15} />
                  How to get your Instagram token
                </div>
                {showInstructions ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
              </button>

              <AnimatePresence>
                {showInstructions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-5"
                  >
                    <div className="bg-zinc-50 rounded-2xl p-4 space-y-3 border border-zinc-100 mb-5">
                      {[
                        { step: 1, title: 'Open Graph API Explorer', desc: 'Go to developers.facebook.com/tools/explorer', link: 'https://developers.facebook.com/tools/explorer/' },
                        { step: 2, title: 'Select your Meta App', desc: 'Choose your app from the dropdown at the top' },
                        { step: 3, title: 'Generate Access Token', desc: 'Click "Generate Access Token" and grant these permissions: instagram_basic, instagram_manage_insights, pages_show_list' },
                        { step: 4, title: 'Copy the token', desc: 'The token appears as a long string. Copy it and paste below.' },
                      ].map(s => (
                        <div key={s.step} className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                            {s.step}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-zinc-800">{s.title}</div>
                            <div className="text-xs text-zinc-500 mt-0.5">{s.desc}</div>
                            {s.link && (
                              <a href={s.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-primary font-semibold mt-1 hover:underline">
                                Open <ExternalLink size={11} />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                    Paste your Access Token
                  </label>
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={e => setTokenInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleVerifyToken()}
                    placeholder="EAAxxxxxx..."
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-all bg-zinc-50"
                  />
                </div>

                <button
                  onClick={handleVerifyToken}
                  disabled={verifying || !tokenInput.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-primary text-white font-semibold text-sm hover:bg-brand-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifying ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      Verify & Connect
                    </>
                  )}
                </button>
              </div>

              {connectError && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-100"
                >
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{connectError}</p>
                </motion.div>
              )}
            </div>
          )}

          {/* Connected — show analyze form */}
          {account && (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                {/* Connected badge */}
                <div className="bg-white border border-zinc-200 rounded-3xl p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {account.profile_pic ? (
                      <img src={account.profile_pic} alt={account.username} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ee2a7b] to-[#6228d7] flex items-center justify-center">
                        <UserIcon size={18} className="text-white" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span className="text-xs font-semibold text-emerald-700">Connected</span>
                      </div>
                      <p className="text-sm font-bold text-zinc-900">@{account.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
                  >
                    {disconnecting ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
                    Disconnect
                  </button>
                </div>

                {/* Analyze form */}
                {!result && (
                  <div className="bg-white border border-zinc-200 rounded-3xl p-5 sm:p-7 shadow-sm">
                    <h3 className="text-sm font-bold text-zinc-700 mb-4">Paste the URL of the Reel you want to analyze</h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Link2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="url"
                          value={videoUrl}
                          onChange={e => setVideoUrl(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                          placeholder="https://www.instagram.com/reel/..."
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-all bg-zinc-50"
                        />
                      </div>
                      <button
                        onClick={handleAnalyze}
                        disabled={loading || !videoUrl.trim()}
                        className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-primary text-white font-semibold text-sm hover:bg-brand-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {loading ? (
                          <><Loader2 size={15} className="animate-spin" /> Analyzing...</>
                        ) : (
                          <><BarChart3 size={15} /> Analyze Reel</>
                        )}
                      </button>
                    </div>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-100"
                      >
                        <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700">{error}</p>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Results */}
                {result && (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                    {/* Post info */}
                    <div className="bg-white border border-zinc-200 rounded-3xl p-5 sm:p-6 shadow-sm flex gap-4 items-start">
                      {(result.media.thumbnail_url || result.media.media_url) && (
                        <img src={result.media.thumbnail_url || result.media.media_url} alt="Reel thumbnail" className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Instagram size={13} className="text-brand-primary" />
                          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                            {result.media.media_type === 'REEL' ? 'Instagram Reel' : result.media.media_type}
                          </span>
                          <span className="text-xs text-zinc-400">· {new Date(result.media.timestamp).toLocaleDateString()}</span>
                        </div>
                        {result.media.caption && (
                          <p className="text-sm text-zinc-700 line-clamp-2">{result.media.caption}</p>
                        )}
                        <a href={result.media.permalink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-primary font-semibold mt-1.5 hover:underline">
                          View on Instagram <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>

                    {/* Key Metrics Grid */}
                    <div>
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 px-1">Key Metrics</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <StatCard label="Plays" value={fmtNum(result.insights.plays)} icon={Eye} color="bg-blue-100 text-blue-600" />
                        <StatCard label="Reach" value={fmtNum(result.insights.reach)} icon={TrendingUp} color="bg-violet-100 text-violet-600" />
                        <StatCard label="Impressions" value={fmtNum(result.insights.impressions)} icon={BarChart3} color="bg-orange-100 text-orange-600" />
                        <StatCard label="Likes" value={fmtNum(result.media.like_count)} icon={Heart} color="bg-red-100 text-red-500" />
                        <StatCard label="Comments" value={fmtNum(result.media.comments_count)} icon={MessageCircle} color="bg-yellow-100 text-yellow-600" />
                        <StatCard label="Saves" value={fmtNum(result.insights.saved)} icon={Bookmark} color="bg-emerald-100 text-emerald-600" />
                        {result.insights.shares > 0 && (
                          <StatCard label="Shares" value={fmtNum(result.insights.shares)} icon={Share2} color="bg-sky-100 text-sky-600" />
                        )}
                        <StatCard label="Avg Watch Time" value={fmtSec(result.insights.avg_watch_time_ms)} icon={Clock} color="bg-brand-primary/10 text-brand-primary" highlight />
                      </div>
                    </div>

                    {/* Performance Rates */}
                    <div className="bg-white border border-zinc-200 rounded-3xl p-5 sm:p-7 shadow-sm">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-5">Performance Rates</h3>
                      <div className="space-y-5">
                        {[
                          { label: 'Hook Rate', sub: 'Viewers who kept watching past the first 3 seconds', value: result.derived.hook_rate, fmt: fmtPct(result.derived.hook_rate), benchmark: 60 },
                          { label: 'Engagement Rate', sub: 'Likes + comments + saves + shares vs. reach', value: result.derived.engagement_rate, fmt: fmtPct(result.derived.engagement_rate), benchmark: 5 },
                          { label: 'Save Rate', sub: 'Saves compared to reach — shows content value', value: result.derived.save_rate * 10, fmt: fmtPct(result.derived.save_rate), benchmark: 50 },
                          ...(result.derived.completion_estimate !== null ? [{ label: 'Watch Completion (est.)', sub: 'Estimated % of the Reel viewers watched', value: result.derived.completion_estimate, fmt: fmtPct(result.derived.completion_estimate), benchmark: 50 }] : [])
                        ].map(m => (
                          <div key={m.label}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div>
                                <div className="text-sm font-semibold text-zinc-800">{m.label}</div>
                                <div className="text-[11px] text-zinc-400">{m.sub}</div>
                              </div>
                              <div className={cn("text-lg font-display font-bold", m.value >= m.benchmark ? 'text-emerald-600' : m.value >= m.benchmark * 0.5 ? 'text-yellow-600' : 'text-red-500')}>
                                {m.fmt}
                              </div>
                            </div>
                            <RatingBar value={m.value} max={m.benchmark * 1.5} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI Insights */}
                    <div className="bg-gradient-to-br from-brand-primary/5 to-brand-secondary/5 border border-brand-primary/15 rounded-3xl p-5 sm:p-7">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles size={17} className="text-brand-primary" />
                        <h3 className="text-sm font-bold text-zinc-800">AI Analysis</h3>
                      </div>
                      <p className="text-sm text-zinc-700 leading-relaxed mb-5">{result.ai.summary}</p>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <ThumbsUp size={14} className="text-emerald-600" />
                            <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-widest">What Worked</h4>
                          </div>
                          <ul className="space-y-2">
                            {result.ai.went_well.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-emerald-800">
                                <CheckCircle2 size={12} className="flex-shrink-0 mt-0.5 text-emerald-500" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <ThumbsDown size={14} className="text-orange-600" />
                            <h4 className="text-xs font-bold text-orange-700 uppercase tracking-widest">What to Improve</h4>
                          </div>
                          <ul className="space-y-2">
                            {result.ai.improve.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-orange-800">
                                <AlertCircle size={12} className="flex-shrink-0 mt-0.5 text-orange-500" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      {result.ai.next_steps.length > 0 && (
                        <div className="mt-4 bg-white/70 border border-brand-primary/10 rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <TrendingUp size={14} className="text-brand-primary" />
                            <h4 className="text-xs font-bold text-brand-primary uppercase tracking-widest">Next Steps</h4>
                          </div>
                          <ul className="space-y-2">
                            {result.ai.next_steps.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-zinc-700">
                                <span className="w-4 h-4 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Analyze another */}
                    <button
                      onClick={() => { setResult(null); setVideoUrl(''); setError(null); }}
                      className="w-full py-3 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCcw size={14} />
                      Analyze another Reel
                    </button>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </>
      )}
    </motion.div>
  );
}
