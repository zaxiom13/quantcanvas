import React, { useEffect, useRef, useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface SimpleVisualOutputProps {
  data: any;
  isOpen: boolean;
  onClose: () => void;
}

// Image Canvas Component
const ImageCanvas: React.FC<{ data: any }> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Type guards
  const isGrayscaleMatrix = (arr: any): boolean => {
    return Array.isArray(arr) && arr.length > 0 && 
           arr.every(row => Array.isArray(row) && row.every(v => typeof v === 'number'));
  };

  const isColorMatrix = (arr: any): boolean => {
    return Array.isArray(arr) && arr.length > 0 &&
           arr.every(row => Array.isArray(row) && 
             row.every(pix => Array.isArray(pix) && (pix.length === 3 || pix.length === 4)));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    const CANVAS_SIZE = 400;
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isGrayscaleMatrix(data)) {
      const h = data.length;
      const w = Math.max(...data.map((r: any[]) => r.length));
      
      // Find min/max for normalization
      let min = Infinity, max = -Infinity;
      data.forEach((row: number[]) => row.forEach((val: number) => {
        if (val < min) min = val;
        if (val > max) max = val;
      }));
      
      const range = max - min;
      const imgData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
      
      for (let y = 0; y < CANVAS_SIZE; y++) {
        for (let x = 0; x < CANVAS_SIZE; x++) {
          const origX = Math.floor(x * w / CANVAS_SIZE);
          const origY = Math.floor(y * h / CANVAS_SIZE);
          const val = data[origY]?.[origX] ?? 0;
          const gray = range > 0 ? Math.round(((val - min) / range) * 255) : 128;
          const idx = (y * CANVAS_SIZE + x) * 4;
          imgData.data[idx] = gray;     // R
          imgData.data[idx + 1] = gray; // G
          imgData.data[idx + 2] = gray; // B
          imgData.data[idx + 3] = 255;  // A
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } else if (isColorMatrix(data)) {
      const h = data.length;
      const w = Math.max(...data.map((r: any[]) => r.length));
      const imgData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
      
      for (let y = 0; y < CANVAS_SIZE; y++) {
        for (let x = 0; x < CANVAS_SIZE; x++) {
          const origX = Math.floor(x * w / CANVAS_SIZE);
          const origY = Math.floor(y * h / CANVAS_SIZE);
          const pix = data[origY]?.[origX] ?? [0, 0, 0];
          const idx = (y * CANVAS_SIZE + x) * 4;
          imgData.data[idx] = Math.min(255, Math.max(0, pix[0]));     // R
          imgData.data[idx + 1] = Math.min(255, Math.max(0, pix[1])); // G
          imgData.data[idx + 2] = Math.min(255, Math.max(0, pix[2])); // B
          imgData.data[idx + 3] = pix.length === 4 ? Math.min(255, Math.max(0, pix[3])) : 255; // A
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }
  }, [data]);

  return (
    <div className="h-full flex justify-center items-center bg-offWhite rounded-lg border-2 border-offBlack16 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full object-contain border border-gray-300"
        style={{ minWidth: '100px', minHeight: '100px', imageRendering: 'pixelated' }}
      />
    </div>
  );
};

// Chart View Component for displaying numeric arrays
const ChartView = ({ data }: { data: number[] }) => {
  const chartData = {
    labels: data.map((_, index) => index.toString()),
    datasets: [
      {
        label: 'Values',
        data: data,
        backgroundColor: 'rgba(59, 130, 246, 0.6)', // blue color with transparency
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Hide legend for simple arrays
      },
      title: {
        display: true,
        text: `Array of ${data.length} values`,
        font: {
          size: 14,
        },
      },
      tooltip: {
        callbacks: {
          title: (context: any) => `Index: ${context[0].label}`,
          label: (context: any) => `Value: ${context.parsed.y}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          maxTicksLimit: Math.min(20, data.length), // Limit number of x-axis labels
        },
      },
    },
  };

  return (
    <div className="h-full p-4 bg-offWhite rounded-lg border-2 border-offBlack16">
      <div className="h-full">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

// Text View Component for displaying scalar values, strings, etc.
const TextView = ({ data }: { data: any }) => {
  const formatData = (data: any): string => {
    if (data === null) return 'null';
    if (data === undefined) return 'undefined';
    if (typeof data === 'string') return data;
    if (typeof data === 'number') return data.toString();
    if (typeof data === 'boolean') return data.toString();
    if (Array.isArray(data)) {
      if (data.length === 0) return '[]';
      if (data.length <= 10) {
        return JSON.stringify(data, null, 2);
      }
      return `[${data.length} items] ${JSON.stringify(data.slice(0, 5), null, 2)}...`;
    }
    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }
    return String(data);
  };

  return (
    <div className="h-full p-4 overflow-auto bg-offWhite rounded-lg border-2 border-offBlack16">
      <pre className="text-sm font-mono text-offBlack whitespace-pre-wrap break-words">
        {formatData(data)}
      </pre>
    </div>
  );
};

// Table Component
const TableView = ({ data, columns }: { data: any[], columns: any[] }) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full h-full overflow-auto bg-white rounded-lg border-2 border-offBlack16 shadow-sm">
      <div className="h-full overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-fadedBlue8">
            {table.getHeaderGroups().map((headerGroup: any) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header: any) => (
                  <th key={header.id} className="p-3 border-b-2 border-offBlack16 font-bold text-offBlack">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row: any, index: number) => (
              <tr key={row.id} className={`hover:bg-fadedBlue8 ${index % 2 === 0 ? 'bg-white' : 'bg-offWhite'}`}>
                {row.getVisibleCells().map((cell: any) => (
                  <td key={cell.id} className="p-3 border-b border-offBlack16 text-offBlack">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Placeholder = () => (
  <div className="w-full h-full flex flex-col items-center justify-center text-offBlack/70 p-6">
    <div className="mb-4 p-4 bg-blue/10 rounded-xl">
      <BarChart3 className="h-12 w-12 text-blue" />
    </div>
    <h3 className="text-2xl font-bold mb-3 text-offBlack">Visual Output Console</h3>
    <p className="text-base text-center leading-relaxed max-w-md">
      This panel will display charts, tables, and images.
      <br />
      Try running a query that returns an array of numbers, tabular data, or a matrix.
    </p>
    <div className="mt-6 flex items-center space-x-2">
      <div className="w-2 h-2 bg-blue rounded-full animate-pulse"></div>
      <span className="text-sm text-offBlack/50">Awaiting Data</span>
    </div>
  </div>
);

export const SimpleVisualOutput: React.FC<SimpleVisualOutputProps> = ({ data, isOpen, onClose }) => {
  // Type guards
  const isGrayscaleMatrix = (arr: any): boolean => {
    return Array.isArray(arr) && arr.length > 0 && 
           arr.every(row => Array.isArray(row) && row.every(v => typeof v === 'number'));
  };

  const isColorMatrix = (arr: any): boolean => {
    return Array.isArray(arr) && arr.length > 0 &&
           arr.every(row => Array.isArray(row) && 
             row.every(pix => Array.isArray(pix) && (pix.length === 3 || pix.length === 4)));
  };

  const isTableData = (d: any): boolean => {
    if (!d) return false;
    if (Array.isArray(d) && d.length > 0) {
      return typeof d[0] === 'object' && d[0] !== null && !Array.isArray(d[0]);
    }
    if (typeof d === 'object' && !Array.isArray(d) && d !== null) {
      const keys = Object.keys(d);
      return keys.length > 0 && Array.isArray(d[keys[0]]);
    }
    return false;
  };

  const isNumericArray = (arr: any): boolean => {
    return Array.isArray(arr) && arr.length > 0 && 
           arr.every(v => typeof v === 'number' && Number.isFinite(v));
  };

  // Determine view based on data type
  const currentView = useMemo(() => {
    if (isGrayscaleMatrix(data) || isColorMatrix(data)) {
      return 'image';
    }
    if (isNumericArray(data)) {
      return 'chart';
    }
    if (isTableData(data)) {
      return 'table';
    }
    return 'text';
  }, [data]);

  // Prepare table data
  const { tableData, columns } = useMemo(() => {
    let tableData: any[] = [];
    let columns: any[] = [];

    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null && !Array.isArray(data[0])) {
      const keys = Object.keys(data[0]);
      columns = keys.map((key) => ({ accessorKey: key, header: key }));
      tableData = data;
    } else if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      const keys = Object.keys(data);
      if (keys.length > 0 && Array.isArray(data[keys[0]])) {
        columns = keys.map(key => ({ accessorKey: key, header: key }));
        const numRows = data[keys[0]].length;
        tableData = Array.from({ length: numRows }, (_, i) => 
          Object.fromEntries(keys.map(k => [k, data[k][i]]))
        );
      }
    }
    return { tableData, columns };
  }, [data]);

  if (!data) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-screen w-screen max-h-screen bg-white border-2 border-offBlack16 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue" />
              <span className="text-offBlack">Visual Output</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <Placeholder />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-screen w-screen max-h-screen bg-white border-2 border-offBlack16 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue" />
            <span className="text-offBlack">Visual Output</span>
          </DialogTitle>
        </DialogHeader>
        
        {/* View Selection Header - show if we have visualizable data */}
        {(isTableData(data) || isGrayscaleMatrix(data) || isColorMatrix(data) || isNumericArray(data)) && (
          <div className="flex items-center space-x-2 p-3 border-b border-offBlack16 bg-gradient-to-r from-fadedBlue8 to-offWhite">
            {isTableData(data) && (
              <Button 
                onClick={() => {/* switching not needed for now */}} 
                variant={currentView === 'table' ? 'default' : 'outline'} 
                size="sm"
                className={currentView === 'table' ? 'bg-blue text-white hover:bg-blue/90' : 'text-offBlack border-offBlack/30 hover:bg-fadedBlue16'}
              >
                Table
              </Button>
            )}
            {(isGrayscaleMatrix(data) || isColorMatrix(data)) && (
              <Button 
                variant={currentView === 'image' ? 'default' : 'outline'} 
                size="sm"
                className={currentView === 'image' ? 'bg-blue text-white hover:bg-blue/90' : 'text-offBlack border-offBlack/30 hover:bg-fadedBlue16'}
              >
                Image
              </Button>
            )}
            {isNumericArray(data) && (
              <Button 
                variant={currentView === 'chart' ? 'default' : 'outline'} 
                size="sm"
                className={currentView === 'chart' ? 'bg-blue text-white hover:bg-blue/90' : 'text-offBlack border-offBlack/30 hover:bg-fadedBlue16'}
              >
                Chart
              </Button>
            )}
            {!isTableData(data) && !isGrayscaleMatrix(data) && !isColorMatrix(data) && !isNumericArray(data) && (
              <Button 
                variant={currentView === 'text' ? 'default' : 'outline'} 
                size="sm"
                className={currentView === 'text' ? 'bg-blue text-white hover:bg-blue/90' : 'text-offBlack border-offBlack/30 hover:bg-fadedBlue16'}
              >
                Text
              </Button>
            )}
          </div>
        )}

        {/* Content Views */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {currentView === 'table' && isTableData(data) && (
            <div className="h-full overflow-hidden">
              <TableView data={tableData} columns={columns} />
            </div>
          )}
          
          {currentView === 'image' && (isGrayscaleMatrix(data) || isColorMatrix(data)) && (
            <ImageCanvas data={data} />
          )}

          {currentView === 'chart' && isNumericArray(data) && (
            <div className="h-full overflow-hidden">
              <ChartView data={data} />
            </div>
          )}

          {currentView === 'text' && (
            <div className="h-full overflow-hidden">
              <TextView data={data} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 