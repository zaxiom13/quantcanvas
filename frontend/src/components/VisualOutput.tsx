import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
  } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Line, Bar, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Button } from './ui/button';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

interface VisualOutputProps {
  data: any;
}

const Placeholder = () => (
  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4">
    <h3 className="text-lg font-bold mb-2">Visual Output</h3>
    <p className="text-sm text-center">
      This panel will display charts, tables, and images.
      <br />
      Try running a query that returns tabular data or an array of numbers.
    </p>
  </div>
);

const TableView = ({ data, columns }: { data: any[], columns: ColumnDef<any>[] }) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <table className="w-full text-left border-collapse">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id} className="p-2 border-b border-green-700/50">
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id} className="hover:bg-green-800/20">
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} className="p-2 border-b border-green-900/50">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const calculateHistogram = (data: number[], numBins = 10) => {
    if (data.length === 0) return { labels: [], data: [] };
    const min = Math.min(...data);
    const max = Math.max(...data);
    if (min === max) {
        return { labels: [String(min)], data: [data.length] };
    }
    const binSize = (max - min) / numBins;
    const bins = new Array(numBins).fill(0);
    const labels = new Array(numBins);

    for (let i = 0; i < numBins; i++) {
        const binStart = min + i * binSize;
        const binEnd = binStart + binSize;
        labels[i] = `${binStart.toFixed(2)}-${binEnd.toFixed(2)}`;
    }

    for (const value of data) {
        if (value === max) {
            bins[numBins - 1]++;
        } else {
            const binIndex = Math.floor((value - min) / binSize);
            bins[binIndex]++;
        }
    }

    return { labels, data: bins };
};


const ChartView = ({
  data,
  xAxisKey,
  yAxisKeys,
  chartType,
  numericColumns,
}: {
  data: any[];
  xAxisKey: string | null;
  yAxisKeys: string[];
  chartType: 'line' | 'bar' | 'scatter' | 'histogram';
  numericColumns: string[];
}) => {
  const chartData = useMemo(() => {
    if (chartType === 'histogram') {
        if (!xAxisKey || !Array.isArray(data) || data.length === 0) {
            return { labels: [], datasets: [] };
        }
        const numericData = data.map(row => row[xAxisKey]).filter(v => typeof v === 'number');
        const { labels, data: histData } = calculateHistogram(numericData);
        return {
            labels,
            datasets: [{
                label: `Frequency of ${xAxisKey}`,
                data: histData,
                backgroundColor: 'hsla(140, 70%, 50%, 0.8)',
            }]
        };
    }


    if (!xAxisKey || yAxisKeys.length === 0 || !Array.isArray(data) || data.length === 0) {
      return { labels: [], datasets: [] };
    }

    const isXNumeric = numericColumns.includes(xAxisKey);

    const labels = isXNumeric ? undefined : data.map((row) => row[xAxisKey]);
    const datasets = yAxisKeys.map((key, i) => ({
      label: key,
      data: data.map((row) => isXNumeric ? {x: row[xAxisKey], y: row[key]} : row[key]),
      borderColor: `hsl(${(i * 60) % 360}, 70%, 50%)`,
      backgroundColor: chartType === 'bar' ? `hsla(${(i * 60) % 360}, 70%, 50%, 0.5)`: `hsl(${(i * 60) % 360}, 70%, 50%)`,
      fill: false,
    }));

    return { labels, datasets };
  }, [data, xAxisKey, yAxisKeys, chartType, numericColumns]);

  const isXNumeric = xAxisKey ? numericColumns.includes(xAxisKey) : false;

  const options: ChartOptions<any> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: 'hsl(120, 70%, 80%)' },
      },
      title: {
        display: true,
        text: chartType === 'histogram' ? `Histogram of ${xAxisKey}` : `${yAxisKeys.join(', ')} vs ${xAxisKey}`,
        color: 'hsl(120, 70%, 90%)',
      },
    },
    scales: {
      x: {
        type: isXNumeric && chartType !== 'bar' ? 'linear' : 'category',
        ticks: { color: '#6EE7B7' },
        grid: { color: 'rgba(110, 231, 183, 0.1)' },
      },
      y: {
        type: 'linear',
        ticks: { color: '#6EE7B7' },
        grid: { color: 'rgba(110, 231, 183, 0.2)' },
      },
    },
  };

  if (chartType === 'histogram') {
    if (!xAxisKey) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4">
                <h3 className="text-lg font-bold mb-2">Histogram</h3>
                <p className="text-sm text-center">
                    Select a numeric data column to display its distribution.
                </p>
            </div>
        )
    }
  } else if (!xAxisKey || yAxisKeys.length === 0) {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4">
            <h3 className="text-lg font-bold mb-2">Chart Output</h3>
            <p className="text-sm text-center">
                Select an X-axis and at least one Y-axis to display a chart.
            </p>
        </div>
    )
  }

  const ChartComponent = {
    line: Line,
    bar: Bar,
    scatter: Scatter,
    histogram: Bar,
  }[chartType];

  return <ChartComponent data={chartData} options={options} />;
};


export const VisualOutput: React.FC<VisualOutputProps> = ({ data }) => {
  const [view, setView] = useState<'image' | 'table' | 'chart'>('table');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'scatter' | 'histogram'>('line');
  const [xAxisKey, setXAxisKey] = useState<string | null>(null);
  const [yAxisKeys, setYAxisKeys] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>();
  const frameIdxRef = useRef(0);

  const { tableData, columns, columnNames, numericColumns } = useMemo(() => {
    let tableData: any[] = [];
    let columns: ColumnDef<any>[] = [];
    let columnNames: string[] = [];
    let numericColumns: string[] = [];

    if (Array.isArray(data) && data.length > 0) {
      if (typeof data[0] === 'object' && data[0] !== null) {
        // Array of objects
        const keys = Object.keys(data[0]);
        columnNames = keys;
        columns = keys.map((key) => ({ accessorKey: key, header: key }));
        tableData = data;
        numericColumns = keys.filter(k => typeof data[0][k] === 'number');
      } else if (Array.isArray(data[0])) {
        // Array of arrays
        const maxLen = Math.max(...data.map((row: any[]) => row.length));
        columnNames = Array.from({ length: maxLen }, (_, i) => `Column ${i}`);
        columns = columnNames.map((name, i) => ({
          id: `col${i}`,
          header: name,
          accessorFn: (row: any) => row[i],
        }));
        tableData = data;
        // Check first data row for numeric columns
        if (data.length > 0) {
            numericColumns = columnNames.filter((_, i) => typeof data[0][i] === 'number');
        }
      }
    } else if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        // Dictionary of lists (flipped table)
        const keys = Object.keys(data);
        if (keys.length > 0 && Array.isArray(data[keys[0]])) {
            columnNames = keys;
            columns = keys.map(key => ({ accessorKey: key, header: key }));
            const numRows = data[keys[0]].length;
            tableData = Array.from({ length: numRows }, (_, i) => 
                Object.fromEntries(keys.map(k => [k, data[k][i]]))
            );
            if (numRows > 0) {
                numericColumns = keys.filter(k => typeof tableData[0][k] === 'number');
            }
        }
    }
    return { tableData, columns, columnNames, numericColumns };
  }, [data]);

  // Utility type guards
  const isGrayscaleMatrix = (arr: any): arr is number[][] => (
      Array.isArray(arr) && arr.length > 0 &&
      arr.every(row => Array.isArray(row) && row.every(v => typeof v === 'number'))
  );

  const isColorMatrix = (arr: any): arr is number[][][] => (
      Array.isArray(arr) && arr.length > 0 &&
      arr.every(row => Array.isArray(row) && row.every(pix => Array.isArray(pix) && (pix.length === 3 || pix.length === 4) && pix.every(c => typeof c === 'number')))
  );

  const isGrayscaleGif = (arr: any): arr is number[][][] => (
      Array.isArray(arr) && arr.length > 0 && isGrayscaleMatrix(arr[0]) && !isColorMatrix(arr)
  );

  const isColorGif = (arr: any): arr is number[][][][] => (
      Array.isArray(arr) && arr.length > 0 && isColorMatrix(arr[0])
  );

  const handleChartTypeChange = (type: any) => {
      if (type === 'line' || type === 'bar' || type === 'scatter' || type === 'histogram') {
        setChartType(type);
        setXAxisKey(null);
        setYAxisKeys([]);
      }
  }

    useEffect(() => {
        // Reset selections when data changes
        setXAxisKey(null);
        setYAxisKeys([]);
        if (isTableData(data)) {
            // If there's exactly one column and it's numeric, default to histogram view
            if (columnNames.length === 1 && numericColumns.length === 1) {
                setView('chart');
                setChartType('histogram');
                setXAxisKey(numericColumns[0]);
            } else {
                setView('table');
            }
        } else {
            setView('image');
        }
    }, [data, columnNames, numericColumns]);

    const isTableData = (d: any): d is Record<string, any[]> | Record<string, any[]>[] => {
        if (!d) return false;
        if (Array.isArray(d) && d.length > 0) {
            return (typeof d[0] === 'object' && d[0] !== null) || Array.isArray(d[0]);
        }
        if (typeof d === 'object' && !Array.isArray(d) && d !== null) {
            const keys = Object.keys(d);
            return keys.length > 0 && Array.isArray(d[keys[0]]);
        }
        return false;
    };

    const isChartable = (): boolean => {
        if (!isTableData(data)) return false;
        if (!tableData || tableData.length === 0) return false;

        const firstRow = tableData[0];
        if (typeof firstRow !== 'object' || firstRow === null) return false;
        
        return numericColumns.length > 0;
    };


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    if (animRef.current) cancelAnimationFrame(animRef.current);
    frameIdxRef.current = 0;

    const drawFrame = (frame: any) => {
        if (!canvas) return;
        const MAX_CANVAS_SIZE = 512;
        if (isGrayscaleMatrix(frame)) {
            const h = frame.length;
            const w = Math.max(...frame.map((r: any[]) => r.length));
            const scale = Math.min(MAX_CANVAS_SIZE / w, MAX_CANVAS_SIZE / h);
            canvas.width = Math.round(w * scale);
            canvas.height = Math.round(h * scale);
            canvas.style.imageRendering = 'pixelated';
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            let min = Infinity, max = -Infinity;
            frame.forEach(row => row.forEach(val => {
                if (val < min) min = val;
                if (val > max) max = val;
            }));
            const range = max - min;
            const imgData = ctx.createImageData(canvas.width, canvas.height);
            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const origX = Math.floor(x / scale);
                    const origY = Math.floor(y / scale);
                    const val = frame[origY]?.[origX] ?? 0;
                    const gray = range > 0 ? Math.round(((val - min) / range) * 255) : Math.min(max, 255);
                    const idx = (y * canvas.width + x) * 4;
                    imgData.data.set([gray, gray, gray, 255], idx);
                }
            }
            ctx.putImageData(imgData, 0, 0);
        } else if (isColorMatrix(frame)) {
            const h = frame.length;
            const w = Math.max(...frame.map((r: any[]) => r.length));
            const scale = Math.min(MAX_CANVAS_SIZE / w, MAX_CANVAS_SIZE / h);
            canvas.width = Math.round(w * scale);
            canvas.height = Math.round(h * scale);
            canvas.style.imageRendering = 'pixelated';
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            const imgData = ctx.createImageData(canvas.width, canvas.height);
            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const origX = Math.floor(x / scale);
                    const origY = Math.floor(y / scale);
                    const pix = frame[origY]?.[origX] ?? [0, 0, 0];
                    const r = pix[0] <= 1 ? pix[0] * 255 : pix[0];
                    const g = pix[1] <= 1 ? pix[1] * 255 : pix[1];
                    const b = pix[2] <= 1 ? pix[2] * 255 : pix[2];
                    const a = pix.length === 4 ? (pix[3] <= 1 ? pix[3] * 255 : pix[3]) : 255;
                    const idx = (y * canvas.width + x) * 4;
                    imgData.data.set([r, g, b, a], idx);
                }
            }
            ctx.putImageData(imgData, 0, 0);
        }
    };
    
    if ((isColorGif(data) || isGrayscaleGif(data)) && view === 'image') {
      const frames = data as any[];
      const render = () => {
        drawFrame(frames[frameIdxRef.current]);
        frameIdxRef.current = (frameIdxRef.current + 1) % frames.length;
        animRef.current = requestAnimationFrame(render);
      };
      render();
    } else if ((isColorMatrix(data) || isGrayscaleMatrix(data)) && view === 'image') {
      drawFrame(data);
    }
  }, [data, view]); // Re-run if view changes to render canvas for 'image'


  const handleYAxisToggle = (key: string) => {
    setYAxisKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  if (!data) {
    return <Placeholder />;
  }

  return (
    <div className="h-full flex flex-col bg-black text-green-300 border-4 border-green-500 shadow-inner">
      <div className="flex-1 overflow-auto p-4" key={String(data)}>
        <div className="flex items-center space-x-2 p-2 border-b border-green-700/50">
            {isTableData(data) && (
                <Button onClick={() => setView('table')} variant={view === 'table' ? 'secondary' : 'ghost'}>Table</Button>
            )}
            {isChartable() && (
                <Button onClick={() => setView('chart')} variant={view === 'chart' ? 'secondary' : 'ghost'}>Chart</Button>
            )}
            {(isGrayscaleMatrix(data) || isColorMatrix(data) || isGrayscaleGif(data) || isColorGif(data)) && (
                <Button onClick={() => setView('image')} variant={view === 'image' ? 'secondary' : 'ghost'}>Image</Button>
            )}
        </div>

        {view === 'table' && isTableData(data) && <TableView data={tableData} columns={columns} />}
        
        {view === 'image' && (
            <canvas
            ref={canvasRef}
            className="w-full h-full object-contain"
            />
        )}
        
        {view === 'chart' && isChartable() && (
          <div className='flex h-full'>
            <div className='w-1/3 p-4 space-y-4 border-r border-green-700/50 overflow-y-auto'>
                <div>
                    <Label className="font-bold">Chart Type</Label>
                    <RadioGroup value={chartType} onValueChange={handleChartTypeChange} className="mt-2">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="line" id="line" /><Label htmlFor="line">Line</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="bar" id="bar" /><Label htmlFor="bar">Bar</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="scatter" id="scatter" /><Label htmlFor="scatter">Scatter</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="histogram" id="histogram" /><Label htmlFor="histogram">Histogram</Label></div>
                    </RadioGroup>
                </div>

                {chartType === 'histogram' ? (
                    <div>
                        <Label className="font-bold mt-4">Data Column</Label>
                        <RadioGroup onValueChange={setXAxisKey} value={xAxisKey || ''} className="mt-2">
                            {numericColumns.map(key => (
                                <div key={key} className="flex items-center space-x-2">
                                    <RadioGroupItem value={key} id={`hist-${key}`} /><Label htmlFor={`hist-${key}`}>{key}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>
                ) : (
                    <>
                        <div>
                            <Label className="font-bold mt-4">X-Axis (Category)</Label>
                            <RadioGroup onValueChange={setXAxisKey} value={xAxisKey || ''} className="mt-2">
                                {columnNames.map(key => (
                                    <div key={`x-${key}`} className="flex items-center space-x-2">
                                        <RadioGroupItem value={key} id={`x-${key}`} /><Label htmlFor={`x-${key}`}>{key}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                        {xAxisKey && (
                            <div>
                                <Label className="font-bold mt-4">Y-Axis (Values)</Label>
                                <div className="mt-2 space-y-2">
                                    {numericColumns
                                        .filter(key => key !== xAxisKey)
                                        .map(key => (
                                        <div key={`y-${key}`} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`y-${key}`}
                                                checked={yAxisKeys.includes(key)}
                                                onCheckedChange={() => handleYAxisToggle(key)}
                                            />
                                            <Label htmlFor={`y-${key}`}>{key}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
            <div className='w-2/3 p-4 relative'>
              <ChartView data={tableData} xAxisKey={xAxisKey} yAxisKeys={yAxisKeys} chartType={chartType} numericColumns={numericColumns} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}; 