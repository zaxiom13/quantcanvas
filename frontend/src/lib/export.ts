// Lightweight export helpers for CSV/JSON/TXT/HTML and image downloads

type TableLike = Array<Record<string, any>> | Record<string, any[]>;

const isArrayOfObjects = (data: any): data is Array<Record<string, any>> => {
  return Array.isArray(data) && data.length > 0 && data.every((row) => typeof row === 'object' && row !== null && !Array.isArray(row));
};

const isObjectOfArrays = (data: any): data is Record<string, any[]> => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const keys = Object.keys(data);
  if (keys.length === 0) return false;
  return keys.every((k) => Array.isArray((data as any)[k]));
};

export const canExportAsTableCSV = (data: any): boolean => {
  return isArrayOfObjects(data) || isObjectOfArrays(data);
};

const normalizeTable = (data: TableLike): { headers: string[]; rows: Array<Record<string, any>> } => {
  if (isArrayOfObjects(data)) {
    const headers = Array.from(new Set(data.flatMap((row) => Object.keys(row))));
    return { headers, rows: data };
  }
  // object of arrays -> rows by zipping
  const headers = Object.keys(data);
  const numRows = headers.length > 0 ? (data as Record<string, any[]>)[headers[0]].length : 0;
  const rows: Array<Record<string, any>> = Array.from({ length: numRows }, (_, i) => {
    const row: Record<string, any> = {};
    headers.forEach((h) => {
      row[h] = (data as Record<string, any[]>)[h]?.[i];
    });
    return row;
  });
  return { headers, rows };
};

const toCSV = (data: TableLike): string => {
  const { headers, rows } = normalizeTable(data);
  const escape = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const headerLine = headers.map(escape).join(',');
  const lines = rows.map((row) => headers.map((h) => escape(row[h])).join(','));
  return [headerLine, ...lines].join('\n');
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const downloadString = (content: string, filename: string, mime: string) => {
  const blob = new Blob([content], { type: mime + ';charset=utf-8' });
  downloadBlob(blob, filename);
};

export const exportJSON = (data: any, filename = 'data.json') => {
  const json = JSON.stringify(data, null, 2);
  downloadString(json, filename, 'application/json');
};

export const exportCSV = (data: TableLike, filename = 'data.csv') => {
  const csv = toCSV(data);
  downloadString(csv, filename, 'text/csv');
};

export const exportText = (text: string, filename = 'data.txt') => {
  downloadString(text, filename, 'text/plain');
};

export const exportHTML = (htmlString: string, filename = 'content.html') => {
  downloadString(htmlString, filename, 'text/html');
};

export const exportCanvasPNG = async (canvas: HTMLCanvasElement, filename = 'image.png') => {
  if ((canvas as any).toBlob) {
    return new Promise<void>((resolve) => {
      (canvas as HTMLCanvasElement).toBlob((blob) => {
        if (blob) downloadBlob(blob, filename);
        resolve();
      });
    });
  }
  const dataUrl = canvas.toDataURL('image/png');
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  downloadBlob(blob, filename);
};

// Chart.js helper: accepts either a ChartJS instance or a canvas element
export const exportChartPNG = async (chartOrCanvas: any, filename = 'chart.png') => {
  const canvas: HTMLCanvasElement | null = 
    chartOrCanvas?.canvas || chartOrCanvas?.canvasEl || chartOrCanvas || null;
  if (!canvas) return;
  await exportCanvasPNG(canvas, filename);
};

export const buildConsoleGroupExport = (group: {
  id: string;
  query: string;
  queryTimestamp: string;
  response?: any;
  responseTimestamp?: string;
  error?: string;
  errorTimestamp?: string;
}) => {
  return {
    id: group.id,
    query: group.query,
    queryTimestamp: group.queryTimestamp,
    response: group.response,
    responseTimestamp: group.responseTimestamp,
    error: group.error,
    errorTimestamp: group.errorTimestamp,
  };
};

export const buildLiveSessionExport = (session: {
  id: string;
  mode: 'live' | 'mouse';
  query: string;
  startTime: string;
  endTime?: string;
  results: any[];
}) => {
  return {
    id: session.id,
    mode: session.mode,
    query: session.query,
    startTime: session.startTime,
    endTime: session.endTime,
    resultCount: session.results.length,
    results: session.results,
  };
};

export const maybeExportCSVFromUnknown = (data: any, defaultFilename = 'data.csv'): boolean => {
  if (canExportAsTableCSV(data)) {
    exportCSV(data as TableLike, defaultFilename);
    return true;
  }
  return false;
};



