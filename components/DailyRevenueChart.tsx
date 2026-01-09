
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign } from 'lucide-react';
import { Cte } from '../types';
import { normalizeUnitName } from '../services/calculationService';

interface DailyRevenueChartProps {
  ctes: Cte[];
  unitName?: string;
}

const DailyRevenueChart: React.FC<DailyRevenueChartProps> = ({ ctes, unitName }) => {
  const chartData = useMemo(() => {
    const dailyMap = new Map<string, number>();
    const targetUnit = unitName ? normalizeUnitName(unitName) : null;
    
    ctes.forEach(cte => {
        // Se houver unidade definida, filtra pela unidade de COLETA (Vendas)
        if (targetUnit && normalizeUnitName(cte.unidadeColeta) !== targetUnit) return;

        const dateStr = cte.data.toISOString().split('T')[0];
        dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + cte.valor);
    });

    const data = Array.from(dailyMap.entries())
      .map(([date, value]) => ({ 
        date, 
        value, 
        dayObj: new Date(date + 'T12:00:00') 
      }))
      .filter(d => d.value > 0) // Remove dias zerados
      .sort((a, b) => a.dayObj.getTime() - b.dayObj.getTime());

    const totalVal = data.reduce((acc, curr) => acc + curr.value, 0);
    const average = data.length > 0 ? totalVal / data.length : 0;

    return { data, average };
  }, [ctes, unitName]);

  if (chartData.data.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-sle-dark uppercase tracking-wider flex items-center">
                <DollarSign className="w-4 h-4 mr-2 text-sle-primary" /> Faturamento Diário {unitName ? `- ${unitName}` : ''}
            </h3>
            <div className="flex gap-2 text-[10px] font-semibold uppercase">
                <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>Acima da Média</div>
                <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-yellow-400 mr-1"></div>Na Média (+/- 5%)</div>
                <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>Abaixo da Média</div>
            </div>
        </div>
        <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.data} margin={{top: 5, right: 5, left: 5, bottom: 5}}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                        dataKey="date" 
                        tickFormatter={(val) => {
                            const [y, m, d] = val.split('-');
                            return `${d}/${m}`;
                        }}
                        tick={{fontSize: 10, fill: '#888'}} 
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip 
                        cursor={{fill: 'transparent'}}
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                const weekDays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
                                const dayName = weekDays[data.dayObj.getDay()];
                                return (
                                    <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg text-xs">
                                        <p className="font-bold text-sle-primary mb-1">{new Date(data.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                                        <p className="font-semibold text-gray-500 mb-2 uppercase">{dayName}</p>
                                        <p className="text-sm font-bold text-gray-800">
                                            {Number(payload[0].value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                        {chartData.data.map((entry, index) => {
                            const avg = chartData.average;
                            let fill = '#EAB308'; // Yellow
                            if (entry.value > avg * 1.05) fill = '#22c55e'; // Green
                            else if (entry.value < avg * 0.95) fill = '#ef4444'; // Red
                            
                            return <Cell key={`cell-${index}`} fill={fill} />;
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>
  );
};

export default DailyRevenueChart;
