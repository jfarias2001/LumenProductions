import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/auth.js';
import { useAIStatus } from '../hooks/useAI.js';

const links = [
  { to: '/board', label: 'Board' },
  { to: '/empresa', label: 'Base da Empresa' },
  { to: '/calendario', label: 'Calendário' },
];

/** Cabeçalho compartilhado (logo + navegação + status IA + usuário). */
export default function AppHeader() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const aiStatus = useAIStatus();

  return (
    <header className="bg-surface-900 border-b border-surface-700 px-4 py-2.5 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-brand-500 to-ai-500 text-white font-bold text-sm">◑</div>
          <div className="leading-tight">
            <h1 className="text-sm font-bold text-white">Content Engine</h1>
            <span className="text-[10px] text-slate-500">Lumen Digital</span>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                  isActive ? 'bg-surface-700 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-surface-800'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        {aiStatus.data && (
          <span className={`badge ${aiStatus.data.enabled ? 'bg-ai-600/15 text-ai-400 border border-ai-500/40' : 'bg-surface-700 text-slate-400'}`}>
            {aiStatus.data.enabled ? '✦ IA ativa' : 'IA off'}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right leading-tight hidden sm:block">
          <p className="text-xs text-slate-200">{user?.name}</p>
          <p className="text-[10px] text-slate-500">{user?.role}</p>
        </div>
        <button onClick={() => void logout()} className="btn-ghost text-xs px-2 py-1.5">Sair</button>
      </div>
    </header>
  );
}
