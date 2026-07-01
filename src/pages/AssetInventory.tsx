import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  ExternalLink,
  QrCode,
  Download,
  X,
  Loader2,
  Wrench
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { Asset, Category, Department } from '../types';
import { useAuth } from '../context/AuthContext';

export const AssetInventory: React.FC = () => {
  const { user } = useAuth();
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
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
  const [damageCondition, setDamageCondition] = useState<'Good' | 'Fair' | 'Damaged' | 'Lost'>('Damaged');
  const [damageNotes, setDamageNotes] = useState('');
  const canManageAssets = user?.role === 'Admin' || user?.role === 'Store Officer' || user?.role === 'Inventory Officer';
  
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

  useEffect(() => {
    let unsubscribeAssets: () => void;
    let unsubscribeDepts: () => void;
    let unsubscribeCats: () => void;

    const setupSubscriptions = async () => {
      setLoading(true);
      try {
        const [catsData, deptsData, assetsData] = await Promise.all([
          api.metadata.categories(),
          api.metadata.departments(),
          api.assets.list(),
        ]);
        setCategories(catsData);
        setDepartments(deptsData);
        setAssets(assetsData);
        setLoading(false);

        // Subscriptions
        unsubscribeAssets = api.assets.subscribe(setAssets, (err) => console.error('Asset subscription error:', err));
        unsubscribeDepts = api.metadata.subscribeDepartments(setDepartments, (err) => console.error('Dept subscription error:', err));
        unsubscribeCats = api.metadata.subscribeCategories(setCategories, (err) => console.error('Cat subscription error:', err));

      } catch (err) {
        console.error('Failed to fetch inventory data', err);
        setLoading(false);
      }
    };

    setupSubscriptions();

    return () => {
      if (unsubscribeAssets) unsubscribeAssets();
      if (unsubscribeDepts) unsubscribeDepts();
      if (unsubscribeCats) unsubscribeCats();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.assets.update(editingId, formData);
        toast.success('Asset updated successfully');
      } else {
        await api.assets.create(formData);
        toast.success('Asset registered successfully');
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({
        assetId: '',
        name: '',
        categoryId: '',
        departmentId: '',
        status: 'Available',
        purchaseDate: new Date().toISOString().split('T')[0],
        description: ''
      });
    } catch (err: any) {
      console.error('Asset Save Error:', err);
      let message = 'Failed to save asset';
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

  const handleReportDamage = (asset: Asset) => {
    setSelectedAsset(asset);
    setDamageCondition('Damaged');
    setDamageNotes('');
    setIsDamageModalOpen(true);
  };

  const submitDamageReport = async () => {
    if (!selectedAsset) return;
    setSubmitting(true);
    try {
      await api.assets.update(selectedAsset.id, {
        condition: damageCondition,
        status: (damageCondition === 'Damaged' || damageCondition === 'Lost') ? 'Maintenance' : selectedAsset.status
      });
      toast.success('Condition report updated');
      setIsDamageModalOpen(false);
    } catch (err: any) {
      toast.error('Failed to update condition');
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
      toast.success('Asset deleted successfully');
      setIsDeleteModalOpen(false);
      setAssetToDelete(null);
    } catch (err: any) {
      console.error('Asset Delete Error:', err);
      let message = 'Failed to delete asset';
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

  const getConditionColor = (condition?: string) => {
    switch (condition) {
      case 'Good': return 'text-emerald-500';
      case 'Fair': return 'text-amber-500';
      case 'Damaged': return 'text-red-500';
      case 'Lost': return 'text-slate-400';
      default: return 'text-text-secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Asset Inventory</h1>
          <p className="text-text-secondary text-sm">Manage and track all institutional assets.</p>
        </div>
        {canManageAssets && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-accent flex items-center gap-2"
          >
            <Plus size={18} />
            New Registration
          </button>
        )}
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
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-center">QR</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Condition</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-secondary">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    Loading inventory...
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-secondary italic text-sm">
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
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => {
                          setSelectedAsset(asset);
                          setIsQrModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-accent/10 rounded text-accent transition-colors"
                        title="View Asset QR Code"
                      >
                        <QrCode size={16} />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          asset.condition === 'Good' ? 'bg-emerald-500' :
                          asset.condition === 'Fair' ? 'bg-amber-500' :
                          asset.condition === 'Damaged' ? 'bg-red-500' :
                          'bg-slate-400'
                        }`} />
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${getConditionColor(asset.condition)}`}>
                          {asset.condition || 'New'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setSelectedAsset(asset);
                            setIsDetailsModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-white/10 rounded text-text-secondary hover:text-text-primary"
                          title="View Details"
                        >
                          <ExternalLink size={14} />
                        </button>
                        {canManageAssets && (
                          <>
                            <button
                              onClick={() => handleReportDamage(asset)}
                              className="p-1.5 hover:bg-red-500/10 rounded text-text-secondary hover:text-red-400"
                              title="Report Damage"
                            >
                              <Wrench size={14} />
                            </button>
                            <button
                              onClick={() => handleEdit(asset)}
                              className="p-1.5 hover:bg-white/10 rounded text-text-secondary hover:text-text-primary"
                            >
                              <Edit2 size={14} />
                            </button>
                            {user?.role === 'Admin' && (
                              <button
                                onClick={() => handleDeleteClick(asset.id)}
                                className="p-1.5 hover:bg-red-500/10 rounded text-red-400"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </>
                        )}
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

      {/* Asset Details Modal */}
      {isDetailsModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-bg-deep/90 backdrop-blur-md">
          <div className="bg-bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-white/5">
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-widest flex items-center gap-2">
                <ExternalLink size={16} className="text-accent" />
                Asset Particulars
              </h2>
              <button 
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedAsset(null);
                }} 
                className="text-text-secondary hover:text-text-primary"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-1">Asset Name</label>
                      <p className="text-xl font-bold text-text-primary">{selectedAsset.name}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-1">Unique Identifier</label>
                      <p className="text-lg font-mono font-bold text-accent">{selectedAsset.assetId}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-bg-deep border border-border rounded-xl">
                      <label className="text-[9px] font-bold text-text-secondary uppercase tracking-tighter block mb-1">Institution Dept.</label>
                      <p className="text-xs font-medium text-text-primary">
                        {departments.find(d => d.id === selectedAsset.departmentId)?.name || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-bg-deep border border-border rounded-xl">
                      <label className="text-[9px] font-bold text-text-secondary uppercase tracking-tighter block mb-1">Classification</label>
                      <p className="text-xs font-medium text-text-primary">
                        {categories.find(c => c.id === selectedAsset.categoryId)?.name || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-bg-deep border border-border rounded-xl">
                      <label className="text-[9px] font-bold text-text-secondary uppercase tracking-tighter block mb-1">Current Status</label>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${getStatusColor(selectedAsset.status)}`}>
                        {selectedAsset.status}
                      </span>
                    </div>
                    <div className="p-3 bg-bg-deep border border-border rounded-xl">
                      <label className="text-[9px] font-bold text-text-secondary uppercase tracking-tighter block mb-1">Purchase Date</label>
                      <p className="text-xs font-medium text-text-primary">
                        {new Date(selectedAsset.purchaseDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </p>
                    </div>
                  </div>
                  
                  {selectedAsset.description && (
                    <div className="p-3 bg-bg-deep border border-border rounded-xl">
                      <label className="text-[9px] font-bold text-text-secondary uppercase tracking-tighter block mb-1">Description/Notes</label>
                      <p className="text-xs text-text-secondary italic">{selectedAsset.description}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border-4 border-accent/10 shadow-inner">
                  <QRCodeSVG 
                    value={JSON.stringify({
                      id: selectedAsset.assetId,
                      name: selectedAsset.name
                    })} 
                    size={180}
                    level="H"
                  />
                  <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scan for quick id</p>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-border flex justify-end gap-3">
                <button 
                  onClick={() => {
                    setSelectedAsset(selectedAsset);
                    setIsDetailsModalOpen(false);
                    setIsQrModalOpen(true);
                  }}
                  className="px-4 py-2 bg-accent/10 text-accent rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-accent/20 transition-all flex items-center gap-2"
                >
                  <QrCode size={16} />
                  Print QR Tag
                </button>
                {canManageAssets && (
                  <button
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      handleEdit(selectedAsset);
                    }}
                    className="px-4 py-2 bg-bg-deep border border-border rounded-lg text-xs font-bold text-text-secondary uppercase tracking-widest hover:text-text-primary transition-all flex items-center gap-2"
                  >
                    <Edit2 size={16} />
                    Modify Asset
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {isQrModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-bg-deep/90 backdrop-blur-md">
          <div className="bg-bg-card border border-border w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest">Asset QR Identifier</h3>
              <button 
                onClick={() => {
                  setIsQrModalOpen(false);
                  setSelectedAsset(null);
                }}
                className="text-text-secondary hover:text-text-primary"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-8 flex flex-col items-center gap-6">
              <div className="p-4 bg-white rounded-xl shadow-inner border-4 border-accent/20">
                <QRCodeSVG 
                  id={`qr-${selectedAsset.assetId}`}
                  value={JSON.stringify({
                    id: selectedAsset.assetId,
                    name: selectedAsset.name
                  })} 
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="text-center space-y-2">
                <p className="font-mono text-accent font-bold text-lg leading-tight">{selectedAsset.assetId}</p>
                <p className="text-sm text-text-primary font-medium">{selectedAsset.name}</p>
                <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">
                  {departments.find(d => d.id === selectedAsset.departmentId)?.name}
                </p>
              </div>
              <button 
                onClick={() => {
                  const svg = document.getElementById(`qr-${selectedAsset.assetId}`);
                  if (svg) {
                    const canvas = document.createElement("canvas");
                    const svgData = new XMLSerializer().serializeToString(svg);
                    const img = new Image();
                    img.onload = () => {
                      canvas.width = img.width;
                      canvas.height = img.height;
                      const ctx = canvas.getContext("2d");
                      if (ctx) {
                        ctx.fillStyle = "white";
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0);
                        const pngFile = canvas.toDataURL("image/png");
                        const downloadLink = document.createElement("a");
                        downloadLink.download = `QR_${selectedAsset.assetId}.png`;
                        downloadLink.href = pngFile;
                        downloadLink.click();
                        toast.success('QR Code downloaded');
                      }
                    };
                    img.src = "data:image/svg+xml;base64," + btoa(svgData);
                  }
                }}
                className="w-full btn-accent py-3 flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Download PNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Damage Modal */}
      {isDamageModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-bg-deep/90 backdrop-blur-md">
          <div className="bg-bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500">
                  <Wrench size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary">Update Asset Condition</h3>
                  <p className="text-sm text-text-secondary mt-1">
                    Reporting for: <span className="text-text-primary font-bold">{selectedAsset.name}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Current Condition</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(['Good', 'Fair', 'Damaged', 'Lost'] as const).map((condition) => (
                      <button
                        key={condition}
                        type="button"
                        onClick={() => setDamageCondition(condition)}
                        className={`px-4 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${
                          damageCondition === condition 
                            ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20' 
                            : 'bg-bg-deep border-border text-text-secondary hover:border-red-500/40'
                        }`}
                      >
                        {condition}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Damage Summary / Notes</label>
                  <textarea
                    value={damageNotes}
                    onChange={(e) => setDamageNotes(e.target.value)}
                    placeholder="Describe the issue observed..."
                    className="w-full h-32 px-4 py-3 bg-bg-deep border border-border rounded-xl focus:border-red-500 outline-none transition-all text-sm text-text-primary placeholder:text-text-secondary/30 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-border">
                <button 
                  type="button"
                  onClick={() => {
                    setIsDamageModalOpen(false);
                    setSelectedAsset(null);
                  }}
                  className="flex-1 px-4 py-3 bg-bg-deep border border-border rounded-xl text-xs font-bold text-text-secondary uppercase tracking-widest hover:text-text-primary transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitDamageReport}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Update Condition'}
                </button>
              </div>
            </div>
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
