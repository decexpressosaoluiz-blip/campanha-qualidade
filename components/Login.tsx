import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface LoginProps {
  onLogin: (u: string, p: string) => void;
  loading: boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin, loading }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) onLogin(username, password);
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md border-t-4 border-[#2E31B4]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#0F103A] mb-2">São Luiz Express</h1>
          <p className="text-gray-500">Painel Operacional Geral</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#2E31B4] focus:outline-none"
              placeholder="Digite seu usuário"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#2E31B4] focus:outline-none"
              placeholder="Digite sua senha"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#2E31B4] hover:bg-[#24268B] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2E31B4] disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
