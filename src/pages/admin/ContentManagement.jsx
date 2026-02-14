import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Edit, Save, Upload, FileText, Image, X } from 'lucide-react';
import toast from 'react-hot-toast';

const ContentManagement = () => {
    const [pages, setPages] = useState([]);
    const [selectedPage, setSelectedPage] = useState(null);
    const [menus, setMenus] = useState([]);
    const [selectedMenu, setSelectedMenu] = useState(null);
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form states
    const [newPageTitle, setNewPageTitle] = useState('');
    const [newMenuTitle, setNewMenuTitle] = useState('');
    const [editingOption, setEditingOption] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchPages();
    }, []);

    useEffect(() => {
        if (selectedPage) {
            fetchMenus(selectedPage.id);
            setMenus([]);
            setOptions([]);
            setSelectedMenu(null);
        }
    }, [selectedPage]);

    useEffect(() => {
        if (selectedMenu) {
            fetchOptions(selectedMenu.id);
        }
    }, [selectedMenu]);

    const fetchPages = async () => {
        const { data, error } = await supabase.from('pages').select('*').order('order_index');
        if (!error) setPages(data || []);
        setLoading(false);
    };

    const fetchMenus = async (pageId) => {
        const { data, error } = await supabase.from('menus').select('*').eq('page_id', pageId).order('order_index');
        if (!error) setMenus(data || []);
    };

    const fetchOptions = async (menuId) => {
        const { data, error } = await supabase.from('options').select('*').eq('menu_id', menuId).order('order_index');
        if (!error) setOptions(data || []);
    };

    // --- Pages CRUD ---
    const createPage = async () => {
        if (!newPageTitle.trim()) return;
        const { error } = await supabase.from('pages').insert([{ title: newPageTitle }]);
        if (error) toast.error('فشل إنشاء الصفحة');
        else {
            toast.success('تم إنشاء الصفحة');
            setNewPageTitle('');
            fetchPages();
        }
    };

    const deletePage = async (id) => {
        if (!confirm('هل أنت متأكد من حذف هذه الصفحة وجميع محتوياتها؟')) return;
        const { error } = await supabase.from('pages').delete().eq('id', id);
        if (!error) {
            toast.success('تم حذف الصفحة');
            fetchPages();
            if (selectedPage?.id === id) setSelectedPage(null);
        }
    };

    // --- Menus CRUD ---
    const createMenu = async () => {
        if (!newMenuTitle.trim() || !selectedPage) return;
        const { error } = await supabase.from('menus').insert([{ title: newMenuTitle, page_id: selectedPage.id }]);
        if (error) toast.error('فشل إنشاء القائمة');
        else {
            toast.success('تم إنشاء القائمة');
            setNewMenuTitle('');
            fetchMenus(selectedPage.id);
        }
    };

    const deleteMenu = async (id) => {
        if (!confirm('هل أنت متأكد من حذف هذه القائمة؟')) return;
        const { error } = await supabase.from('menus').delete().eq('id', id);
        if (!error) {
            toast.success('تم حذف القائمة');
            fetchMenus(selectedPage.id);
            if (selectedMenu?.id === id) setSelectedMenu(null);
        }
    };

    // --- Options CRUD ---
    const createOption = async () => {
        if (!selectedMenu) return;
        const { error } = await supabase.from('options').insert([{
            title: 'عنوان جديد',
            menu_id: selectedMenu.id,
            content: '',
            video_url: '',
            file_url: ''
        }]);
        if (error) toast.error('فشل إضافة الدرس');
        else {
            toast.success('تم إضافة درس جديد');
            fetchOptions(selectedMenu.id);
        }
    };

    const updateOption = async () => {
        if (!editingOption) return;
        const { error } = await supabase.from('options').update({
            title: editingOption.title,
            content: editingOption.content,
            video_url: editingOption.video_url,
            file_url: editingOption.file_url
        }).eq('id', editingOption.id);

        if (error) toast.error('فشل الحفظ');
        else {
            toast.success('تم الحفظ بنجاح');
            setEditingOption(null);
            fetchOptions(selectedMenu.id);
        }
    };

    const deleteOption = async (id) => {
        if (!confirm('هل أنت متأكد من حذف هذا الدرس؟')) return;
        const { error } = await supabase.from('options').delete().eq('id', id);
        if (!error) {
            toast.success('تم حذف الدرس');
            fetchOptions(selectedMenu.id);
        }
    };

    // --- File Upload ---
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            toast.error('حجم الملف يجب أن يكون أقل من 10 ميجابايت');
            return;
        }

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            const filePath = `lessons/${fileName}`;

            // Try upload
            const { data, error } = await supabase.storage
                .from('lesson-files')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) {
                console.error('Storage upload error:', error);
                // Show the actual error message from Supabase
                if (error.message?.includes('Bucket not found') || error.statusCode === '404') {
                    toast.error('خطأ: الـ Bucket غير موجود. تأكد من إنشاء bucket باسم "lesson-files" في Supabase Dashboard → Storage');
                } else if (error.message?.includes('row-level security') || error.message?.includes('policy')) {
                    toast.error('خطأ في صلاحيات التخزين. يجب تشغيل أوامر SQL للصلاحيات.');
                } else {
                    toast.error(`فشل رفع الملف: ${error.message || error.error || 'خطأ غير معروف'}`);
                }
                return;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('lesson-files')
                .getPublicUrl(filePath);

            if (urlData?.publicUrl) {
                setEditingOption(prev => ({ ...prev, file_url: urlData.publicUrl }));
                toast.success('تم رفع الملف بنجاح');
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(`فشل رفع الملف: ${error.message || 'خطأ غير متوقع'}`);
        } finally {
            setUploading(false);
        }
    };

    const getFileType = (url) => {
        if (!url) return null;
        const ext = url.split('.').pop()?.toLowerCase().split('?')[0];
        if (['pdf'].includes(ext)) return 'pdf';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
        return 'other';
    };

    return (
        <div className="animate-fade-in space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">إدارة المحتوى</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100vh-180px)]">
                {/* Pages Column */}
                <div className="md:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700 text-sm">الصفحات الرئيسية</div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {pages.map(page => (
                            <div key={page.id}
                                onClick={() => setSelectedPage(page)}
                                className={`p-3 rounded-xl cursor-pointer flex justify-between items-center transition-colors group text-sm ${selectedPage?.id === page.id ? 'bg-primary-50 text-primary-700 font-medium border border-primary-200' : 'hover:bg-slate-50'}`}
                            >
                                <span className="truncate">{page.title}</span>
                                <button onClick={(e) => { e.stopPropagation(); deletePage(page.id); }} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-full transition-all shrink-0">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="p-3 border-t border-slate-100 bg-slate-50 flex gap-2">
                        <input
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary-500"
                            placeholder="اسم الصفحة..."
                            value={newPageTitle}
                            onChange={e => setNewPageTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && createPage()}
                        />
                        <button onClick={createPage} className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Menus Column */}
                <div className="md:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700 text-sm flex items-center justify-between">
                        <span>القوائم الفرعية</span>
                        {selectedPage && <span className="text-xs text-primary-600 px-2 py-1 bg-primary-50 rounded-lg truncate max-w-[120px]">{selectedPage.title}</span>}
                    </div>

                    {!selectedPage ? (
                        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm p-4 text-center">اختر صفحة أولاً</div>
                    ) : (
                        <>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {menus.map(menu => (
                                    <div key={menu.id}
                                        onClick={() => setSelectedMenu(menu)}
                                        className={`p-3 rounded-xl cursor-pointer flex justify-between items-center transition-colors group text-sm ${selectedMenu?.id === menu.id ? 'bg-primary-50 text-primary-700 font-medium border border-primary-200' : 'hover:bg-slate-50'}`}
                                    >
                                        <span className="truncate">{menu.title}</span>
                                        <button onClick={(e) => { e.stopPropagation(); deleteMenu(menu.id); }} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-full transition-all shrink-0">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="p-3 border-t border-slate-100 bg-slate-50 flex gap-2">
                                <input
                                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary-500"
                                    placeholder="اسم القائمة..."
                                    value={newMenuTitle}
                                    onChange={e => setNewMenuTitle(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && createMenu()}
                                />
                                <button onClick={createMenu} className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Options / Editing Column */}
                <div className="md:col-span-6 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700 text-sm flex items-center justify-between">
                        <span>المحتوى والدروس</span>
                        {selectedMenu && (
                            <button onClick={createOption} className="text-xs flex items-center gap-1 bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700 transition-colors">
                                <Plus className="w-3 h-3" /> درس جديد
                            </button>
                        )}
                    </div>

                    {!selectedMenu ? (
                        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm p-4 text-center">اختر قائمة لعرض المحتوى</div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {options.length === 0 && (
                                <div className="text-center text-slate-400 py-8 text-sm">لا يوجد محتوى. أضف درساً جديداً.</div>
                            )}
                            {options.map(option => (
                                <div key={option.id} className="border border-slate-200 rounded-xl p-4 hover:border-primary-200 transition-colors">
                                    {editingOption?.id === option.id ? (
                                        <div className="space-y-3">
                                            <input
                                                className="w-full font-bold text-lg p-2 border rounded-lg focus:ring-2 focus:ring-primary-200 outline-none"
                                                value={editingOption.title}
                                                onChange={e => setEditingOption({ ...editingOption, title: e.target.value })}
                                                placeholder="عنوان الدرس"
                                            />
                                            <textarea
                                                className="w-full min-h-[500px] p-4 border rounded-xl focus:ring-2 focus:ring-primary-200 outline-none text-base leading-relaxed"
                                                placeholder="محتوى الدرس (HTML مدعوم) - لا يوجد حد للنص، يمكنك كتابة نصوص طويلة جداً هنا..."
                                                value={editingOption.content || ''}
                                                onChange={e => setEditingOption({ ...editingOption, content: e.target.value })}
                                            />
                                            <input
                                                className="w-full p-2 border rounded-lg text-sm text-left font-mono"
                                                placeholder="YouTube Embed URL (اختياري)"
                                                dir="ltr"
                                                value={editingOption.video_url || ''}
                                                onChange={e => setEditingOption({ ...editingOption, video_url: e.target.value })}
                                            />

                                            {/* File Upload Section */}
                                            <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50/50">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Upload className="w-4 h-4 text-slate-500" />
                                                    <span className="text-sm font-medium text-slate-600">ملف مرفق (PDF أو صورة)</span>
                                                </div>

                                                {editingOption.file_url && (
                                                    <div className="mb-3 flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                                                        {getFileType(editingOption.file_url) === 'pdf' ? (
                                                            <FileText className="w-5 h-5 text-red-500 shrink-0" />
                                                        ) : (
                                                            <Image className="w-5 h-5 text-blue-500 shrink-0" />
                                                        )}
                                                        <span className="text-xs text-slate-600 truncate flex-1" dir="ltr">{editingOption.file_url.split('/').pop()}</span>
                                                        <button
                                                            onClick={() => setEditingOption({ ...editingOption, file_url: '' })}
                                                            className="text-red-400 hover:text-red-600 shrink-0"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}

                                                <div className="flex gap-2">
                                                    <label className="flex-1 cursor-pointer">
                                                        <div className="flex items-center justify-center gap-2 py-2 px-3 bg-white border border-slate-200 rounded-lg hover:border-primary-500 transition-colors text-sm text-slate-600">
                                                            <Upload className="w-4 h-4" />
                                                            {uploading ? 'جاري الرفع...' : 'رفع ملف'}
                                                        </div>
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                                                            onChange={handleFileUpload}
                                                            disabled={uploading}
                                                        />
                                                    </label>
                                                    <input
                                                        className="flex-1 p-2 border rounded-lg text-xs text-left font-mono"
                                                        placeholder="أو ألصق رابط الملف"
                                                        dir="ltr"
                                                        value={editingOption.file_url || ''}
                                                        onChange={e => setEditingOption({ ...editingOption, file_url: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-2 pt-2">
                                                <button onClick={() => setEditingOption(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors text-sm">إلغاء</button>
                                                <button onClick={updateOption} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 transition-colors text-sm">
                                                    <Save className="w-4 h-4" /> حفظ
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-800">{option.title}</h4>
                                                {option.content && <p className="text-slate-500 text-sm mt-1 line-clamp-2">{option.content.replace(/<[^>]*>/g, '')}</p>}
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {option.video_url && (
                                                        <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">
                                                            🎥 فيديو
                                                        </span>
                                                    )}
                                                    {option.file_url && (
                                                        <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-1 rounded-lg">
                                                            {getFileType(option.file_url) === 'pdf' ? '📄 PDF' : '🖼️ صورة'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-1 shrink-0 mr-2">
                                                <button onClick={() => setEditingOption({ ...option })} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => deleteOption(option.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContentManagement;
