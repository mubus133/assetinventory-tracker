import React, { useEffect, useState } from 'react';
import { 
  Package, 
  ArrowLeftRight, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import { Asset, AuditLog } from '../types';
import { useAuth } from '../context/AuthContext';
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
  Pie
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeAssets: () => void;
    let unsubscribeLogs: () => void;

    const setupSubscriptions = async () => {
      try {
        if (user?.role === 'Admin') {
          await api.metadata.seedDatabase();
        }

        const canReadAuditLogs = user?.role === 'Admin' || user?.role === 'Management';

        // Initial fetch for immediate display
        const [assetsData, logsData] = await Promise.all([
          api.assets.list(),
          canReadAuditLogs ? api.metadata.auditLogs() : Promise.resolve([])
        ]);
        setAssets(assetsData);
        setAuditLogs(logsData.slice(0, 5));
        setLoading(false);

        // Real-time subscriptions
        unsubscribeAssets = api.assets.subscribe((updatedAssets) => {
          setAssets(updatedAssets);
        }, (err) => console.error('Asset subscription error:', err));

        if (canReadAuditLogs) {
          unsubscribeLogs = api.metadata.subscribeLogs((updatedLogs) => {
            setAuditLogs(updatedLogs.slice(0, 5));
          }, (err) => console.error('Log subscription error:', err));
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
        setLoading(false);
      }
    };

    setupSubscriptions();

    return () => {
      if (unsubscribeAssets) unsubscribeAssets();
      if (unsubscribeLogs) unsubscribeLogs();
    };
  }, [user]);

  const stats = [
    { name: 'Total Institutional Assets', value: assets.length, trend: '+12 added this week', color: 'text-text-primary' },
    { name: 'Currently Allocated', value: assets.filter(a => a.status === 'Allocated').length, trend: '64.5% utilization rate', color: 'text-text-primary' },
    { name: 'Available in Store', value: assets.filter(a => a.status === 'Available').length, trend: '-3 pending repair', color: 'text-text-primary' },
    { name: 'Reported Losses', value: assets.filter(a => a.status === 'Maintenance').length, trend: 'Across 12 departments', color: 'text-text-primary' },
  ];

  const categoryData = assets.reduce((acc: any[], asset) => {
    const existing = acc.find(item => item.name === asset.categoryId);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: asset.categoryId, value: 1 });
    }
    return acc;
  }, []);

  const COLORS = ['hsl(54, 100%, 75%)', '#15803d', '#22c55e', '#fde047', '#fef08a'];

  if (loading) return <div className="flex items-center justify-center h-64 text-text-secondary">Loading dashboard...</div>;

  return (
    <div className="space-y-8">
      <div className="page-title">
        <h1 className="text-2xl font-bold text-text-primary">Asset Overview</h1>
        <p className="text-text-secondary text-sm">Centralized Inventory & Management Console</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-bg-card p-6 rounded-xl border border-border shadow-sm">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">{stat.name}</p>
            <p className="text-3xl font-bold text-text-primary">{stat.value.toLocaleString()}</p>
            <p className="text-[10px] text-success mt-2 font-medium">{stat.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={16} className="text-accent" />
              Assets by Category
            </h2>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData.length > 0 ? categoryData : [{ name: 'No Data', value: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#064e3b' }}
                  itemStyle={{ color: '#064e3b' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-8 flex items-center gap-2">
            <Clock size={16} className="text-accent" />
            System Activity Log
          </h2>
          <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {auditLogs.length > 0 ? auditLogs.map((log) => (
              <div key={log.id} className="flex gap-4 group">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-accent shrink-0 group-hover:scale-125 transition-transform" />
                <div>
                  <p className="text-xs font-bold text-text-primary leading-tight">
                    {log.action}: <span className="font-normal text-text-secondary">{log.details}</span>
                  </p>
                  <p className="text-[10px] text-text-secondary mt-1 uppercase font-semibold tracking-tighter">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            )) : (
              <p className="text-xs text-text-secondary text-center py-8 italic">No recent activity</p>
            )}
          </div>
          <button className="w-full mt-8 py-2 text-[10px] font-bold text-accent uppercase tracking-widest hover:bg-white/5 rounded-lg transition-colors border border-border">
            View Full Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
};
