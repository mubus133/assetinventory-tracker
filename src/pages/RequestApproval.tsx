import React, { useEffect, useMemo, useState } from 'react';
import { Check, CheckSquare, Clock, Loader2, PackageCheck, Send, X, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { departmentRequestApi } from '../services/departmentRequestApi';
import { Asset, DepartmentAssetRequest, DeptRequestStatus } from '../types';

type ModalMode = 'approve' | 'reject' | 'acknowledge' | 'release' | null;

const statusStyles: Record<DeptRequestStatus, string> = {
  Pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  'Admin Approved': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Admin Rejected': 'bg-red-500/10 text-red-600 border-red-500/20',
  'Storekeeper Acknowledged': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Assets Released': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Fulfilled: 'bg-green-500/10 text-green-600 border-green-500/20',
};

export const RequestApproval: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<DepartmentAssetRequest[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedRequest, setSelectedRequest] = useState<DepartmentAssetRequest | null>(null);
  const [notes, setNotes] = useState('');
  const [approvedQuantities, setApprovedQuantities] = useState<Record<number, number>>({});
  const [selectedAssets, setSelectedAssets] = useState<Record<number, string[]>>({});

  const isAdmin = user?.role === 'Admin';
  const isStoreOfficer = user?.role === 'Store Officer' || user?.role === 'Inventory Officer';

  useEffect(() => {
    let unsubReqs: () => void;
    let unsubAssets: () => void;

    const setup = async () => {
      setLoading(true);
      try {
        unsubReqs = departmentRequestApi.subscribe(setRequests, console.error);
        unsubAssets = api.assets.subscribe(setAssets, console.error);
      } finally {
        setLoading(false);
      }
    };

    setup();
    return () => {
      if (unsubReqs) unsubReqs();
      if (unsubAssets) unsubAssets();
    };
  }, []);

  const pendingAdmin = requests.filter((request) => request.status === 'Pending');
  const pendingStore = requests.filter((request) => request.status === 'Admin Approved' || request.status === 'Storekeeper Acknowledged');
  const history = requests.filter((request) => request.status === 'Admin Rejected' || request.status === 'Assets Released' || request.status === 'Fulfilled');

  const visiblePrimaryRequests = isAdmin ? pendingAdmin : isStoreOfficer ? pendingStore : [];

  const openModal = (mode: ModalMode, request: DepartmentAssetRequest) => {
    setSelectedRequest(request);
    setNotes('');
    setModalMode(mode);
    setApprovedQuantities(
      request.items.reduce<Record<number, number>>((acc, item, index) => {
        acc[index] = item.quantityApproved ?? item.quantityRequested;
        return acc;
      }, {})
    );
    setSelectedAssets({});
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedRequest(null);
    setNotes('');
    setApprovedQuantities({});
    setSelectedAssets({});
  };

  const handleApprove = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRequest) return;

    setSubmitting(true);
    try {
      await departmentRequestApi.adminApprove(
        selectedRequest.id,
        notes,
        selectedRequest.items.map((_, index) => ({ index, quantityApproved: approvedQuantities[index] || 0 }))
      );
      toast.success('Request approved for store officer');
      closeModal();
    } catch (error) {
      toast.error('Failed to approve request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRequest || !notes.trim()) return;

    setSubmitting(true);
    try {
      await departmentRequestApi.adminReject(selectedRequest.id, notes);
      toast.success('Request rejected');
      closeModal();
    } catch (error) {
      toast.error('Failed to reject request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledge = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRequest) return;

    setSubmitting(true);
    try {
      await departmentRequestApi.storekeeperAcknowledge(selectedRequest.id, notes);
      toast.success('Request acknowledged');
      closeModal();
    } catch (error) {
      toast.error('Failed to acknowledge request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRelease = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRequest) return;

    const selections = selectedRequest.items.map((_, itemIndex) => ({
      itemIndex,
      selectedAssetIds: selectedAssets[itemIndex] || [],
    }));
    const missingSelection = selectedRequest.items.some((item, itemIndex) => {
      const required = item.quantityApproved || 0;
      return required > 0 && (selectedAssets[itemIndex] || []).length === 0;
    });

    if (missingSelection) {
      toast.error('Select at least one asset for every approved item');
      return;
    }

    setSubmitting(true);
    try {
      await departmentRequestApi.releaseAssets(selectedRequest.id, notes, selections);
      toast.success('Assets released and marked available for the department');
      closeModal();
    } catch (error) {
      toast.error('Failed to release assets');
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: DeptRequestStatus) => (
    <span className={`px-2 py-1 border text-[10px] font-bold uppercase tracking-widest rounded flex items-center gap-1 w-fit ${statusStyles[status]}`}>
      {status === 'Admin Rejected' ? <XCircle size={12} /> : status === 'Assets Released' ? <Check size={12} /> : <Clock size={12} />}
      {status}
    </span>
  );

  const renderRequestRows = (list: DepartmentAssetRequest[], showActions: boolean) => (
    <tbody className="divide-y divide-border">
      {loading ? (
        <tr><td colSpan={6} className="px-6 py-8 text-center text-text-secondary">Loading requests...</td></tr>
      ) : list.length === 0 ? (
        <tr><td colSpan={6} className="px-6 py-8 text-center text-text-secondary italic">No requests in this queue.</td></tr>
      ) : (
        list.map((request) => (
          <tr key={request.id} className="hover:bg-white/5 transition-colors">
            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
              {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'Just now'}
            </td>
            <td className="px-6 py-4">
              <div className="font-bold text-text-primary">{request.requestingDepartmentName}</div>
              <div className="text-[10px] text-text-secondary uppercase tracking-widest">{request.requestedByUserName}</div>
            </td>
            <td className="px-6 py-4 text-sm text-text-primary max-w-sm">
              {request.items.map((item) => `${item.assetCategoryName} x${item.quantityApproved ?? item.quantityRequested}`).join(', ')}
            </td>
            <td className="px-6 py-4">{statusBadge(request.status)}</td>
            <td className="px-6 py-4 text-sm text-text-secondary max-w-xs truncate" title={request.reason}>{request.reason}</td>
            <td className="px-6 py-4 whitespace-nowrap text-right">
              {showActions && isAdmin && request.status === 'Pending' && (
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => openModal('approve', request)} className="p-2 hover:bg-blue-500/10 text-text-secondary hover:text-blue-500 rounded-lg" title="Approve">
                    <Check size={18} />
                  </button>
                  <button onClick={() => openModal('reject', request)} className="p-2 hover:bg-red-500/10 text-text-secondary hover:text-red-500 rounded-lg" title="Reject">
                    <X size={18} />
                  </button>
                </div>
              )}
              {showActions && isStoreOfficer && request.status === 'Admin Approved' && (
                <button onClick={() => openModal('acknowledge', request)} className="btn-accent text-[10px] uppercase tracking-widest">Acknowledge</button>
              )}
              {showActions && isStoreOfficer && request.status === 'Storekeeper Acknowledged' && (
                <button onClick={() => openModal('release', request)} className="btn-accent text-[10px] uppercase tracking-widest">Release</button>
              )}
            </td>
          </tr>
        ))
      )}
    </tbody>
  );

  const releaseAssetOptions = useMemo(() => {
    if (!selectedRequest) return {};

    return selectedRequest.items.reduce<Record<number, Asset[]>>((acc, item, index) => {
      acc[index] = assets.filter((asset) => asset.status === 'Available' && asset.categoryId === item.assetCategoryId);
      return acc;
    }, {});
  }, [assets, selectedRequest]);

  return (
    <div className="space-y-8">
      <div className="page-title">
        <h1 className="text-2xl font-bold text-text-primary">Department Request Workflow</h1>
        <p className="text-text-secondary text-sm">
          {isAdmin ? 'Approve department asset requests before store release.' : 'Acknowledge approved requests and release available assets.'}
        </p>
      </div>

      <div className="bg-bg-card p-6 rounded-xl border border-border shadow-sm">
        <h2 className="text-sm font-bold text-text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
          <CheckSquare size={16} className="text-accent" />
          {isAdmin ? 'Admin Approval Queue' : 'Store Officer Release Queue'}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Department</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Items</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Reason</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            {renderRequestRows(visiblePrimaryRequests, true)}
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
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Department</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Items</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Reason</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            {renderRequestRows(history, false)}
          </table>
        </div>
      </div>

      {modalMode && selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-deep/80 backdrop-blur-sm">
          <div className="bg-bg-card w-full max-w-2xl rounded-xl shadow-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-white/5">
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <PackageCheck size={16} className="text-accent" />
                {modalMode === 'approve' && 'Approve Request'}
                {modalMode === 'reject' && 'Reject Request'}
                {modalMode === 'acknowledge' && 'Acknowledge Request'}
                {modalMode === 'release' && 'Release Assets'}
              </h2>
              <button onClick={closeModal} className="text-text-secondary hover:text-text-primary"><X size={20} /></button>
            </div>

            <form onSubmit={modalMode === 'approve' ? handleApprove : modalMode === 'reject' ? handleReject : modalMode === 'acknowledge' ? handleAcknowledge : handleRelease} className="p-6 space-y-5">
              <div className="bg-bg-deep p-4 rounded-lg border border-border text-sm text-text-secondary space-y-1">
                <p><span className="font-bold text-text-primary">Department:</span> {selectedRequest.requestingDepartmentName}</p>
                <p><span className="font-bold text-text-primary">Requested by:</span> {selectedRequest.requestedByUserName}</p>
                <p><span className="font-bold text-text-primary">Reason:</span> {selectedRequest.reason}</p>
              </div>

              {modalMode === 'approve' && (
                <div className="space-y-3">
                  {selectedRequest.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-[1fr_120px] gap-3 items-center">
                      <div className="text-sm font-bold text-text-primary">{item.assetCategoryName}</div>
                      <input type="number" min={0} max={item.quantityRequested} value={approvedQuantities[index] ?? item.quantityRequested} onChange={(event) => setApprovedQuantities((current) => ({ ...current, [index]: Number(event.target.value) }))} className="px-4 py-2.5 bg-bg-deep border border-border rounded-lg outline-none text-sm text-text-primary focus:border-accent" />
                    </div>
                  ))}
                </div>
              )}

              {modalMode === 'release' && (
                <div className="space-y-4">
                  {selectedRequest.items.map((item, index) => {
                    const max = item.quantityApproved || 0;
                    return (
                      <div key={index} className="space-y-2">
                        <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">
                          {item.assetCategoryName} - select up to {max}
                        </label>
                        <select multiple value={selectedAssets[index] || []} onChange={(event) => {
                          const values = Array.from(event.currentTarget.selectedOptions).map((option: HTMLOptionElement) => option.value).slice(0, max);
                          setSelectedAssets((current) => ({ ...current, [index]: values }));
                        }} className="w-full min-h-28 px-4 py-2.5 bg-bg-deep border border-border rounded-lg outline-none text-sm text-text-primary focus:border-accent">
                          {(releaseAssetOptions[index] || []).map((asset) => (
                            <option key={asset.id} value={asset.id}>{asset.name} ({asset.assetId})</option>
                          ))}
                        </select>
                        {(releaseAssetOptions[index] || []).length === 0 && <p className="text-xs text-red-500">No available assets in this category.</p>}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">
                  {modalMode === 'reject' ? 'Rejection Reason' : 'Notes'}
                </label>
                <textarea required={modalMode === 'reject'} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full px-4 py-2.5 bg-bg-deep border border-border rounded-lg outline-none text-sm text-text-primary focus:border-accent resize-none" />
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <button disabled={submitting} type="submit" className="flex-1 btn-accent py-3 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Confirm
                </button>
                <button type="button" onClick={closeModal} className="flex-1 py-3 text-text-secondary text-[10px] font-bold uppercase tracking-widest hover:text-text-primary rounded-xl border border-transparent hover:border-border">
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
