
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
    <div className="min-h-screen flex flex-col bg-[#F2F2F8]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-[#0F103A] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2 sm:space-x-4">
              {canGoBack && (
                <button 
                  onClick={onBack}
                  className="flex items-center px-3 py-1.5 bg-[#2E31B4] text-white rounded font-bold hover:bg-[#24268B] transition-all border border-white/20 shadow-md active:scale-95 text-[10px] sm:text-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1 sm:mr-2" />
                  VOLTAR
                </button>
              )}
              <button onClick={onHomeClick} className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <Home className="h-5 w-5 sm:h-6 sm:w-6 text-[#9798E4]" />
                <span className="font-bold text-lg sm:text-xl tracking-tight hidden xs:block">SÃO LUIZ EXPRESS</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="hidden lg:flex items-center space-x-2">
                {headerActions}
              </div>

              {user && (
                <div className="flex items-center border-l border-white/10 pl-2 sm:pl-4 ml-1 sm:ml-2">
                  <div className="text-right mr-3 hidden sm:block">
                    <p className="text-[9px] text-gray-400 font-bold uppercase leading-none">Unidade</p>
                    <p className="text-xs sm:text-sm font-semibold text-white whitespace-nowrap">
                      {user.unit ? `${user.unit}` : 'MATRIZ (ADMIN)'}
                    </p>
                  </div>
                  <button 
                    onClick={onLogout}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-300 hover:text-white"
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

      {/* Main Content - Ajustado padding para mobile */}
      <main className="flex-grow p-2 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-[#0F103A] text-gray-400 py-4 mt-auto border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 text-center text-[9px] uppercase font-bold tracking-widest">
          <p>© São Luiz Express • 2026</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
