import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { ChevronDown, ChevronUp, PlayCircle, FileText, Image, ExternalLink } from 'lucide-react';
import clsx from 'clsx';

const PageView = () => {
    const { id } = useParams();
    const [page, setPage] = useState(null);
    const [menus, setMenus] = useState([]);
    const [options, setOptions] = useState({});
    const [progress, setProgress] = useState({});
    const [loading, setLoading] = useState(true);
    const [openMenus, setOpenMenus] = useState({});
    const { user } = useAuth();

    useEffect(() => {
        fetchContent();
    }, [id]);

    const fetchContent = async () => {
        setLoading(true);
        const { data: pageData } = await supabase.from('pages').select('*').eq('id', id).single();
        setPage(pageData);

        const { data: menusData } = await supabase.from('menus').select('*').eq('page_id', id).order('order_index');
        setMenus(menusData || []);

        if (menusData && menusData.length > 0) {
            const menuIds = menusData.map(m => m.id);
            const { data: optionsData } = await supabase.from('options').select('*').in('menu_id', menuIds).order('order_index');

            const optionsMap = {};
            menusData.forEach(m => optionsMap[m.id] = []);
            optionsData?.forEach(opt => {
                if (optionsMap[opt.menu_id]) optionsMap[opt.menu_id].push(opt);
            });
            setOptions(optionsMap);

            if (user) {
                const { data: progressData } = await supabase.from('user_progress').select('option_id, completed').eq('user_id', user.id);
                const progressMap = {};
                progressData?.forEach(p => progressMap[p.option_id] = p.completed);
                setProgress(progressMap);
            }

            if (menusData.length > 0) {
                setOpenMenus({ [menusData[0].id]: true });
            }
        }
        setLoading(false);
    };

    const toggleProgress = async (optionId, currentStatus) => {
        try {
            const newStatus = !currentStatus;
            setProgress(prev => ({ ...prev, [optionId]: newStatus }));

            const { error } = await supabase.from('user_progress').upsert({
                user_id: user.id,
                option_id: optionId,
                completed: newStatus,
                completed_at: newStatus ? new Date().toISOString() : null
            }, { onConflict: 'user_id, option_id' });

            if (error) throw error;
        } catch (error) {
            console.error('Error updating progress:', error);
            setProgress(prev => ({ ...prev, [optionId]: currentStatus }));
        }
    };

    const toggleMenu = (menuId) => {
        setOpenMenus(prev => ({ ...prev, [menuId]: !prev[menuId] }));
    };

    const getFileType = (url) => {
        if (!url) return null;
        const ext = url.split('.').pop()?.toLowerCase().split('?')[0];
        if (['pdf'].includes(ext)) return 'pdf';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
        return 'other';
    };

    const getYouTubeEmbedUrl = (url) => {
        if (!url) return null;
        if (url.includes('embed')) return url;
        // Extract video ID from various YouTube URL formats
        const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (match) return `https://www.youtube.com/embed/${match[1]}`;
        return null;
    };

    if (loading) return (
        <div className="text-center py-16">
            <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-slate-500">جاري التحميل...</p>
        </div>
    );

    if (!page) return (
        <div className="text-center py-16">
            <p className="text-slate-500 text-lg">الصفحة غير موجودة</p>
            <Link to="/pages/library" className="text-primary-600 hover:text-primary-700 font-medium mt-2 inline-block">← العودة للمكتبة</Link>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{page.title}</h1>
                    <Link to="/pages/library" className="text-sm text-slate-500 hover:text-primary-600 mt-1 block">← العودة للمكتبة</Link>
                </div>
            </div>

            <div className="space-y-4">
                {menus.map(menu => (
                    <div key={menu.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <button
                            onClick={() => toggleMenu(menu.id)}
                            className="w-full text-right p-4 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors"
                        >
                            <span className="font-bold text-lg text-slate-700">{menu.title}</span>
                            {openMenus[menu.id] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                        </button>

                        {openMenus[menu.id] && (
                            <div className="p-4 space-y-6 border-t border-slate-100">
                                {options[menu.id]?.length === 0 && <p className="text-slate-400 text-sm">لا يوجد محتوى.</p>}
                                {options[menu.id]?.map(option => (
                                    <div key={option.id} className="pb-6 border-b border-slate-100 last:border-0 last:pb-0">
                                        <h3 className="font-bold text-xl text-primary-700 mb-3 flex items-center justify-between flex-wrap gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 bg-primary-500 rounded-full inline-block"></span>
                                                {option.title}
                                            </div>
                                            <button
                                                onClick={() => toggleProgress(option.id, !!progress[option.id])}
                                                className={clsx(
                                                    "text-sm px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-2",
                                                    progress[option.id]
                                                        ? "bg-primary-50 text-primary-700 border-primary-200 hover:bg-white"
                                                        : "bg-white text-slate-500 border-slate-200 hover:border-primary-500 hover:text-primary-600"
                                                )}
                                            >
                                                {progress[option.id] ? 'مكتمل ✅' : 'تحديد كمكتمل'}
                                            </button>
                                        </h3>

                                        {/* Video Embed */}
                                        {option.video_url && (() => {
                                            const embedUrl = getYouTubeEmbedUrl(option.video_url);
                                            return (
                                                <div className="mb-4 rounded-xl overflow-hidden bg-black aspect-video relative group">
                                                    {embedUrl ? (
                                                        <iframe
                                                            src={embedUrl}
                                                            className="w-full h-full"
                                                            frameBorder="0"
                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                            allowFullScreen
                                                        ></iframe>
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-white">
                                                            <a href={option.video_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 hover:text-primary-400 transition-colors">
                                                                <PlayCircle className="w-12 h-12" />
                                                                <span>فتح الفيديو</span>
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* File Display - PDF or Image */}
                                        {option.file_url && (() => {
                                            const fileType = getFileType(option.file_url);
                                            if (fileType === 'pdf') {
                                                return (
                                                    <div className="mb-4">
                                                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                                                            <div className="flex items-center justify-between p-3 bg-slate-100 border-b border-slate-200">
                                                                <div className="flex items-center gap-2">
                                                                    <FileText className="w-5 h-5 text-red-500" />
                                                                    <span className="text-sm font-medium text-slate-700">ملف PDF</span>
                                                                </div>
                                                                <a href={option.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700">
                                                                    <ExternalLink className="w-3 h-3" />
                                                                    فتح في نافذة جديدة
                                                                </a>
                                                            </div>
                                                            <iframe
                                                                src={option.file_url}
                                                                className="w-full border-0"
                                                                style={{ height: '600px' }}
                                                                title="PDF Viewer"
                                                            ></iframe>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            if (fileType === 'image') {
                                                return (
                                                    <div className="mb-4">
                                                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                                                            <img
                                                                src={option.file_url}
                                                                alt={option.title}
                                                                className="w-full h-auto max-h-[600px] object-contain"
                                                                loading="lazy"
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // Generic file link
                                            return (
                                                <div className="mb-4">
                                                    <a href={option.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 bg-primary-50 px-4 py-2 rounded-lg text-sm font-medium">
                                                        <ExternalLink className="w-4 h-4" />
                                                        فتح الملف المرفق
                                                    </a>
                                                </div>
                                            );
                                        })()}

                                        {/* Rich Text Content */}
                                        {option.content && (
                                            <div
                                                className="prose prose-slate max-w-none prose-p:text-slate-600 prose-headings:text-slate-800"
                                                dangerouslySetInnerHTML={{ __html: option.content }}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PageView;
