import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AssetRequest } from '../types';
import { Check, X, Loader2, Clock, XCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const RequestApproval: React.FC = () => {
  const [requests, setRequests] = useState<AssetRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [activeModal, setActiveModal] = useState<'approve' | 'disapprove' | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AssetRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [approvedQuantity, setApprovedQuantity] = useState(1);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    let unsubReqs: () => void;
    const setup = async () => {
      setLoading(true);
      try {
        unsubReqs = api.requests.subscribe(setRequests, () => {});
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    setup();

    return () => {
      if (unsubReqs) unsubReqs();
    };
  }, []);

  const pendingRequests = requests.filter(r => r.status === 'Pending');
  const processedRequests = requests.filter(r => r.status !== 'Pending');

  const openApproveModal = (req: AssetRequest) => {
    setSelectedRequest(req);
    setApprovedQuantity(req.quantity);
    setAdminNotes('');
    setActiveModal('approve');
  };

  const openDisapproveModal = (req: AssetRequest) => {
    setSelectedRequest(req);
    setAdminNotes('');
    setActiveModal('disapprove');
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    
    setSubmitting(true);
    try {
      await api.requests.approve(selectedRequest.id, approvedQuantity, adminNotes);
      toast.success('Request approved successfully');
      setActiveModal(null);
    } catch (err) {
      toast.error('Failed to approve request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisapprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !adminNotes.trim()) return;
    
    setSubmitting(true);
    try {
      await api.requests.disapprove(selectedRequest.id, adminNotes);
      toast.success('Request disapproved');
      setActiveModal(null);
    } catch (err) {
      toast.error('Failed to disapprove request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: AssetRequest['status']) => {
    switch (status) {
      case 'Pending':
        return <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] font-bold uppercase tracking-widest rounded flex items-center gap-1 w-fit"><Clock size={12} /> Pending</span>;
      case 'Approved':
        return <span className="px-2 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-bold uppercase tracking-widest rounded flex items-center gap-1 w-fit"><Check size={12} /> Approved</span>;
      case 'Disapproved':
        return <span className="px-2 py-1 bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-bold uppercase tracking-widest rounded flex items-center gap-1 w-fit"><XCircle size={12} /> Disapproved</span>;
      case 'Fulfilled':
        return <span className="px-2 py-1 bg-green-500/10 text-green-500 border border-green-500/20 text-[10px] font-bold uppercase tracking-widest rounded flex items-center gap-1 w-fit"><CheckCircle size={12} /> Fulfilled</span>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="page-title">
        <h1 className="text-2xl font-bold text-text-primary">Request Approval</h1>
        <p className="text-text-secondary text-sm">Review and manage asset requests from staff and departments.</p>
      </div>

      <div className="bg-bg-card p-6 rounded-xl border border-border shadow-sm">
        <h2 className="text-sm font-bold text-text-primary uppercase tracking-widest mb-4">Pending Requests</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Requester</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Quantity</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Reason</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-text-secondary">Loading requests...</td></tr>
              ) : pendingRequests.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-text-secondary italic">No pending requests.</td></tr>
              ) : (
                pendingRequests.map(req => (
                  <tr key={req.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Just now'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-text-primary">{req.requesterName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-text-primary">
                      {req.categoryName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary font-bold text-accent">
                      {req.quantity}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary max-w-xs truncate" title={req.reason}>
                      {req.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openApproveModal(req)}
                          className="p-2 hover:bg-blue-500/10 text-text-secondary hover:text-blue-500 rounded-lg transition-colors"
                          title="Approve"
                        >
                          <Check size={18} />
                        </button>
                        <button 
                          onClick={() => openDisapproveModal(req)}
                          className="p-2 hover:bg-red-500/10 text-text-secondary hover:text-red-500 rounded-lg transition-colors"
                          title="Disapprove"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-bg-card p-6 rounded-xl border border-border shadow-sm">
        <h2 className="text-sm font-bold text-text-primary uppercase tracking-widest mb-4">Processed Requests</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Requester</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Admin Notes</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Reviewed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {processedRequests.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-text-secondary italic">No processed requests.</td></tr>
              ) : (
                processedRequests.map(req => (
                  <tr key={req.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-text-primary">{req.requesterName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-text-primary">
                      {req.categoryName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(req.status)}
                      {req.status === 'Approved' && (
                        <div className="text-[10px] text-text-secondary mt-1">Qty: {req.approvedQuantity}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary max-w-xs truncate" title={req.adminNotes}>
                      {req.adminNotes || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">
                      {req.reviewedByName || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeModal === 'approve' && selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-deep/80 backdrop-blur-sm">
          <div className="bg-bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-white/5">
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Approve Request</h2>
              <button onClick={() => setActiveModal(null)} className="text-text-secondary hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleApprove} className="p-6 space-y-4">
              <div className="bg-white/5 p-4 rounded-lg border border-border mb-4 space-y-2 text-sm text-text-secondary">
                <div><span className="font-bold text-text-primary">Requester:</span> {selectedRequest.requesterName}</div>
                <div><span className="font-bold text-text-primary">Category:</span> {selectedRequest.categoryName}</div>
                <div><span className="font-bold text-text-primary">Requested Qty:</span> <span className="text-accent">{selectedRequest.quantity}</span></div>
                <div><span className="font-bold text-text-primary">Reason:</span> {selectedRequest.reason}</div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">Approved Quantity</label>
                <input 
                  type="number"
                  min="1"
                  required
                  value={approvedQuantity}
                  onChange={(e) => setApprovedQuantity(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 bg-bg-deep border border-border rounded-lg outline-none text-sm text-text-primary focus:border-accent transition-all font-medium"
                />
                <p className="text-xs text-text-secondary">You can adjust the quantity before approving.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">Admin Notes (Optional)</label>
                <textarea 
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any instructions for the storekeeper..."
                  className="w-full px-4 py-2.5 bg-bg-deep border border-border rounded-lg outline-none text-sm text-text-primary focus:border-accent transition-all font-medium resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  disabled={submitting}
                  type="submit" 
                  className="flex-1 btn-accent py-3 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Approve
                </button>
                <button 
                  type="button" 
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-3 text-text-secondary text-[10px] font-bold uppercase tracking-widest hover:text-text-primary transition-all rounded-xl border border-transparent hover:border-border"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'disapprove' && selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-deep/80 backdrop-blur-sm">
          <div className="bg-bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-white/5">
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Disapprove Request</h2>
              <button onClick={() => setActiveModal(null)} className="text-text-secondary hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleDisapprove} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">Reason for Disapproval</label>
                <textarea 
                  required
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Explain why this request is rejected..."
                  className="w-full px-4 py-2.5 bg-bg-deep border border-border rounded-lg outline-none text-sm text-text-primary focus:border-accent transition-all font-medium resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  disabled={submitting}
                  type="submit" 
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                  Disapprove
                </button>
                <button 
                  type="button" 
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-3 text-text-secondary text-[10px] font-bold uppercase tracking-widest hover:text-text-primary transition-all rounded-xl border border-transparent hover:border-border"
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
