import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ComunynkLogo from '../components/ComunynkLogo';

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
    <div className="min-h-screen paper-bg flex items-center justify-center px-4 font-sans relative overflow-hidden">
      {/* Decorative CMYK diagonal stripes — corners */}
      <div className="absolute -top-12 -left-12 w-72 h-72 rotate-[-12deg] opacity-[0.07] cmyk-stripe-thin pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-72 h-72 rotate-[-12deg] opacity-[0.07] cmyk-stripe-thin pointer-events-none" />
      {/* Floating registration mark */}
      <div className="absolute top-10 right-10 reg-mark opacity-30 animate-register-spin" style={{ width: 38, height: 38 }} />

      <div className="w-full max-w-[400px] animate-fade-up relative z-10">

        {/* Logo lockup */}
        <div className="flex flex-col items-center mb-8">
          <ComunynkLogo size="lg" withTagline />
          <p className="text-[12px] text-ink-400 mt-6 tracking-wide">
            Sistema de Fluxo de Caixa
          </p>
        </div>

        {/* Card */}
        <div className="card-print card-print-quiet p-8">
          {/* CMYK top accent */}
          <div className="-mx-8 -mt-8 mb-6 h-1.5 cmyk-stripe-soft" />

          <div className="mb-5">
            <h1 className="text-lg font-bold text-ink-900 tracking-tight">Bem-vindo de volta</h1>
            <p className="text-sm text-ink-400 mt-1">Entre com suas credenciais para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
            {erro && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-cmyk-m-soft border border-cmyk-m-ring rounded-xl text-xs text-cmyk-m font-medium" data-testid="login-error-msg">
                <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {erro}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-ink-500 uppercase tracking-[0.22em] mb-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-sm bg-cmyk-c mr-1.5 align-middle" />
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                data-testid="login-email-input"
                className="w-full px-3.5 py-2.5 text-sm text-ink-900 bg-paper border border-ink-100 rounded-xl placeholder:text-ink-300 outline-none focus:bg-white focus:ring-2 focus:ring-cmyk-c/30 focus:border-cmyk-c transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-ink-500 uppercase tracking-[0.22em] mb-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-sm bg-cmyk-m mr-1.5 align-middle" />
                Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                data-testid="login-password-input"
                className="w-full px-3.5 py-2.5 text-sm text-ink-900 bg-paper border border-ink-100 rounded-xl placeholder:text-ink-300 outline-none focus:bg-white focus:ring-2 focus:ring-cmyk-m/30 focus:border-cmyk-m transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit-btn"
              className="w-full py-3 bg-ink-900 text-white text-sm font-bold tracking-wide rounded-xl hover:bg-ink-800 active:bg-ink-900 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-2 relative overflow-hidden group"
            >
              <span className="absolute inset-y-0 left-0 w-1 cmyk-stripe-soft" />
              <span className="relative">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="cmyk-loader"><span/><span/><span/><span/></span>
                    Entrando...
                  </span>
                ) : 'Entrar'}
              </span>
            </button>
          </form>
        </div>

        {/* Hint */}
        <div className="mt-4 px-4 py-3 bg-white/60 backdrop-blur-sm border border-ink-100 rounded-xl text-center">
          <p className="text-[11px] text-ink-500 leading-relaxed">
            <span className="font-bold text-cmyk-c">Admin:</span> admin@cashflow.com · admin123
            <br />
            <span className="font-bold text-cmyk-m">Viewer:</span> viewer@cashflow.com · viewer123
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-ink-400 mt-6 tracking-widest uppercase">
          Comunynk · CMYK <span className="text-cmyk-c">C</span><span className="text-cmyk-m">M</span><span className="text-[#E0B617]">Y</span><span className="text-ink-700">K</span>
        </p>

      </div>
    </div>
  );
}
