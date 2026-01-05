import React from 'react';
import { LogOut, ExternalLink, Home } from 'lucide-react';
import { User } from '../types';
import { LINKS } from '../constants';

interface LayoutProps {
  user: User | null;
  onLogout: () => void;
  children: React.ReactNode;
  onHomeClick: () => void;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, children, onHomeClick }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F2F2F8]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-[#0F103A] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button onClick={onHomeClick} className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <Home className="h-6 w-6 text-[#9798E4]" />
                <span className="font-bold text-xl tracking-tight">SÃO LUIZ EXPRESS</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* External Link */}
              <a 
                href={LINKS.PENDENCIAS}
                target="_blank"
                rel="noreferrer"
                className="hidden md:flex items-center px-4 py-2 bg-[#EC1B23] hover:bg-[#C41017] rounded text-sm font-semibold transition-colors shadow-md"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                CONSULTAR PENDÊNCIAS
              </a>

              {user && (
                <div className="flex items-center border-l border-gray-600 pl-4 ml-4">
                  <span className="text-sm mr-4 text-gray-300 hidden sm:block">
                    {user.username} {user.unit ? `(${user.unit})` : '(ADMIN)'}
                  </span>
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
      <footer className="bg-[#0F103A] text-gray-400 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <p>São Luiz Express. Todos os direitos reservados. 2026.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
