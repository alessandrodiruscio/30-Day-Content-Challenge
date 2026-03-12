import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, Instagram, Link2, Eye, Clock, TrendingUp,
  Heart, MessageCircle, Bookmark, Share2, ChevronDown, ChevronUp,
  Sparkles, AlertCircle, CheckCircle2, ThumbsUp, ThumbsDown,
  BarChart3, Loader2, ExternalLink, Copy, Check
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

const TOKEN_STEPS = [
  {
    step: 1,
    title: 'Open Meta Business Suite',
    desc: 'Go to business.facebook.com and log into your account.',
    link: 'https://business.facebook.com',
    linkText: 'Open Meta Business Suite'
  },
  {
    step: 2,
    title: 'Go to the Graph API Explorer',
    desc: 'Visit the Meta developer tools and open the Graph API Explorer.',
    link: 'https://developers.facebook.com/tools/explorer/',
    linkText: 'Open Graph API Explorer'
  },
  {
    step: 3,
    title: 'Generate a User Token',
    desc: 'Click "Generate Access Token", select your Instagram Business account, and grant instagram_manage_insights, instagram_basic, and pages_show_list permissions.',
  },
  {
    step: 4,
    title: 'Copy and paste the token here',
    desc: 'Copy the generated token and paste it in the field below. It\'s only used for this analysis and never saved.',
  },
];

function StatCard({
  label, value, sub, icon: Icon, color, highlight
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  highlight?: boolean;
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
  const [showInstructions, setShowInstructions] = useState(false);
  const [igToken, setIgToken] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  const handleAnalyze = async () => {
    if (!igToken.trim() || !videoUrl.trim()) return;
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
        body: JSON.stringify({ videoUrl: videoUrl.trim(), accessToken: igToken.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Check your token and URL.');
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
          <p className="text-sm text-zinc-500">Analyze any Instagram Reel and get AI-powered insights</p>
        </div>
      </div>

      {/* Input Card */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-5 sm:p-7 mb-6 shadow-sm">

        {/* How to get token toggle */}
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="w-full flex items-center justify-between gap-2 mb-4 group"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-primary">
            <Sparkles size={15} />
            How to get your Instagram Access Token
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
              <div className="bg-zinc-50 rounded-2xl p-4 space-y-4 border border-zinc-100">
                {TOKEN_STEPS.map(s => (
                  <div key={s.step} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {s.step}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-800">{s.title}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{s.desc}</div>
                      {s.link && (
                        <a
                          href={s.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-brand-primary font-semibold mt-1 hover:underline"
                        >
                          {s.linkText} <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                <div className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-200">
                  Your token is used only for this request and is never stored on our servers.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {/* Token input */}
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
              Instagram Access Token
            </label>
            <div className="relative">
              <input
                type="password"
                value={igToken}
                onChange={e => setIgToken(e.target.value)}
                placeholder="EAAxxxxxx..."
                className="w-full px-4 py-3 pr-10 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-all bg-zinc-50"
              />
            </div>
          </div>

          {/* URL input */}
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
              Instagram Reel URL
            </label>
            <div className="relative">
              <Link2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="url"
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                placeholder="https://www.instagram.com/reel/..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-all bg-zinc-50"
              />
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || !igToken.trim() || !videoUrl.trim()}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand-primary text-white font-semibold text-sm hover:bg-brand-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Analyzing your Reel...
              </>
            ) : (
              <>
                <BarChart3 size={16} />
                Analyze Reel
              </>
            )}
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-100"
          >
            <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{error}</p>
          </motion.div>
        )}
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Post info */}
            <div className="bg-white border border-zinc-200 rounded-3xl p-5 sm:p-7 shadow-sm flex gap-4 items-start">
              {(result.media.thumbnail_url || result.media.media_url) && (
                <img
                  src={result.media.thumbnail_url || result.media.media_url}
                  alt="Reel thumbnail"
                  className="w-20 h-20 rounded-2xl object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Instagram size={14} className="text-brand-primary" />
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    {result.media.media_type === 'REEL' ? 'Instagram Reel' : result.media.media_type}
                  </span>
                  <span className="text-xs text-zinc-400">
                    · {new Date(result.media.timestamp).toLocaleDateString()}
                  </span>
                </div>
                {result.media.caption && (
                  <p className="text-sm text-zinc-700 line-clamp-3">{result.media.caption}</p>
                )}
                <a
                  href={result.media.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand-primary font-semibold mt-2 hover:underline"
                >
                  View on Instagram <ExternalLink size={10} />
                </a>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div>
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 px-1">Key Metrics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard
                  label="Plays" value={fmtNum(result.insights.plays)}
                  icon={Eye} color="bg-blue-100 text-blue-600"
                />
                <StatCard
                  label="Reach" value={fmtNum(result.insights.reach)}
                  icon={TrendingUp} color="bg-violet-100 text-violet-600"
                />
                <StatCard
                  label="Impressions" value={fmtNum(result.insights.impressions)}
                  icon={BarChart3} color="bg-orange-100 text-orange-600"
                />
                <StatCard
                  label="Likes" value={fmtNum(result.media.like_count)}
                  icon={Heart} color="bg-red-100 text-red-500"
                />
                <StatCard
                  label="Comments" value={fmtNum(result.media.comments_count)}
                  icon={MessageCircle} color="bg-yellow-100 text-yellow-600"
                />
                <StatCard
                  label="Saves" value={fmtNum(result.insights.saved)}
                  icon={Bookmark} color="bg-emerald-100 text-emerald-600"
                />
                {result.insights.shares > 0 && (
                  <StatCard
                    label="Shares" value={fmtNum(result.insights.shares)}
                    icon={Share2} color="bg-sky-100 text-sky-600"
                  />
                )}
                <StatCard
                  label="Avg Watch Time" value={fmtSec(result.insights.avg_watch_time_ms)}
                  icon={Clock} color="bg-brand-primary/10 text-brand-primary"
                  highlight
                />
              </div>
            </div>

            {/* Performance Rates */}
            <div className="bg-white border border-zinc-200 rounded-3xl p-5 sm:p-7 shadow-sm">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-5">Performance Rates</h3>
              <div className="space-y-5">
                {[
                  {
                    label: 'Hook Rate',
                    sub: 'Viewers who kept watching past the first 3 seconds',
                    value: result.derived.hook_rate,
                    fmt: fmtPct(result.derived.hook_rate),
                    benchmark: 60
                  },
                  {
                    label: 'Engagement Rate',
                    sub: 'Likes + comments + saves + shares vs. reach',
                    value: result.derived.engagement_rate,
                    fmt: fmtPct(result.derived.engagement_rate),
                    benchmark: 5
                  },
                  {
                    label: 'Save Rate',
                    sub: 'Saves compared to reach — shows content value',
                    value: result.derived.save_rate * 10,
                    fmt: fmtPct(result.derived.save_rate),
                    benchmark: 50
                  },
                  ...(result.derived.completion_estimate !== null ? [{
                    label: 'Watch Completion (est.)',
                    sub: 'Estimated % of the Reel viewers watched',
                    value: result.derived.completion_estimate,
                    fmt: fmtPct(result.derived.completion_estimate),
                    benchmark: 50
                  }] : [])
                ].map(m => (
                  <div key={m.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <div className="text-sm font-semibold text-zinc-800">{m.label}</div>
                        <div className="text-[11px] text-zinc-400">{m.sub}</div>
                      </div>
                      <div className={cn(
                        "text-lg font-display font-bold",
                        m.value >= m.benchmark ? 'text-emerald-600' : m.value >= m.benchmark * 0.5 ? 'text-yellow-600' : 'text-red-500'
                      )}>
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
              <div className="flex items-center gap-2 mb-5">
                <Sparkles size={18} className="text-brand-primary" />
                <h3 className="text-sm font-bold text-zinc-800">AI Analysis</h3>
              </div>

              <p className="text-sm text-zinc-700 leading-relaxed mb-6">{result.ai.summary}</p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ThumbsUp size={15} className="text-emerald-600" />
                    <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-widest">What Worked</h4>
                  </div>
                  <ul className="space-y-2">
                    {result.ai.went_well.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-emerald-800">
                        <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5 text-emerald-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ThumbsDown size={15} className="text-orange-600" />
                    <h4 className="text-xs font-bold text-orange-700 uppercase tracking-widest">What to Improve</h4>
                  </div>
                  <ul className="space-y-2">
                    {result.ai.improve.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-orange-800">
                        <AlertCircle size={13} className="flex-shrink-0 mt-0.5 text-orange-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {result.ai.next_steps.length > 0 && (
                <div className="mt-4 bg-white/70 border border-brand-primary/10 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={15} className="text-brand-primary" />
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
              onClick={() => { setResult(null); setVideoUrl(''); }}
              className="w-full py-3 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-all"
            >
              Analyze another Reel
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
