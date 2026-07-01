import React, { useEffect, useMemo, useState } from 'react';
import { Check, Clock, Loader2, Package, Plus, Send, X, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { departmentRequestApi } from '../services/departmentRequestApi';
import { Asset, Category, Department, DepartmentAssetRequest, DeptRequestStatus } from '../types';

type DraftItem = {
  categoryId: string;
  quantity: number;
  notes: string;
};

const statusStyles: Record<DeptRequestStatus, string> = {
  Pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  'Admin Approved': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Admin Rejected': 'bg-red-500/10 text-red-600 border-red-500/20',
  'Storekeeper Acknowledged': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Assets Released': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Fulfilled: 'bg-green-500/10 text-green-600 border-green-500/20',
};

export const AssetRequestPage: React.FC = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [requests, setRequests] = useState<DepartmentAssetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([{ categoryId: '', quantity: 1, notes: '' }]);
  const [reason, setReason] = useState('');
  const [urgency, setUrgency] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');

  useEffect(() => {
    if (!user) return;

    let unsubCats: () => void;
    let unsubDepts: () => void;
    let unsubAssets: () => void;
    let unsubReqs: () => void;

    const setup = async () => {
      setLoading(true);
      try {
        unsubCats = api.metadata.subscribeCategories(setCategories, console.error);
        unsubDepts = api.metadata.subscribeDepartments(setDepartments, console.error);
        unsubAssets = api.assets.subscribe(setAssets, console.error);
        unsubReqs = departmentRequestApi.subscribeByRequester(user.id, setRequests, console.error);
      } finally {
        setLoading(false);
      }
    };

    setup();
    return () => {
      if (unsubCats) unsubCats();
      if (unsubDepts) unsubDepts();
      if (unsubAssets) unsubAssets();
      if (unsubReqs) unsubReqs();
    };
  }, [user]);

  useEffect(() => {
    if (user && !selectedDepartmentId) {
      setSelectedDepartmentId(user.departmentId);
    }
  }, [selectedDepartmentId, user]);

  const selectedDepartmentName = useMemo(() => {
    return departments.find((department) => department.id === selectedDepartmentId)?.name || selectedDepartmentId;
  }, [departments, selectedDepartmentId]);

  const availableByCategory = useMemo(() => {
    return categories.map((category) => ({
      ...category,
      available: assets.filter((asset) => asset.categoryId === category.id && asset.status === 'Available').length,
    }));
  }, [assets, categories]);

  const resetForm = () => {
    setItems([{ categoryId: '', quantity: 1, notes: '' }]);
    setReason('');
    setUrgency('Medium');
    setSelectedDepartmentId(user?.departmentId || '');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !reason.trim() || !selectedDepartmentId) return;

    const requestItems = items
      .filter((item) => item.categoryId && item.quantity > 0)
      .map((item) => {
        const category = categories.find((cat) => cat.id === item.categoryId);
        return {
          assetCategoryId: item.categoryId,
          assetCategoryName: category?.name || item.categoryId,
          quantityRequested: item.quantity,
          itemNotes: item.notes,
        };
      });

    if (requestItems.length === 0) {
      toast.error('Add at least one asset category');
      return;
    }

    setSubmitting(true);
    try {
      await departmentRequestApi.create({
        requestingDepartmentId: selectedDepartmentId,
        requestingDepartmentName: selectedDepartmentName,
        requestedByUserId: user.id,
        requestedByUserName: user.name,
        requestedByUserRole: user.role,
        reason,
        urgency,
        items: requestItems,
      });
      toast.success('Department request sent to admin');
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to submit department request');
    } finally {
      setSubmitting(false);
    }
  };

  const updateItem = (index: number, update: Partial<DraftItem>) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...update } : item));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="page-title">
          <h1 className="text-2xl font-bold text-text-primary">Department Asset Requests</h1>
          <p className="text-text-secondary text-sm">View available assets and submit requests to departments configured by admin.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-accent flex items-center justify-center gap-2">
          <Plus size={18} />
          New Department Request
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {availableByCategory.map((category) => (
          <div key={category.id} className="bg-bg-card p-5 rounded-xl border border-border">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-text-secondary">Available</p>
                <h2 className="text-sm font-bold text-text-primary mt-1">{category.name}</h2>
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center text-lg font-black text-text-primary">
                {category.available}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-bg-card p-6 rounded-xl border border-border shadow-sm">
        <h2 className="text-sm font-bold text-text-primary uppercase tracking-widest mb-4">My Submitted Requests</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Department</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Items</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Urgency</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Latest Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-text-secondary">Loading requests...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-text-secondary italic">No department requests yet.</td></tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'Just now'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                      {request.requestingDepartmentName}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-primary">
                      {request.items.map((item) => `${item.assetCategoryName} x${item.quantityRequested}`).join(', ')}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-widest">{request.urgency}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 border text-[10px] font-bold uppercase tracking-widest rounded flex items-center gap-1 w-fit ${statusStyles[request.status]}`}>
                        {request.status === 'Admin Rejected' ? <XCircle size={12} /> : request.status === 'Assets Released' ? <Check size={12} /> : <Clock size={12} />}
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary max-w-xs truncate">
                      {request.releaseNotes || request.storekeeperAcknowledgmentNotes || request.adminApprovalNotes || request.adminRejectionReason || '-'}
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
          <div className="bg-bg-card w-full max-w-2xl rounded-xl shadow-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-white/5">
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <Package size={16} className="text-accent" />
                New Department Request
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-text-primary">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">Department</label>
                  <select required value={selectedDepartmentId} onChange={(event) => setSelectedDepartmentId(event.target.value)} className="w-full px-4 py-2.5 bg-bg-deep border border-border rounded-lg outline-none text-sm text-text-primary focus:border-accent">
                    <option value="">Select department...</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>{department.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">Urgency</label>
                  <select value={urgency} onChange={(event) => setUrgency(event.target.value as 'Low' | 'Medium' | 'High')} className="w-full px-4 py-2.5 bg-bg-deep border border-border rounded-lg outline-none text-sm text-text-primary focus:border-accent">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_110px_1fr_40px] gap-3">
                    <select required value={item.categoryId} onChange={(event) => updateItem(index, { categoryId: event.target.value })} className="px-4 py-2.5 bg-bg-deep border border-border rounded-lg outline-none text-sm text-text-primary focus:border-accent">
                      <option value="">Select category...</option>
                      {availableByCategory.map((category) => <option key={category.id} value={category.id}>{category.name} ({category.available} available)</option>)}
                    </select>
                    <input type="number" min={1} required value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} className="px-4 py-2.5 bg-bg-deep border border-border rounded-lg outline-none text-sm text-text-primary focus:border-accent" />
                    <input value={item.notes} onChange={(event) => updateItem(index, { notes: event.target.value })} placeholder="Item notes" className="px-4 py-2.5 bg-bg-deep border border-border rounded-lg outline-none text-sm text-text-primary focus:border-accent" />
                    <button type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} disabled={items.length === 1} className="p-2.5 border border-border rounded-lg text-text-secondary hover:text-red-500 disabled:opacity-40">
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => setItems((current) => [...current, { categoryId: '', quantity: 1, notes: '' }])} className="text-xs font-bold uppercase tracking-widest text-accent hover:opacity-80">
                  Add another item
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">Reason for Request</label>
                <textarea required rows={3} value={reason} onChange={(event) => setReason(event.target.value)} className="w-full px-4 py-2.5 bg-bg-deep border border-border rounded-lg outline-none text-sm text-text-primary focus:border-accent resize-none" />
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <button disabled={submitting} type="submit" className="flex-1 btn-accent py-3 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Submit to Admin
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-text-secondary text-[10px] font-bold uppercase tracking-widest hover:text-text-primary rounded-xl border border-transparent hover:border-border">
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
