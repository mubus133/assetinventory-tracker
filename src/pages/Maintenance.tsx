import React, { useEffect, useState } from 'react';
import { 
  Wrench, 
  AlertTriangle, 
  Package, 
  User, 
  Calendar,
  Search,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { Asset, User as UserType } from '../types';

export const Maintenance: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeAssets: () => void;
    let unsubscribeUsers: () => void;

    const setupSubscriptions = async () => {
      setLoading(true);
      try {
        const [assetsData, usersData] = await Promise.all([
          api.assets.list(),
          api.metadata.users()
        ]);
        setAssets(assetsData);
        setUsers(usersData);
        setLoading(false);

        unsubscribeAssets = api.assets.subscribe(setAssets, (err) => console.error('Asset subscription error:', err));
        unsubscribeUsers = api.metadata.subscribeUsers(setUsers, (err) => console.error('User subscription error:', err));
      } catch (err) {
        console.error('Failed to fetch maintenance data', err);
        setLoading(false);
      }
    };

    setupSubscriptions();

    return () => {
      if (unsubscribeAssets) unsubscribeAssets();
      if (unsubscribeUsers) unsubscribeUsers();
    };
  }, []);

  const maintenanceAssets = assets.filter(a => 
    (a.status === 'Maintenance' || a.condition === 'Damaged' || a.condition === 'Lost') &&
    (a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     a.assetId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleRepairComplete = async (asset: Asset) => {
    setProcessingId(asset.id);
    try {
      await api.assets.update(asset.id, { 
        status: 'Available', 
        condition: 'Good',
        lastMaintenanceDate: new Date().toISOString()
      });
      toast.success('Asset marked as REPAIRED and AVAILABLE');
    } catch (err: any) {
      toast.error('Failed to update asset status');
    } finally {
      setProcessingId(null);
    }
  };

  const currentStats = {
    damaged: assets.filter(a => a.condition === 'Damaged').length,
    lost: assets.filter(a => a.condition === 'Lost').length,
    underRepair: assets.filter(a => a.status === 'Maintenance').length
  };

  return (
    <div className="space-y-8">
      <div className="page-title">
        <h1 className="text-2xl font-bold text-text-primary">Maintenance Dashboard</h1>
        <p className="text-text-secondary text-sm">Monitor damaged items and coordinate repairs.</p>
      </div>

      {/* Stats Mini Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-bg-card p-6 rounded-xl border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">Damaged Items</p>
            <p className="text-2xl font-black text-text-primary">{currentStats.damaged}</p>
          </div>
        </div>
        <div className="bg-bg-card p-6 rounded-xl border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-500/10 rounded-xl flex items-center justify-center text-slate-500">
            <Package size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">Reported Lost</p>
            <p className="text-2xl font-black text-text-primary">{currentStats.lost}</p>
          </div>
        </div>
        <div className="bg-bg-card p-6 rounded-xl border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
            <Wrench size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">Under Maintenance</p>
            <p className="text-2xl font-black text-text-primary">{currentStats.underRepair}</p>
          </div>
        </div>
      </div>

      <div className="bg-bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
            <Wrench size={16} className="text-accent" />
            Repair Queue
          </h2>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input 
              type="text"
              placeholder="Search damanged items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-bg-deep border border-border rounded-lg text-xs"
            />
          </div>
        </div>

        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-12 text-center text-text-secondary"><Loader2 className="animate-spin mx-auto" /></div>
          ) : maintenanceAssets.length === 0 ? (
            <div className="p-20 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-success">
                <CheckCircle2 size={32} />
              </div>
              <p className="text-sm text-text-secondary font-medium uppercase tracking-[0.1em]">No assets currently require maintenance</p>
            </div>
          ) : (
            maintenanceAssets.map((asset) => (
              <div key={asset.id} className="p-6 hover:bg-white/5 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${
                    asset.condition === 'Damaged' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                    asset.condition === 'Lost' ? 'bg-slate-500/10 border-slate-500/20 text-slate-500' :
                    'bg-amber-500/10 border-amber-500/20 text-amber-500'
                  }`}>
                    <Package size={28} />
                  </div>
                  <div>
                    <h3 className="font-black text-text-primary text-lg tracking-tight mb-1">{asset.name}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono font-bold text-accent bg-accent/10 px-2 py-0.5 rounded tracking-widest uppercase">{asset.assetId}</span>
                      <div className="h-1 w-1 rounded-full bg-border" />
                      <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${
                        asset.condition === 'Damaged' ? 'text-red-500' : 
                        asset.condition === 'Lost' ? 'text-slate-400' : 'text-amber-500'
                      }`}>
                        {asset.condition || 'Unknown Condition'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleRepairComplete(asset)}
                    disabled={processingId === asset.id}
                    className="px-6 py-2.5 bg-accent text-black rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white transition-all shadow-lg shadow-accent/20 flex items-center gap-2 group-hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    {processingId === asset.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Complete Repair
                  </button>
                  <button className="p-2.5 bg-bg-deep border border-border rounded-xl text-text-secondary hover:text-text-primary transition-all">
                    <Filter size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
