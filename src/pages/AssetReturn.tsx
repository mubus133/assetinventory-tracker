import React, { useEffect, useState } from 'react';
import { 
  RotateCcw, 
  Search, 
  Package, 
  User, 
  Calendar,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';
import { Asset, User as UserType, Allocation } from '../types';

export const AssetReturn: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [assetToReturn, setAssetToReturn] = useState<Asset | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assetsData, usersData, logsData, allocationsData] = await Promise.all([
        api.assets.list(),
        api.metadata.users(),
        api.metadata.auditLogs(),
        api.allocations.list()
      ]);
      setAssets(assetsData);
      setUsers(usersData);
      setAllocations(allocationsData);
      setAuditLogs(logsData.filter((l: any) => l.action === 'Asset Allocation' || l.action === 'Asset Return').reverse());
    } catch (err) {
      console.error('Failed to fetch return data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const allocatedAssets = assets.filter(a => a.status === 'Allocated');

  const handleReturnClick = (asset: Asset) => {
    setAssetToReturn(asset);
    setIsConfirmModalOpen(true);
  };

  const confirmReturn = async () => {
    if (!assetToReturn) return;
    
    // Find the active allocation for this asset
    const activeAllocation = allocations.find(al => al.assetId === assetToReturn.id && al.status === 'Active');
    
    if (!activeAllocation) {
      alert('Could not find active allocation record for this asset.');
      setIsConfirmModalOpen(false);
      setAssetToReturn(null);
      return;
    }

    setProcessingId(assetToReturn.id);
    try {
      await api.allocations.return(activeAllocation.id);
      await fetchData();
      setIsConfirmModalOpen(false);
      setAssetToReturn(null);
    } catch (err) {
      alert('Failed to process return.');
    } finally {
      setProcessingId(null);
    }
  };

  const getAllocatedUser = (assetId: string) => {
    const allocation = allocations.find(al => al.assetId === assetId && al.status === 'Active');
    if (!allocation) return 'Unknown Staff';
    const user = users.find(u => u.id === allocation.userId);
    return user ? user.name : 'Unknown Staff';
  };

  return (
    <div className="space-y-6">
      <div className="page-title">
        <h1 className="text-2xl font-bold text-text-primary">Asset Return Log</h1>
        <p className="text-text-secondary text-sm">Process returned assets and update inventory status.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Allocated Assets List */}
        <div className="lg:col-span-2 bg-bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-white/5">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <RotateCcw size={16} className="text-accent" />
              Currently Allocated Assets
            </h2>
          </div>
          <div className="divide-y divide-border custom-scrollbar max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-12 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" /></div>
            ) : allocatedAssets.length === 0 ? (
              <div className="p-12 text-center text-slate-400">No assets are currently allocated.</div>
            ) : (
              allocatedAssets.map((asset) => (
                <div key={asset.id} className="p-6 hover:bg-white/5 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-bg-deep rounded-xl flex items-center justify-center text-accent">
                      <Package size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-text-primary text-lg tracking-tight">{asset.name}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-[10px] text-accent font-mono bg-accent/10 px-2 py-0.5 rounded font-bold uppercase tracking-widest">{asset.assetId}</span>
                        <span className="text-[10px] text-text-secondary flex items-center gap-1 uppercase font-bold tracking-widest">
                          <User size={12} />
                          Allocated to: {getAllocatedUser(asset.id)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleReturnClick(asset)}
                    disabled={processingId === asset.id}
                    className="btn-accent px-6 py-2 flex items-center gap-2"
                  >
                    {processingId === asset.id ? <Loader2 size={16} className="animate-spin" /> : null}
                    Process Return
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Return History / Sidebar */}
        <div className="space-y-6">
          <div className="bg-bg-card p-6 rounded-xl border border-border shadow-sm">
            <h3 className="text-[10px] font-bold text-text-primary uppercase tracking-widest mb-6 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-success" />
              Recent Transactions
            </h3>
            <div className="space-y-6">
              {auditLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="text-xs border-l border-border pl-4 py-1 relative">
                  <div className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full bg-border" />
                  <p className="font-bold text-text-primary">{log.action}</p>
                  <p className="text-[10px] text-text-secondary mt-1 leading-relaxed">{log.details}</p>
                  <p className="text-[9px] text-text-secondary mt-2 uppercase tracking-widest font-bold">
                    {new Date(log.timestamp).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-bg-card p-6 rounded-xl border border-border shadow-sm">
            <h3 className="text-[10px] font-bold text-accent uppercase tracking-widest mb-4">Return Policy</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              All returned assets must undergo a physical inspection by the Store Officer before being marked as <span className="text-text-primary font-bold">AVAILABLE</span> in the system.
            </p>
          </div>
        </div>
      </div>

      {/* Return Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-bg-deep/90 backdrop-blur-md">
          <div className="bg-bg-card border border-border w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto text-accent">
                <RotateCcw size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary">Confirm Asset Return</h3>
                <p className="text-sm text-text-secondary mt-1">
                  Are you sure you want to process the return of <span className="text-text-primary font-bold">{assetToReturn?.name}</span>? This will update the inventory status to <span className="text-emerald-400 font-bold">AVAILABLE</span>.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                    setIsConfirmModalOpen(false);
                    setAssetToReturn(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-bg-deep border border-border rounded-xl text-xs font-bold text-text-secondary uppercase tracking-widest hover:text-text-primary transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmReturn}
                  disabled={processingId !== null}
                  className="flex-1 px-4 py-2.5 bg-accent text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-accent/80 transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
                >
                  {processingId !== null ? <Loader2 size={14} className="animate-spin" /> : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
