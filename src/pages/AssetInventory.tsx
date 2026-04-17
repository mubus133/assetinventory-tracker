import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  ExternalLink,
  X,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';
import { Asset, Category, Department } from '../types';

export const AssetInventory: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    assetId: '',
    name: '',
    categoryId: '',
    departmentId: '',
    status: 'Available' as const,
    purchaseDate: new Date().toISOString().split('T')[0],
    description: ''
  });

  const fetchData = async () => {
    setLoading(true);
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
      console.error('Failed to fetch inventory data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.assets.update(editingId, formData);
      } else {
        await api.assets.create(formData);
      }
      setIsModalOpen(false);
      setEditingId(null);
      fetchData();
      setFormData({
        assetId: '',
        name: '',
        categoryId: '',
        departmentId: '',
        status: 'Available',
        purchaseDate: new Date().toISOString().split('T')[0],
        description: ''
      });
    } catch (err) {
      alert('Failed to save asset');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (asset: Asset) => {
    setEditingId(asset.id);
    setFormData({
      assetId: asset.assetId,
      name: asset.name,
      categoryId: asset.categoryId,
      departmentId: asset.departmentId,
      status: asset.status,
      purchaseDate: asset.purchaseDate.split('T')[0],
      description: asset.description
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setAssetToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!assetToDelete) return;
    setSubmitting(true);
    try {
      await api.assets.delete(assetToDelete);
      setIsDeleteModalOpen(false);
      setAssetToDelete(null);
      fetchData();
    } catch (err) {
      alert('Failed to delete asset');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAssets = assets.filter(asset => 
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.assetId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-emerald-500/10 text-success';
      case 'Allocated': return 'bg-accent/10 text-[#a16207]';
      case 'Maintenance': return 'bg-red-500/10 text-red-700';
      default: return 'bg-slate-500/10 text-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Asset Inventory</h1>
          <p className="text-text-secondary text-sm">Manage and track all institutional assets.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-accent flex items-center gap-2"
        >
          <Plus size={18} />
          New Registration
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
          <input 
            type="text"
            placeholder="Search by asset name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-bg-deep border border-border rounded-lg focus:ring-1 focus:ring-accent outline-none transition-all text-sm text-text-primary placeholder:text-text-secondary/50"
          />
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-bg-card border border-border rounded-lg text-text-secondary text-sm flex items-center gap-2 hover:bg-white/5 transition-all">
            <Filter size={16} />
            Filter
          </button>
        </div>
      </div>

      {/* Asset Table */}
      <div className="data-section">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Asset ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Asset Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Department</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-secondary">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    Loading inventory...
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-secondary italic text-sm">
                    No assets found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold text-accent">{asset.assetId}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-text-primary">{asset.name}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-text-secondary">
                      {departments.find(d => d.id === asset.departmentId)?.name || asset.departmentId}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${getStatusColor(asset.status)}`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(asset)}
                          className="p-1.5 hover:bg-white/10 rounded text-text-secondary hover:text-text-primary"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(asset.id)}
                          className="p-1.5 hover:bg-red-500/10 rounded text-red-400"
                        >
                          <Trash2 size={14} />
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

      {/* Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-deep/80 backdrop-blur-sm">
          <div className="bg-bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-white/5">
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                {editingId ? 'Edit Asset Details' : 'Register New Asset'}
              </h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingId(null);
                }} 
                className="text-text-secondary hover:text-text-primary"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Asset ID (Unique)</label>
                  <input 
                    required
                    value={formData.assetId}
                    onChange={(e) => setFormData({...formData, assetId: e.target.value})}
                    placeholder="e.g. CU/ICT/2024/001"
                    className="w-full px-4 py-2 bg-bg-deep border border-border rounded-lg focus:ring-1 focus:ring-accent outline-none text-sm text-text-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Asset Name</label>
                  <input 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Dell Latitude 5420"
                    className="w-full px-4 py-2 bg-bg-deep border border-border rounded-lg focus:ring-1 focus:ring-accent outline-none text-sm text-text-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Category</label>
                  <select 
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                    className="w-full px-4 py-2 bg-bg-deep border border-border rounded-lg focus:ring-1 focus:ring-accent outline-none text-sm text-text-primary"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Department</label>
                  <select 
                    required
                    value={formData.departmentId}
                    onChange={(e) => setFormData({...formData, departmentId: e.target.value})}
                    className="w-full px-4 py-2 bg-bg-deep border border-border rounded-lg focus:ring-1 focus:ring-accent outline-none text-sm text-text-primary"
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button 
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingId(null);
                  }}
                  className="px-6 py-2 text-text-secondary text-xs font-bold uppercase tracking-widest hover:text-text-primary transition-all"
                >
                  Cancel
                </button>
                <button 
                  disabled={submitting}
                  type="submit"
                  className="btn-accent flex items-center gap-2"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {editingId ? 'Save Changes' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-bg-deep/90 backdrop-blur-md">
          <div className="bg-bg-card border border-border w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
                <Trash2 size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary">Confirm Deletion</h3>
                <p className="text-sm text-text-secondary mt-1">
                  Are you sure you want to delete this asset? This action is permanent and cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setAssetToDelete(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-bg-deep border border-border rounded-xl text-xs font-bold text-text-secondary uppercase tracking-widest hover:text-text-primary transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
