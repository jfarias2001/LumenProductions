import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/auth.js';
import { useAIStatus } from '../hooks/useAI.js';

const links = [
  { to: '/board', label: 'Board' },
  { to: '/board-v2', label: 'BOARD V2' },
  { to: '/copy-rapida', label: 'Copy Rápida' },
  { to: '/calendario', label: 'Calendário' },
  { to: '/empresa', label: 'Base da Empresa' },
  { to: '/prompts', label: 'Prompts' },
];

/** Cabeçalho compartilhado (logo + navegação + status IA + usuário). */
export default function AppHeader() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const aiStatus = useAIStatus();

  return (
    <header className="bg-surface-900/60 backdrop-blur-md border-b border-white/[0.06] px-4 py-2.5 flex items-center justify-between shrink-0 relative z-30">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-brand-500 via-ai-500 to-glow-400 text-white font-bold text-sm shadow-glow">
            ◑
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-bold text-white font-display tracking-tight">
              Content <span className="text-gradient">Engine</span>
            </h1>
            <span className="text-[10px] text-slate-500 tracking-wide">Lumen Digital</span>
          </div>
        </div>
        <nav className="flex items-center gap-0.5 bg-white/[0.03] border border-white/[0.06] rounded-full p-0.5">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `text-xs px-3 py-1.5 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-white/[0.08] text-white shadow-inner-top font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        {aiStatus.data && (
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border ${
              aiStatus.data.enabled
                ? 'text-glow-300 border-glow-400/30 bg-glow-400/5'
                : 'text-slate-500 border-white/[0.08] bg-white/[0.02]'
            }`}
          >
            <span className="relative flex h-1.5 w-1.5">
              {aiStatus.data.enabled && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-glow-400 opacity-60" />
              )}
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${aiStatus.data.enabled ? 'bg-glow-400' : 'bg-slate-600'}`} />
            </span>
            {aiStatus.data.enabled ? 'IA ativa' : 'IA off'}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-surface-800 ring-2 ring-brand-500/40 text-[10px] font-bold text-brand-200 select-none">
            {user?.name?.charAt(0).toUpperCase() ?? '·'}
          </span>
          <div className="text-left leading-tight hidden sm:block">
            <p className="text-xs text-slate-200">{user?.name}</p>
            <p className="text-[10px] text-slate-500">{user?.role}</p>
          </div>
        </div>
        <button onClick={() => void logout()} className="btn-ghost text-xs px-2 py-1.5">Sair</button>
      </div>
    </header>
  );
}
