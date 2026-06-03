import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Category, Asset, AssetRequest } from '../types';
import { Plus, X, Loader2, Check, Clock, XCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const AssetRequestPage: React.FC = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [myRequests, setMyRequests] = useState<AssetRequest[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');

  useEffect(() => {
    let unsubCats: () => void;
    let unsubAssets: () => void;
    let unsubReqs: () => void;

    const setup = async () => {
      setLoading(true);
      try {
        unsubCats = api.metadata.subscribeCategories(setCategories, () => {});
        unsubAssets = api.assets.subscribe(setAssets, () => {});
        if (user) {
          unsubReqs = api.requests.subscribeByUser(user.uid, setMyRequests, () => {});
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    setup();

    return () => {
      if (unsubCats) unsubCats();
      if (unsubAssets) unsubAssets();
      if (unsubReqs) unsubReqs();
    };
  }, [user]);

  const availableCounts = categories.map(cat => {
    const count = assets.filter(a => a.categoryId === cat.id && a.status === 'Available').length;
    return { ...cat, available: count };
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedCategoryId || !quantity || !reason) return;
    
    const category = categories.find(c => c.id === selectedCategoryId);
    if (!category) return;

    setSubmitting(true);
    try {
      await api.requests.create({
        requesterId: user.id,
        requesterName: user.name,
        departmentId: user.departmentId,
        departmentName: user.departmentId, // We should map this properly, but for now we'll just send the ID and fix it if possible
        categoryId: category.id,
        categoryName: category.name,
        quantity,
        reason,
      });
      toast.success('Asset request submitted successfully');
      setIsModalOpen(false);
      setQuantity(1);
      setReason('');
      setSelectedCategoryId('');
    } catch (err) {
      toast.error('Failed to submit request');
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="page-title">
          <h1 className="text-2xl font-bold text-text-primary">Asset Requests</h1>
          <p className="text-text-secondary text-sm">Request new assets and track approval status.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-accent flex items-center gap-2"
        >
          <Plus size={18} />
          New Request
        </button>
      </div>

      <div className="bg-bg-card p-6 rounded-xl border border-border shadow-sm">
        <h2 className="text-sm font-bold text-text-primary uppercase tracking-widest mb-4">My Requests</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Quantity</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Admin Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-text-secondary">Loading requests...</td></tr>
              ) : myRequests.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-text-secondary italic">No asset requests found.</td></tr>
              ) : (
                myRequests.map(req => (
                  <tr key={req.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Just now'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-text-primary">
                      {req.categoryName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {req.status === 'Approved' || req.status === 'Fulfilled' 
                        ? <span className="text-accent font-bold">{req.approvedQuantity}</span> 
                        : req.quantity} {req.status === 'Approved' ? '(Approved)' : '(Requested)'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary max-w-xs truncate" title={req.adminNotes}>
                      {req.adminNotes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-deep/80 backdrop-blur-sm">
          <div className="bg-bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-white/5">
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Request Asset</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">Asset Category</label>
                <select 
                  required
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-bg-deep border border-border rounded-lg outline-none text-sm text-text-primary focus:border-accent transition-all font-medium"
                >
                  <option value="">Select Category...</option>
                  {availableCounts.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.available} available)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">Quantity Required</label>
                <input 
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 bg-bg-deep border border-border rounded-lg outline-none text-sm text-text-primary focus:border-accent transition-all font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">Reason for Request</label>
                <textarea 
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why these assets are needed..."
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
                  Submit Request
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
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
