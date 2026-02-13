import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Trash2, UserPlus, Search, Edit2, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const Modal = ({ isOpen, onClose, title, onSubmit, children, submitLabel, actionLoading }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-xl text-slate-800">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 hover:bg-slate-200 p-2 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={onSubmit} className="p-6 space-y-5">
                    {children}
                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={actionLoading}
                            className="flex-1 py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-primary-500/30 transition-all disabled:opacity-70 disabled:cursor-wait"
                        >
                            {actionLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                                <>
                                    <Check className="w-5 h-5" />
                                    <span>{submitLabel}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const UserManagement = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Forms
    const [formData, setFormData] = useState({ username: '', fullName: '', password: '', role: 'user' });
    const [editingUserId, setEditingUserId] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('فشل تحميل المستخدمين');
        } finally {
            setLoading(false);
        }
    };

    const deleteUser = async (userId) => {
        if (!confirm('هل أنت متأكد من حذف هذا المستخدم نهائياً؟')) return;

        try {
            const { error } = await supabase.rpc('delete_user_by_id', { target_user_id: userId });
            if (error) throw error;

            toast.success('تم حذف المستخدم بنجاح');
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
            console.error('Error deleting user:', error);
            toast.error('فشل حذف المستخدم (تأكد من الصلاحيات)');
        }
    };

    const openCreateModal = () => {
        setFormData({ username: '', fullName: '', password: '', role: 'user' });
        setIsCreateModalOpen(true);
    };

    const openEditModal = (userData) => {
        setFormData({
            username: userData.username,
            fullName: userData.full_name,
            password: '',
            role: userData.role
        });
        setEditingUserId(userData.id);
        setIsEditModalOpen(true);
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!formData.username.trim() || !formData.password.trim()) {
            toast.error('يرجى ملء جميع الحقول المطلوبة');
            return;
        }
        setActionLoading(true);

        try {
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

            const adminClient = createClient(supabaseUrl, supabaseKey, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            });

            const email = `${formData.username}@local.app`;
            const { data, error } = await adminClient.auth.signUp({
                email,
                password: formData.password,
                options: {
                    data: {
                        username: formData.username,
                        full_name: formData.fullName,
                        role: formData.role
                    }
                }
            });

            if (error) throw error;

            if (data.user) {
                toast.success('تم إنشاء المستخدم بنجاح');
                setIsCreateModalOpen(false);
                setTimeout(fetchUsers, 1000);
            }

        } catch (error) {
            console.error('Error creating user:', error);
            let msg = error.message;
            if (msg.includes('already registered')) msg = 'اسم المستخدم مسجل مسبقاً';
            toast.error(msg || 'فشل إنشاء المستخدم');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setActionLoading(true);

        try {
            const updates = {
                full_name: formData.fullName,
                role: formData.role
            };

            const { error: profileError } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', editingUserId);

            if (profileError) throw profileError;

            if (formData.password) {
                toast('تغيير كلمة المرور يتطلب صلاحيات Service Role على الخادم', { icon: 'ℹ️' });
            }

            toast.success('تم تحديث البيانات بنجاح');
            setIsEditModalOpen(false);
            fetchUsers();

        } catch (error) {
            console.error('Error updating user:', error);
            toast.error('فشل تحديث البيانات');
        } finally {
            setActionLoading(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800">إدارة المستخدمين</h1>
                    <p className="text-slate-500 mt-1">التحكم الكامل في حسابات وصلاحيات المستخدمين</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-primary-600/20 font-bold"
                >
                    <UserPlus className="w-5 h-5" />
                    <span>مستخدم جديد</span>
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute right-4 top-3.5 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="بحث بالاسم أو اسم المستخدم..."
                            className="w-full pr-12 pl-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="text-sm text-slate-500 font-medium">
                        العدد الإجمالي: <span className="text-slate-900 font-bold">{users.length}</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 text-slate-600 font-bold text-sm border-b border-slate-100">
                            <tr>
                                <th className="p-4 md:p-5">المستخدم</th>
                                <th className="p-4 md:p-5 hidden md:table-cell">اسم الدخول</th>
                                <th className="p-4 md:p-5">الدور</th>
                                <th className="p-4 md:p-5 hidden md:table-cell">تاريخ التسجيل</th>
                                <th className="p-4 md:p-5 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="5" className="p-12 text-center text-slate-500">جاري التحميل...</td></tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan="5" className="p-12 text-center text-slate-500">لا يوجد مستخدمين مطابقين للبحث</td></tr>
                            ) : (
                                filteredUsers.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="p-4 md:p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors font-bold shrink-0">
                                                    {u.full_name?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-slate-800 block">{u.full_name || 'بدون اسم'}</span>
                                                    <span className="text-xs text-slate-400 md:hidden">{u.username}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 md:p-5 text-slate-600 font-medium hidden md:table-cell" dir="ltr" style={{ textAlign: 'right' }}>{u.username}</td>
                                        <td className="p-4 md:p-5">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                                <div className={`w-2 h-2 rounded-full ${u.role === 'admin' ? 'bg-purple-500' : 'bg-slate-500'}`}></div>
                                                {u.role === 'admin' ? 'مدير' : 'مستخدم'}
                                            </span>
                                        </td>
                                        <td className="p-4 md:p-5 text-slate-500 text-sm hidden md:table-cell">{new Date(u.created_at).toLocaleDateString('ar-EG')}</td>
                                        <td className="p-4 md:p-5">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => openEditModal(u)}
                                                    className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                                                    title="تعديل"
                                                >
                                                    <Edit2 className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => deleteUser(u.id)}
                                                    disabled={u.id === user.id}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title="حذف"
                                                >
                                                    <Trash2 className="w-5 h-5" />
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

            {/* Create Modal */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="إضافة مستخدم جديد" onSubmit={handleCreateUser} submitLabel="إنشاء" actionLoading={actionLoading}>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">الاسم الكامل</label>
                    <input
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all"
                        required
                        value={formData.fullName}
                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="مثال: أحمد محمد"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">اسم المستخدم (للدخول)</label>
                    <input
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all"
                        dir="ltr"
                        style={{ textAlign: 'right' }}
                        required
                        value={formData.username}
                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                        placeholder="username"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">كلمة المرور</label>
                    <input
                        type="password"
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all"
                        dir="ltr"
                        style={{ textAlign: 'right' }}
                        required
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        placeholder="كلمة المرور"
                    />
                    <p className="text-xs text-slate-400 mt-1">لا يوجد حد أدنى لطول كلمة المرور</p>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">الدور</label>
                    <select
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all"
                        value={formData.role}
                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                    >
                        <option value="user">مستخدم عادي</option>
                        <option value="admin">مدير نظام</option>
                    </select>
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="تعديل بيانات المستخدم" onSubmit={handleUpdateUser} submitLabel="حفظ التغييرات" actionLoading={actionLoading}>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">الاسم الكامل</label>
                    <input
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all"
                        required
                        value={formData.fullName}
                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">اسم المستخدم</label>
                    <input
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed outline-none"
                        dir="ltr"
                        style={{ textAlign: 'right' }}
                        disabled
                        value={formData.username}
                    />
                    <p className="text-xs text-slate-400 mt-1">لا يمكن تغيير اسم المستخدم</p>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">كلمة المرور الجديدة (اختياري)</label>
                    <input
                        type="password"
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all"
                        dir="ltr"
                        style={{ textAlign: 'right' }}
                        placeholder="اتركه فارغاً للإبقاء على كلمة المرور الحالية"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">الدور</label>
                    <select
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all"
                        value={formData.role}
                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                    >
                        <option value="user">مستخدم عادي</option>
                        <option value="admin">مدير نظام</option>
                    </select>
                </div>
            </Modal>
        </div>
    );
};

export default UserManagement;
