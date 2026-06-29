export const fetchCsv = async (url: string): Promise<string[][]> => {
  // Add timestamp to prevent caching of Google Sheets CSV
  const cacheBusterUrl = `${url}&t=${Date.now()}`;
  
  const response = await fetch(cacheBusterUrl, {
    cache: 'no-store',
    headers: {
      'Pragma': 'no-cache',
      'Cache-Control': 'no-cache'
    }
  });
  
  const text = await response.text();
  
  let delimiter = ',';
  // Auto-detect delimiter by checking the first line
  const firstLineIdx = text.indexOf('\n');
  if (firstLineIdx > -1) {
    const firstLine = text.substring(0, firstLineIdx);
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
    else if (tabCount > commaCount) delimiter = '\t';
  }
  
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentCell.trim()); // Trim whitespace from values immediately
        currentCell = '';
      } else if (char === '\n' || char === '\r') {
        if (currentCell || currentRow.length > 0) {
          currentRow.push(currentCell.trim());
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
        if (char === '\r' && nextChar === '\n') i++;
      } else {
        currentCell += char;
      }
    }
  }
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }
  
  return rows;
};