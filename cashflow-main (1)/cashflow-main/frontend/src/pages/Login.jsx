import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      await login(email, senha);
      navigate('/');
    } catch (err) {
      setErro(err.response?.data?.erro || 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-[360px] animate-fade-up">

        {/* Logo mark */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center mb-4">
            <span className="text-white text-xs font-bold tracking-tight">FC</span>
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Bem-vindo</h1>
          <p className="text-sm text-zinc-400 mt-1">Entre com suas credenciais para continuar</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {erro && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600">
                <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {erro}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full px-3 py-2.5 text-sm text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl placeholder:text-zinc-300 outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2.5 text-sm text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl placeholder:text-zinc-300 outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-xl hover:bg-zinc-800 active:bg-zinc-950 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Hint */}
        <div className="mt-4 px-4 py-3 bg-zinc-100/80 rounded-xl text-center">
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            <span className="font-medium text-zinc-500">Admin:</span> admin@cashflow.com · admin123
            <br />
            <span className="font-medium text-zinc-500">Viewer:</span> viewer@cashflow.com · viewer123
          </p>
        </div>

      </div>
    </div>
  );
}
