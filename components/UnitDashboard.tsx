
import React, { useState, useEffect, useMemo } from 'react';
import { UnitStats, Cte, User } from '../types';
import Card from './Card';
import { DollarSign, Truck, FileText, CheckCircle, AlertTriangle, XCircle, Download, ArrowUpDown, ExternalLink, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import { downloadXLS } from '../services/excelService';
import { LINKS } from '../constants';
import { normalizeStatus } from '../services/calculationService';

interface UnitDashboardProps {
  stats: UnitStats;
  onBack: () => void;
  user: User | null;
  setHeaderActions: (actions: React.ReactNode) => void;
  lastUpdate: Date;
  allCtes: Cte[];
}

type TabType = 'vendas' | 'baixas' | 'manifestos';
type SortKey = 'data' | 'id' | 'valor' | 'statusPrazo' | 'statusMdfe';
type SortDirection = 'asc' | 'desc';

const UnitDashboard: React.FC<UnitDashboardProps> = ({ stats, user, setHeaderActions, lastUpdate, allCtes }) => {
  const [activeTab, setActiveTab] = useState<TabType>('vendas');
  const [baixaFilter, setBaixaFilter] = useState<'all' | 'noPrazo' | 'foraPrazo' | 'semBaixa'>('all');
  const [mdfeFilter, setMdfeFilter] = useState<'all' | 'comMdfe' | 'semMdfe'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'data', direction: 'desc' });

  const defaultDeliveryEnd = lastUpdate.toISOString().split('T')[0];
  const [deliveryFilter, setDeliveryFilter] = useState({ start: '', end: defaultDeliveryEnd });

  const getDocuments = (): Cte[] => {
    let docs: Cte[] = [];
    switch (activeTab) {
      case 'vendas': docs = [...stats.docsVendas]; break;
      case 'baixas':
        if (baixaFilter === 'all') docs = [...stats.docsSemBaixa, ...stats.docsBaixaForaPrazo, ...stats.docsBaixaNoPrazo];
        else if (baixaFilter === 'noPrazo') docs = [...stats.docsBaixaNoPrazo];
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
      let aVal: any = a[sortConfig.key], bVal: any = b[sortConfig.key];
      if (sortConfig.key === 'id') { 
        aVal = parseInt(a.id) || 0; 
        bVal = parseInt(b.id) || 0; 
      }
      if (aVal === bVal) return 0;
      const res = aVal < bVal ? -1 : 1;
      return sortConfig.direction === 'asc' ? res : -res;
    });
  };

  const currentDocs = getDocuments();

  const unitDeliveryStats = useMemo(() => {
    let countNoPrazo = 0, countForaPrazo = 0, countSemBaixa = 0;
    const start = deliveryFilter.start ? new Date(deliveryFilter.start + 'T00:00:00') : null;
    const end = deliveryFilter.end ? new Date(deliveryFilter.end + 'T23:59:59') : null;

    allCtes.forEach(cte => {
      if (!cte.prazoBaixa || cte.unidadeEntrega !== stats.unidade) return;
      if (start && cte.prazoBaixa < start) return;
      if (end && cte.prazoBaixa > end) return;
      const status = normalizeStatus(cte.statusPrazo);
      if (status === 'NO PRAZO') countNoPrazo++;
      else if (status === 'FORA DO PRAZO') countForaPrazo++;
      else countSemBaixa++;
    });

    const total = countNoPrazo + countForaPrazo + countSemBaixa;
    return { 
      total, 
      noPrazo: countNoPrazo, 
      foraPrazo: countForaPrazo, 
      semBaixa: countSemBaixa, 
      pctNoPrazo: total > 0 ? (countNoPrazo / total) * 100 : 0,
      pctSemBaixa: total > 0 ? (countSemBaixa / total) * 100 : 0,
      pctForaPrazo: total > 0 ? (countForaPrazo / total) * 100 : 0
    };
  }, [allCtes, deliveryFilter, stats.unidade]);

  const handleSort = (key: SortKey) => setSortConfig(p => ({ key, direction: p.key === key && p.direction === 'asc' ? 'desc' : 'asc' }));

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-20 group-hover:opacity-50 transition-opacity" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-sle-primary" /> : <ArrowDown className="w-3 h-3 ml-1 text-sle-primary" />;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10 px-1 sm:px-0">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-end items-center gap-2">
          <button onClick={() => downloadXLS(currentDocs, `Relatorio_${stats.unidade}`)} className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 bg-[#059669] text-white rounded font-semibold text-xs uppercase shadow-sm hover:bg-[#047857] active:scale-95 transition-all">
            <Download className="w-4 h-4 mr-2" /> Exportar XLS
          </button>
          <a href={LINKS.PENDENCIAS} target="_blank" rel="noreferrer" className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 bg-[#EC1B23] text-white rounded font-semibold text-xs uppercase shadow-sm hover:bg-[#C41017] active:scale-95 transition-all">
            <ExternalLink className="w-4 h-4 mr-2" /> Consultar Pendências
          </a>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-3">
          <h2 className="text-xl sm:text-2xl font-semibold text-[#0F103A] truncate tracking-tight">Painel: {stats.unidade}</h2>
          <div className="flex items-center text-[#2E31B4] text-[10px] sm:text-xs font-medium uppercase mt-2 sm:mt-0 bg-blue-50 px-3 py-1 rounded-full">
            <Clock className="w-3.5 h-3.5 mr-1.5" /> <span>Atualizado: {lastUpdate.toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* VENDAS CARD */}
        <Card title="VENDAS" icon={<DollarSign className="w-5 h-5 text-sle-primary opacity-60" />} className="border-l-sle-primary shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-4">
             <div>
               <span className="text-3xl font-bold text-[#0F103A] tracking-tight">{stats.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
               <div className="text-[10px] font-semibold text-gray-400 mt-1 uppercase tracking-wider">Meta: {stats.meta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</div>
             </div>
             
             <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                <div className="flex justify-between items-end mb-2">
                   <div className="flex flex-col">
                      <span className="text-[10px] uppercase text-gray-400 font-semibold tracking-wide">Projeção</span>
                      <span className="font-bold text-sle-primary text-lg">{stats.projecao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
                   </div>
                   <span className={`text-lg font-bold ${stats.percentualProjecao >= 100 ? 'text-green-600' : 'text-red-600'}`}>{stats.percentualProjecao.toFixed(1)}%</span>
                </div>
                <div className="relative w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`absolute top-0 left-0 h-full transition-all duration-500 ${stats.percentualProjecao >= 100 ? 'bg-green-600' : 'bg-red-600'}`} style={{ width: `${Math.min((stats.faturamento / stats.meta) * 100, 100)}%` }}></div>
                </div>
             </div>

             <div className="space-y-2">
                <div className="bg-blue-50/40 border border-blue-100/50 rounded-lg p-2.5 flex justify-between items-center">
                    <span className="text-[10px] font-semibold text-blue-800 uppercase tracking-tight">Vendas dia {lastUpdate.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}</span>
                    <span className="text-sm font-bold text-[#2E31B4]">{stats.vendasDiaAnterior.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
                </div>
                <div className="bg-orange-50/40 border border-orange-100/50 rounded-lg p-2.5 flex justify-between items-center">
                    <span className="text-[10px] font-semibold text-orange-800 uppercase tracking-tight">Total Recebido</span>
                    <span className="text-sm font-bold text-orange-700">{stats.recebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
                </div>
             </div>
          </div>
        </Card>

        {/* BAIXAS CARD */}
        <Card title="BAIXAS" icon={<Truck className="w-5 h-5 text-warning opacity-60" />} className="border-l-warning shadow-sm hover:shadow-md transition-shadow">
           <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-tight">Filtro Prazo:</span>
                  <div className="flex items-center gap-1">
                     <input type="date" value={deliveryFilter.start} onChange={(e) => setDeliveryFilter(p => ({...p, start: e.target.value}))} className="bg-white border border-gray-200 rounded text-[10px] px-1.5 py-1 focus:ring-1 focus:ring-sle-primary outline-none" />
                     <input type="date" value={deliveryFilter.end} onChange={(e) => setDeliveryFilter(p => ({...p, end: e.target.value}))} className="bg-white border border-gray-200 rounded text-[10px] px-1.5 py-1 focus:ring-1 focus:ring-sle-primary outline-none" />
                  </div>
              </div>
              <div className="flex gap-2 h-[100px]">
                <div className="flex-1 flex flex-col items-center justify-center border border-green-100 bg-green-50/30 rounded-lg transition-transform hover:scale-[1.02]">
                  <span className="text-xl font-bold text-green-700">{unitDeliveryStats.noPrazo}</span>
                  <span className="text-[9px] font-semibold text-green-600 uppercase mt-1">{unitDeliveryStats.pctNoPrazo.toFixed(0)}% OK</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center border border-yellow-200 bg-yellow-50/50 rounded-lg shadow-sm transition-transform hover:scale-[1.05] z-10">
                  <span className="text-2xl font-bold text-yellow-700">{unitDeliveryStats.semBaixa}</span>
                  <span className="text-[10px] font-bold text-yellow-600 uppercase mt-1 tracking-wide">{unitDeliveryStats.pctSemBaixa.toFixed(0)}% PEND</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center border border-red-100 bg-red-50/30 rounded-lg transition-transform hover:scale-[1.02]">
                  <span className="text-xl font-bold text-red-700">{unitDeliveryStats.foraPrazo}</span>
                  <span className="text-[9px] font-semibold text-red-600 uppercase mt-1">{unitDeliveryStats.pctForaPrazo.toFixed(0)}% ATR</span>
                </div>
              </div>
           </div>
        </Card>

        {/* MANIFESTOS CARD */}
        <Card title="MANIFESTOS" icon={<FileText className="w-5 h-5 text-danger opacity-60" />} className="border-l-danger shadow-sm hover:shadow-md transition-shadow">
           <div className="flex flex-col gap-3 py-1 justify-center min-h-[140px]">
             <div className="flex justify-between items-center p-4 rounded-lg bg-green-50/40 border border-green-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-green-800 uppercase tracking-tight">Com MDFE</span>
                  <span className="text-[9px] font-medium text-green-600 mt-0.5">{((stats.comMdfe / Math.max(1, stats.comMdfe + stats.semMdfe)) * 100).toFixed(0)}% Cobertura</span>
                </div>
                <span className="font-bold text-2xl text-green-600 leading-none">{stats.comMdfe}</span>
             </div>
             <div className="flex justify-between items-center p-4 rounded-lg bg-red-50/40 border border-red-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-red-800 uppercase tracking-tight">Sem MDFE</span>
                  <span className="text-[9px] font-medium text-red-600 mt-0.5">{((stats.semMdfe / Math.max(1, stats.comMdfe + stats.semMdfe)) * 100).toFixed(0)}% Pendente</span>
                </div>
                <span className="font-bold text-2xl text-red-600 leading-none">{stats.semMdfe}</span>
             </div>
           </div>
        </Card>
      </div>

      {/* List Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 mt-4">
        <div className="px-4 py-4 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
          <h3 className="font-semibold text-[#0F103A] uppercase text-[10px] sm:text-xs tracking-wider">Listagem de Documentos</h3>
          <div className="flex p-1 bg-gray-200/50 rounded-lg gap-1">
            {['Vendas', 'Baixas', 'Manifestos'].map((t) => (
              <button key={t} onClick={() => setActiveTab(t.toLowerCase() as TabType)} className={`px-4 py-1.5 rounded-md text-[9px] sm:text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${activeTab === t.toLowerCase() ? 'bg-sle-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`}>{t}</button>
            ))}
          </div>
        </div>
        <div className="w-full overflow-x-auto sm:overflow-x-visible">
          <table className="w-full text-[10px] sm:text-sm text-left table-fixed">
            <thead className="bg-[#F8F9FE] text-[#24268B]">
              <tr>
                <th className="w-[18%] px-3 py-4 font-semibold uppercase truncate cursor-pointer hover:bg-blue-100 transition-colors group" onClick={() => handleSort('data')}>
                  <div className="flex items-center justify-start">DATA <SortIcon column="data" /></div>
                </th>
                <th className="w-[18%] px-3 py-4 font-semibold uppercase truncate cursor-pointer hover:bg-blue-100 transition-colors group" onClick={() => handleSort('id')}>
                  <div className="flex items-center justify-start">CTE <SortIcon column="id" /></div>
                </th>
                <th className="w-[30%] px-3 py-4 text-right font-semibold uppercase truncate cursor-pointer hover:bg-blue-100 transition-colors group" onClick={() => handleSort('valor')}>
                  <div className="flex items-center justify-end">VALOR <SortIcon column="valor" /></div>
                </th>
                <th className="w-[17%] px-3 py-4 text-center font-semibold uppercase truncate cursor-pointer hover:bg-blue-100 transition-colors group" onClick={() => handleSort('statusPrazo')}>
                  <div className="flex items-center justify-center">ENTR <SortIcon column="statusPrazo" /></div>
                </th>
                <th className="w-[17%] px-3 py-4 text-center font-semibold uppercase truncate cursor-pointer hover:bg-blue-100 transition-colors group" onClick={() => handleSort('statusMdfe')}>
                  <div className="flex items-center justify-center">MDFE <SortIcon column="statusMdfe" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentDocs.map((doc, idx) => (
                <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-3 py-4 text-gray-500 truncate font-medium">{doc.data.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}</td>
                  <td className="px-3 py-4 text-sle-primary truncate font-semibold group-hover:text-blue-700">{doc.id}</td>
                  <td className="px-3 py-4 text-right text-gray-700 truncate font-semibold">{doc.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</td>
                  <td className="px-3 py-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-semibold border ${doc.statusPrazo?.includes('NO PRAZO') ? 'text-green-600 bg-green-50/50 border-green-100' : doc.statusPrazo?.includes('FORA') ? 'text-red-600 bg-red-50/50 border-red-100' : 'text-yellow-600 bg-yellow-50/50 border-yellow-100'}`}>
                      {doc.statusPrazo?.includes('NO PRAZO') ? 'OK' : doc.statusPrazo?.includes('FORA') ? 'ATR' : 'PEN'}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-semibold border ${doc.statusMdfe?.match(/COM MDFE|ENCERRADO|AUTORIZADO/i) ? 'text-green-600 bg-green-50/50 border-green-100' : 'text-red-600 bg-red-50/50 border-red-100'}`}>
                      {doc.statusMdfe?.match(/COM MDFE|ENCERRADO|AUTORIZADO/i) ? 'SIM' : 'NÃO'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UnitDashboard;
