import React, { useState, useMemo } from 'react';
import { UnitStats, SortField } from '../types';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ComposedChart } from 'recharts';
import Card from './Card';
import { DollarSign, Truck, FileText, Search, ArrowUpDown, Calendar, Filter, AlertTriangle, CheckCircle, XCircle, ChevronDown, Clock, Info } from 'lucide-react';

interface ManagerDashboardProps {
  stats: UnitStats[];
  onSelectUnit: (unit: string) => void;
  onDateFilterChange: (start: string, end: string) => void;
  dateRange: { start: string, end: string };
  lastUpdate: Date;
  fixedDays: { total: number; elapsed: number };
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ stats, onSelectUnit, onDateFilterChange, dateRange, lastUpdate, fixedDays }) => {
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('faturamento'); 
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Aggregate Totals
  const totalStats = useMemo(() => {
    return stats.reduce((acc, curr) => ({
      faturamento: acc.faturamento + curr.faturamento,
      meta: acc.meta + curr.meta,
      projecao: acc.projecao + curr.projecao,
      baixaNoPrazo: acc.baixaNoPrazo + curr.baixaNoPrazo,
      baixaForaPrazo: acc.baixaForaPrazo + curr.baixaForaPrazo,
      semBaixa: acc.semBaixa + curr.semBaixa,
      comMdfe: acc.comMdfe + curr.comMdfe,
      semMdfe: acc.semMdfe + curr.semMdfe,
      totalCtes: acc.totalCtes + (curr.comMdfe + curr.semMdfe)
    }), { faturamento: 0, meta: 0, projecao: 0, baixaNoPrazo: 0, baixaForaPrazo: 0, semBaixa: 0, comMdfe: 0, semMdfe: 0, totalCtes: 0 });
  }, [stats]);

  // Calculations for Card Percentages
  const totalBaixas = totalStats.baixaNoPrazo + totalStats.baixaForaPrazo + totalStats.semBaixa;
  const pctNoPrazo = totalBaixas ? (totalStats.baixaNoPrazo / totalBaixas) * 100 : 0;
  const pctSemBaixa = totalBaixas ? (totalStats.semBaixa / totalBaixas) * 100 : 0;
  const pctAtrasadas = totalBaixas ? (totalStats.baixaForaPrazo / totalBaixas) * 100 : 0;
  
  const totalManifestos = totalStats.comMdfe + totalStats.semMdfe;
  const pctComMdfe = totalManifestos ? (totalStats.comMdfe / totalManifestos) * 100 : 0;
  const pctSemMdfe = totalManifestos ? (totalStats.semMdfe / totalManifestos) * 100 : 0;

  // General Revenue Projections
  const generalPercentProj = totalStats.meta > 0 ? (totalStats.projecao / totalStats.meta) * 100 : 0;
  const generalPercentFat = totalStats.meta > 0 ? (totalStats.faturamento / totalStats.meta) * 100 : 0;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      if (field === 'unidade') setSortDirection('asc');
      else setSortDirection('desc');
    }
  };

  const scrollToTable = (field: SortField) => {
    setSortField(field);
    setSortDirection('desc');
    setTimeout(() => {
      const element = document.getElementById('ranking-table');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const sortedStats = useMemo(() => {
    let filtered = stats.filter(s => s.unidade.includes(filter.toUpperCase()));

    return filtered.sort((a, b) => {
      let valA = 0;
      let valB = 0;

      switch (sortField) {
        case 'unidade':
          return sortDirection === 'asc' 
            ? a.unidade.localeCompare(b.unidade) 
            : b.unidade.localeCompare(a.unidade);
        case 'faturamento':
          valA = a.faturamento; valB = b.faturamento; break;
        case 'projecao':
          valA = a.percentualProjecao; valB = b.percentualProjecao; break;
        case 'noPrazo':
           valA = (a.baixaNoPrazo + a.baixaForaPrazo + a.semBaixa) > 0 ? a.baixaNoPrazo / (a.baixaNoPrazo + a.baixaForaPrazo + a.semBaixa) : 0;
           valB = (b.baixaNoPrazo + b.baixaForaPrazo + b.semBaixa) > 0 ? b.baixaNoPrazo / (b.baixaNoPrazo + b.baixaForaPrazo + b.semBaixa) : 0;
           break;
        case 'semBaixa':
          valA = a.semBaixa; valB = b.semBaixa; break;
        case 'semMdfe':
          const totalMdfeA = a.comMdfe + a.semMdfe;
          const totalMdfeB = b.comMdfe + b.semMdfe;
          valA = totalMdfeA > 0 ? a.semMdfe / totalMdfeA : 0;
          valB = totalMdfeB > 0 ? b.semMdfe / totalMdfeB : 0;
          break;
      }

      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [stats, filter, sortField, sortDirection]);

  const chartData = useMemo(() => {
    return [...stats]
      .sort((a, b) => b.faturamento - a.faturamento)
      .slice(0, 20);
  }, [stats]);

  const globalMax = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.max(...chartData.map(d => Math.max(d.meta, d.projecao, d.faturamento))) * 1.1;
  }, [chartData]);

  const getColorByProjection = (percent: number) => {
    if (percent >= 100) return '#059669';
    if (percent >= 95) return '#EAB308';
    return '#EC1B23';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as UnitStats;
      const color = getColorByProjection(data.percentualProjecao);
      
      return (
        <div className="bg-white p-4 border border-gray-200 shadow-xl rounded-lg text-sm z-50">
          <p className="font-bold text-[#0F103A] mb-3 text-base border-b pb-2">{label.replace('DEC - ', '')}</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center w-56">
              <span className="text-gray-500">Realizado:</span>
              <span className="font-bold text-[#2E31B4] text-base">{data.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Projeção:</span>
              <span className="font-bold text-base" style={{ color: color }}>
                {data.projecao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Meta:</span>
              <span className="font-semibold text-gray-400">{data.meta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between items-center bg-gray-50 p-2 rounded">
              <span className="text-gray-600 font-medium">Atingimento:</span>
              <span className="font-black text-lg" style={{ color: color }}>
                {data.percentualProjecao.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* Header Info Bar */}
      <div className="bg-white px-6 py-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center text-[#2E31B4] mb-2 md:mb-0">
          <Clock className="w-5 h-5 mr-2" />
          <span className="font-semibold text-sm">Atualizado: {lastUpdate.toLocaleDateString('pt-BR')}</span>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex items-center text-gray-500 text-xs bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
               <Info className="w-3 h-3 mr-1" />
               <span className="font-semibold text-blue-800 tracking-wide uppercase">Dias Úteis: {fixedDays.elapsed} / {fixedDays.total}</span>
            </div>

            <div className="flex items-center space-x-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
               <Calendar className="w-4 h-4 text-gray-500 ml-2" />
               <input 
                 type="date" 
                 value={dateRange.start}
                 onChange={(e) => onDateFilterChange(e.target.value, dateRange.end)}
                 className="bg-transparent text-sm focus:outline-none text-gray-700 w-32 font-medium"
               />
               <span className="text-gray-400">-</span>
               <input 
                 type="date" 
                 value={dateRange.end}
                 onChange={(e) => onDateFilterChange(dateRange.start, e.target.value)}
                 className="bg-transparent text-sm focus:outline-none text-gray-700 w-32 font-medium"
               />
            </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="FATURAMENTO GERAL" icon={<DollarSign className="w-6 h-6"/>} className="border-l-blue-700 shadow-md">
           <div className="flex flex-col gap-4">
             <div>
               <div className="text-4xl font-extrabold text-[#0F103A] tracking-tight truncate">
                 {totalStats.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
               </div>
               <div className="text-sm text-gray-400 mt-1 font-medium">
                 Meta: {totalStats.meta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
               </div>
             </div>
             
             <div>
                <div className="flex justify-between items-end mb-2">
                   <div className="flex flex-col">
                      <span className="text-[10px] uppercase text-gray-400 font-bold">Projeção</span>
                      <span className="font-bold text-[#2E31B4] text-lg">
                        {totalStats.projecao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                      </span>
                   </div>
                   <span className={`text-xl font-black ${generalPercentProj >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                     {generalPercentProj.toFixed(1)}%
                   </span>
                </div>
                <div className="relative w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`absolute top-0 left-0 h-full ${generalPercentProj >= 100 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(generalPercentProj, 100)}%`, opacity: 0.3 }}></div>
                    <div className={`absolute top-0 left-0 h-full ${generalPercentProj >= 100 ? 'bg-green-600' : 'bg-red-600'}`} style={{ width: `${Math.min(generalPercentFat, 100)}%` }}></div>
                </div>
             </div>
           </div>
        </Card>

        <Card title="PENDÊNCIAS DE ENTREGA" icon={<Truck className="w-6 h-6"/>} className="border-l-yellow-500 shadow-md" onClick={() => scrollToTable('semBaixa')}>
           <div className="grid grid-cols-3 gap-2 py-2 items-center text-center">
             <div className="flex flex-col justify-center border-r border-gray-100 pr-2">
                <span className="text-2xl font-bold text-green-700">{totalStats.baixaNoPrazo}</span>
                <span className="text-xs font-bold text-green-600 bg-green-50 rounded py-0.5 mt-1">{pctNoPrazo.toFixed(0)}%</span>
                <span className="text-[10px] text-gray-400 mt-2 uppercase">No Prazo</span>
             </div>
             <div className="flex flex-col justify-center px-2 bg-yellow-50/50 rounded-lg py-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
                <span className="text-3xl font-extrabold text-yellow-700">{totalStats.semBaixa}</span>
                <span className="text-xs font-bold text-yellow-600">{pctSemBaixa.toFixed(0)}%</span>
                <span className="text-[10px] text-yellow-800 font-bold mt-1 uppercase">Pendentes</span>
             </div>
             <div className="flex flex-col justify-center border-l border-gray-100 pl-2">
                <span className="text-2xl font-bold text-red-700">{totalStats.baixaForaPrazo}</span>
                <span className="text-xs font-bold text-red-600 bg-red-50 rounded py-0.5 mt-1">{pctAtrasadas.toFixed(0)}%</span>
                <span className="text-[10px] text-gray-400 mt-2 uppercase">Atrasadas</span>
             </div>
           </div>
        </Card>

        <Card title="MANIFESTOS" icon={<FileText className="w-6 h-6"/>} className="border-l-red-600 shadow-md" onClick={() => scrollToTable('semMdfe')}>
           <div className="flex gap-2 items-center py-2">
              <div className="w-1/2 flex flex-col items-center justify-center border-r border-gray-100">
                <span className="text-3xl font-bold text-green-600">{totalStats.comMdfe}</span>
                <div className="flex items-center mt-1">
                   <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                   <span className="text-xs font-bold text-green-600">Com MDFE</span>
                </div>
                <span className="text-[10px] text-gray-400 mt-1">{pctComMdfe.toFixed(0)}% do total</span>
              </div>
              <div className="w-1/2 flex flex-col items-center justify-center bg-red-50/30 py-3 rounded-lg">
                <span className="text-4xl font-extrabold text-red-600">{totalStats.semMdfe}</span>
                <div className="flex items-center mt-1">
                   <XCircle className="w-4 h-4 text-red-500 mr-1" />
                   <span className="text-sm font-bold text-red-600">SEM MDFE</span>
                </div>
                <span className="text-xs text-red-400 font-bold mt-1">{pctSemMdfe.toFixed(0)}% Crítico</span>
              </div>
           </div>
        </Card>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100">
        <h3 className="text-xl font-bold text-[#0F103A] mb-6">Top 20 Unidades (Faturamento Realizado)</h3>
        <div className="h-[700px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart layout="vertical" data={chartData} margin={{ top: 0, right: 30, left: 40, bottom: 20 }} barGap={-24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" xAxisId={0} hide domain={[0, globalMax]} />
              <YAxis dataKey="unidade" type="category" tick={{fontSize: 12, fontWeight: 700, fill: '#374151'}} tickFormatter={(v) => v.replace('DEC - ', '')} width={160} />
              <Tooltip cursor={{fill: '#F3F4F6'}} content={<CustomTooltip />} />
              <Bar dataKey="meta" barSize={24} xAxisId={0} radius={[0, 4, 4, 0]} fill="#E5E7EB" />
              <Bar dataKey="projecao" barSize={24} xAxisId={0} radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => <Cell key={`proj-${index}`} fill={getColorByProjection(entry.percentualProjecao)} opacity={0.5} />)}
              </Bar>
              <Bar dataKey="faturamento" barSize={24} xAxisId={0} radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => <Cell key={`fat-${index}`} fill={getColorByProjection(entry.percentualProjecao)} />)}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table Section */}
      <div id="ranking-table" className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-100 scroll-mt-24">
        <div className="p-5 border-b bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
             <Filter className="text-[#2E31B4] w-5 h-5"/>
             <h3 className="font-bold text-[#0F103A] text-lg uppercase tracking-wide">Ranking Geral</h3>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
             <div className="relative group">
                <button className="flex items-center space-x-2 text-sm text-gray-600 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
                   <ArrowUpDown className="w-4 h-4" />
                   <span className="font-medium">Ordenar</span>
                   <ChevronDown className="w-3 h-3" />
                </button>
                <div className="absolute top-full right-0 mt-2 w-56 bg-white border rounded-lg shadow-xl hidden group-hover:block z-20">
                   <div className="py-1">
                      <button onClick={() => { setSortField('faturamento'); setSortDirection('desc'); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Maior Faturamento</button>
                      <button onClick={() => { setSortField('projecao'); setSortDirection('desc'); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Maior % Projeção</button>
                      <button onClick={() => { setSortField('noPrazo'); setSortDirection('desc'); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Maior % Entregas OK</button>
                      <button onClick={() => { setSortField('semMdfe'); setSortDirection('desc'); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Maior % Sem MDFE</button>
                   </div>
                </div>
             </div>
             <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input type="text" placeholder="Buscar unidade..." className="pl-10 pr-4 py-2 border rounded-full text-sm w-full md:w-64" value={filter} onChange={(e) => setFilter(e.target.value)} />
             </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#E8E8F9] text-[#24268B]">
               <tr>
                 <th className="px-6 py-4 text-left font-bold cursor-pointer" onClick={() => handleSort('unidade')}>Unidade</th>
                 <th className="px-6 py-4 text-right font-bold cursor-pointer" onClick={() => handleSort('projecao')}>% Projeção</th>
                 <th className="px-6 py-4 text-right font-bold hidden md:table-cell cursor-pointer" onClick={() => handleSort('faturamento')}>Faturamento</th>
                 <th className="px-6 py-4 text-center font-bold cursor-pointer" onClick={() => handleSort('noPrazo')}>% Entregas OK</th>
                 <th className="px-6 py-4 text-center font-bold cursor-pointer" onClick={() => handleSort('semBaixa')}>Pendências</th>
                 <th className="px-6 py-4 text-center font-bold cursor-pointer" onClick={() => handleSort('semMdfe')}>% Sem MDFE</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
               {sortedStats.map((stat) => {
                 const tB = stat.baixaNoPrazo + stat.baixaForaPrazo + stat.semBaixa;
                 const pN = tB > 0 ? (stat.baixaNoPrazo / tB) * 100 : 0;
                 const tM = stat.comMdfe + stat.semMdfe;
                 const pM = tM > 0 ? (stat.semMdfe / tM) * 100 : 0;

                 return (
                   <tr key={stat.unidade} onClick={() => onSelectUnit(stat.unidade)} className="hover:bg-blue-50 cursor-pointer transition-colors group">
                     <td className="px-6 py-4 font-bold text-[#0F103A] group-hover:text-[#2E31B4]">{stat.unidade}</td>
                     <td className="px-6 py-4 text-right">
                       <span className={`px-2 py-1 rounded text-xs font-bold ${stat.percentualProjecao >= 100 ? 'bg-green-100 text-green-700' : stat.percentualProjecao >= 95 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                         {stat.percentualProjecao.toFixed(1)}%
                       </span>
                     </td>
                     <td className="px-6 py-4 text-right hidden md:table-cell text-gray-700 font-medium">{stat.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                     <td className="px-6 py-4 text-center">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${pN >= 90 ? 'bg-green-100 text-green-700' : pN >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                           {pN.toFixed(1)}%
                        </span>
                     </td>
                     <td className="px-6 py-4 text-center font-bold text-gray-600">{stat.semBaixa}</td>
                     <td className="px-6 py-4 text-center">
                       <span className={`text-xs font-bold px-2 py-1 rounded ${pM > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                         {pM.toFixed(1)}%
                       </span>
                     </td>
                   </tr>
                 );
               })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;