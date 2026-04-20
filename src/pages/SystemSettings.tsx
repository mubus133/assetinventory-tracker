import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Check,
  AlertCircle,
  Loader2,
  Building2,
  Tags
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { Department, Category } from '../types';

export const SystemSettings: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Modals / Editing state
  const [activeTab, setActiveTab] = useState<'departments' | 'categories'>('departments');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [customIdInput, setCustomIdInput] = useState('');

  useEffect(() => {
    let unsubscribeDepts: () => void;
    let unsubscribeCats: () => void;

    const setup = async () => {
      setLoading(true);
      try {
        // Initial fetch
        const [depts, cats] = await Promise.all([
          api.metadata.departments(),
          api.metadata.categories()
        ]);
        setDepartments(depts);
        setCategories(cats);
        setLoading(false);

        // Real-time subscriptions
        unsubscribeDepts = api.metadata.subscribeDepartments(setDepartments, (err) => console.error(err));
        unsubscribeCats = api.metadata.subscribeCategories(setCategories, (err) => console.error(err));
      } catch (err) {
        console.error('Failed to load settings', err);
        setLoading(false);
      }
    };

    setup();
    return () => {
      if (unsubscribeDepts) unsubscribeDepts();
      if (unsubscribeCats) unsubscribeCats();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setSubmitting(true);

    try {
      const data = { name: nameInput, customId: customIdInput };
      if (activeTab === 'departments') {
        if (editingId) {
          await api.metadata.updateDepartment(editingId, data);
          toast.success('Department updated successfully');
        } else {
          await api.metadata.createDepartment(data);
          toast.success('Department created successfully');
        }
      } else {
        if (editingId) {
          await api.metadata.updateCategory(editingId, data);
          toast.success('Asset type updated successfully');
        } else {
          await api.metadata.createCategory(data);
          toast.success('Asset type created successfully');
        }
      }
      setIsModalOpen(false);
      setNameInput('');
      setCustomIdInput('');
      setEditingId(null);
    } catch (err) {
      toast.error('Failed to save changes');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setSubmitting(true);
    
    try {
      if (activeTab === 'departments') {
        await api.metadata.deleteDepartment(itemToDelete);
      } else {
        await api.metadata.deleteCategory(itemToDelete);
      }
      toast.success('Record deleted successfully');
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (err: any) {
      console.error('Delete Error:', err);
      let message = 'Failed to delete';
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="page-title">
          <h1 className="text-2xl font-bold text-text-primary">System Configuration</h1>
          <p className="text-text-secondary text-sm">Manage institutional departments and asset classification types.</p>
        </div>
        <button 
          onClick={() => {
            setIsModalOpen(true);
            setEditingId(null);
            setNameInput('');
            setCustomIdInput('');
          }}
          className="btn-accent flex items-center gap-2"
        >
          <Plus size={18} />
          Add {activeTab === 'departments' ? 'Department' : 'Asset Type'}
        </button>
      </div>

      <div className="flex gap-4 border-b border-border pb-px">
        <button 
          onClick={() => setActiveTab('departments')}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'departments' ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}
        >
          Departments
          {activeTab === 'departments' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
        </button>
        <button 
          onClick={() => setActiveTab('categories')}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'categories' ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}
        >
          Asset Types (Categories)
          {activeTab === 'categories' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-text-secondary italic">Loading configuration...</div>
        ) : (
          (activeTab === 'departments' ? departments : categories).map((item) => (
            <div key={item.id} className="bg-bg-card border border-border rounded-xl p-5 group hover:border-accent transition-all shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-bg-deep rounded-lg flex items-center justify-center text-accent">
                    {activeTab === 'departments' ? <Building2 size={20} /> : <Tags size={20} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-text-primary tracking-tight">{item.name}</h3>
                    <p className="text-[10px] text-text-secondary uppercase tracking-widest font-black mt-1">
                      ID: {item.customId || item.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      setEditingId(item.id);
                      setNameInput(item.name);
                      setCustomIdInput(item.customId || '');
                      setIsModalOpen(true);
                    }}
                    className="p-2 hover:bg-accent/10 text-text-secondary hover:text-accent rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(item.id)}
                    className="p-2 hover:bg-red-500/10 text-text-secondary hover:text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-bg-card p-6 rounded-xl border border-border shadow-sm flex items-start gap-4">
        <div className="p-3 bg-accent/10 rounded-full text-accent">
          <AlertCircle size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-text-primary mb-1 uppercase tracking-wider">Dynamic Configuration</h4>
          <p className="text-xs text-text-secondary leading-relaxed">
            Changes made here are <span className="text-text-primary font-bold">REAL-TIME</span> and will immediately update all selection menus across the inventory, allocation, and reporting modules. Use caution when deleting types that are actively linked to assets.
          </p>
        </div>
      </div>

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
                  Are you sure you want to delete this {activeTab === 'departments' ? 'department' : 'asset type'}? This action is permanent and may affect linked records.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setItemToDelete(null);
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

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-deep/80 backdrop-blur-sm">
          <div className="bg-bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-white/5">
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                {editingId ? 'Edit' : 'Add New'} {activeTab === 'departments' ? 'Department' : 'Asset Type'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5 focus-within:text-accent transition-colors">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">
                  {activeTab === 'departments' ? 'Department ID Number' : 'Asset Type ID Number'}
                </label>
                <input 
                  type="text"
                  value={customIdInput}
                  onChange={(e) => setCustomIdInput(e.target.value)}
                  placeholder={activeTab === 'departments' ? "e.g. DEPT-001" : "e.g. CAT-001"}
                  className="w-full px-4 py-2.5 bg-bg-deep border border-border rounded-lg outline-none text-sm text-text-primary focus:border-accent transition-all font-medium"
                />
              </div>

              <div className="space-y-1.5 focus-within:text-accent transition-colors">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block">
                  {activeTab === 'departments' ? 'Department Name' : 'Asset Type Name'}
                </label>
                <input 
                  autoFocus
                  required
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={activeTab === 'departments' ? "e.g. Computer Science" : "e.g. Desktop Workstation"}
                  className="w-full px-4 py-2.5 bg-bg-deep border border-border rounded-lg outline-none text-sm text-text-primary focus:border-accent transition-all font-medium"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  disabled={submitting}
                  type="submit" 
                  className="flex-1 btn-accent py-3 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {submitting ? 'Processing...' : editingId ? 'Save Changes' : 'Create Record'}
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
