import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, getWorkingFileUrl } from '../lib/supabase';
import { ChevronDown, ChevronUp, PlayCircle, ExternalLink, Download, FileText, Image as ImageIcon } from 'lucide-react';

const PageView = () => {
    const { id } = useParams();
    const [page, setPage] = useState(null);
    const [menus, setMenus] = useState([]);
    const [options, setOptions] = useState({});
    const [loading, setLoading] = useState(true);
    const [openMenus, setOpenMenus] = useState({});

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

            // Resolve file URLs using signed URLs
            const resolvedOptions = await Promise.all(
                (optionsData || []).map(async (opt) => {
                    if (opt.file_url) {
                        const resolvedUrl = await getWorkingFileUrl(opt.file_url);
                        return { ...opt, file_url: resolvedUrl || opt.file_url };
                    }
                    return opt;
                })
            );

            const optionsMap = {};
            menusData.forEach(m => optionsMap[m.id] = []);
            resolvedOptions.forEach(opt => {
                if (optionsMap[opt.menu_id]) optionsMap[opt.menu_id].push(opt);
            });
            setOptions(optionsMap);

            // Open all menus by default
            const initialOpenState = {};
            menusData.forEach(m => initialOpenState[m.id] = true);
            setOpenMenus(initialOpenState);
        }
        setLoading(false);
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

    if (loading) return (
        <div className="flex items-center justify-center p-12 h-[50vh]">
            <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
    );

    if (!page) return <div className="text-center p-12 text-slate-500 font-bold text-lg">الصفحة غير موجودة</div>;

    return (
        <div className="max-w-4xl mx-auto pb-20 animate-fade-in relative z-0">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3 leading-tight">{page.title}</h1>
                <div className="h-1.5 w-24 bg-gradient-to-r from-primary-500 to-primary-300 rounded-full"></div>
            </div>

            {/* Menus & Content */}
            <div className="space-y-6">
                {menus.map(menu => (
                    <div key={menu.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-md">
                        <button
                            onClick={() => toggleMenu(menu.id)}
                            className="w-full flex items-center justify-between p-5 sm:p-6 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-100"
                        >
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                                <span className={`w-2 h-8 rounded-full ${openMenus[menu.id] ? 'bg-primary-500' : 'bg-slate-300'} transition-colors`}></span>
                                {menu.title}
                            </h2>
                            {openMenus[menu.id] ? (
                                <ChevronUp className="w-6 h-6 text-primary-600" />
                            ) : (
                                <ChevronDown className="w-6 h-6 text-slate-400" />
                            )}
                        </button>

                        <div className={`transition-all duration-500 ease-in-out ${openMenus[menu.id] ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                            <div className="p-5 sm:p-8 space-y-10 bg-white">
                                {options[menu.id]?.length === 0 && (
                                    <p className="text-center text-slate-400 font-medium py-8">لا يوجد محتوى في هذا القسم</p>
                                )}

                                {options[menu.id]?.map((option, index) => (
                                    <div key={option.id} className={`${index > 0 ? 'pt-8 border-t border-slate-100' : ''}`}>
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="w-8 h-8 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                                                {index + 1}
                                            </div>
                                            <h3 className="text-2xl font-bold text-slate-900">{option.title}</h3>
                                        </div>

                                        {/* HTML Content */}
                                        {option.content && (
                                            <div
                                                className="prose prose-lg prose-slate max-w-none 
                                                prose-p:text-slate-700 prose-p:leading-8 
                                                prose-headings:text-slate-900 prose-headings:font-bold
                                                prose-li:text-slate-700 prose-strong:text-slate-900
                                                prose-img:rounded-2xl prose-img:shadow-md mb-8"
                                                dangerouslySetInnerHTML={{ __html: option.content }}
                                            />
                                        )}

                                        {/* Video Embed */}
                                        {option.video_url && (
                                            <div className="mb-8 rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-slate-900 aspect-video relative group">
                                                {option.video_url.includes('youtube.com') || option.video_url.includes('youtu.be') ? (
                                                    <iframe
                                                        className="w-full h-full"
                                                        src={option.video_url.replace('watch?v=', 'embed/').split('&')[0]}
                                                        title={option.title}
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                    ></iframe>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                                                        <PlayCircle className="w-16 h-16 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                                                        <a href={option.video_url} target="_blank" rel="noopener noreferrer" className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors font-bold backdrop-blur-sm">
                                                            فتح الفيديو في نافذة جديدة
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Auto-Detected File Preview */}
                                        {option.file_url && (() => {
                                            const fileType = getFileType(option.file_url);

                                            return (
                                                <div className="mt-8 bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                                    {/* File Header */}
                                                    <div className="px-5 py-4 bg-white/80 backdrop-blur border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2.5 rounded-xl ${fileType === 'pdf' ? 'bg-red-50 text-red-600 shadow-sm border border-red-100' : 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100'}`}>
                                                                {fileType === 'pdf' ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                                                            </div>
                                                            <span className="font-bold text-slate-800 text-lg">
                                                                {fileType === 'pdf' ? 'ملف PDF مرفق' : 'صورة مرفقة'}
                                                            </span>
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <a href={option.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl transition-all border border-primary-100 shadow-sm">
                                                                <ExternalLink className="w-4 h-4" />
                                                                <span>فتح</span>
                                                            </a>
                                                            <a href={option.file_url} download className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-xl transition-all border border-slate-200 shadow-sm hover:shadow">
                                                                <Download className="w-4 h-4" />
                                                                <span>تحميل</span>
                                                            </a>
                                                        </div>
                                                    </div>

                                                    {/* File Display Area */}
                                                    <div className="bg-slate-50/50 p-2 sm:p-6 flex justify-center min-h-[300px]">
                                                        {fileType === 'image' && (
                                                            <img
                                                                src={option.file_url}
                                                                alt={option.title}
                                                                className="w-full h-auto rounded-2xl shadow-lg border border-slate-200/60"
                                                                loading="lazy"
                                                            />
                                                        )}

                                                        {fileType === 'pdf' && (
                                                            <div className="w-full flex flex-col gap-6">
                                                                {/* 1. Primary Method: Google Docs Viewer (Best for Mobile/Cross-Device) */}
                                                                <div className="w-full h-[500px] sm:h-[700px] rounded-2xl bg-white shadow-lg overflow-hidden relative border border-slate-200/60 ring-1 ring-black/5">
                                                                    <iframe
                                                                        src={`https://docs.google.com/gview?url=${encodeURIComponent(option.file_url)}&embedded=true`}
                                                                        className="w-full h-full border-0"
                                                                        title="PDF Viewer"
                                                                    ></iframe>
                                                                    <div className="absolute top-0 right-0 p-3 pointer-events-none opacity-40 hover:opacity-100 transition-opacity">
                                                                        <span className="bg-black/10 backdrop-blur-md text-[10px] text-slate-600 px-2 py-1 rounded-md">PDF Mode</span>
                                                                    </div>
                                                                </div>

                                                                {/* 2. Fallback / Alternative Button */}
                                                                <div className="text-center pb-2">
                                                                    <a
                                                                        href={option.file_url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-slate-800 transition-all font-bold hover:scale-[1.02] active:scale-[0.98]"
                                                                    >
                                                                        <FileText className="w-5 h-5" />
                                                                        عرض ملف PDF بحجم كامل
                                                                    </a>
                                                                    <p className="text-xs text-slate-400 mt-3 font-medium">اضغط هنا إذا لم يظهر الملف في الأعلى</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PageView;
