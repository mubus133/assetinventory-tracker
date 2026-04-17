import React, { useEffect, useState } from 'react';
import { 
  ArrowLeftRight, 
  User, 
  Package, 
  Calendar, 
  CheckCircle2, 
  XCircle,
  Search,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';
import { Asset, User as UserType, Allocation } from '../types';

export const AssetAllocation: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    assetId: '',
    userId: '',
    notes: ''
  });

  const fetchData = async () => {
    try {
      const [assetsData, usersData] = await Promise.all([
        api.assets.list(),
        api.metadata.users()
      ]);
      setAssets(assetsData);
      setUsers(usersData);
    } catch (err) {
      console.error('Failed to fetch allocation data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.allocations.create(formData);
      setIsModalOpen(false);
      fetchData();
      setFormData({ assetId: '', userId: '', notes: '' });
    } catch (err) {
      alert('Failed to allocate asset');
    }
  };

  const availableAssets = assets.filter(a => a.status === 'Available');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Asset Allocation</h1>
          <p className="text-text-secondary text-sm">Assign assets to staff and track their movement.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-accent flex items-center gap-2"
        >
          <ArrowLeftRight size={18} />
          New Allocation
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Available Assets List */}
        <div className="bg-bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-white/5 flex items-center justify-between">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Package size={16} className="text-accent" />
              Available for Allocation
            </h2>
            <span className="text-[10px] font-bold bg-accent/10 text-accent px-2 py-1 rounded-full uppercase tracking-widest">
              {availableAssets.length} Assets
            </span>
          </div>
          <div className="divide-y divide-border max-h-[500px] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-12 text-center text-text-secondary"><Loader2 className="animate-spin mx-auto" /></div>
            ) : availableAssets.length === 0 ? (
              <div className="p-12 text-center text-text-secondary italic text-sm">No assets available for allocation.</div>
            ) : (
              availableAssets.map((asset) => (
                <div key={asset.id} className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-bg-deep rounded-lg flex items-center justify-center text-accent">
                      <Package size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary">{asset.name}</p>
                      <p className="text-[10px] text-text-secondary font-mono uppercase tracking-tighter">{asset.assetId}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setFormData({ ...formData, assetId: asset.id });
                      setIsModalOpen(true);
                    }}
                    className="text-[10px] font-bold text-accent uppercase tracking-widest hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Allocate Now
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Allocation Guidelines */}
        <div className="bg-bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-white/5">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Calendar size={16} className="text-accent" />
              Allocation Guidelines
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="p-4 bg-bg-deep rounded-lg border border-border">
              <h3 className="text-[10px] font-bold text-accent uppercase tracking-widest mb-3">Important Notice</h3>
              <ul className="text-xs text-text-secondary space-y-3">
                <li className="flex gap-2">
                  <div className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                  Ensure the recipient staff member is registered in the system.
                </li>
                <li className="flex gap-2">
                  <div className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                  Verify the asset condition before final allocation.
                </li>
                <li className="flex gap-2">
                  <div className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                  The system automatically updates asset status to "Allocated".
                </li>
                <li className="flex gap-2">
                  <div className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                  Allocation history is preserved for institutional auditing.
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-text-primary uppercase tracking-widest">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-bg-deep rounded-lg border border-border">
                  <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">Allocated Month</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">12</p>
                </div>
                <div className="p-4 bg-bg-deep rounded-lg border border-border">
                  <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">Pending Returns</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">5</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Allocation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-deep/80 backdrop-blur-sm">
          <div className="bg-bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-white/5">
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">New Asset Allocation</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-text-primary"><XCircle size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Select Asset</label>
                <select 
                  required
                  value={formData.assetId}
                  onChange={(e) => setFormData({...formData, assetId: e.target.value})}
                  className="w-full px-4 py-2 bg-bg-deep border border-border rounded-lg focus:ring-1 focus:ring-accent outline-none text-sm text-text-primary"
                >
                  <option value="">Choose an available asset...</option>
                  {availableAssets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.assetId})</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Assign To (Staff)</label>
                <select 
                  required
                  value={formData.userId}
                  onChange={(e) => setFormData({...formData, userId: e.target.value})}
                  className="w-full px-4 py-2 bg-bg-deep border border-border rounded-lg focus:ring-1 focus:ring-accent outline-none text-sm text-text-primary"
                >
                  <option value="">Select staff member...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} - {u.role}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Allocation Notes</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  placeholder="e.g. Assigned for research project in Engineering dept."
                  className="w-full px-4 py-2 bg-bg-deep border border-border rounded-lg focus:ring-1 focus:ring-accent outline-none text-sm text-text-primary resize-none"
                />
              </div>

              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <button 
                  type="submit"
                  className="btn-accent w-full py-3"
                >
                  Confirm Allocation
                </button>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-2 text-text-secondary text-xs font-bold uppercase tracking-widest hover:text-text-primary transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
