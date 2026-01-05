import React, { useState } from 'react';
import { UnitStats, Cte } from '../types';
import Card from './Card';
import { DollarSign, Truck, FileText, CheckCircle, AlertTriangle, XCircle, Download, ArrowLeft, ArrowUpDown } from 'lucide-react';
import { downloadXLS } from '../services/excelService';

interface UnitDashboardProps {
  stats: UnitStats;
  onBack: () => void;
}

type TabType = 'vendas' | 'baixas' | 'manifestos';
type SortKey = 'data' | 'id' | 'valor' | 'statusPrazo' | 'statusMdfe';
type SortDirection = 'asc' | 'desc';

const UnitDashboard: React.FC<UnitDashboardProps> = ({ stats, onBack }) => {
  const activeTabState = useState<TabType>('vendas');
  const activeTab = activeTabState[0];
  const setActiveTab = activeTabState[1];

  const [baixaFilter, setBaixaFilter] = useState<'all' | 'noPrazo' | 'foraPrazo' | 'semBaixa'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'data', direction: 'desc' });

  // --- Visual Logic ---
  const getProjColor = (pct: number) => {
    if (pct >= 100) return 'text-green-600';
    if (pct >= 95) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProjBarColor = (pct: number) => {
    if (pct >= 100) return 'bg-green-600';
    if (pct >= 95) return 'bg-yellow-600';
    return 'bg-red-600';
  };
  
  const getProjBarOpacityColor = (pct: number) => {
    if (pct >= 100) return 'bg-green-500';
    if (pct >= 95) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getCardStatusColor = (isGood: boolean, isWarn: boolean) => {
    if (isGood) return 'border-green-500 bg-green-50/30';
    if (isWarn) return 'border-yellow-500 bg-yellow-50/30';
    return 'border-red-500 bg-red-50/30';
  };

  // --- Data Logic ---
  const getDocuments = (): Cte[] => {
    let docs: Cte[] = [];
    switch (activeTab) {
      case 'vendas':
        docs = [...stats.docsVendas];
        break;
      case 'baixas':
        if (baixaFilter === 'all') {
             const sb = [...stats.docsSemBaixa];
             const fb = [...stats.docsBaixaForaPrazo]; 
             const nb = [...stats.docsBaixaNoPrazo];
             docs = [...sb, ...fb, ...nb];
        } else if (baixaFilter === 'noPrazo') docs = [...stats.docsBaixaNoPrazo];
        else if (baixaFilter === 'foraPrazo') docs = [...stats.docsBaixaForaPrazo];
        else if (baixaFilter === 'semBaixa') docs = [...stats.docsSemBaixa];
        break;
      case 'manifestos':
        docs = [...stats.docsSemMdfe, ...stats.docsVendas.filter(d => !stats.docsSemMdfe.includes(d))];
        break;
    }

    // Sort
    return docs.sort((a, b) => {
      let aVal: any = a[sortConfig.key];
      let bVal: any = b[sortConfig.key];
      
      if (sortConfig.key === 'id') {
         aVal = parseInt(a.id) || a.id;
         bVal = parseInt(b.id) || b.id;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const currentDocs = getDocuments();
  
  const totalBaixas = stats.baixaNoPrazo + stats.baixaForaPrazo + stats.semBaixa;
  const pctNoPrazo = totalBaixas ? (stats.baixaNoPrazo / totalBaixas) * 100 : 0;
  const pctSemBaixa = totalBaixas ? (stats.semBaixa / totalBaixas) * 100 : 0;
  const pctForaPrazo = totalBaixas ? (stats.baixaForaPrazo / totalBaixas) * 100 : 0;

  const totalManifestos = stats.comMdfe + stats.semMdfe;
  const pctComMdfe = totalManifestos ? (stats.comMdfe / totalManifestos) * 100 : 0;
  const pctSemMdfe = totalManifestos ? (stats.semMdfe / totalManifestos) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div className="flex items-center space-x-3">
           <button 
             onClick={onBack}
             className="flex items-center px-4 py-2 bg-[#2E31B4] text-white rounded hover:bg-[#24268B] transition-colors shadow-sm"
             title="Voltar para Visão Geral"
           >
             <ArrowLeft className="w-5 h-5 mr-2" />
             <span className="font-semibold">Voltar</span>
           </button>
           <h2 className="text-2xl font-bold text-[#0F103A] truncate max-w-xl">Painel: {stats.unidade}</h2>
        </div>
        <button 
          onClick={() => downloadXLS(currentDocs, `Relatorio_${stats.unidade}_${activeTab}`)}
          className="flex items-center px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded transition-colors shadow-sm"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar Excel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Vendas - FIXED LAYOUT: Removed h-full justify-between to prevent bar overflow */}
        <Card 
          title="VENDAS" 
          icon={<DollarSign className="w-6 h-6" />}
          className={`border-l-4 ${stats.percentualProjecao >= 100 ? 'border-green-500' : stats.percentualProjecao >= 95 ? 'border-yellow-500' : 'border-red-500'}`}
          onClick={() => setActiveTab('vendas')}
        >
          <div className="flex flex-col gap-6">
             <div className="overflow-hidden">
               <span className="text-2xl lg:text-3xl font-bold text-gray-800 tracking-tight block truncate" title={stats.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}>
                 {stats.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
               </span>
               <div className="text-xs text-gray-500 mt-1">Meta: {stats.meta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
             </div>
             
             <div className="space-y-2">
               <div className="flex justify-between items-center">
                  <span className={`text-sm font-bold ${getProjColor(stats.percentualProjecao)}`}>
                    {stats.percentualProjecao.toFixed(1)}%
                  </span>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-gray-400 block">Projeção</span>
                    <span className="text-xs font-semibold text-gray-600">{stats.projecao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
               </div>
               
               <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`absolute top-0 left-0 h-full ${getProjBarOpacityColor(stats.percentualProjecao)}`} 
                    style={{ width: `${Math.min(stats.percentualProjecao, 100)}%`, opacity: 0.4 }}
                  ></div>
                  <div 
                    className={`absolute top-0 left-0 h-full ${getProjBarColor(stats.percentualProjecao)}`} 
                    style={{ width: `${Math.min((stats.faturamento / stats.meta) * 100, 100)}%` }}
                  ></div>
               </div>
             </div>
          </div>
        </Card>

        {/* Baixas */}
        <Card title="BAIXAS" icon={<Truck className="w-6 h-6" />} className="border-l-gray-300">
          <div className="grid grid-cols-3 gap-3 items-center py-2">
            <button 
              onClick={(e) => { e.stopPropagation(); setActiveTab('baixas'); setBaixaFilter('noPrazo'); }}
              className={`flex flex-col items-center p-2 rounded transition border ${getCardStatusColor(true, false)}`}
            >
              <CheckCircle className="w-5 h-5 text-green-600 mb-1" />
              <span className="text-xl font-bold text-green-700">{stats.baixaNoPrazo}</span>
              <span className="text-[10px] font-bold text-green-800">{pctNoPrazo.toFixed(0)}%</span>
            </button>

            <button 
               onClick={(e) => { e.stopPropagation(); setActiveTab('baixas'); setBaixaFilter('semBaixa'); }}
               className={`flex flex-col items-center p-2 rounded transition border ${getCardStatusColor(false, true)}`}
            >
              <AlertTriangle className="w-5 h-5 text-yellow-600 mb-1" />
              <span className="text-xl font-bold text-yellow-700">{stats.semBaixa}</span>
              <span className="text-[10px] font-bold text-yellow-800">{pctSemBaixa.toFixed(0)}%</span>
            </button>

            <button 
               onClick={(e) => { e.stopPropagation(); setActiveTab('baixas'); setBaixaFilter('foraPrazo'); }}
               className={`flex flex-col items-center p-2 rounded transition border ${getCardStatusColor(false, false)}`}
            >
              <XCircle className="w-5 h-5 text-red-600 mb-1" />
              <span className="text-xl font-bold text-red-700">{stats.baixaForaPrazo}</span>
              <span className="text-[10px] font-bold text-red-800">{pctForaPrazo.toFixed(0)}%</span>
            </button>
          </div>
        </Card>

        {/* Manifestos - FIXED LAYOUT: Removed h-full and justify-center */}
        <Card 
          title="MANIFESTOS" 
          icon={<FileText className="w-6 h-6" />} 
          className="border-l-blue-500"
          onClick={() => setActiveTab('manifestos')}
        >
           <div className="flex flex-col gap-4 py-2">
             <div className="flex justify-between items-center p-3 rounded bg-green-50/50 border border-green-200">
                <span className="text-xs font-medium text-green-800 whitespace-nowrap mr-1">Com MDFE</span>
                <div className="text-right">
                  <span className="block font-bold text-lg text-green-600">{stats.comMdfe}</span>
                  <span className="text-[10px] text-green-600">{pctComMdfe.toFixed(0)}%</span>
                </div>
             </div>
             <div className="flex justify-between items-center p-3 rounded bg-red-50/50 border border-red-200">
                <span className="text-xs font-medium text-red-800 whitespace-nowrap mr-1">SEM MDFE</span>
                <div className="text-right">
                   <span className="block font-bold text-xl text-red-600">{stats.semMdfe}</span>
                   <span className="text-[10px] text-red-600">{pctSemMdfe.toFixed(0)}%</span>
                </div>
             </div>
           </div>
        </Card>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-100">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <h3 className="font-bold text-[#0F103A] uppercase tracking-wide text-sm">
            {activeTab === 'vendas' ? 'Vendas do Mês' : activeTab === 'baixas' ? 'Status de Entrega' : 'Controle de MDFE'}
          </h3>
          {activeTab === 'baixas' && (
             <div className="flex space-x-1 text-xs">
                <button onClick={() => setBaixaFilter('all')} className={`px-3 py-1 rounded-full transition ${baixaFilter === 'all' ? 'bg-[#2E31B4] text-white shadow' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>Todos</button>
                <button onClick={() => setBaixaFilter('semBaixa')} className={`px-3 py-1 rounded-full transition ${baixaFilter === 'semBaixa' ? 'bg-yellow-500 text-white shadow' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>Pendentes</button>
             </div>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#E8E8F9] text-[#24268B]">
              <tr>
                <th onClick={() => handleSort('data')} className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-blue-100 transition">
                  <div className="flex items-center">Data <ArrowUpDown className="w-3 h-3 ml-1 opacity-50"/></div>
                </th>
                <th onClick={() => handleSort('id')} className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-blue-100 transition">
                  <div className="flex items-center">CTE <ArrowUpDown className="w-3 h-3 ml-1 opacity-50"/></div>
                </th>
                <th onClick={() => handleSort('valor')} className="px-4 py-3 text-right font-semibold cursor-pointer hover:bg-blue-100 transition">
                  <div className="flex items-center justify-end">Valor <ArrowUpDown className="w-3 h-3 ml-1 opacity-50"/></div>
                </th>
                <th onClick={() => handleSort('statusPrazo')} className="px-4 py-3 text-center font-semibold cursor-pointer hover:bg-blue-100 transition">
                  <div className="flex items-center justify-center">Status Prazo <ArrowUpDown className="w-3 h-3 ml-1 opacity-50"/></div>
                </th>
                <th onClick={() => handleSort('statusMdfe')} className="px-4 py-3 text-center font-semibold cursor-pointer hover:bg-blue-100 transition">
                  <div className="flex items-center justify-center">MDFE <ArrowUpDown className="w-3 h-3 ml-1 opacity-50"/></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentDocs.length > 0 ? (
                currentDocs.map((doc, idx) => (
                  <tr key={idx} className="hover:bg-blue-50 transition-colors group">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{doc.data.toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 font-medium text-[#2E31B4]">{doc.id}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-700">{doc.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border
                        ${doc.statusPrazo?.toUpperCase() === 'NO PRAZO' ? 'bg-green-50 text-green-700 border-green-200' : 
                          doc.statusPrazo?.toUpperCase() === 'FORA DO PRAZO' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }`}>
                        {doc.statusPrazo || 'PENDENTE'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold border uppercase
                         ${(doc.statusMdfe?.toUpperCase().includes('ENCERRADO') || doc.statusMdfe?.toUpperCase().includes('AUTORIZADO') || doc.statusMdfe?.toUpperCase().includes('COM MDFE')) 
                           ? 'bg-green-50 text-green-600 border-green-200' 
                           : 'bg-red-50 text-red-600 border-red-200'}
                      `}>
                        {doc.statusMdfe || 'SEM MDFE'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400 italic">
                    Nenhum documento encontrado neste filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UnitDashboard;