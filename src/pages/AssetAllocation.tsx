import React, { useEffect, useState } from 'react';
import { 
  ArrowLeftRight, 
  User, 
  Package, 
  CheckCircle2, 
  XCircle,
  Loader2,
  X,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { Asset, User as UserType, AssetRequest } from '../types';

export const AssetAllocation: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [requests, setRequests] = useState<AssetRequest[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AssetRequest | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    assetId: '',
    userId: '', // Will be pre-filled from request
    notes: ''
  });

  useEffect(() => {
    let unsubscribeAssets: () => void;
    let unsubscribeReqs: () => void;
    let unsubscribeUsers: () => void;

    const setupSubscriptions = async () => {
      setLoading(true);
      try {
        const [assetsData, usersData, reqsData] = await Promise.all([
          api.assets.list(),
          api.metadata.users(),
          api.requests.list()
        ]);
        setAssets(assetsData);
        setUsers(usersData);
        setRequests(reqsData);
        setLoading(false);

        unsubscribeAssets = api.assets.subscribe(setAssets, (err) => console.error(err));
        unsubscribeUsers = api.metadata.subscribeUsers(setUsers, (err) => console.error(err));
        unsubscribeReqs = api.requests.subscribe(setRequests, (err) => console.error(err));
      } catch (err) {
        console.error('Failed to fetch allocation data', err);
        setLoading(false);
      }
    };

    setupSubscriptions();

    return () => {
      if (unsubscribeAssets) unsubscribeAssets();
      if (unsubscribeReqs) unsubscribeReqs();
      if (unsubscribeUsers) unsubscribeUsers();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      await api.allocations.create(formData);
      await api.assets.update(formData.assetId, { status: 'Allocated' });
      await api.requests.fulfill(selectedRequest.id);
      
      toast.success('Asset allocated successfully');
      setIsModalOpen(false);
      setSelectedRequest(null);
      setFormData({ assetId: '', userId: '', notes: '' });
    } catch (err: any) {
      console.error('Allocation Error:', err);
      let message = 'Failed to allocate asset';
      try {
        const parsed = JSON.parse(err.message);
        message = parsed.error;
      } catch (e) {
        message = err.message || message;
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const approvedRequests = requests.filter(r => r.status === 'Approved');
  const disapprovedRequests = requests.filter(r => r.status === 'Disapproved');

  // Filter assets based on the selected request's category
  const availableAssetsForRequest = selectedRequest 
    ? assets.filter(a => a.status === 'Available' && a.categoryId === selectedRequest.categoryId)
    : [];

  const openAllocationModal = (req: AssetRequest) => {
    setSelectedRequest(req);
    setFormData({
      assetId: '',
      userId: req.requesterId,
      notes: `Fulfilling request for ${req.categoryName}. Admin Notes: ${req.adminNotes || 'None'}`
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Asset Allocation</h1>
          <p className="text-text-secondary text-sm">Fulfill approved asset requests.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Approved Requests List */}
        <div className="bg-bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="px-6 py-4 border-b border-border bg-white/5 flex items-center justify-between shrink-0">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              Approved Requests
            </h2>
            <span className="text-[10px] font-bold bg-green-500/10 text-green-500 px-2 py-1 rounded-full uppercase tracking-widest">
              {approvedRequests.length} Pending Allocation
            </span>
          </div>
          <div className="divide-y divide-border overflow-y-auto custom-scrollbar flex-1">
            {loading ? (
              <div className="p-12 text-center text-text-secondary"><Loader2 className="animate-spin mx-auto" /></div>
            ) : approvedRequests.length === 0 ? (
              <div className="p-12 text-center text-text-secondary italic text-sm">No approved requests waiting for allocation.</div>
            ) : (
              approvedRequests.map((req) => (
                <div key={req.id} className="p-4 hover:bg-white/5 transition-colors flex flex-col gap-3 group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center text-green-500">
                        <Package size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-primary">{req.requesterName}</p>
                        <p className="text-[10px] text-text-secondary uppercase tracking-widest">{req.categoryName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-accent">Qty: {req.approvedQuantity}</div>
                      <div className="text-[10px] text-text-secondary">{new Date(req.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  {req.adminNotes && (
                    <div className="text-xs text-text-secondary bg-bg-deep p-2 rounded border border-border">
                      <span className="font-bold text-text-primary mr-1">Admin Note:</span>
                      {req.adminNotes}
                    </div>
                  )}
                  <button 
                    onClick={() => openAllocationModal(req)}
                    className="btn-accent w-full py-2 text-xs uppercase tracking-widest font-bold"
                  >
                    Allocate Assets
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Disapproved Requests List */}
        <div className="bg-bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="px-6 py-4 border-b border-border bg-white/5 flex items-center justify-between shrink-0">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <XCircle size={16} className="text-red-500" />
              Disapproved Requests
            </h2>
            <span className="text-[10px] font-bold bg-red-500/10 text-red-500 px-2 py-1 rounded-full uppercase tracking-widest">
              {disapprovedRequests.length} Rejected
            </span>
          </div>
          <div className="divide-y divide-border overflow-y-auto custom-scrollbar flex-1">
            {loading ? (
              <div className="p-12 text-center text-text-secondary"><Loader2 className="animate-spin mx-auto" /></div>
            ) : disapprovedRequests.length === 0 ? (
              <div className="p-12 text-center text-text-secondary italic text-sm">No disapproved requests.</div>
            ) : (
              disapprovedRequests.map((req) => (
                <div key={req.id} className="p-4 hover:bg-white/5 transition-colors flex flex-col gap-3 opacity-75">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center text-red-500">
                        <XCircle size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-primary line-through">{req.requesterName}</p>
                        <p className="text-[10px] text-text-secondary uppercase tracking-widest">{req.categoryName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded">REJECTED</div>
                      <div className="text-[10px] text-text-secondary mt-1">{new Date(req.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  {req.adminNotes && (
                    <div className="text-xs text-red-400 bg-red-500/5 p-2 rounded border border-red-500/20">
                      <span className="font-bold mr-1">Reason:</span>
                      {req.adminNotes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Allocation Modal */}
      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-deep/80 backdrop-blur-sm">
          <div className="bg-bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-white/5">
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Fulfill Allocation</h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedRequest(null);
                }} 
                className="text-text-secondary hover:text-text-primary"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
                <div className="text-xs text-accent font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                  <AlertCircle size={14} /> Request Details
                </div>
                <div className="text-sm text-text-secondary space-y-1">
                  <p><span className="text-text-primary font-bold">Requester:</span> {selectedRequest.requesterName}</p>
                  <p><span className="text-text-primary font-bold">Category:</span> {selectedRequest.categoryName}</p>
                  <p><span className="text-text-primary font-bold">Approved Qty:</span> <span className="text-accent font-bold">{selectedRequest.approvedQuantity}</span></p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Select Available Asset</label>
                <select 
                  required
                  value={formData.assetId}
                  onChange={(e) => setFormData({...formData, assetId: e.target.value})}
                  className="w-full px-4 py-2 bg-bg-deep border border-border rounded-lg focus:ring-1 focus:ring-accent outline-none text-sm text-text-primary"
                >
                  <option value="">Choose an available {selectedRequest.categoryName}...</option>
                  {availableAssetsForRequest.map(a => <option key={a.id} value={a.id}>{a.name} ({a.assetId})</option>)}
                </select>
                {availableAssetsForRequest.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">No available assets in this category.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Allocation Notes</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2 bg-bg-deep border border-border rounded-lg focus:ring-1 focus:ring-accent outline-none text-sm text-text-primary resize-none"
                />
              </div>

              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <button 
                  disabled={submitting || availableAssetsForRequest.length === 0}
                  type="submit"
                  className="btn-accent w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {submitting ? 'Allocating...' : 'Confirm Allocation'}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedRequest(null);
                  }}
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
