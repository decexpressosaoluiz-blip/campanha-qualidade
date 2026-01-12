
import React, { useEffect, useState } from 'react';
import { User, AppData, DashboardView } from './types';
import { CSV_URLS } from './constants';
import { fetchCsv } from './services/csvService';
import { calculateStats, normalizeUnitName, parseCurrency, parseDate } from './services/calculationService';
import Layout from './components/Layout';
import Login from './components/Login';
import ManagerDashboard from './components/ManagerDashboard';
import UnitDashboard from './components/UnitDashboard';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [view, setView] = useState<DashboardView>(DashboardView.LOGIN);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [headerActions, setHeaderActions] = useState<React.ReactNode>(null);
  
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({ start: '', end: '' });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [baseRows, metaRows, dateRows] = await Promise.all([
        fetchCsv(CSV_URLS.BASE),
        fetchCsv(CSV_URLS.META),
        fetchCsv(CSV_URLS.DATAS)
      ]);

      const headerRow = dateRows[0] || [];
      const fixedTotalDays = parseInt(headerRow[6] || '0');
      const fixedElapsedDays = parseInt(headerRow[7] || '0');

      const refDateRaw = dateRows[1]?.[4]; 
      const refDate = parseDate(refDateRaw) || new Date(new Date().setDate(new Date().getDate() - 1));
      
      const holidays: Date[] = [];
      for (let i = 1; i < dateRows.length; i++) {
        const row = dateRows[i];
        if (row && row[2]) {
          const h = parseDate(row[2]);
          if (h) holidays.push(h);
        }
      }

      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      if (!dateRange.start) setDateRange({ start: firstDay, end: lastDay });

      const metas = metaRows.slice(1).map(row => ({
        unidade: normalizeUnitName(row[0]),
        meta: parseCurrency(row[1])
      })).filter(m => m.unidade);

      let maxDateFound = new Date(0);
      const ctes = baseRows.slice(1).map(row => {
        const dateVal = parseDate(row[2]);
        if (!dateVal) return null;
        if(dateVal > maxDateFound) maxDateFound = dateVal;

        return {
          id: row[0],
          data: dateVal,
          prazoBaixa: parseDate(row[5]), // Coluna F
          statusPrazo: row[6],
          unidadeColeta: normalizeUnitName(row[7]),
          unidadeEntrega: normalizeUnitName(row[8]),
          statusMdfe: row[10],
          valor: parseCurrency(row[11]),
          remetente: row[3],
          destinatario: row[4]
        };
      }).filter((c): c is NonNullable<typeof c> => c !== null);

      setData({
        ctes,
        metas,
        refDate,
        holidays,
        lastUpdate: maxDateFound.getTime() > 0 ? maxDateFound : new Date(),
        fixedDays: { total: fixedTotalDays || 21, elapsed: fixedElapsedDays || 1 }
      });
    } catch (err) {
      setError('Falha ao carregar dados operacionais.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (username: string, pass: string) => {
    setLoading(true);
    setLoginError('');
    try {
       const userRows = await fetchCsv(CSV_URLS.USUARIOS);
       const users = userRows.slice(1);
       
       const userFound = users.find(row => row[0]?.toLowerCase() === username.toLowerCase());
       
       if (!userFound) {
         setLoginError('Usuário incorreto');
         return;
       }

       if (userFound[1] !== pass) {
         setLoginError('Senha incorreta');
         return;
       }

       const unit = userFound[2] ? normalizeUnitName(userFound[2]) : '';
       setUser({ username: userFound[0], unit });
       await loadData();
       if (!unit) setView(DashboardView.MANAGER);
       else { setSelectedUnit(unit); setView(DashboardView.UNIT_DETAIL); }
    } catch (e) { 
      setLoginError('Erro ao autenticar. Tente novamente.'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleLogout = () => { setUser(null); setData(null); setView(DashboardView.LOGIN); setSelectedUnit(null); setLoginError(''); };

  const renderContent = () => {
    if (loading && !data) return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-[#2E31B4]">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="font-semibold animate-pulse">Carregando</p>
      </div>
    );
    if (error) return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-red-600">
         <p className="font-bold">{error}</p>
         <button onClick={loadData} className="mt-4 px-4 py-2 bg-[#2E31B4] text-white rounded">Tentar Novamente</button>
      </div>
    );
    if (view === DashboardView.LOGIN) return <Login onLogin={handleLogin} loading={loading} error={loginError} />;
    
    // Configuração robusta de datas para cálculo
    // Força o horário 12:00:00 para evitar problemas de fuso horário ao converter string YYYY-MM-DD para Date
    const calculationDateRange = {
      start: dateRange.start ? new Date(dateRange.start + 'T12:00:00') : null,
      end: dateRange.end ? new Date(dateRange.end + 'T12:00:00') : null
    };

    if (view === DashboardView.MANAGER && data) {
      const stats = calculateStats(data, undefined, calculationDateRange);
      return <ManagerDashboard stats={stats} allCtes={data.ctes} onSelectUnit={(u) => { setSelectedUnit(u); setView(DashboardView.UNIT_DETAIL); }} onDateFilterChange={(start, end) => setDateRange({ start, end })} dateRange={dateRange} lastUpdate={data.lastUpdate} fixedDays={data.fixedDays} />;
    }
    if (view === DashboardView.UNIT_DETAIL && data && selectedUnit) {
      const stats = calculateStats(data, selectedUnit, calculationDateRange);
      return <UnitDashboard 
        stats={stats[0]} 
        user={user} 
        onBack={() => setView(DashboardView.MANAGER)} 
        setHeaderActions={setHeaderActions} 
        lastUpdate={data.lastUpdate} 
        allCtes={data.ctes} 
        fixedDays={data.fixedDays} 
        dateRange={dateRange} 
        onDateFilterChange={(start, end) => setDateRange({ start, end })}
      />;
    }
    return null;
  };

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      onHomeClick={() => { if(user && !user.unit) setView(DashboardView.MANAGER); }}
      onBack={view === DashboardView.UNIT_DETAIL ? () => setView(DashboardView.MANAGER) : undefined}
      headerActions={headerActions}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
