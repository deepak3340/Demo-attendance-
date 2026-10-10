import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { User } from '../../types';
import { SafeDeleteModal } from '../common/SafeDeleteModal';
import {
  Users,
  UserPlus,
  Search,
  Edit,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  PowerOff,
  Power,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';

export const StaffManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [staffList, setStaffList] = useState<User[]>(() => storage.getStaffMembers());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [safeDeleteModal, setSafeDeleteModal] = useState<{
    isOpen: boolean;
    itemType: 'Class' | 'Subject' | 'Staff' | 'Student';
    itemId: string;
    itemName: string;
    dependencySummary: any[];
  }>({
    isOpen: false,
    itemType: 'Staff',
    itemId: '',
    itemName: '',
    dependencySummary: []
  });

  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [password, setPassword] = useState('staff123');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [resetModalStaff, setResetModalStaff] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  const refreshList = () => {
    setStaffList(storage.getStaffMembers());
  };

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      refreshList();
    });
    return unsub;
  }, []);

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setFullName('');
    setMobile('');
    setEmail('');
    setDesignation('Subject Teacher');
    setGender('Male');
    setPassword('staff123');
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staff: User) => {
    setEditingStaff(staff);
    setFullName(staff.fullName);
    setMobile(staff.mobile);
    setEmail(staff.email);
    setDesignation(staff.designation || 'Teacher');
    setGender(staff.gender || 'Male');
    setPassword('');
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setFormError('');

    if (!fullName.trim()) {
      setFormError('Staff name is required.');
      return;
    }

    const cleanMobile = mobile.trim();
    if (!/^\d{10}$/.test(cleanMobile)) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (editingStaff) {
      const res = storage.updateStaff(
        editingStaff.id,
        {
          fullName: fullName.trim(),
          mobile: cleanMobile,
          email: email.trim() || `${cleanMobile}@school.edu`,
          designation,
          gender,
        },
        currentUser
      );
      if (!res.success) {
        setFormError(res.error || 'Failed to update staff.');
        return;
      }
      setFormSuccess('Staff details updated successfully.');
    } else {
      const res = storage.addStaff(
        {
          fullName: fullName.trim(),
          mobile: cleanMobile,
          email: email.trim() || `${cleanMobile}@school.edu`,
          designation,
          gender,
          password: password || 'staff123',
          status: 'active',
        },
        currentUser
      );
      if (!res.success) {
        setFormError(res.error || 'Failed to create staff account.');
        return;
      }
      setFormSuccess(`Staff member created successfully! Generated UID: ${res.staff?.uid}`);
    }

    refreshList();
    setTimeout(() => {
      setIsModalOpen(false);
      setFormSuccess('');
    }, 1200);
  };

  const handleToggleStatus = (staff: User) => {
    if (!currentUser) return;
    const res = storage.toggleStaffStatus(staff.id, currentUser);
    if (res.success) {
      showNotification('success', `Staff member "${staff.fullName}" status updated.`);
      refreshList();
    } else {
      showNotification('error', res.error || 'Failed to update status.');
    }
  };

  const handleOpenSafeDelete = (staff: User) => {
    const assignments = storage.getAssignmentsForTeacher(staff.id);
    const summary: any[] = [];
    if (assignments.length > 0) {
      summary.push({
        label: 'Active Teaching Assignments',
        count: assignments.length,
        description: 'Classes and subjects assigned to this teacher'
      });
    }
    setSafeDeleteModal({
      isOpen: true,
      itemType: 'Staff',
      itemId: staff.id,
      itemName: `${staff.fullName} (UID: ${staff.uid})`,
      dependencySummary: summary
    });
  };

  const handleExecutePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !resetModalStaff) return;
    if (newPassword.length < 6) {
      setResetMsg('Password must be at least 6 characters.');
      return;
    }
    storage.resetStaffPassword(resetModalStaff.id, newPassword, currentUser);
    setResetMsg(`Password for ${resetModalStaff.fullName} has been reset.`);
    setTimeout(() => {
      setResetModalStaff(null);
      setNewPassword('');
      setResetMsg('');
    }, 1400);
  };

  const filteredStaff = staffList.filter((s) => {
    const query = searchQuery.toLowerCase();
    const matchQuery =
      s.fullName.toLowerCase().includes(query) ||
      s.uid.includes(query) ||
      s.mobile.includes(query) ||
      (s.designation && s.designation.toLowerCase().includes(query));
    const matchStatus =
      statusFilter === 'all' ? true : s.status === statusFilter;
    return matchQuery && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Staff Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage teachers, unique 6-digit numeric UIDs, and access credentials
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Faculty Member</span>
        </button>
      </div>

      {notification && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold animate-fadeIn ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-indigo-50 border-indigo-200 text-indigo-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, UID or mobile..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
            Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:border-indigo-600 outline-none font-semibold"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">UID</th>
                <th className="py-3 px-4">Mobile</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No staff members found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                          {staff.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {staff.fullName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {staff.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-indigo-900 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded text-[11px]">
                        {staff.uid}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {staff.mobile}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {staff.designation || 'Teacher'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {staff.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(staff)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Staff"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResetModalStaff(staff);
                            setNewPassword('staff123');
                            setResetMsg('');
                          }}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Reset Password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(staff)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            staff.status === 'active'
                              ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={staff.status === 'active' ? 'Deactivate Account' : 'Reactivate Account'}
                        >
                          {staff.status === 'active' ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenSafeDelete(staff)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Safe Removal (Archive / Permanent)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredStaff.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No staff members found. Add faculty members using the &quot;Add Faculty&quot; button above.
            </div>
          ) : (
            filteredStaff.map((staff) => (
            <div key={staff.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                    {staff.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900">{staff.fullName}</p>
                    <p className="text-[11px] text-slate-500">{staff.designation || 'Teacher'}</p>
                  </div>
                </div>
                {staff.status === 'active' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                    Inactive
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl font-mono">
                <span>UID: <strong className="text-indigo-900 font-bold">{staff.uid}</strong></span>
                <span>Ph: <strong>{staff.mobile}</strong></span>
              </div>

              <div className="grid grid-cols-4 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(staff)}
                  className="py-1.5 px-2 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetModalStaff(staff);
                    setNewPassword('staff123');
                    setResetMsg('');
                  }}
                  className="py-1.5 px-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleStatus(staff)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer ${
                    staff.status === 'active' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {staff.status === 'active' ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                  <span>{staff.status === 'active' ? 'Disable' : 'Enable'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenSafeDelete(staff)}
                  className="py-1.5 px-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          )))}
        </div>
      </div>

      {/* Add / Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-indigo-100 relative max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
              <div className="pr-3">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                  {editingStaff ? 'Edit Staff Member' : 'Add New Faculty Member'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingStaff
                    ? `Updating details for UID: ${editingStaff.uid}`
                    : 'A unique 6-digit numeric UID will be automatically assigned.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer touch-manipulation shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3.5 sm:space-y-4 overscroll-contain touch-pan-y">
                {formError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
                {formSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Mobile Number (10 Digits)
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 9876543210"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 font-mono focus:border-indigo-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Mathematics Teacher"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:border-indigo-600 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e: any) => setGender(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:border-indigo-600 outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. teacher@school.edu"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:border-indigo-600 outline-none"
                    />
                  </div>
                </div>

                {!editingStaff && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Initial Password
                    </label>
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 font-mono focus:border-indigo-600 outline-none"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Faculty member can update this password in their personal profile after signing in.
                    </p>
                  </div>
                )}
              </div>

              <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0 sticky bottom-0 z-10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 cursor-pointer min-h-[40px] touch-manipulation"
                >
                  {editingStaff ? 'Save Changes' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetModalStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-indigo-100 relative">
            <button
              type="button"
              onClick={() => setResetModalStaff(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Reset Password
                </h3>
                <p className="text-xs text-slate-500">
                  For {resetModalStaff.fullName} (UID: {resetModalStaff.uid})
                </p>
              </div>
            </div>

            {resetMsg && (
              <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200">
                {resetMsg}
              </div>
            )}

            <form onSubmit={handleExecutePasswordReset} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-indigo-600 outline-none pr-9 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetModalStaff(null)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 cursor-pointer shadow-md shadow-amber-600/20"
                >
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Deletion Two-Step Modal */}
      <SafeDeleteModal
        isOpen={safeDeleteModal.isOpen}
        onClose={() => setSafeDeleteModal(prev => ({ ...prev, isOpen: false }))}
        itemType="Staff"
        itemId={safeDeleteModal.itemId}
        itemName={safeDeleteModal.itemName}
        dependencySummary={safeDeleteModal.dependencySummary}
        onArchive={async () => {
          const res = storage.archiveStaff(safeDeleteModal.itemId, currentUser!);
          if (res.success) {
            showNotification('success', `Faculty account "${safeDeleteModal.itemName}" archived safely.`);
            refreshList();
          } else {
            showNotification('error', res.error || 'Failed to archive staff.');
          }
        }}
        onPermanentDelete={async () => {
          const res = storage.permanentDeleteStaff(safeDeleteModal.itemId, currentUser!);
          if (res.success) {
            showNotification('success', `Faculty record "${safeDeleteModal.itemName}" permanently purged.`);
            refreshList();
          } else {
            showNotification('error', res.error || 'Failed to permanently delete staff.');
          }
        }}
      />
    </div>
  );
};
