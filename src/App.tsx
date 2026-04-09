
import React, { useState, useEffect, useMemo, Component, ReactNode } from 'react';
import { 
  Users, 
  LayoutDashboard, 
  Target, 
  ClipboardCheck, 
  FileText, 
  Plus,
  ChevronRight,
  TrendingUp,
  Video,
  MessageSquare,
  Award,
  Calendar,
  Activity,
  BarChart3,
  Dribbble,
  User,
  Download,
  Lock,
  LogOut,
  Eye,
  EyeOff,
  Database,
  Upload,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Player, PlayerData, Category, Evaluation, MatchStats, TestResults, PlayerProfile, IDPGoals } from './types';
import { CATEGORIES, EVAL_ITEMS, PERIODS, GRADES, SCORE_LABELS, EVAL_CRITERIA } from './constants';
import { exportToPDF } from './lib/pdfExport';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CATEGORY_LABELS: Record<Category, string> = {
  Technical: 'テクニカル',
  Tactical: 'タクティカル',
  Physical: 'フィジカル',
  Mental: 'メンタル',
  Social: 'ソーシャル',
  Situation: 'シチュエーション'
};

const getRankLabel = (score: number) => {
  if (score >= 9) return 'S';
  if (score >= 7) return 'A';
  if (score >= 5) return 'B';
  return 'C';
};

const getShotStopColor = (rate: number | null) => {
  if (rate === null) return 'text-zinc-400';
  if (rate < 30) return 'text-red-500';
  if (rate < 80) return 'text-amber-500';
  return 'text-blue-500';
};

const formatRate = (success: number, total: number) => {
  if (!total || total === 0) return '-';
  return `${Math.round((success / total) * 100)}%`;
};

const getCriteriaText = (item: string, score: number) => {
  const criteria = EVAL_CRITERIA[item];
  if (!criteria) return null;
  const rank = getRankLabel(score);
  return criteria[rank as keyof typeof criteria];
};

// --- Mock Data ---
const INITIAL_PLAYERS: Player[] = [
  { id: '1', name: '佐藤 健太', grade: '高校2年生', birthDate: '2008-05-15', dominantArm: '右' },
  { id: '2', name: '田中 悠真', grade: '中学3年生', birthDate: '2010-08-20', dominantArm: '左' },
  { id: '3', name: '鈴木 翼', grade: '高校1年生', birthDate: '2009-11-02', dominantArm: '右' },
  { id: '4', name: '高橋 蓮', grade: '中学2年生', birthDate: '2011-12-10', dominantArm: '右' },
].sort((a, b) => {
  const gradeToNum = (g: string) => {
    if (g.includes('高校3')) return 6;
    if (g.includes('高校2')) return 5;
    if (g.includes('高校1')) return 4;
    if (g.includes('中学3')) return 3;
    if (g.includes('中学2')) return 2;
    if (g.includes('中学1')) return 1;
    return 0;
  };
  return gradeToNum(b.grade) - gradeToNum(a.grade); // Higher grade first
});

const DEFAULT_GOALS: IDPGoals = {
  graduationGoal: 'Jリーグで活躍する、圧倒的な守備範囲を持つGK',
  periods: {
    '高校2年生_4-7月': { performanceGoal: '県大会ベスト4進出', processGoal: 'シュートストップ率80%以上', metrics: 'セービング成功率', interviewDate: '2025-04-10', review: '' },
    '高校2年生_8-11月': { performanceGoal: 'リーグ戦全試合出場', processGoal: 'コーチングの質の向上', metrics: '無失点試合数', interviewDate: '2025-08-15', review: '' },
    '高校2年生_12-3月': { performanceGoal: 'プロ下部組織への昇格内定', processGoal: 'ビルドアップの起点となる', metrics: 'パス成功率', interviewDate: '2025-12-20', review: '' },
  }
};

const DEFAULT_PROFILE: PlayerProfile = {
  name: '',
  grade: '高校2年生',
  height: '182',
  weight: '75',
  dominantFoot: '右足',
  dominantArm: '右',
  birthDate: '2008-05-15',
};

// --- Components ---

const SaveButton = ({ 
  onClick, 
  label, 
  className,
  icon: Icon = Save
}: { 
  onClick: () => void | Promise<void>, 
  label: string, 
  className?: string,
  icon?: any
}) => {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setStatus('saving');
    try {
      await onClick();
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      console.error("Save failed", error);
      setStatus('idle');
    }
  };

  return (
    <button 
      onClick={handleClick}
      disabled={status === 'saving'}
      className={cn(
        "relative overflow-hidden transition-all active:scale-95 flex items-center justify-center gap-2",
        status === 'saved' ? "bg-emerald-500 text-white" : className,
        status === 'saving' && "opacity-80 cursor-not-allowed"
      )}
    >
      <AnimatePresence mode="wait">
        {status === 'saved' ? (
          <motion.div
            key="saved"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            className="flex items-center justify-center gap-2"
          >
            <ClipboardCheck size={18} />
            <span>保存完了</span>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            className="flex items-center justify-center gap-2"
          >
            <Icon size={18} />
            <span>{status === 'saving' ? '保存中...' : label}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};

const Modal = ({ 
  onClose, 
  title, 
  children 
}: { 
  onClose: () => void, 
  title: string, 
  children: React.ReactNode 
}) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-200"
      >
        <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <h3 className="font-bold text-zinc-900">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-200 rounded-lg transition-colors">
            <Plus size={20} className="rotate-45 text-zinc-500" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

const AddPlayerModal = ({ 
  onClose, 
  onAdd 
}: { 
  onClose: () => void, 
  onAdd: (name: string) => void 
}) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim());
      setName('');
      onClose();
    }
  };

  return (
    <Modal onClose={onClose} title="新しい選手を追加">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">選手名</label>
          <input 
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 佐藤 健太"
            className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          />
        </div>
        <button 
          type="submit"
          disabled={!name.trim()}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-900/10 transition-all active:scale-[0.98]"
        >
          追加する
        </button>
      </form>
    </Modal>
  );
};

const DeleteConfirmModal = ({ 
  onClose, 
  onConfirm,
  playerName
}: { 
  onClose: () => void, 
  onConfirm: () => void,
  playerName: string
}) => (
  <Modal onClose={onClose} title="選手の削除">
    <div className="space-y-6">
      <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
        <p className="text-red-800 text-sm leading-relaxed">
          <span className="font-bold">{playerName}</span> 選手のデータをすべて削除してもよろしいですか？この操作は取り消せません。
        </p>
      </div>
      <div className="flex gap-3">
        <button 
          onClick={onClose}
          className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-bold rounded-xl transition-colors"
        >
          キャンセル
        </button>
        <button 
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-900/20 transition-colors"
        >
          削除する
        </button>
      </div>
    </div>
  </Modal>
);

const Login = ({ onLogin }: { onLogin: () => void }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // パスワード設定: 環境変数 VITE_COACH_PASSWORD が設定されていない場合は 'coach' がデフォルトになります
    const coachPassword = (import.meta.env.VITE_COACH_PASSWORD || 'coach').trim();
    
    // Debug log
    console.log("Attempting login with password length:", password.trim().length);
    
    if (password.trim() === coachPassword) {
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900 p-8 rounded-3xl border border-zinc-800 shadow-2xl relative z-10"
      >
        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock size={32} />
        </div>
        <h1 className="text-2xl font-black text-white text-center mb-2 uppercase tracking-tight">Coach Login</h1>
        <p className="text-zinc-500 text-center mb-8 text-sm font-medium">GK IDP Hub - 管理者専用アクセス</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "w-full bg-zinc-800 border p-4 pr-12 rounded-2xl text-white outline-none transition-all focus:ring-2 focus:ring-emerald-500/50",
                  error ? "border-red-500 shake" : "border-zinc-700"
                )}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 ml-1">※初期パスワードは「coach」です</p>
          </div>
          {error && (
            <p className="text-red-500 text-xs font-bold text-center animate-pulse">パスワードが正しくありません</p>
          )}
          <button 
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-900/20 transition-all active:scale-[0.98]"
          >
            ログイン
          </button>
        </form>
        
        <div className="mt-8 pt-8 border-t border-zinc-800 text-center">
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">© 2026 GK IDP Hub System</p>
        </div>
      </motion.div>
    </div>
  );
};

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(_error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-12 text-center bg-white rounded-3xl shadow-xl border border-zinc-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Activity size={32} />
          </div>
          <h2 className="text-2xl font-black text-zinc-900 mb-4 uppercase tracking-tight">レポートの表示中にエラーが発生しました</h2>
          <p className="text-zinc-500 mb-8 max-w-md mx-auto font-medium">データの形式が正しくないか、読み込み中に問題が発生した可能性があります。一度データをリセットしていただくか、管理者にお問い合わせください。</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-zinc-100 text-zinc-900 rounded-xl font-bold hover:bg-zinc-200 transition-all"
            >
              再読み込み
            </button>
            <button 
              onClick={() => {
                if (confirm('全てのデータが削除されます。本当によろしいですか？')) {
                  localStorage.removeItem('gk_idp_data');
                  window.location.reload();
                }
              }}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
            >
              データをリセット
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

const Sidebar = ({ 
  players, 
  selectedId, 
  onSelect,
  onAddPlayer,
  onDeletePlayer,
  onExport,
  onImport
}: { 
  players: Player[], 
  selectedId: string, 
  onSelect: (id: string) => void,
  onAddPlayer: () => void,
  onDeletePlayer: (id: string) => void,
  onExport: () => void,
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void
}) => (
  <div className="w-64 bg-zinc-900 text-zinc-100 h-screen flex flex-col border-r border-zinc-800 shrink-0">
    <div className="p-6 border-b border-zinc-800">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Award className="text-emerald-500" />
          GK IDP Hub
        </h1>
        <div className="flex items-center gap-1">
          <button 
            onClick={onExport}
            className="p-1.5 text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
            title="データを書き出し"
          >
            <Save size={16} />
          </button>
          <label className="p-1.5 text-zinc-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all cursor-pointer" title="データを読み込み">
            <Upload size={16} />
            <input 
              type="file" 
              accept=".json" 
              onChange={onImport} 
              className="hidden" 
            />
          </label>
        </div>
      </div>
      <p className="text-xs text-zinc-500">Junior Youth / Youth GK</p>
    </div>
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-2">Players</div>
      {players.map(player => (
        <div key={player.id} className="group relative">
          <button
            onClick={() => onSelect(player.id)}
            className={cn(
              "w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-all",
              selectedId === player.id 
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20" 
                : "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                selectedId === player.id ? "bg-white/20" : "bg-zinc-700"
              )}>
                {player.name[0]}
              </div>
              <div className="flex flex-col">
                <span className="font-medium truncate max-w-[120px]">{player.name}</span>
                <span className="text-[10px] opacity-60">{player.grade}</span>
              </div>
            </div>
            <ChevronRight size={16} className={cn(
              "transition-transform",
              selectedId === player.id ? "rotate-90" : "opacity-0 group-hover:opacity-100"
            )} />
          </button>
          
          {selectedId !== player.id && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDeletePlayer(player.id);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Plus size={14} className="rotate-45" />
            </button>
          )}
        </div>
      ))}
    </div>
    <div className="p-4 border-t border-zinc-800">
      <button 
        onClick={() => {
          console.log("Add Player button clicked");
          onAddPlayer();
        }}
        className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
      >
        <Plus size={16} />
        Add Player
      </button>
    </div>
  </div>
);

const Dashboard = ({ data }: { data: PlayerData }) => {
  const evaluations = data.evaluations || [];
  const latestEval = evaluations[evaluations.length - 1];
  
  const radarData = CATEGORIES.map(cat => {
    const items = EVAL_ITEMS[cat] || [];
    const scores = items.map(item => latestEval?.scores?.[item] || 0) as number[];
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return { subject: CATEGORY_LABELS[cat], A: avg, fullMark: 10 };
  });

  const trendData = useMemo(() => {
    const allPeriods: any[] = [];
    GRADES.forEach(grade => {
      PERIODS.forEach(period => {
        const key = `${grade}_${period}`;
        const evalForPeriod = evaluations.find(e => e.period === key) || 
                              (grade === data.profile?.grade ? evaluations.find(e => e.period === period) : null);
        
        if (evalForPeriod) {
          const result: any = { name: `${grade.replace('年生', '')} ${period}` };
          CATEGORIES.forEach(cat => {
            const items = EVAL_ITEMS[cat] || [];
            const scores = items.map(item => evalForPeriod?.scores?.[item] || 0) as number[];
            const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            result[cat] = parseFloat(avg.toFixed(1));
          });
          allPeriods.push(result);
        }
      });
    });
    return allPeriods;
  }, [evaluations, data.profile?.grade]);

  const currentGradeGoals = useMemo(() => {
    const grade = data.profile?.grade || '';
    return PERIODS.map(p => {
      const key = `${grade}_${p}`;
      let gData = data.goals?.periods?.[key];
      if (!gData && grade === data.profile?.grade) {
        if (p === '4-7月') gData = data.goals?.period1;
        if (p === '8-11月') gData = data.goals?.period2;
        if (p === '12-3月') gData = data.goals?.period3;
      }
      return { label: p, goal: gData?.performanceGoal };
    });
  }, [data.goals, data.profile?.grade]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: '学年', val: data.profile?.grade, icon: Award, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '身長', val: data.profile?.height ? `${data.profile.height}cm` : '-', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: '体重', val: data.profile?.weight ? `${data.profile.weight}kg` : '-', icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: '利き足', val: data.profile?.dominantFoot, icon: Target, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: '利き腕', val: data.profile?.dominantArm, icon: Dribbble, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((item, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-4">
            <div className={cn("p-3 rounded-xl", item.bg, item.color)}>
              <item.icon size={20} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{item.label}</div>
              <div className="text-lg font-black text-zinc-900">{item.val || '-'}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="text-emerald-600" size={20} />
            最新の評価バランス
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#e4e4e7" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                <Radar
                  name="Score"
                  dataKey="A"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="text-emerald-600" size={20} />
            成長推移 (3年間)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                {CATEGORIES.map((cat, idx) => (
                  <Line 
                    key={cat} 
                    type="monotone" 
                    name={CATEGORY_LABELS[cat]}
                    dataKey={cat} 
                    stroke={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][idx % 5]} 
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
        <h3 className="text-lg font-bold mb-4">目標ステータス ({data.profile?.grade})</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currentGradeGoals.map((item, i) => (
            <div key={i} className="p-4 rounded-xl border border-zinc-100 hover:border-emerald-200 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{item.label}</span>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold uppercase", item.goal ? "bg-emerald-50 text-emerald-700" : "bg-zinc-50 text-zinc-600")}>
                  {item.goal ? '進行中' : '未着手'}
                </span>
              </div>
              <p className="font-bold text-zinc-800">{item.goal || '-'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const calculateGrade = (birthDateStr: string) => {
  if (!birthDateStr) return '';
  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate.getTime())) return '';

  const now = new Date();
  const currentYear = now.getFullYear();
  // 日本の年度は4月始まり
  const schoolYearStart = now.getMonth() < 3 
    ? new Date(currentYear - 1, 3, 1) 
    : new Date(currentYear, 3, 1);

  // 4月1日時点での年齢を計算
  let age = schoolYearStart.getFullYear() - birthDate.getFullYear();
  const m = schoolYearStart.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && schoolYearStart.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age === 12) return '中学1年生';
  if (age === 13) return '中学2年生';
  if (age === 14) return '中学3年生';
  if (age === 15) return '高校1年生';
  if (age === 16) return '高校2年生';
  if (age === 17) return '高校3年生';
  
  return '';
};

const ProfileSection = ({ profile, onSave }: { profile: PlayerProfile, onSave: (profile: PlayerProfile) => void }) => {
  const [formData, setFormData] = useState(profile);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-100 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
          <User size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">選手プロフィール</h2>
          <p className="text-zinc-500">基本情報（学年、身長、体重など）を管理します</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">選手名</label>
            <input 
              type="text"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="例: 佐藤 健太"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">学年</label>
            <select 
              value={formData.grade}
              onChange={e => setFormData({...formData, grade: e.target.value})}
              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">選択してください</option>
              {['中学1年生', '中学2年生', '中学3年生', '高校1年生', '高校2年生', '高校3年生'].map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">生年月日</label>
            <input 
              type="date"
              value={formData.birthDate}
              onChange={e => {
                const newBirthDate = e.target.value;
                const calculatedGrade = calculateGrade(newBirthDate);
                setFormData({
                  ...formData, 
                  birthDate: newBirthDate,
                  grade: calculatedGrade || formData.grade
                });
              }}
              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">身長 (cm)</label>
            <input 
              type="number"
              value={formData.height}
              onChange={e => setFormData({...formData, height: e.target.value})}
              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="180"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">体重 (kg)</label>
            <input 
              type="number"
              value={formData.weight}
              onChange={e => setFormData({...formData, weight: e.target.value})}
              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="75"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">利き足</label>
            <input 
              type="text"
              value={formData.dominantFoot}
              onChange={e => setFormData({...formData, dominantFoot: e.target.value})}
              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="例: 右足"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">利き腕</label>
            <select 
              value={formData.dominantArm}
              onChange={e => setFormData({...formData, dominantArm: e.target.value})}
              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="右">右</option>
              <option value="左">左</option>
              <option value="両利き">両利き</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <SaveButton 
            onClick={() => onSave(formData)}
            label="プロフィールを保存"
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-700"
          />
        </div>
      </form>
    </div>
  );
};

const GoalForm = ({ goals, profile, onSave }: { goals: IDPGoals, profile: PlayerProfile, onSave: (goals: IDPGoals) => void }) => {
  const [selectedGrade, setSelectedGrade] = useState(profile.grade || GRADES[3]);
  const [formData, setFormData] = useState<IDPGoals>(goals || { graduationGoal: '', periods: {} });

  useEffect(() => {
    setFormData(goals || { graduationGoal: '', periods: {} });
  }, [goals]);

  const updateField = (period: string, field: string, value: string) => {
    const key = `${selectedGrade}_${period}`;
    setFormData((prev: any) => ({
      ...prev,
      periods: {
        ...(prev.periods || {}),
        [key]: {
          ...(prev.periods?.[key] || {}),
          [field]: value
        }
      }
    }));
  };

  const getPeriodData = (period: string) => {
    const key = `${selectedGrade}_${period}`;
    // Legacy fallback
    if (!formData.periods?.[key]) {
      if (selectedGrade === profile.grade) {
        if (period === '4-7月') return formData.period1 || {};
        if (period === '8-11月') return formData.period2 || {};
        if (period === '12-3月') return formData.period3 || {};
      }
    }
    return formData.periods?.[key] || {};
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-100 max-w-4xl mx-auto" id="interview-sheet">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
            <Target size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">面談シート (IDP)</h2>
            <p className="text-zinc-500">3年間の成長記録を管理します</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => exportToPDF('interview-sheet', `面談シート_${selectedGrade}`)}
            className="p-2 bg-zinc-100 text-zinc-600 rounded-xl hover:bg-zinc-200 transition-all flex items-center gap-2 text-sm font-bold"
          >
            <Download size={18} />
            PDF出力
          </button>
        </div>
      </div>

      {/* Grade Selector */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {GRADES.map(g => (
          <button
            key={g}
            onClick={() => setSelectedGrade(g)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
              selectedGrade === g ? "bg-zinc-900 text-white shadow-lg" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
            )}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        <section className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Award size={18} className="text-emerald-600" />
            卒業時の目標
          </h3>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">どんな選手になるのか</label>
            <textarea 
              value={formData.graduationGoal || ''}
              onChange={e => setFormData({...formData, graduationGoal: e.target.value})}
              className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none h-24"
              placeholder="例: プロクラブで活躍する、圧倒的な守備範囲を持つGK"
            />
          </div>
        </section>

        {PERIODS.map((label) => {
          const pData = getPeriodData(label);
          return (
            <section key={label} className="p-6 border border-zinc-100 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-zinc-900">
                  <span className="text-sm font-bold text-zinc-400 block mb-1">{selectedGrade}</span>
                  {label}
                </h3>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">面談日</label>
                  <input 
                    type="date"
                    value={pData.interviewDate || ''}
                    onChange={e => updateField(label, 'interviewDate', e.target.value)}
                    className="p-2 rounded-lg border border-zinc-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">パフォーマンス目標</label>
                  <textarea 
                    value={pData.performanceGoal || ''}
                    onChange={e => updateField(label, 'performanceGoal', e.target.value)}
                    className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none h-20"
                    placeholder="具体的な成果目標を記入"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">数値目標 (パフォーマンス目標に付随)</label>
                  <input 
                    type="text"
                    value={pData.metrics || ''}
                    onChange={e => updateField(label, 'metrics', e.target.value)}
                    className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="例: セーブ率80%以上"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">プロセス目標</label>
                  <textarea 
                    value={pData.processGoal || ''}
                    onChange={e => updateField(label, 'processGoal', e.target.value)}
                    className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none h-24"
                    placeholder="目標達成のための具体的な行動"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare size={14} />
                    振り返り
                  </label>
                  <textarea 
                    value={pData.review || ''}
                    onChange={e => updateField(label, 'review', e.target.value)}
                    className="w-full p-3 rounded-xl border border-emerald-100 focus:ring-2 focus:ring-emerald-500 outline-none h-24 bg-emerald-50/30"
                    placeholder="この期間の取り組みを振り返ってください"
                  />
                </div>
              </div>
            </section>
          );
        })}

        <div className="flex justify-end">
          <SaveButton 
            onClick={() => onSave(formData)}
            label="保存する"
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20"
          />
        </div>
      </div>
    </div>
  );
};

const MatchStatsSection = ({ stats, onSave }: { stats: MatchStats[], onSave: (stats: MatchStats[]) => void }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'monthly' | 'period'>('list');
  
  const initialStat: MatchStats = {
    id: '',
    date: new Date().toISOString().split('T')[0],
    opponent: '',
    paOutside: { shots: 0, saves: 0 },
    paInside: { shots: 0, saves: 0 },
    highBall: { attacks: 0, successes: 0, errors: 0 },
    oneVsOneB: { attacks: 0, successes: 0, errors: 0 },
    sweeper: { attacks: 0, successes: 0, errors: 0 },
    passDF: { total: 0, successes: 0 },
    passMF: { total: 0, successes: 0 },
    passFW: { total: 0, successes: 0 },
  };

  const [newStat, setNewStat] = useState<MatchStats>(initialStat);

  const calculateRate = (success: number, total: number) => {
    if (!total || total === 0) return null;
    return Math.round((success / total) * 100);
  };

  const handleAdd = () => {
    if (editingId) {
      onSave(stats.map(s => s.id === editingId ? { ...newStat, id: editingId } : s));
    } else {
      onSave([...stats, { ...newStat, id: Math.random().toString(36).substr(2, 9) }]);
    }
    setIsAdding(false);
    setEditingId(null);
    setNewStat(initialStat);
  };

  const handleEdit = (s: MatchStats) => {
    setNewStat(s);
    setEditingId(s.id);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('このデータを削除してもよろしいですか？')) {
      onSave(stats.filter(s => s.id !== id));
    }
  };

  const getAggregatedStats = (filteredStats: MatchStats[]) => {
    const initial = {
      paOutside: { shots: 0, saves: 0 },
      paInside: { shots: 0, saves: 0 },
      highBall: { attacks: 0, successes: 0, errors: 0 },
      oneVsOneB: { attacks: 0, successes: 0, errors: 0 },
      sweeper: { attacks: 0, successes: 0, errors: 0 },
      passDF: { total: 0, successes: 0 },
      passMF: { total: 0, successes: 0 },
      passFW: { total: 0, successes: 0 },
    };

    return filteredStats.reduce((acc, s) => ({
      paOutside: { shots: acc.paOutside.shots + (s.paOutside?.shots || 0), saves: acc.paOutside.saves + (s.paOutside?.saves || 0) },
      paInside: { shots: acc.paInside.shots + (s.paInside?.shots || 0), saves: acc.paInside.saves + (s.paInside?.saves || 0) },
      highBall: { attacks: acc.highBall.attacks + (s.highBall?.attacks || 0), successes: acc.highBall.successes + (s.highBall?.successes || 0), errors: acc.highBall.errors + (s.highBall?.errors || 0) },
      oneVsOneB: { attacks: acc.oneVsOneB.attacks + (s.oneVsOneB?.attacks || 0), successes: acc.oneVsOneB.successes + (s.oneVsOneB?.successes || 0), errors: acc.oneVsOneB.errors + (s.oneVsOneB?.errors || 0) },
      sweeper: { attacks: acc.sweeper.attacks + (s.sweeper?.attacks || 0), successes: acc.sweeper.successes + (s.sweeper?.successes || 0), errors: acc.sweeper.errors + (s.sweeper?.errors || 0) },
      passDF: { total: acc.passDF.total + (s.passDF?.total || 0), successes: acc.passDF.successes + (s.passDF?.successes || 0) },
      passMF: { total: acc.passMF.total + (s.passMF?.total || 0), successes: acc.passMF.successes + (s.passMF?.successes || 0) },
      passFW: { total: acc.passFW.total + (s.passFW?.total || 0), successes: acc.passFW.successes + (s.passFW?.successes || 0) },
    }), initial);
  };

  const renderStatsGrid = (s: any, isAggregated = false) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 border-t pt-4">
      <div className="p-3 bg-zinc-50 rounded-xl">
        <div className="text-[10px] text-zinc-400 font-bold uppercase">PA外セーブ率</div>
        <div className="text-sm font-bold">{formatRate(s.paOutside.saves, s.paOutside.shots)}</div>
        <div className="text-[9px] text-zinc-400">({s.paOutside.saves}/{s.paOutside.shots})</div>
      </div>
      <div className="p-3 bg-zinc-50 rounded-xl">
        <div className="text-[10px] text-zinc-400 font-bold uppercase">PA内セーブ率</div>
        <div className="text-sm font-bold">{formatRate(s.paInside.saves, s.paInside.shots)}</div>
        <div className="text-[9px] text-zinc-400">({s.paInside.saves}/{s.paInside.shots})</div>
      </div>
      <div className="p-3 bg-zinc-50 rounded-xl">
        <div className="text-[10px] text-zinc-400 font-bold uppercase">ハイボール成功率</div>
        <div className="text-sm font-bold">{formatRate(s.highBall.successes, s.highBall.attacks)}</div>
        <div className="text-[9px] text-zinc-400">({s.highBall.successes}/{s.highBall.attacks})</div>
      </div>
      <div className="p-3 bg-zinc-50 rounded-xl">
        <div className="text-[10px] text-zinc-400 font-bold uppercase">ハイボール判断ミス</div>
        <div className="text-sm font-bold text-red-500">{s.highBall.errors}</div>
      </div>
      <div className="p-3 bg-zinc-50 rounded-xl">
        <div className="text-[10px] text-zinc-400 font-bold uppercase">1v1B成功率</div>
        <div className="text-sm font-bold">{formatRate(s.oneVsOneB.successes, s.oneVsOneB.attacks)}</div>
        <div className="text-[9px] text-zinc-400">({s.oneVsOneB.successes}/{s.oneVsOneB.attacks})</div>
      </div>
      <div className="p-3 bg-zinc-50 rounded-xl">
        <div className="text-[10px] text-zinc-400 font-bold uppercase">1v1B判断ミス</div>
        <div className="text-sm font-bold text-red-500">{s.oneVsOneB.errors}</div>
      </div>
      <div className="p-3 bg-zinc-50 rounded-xl">
        <div className="text-[10px] text-zinc-400 font-bold uppercase">スイーパー成功率</div>
        <div className="text-sm font-bold">{formatRate(s.sweeper.successes, s.sweeper.attacks)}</div>
        <div className="text-[9px] text-zinc-400">({s.sweeper.successes}/{s.sweeper.attacks})</div>
      </div>
      <div className="p-3 bg-zinc-50 rounded-xl">
        <div className="text-[10px] text-zinc-400 font-bold uppercase">スイーパー判断ミス</div>
        <div className="text-sm font-bold text-red-500">{s.sweeper.errors}</div>
      </div>
      <div className="p-3 bg-zinc-50 rounded-xl">
        <div className="text-[10px] text-zinc-400 font-bold uppercase">DFへのパス成功率</div>
        <div className="text-sm font-bold">{formatRate(s.passDF.successes, s.passDF.total)}</div>
        <div className="text-[9px] text-zinc-400">({s.passDF.successes}/{s.passDF.total})</div>
      </div>
      <div className="p-3 bg-zinc-50 rounded-xl">
        <div className="text-[10px] text-zinc-400 font-bold uppercase">MFへのパス成功率</div>
        <div className="text-sm font-bold">{formatRate(s.passMF.successes, s.passMF.total)}</div>
        <div className="text-[9px] text-zinc-400">({s.passMF.successes}/{s.passMF.total})</div>
      </div>
      <div className="p-3 bg-zinc-50 rounded-xl">
        <div className="text-[10px] text-zinc-400 font-bold uppercase">FWへのパス成功率</div>
        <div className="text-sm font-bold">{formatRate(s.passFW.successes, s.passFW.total)}</div>
        <div className="text-[9px] text-zinc-400">({s.passFW.successes}/{s.passFW.total})</div>
      </div>
    </div>
  );

  const monthlyStats = useMemo(() => {
    const groups: Record<string, MatchStats[]> = {};
    stats.forEach(s => {
      const month = s.date.substring(0, 7); // YYYY-MM
      if (!groups[month]) groups[month] = [];
      groups[month].push(s);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [stats]);

  const periodStats = useMemo(() => {
    // Periods: 4-7 (7月), 8-11 (11月), 12-3 (3月)
    const groups: Record<string, MatchStats[]> = {
      '4月-7月 (7月面談期)': [],
      '8月-11月 (11月面談期)': [],
      '12月-3月 (3月面談期)': [],
    };
    stats.forEach(s => {
      const month = parseInt(s.date.substring(5, 7));
      if (month >= 4 && month <= 7) groups['4月-7月 (7月面談期)'].push(s);
      else if (month >= 8 && month <= 11) groups['8月-11月 (11月面談期)'].push(s);
      else groups['12月-3月 (3月面談期)'].push(s);
    });
    return Object.entries(groups);
  }, [stats]);

  return (
    <div className="space-y-6" id="match-stats">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Activity className="text-emerald-600" size={20} />
            試合スタッツ
          </h3>
          <button 
            onClick={() => exportToPDF('match-stats', '試合スタッツ')}
            className="p-2 bg-zinc-100 text-zinc-600 rounded-xl hover:bg-zinc-200 transition-all flex items-center gap-2 text-xs font-bold"
          >
            <Download size={16} />
            PDF出力
          </button>
        </div>
        <div className="flex gap-2 bg-zinc-100 p-1 rounded-xl">
          <button 
            onClick={() => setViewMode('list')}
            className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-all", viewMode === 'list' ? "bg-white shadow-sm text-emerald-600" : "text-zinc-500")}
          >
            試合別
          </button>
          <button 
            onClick={() => setViewMode('monthly')}
            className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-all", viewMode === 'monthly' ? "bg-white shadow-sm text-emerald-600" : "text-zinc-500")}
          >
            月別合計
          </button>
          <button 
            onClick={() => setViewMode('period')}
            className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-all", viewMode === 'period' ? "bg-white shadow-sm text-emerald-600" : "text-zinc-500")}
          >
            時期別合計
          </button>
        </div>
        <button 
          onClick={() => {
            if (isAdding) {
              setIsAdding(false);
              setEditingId(null);
              setNewStat(initialStat);
            } else {
              setIsAdding(true);
            }
          }}
          className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-2"
        >
          <Plus size={16} />
          {editingId ? '編集をキャンセル' : '試合データを追加'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">日付</label>
              <input type="date" value={newStat.date} onChange={e => setNewStat({...newStat, date: e.target.value})} className="w-full p-2 rounded-lg border border-zinc-200" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">対戦相手</label>
              <input type="text" value={newStat.opponent} onChange={e => setNewStat({...newStat, opponent: e.target.value})} className="w-full p-2 rounded-lg border border-zinc-200" placeholder="例: 〇〇高校" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-zinc-50 rounded-xl space-y-4">
              <h4 className="font-bold text-sm border-b pb-2">ゴールディフェンス</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase">PA外</div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="text-[9px] text-zinc-400 mb-1">シュート数</div>
                      <input type="number" value={newStat.paOutside.shots || ''} onChange={e => setNewStat({...newStat, paOutside: {...newStat.paOutside, shots: parseInt(e.target.value) || 0}})} className="w-full px-1 py-2 text-center text-sm rounded border bg-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[9px] text-zinc-400 mb-1">セーブ数</div>
                      <input type="number" value={newStat.paOutside.saves || ''} onChange={e => setNewStat({...newStat, paOutside: {...newStat.paOutside, saves: parseInt(e.target.value) || 0}})} className="w-full px-1 py-2 text-center text-sm rounded border bg-white" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase">PA内</div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="text-[9px] text-zinc-400 mb-1">シュート数</div>
                      <input type="number" value={newStat.paInside.shots || ''} onChange={e => setNewStat({...newStat, paInside: {...newStat.paInside, shots: parseInt(e.target.value) || 0}})} className="w-full px-1 py-2 text-center text-sm rounded border bg-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[9px] text-zinc-400 mb-1">セーブ数</div>
                      <input type="number" value={newStat.paInside.saves || ''} onChange={e => setNewStat({...newStat, paInside: {...newStat.paInside, saves: parseInt(e.target.value) || 0}})} className="w-full px-1 py-2 text-center text-sm rounded border bg-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 rounded-xl space-y-4">
              <h4 className="font-bold text-sm border-b pb-2">スペースディフェンス</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase">ハイボール</div>
                  <div className="flex gap-1">
                    <div className="flex-1">
                      <div className="text-[8px] text-zinc-400 mb-1">アタック</div>
                      <input type="number" value={newStat.highBall.attacks || ''} onChange={e => setNewStat({...newStat, highBall: {...newStat.highBall, attacks: parseInt(e.target.value) || 0}})} className="w-full px-0.5 py-2 text-center text-sm rounded border bg-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[8px] text-zinc-400 mb-1">成功</div>
                      <input type="number" value={newStat.highBall.successes || ''} onChange={e => setNewStat({...newStat, highBall: {...newStat.highBall, successes: parseInt(e.target.value) || 0}})} className="w-full px-0.5 py-2 text-center text-sm rounded border bg-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[8px] text-zinc-400 mb-1">ミス</div>
                      <input type="number" value={newStat.highBall.errors || ''} onChange={e => setNewStat({...newStat, highBall: {...newStat.highBall, errors: parseInt(e.target.value) || 0}})} className="w-full px-0.5 py-2 text-center text-sm rounded border bg-white" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase">1v1B (1対1ブロック)</div>
                  <div className="flex gap-1">
                    <div className="flex-1">
                      <div className="text-[8px] text-zinc-400 mb-1">アタック</div>
                      <input type="number" value={newStat.oneVsOneB.attacks || ''} onChange={e => setNewStat({...newStat, oneVsOneB: {...newStat.oneVsOneB, attacks: parseInt(e.target.value) || 0}})} className="w-full px-0.5 py-2 text-center text-sm rounded border bg-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[8px] text-zinc-400 mb-1">成功</div>
                      <input type="number" value={newStat.oneVsOneB.successes || ''} onChange={e => setNewStat({...newStat, oneVsOneB: {...newStat.oneVsOneB, successes: parseInt(e.target.value) || 0}})} className="w-full px-0.5 py-2 text-center text-sm rounded border bg-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[8px] text-zinc-400 mb-1">ミス</div>
                      <input type="number" value={newStat.oneVsOneB.errors || ''} onChange={e => setNewStat({...newStat, oneVsOneB: {...newStat.oneVsOneB, errors: parseInt(e.target.value) || 0}})} className="w-full px-0.5 py-2 text-center text-sm rounded border bg-white" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase">スイーパー守備</div>
                  <div className="flex gap-1">
                    <div className="flex-1">
                      <div className="text-[8px] text-zinc-400 mb-1">アタック</div>
                      <input type="number" value={newStat.sweeper.attacks || ''} onChange={e => setNewStat({...newStat, sweeper: {...newStat.sweeper, attacks: parseInt(e.target.value) || 0}})} className="w-full px-0.5 py-2 text-center text-sm rounded border bg-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[8px] text-zinc-400 mb-1">成功</div>
                      <input type="number" value={newStat.sweeper.successes || ''} onChange={e => setNewStat({...newStat, sweeper: {...newStat.sweeper, successes: parseInt(e.target.value) || 0}})} className="w-full px-0.5 py-2 text-center text-sm rounded border bg-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[8px] text-zinc-400 mb-1">ミス</div>
                      <input type="number" value={newStat.sweeper.errors || ''} onChange={e => setNewStat({...newStat, sweeper: {...newStat.sweeper, errors: parseInt(e.target.value) || 0}})} className="w-full px-0.5 py-2 text-center text-sm rounded border bg-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 rounded-xl space-y-4">
              <h4 className="font-bold text-sm border-b pb-2">オフェンスアクション</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase">DFへのパス</div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="text-[9px] text-zinc-400 mb-1">総パス数</div>
                      <input type="number" value={newStat.passDF.total || ''} onChange={e => setNewStat({...newStat, passDF: {...newStat.passDF, total: parseInt(e.target.value) || 0}})} className="w-full px-1 py-2 text-center text-sm rounded border bg-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[9px] text-zinc-400 mb-1">成功数</div>
                      <input type="number" value={newStat.passDF.successes || ''} onChange={e => setNewStat({...newStat, passDF: {...newStat.passDF, successes: parseInt(e.target.value) || 0}})} className="w-full px-1 py-2 text-center text-sm rounded border bg-white" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase">MFへのパス</div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="text-[9px] text-zinc-400 mb-1">総パス数</div>
                      <input type="number" value={newStat.passMF.total || ''} onChange={e => setNewStat({...newStat, passMF: {...newStat.passMF, total: parseInt(e.target.value) || 0}})} className="w-full px-1 py-2 text-center text-sm rounded border bg-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[9px] text-zinc-400 mb-1">成功数</div>
                      <input type="number" value={newStat.passMF.successes || ''} onChange={e => setNewStat({...newStat, passMF: {...newStat.passMF, successes: parseInt(e.target.value) || 0}})} className="w-full px-1 py-2 text-center text-sm rounded border bg-white" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase">FWへのパス</div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="text-[9px] text-zinc-400 mb-1">総パス数</div>
                      <input type="number" value={newStat.passFW.total || ''} onChange={e => setNewStat({...newStat, passFW: {...newStat.passFW, total: parseInt(e.target.value) || 0}})} className="w-full px-1 py-2 text-center text-sm rounded border bg-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[9px] text-zinc-400 mb-1">成功数</div>
                      <input type="number" value={newStat.passFW.successes || ''} onChange={e => setNewStat({...newStat, passFW: {...newStat.passFW, successes: parseInt(e.target.value) || 0}})} className="w-full px-1 py-2 text-center text-sm rounded border bg-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => {
              setIsAdding(false);
              setEditingId(null);
              setNewStat(initialStat);
            }} className="px-4 py-2 text-zinc-500 font-bold">キャンセル</button>
            <SaveButton 
              onClick={handleAdd}
              label={editingId ? '更新する' : '追加する'}
              className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {viewMode === 'list' && stats.map(s => (
          <div key={s.id} className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-xs font-bold text-zinc-400 uppercase">{s.date}</span>
                <h4 className="font-bold text-zinc-900">vs {s.opponent || '不明'}</h4>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleEdit(s)}
                  className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                >
                  <FileText size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(s.id)}
                  className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Plus size={16} className="rotate-45" />
                </button>
              </div>
            </div>
            {renderStatsGrid(s)}
          </div>
        ))}

        {viewMode === 'monthly' && monthlyStats.map(([month, monthStats]) => {
          const aggregated = getAggregatedStats(monthStats);
          return (
            <div key={month} className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-emerald-700 text-lg">{month.replace('-', '年')}月 合計</h4>
                <span className="text-xs font-bold text-zinc-400 bg-zinc-100 px-2 py-1 rounded">{monthStats.length} 試合</span>
              </div>
              {renderStatsGrid(aggregated, true)}
            </div>
          );
        })}

        {viewMode === 'period' && periodStats.map(([period, periodStats]) => {
          const aggregated = getAggregatedStats(periodStats);
          return (
            <div key={period} className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-blue-700 text-lg">{period} 合計</h4>
                <span className="text-xs font-bold text-zinc-400 bg-zinc-100 px-2 py-1 rounded">{periodStats.length} 試合</span>
              </div>
              {renderStatsGrid(aggregated, true)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TestResultsSection = ({ tests, onSave }: { tests: TestResults[], onSave: (tests: TestResults[]) => void }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialTest: TestResults = {
    id: '',
    date: new Date().toISOString().split('T')[0],
    kick: {
      right: [0, 0, 0, 0, 0],
      left: [0, 0, 0, 0, 0],
      punt: [0, 0, 0, 0, 0],
    },
    shootStop: {
      short: Array(3).fill(0).map(() => Array(3).fill(0).map(() => [0, 0])),
      long: Array(3).fill(0).map(() => Array(3).fill(0).map(() => [0, 0])),
    }
  };

  const [newTest, setNewTest] = useState<TestResults>(initialTest);

  const calculateAvg = (nums: number[]) => {
    const valid = nums.filter(n => n > 0);
    if (valid.length === 0) return 0;
    return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
  };

  const calculateMax = (nums: number[]) => {
    return Math.max(...nums, 0);
  };

  const handleAdd = () => {
    if (editingId) {
      onSave(tests.map(t => t.id === editingId ? { ...newTest, id: editingId } : t));
    } else {
      onSave([...tests, { ...newTest, id: Math.random().toString(36).substr(2, 9) }]);
    }
    setIsAdding(false);
    setEditingId(null);
    setNewTest(initialTest);
  };

  const handleEdit = (t: TestResults) => {
    setNewTest(t);
    setEditingId(t.id);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('このテスト結果を削除してもよろしいですか？')) {
      onSave(tests.filter(t => t.id !== id));
    }
  };

  const monthlyTests = useMemo(() => {
    const groups: Record<string, TestResults[]> = {};
    tests.forEach(t => {
      const month = t.date.substring(0, 7);
      if (!groups[month]) groups[month] = [];
      groups[month].push(t);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [tests]);

  return (
    <div className="space-y-6" id="test-results">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="text-emerald-600" size={20} />
            テスト結果 (月次計測)
          </h3>
          <button 
            onClick={() => exportToPDF('test-results', 'テスト結果')}
            className="p-2 bg-zinc-100 text-zinc-600 rounded-xl hover:bg-zinc-200 transition-all flex items-center gap-2 text-xs font-bold"
          >
            <Download size={16} />
            PDF出力
          </button>
        </div>
        <button 
          onClick={() => {
            if (isAdding) {
              setIsAdding(false);
              setEditingId(null);
              setNewTest(initialTest);
            } else {
              setIsAdding(true);
            }
          }}
          className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-2"
        >
          <Plus size={16} />
          {editingId ? '編集をキャンセル' : '今月のテストを記録'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-2xl border border-emerald-100 shadow-sm space-y-8 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center border-b pb-4">
            <h4 className="text-lg font-bold">{editingId ? 'テスト結果を編集' : '新規テスト計測'}</h4>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-zinc-400" />
              <input type="date" value={newTest.date} onChange={e => setNewTest({...newTest, date: e.target.value})} className="p-2 rounded-lg border border-zinc-200" />
            </div>
          </div>

          <div className="space-y-6">
            <h5 className="font-bold flex items-center gap-2 text-zinc-700"><Dribbble size={18} className="text-orange-500" /> キック飛距離 (m)</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['right', 'left', 'punt'].map(foot => (
                <div key={foot} className="p-4 bg-zinc-50 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-zinc-500 uppercase">{foot === 'right' ? '右足' : foot === 'left' ? '左足' : 'パント'}</div>
                  <div className="grid grid-cols-5 gap-1">
                    {newTest.kick[foot as keyof typeof newTest.kick].map((val, i) => (
                      <div key={i} className="space-y-1">
                        <div className="text-[8px] text-zinc-400 text-center">{i+1}本目</div>
                        <input 
                          type="number" 
                          value={val || ''}
                          onChange={e => {
                            const next = [...newTest.kick[foot as keyof typeof newTest.kick]];
                            next[i] = parseInt(e.target.value) || 0;
                            setNewTest({...newTest, kick: {...newTest.kick, [foot]: next}});
                          }}
                          className="w-full p-1 text-center rounded border bg-white"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-zinc-400 pt-2 border-t">
                    <span>平均: {calculateAvg(newTest.kick[foot as keyof typeof newTest.kick])}m</span>
                    <span>最大: {calculateMax(newTest.kick[foot as keyof typeof newTest.kick])}m</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h5 className="font-bold flex items-center gap-2 text-zinc-700"><Target size={18} className="text-red-500" /> シュートストップ率 (セーブ数 / シュート数)</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {['short', 'long'].map(dist => (
                <div key={dist} className="space-y-4">
                  <div className="text-sm font-bold text-zinc-600 bg-zinc-100 px-3 py-1 rounded-lg inline-block">{dist === 'short' ? '14m (Short Distance)' : '19m (Long Distance)'}</div>
                  <div className="flex justify-between text-[10px] font-bold text-zinc-400 mb-1 px-2">
                    <span>左</span>
                    <span>右</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 bg-zinc-200 p-2 rounded-xl aspect-square">
                    {newTest.shootStop[dist as keyof typeof newTest.shootStop].map((row, r) => (
                      row.map((cell, c) => (
                        <div key={`${r}-${c}`} className="bg-white rounded-lg p-2 flex flex-col gap-1 justify-center items-center shadow-sm">
                          <div className="flex gap-1">
                            <div className="flex flex-col items-center">
                              <span className="text-[8px] text-zinc-400">セーブ</span>
                              <input 
                                type="number" 
                                value={cell[0] || ''}
                                onChange={e => {
                                  const next = JSON.parse(JSON.stringify(newTest.shootStop[dist as keyof typeof newTest.shootStop]));
                                  next[r][c][0] = parseInt(e.target.value) || 0;
                                  setNewTest({...newTest, shootStop: {...newTest.shootStop, [dist]: next}});
                                }}
                                className="w-8 p-1 text-center text-xs border rounded"
                              />
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[8px] text-zinc-400">合計</span>
                              <input 
                                type="number" 
                                value={cell[1] || ''}
                                onChange={e => {
                                  const next = JSON.parse(JSON.stringify(newTest.shootStop[dist as keyof typeof newTest.shootStop]));
                                  next[r][c][1] = parseInt(e.target.value) || 0;
                                  setNewTest({...newTest, shootStop: {...newTest.shootStop, [dist]: next}});
                                }}
                                className="w-8 p-1 text-center text-xs border rounded"
                              />
                            </div>
                          </div>
                          <span className={cn("text-[10px] font-bold mt-1", getShotStopColor(cell[1] > 0 ? Math.round((cell[0] / cell[1]) * 100) : null))}>
                            {formatRate(cell[0], cell[1])}
                          </span>
                        </div>
                      ))
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => {
              setIsAdding(false);
              setEditingId(null);
              setNewTest(initialTest);
            }} className="px-4 py-2 text-zinc-500 font-bold">キャンセル</button>
            <SaveButton 
              onClick={handleAdd}
              label={editingId ? '更新する' : '記録を保存'}
              className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/20"
            />
          </div>
        </div>
      )}

      <div className="space-y-8">
        {monthlyTests.map(([month, monthTests]) => (
          <div key={month} className="space-y-4">
            <h4 className="text-lg font-bold text-zinc-900 border-l-4 border-emerald-500 pl-3 flex items-center gap-2">
              <Calendar size={18} className="text-emerald-600" />
              {month.replace('-', '年')}月
            </h4>
            <div className="grid grid-cols-1 gap-6">
              {monthTests.map(t => (
                <div key={t.id} className="bg-white p-8 rounded-2xl border border-zinc-100 shadow-sm space-y-8">
                  <div className="flex justify-between items-center border-b pb-4">
                    <span className="text-xs font-bold text-zinc-400 uppercase">{t.date} 計測</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEdit(t)}
                        className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      >
                        <FileText size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(t.id)}
                        className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Plus size={16} className="rotate-45" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {['right', 'left', 'punt'].map(foot => (
                      <div key={foot} className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                        <div className="text-xs font-bold text-zinc-400 uppercase mb-2">{foot === 'right' ? '右足' : foot === 'left' ? '左足' : 'パント'}</div>
                        <div className="flex justify-between items-end">
                          <div>
                            <div className="text-2xl font-black text-zinc-900">{calculateAvg(t.kick[foot as keyof typeof t.kick])}m</div>
                            <div className="text-[10px] font-bold text-zinc-400">Average</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-emerald-600">{calculateMax(t.kick[foot as keyof typeof t.kick])}m</div>
                            <div className="text-[10px] font-bold text-zinc-400">Max</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {['short', 'long'].map(dist => {
                      const grid = t.shootStop[dist as keyof typeof t.shootStop];
                      const totalSaves = grid.flat().reduce((acc, curr) => acc + curr[0], 0);
                      const totalShots = grid.flat().reduce((acc, curr) => acc + curr[1], 0);
                      const overallRate = totalShots > 0 ? Math.round((totalSaves / totalShots) * 100) : null;

                      return (
                        <div key={dist} className="space-y-4">
                          <div className="flex justify-between items-end">
                            <div className="text-sm font-bold text-zinc-600">{dist === 'short' ? '14m (Short)' : '19m (Long)'}</div>
                            <div className="flex gap-4">
                              {(() => {
                                const leftSaves = grid.reduce((acc, row) => acc + row[0][0], 0);
                                const leftShots = grid.reduce((acc, row) => acc + row[0][1], 0);
                                const rightSaves = grid.reduce((acc, row) => acc + row[2][0], 0);
                                const rightShots = grid.reduce((acc, row) => acc + row[2][1], 0);
                                const leftRate = leftShots > 0 ? Math.round((leftSaves / leftShots) * 100) : null;
                                const rightRate = rightShots > 0 ? Math.round((rightSaves / rightShots) * 100) : null;
                                return (
                                  <>
                                    <div className="text-[10px] font-bold text-zinc-400">左: <span className={cn(getShotStopColor(leftRate))}>{formatRate(leftSaves, leftShots)}</span></div>
                                    <div className="text-[10px] font-bold text-zinc-400">右: <span className={cn(getShotStopColor(rightRate))}>{formatRate(rightSaves, rightShots)}</span></div>
                                  </>
                                );
                              })()}
                              <div className={cn("text-xl font-black", getShotStopColor(overallRate))}>{formatRate(totalSaves, totalShots)} <span className="text-[10px] text-zinc-400">Overall</span></div>
                            </div>
                          </div>
                          <div className="flex justify-between text-[10px] font-bold text-zinc-400 mb-1 px-1">
                            <span>左</span>
                            <span>右</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded-lg aspect-square">
                            {grid.map((row, r) => (
                              row.map((cell, c) => {
                                const rate = cell[1] > 0 ? Math.round((cell[0] / cell[1]) * 100) : null;
                                return (
                                  <div key={`${r}-${c}`} className="bg-zinc-800 rounded flex flex-col items-center justify-center text-white">
                                    <div className="text-[10px] font-bold text-zinc-500">{cell[0]}/{cell[1]}</div>
                                    <div className={cn("text-sm font-black", getShotStopColor(rate))}>{formatRate(cell[0], cell[1])}</div>
                                  </div>
                                );
                              })
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const EvaluationForm = ({ data, onSave }: { data: PlayerData, onSave: (evals: Evaluation[]) => void }) => {
  const [selectedGrade, setSelectedGrade] = useState(data.profile?.grade || GRADES[3]);
  const [selectedPeriod, setSelectedPeriod] = useState(PERIODS[0]);
  const [selectedCategory, setSelectedCategory] = useState<Category>('Technical');
  
  const currentPeriodKey = `${selectedGrade}_${selectedPeriod}`;
  
  const getEvalForPeriod = (grade: string, period: string) => {
    const key = `${grade}_${period}`;
    let ev = data.evaluations.find(e => e.period === key);
    
    // Legacy fallback
    if (!ev && grade === data.profile?.grade) {
      ev = data.evaluations.find(e => e.period === period);
    }
    
    return ev || {
      period: key,
      scores: {},
      feedback: '',
      videoUrl: ''
    };
  };

  const currentEval = getEvalForPeriod(selectedGrade, selectedPeriod);

  const [scores, setScores] = useState<Record<string, number>>(currentEval.scores);
  const [feedback, setFeedback] = useState(currentEval.feedback || '');
  const [videoUrl, setVideoUrl] = useState(currentEval.videoUrl || '');

  useEffect(() => {
    const ev = getEvalForPeriod(selectedGrade, selectedPeriod);
    setScores(ev.scores);
    setFeedback(ev.feedback || '');
    setVideoUrl(ev.videoUrl || '');
  }, [selectedGrade, selectedPeriod, data.evaluations]);

  const handleScoreChange = (item: string, val: number) => {
    setScores(prev => ({ ...prev, [item]: val }));
  };

  const handleSave = () => {
    const newEvals = [...data.evaluations];
    const idx = newEvals.findIndex(e => e.period === currentPeriodKey);
    const updatedEval = { ...currentEval, period: currentPeriodKey, scores, feedback, videoUrl };
    
    if (idx >= 0) {
      newEvals[idx] = updatedEval;
    } else {
      newEvals.push(updatedEval);
    }
    onSave(newEvals);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto" id="evaluation-sheet">
      <div className="flex flex-col gap-4">
        {/* Grade Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {GRADES.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGrade(g)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                selectedGrade === g ? "bg-zinc-900 text-white shadow-lg" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
              )}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex gap-2 overflow-x-auto flex-1">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={cn(
                  "px-6 py-2 rounded-xl font-bold transition-all whitespace-nowrap",
                  selectedPeriod === p ? "bg-emerald-600 text-white shadow-md" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <SaveButton 
              onClick={handleSave}
              label="保存する"
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-900/20"
            />
            <button 
              onClick={() => exportToPDF('evaluation-sheet', `評価シート_${selectedGrade}_${selectedPeriod}`)}
              className="px-6 py-3 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-lg shadow-zinc-900/10"
            >
              <Download size={20} />
              PDF出力
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl font-bold transition-all flex justify-between items-center",
                    selectedCategory === cat ? "bg-zinc-900 text-white" : "bg-white text-zinc-500 hover:bg-zinc-50 border border-zinc-100"
                  )}
                >
                  {CATEGORY_LABELS[cat]}
                  <ChevronRight size={16} className={selectedCategory === cat ? "opacity-100" : "opacity-0"} />
                </button>
              ))}
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{CATEGORY_LABELS[selectedCategory]} 評価</h3>
              <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
                <span className="text-zinc-400">C: 1-4</span>
                <span className="text-zinc-400">B: 5-6</span>
                <span className="text-zinc-400">A: 7-8</span>
                <span className="text-emerald-500">S: 9-10</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
              {EVAL_ITEMS[selectedCategory].map(item => {
                const score = scores[item] || 5;
                const criteriaText = getCriteriaText(item, score);
                
                return (
                  <div key={item} className="space-y-3 p-4 rounded-xl border border-zinc-50 hover:bg-zinc-50 transition-all group">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-zinc-800">{item}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-black px-2 py-0.5 rounded-md",
                          score >= 9 ? "bg-emerald-600 text-white" : 
                          score >= 7 ? "bg-blue-600 text-white" :
                          score >= 5 ? "bg-amber-500 text-white" : "bg-zinc-400 text-white"
                        )}>
                          {getRankLabel(score)}
                        </span>
                        <span className="text-sm font-black text-zinc-900 w-4 text-right">
                          {score}
                        </span>
                      </div>
                    </div>
                    
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      step="1"
                      value={score}
                      onChange={e => handleScoreChange(item, parseInt(e.target.value))}
                      className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />

                    <AnimatePresence mode="wait">
                      <motion.div 
                        key={score}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="min-h-[40px]"
                      >
                        {criteriaText ? (
                          <p className="text-[11px] leading-relaxed text-zinc-500 italic">
                            {criteriaText}
                          </p>
                        ) : (
                          <p className="text-[11px] text-zinc-300 italic">指標データ未登録</p>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-100 space-y-6">
            <h3 className="text-xl font-bold">フィードバック & エビデンス</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <Video size={14} />
                  動画URL (YouTube等)
                </label>
                <input 
                  type="text"
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/..."
                  className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare size={14} />
                  コーチ・フィードバック
                </label>
                <textarea 
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none h-32"
                  placeholder="プレーの改善点や評価の理由を記入してください"
                />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <SaveButton 
                onClick={handleSave}
                label="評価を保存する"
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReportView = ({ player, data }: { player: Player, data: PlayerData }) => {
  const [selectedGrade, setSelectedGrade] = useState(data.profile?.grade || GRADES[3]);
  const [selectedPeriod, setSelectedPeriod] = useState(PERIODS[0]);
  
  const currentPeriodKey = `${selectedGrade}_${selectedPeriod}`;
  
  const currentEval = useMemo(() => {
    let ev = data.evaluations?.find(e => e.period === currentPeriodKey);
    if (!ev && selectedGrade === data.profile?.grade) {
      ev = data.evaluations?.find(e => e.period === selectedPeriod);
    }
    return ev;
  }, [selectedGrade, selectedPeriod, data.evaluations]);

  const getGoalData = (period: string) => {
    const key = `${selectedGrade}_${period}`;
    let gData = data.goals?.periods?.[key];
    if (!gData && selectedGrade === data.profile?.grade) {
      if (period === '4-7月') gData = data.goals?.period1;
      if (period === '8-11月') gData = data.goals?.period2;
      if (period === '12-3月') gData = data.goals?.period3;
    }
    return gData;
  };

  const calculateAvg = (nums: number[] = []) => {
    if (!Array.isArray(nums)) return 0;
    const valid = nums.filter(n => typeof n === 'number' && n > 0);
    if (valid.length === 0) return 0;
    return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
  };

  const calculateMax = (nums: number[] = []) => {
    if (!Array.isArray(nums)) return 0;
    return Math.max(...nums, 0);
  };

  const calculateRate = (success: number, total: number) => {
    if (!total || total === 0) return null;
    return Math.round((success / total) * 100);
  };

  // 4-month aggregated stats for the selected period
  const periodStats = useMemo(() => {
    const periodMonths: Record<string, number[]> = {
      '7月': [4, 5, 6, 7],
      '11月': [8, 9, 10, 11],
      '3月': [12, 1, 2, 3]
    };
    
    const months = periodMonths[selectedPeriod] || [];
    const matchStats = data.matchStats || [];
    const filtered = matchStats.filter(s => {
      if (!s.date) return false;
      const month = new Date(s.date).getMonth() + 1;
      return months.includes(month);
    });

    const initial = {
      paOutside: { shots: 0, saves: 0 },
      paInside: { shots: 0, saves: 0 },
      highBall: { attacks: 0, successes: 0, errors: 0 },
      oneVsOneB: { attacks: 0, successes: 0, errors: 0 },
      sweeper: { attacks: 0, successes: 0, errors: 0 },
      passDF: { total: 0, successes: 0 },
      passMF: { total: 0, successes: 0 },
      passFW: { total: 0, successes: 0 },
    };

    return filtered.reduce((acc, s) => ({
      paOutside: { shots: acc.paOutside.shots + (s.paOutside?.shots || 0), saves: acc.paOutside.saves + (s.paOutside?.saves || 0) },
      paInside: { shots: acc.paInside.shots + (s.paInside?.shots || 0), saves: acc.paInside.saves + (s.paInside?.saves || 0) },
      highBall: { attacks: acc.highBall.attacks + (s.highBall?.attacks || 0), successes: acc.highBall.successes + (s.highBall?.successes || 0), errors: acc.highBall.errors + (s.highBall?.errors || 0) },
      oneVsOneB: { attacks: acc.oneVsOneB.attacks + (s.oneVsOneB?.attacks || 0), successes: acc.oneVsOneB.successes + (s.oneVsOneB?.successes || 0), errors: acc.oneVsOneB.errors + (s.oneVsOneB?.errors || 0) },
      sweeper: { attacks: acc.sweeper.attacks + (s.sweeper?.attacks || 0), successes: acc.sweeper.successes + (s.sweeper?.successes || 0), errors: acc.sweeper.errors + (s.sweeper?.errors || 0) },
      passDF: { total: acc.passDF.total + (s.passDF?.total || 0), successes: acc.passDF.successes + (s.passDF?.successes || 0) },
      passMF: { total: acc.passMF.total + (s.passMF?.total || 0), successes: acc.passMF.successes + (s.passMF?.successes || 0) },
      passFW: { total: acc.passFW.total + (s.passFW?.total || 0), successes: acc.passFW.successes + (s.passFW?.successes || 0) },
    }), initial);
  }, [data.matchStats, selectedPeriod]);

  // Latest test results
  const latestTest = useMemo(() => {
    const testResults = data.testResults || [];
    if (testResults.length === 0) return null;
    return [...testResults].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  }, [data.testResults]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 space-y-4">
        {/* Grade Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {GRADES.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGrade(g)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                selectedGrade === g ? "bg-zinc-900 text-white shadow-lg" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
              )}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                  selectedPeriod === p ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-500"
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <button 
            onClick={() => exportToPDF('report-view', `レポート_${player.name}_${selectedGrade}_${selectedPeriod}`)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-2"
          >
            <FileText size={16} />
            PDF出力
          </button>
        </div>
      </div>

      <div className="bg-white p-12 rounded-3xl shadow-xl border border-zinc-100 print:shadow-none print:border-none" id="report-view">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-8 mb-8">
          <div>
            <h1 className="text-4xl font-black text-zinc-900 mb-2 uppercase tracking-tighter">GK IDP REPORT</h1>
            <div className="flex items-center gap-4 text-zinc-500 font-bold">
              <span className="flex items-center gap-1"><Users size={16} /> {player.name}</span>
              <span className="flex items-center gap-1">
                <Calendar size={16} /> {selectedGrade} {selectedPeriod}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Overall Rating</div>
            <div className="text-5xl font-black text-emerald-600">
              {(() => {
                if (!currentEval || !currentEval.scores) return '-';
                const scores = Object.values(currentEval.scores) as number[];
                if (scores.length === 0) return '-';
                return getRankLabel(scores.reduce((a, b) => a + b, 0) / scores.length);
              })()}
            </div>
          </div>
        </div>

        {/* Profile Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-12 bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Grade</div>
            <div className="text-lg font-bold text-zinc-900">{data.profile?.grade || '-'}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Height / Weight</div>
            <div className="text-lg font-bold text-zinc-900">{data.profile?.height}cm / {data.profile?.weight}kg</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Dominant Foot</div>
            <div className="text-lg font-bold text-zinc-900">{data.profile?.dominantFoot || '-'}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Dominant Arm</div>
            <div className="text-lg font-bold text-zinc-900">{data.profile?.dominantArm || '-'}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Position</div>
            <div className="text-lg font-bold text-zinc-900">GK</div>
          </div>
        </div>

        {/* Vision Section */}
        <div className="mb-12">
          <h2 className="text-xl font-bold border-l-4 border-emerald-500 pl-4 mb-4">卒業時の目標</h2>
          <div className="p-6 bg-zinc-50 rounded-2xl italic text-zinc-700 leading-relaxed">
            "{data.goals?.graduationGoal || '未設定'}"
          </div>
        </div>

        {/* Match Stats Summary */}
        <div className="mb-12">
          <h2 className="text-xl font-bold mb-6 border-l-4 border-emerald-500 pl-4">{selectedPeriod} 試合スタッツ合計</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'PA外セーブ率', val: calculateRate(periodStats.paOutside.saves, periodStats.paOutside.shots), unit: '%' },
              { label: 'PA内セーブ率', val: calculateRate(periodStats.paInside.saves, periodStats.paInside.shots), unit: '%' },
              { label: 'ハイボール成功率', val: calculateRate(periodStats.highBall.successes, periodStats.highBall.attacks), unit: '%' },
              { label: 'ハイボール判断ミス', val: periodStats.highBall.errors, unit: '回' },
              { label: '1v1B成功率', val: calculateRate(periodStats.oneVsOneB.successes, periodStats.oneVsOneB.attacks), unit: '%' },
              { label: '1v1B判断ミス', val: periodStats.oneVsOneB.errors, unit: '回' },
              { label: 'スイーパー成功率', val: calculateRate(periodStats.sweeper.successes, periodStats.sweeper.attacks), unit: '%' },
              { label: 'スイーパー判断ミス', val: periodStats.sweeper.errors, unit: '回' },
              { label: 'DFへのパス成功率', val: calculateRate(periodStats.passDF.successes, periodStats.passDF.total), unit: '%' },
              { label: 'MFへのパス成功率', val: calculateRate(periodStats.passMF.successes, periodStats.passMF.total), unit: '%' },
              { label: 'FWへのパス成功率', val: calculateRate(periodStats.passFW.successes, periodStats.passFW.total), unit: '%' },
            ].map((s, i) => (
              <div key={i} className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                <div className="text-[10px] font-bold text-zinc-400 uppercase mb-1">{s.label}</div>
                <div className="text-xl font-black text-zinc-900">
                  {s.val === null ? '-' : s.val}
                  {s.val !== null && <span className="text-xs ml-0.5">{s.unit}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Test Results */}
        {latestTest && (
          <div className="mb-12">
            <h2 className="text-xl font-bold mb-6 border-l-4 border-emerald-500 pl-4">直近のテスト結果 ({latestTest.date})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-500 uppercase flex items-center gap-2"><Dribbble size={16} /> キック飛距離 (平均)</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: '右足', val: calculateAvg(latestTest.kick.right) },
                    { label: '左足', val: calculateAvg(latestTest.kick.left) },
                    { label: 'パント', val: calculateAvg(latestTest.kick.punt) },
                  ].map((k, i) => (
                    <div key={i} className="bg-zinc-50 p-3 rounded-xl border border-zinc-100 text-center">
                      <div className="text-[10px] font-bold text-zinc-400 mb-1">{k.label}</div>
                      <div className="text-lg font-black text-zinc-900">{k.val}m</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-500 uppercase flex items-center gap-2"><Target size={16} /> シュートストップ率</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { label: '14m (Short)', grid: latestTest.shootStop.short },
                    { label: '19m (Long)', grid: latestTest.shootStop.long },
                  ].map((s, i) => {
                    const totalSaves = s.grid.flat().reduce((acc, curr) => acc + curr[0], 0);
                    const totalShots = s.grid.flat().reduce((acc, curr) => acc + curr[1], 0);
                    const rate = totalShots > 0 ? Math.round((totalSaves / totalShots) * 100) : null;
                    return (
                      <div key={i} className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 space-y-4">
                        <div className="flex justify-between items-end">
                          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{s.label}</div>
                          <div className={cn("text-xl font-black", getShotStopColor(rate))}>{formatRate(totalSaves, totalShots)} <span className="text-[10px] text-zinc-400">Total</span></div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] font-bold text-zinc-400 px-1">
                            <span>左</span>
                            <span>右</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded-lg aspect-square">
                            {s.grid.map((row, r) => (
                              row.map((cell, c) => {
                                const cellRate = cell[1] > 0 ? Math.round((cell[0] / cell[1]) * 100) : null;
                                const labels = [
                                  ['左上', '中上', '右上'],
                                  ['左中', '真中', '右中'],
                                  ['左下', '中下', '右下']
                                ];
                                return (
                                  <div key={`${r}-${c}`} className="bg-zinc-800 rounded flex flex-col items-center justify-center text-white p-1">
                                    <div className="text-[7px] font-bold text-zinc-500 mb-0.5">{labels[r][c]}</div>
                                    <div className="text-[8px] font-bold text-zinc-400">{cell[0]}/{cell[1]}</div>
                                    <div className={cn("text-xs font-black", getShotStopColor(cellRate))}>{formatRate(cell[0], cell[1])}</div>
                                  </div>
                                );
                              })
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Goals Section */}
        <div className="mb-12">
          <h2 className="text-xl font-bold mb-6 border-l-4 border-emerald-500 pl-4">定期目標 & 振り返り</h2>
          <div className="space-y-8">
            {PERIODS.map((pLabel, i) => {
              const pData = getGoalData(pLabel);
              return (
                <div key={i} className="border border-zinc-200 rounded-2xl overflow-hidden">
                  <div className="bg-zinc-900 text-white p-4 flex justify-between items-center">
                    <h3 className="font-black uppercase tracking-widest">
                      <span className="text-[10px] text-zinc-500 block mb-0.5">{selectedGrade}</span>
                      {pLabel}
                    </h3>
                    <span className="text-xs font-bold text-zinc-400">面談日: {pData?.interviewDate || '-'}</span>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">パフォーマンス目標</div>
                        <div className="text-sm font-bold text-zinc-900 leading-relaxed">{pData?.performanceGoal || '-'}</div>
                        {pData?.metrics && (
                          <div className="mt-2 inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100">
                            数値目標: {pData.metrics}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">プロセス目標</div>
                        <div className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">{pData?.processGoal || '-'}</div>
                      </div>
                    </div>
                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                      <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <MessageSquare size={12} />
                        振り返り
                      </div>
                      <div className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap italic">
                        {pData?.review || '未記入'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Evaluation Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          <div>
            <h2 className="text-xl font-bold mb-6 border-l-4 border-emerald-500 pl-4">評価サマリー</h2>
            <div className="space-y-4">
              {CATEGORIES.map(cat => {
                const items = EVAL_ITEMS[cat] || [];
                const scores = items.map(item => currentEval?.scores?.[item] || 0) as number[];
                const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
                const percentage = (avg / 10) * 100;
                
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                      <span className="text-zinc-500">{CATEGORY_LABELS[cat]}</span>
                      <span className="text-zinc-900">{avg.toFixed(1)} / 10</span>
                    </div>
                    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-zinc-50 p-6 rounded-2xl">
            <h2 className="text-xl font-bold mb-4">コーチ・フィードバック</h2>
            <p className="text-zinc-600 leading-relaxed whitespace-pre-wrap">
              {currentEval?.feedback || 'フィードバックはまだ入力されていません。'}
            </p>
            {currentEval?.videoUrl && (
              <div className="mt-6 p-4 bg-white rounded-xl border border-zinc-200 flex items-center gap-3">
                <Video className="text-emerald-600" size={20} />
                <div className="flex-1 overflow-hidden">
                  <div className="text-xs font-bold text-zinc-400 uppercase">Video Evidence</div>
                  <a href={currentEval.videoUrl} target="_blank" className="text-emerald-600 text-sm font-medium truncate block">
                    {currentEval.videoUrl}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-8 border-t border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">
          GK IDP Management System • Professional Grade
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('coach_auth') === 'true';
  });

  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem('gk_idp_players');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_PLAYERS;
      }
    }
    return INITIAL_PLAYERS;
  });

  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'goals' | 'eval' | 'match-stats' | 'test-results' | 'report'>('dashboard');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [playerToDeleteId, setPlayerToDeleteId] = useState<string | null>(null);
  
  // State for persistence (mocking with local storage)
  const [allData, setAllData] = useState<Record<string, PlayerData>>(() => {
    const saved = localStorage.getItem('gk_idp_data');
    let parsed: Record<string, PlayerData> = {};
    
    if (saved) {
      try {
        parsed = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved data", e);
      }
    }
    
    // Initial mock data for all players
    const initial: Record<string, PlayerData> = {};
    players.forEach(p => {
      const existing = (parsed[p.id] || {}) as any;
      
      // Migrate goals if needed
      let goals = existing.goals;
      if (goals && !goals.period1) {
        goals = {
          graduationGoal: goals.vision || DEFAULT_GOALS.graduationGoal,
          period1: { 
            performanceGoal: goals.shortTerm?.goal || '', 
            processGoal: goals.shortTerm?.steps || '', 
            metrics: goals.shortTerm?.metrics || '',
            interviewDate: '',
            review: goals.shortTerm?.review || ''
          },
          period2: { 
            performanceGoal: goals.midTerm?.goal || '', 
            processGoal: goals.midTerm?.steps || '', 
            metrics: goals.midTerm?.metrics || '',
            interviewDate: '',
            review: goals.midTerm?.review || ''
          },
          period3: { 
            performanceGoal: goals.longTerm?.goal || '', 
            processGoal: goals.longTerm?.steps || '', 
            metrics: goals.longTerm?.metrics || '',
            interviewDate: '',
            review: goals.longTerm?.review || ''
          },
        };
      }

      initial[p.id] = {
        id: p.id,
        profile: { 
          ...DEFAULT_PROFILE, 
          ...existing.profile, 
          grade: p.grade, 
          dominantArm: p.dominantArm || existing.profile?.dominantArm || DEFAULT_PROFILE.dominantArm,
          birthDate: p.birthDate || existing.profile?.birthDate || DEFAULT_PROFILE.birthDate 
        },
        goals: goals || DEFAULT_GOALS,
        evaluations: existing.evaluations || [
          { 
            period: PERIODS[0], 
            scores: Object.values(EVAL_ITEMS).flat().reduce((acc, item) => ({...acc, [item]: Math.floor(Math.random() * 5) + 5}), {}),
            feedback: '基本的な技術は安定している。今後はハイボールの処理と1v1の判断スピードを重点的に強化したい。',
            videoUrl: 'https://youtube.com/watch?v=example1'
          },
          { 
            period: PERIODS[1], 
            scores: Object.values(EVAL_ITEMS).flat().reduce((acc, item) => ({...acc, [item]: Math.floor(Math.random() * 4) + 6}), {}),
            feedback: '冬の大会に向けて、コーチングの質が向上した。特にディフェンスラインとの連携がスムーズになっている。',
            videoUrl: 'https://youtube.com/watch?v=example2'
          }
        ],
        matchStats: existing.matchStats || [],
        testResults: existing.testResults || []
      };
    });
    return initial;
  });

  useEffect(() => {
    localStorage.setItem('gk_idp_data', JSON.stringify(allData));
  }, [allData]);

  useEffect(() => {
    localStorage.setItem('gk_idp_players', JSON.stringify(players));
  }, [players]);

  const handleAddPlayer = (name: string) => {
    console.log("Adding player:", name);
    const newId = Math.random().toString(36).substr(2, 9);
    const newPlayer: Player = {
      id: newId,
      name,
      grade: '中学1年生',
      birthDate: '',
      dominantArm: '右'
    };
    
    setPlayers(prev => [...prev, newPlayer]);
    setAllData(prev => ({
      ...prev,
      [newId]: {
        id: newId,
        profile: { ...DEFAULT_PROFILE, name, grade: '中学1年生' },
        goals: DEFAULT_GOALS,
        evaluations: [],
        matchStats: [],
        testResults: []
      }
    }));
    setSelectedPlayerId(newId);
    setActiveTab('profile');
  };

  const handleDeletePlayer = () => {
    if (!playerToDeleteId) return;
    
    const id = playerToDeleteId;
    const newPlayers = players.filter(p => p.id !== id);
    setPlayers(newPlayers);
    setAllData(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (selectedPlayerId === id) {
      setSelectedPlayerId(newPlayers[0]?.id || '');
    }
    setPlayerToDeleteId(null);
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(allData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `gk_idp_backup_${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (confirm('データを復元しますか？現在のデータは上書きされます。')) {
          setAllData(json);
          alert('データを復元しました。');
        }
      } catch (err) {
        alert('ファイルの読み込みに失敗しました。正しい形式のJSONファイルを選択してください。');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const currentPlayer = players.find(p => p.id === selectedPlayerId);
  const currentData = selectedPlayerId ? allData[selectedPlayerId] : null;

  const handleUpdateProfile = (newProfile: PlayerProfile) => {
    setAllData(prev => ({
      ...prev,
      [selectedPlayerId]: { ...prev[selectedPlayerId], profile: newProfile }
    }));
    // Update player name and grade in the players list if changed
    setPlayers(prev => prev.map(p => p.id === selectedPlayerId ? { 
      ...p, 
      name: newProfile.name,
      grade: newProfile.grade 
    } : p));
  };

  const handleUpdateGoals = (newGoals: any) => {
    setAllData(prev => ({
      ...prev,
      [selectedPlayerId]: { ...prev[selectedPlayerId], goals: newGoals }
    }));
  };

  const handleUpdateEvals = (newEvals: Evaluation[]) => {
    setAllData(prev => ({
      ...prev,
      [selectedPlayerId]: { ...prev[selectedPlayerId], evaluations: newEvals }
    }));
  };

  const handleUpdateStats = (newStats: MatchStats[]) => {
    setAllData(prev => ({
      ...prev,
      [selectedPlayerId]: { ...prev[selectedPlayerId], matchStats: newStats }
    }));
  };

  const handleUpdateTests = (newTests: TestResults[]) => {
    setAllData(prev => ({
      ...prev,
      [selectedPlayerId]: { ...prev[selectedPlayerId], testResults: newTests }
    }));
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('coach_auth', 'true');
  };

  const handleLogout = () => {
    if (confirm('ログアウトしますか？')) {
      setIsAuthenticated(false);
      localStorage.removeItem('coach_auth');
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex bg-zinc-50 min-h-screen font-sans text-zinc-900">
      <Sidebar 
        players={players} 
        selectedId={selectedPlayerId} 
        onSelect={setSelectedPlayerId} 
        onAddPlayer={() => setIsAddModalOpen(true)}
        onDeletePlayer={(id) => setPlayerToDeleteId(id)}
        onExport={handleExportData}
        onImport={handleImportData}
      />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header / Nav */}
        <header className="bg-white border-b border-zinc-200 px-8 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black tracking-tight">{currentPlayer?.name || '選手を選択してください'}</h2>
            {currentPlayer && (
              <>
                <div className="h-6 w-px bg-zinc-200" />
                <nav className="flex gap-1">
                  {[
                    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                    { id: 'profile', label: 'Profile', icon: User },
                    { id: 'goals', label: 'Goals', icon: Target },
                    { id: 'eval', label: 'Evaluation', icon: ClipboardCheck },
                    { id: 'match-stats', label: 'Match Stats', icon: Activity },
                    { id: 'test-results', label: 'Test Results', icon: BarChart3 },
                    { id: 'report', label: 'Report', icon: FileText },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all",
                        activeTab === tab.id ? "bg-emerald-50 text-emerald-600" : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
                      )}
                    >
                      <tab.icon size={16} />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center font-bold text-zinc-400">
              GK
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="ログアウト"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {!currentPlayer ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4">
              <Users size={64} className="opacity-20" />
              <p className="text-lg font-bold">左側のサイドバーから選手を選択するか、新しく追加してください</p>
              <button 
                onClick={() => {
                  console.log("Empty State Add Player button clicked");
                  setIsAddModalOpen(true);
                }}
                className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20"
              >
                <Plus size={20} />
                選手を追加する
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab + selectedPlayerId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'dashboard' && currentData && <Dashboard data={currentData} />}
                {activeTab === 'profile' && currentData && <ProfileSection profile={currentData.profile || DEFAULT_PROFILE} onSave={handleUpdateProfile} />}
                {activeTab === 'goals' && currentData && <GoalForm goals={currentData.goals} profile={currentData.profile || DEFAULT_PROFILE} onSave={handleUpdateGoals} />}
                {activeTab === 'eval' && currentData && <EvaluationForm data={currentData} onSave={handleUpdateEvals} />}
                {activeTab === 'match-stats' && currentData && <MatchStatsSection stats={currentData.matchStats || []} onSave={handleUpdateStats} />}
                {activeTab === 'test-results' && currentData && <TestResultsSection tests={currentData.testResults || []} onSave={handleUpdateTests} />}
                {activeTab === 'report' && currentData && (
                  <ErrorBoundary>
                    <ReportView player={currentPlayer} data={currentData} />
                  </ErrorBoundary>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>

      <AnimatePresence>
        {isAddModalOpen && (
          <AddPlayerModal 
            onClose={() => setIsAddModalOpen(false)} 
            onAdd={handleAddPlayer} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {playerToDeleteId && (
          <DeleteConfirmModal 
            onClose={() => setPlayerToDeleteId(null)} 
            onConfirm={handleDeletePlayer}
            playerName={players.find(p => p.id === playerToDeleteId)?.name || ''}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
