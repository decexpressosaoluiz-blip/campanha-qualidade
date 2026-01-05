
import React, { useState, useEffect } from 'react';
import { UnitStats, Cte, User } from '../types';
import Card from './Card';
import { DollarSign, Truck, FileText, CheckCircle, AlertTriangle, XCircle, Download, ArrowUpDown, ExternalLink, Clock } from 'lucide-react';
import { downloadXLS } from '../services/excelService';
import { LINKS } from '../constants';

interface UnitDashboardProps {
  stats: UnitStats;
  onBack: () => void;
  user: User | null;
  setHeaderActions: (actions: React.ReactNode) => void;
  lastUpdate: Date;
}

type TabType = 'vendas' | 'baixas' | 'manifestos';
type SortKey = 'data' | 'id' | 'valor' | 'statusPrazo' | 'statusMdfe';
type SortDirection = 'asc' | 'desc';

const UnitDashboard: React.FC<UnitDashboardProps> = ({ stats, user, setHeaderActions, lastUpdate }) => {
  const [activeTab, setActiveTab] = useState<TabType>('vendas');
  const [baixaFilter, setBaixaFilter] = useState<'all' | 'noPrazo' | 'foraPrazo' | 'semBaixa'>('all');
  const [mdfeFilter, setMdfeFilter] = useState<'all' | 'comMdfe' | 'semMdfe'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'data', direction: 'desc' });

  const getDocuments = (): Cte[] => {
    let docs: Cte[] = [];
    switch (activeTab) {
      case 'vendas': docs = [...stats.docsVendas]; break;
      case 'baixas':
        if (baixaFilter === 'all') {
             docs = [...stats.docsSemBaixa, ...stats.docsBaixaForaPrazo, ...stats.docsBaixaNoPrazo];
        } else if (baixaFilter === 'noPrazo') docs = [...stats.docsBaixaNoPrazo];
        else if (baixaFilter === 'foraPrazo') docs = [...stats.docsBaixaForaPrazo];
        else if (baixaFilter === 'semBaixa') docs = [...stats.docsSemBaixa];
        break;
      case 'manifestos':
        if (mdfeFilter === 'all') docs = [...stats.docsVendas]; 
        else if (mdfeFilter === 'comMdfe') docs = stats.docsVendas.filter(d => !stats.docsSemMdfe.some(s => s.id === d.id));
        else if (mdfeFilter === 'semMdfe') docs = [...stats.docsSemMdfe];
        break;
    }
    return docs.sort((a, b) => {
      let aVal: any = a[sortConfig.key];
      let bVal: any = b[sortConfig.key];
      if (sortConfig.key === 'id') { aVal = parseInt(a.id) || a.id; bVal = parseInt(b.id) || b.id; }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const currentDocs = getDocuments();

  useEffect(() => {
    setHeaderActions(null);
  }, [setHeaderActions]);

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
    if (pct >= 100) return 'bg-green-50';
    if (pct >= 95) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const getCardStatusColor = (isGood: boolean, isWarn: boolean) => {
    if (isGood) return 'border-green-500 bg-green-50/30';
    if (isWarn) return 'border-yellow-500 bg-yellow-50/30';
    return 'border-red-500 bg-red-50/30';
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  const totalBaixas = stats.baixaNoPrazo + stats.baixaForaPrazo + stats.semBaixa;
  const pctNoPrazo = totalBaixas ? (stats.baixaNoPrazo / totalBaixas) * 100 : 0;
  const pctSemBaixa = totalBaixas ? (stats.semBaixa / totalBaixas) * 100 : 0;
  const pctForaPrazo = totalBaixas ? (stats.baixaForaPrazo / totalBaixas) * 100 : 0;

  const totalManifestos = stats.comMdfe + stats.semMdfe;
  const pctComMdfe = totalManifestos ? (stats.comMdfe / totalManifestos) * 100 : 0;
  const pctSemMdfe = totalManifestos ? (stats.semMdfe / totalManifestos) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4">
        <div className="flex justify-end items-center space-x-3">
          <button 
            onClick={() => downloadXLS(currentDocs, `Relatorio_${stats.unidade}_${activeTab}`)}
            className="flex items-center px-5 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded font-bold text-xs transition-all shadow-md active:scale-95"
          >
            <Download className="w-3.5 h-3.5 mr-2" />
            EXPORTAR EXCEL
          </button>
          <a 
            href={LINKS.PENDENCIAS}
            target="_blank"
            rel="noreferrer"
            className="flex items-center px-5 py-2 bg-[#EC1B23] hover:bg-[#C41017] text-white rounded font-bold text-xs transition-all shadow-md active:scale-95 uppercase"
          >
            <ExternalLink className="w-3.5 h-3.5 mr-2" />
            CONSULTAR PENDÊNCIAS
          </a>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between border-b border-gray-200 pb-2">
          <h2 className="text-2xl font-medium text-[#0F103A] tracking-tight">
            Painel: {stats.unidade}
          </h2>
          <div className="flex items-center text-[#2E31B4] text-xs font-semibold mt-2 sm:mt-0">
            <Clock className="w-4 h-4 mr-2" />
            <span>Atualizado: {lastUpdate.toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          title="VENDAS" 
          icon={<DollarSign className="w-5 h-5" />}
          className={`border-l-4 ${stats.percentualProjecao >= 100 ? 'border-green-500' : stats.percentualProjecao >= 95 ? 'border-yellow-500' : 'border-red-500'}`}
          onClick={() => setActiveTab('vendas')}
        >
          <div className="flex flex-col gap-2">
             <div className="overflow-hidden">
               <span className="text-2xl font-black text-[#0F103A] block truncate leading-tight">
                 {stats.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
               </span>
               <div className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase">Meta: {stats.meta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
             </div>
             
             <div className="space-y-1 bg-gray-50/50 p-2 rounded border border-gray-100">
               <div className="flex justify-between items-center">
                  <span className={`text-base font-black ${getProjColor(stats.percentualProjecao)}`}>
                    {stats.percentualProjecao.toFixed(1)}%
                  </span>
                  <div className="text-right">
                    <span className="text-[9px] uppercase text-gray-400 block font-bold">Projeção</span>
                    <span className="text-xs font-bold text-gray-600">{stats.projecao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
               </div>
               
               <div className="relative w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
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

             <div className="mt-1 pt-2 border-t border-dashed border-gray-200">
                <div className="bg-orange-50 border border-orange-100 rounded p-2 flex justify-between items-center">
                  <span className="text-[9px] font-black text-orange-800 uppercase leading-none">Total Recebido</span>
                  <span className="text-xs font-black text-orange-700">
                    {stats.recebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
             </div>
          </div>
        </Card>

        <Card title="BAIXAS" icon={<Truck className="w-5 h-5" />} className="border-l-gray-300">
          <div className="flex justify-between gap-2 py-1 h-[140px]">
            <button 
              onClick={(e) => { e.stopPropagation(); setActiveTab('baixas'); setBaixaFilter('noPrazo'); }}
              className={`flex-1 flex flex-col items-center justify-center p-2 rounded transition border hover:bg-green-100 active:scale-95 shadow-sm ${getCardStatusColor(true, false)}`}
            >
              <CheckCircle className="w-5 h-5 text-green-600 mb-2" />
              <span className="text-2xl font-black text-green-700 leading-none">{stats.baixaNoPrazo}</span>
              <span className="text-[9px] font-black text-green-800 uppercase mt-2">NO PRAZO</span>
              <span className="text-[10px] text-green-600 font-bold">{pctNoPrazo.toFixed(0)}%</span>
            </button>

            <button 
               onClick={(e) => { e.stopPropagation(); setActiveTab('baixas'); setBaixaFilter('semBaixa'); }}
               className={`flex-1 flex flex-col items-center justify-center p-2 rounded transition border hover:bg-yellow-100 active:scale-95 shadow-sm ${getCardStatusColor(false, true)}`}
            >
              <AlertTriangle className="w-5 h-5 text-yellow-600 mb-2" />
              <span className="text-2xl font-black text-yellow-700 leading-none">{stats.semBaixa}</span>
              <span className="text-[9px] font-black text-yellow-800 uppercase mt-2">SEM BAIXA</span>
              <span className="text-[10px] text-yellow-600 font-bold">{pctSemBaixa.toFixed(0)}%</span>
            </button>

            <button 
               onClick={(e) => { e.stopPropagation(); setActiveTab('baixas'); setBaixaFilter('foraPrazo'); }}
               className={`flex-1 flex flex-col items-center justify-center p-2 rounded transition border hover:bg-red-100 active:scale-95 shadow-sm ${getCardStatusColor(false, false)}`}
            >
              <XCircle className="w-5 h-5 text-red-600 mb-2" />
              <span className="text-2xl font-black text-red-700 leading-none">{stats.baixaForaPrazo}</span>
              <span className="text-[9px] font-black text-red-800 uppercase mt-2 leading-tight text-center">FORA PRAZO</span>
              <span className="text-[10px] text-red-600 font-bold">{pctForaPrazo.toFixed(0)}%</span>
            </button>
          </div>
        </Card>

        <Card title="MANIFESTOS" icon={<FileText className="w-5 h-5" />} className="border-l-blue-500">
           <div className="flex flex-col gap-3 py-1 h-[140px] justify-center">
             <button 
                onClick={(e) => { e.stopPropagation(); setActiveTab('manifestos'); setMdfeFilter('comMdfe'); }}
                className="flex justify-between items-center p-4 rounded bg-green-50/50 border border-green-200 hover:bg-green-100 hover:border-green-300 transition-all text-left w-full group shadow-sm"
             >
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-green-800 uppercase tracking-wider">Com MDFE</span>
                  <span className="text-[10px] text-green-600 font-bold">{pctComMdfe.toFixed(0)}% cobertura</span>
                </div>
                <span className="font-black text-2xl text-green-600">{stats.comMdfe}</span>
             </button>
             
             <button 
                onClick={(e) => { e.stopPropagation(); setActiveTab('manifestos'); setMdfeFilter('semMdfe'); }}
                className="flex justify-between items-center p-4 rounded bg-red-50/50 border border-red-200 hover:bg-red-100 hover:border-red-300 transition-all text-left w-full group shadow-sm"
             >
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-red-800 uppercase tracking-wider">SEM MDFE</span>
                  <span className="text-[10px] text-red-600 font-bold">{pctSemMdfe.toFixed(0)}% pendente</span>
                </div>
                <span className="font-black text-2xl text-red-600">{stats.semMdfe}</span>
             </button>
           </div>
        </Card>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-100 mt-8">
        <div className="p-4 bg-gray-50 border-b flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-[#0F103A] uppercase tracking-wide text-[10px]">
            LISTAGEM: {activeTab === 'vendas' ? 'Vendas do Mês' : activeTab === 'baixas' ? 'Status de Entrega' : 'Controle de MDFE'}
          </h3>
          
          <div className="flex space-x-1 text-[10px]">
            {activeTab === 'baixas' ? (
              <>
                <button onClick={() => setBaixaFilter('all')} className={`px-3 py-1 rounded-full transition font-bold ${baixaFilter === 'all' ? 'bg-[#2E31B4] text-white shadow' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>TODOS</button>
                <button onClick={() => setBaixaFilter('noPrazo')} className={`px-3 py-1 rounded-full transition font-bold ${baixaFilter === 'noPrazo' ? 'bg-green-600 text-white shadow' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>NO PRAZO</button>
                <button onClick={() => setBaixaFilter('foraPrazo')} className={`px-3 py-1 rounded-full transition font-bold ${baixaFilter === 'foraPrazo' ? 'bg-red-600 text-white shadow' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>ATRASADOS</button>
                <button onClick={() => setBaixaFilter('semBaixa')} className={`px-3 py-1 rounded-full transition font-bold ${baixaFilter === 'semBaixa' ? 'bg-yellow-500 text-white shadow' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>PENDENTES</button>
              </>
            ) : activeTab === 'manifestos' ? (
              <>
                <button onClick={() => setMdfeFilter('all')} className={`px-3 py-1 rounded-full transition font-bold ${mdfeFilter === 'all' ? 'bg-[#2E31B4] text-white shadow' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>TODOS</button>
                <button onClick={() => setMdfeFilter('comMdfe')} className={`px-3 py-1 rounded-full transition font-bold ${mdfeFilter === 'comMdfe' ? 'bg-green-600 text-white shadow' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>COM MDFE</button>
                <button onClick={() => setMdfeFilter('semMdfe')} className={`px-3 py-1 rounded-full transition font-bold ${mdfeFilter === 'semMdfe' ? 'bg-red-600 text-white shadow' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>SEM MDFE</button>
              </>
            ) : null}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-[#E8E8F9] text-[#24268B]">
              <tr>
                <th onClick={() => handleSort('data')} className="px-4 py-3 text-left font-bold cursor-pointer hover:bg-blue-100 transition">
                  <div className="flex items-center">DATA <ArrowUpDown className="w-3 h-3 ml-1 opacity-50"/></div>
                </th>
                <th onClick={() => handleSort('id')} className="px-4 py-3 text-left font-bold cursor-pointer hover:bg-blue-100 transition">
                  <div className="flex items-center">CTE <ArrowUpDown className="w-3 h-3 ml-1 opacity-50"/></div>
                </th>
                <th onClick={() => handleSort('valor')} className="px-4 py-3 text-right font-bold cursor-pointer hover:bg-blue-100 transition">
                  <div className="flex items-center justify-end">VALOR <ArrowUpDown className="w-3 h-3 ml-1 opacity-50"/></div>
                </th>
                <th onClick={() => handleSort('statusPrazo')} className="px-4 py-3 text-center font-bold cursor-pointer hover:bg-blue-100 transition">
                  <div className="flex items-center justify-center">STATUS PRAZO <ArrowUpDown className="w-3 h-3 ml-1 opacity-50"/></div>
                </th>
                <th onClick={() => handleSort('statusMdfe')} className="px-4 py-3 text-center font-bold cursor-pointer hover:bg-blue-100 transition">
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
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border
                        ${doc.statusPrazo?.toUpperCase() === 'NO PRAZO' ? 'bg-green-50 text-green-700 border-green-200' : 
                          doc.statusPrazo?.toUpperCase() === 'FORA DO PRAZO' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }`}>
                        {doc.statusPrazo || 'PENDENTE'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase
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
