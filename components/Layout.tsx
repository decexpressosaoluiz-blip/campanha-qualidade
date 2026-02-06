
import React from 'react';
import { LogOut, ExternalLink, Home, ArrowLeft } from 'lucide-react';
import { User } from '../types';
import { LINKS } from '../constants';

interface LayoutProps {
  user: User | null;
  onLogout: () => void;
  children: React.ReactNode;
  onHomeClick: () => void;
  onBack?: () => void;
  headerActions?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, children, onHomeClick, onBack, headerActions }) => {
  // Apenas admins (sem unidade vinculada) podem ver o botão voltar no cabeçalho
  const canGoBack = user && !user.unit && onBack;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FD]">
      {/* Sticky Header - Dark Tech Style to match Login */}
      <header className="sticky top-0 z-50 bg-[#02020a]/95 backdrop-blur-md border-b border-white/5 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-[#02020a] via-[#050515] to-[#0a0a1a] opacity-90 -z-10" />
        
        {/* Glow Line Top */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#EC1B23]/30 to-transparent" />

        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2 sm:space-x-4">
              {canGoBack && (
                <button 
                  onClick={onBack}
                  className="flex items-center px-3 py-1.5 bg-[#2E31B4]/20 text-[#9798E4] rounded-lg font-bold hover:bg-[#2E31B4] hover:text-white transition-all border border-[#2E31B4]/30 active:scale-95 text-[10px] sm:text-xs group"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1 sm:mr-2 group-hover:-translate-x-1 transition-transform" />
                  VOLTAR
                </button>
              )}
              <button onClick={onHomeClick} className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
                <div className="bg-white/5 p-1.5 rounded-lg border border-white/10 group-hover:border-[#EC1B23]/50 transition-colors">
                  <Home className="h-5 w-5 text-white group-hover:text-[#EC1B23] transition-colors" />
                </div>
                <div className="flex flex-col items-start leading-none hidden xs:flex">
                  <span className="font-black text-lg text-white tracking-tighter">SÃO LUIZ</span>
                  <span className="font-bold text-xs text-transparent bg-clip-text bg-gradient-to-r from-[#EC1B23] to-[#ff4d54] tracking-[0.2em]">EXPRESS</span>
                </div>
              </button>
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-4">
              <div className="hidden lg:flex items-center space-x-2">
                {headerActions}
              </div>

              {user && (
                <div className="flex items-center border-l border-white/10 pl-2 sm:pl-4 ml-1 sm:ml-2">
                  <div className="text-right mr-3 hidden sm:block">
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Unidade</p>
                    <p className="text-xs sm:text-sm font-bold text-white whitespace-nowrap tracking-wide">
                      {user.unit ? `${user.unit}` : 'MATRIZ (ADMIN)'}
                    </p>
                  </div>
                  <button 
                    onClick={onLogout}
                    className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-300 hover:text-red-400 border border-transparent hover:border-red-500/30 transition-all"
                    title="Sair"
                  >
                    <LogOut className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-[10px] text-gray-400 font-mono font-medium uppercase tracking-widest">
            © São Luiz Express • 2026 • Secure Connection
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
