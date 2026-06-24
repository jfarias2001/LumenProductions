import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.js';

export default function Login() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/board');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Glow de fundo */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-ai-600/10 blur-3xl" />

      <div className="w-full max-w-sm surface-card shadow-card p-8 relative animate-fade-in">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-brand-500 to-ai-500 text-white font-bold text-lg mb-3 shadow-glow">
            ◑
          </div>
          <h1 className="text-2xl font-bold text-white">Content Engine</h1>
          <p className="text-sm text-slate-400 mt-1">Lumen Digital</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="label-base">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-base"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="label-base">Senha</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-base"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-xs text-slate-500 text-center mt-6">
          Admin padrão: admin@lumendigital.com.br / Admin@123456
        </p>
      </div>
    </div>
  );
}
