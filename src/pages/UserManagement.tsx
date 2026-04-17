import React, { useEffect, useState } from 'react';
import { 
  Users as UsersIcon, 
  UserPlus, 
  Shield, 
  Mail, 
  Building2,
  MoreVertical,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';
import { User, Department } from '../types';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Staff' as any,
    departmentId: '',
    password: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersData, deptsData] = await Promise.all([
        api.metadata.users(),
        api.metadata.departments()
      ]);
      setUsers(usersData);
      setDepartments(deptsData);
      if (deptsData.length > 0 && !formData.departmentId) {
        setFormData(prev => ({ ...prev, departmentId: deptsData[0].id }));
      }
    } catch (err) {
      console.error('Failed to fetch user data', err);
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
        await api.metadata.updateUser(editingId, formData);
      } else {
        await api.metadata.createUser(formData);
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({
        name: '',
        email: '',
        role: 'Staff',
        departmentId: departments[0]?.id || '',
        password: ''
      });
      fetchData();
    } catch (err) {
      alert('Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      password: '' // Don't pre-fill password
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setUserToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setSubmitting(true);
    try {
      await api.metadata.deleteUser(userToDelete);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      fetchData();
    } catch (err) {
      alert('Failed to delete user');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-purple-100 text-purple-700';
      case 'Store Officer': return 'bg-blue-100 text-blue-700';
      case 'Management': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="page-title">
          <h1 className="text-2xl font-bold text-text-primary">User Management</h1>
          <p className="text-text-secondary text-sm">Manage institutional staff and access permissions.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-accent flex items-center gap-2"
        >
          <UserPlus size={18} />
          Add New User
        </button>
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-deep/80 backdrop-blur-sm">
          <div className="bg-bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-white/5">
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-widest">
                {editingId ? 'Update Personnel Profile' : 'Register New Personnel'}
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
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Full Name</label>
                <input 
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-bg-deep border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-accent outline-none transition-all"
                  placeholder="e.g. Dr. Usman Mubarak"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Email Address</label>
                <input 
                  required
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-bg-deep border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-accent outline-none transition-all"
                  placeholder="name@crescent.edu.ng"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Role</label>
                  <select 
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-bg-deep border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-accent outline-none transition-all"
                  >
                    <option value="Staff">Staff</option>
                    <option value="Admin">Admin</option>
                    <option value="Store Officer">Store Officer</option>
                    <option value="Management">Management</option>
                    <option value="Inventory Officer">Inventory Officer</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Department</label>
                  <select 
                    value={formData.departmentId}
                    onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full bg-bg-deep border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-accent outline-none transition-all"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                  {editingId ? 'New Password (leave blank to keep current)' : 'Initial Password'}
                </label>
                <input 
                  required={!editingId}
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-bg-deep border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-accent outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
              <div className="pt-4">
                <button 
                  disabled={submitting}
                  type="submit"
                  className="w-full btn-accent py-3 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                  {editingId ? 'Save Profile Changes' : 'Complete Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="data-section">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">User Info</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Department</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-text-secondary">Loading users...</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-bg-deep rounded-full border border-border flex items-center justify-center text-accent font-bold">
                          {user.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-text-primary text-sm">{user.name}</span>
                          <span className="text-[10px] text-text-secondary flex items-center gap-1 uppercase tracking-widest font-bold">
                            <Mail size={12} />
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded bg-bg-deep border border-border text-[9px] font-bold text-text-primary uppercase tracking-widest flex items-center gap-1.5 w-fit">
                        <Shield size={10} className="text-accent" />
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <Building2 size={14} className="text-accent" />
                        {departments.find(d => d.id === user.departmentId)?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        {user.status === 'Active' ? (
                          <CheckCircle2 size={18} className="text-success" />
                        ) : (
                          <XCircle size={18} className="text-red-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(user)}
                          className="p-1.5 hover:bg-white/10 rounded text-text-secondary hover:text-text-primary"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(user.id)}
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
                  Are you sure you want to delete this personnel? This action is permanent and cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setUserToDelete(null);
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
