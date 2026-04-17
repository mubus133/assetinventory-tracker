import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  Download, 
  FileText, 
  PieChart as PieChartIcon,
  Filter,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { api } from '../services/api';
import { Asset, Category, Department } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Reports: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assetsData, catsData, deptsData] = await Promise.all([
          api.assets.list(),
          api.metadata.categories(),
          api.metadata.departments()
        ]);
        setAssets(assetsData);
        setCategories(catsData);
        setDepartments(deptsData);
      } catch (err) {
        console.error('Failed to fetch report data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(6, 78, 59); // Emerald Green
    doc.text('Crescent University Asset Inventory Report', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    
    // Summary Table
    const tableData = categories.map(cat => {
      const catAssets = assets.filter(a => a.categoryId === cat.id);
      return [
        cat.name,
        catAssets.length,
        catAssets.filter(a => a.status === 'Available').length,
        catAssets.filter(a => a.status === 'Allocated').length,
        catAssets.filter(a => a.status === 'Maintenance').length
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: [['Category', 'Total', 'Available', 'Allocated', 'Maintenance']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255] }, // Emerald Green header, White text
    });

    // Asset Status Summary
    const finalY = (doc as any).lastAutoTable.finalY || 40;
    doc.setFontSize(14);
    doc.text('Asset Status Summary', 14, finalY + 15);
    
    const statusSummary = [
      ['Total Assets', assets.length],
      ['Available', assets.filter(a => a.status === 'Available').length],
      ['Allocated', assets.filter(a => a.status === 'Allocated').length],
      ['Maintenance', assets.filter(a => a.status === 'Maintenance').length],
      ['Disposed', assets.filter(a => a.status === 'Disposed').length]
    ];

    autoTable(doc, {
      startY: finalY + 20,
      body: statusSummary,
      theme: 'plain',
      styles: { fontSize: 10 }
    });

    doc.save('crescent-university-asset-report.pdf');
  };

  const handleDownloadDetailedReport = () => {
    // Generate CSV
    const headers = ['Asset ID', 'Name', 'Category', 'Department', 'Status', 'Purchase Date', 'Description'];
    const rows = assets.map(asset => [
      asset.assetId,
      asset.name,
      categories.find(c => c.id === asset.categoryId)?.name || 'N/A',
      departments.find(d => d.id === asset.departmentId)?.name || 'N/A',
      asset.status,
      asset.purchaseDate,
      `"${asset.description.replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `detailed-asset-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusData = [
    { name: 'Available', value: assets.filter(a => a.status === 'Available').length, color: '#15803d' },
    { name: 'Allocated', value: assets.filter(a => a.status === 'Allocated').length, color: 'hsl(54, 100%, 75%)' },
    { name: 'Maintenance', value: assets.filter(a => a.status === 'Maintenance').length, color: '#ef4444' },
    { name: 'Disposed', value: assets.filter(a => a.status === 'Disposed').length, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  const deptData = departments.map(dept => ({
    name: dept.name,
    value: assets.filter(a => a.departmentId === dept.id).length
  })).filter(d => d.value > 0);

  if (loading) return <div className="p-12 text-center text-slate-500">Generating reports...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="page-title">
          <h1 className="text-2xl font-bold text-text-primary">Institutional Reports</h1>
          <p className="text-text-secondary text-sm">Comprehensive analytics and asset distribution data.</p>
        </div>
        <button 
          onClick={handleExportPDF}
          className="bg-bg-card border border-border text-text-secondary px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-white/5 transition-all shadow-sm"
        >
          <Download size={14} />
          Export PDF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status Distribution */}
        <div className="bg-bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-8 flex items-center gap-2">
            <PieChartIcon size={16} className="text-accent" />
            Asset Status Distribution
          </h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#064e3b' }}
                  itemStyle={{ color: '#064e3b' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Distribution */}
        <div className="bg-bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-8 flex items-center gap-2">
            <BarChart3 size={16} className="text-accent" />
            Assets by Department
          </h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#475569', fontSize: 10 }}
                  width={100}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#064e3b' }}
                  itemStyle={{ color: '#064e3b' }}
                />
                <Bar dataKey="value" fill="hsl(54, 100%, 75%)" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="data-section">
        <div className="px-6 py-4 border-b border-border bg-white/5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Inventory Summary</h2>
          <button 
            onClick={handleDownloadDetailedReport}
            className="text-[10px] text-accent font-bold uppercase tracking-widest hover:underline"
          >
            Download Detailed Report
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-center">Total</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-center">Available</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-center">Allocated</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">Value Est.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.map(cat => {
                const catAssets = assets.filter(a => a.categoryId === cat.id);
                return (
                  <tr key={cat.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-text-primary text-sm">{cat.name}</td>
                    <td className="px-6 py-4 text-center font-mono text-sm text-text-secondary">{catAssets.length}</td>
                    <td className="px-6 py-4 text-center text-emerald-400 font-bold text-sm">{catAssets.filter(a => a.status === 'Available').length}</td>
                    <td className="px-6 py-4 text-center text-accent font-bold text-sm">{catAssets.filter(a => a.status === 'Allocated').length}</td>
                    <td className="px-6 py-4 text-right text-text-secondary text-xs">—</td>
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
