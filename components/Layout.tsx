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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              {canGoBack && (
                <button 
                  onClick={onBack}
                  className="flex items-center px-4 py-1.5 bg-[#2E31B4] text-white rounded font-bold hover:bg-[#24268B] transition-all border border-white/20 shadow-md active:scale-95 text-xs mr-2"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  VOLTAR
                </button>
              )}
              <button onClick={onHomeClick} className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <Home className="h-6 w-6 text-[#9798E4]" />
                <span className="font-bold text-xl tracking-tight hidden sm:block">SÃO LUIZ EXPRESS</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Espaço para botões dinâmicos (Exportar, etc) */}
              <div className="hidden lg:flex items-center space-x-2">
                {headerActions}
              </div>

              {user && (
                <div className="flex items-center border-l border-gray-600 pl-4 ml-2">
                  <div className="text-right mr-4 hidden sm:block">
                    <p className="text-[10px] text-gray-400 font-bold uppercase leading-none">Usuário Ativo</p>
                    <p className="text-sm font-semibold text-white">
                      {user.unit ? `${user.unit}` : 'MATRIZ (ADMIN)'}
                    </p>
                  </div>
                  <button 
                    onClick={onLogout}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-300 hover:text-white"
                    title="Sair"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-[#0F103A] text-gray-400 py-6 mt-auto border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 text-center text-[10px] uppercase font-bold tracking-widest">
          <p>© São Luiz Express • Logística e Distribuição • 2026</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;