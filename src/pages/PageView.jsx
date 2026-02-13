import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, getWorkingFileUrl } from '../lib/supabase';
import { ChevronDown, ChevronUp, PlayCircle, ExternalLink, Download } from 'lucide-react';
import FilePreviewModal from '../components/FilePreviewModal'; // Keep fallback? No, replacing with inline.

const PageView = () => {
    const { id } = useParams();
    const [page, setPage] = useState(null);
    const [menus, setMenus] = useState([]);
    const [options, setOptions] = useState({});
    const [loading, setLoading] = useState(true);
    const [openMenus, setOpenMenus] = useState({});

    // Inline preview is default now

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

            // Open all menus by default for better reading flow
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
        <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
    );

    if (!page) return <div className="text-center p-12 text-slate-500">الصفحة غير موجودة</div>;

    return (
        <div className="max-w-4xl mx-auto pb-12 animate-fade-in relative z-0">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">{page.title}</h1>
                    <div className="h-1 w-20 bg-primary-500 rounded-full"></div>
                </div>
            </div>

            {/* Menus & Content */}
            <div className="space-y-4">
                {menus.map(menu => (
                    <div key={menu.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-300">
                        <button
                            onClick={() => toggleMenu(menu.id)}
                            className="w-full flex items-center justify-between p-4 sm:p-5 bg-gradient-to-l from-white to-slate-50 hover:bg-slate-50 transition-colors"
                        >
                            <h2 className="text-lg font-bold text-slate-700">{menu.title}</h2>
                            {openMenus[menu.id] ? (
                                <ChevronUp className="w-5 h-5 text-primary-500" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-slate-400" />
                            )}
                        </button>

                        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${openMenus[menu.id] ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="p-4 sm:p-6 space-y-8 border-t border-slate-100">
                                {options[menu.id]?.length === 0 && (
                                    <p className="text-center text-slate-400 text-sm py-4">لا يوجد محتوى في هذا القسم</p>
                                )}

                                {options[menu.id]?.map((option, index) => (
                                    <div key={option.id} className={`${index > 0 ? 'pt-6 border-t border-slate-50' : ''}`}>
                                        <h3 className="text-xl font-bold text-primary-800 mb-4 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-primary-400 inline-block"></span>
                                            {option.title}
                                        </h3>

                                        {/* HTML Content (Reading Layout) */}
                                        {option.content && (
                                            <div
                                                className="prose prose-slate max-w-none prose-p:text-slate-600 prose-p:leading-relaxed prose-headings:text-slate-800 prose-img:rounded-xl mb-6"
                                                dangerouslySetInnerHTML={{ __html: option.content }}
                                            />
                                        )}

                                        {/* Video Embed */}
                                        {option.video_url && (
                                            <div className="mb-6 rounded-2xl overflow-hidden shadow-lg border border-slate-100 bg-black aspect-video relative group">
                                                {option.video_url.includes('youtube.com') || option.video_url.includes('youtu.be') ? (
                                                    <iframe
                                                        className="w-full h-full"
                                                        src={option.video_url.replace('watch?v=', 'embed/').split('&')[0]}
                                                        title={option.title}
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                    ></iframe>
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-slate-400">
                                                        <a href={option.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                                                            <PlayCircle className="w-10 h-10" />
                                                            <span>رابط الفيديو خارجي</span>
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Inline File Preview (Module) */}
                                        {option.file_url && (() => {
                                            const fileType = getFileType(option.file_url);

                                            return (
                                                <div className="mt-6 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                                    {/* File Header */}
                                                    <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
                                                        <span className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                                            {fileType === 'pdf' ? '📄 ملف PDF' : '🖼️ صورة مرفقة'}
                                                        </span>
                                                        <div className="flex gap-2">
                                                            <a href={option.file_url} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="فتح في نافذة جديدة">
                                                                <ExternalLink className="w-4 h-4" />
                                                            </a>
                                                            <a href={option.file_url} download className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="تحميل">
                                                                <Download className="w-4 h-4" />
                                                            </a>
                                                        </div>
                                                    </div>

                                                    {/* File Content */}
                                                    <div className="bg-slate-100/50 p-1 flex justify-center min-h-[300px]">
                                                        {fileType === 'image' && (
                                                            <img
                                                                src={option.file_url}
                                                                alt={option.title}
                                                                className="max-w-full h-auto rounded-xl shadow-sm object-contain max-h-[600px]"
                                                            />
                                                        )}
                                                        {fileType === 'pdf' && (
                                                            <object
                                                                data={option.file_url}
                                                                type="application/pdf"
                                                                className="w-full h-[600px] sm:h-[700px] rounded-xl bg-white shadow-sm"
                                                            >
                                                                {/* Fallback for mobile/no-pdf-support */}
                                                                <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500 gap-4">
                                                                    <p>لا يمكن عرض ملف PDF داخل المتصفح.</p>
                                                                    <a
                                                                        href={option.file_url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="px-6 py-2 bg-primary-600 text-white rounded-xl shadow-lg hover:bg-primary-700 transition-all font-bold"
                                                                    >
                                                                        فتح الملف في نافذة جديدة
                                                                    </a>
                                                                </div>
                                                            </object>
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
