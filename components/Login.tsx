
import React, { useState } from 'react';
import { Loader2, User, Lock, Zap, Shield, CheckCircle, Lightbulb, ArrowRight, Activity, Cpu } from 'lucide-react';

interface LoginProps {
  onLogin: (u: string, p: string) => void;
  loading: boolean;
  error?: string;
  lastUpdate?: Date;
  dataLoading?: boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin, loading, error, lastUpdate, dataLoading }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) onLogin(username, password);
  };

  const pillars = [
    { icon: <Zap className="w-4 h-4 text-[#EC1B23]" />, title: 'RAPIDEZ', desc: 'Processos Ágeis' },
    { icon: <CheckCircle className="w-4 h-4 text-[#EC1B23]" />, title: 'QUALIDADE', desc: 'Controle Total' },
    { icon: <Shield className="w-4 h-4 text-[#EC1B23]" />, title: 'SEGURANÇA', desc: 'Monitoramento 24h' },
    { icon: <Lightbulb className="w-4 h-4 text-[#EC1B23]" />, title: 'SOLUÇÃO', desc: 'Foco no Cliente' },
  ];

  return (
    <div className="h-[100dvh] w-full bg-[#02020a] relative flex flex-col items-center justify-between overflow-hidden font-sans selection:bg-[#EC1B23] selection:text-white">
      
      {/* --- Camada de Fundo Tecnológico (Static & Clean) --- */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Fundo Base - Gradiente Sutil Vertical */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#02020a] via-[#050515] to-[#0a0a1a]" />

        {/* Grid Pattern Cyberpunk - Mais sutil */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] opacity-15" />
        
        {/* Glows Estáticos e Suaves (Efeito Nebulosa) */}
        {/* Glow Azul Superior Esquerdo - Maior, difuso e com opacidade baixa */}
        <div className="absolute -top-[20%] -left-[10%] w-[90vw] h-[90vw] bg-[#2E31B4] rounded-full blur-[150px] opacity-[0.12]" />
        
        {/* Glow Vermelho Inferior Direito - Maior, difuso e com opacidade baixa */}
        <div className="absolute -bottom-[20%] -right-[10%] w-[90vw] h-[90vw] bg-[#EC1B23] rounded-full blur-[150px] opacity-[0.08]" />
        
        {/* Glow Central para Profundidade */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-[#0F103A] rounded-full blur-[120px] opacity-20" />

        {/* Vignette para focar no centro */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#02020a]/40 to-[#02020a] opacity-80" />
      </div>

      {/* --- Conteúdo Centralizado Verticalmente --- */}
      <div className="relative z-10 w-full h-full flex flex-col justify-evenly items-center px-4 sm:px-0">
        
        {/* Header: Logo & Status */}
        <div className="flex flex-col items-center gap-4 w-full">
           {/* Status Tech Badge */}
           <div className="bg-[#0F103A]/60 backdrop-blur-md border border-white/5 px-5 py-2 rounded-full shadow-lg flex items-center gap-3 group hover:border-[#2E31B4]/30 transition-colors cursor-default">
               <div className="relative flex items-center justify-center">
                  <div className={`w-2 h-2 rounded-full ${dataLoading ? 'bg-yellow-400' : 'bg-[#00ff9d]'} shadow-[0_0_8px_currentColor]`} />
                  <div className={`absolute w-full h-full rounded-full animate-ping opacity-30 duration-1000 ${dataLoading ? 'bg-yellow-400' : 'bg-[#00ff9d]'}`} />
               </div>
               <div className="flex items-center gap-2 border-l border-white/10 pl-3">
                  <Cpu className="w-3 h-3 text-gray-400" />
                  <span className="text-[10px] font-mono font-bold text-gray-300 uppercase tracking-widest">
                      SYSTEM: <span className="text-white">{dataLoading ? 'CARREGANDO...' : lastUpdate ? lastUpdate.toLocaleDateString('pt-BR') : 'OFFLINE'}</span>
                  </span>
               </div>
           </div>

           {/* Logo Moderno */}
           <div className="text-center mt-2">
              <h1 className="text-5xl sm:text-7xl font-black text-white leading-none tracking-tighter drop-shadow-2xl">
                SÃO LUIZ
              </h1>
              <h1 className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#EC1B23] to-[#ff4d54] leading-none tracking-tighter drop-shadow-lg">
                EXPRESS
              </h1>
           </div>
        </div>

        {/* --- Cartão de Login (Glass Dark Minimal) --- */}
        <div className="w-full max-w-[90%] sm:max-w-[400px]">
          <div className="backdrop-blur-xl bg-[#0F1020]/70 border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden group">
            
            {/* Efeito sutil de borda superior */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#EC1B23]/50 to-transparent" />

            <div className="mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span className="w-1 h-5 bg-[#EC1B23] rounded-full shadow-[0_0_8px_rgba(236,27,35,0.4)]"></span>
                Acesso Operacional
              </h2>
              <p className="text-xs text-gray-400 mt-1 font-medium ml-3 opacity-80">Credenciais necessárias para conexão.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs font-bold flex items-center animate-shake">
                  <Activity className="w-4 h-4 mr-2" />
                  {error}
                </div>
              )}

              <div className="space-y-1 group/input">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 group-focus-within/input:text-[#EC1B23] transition-colors">Usuário</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-white transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#050510]/60 border border-white/10 text-white text-sm rounded-lg py-3 pl-10 pr-4 outline-none focus:border-[#EC1B23]/50 focus:bg-[#050510] focus:shadow-[0_0_15px_rgba(236,27,35,0.1)] transition-all font-medium placeholder-gray-600"
                    placeholder="Digite seu usuário"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1 group/input">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 group-focus-within/input:text-[#EC1B23] transition-colors">Senha</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-white transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#050510]/60 border border-white/10 text-white text-sm rounded-lg py-3 pl-10 pr-10 outline-none focus:border-[#EC1B23]/50 focus:bg-[#050510] focus:shadow-[0_0_15px_rgba(236,27,35,0.1)] transition-all font-medium placeholder-gray-600"
                    placeholder="Digite sua senha"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-1 transition-colors"
                  >
                    {showPassword ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_5px_currentColor]" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full border border-current opacity-50" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || dataLoading}
                className="w-full bg-gradient-to-r from-[#2E31B4] to-[#1a1c7a] hover:from-[#EC1B23] hover:to-[#b0141a] text-white font-bold py-3.5 rounded-lg shadow-lg border border-white/5 transition-all duration-300 transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group mt-2"
              >
                {loading || dataLoading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <>
                    <span className="text-sm tracking-widest uppercase">Conectar</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* --- Footer Tech (Ajustado contraste para leitura em desktop) --- */}
        <div className="w-full flex flex-col items-center gap-6 px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-4xl">
             {pillars.map((pillar, idx) => (
               <div key={idx} className="bg-[#151525] border border-white/10 rounded-xl p-3 flex items-center justify-center sm:justify-start gap-3 group hover:border-[#EC1B23]/50 transition-all cursor-default shadow-lg">
                  <div className="w-9 h-9 bg-black/40 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform border border-white/5">
                    {pillar.icon}
                  </div>
                  <div className="text-left">
                     <h3 className="text-white font-bold text-[10px] sm:text-xs uppercase leading-none tracking-wider">{pillar.title}</h3>
                     <p className="text-gray-400 text-[9px] sm:text-[10px] mt-1 leading-none font-medium opacity-80 group-hover:opacity-100">{pillar.desc}</p>
                  </div>
               </div>
             ))}
          </div>
          <p className="text-[10px] text-gray-500 font-mono opacity-60">
            SÃO LUIZ EXPRESS © 2026. Todos os direitos reservados.
          </p>
        </div>
        
      </div>

    </div>
  );
};

export default Login;
