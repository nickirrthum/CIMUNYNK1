import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ComunynkLogo, { InkSquare } from './ComunynkLogo';

const IconGrid = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
  </svg>
);
const IconUp = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0-5.94-2.28m5.94 2.28-2.28 5.941" />
  </svg>
);
const IconDown = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181" />
  </svg>
);
const IconTag = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
  </svg>
);
const IconList = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
  </svg>
);
const IconCaixa = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
  </svg>
);
const IconLogout = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
  </svg>
);

const navItems = [
  { to: '/',           end: true,  label: 'Caixa',              Icon: IconCaixa, group: 'financeiro', accent: '#00AEEF' },
  { to: '/dashboard',  end: false, label: 'Dashboard',          Icon: IconGrid,  group: 'financeiro', accent: '#00AEEF' },
  { to: '/receitas',   end: false, label: 'Receitas',           Icon: IconUp,    group: 'financeiro', accent: '#00AEEF' },
  { to: '/despesas',   end: false, label: 'Despesas',           Icon: IconDown,  group: 'financeiro', accent: '#EC008C' },
  { to: '/quotes',     end: false, label: 'Orçamentos',         Icon: IconList,  group: 'grafica',    accent: '#FFD800' },
  { to: '/products',   end: false, label: 'Produtos',           Icon: IconTag,   group: 'grafica',    accent: '#FFD800' },
];

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="w-[248px] shrink-0 bg-white border-r border-ink-100 flex flex-col h-screen relative overflow-hidden">
      {/* decorative CMYK diagonal stripe at top */}
      <div className="absolute top-0 left-0 right-0 h-[3px] cmyk-stripe-soft" aria-hidden="true" />

      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-ink-100 relative">
        <ComunynkLogo size="md" variant="wordmark" />
        {/* corner registration mark */}
        <div className="absolute top-3 right-4 reg-mark opacity-60" aria-hidden="true" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, end, label, Icon, group, accent }, idx) => {
          const prevGroup = idx > 0 ? navItems[idx - 1].group : null;
          const showDivider = prevGroup && prevGroup !== group;
          return (
            <React.Fragment key={to}>
              {showDivider && (
                <div className="px-3 pt-4 pb-1.5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-sm bg-cmyk-y" />
                  <p className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.22em]">Gráfica</p>
                  <span className="flex-1 h-px bg-ink-100" />
                </div>
              )}
              <NavLink
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) =>
                  `relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group ${
                    isActive
                      ? 'bg-ink-50 text-ink-900 font-semibold'
                      : 'text-ink-500 hover:text-ink-800 hover:bg-ink-50/60 font-medium'
                  }`
                }
                style={({ isActive }) => isActive ? { boxShadow: `inset 3px 0 0 ${accent}` } : {}}
              >
                {({ isActive }) => (
                  <>
                    <span
                      className="transition-colors"
                      style={{ color: isActive ? accent : undefined }}
                    >
                      <Icon />
                    </span>
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </React.Fragment>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-ink-100 relative">
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
          <div className="relative shrink-0">
            <InkSquare size={28} />
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white mix-blend-difference">
              {user?.nome?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-ink-800 truncate leading-tight">{user?.nome}</p>
            <p className="text-[10px] text-ink-400 leading-tight uppercase tracking-wider mt-0.5">
              {user?.nivel_acesso === 'admin' ? 'Administrador' : 'Visualizador'}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-ink-500 hover:text-cmyk-m hover:bg-cmyk-m-soft rounded-xl transition-colors duration-150"
        >
          <IconLogout />
          Sair da conta
        </button>
      </div>
    </aside>
  );
}
