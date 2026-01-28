
import React, { useState } from 'react';
import { Loader2, AlertCircle, User as UserIcon, Lock } from 'lucide-react';

interface LoginProps {
  onLogin: (u: string, p: string) => void;
  loading: boolean;
  error?: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, loading, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) onLogin(username, password);
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-4">
      <div className="w-full max-w-[400px] animate-fade-in">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          {/* Accent Line */}
          <div className="h-1.5 bg-sle-primary w-full" />
          
          <div className="p-8 sm:p-10">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-2xl mb-4 text-sle-primary">
                <UserIcon className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-sle-dark tracking-tight">São Luiz Express</h1>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-[0.2em] mt-2">Painel Operacional</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50/50 border border-red-100 text-red-600 p-3.5 rounded-xl flex items-center animate-shake">
                  <AlertCircle className="w-4 h-4 mr-3 flex-shrink-0 opacity-80" />
                  <span className="text-[11px] sm:text-xs font-semibold">{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Usuário</label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-sle-primary transition-colors">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 text-sm text-gray-900 bg-gray-50/50 border rounded-xl focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-sle-primary outline-none transition-all duration-200 ${error?.includes('Usuário') ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}
                    placeholder="Digite seu usuário"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Senha</label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-sle-primary transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 text-sm text-gray-900 bg-gray-50/50 border rounded-xl focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-sle-primary outline-none transition-all duration-200 ${error?.includes('Senha') ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}
                    placeholder="Digite sua senha"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-lg shadow-blue-900/10 text-xs sm:text-sm font-bold text-white bg-sle-primary hover:bg-[#24268B] disabled:opacity-70 transition-all uppercase tracking-widest mt-4 active:scale-[0.98]"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Entrar no Painel'}
              </button>
            </form>
          </div>
        </div>
        
        <p className="text-center text-[10px] text-gray-400 uppercase tracking-[0.3em] mt-8">
          Eficiência e Agilidade
        </p>
      </div>
    </div>
  );
};

export default Login;
