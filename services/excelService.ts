import { Cte } from '../types';

export const downloadXLS = (data: Cte[], filename: string) => {
  // Create a minimal HTML table string for Excel
  let table = '<html xmlns:x="urn:schemas-microsoft-com:office:excel">';
  table += '<head><meta charset="utf-8"></head>';
  table += '<body><table>';
  
  // Header
  table += '<thead><tr>';
  table += '<th>ID/CTE</th>';
  table += '<th>Data</th>';
  table += '<th>Unidade Coleta</th>';
  table += '<th>Unidade Entrega</th>';
  table += '<th>Valor</th>';
  table += '<th>Status Prazo</th>';
  table += '<th>Status MDFE</th>';
  table += '<th>Remetente</th>';
  table += '<th>Destinatário</th>';
  table += '</tr></thead>';

  // Body
  table += '<tbody>';
  data.forEach(cte => {
    table += '<tr>';
    table += `<td>${cte.id}</td>`;
    table += `<td>${cte.data.toLocaleDateString('pt-BR')}</td>`;
    table += `<td>${cte.unidadeColeta}</td>`;
    table += `<td>${cte.unidadeEntrega}</td>`;
    table += `<td>${cte.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>`;
    table += `<td>${cte.statusPrazo}</td>`;
    table += `<td>${cte.statusMdfe}</td>`;
    table += `<td>${cte.remetente || ''}</td>`;
    table += `<td>${cte.destinatario || ''}</td>`;
    table += '</tr>';
  });
  table += '</tbody></table></body></html>';

  const blob = new Blob([table], { type: 'application/vnd.ms-excel' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
