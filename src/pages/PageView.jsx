import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, getWorkingFileUrl } from '../lib/supabase';
import LessonAccordion from '../components/LessonViewer/LessonAccordion';

const PageView = () => {
    const { id } = useParams();
    const [page, setPage] = useState(null);
    const [menus, setMenus] = useState([]);
    const [options, setOptions] = useState({});
    const [loading, setLoading] = useState(true);

    const [fontSize, setFontSize] = useState(2); // Default to middle

    // Scoped Font Sizes
    const menuSizes = ['text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl'];
    const contentSizes = ['prose-xl', 'prose-2xl', 'text-2xl leading-relaxed', 'text-3xl leading-relaxed', 'text-4xl leading-relaxed'];

    // Accordion State: Track which lesson ID is currently expanded
    const [expandedLessonId, setExpandedLessonId] = useState(null);

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
        }
        setLoading(false);
    };

    const handleLessonToggle = (lessonId) => {
        setExpandedLessonId(prevId => prevId === lessonId ? null : lessonId);
    };

    if (loading) return (
        <div className="flex items-center justify-center p-12 h-[50vh]">
            <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
    );

    if (!page) return <div className="text-center p-12 text-slate-500 font-bold text-2xl font-sakkal">الصفحة غير موجودة</div>;

    return (
        <div className="max-w-4xl mx-auto pb-32 animate-fade-in relative z-0 font-sakkal">
            {/* Header */}
            <div className="mb-10 text-center sm:text-right">
                <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 mb-4 leading-tight">{page.title}</h1>
                <div className="h-2 w-32 bg-gradient-to-r from-primary-500 to-primary-300 rounded-full inline-block sm:block"></div>
            </div>

            {/* Menus & Content */}
            <div className="space-y-12">
                {menus.map(menu => (
                    <div key={menu.id}>
                        {/* Section Header */}
                        <div className="flex items-center gap-3 mb-6">
                            <span className="w-2 h-8 rounded-full bg-primary-500"></span>
                            <h2 className={`font-bold text-slate-800 transition-all ${menuSizes[fontSize]}`}>{menu.title}</h2>
                        </div>

                        {/* Lessons List (Accordion) */}
                        <div className="space-y-4">
                            {options[menu.id]?.length === 0 && (
                                <p className="text-slate-400 font-medium py-6 text-xl bg-slate-50 rounded-xl px-4 border border-slate-100 border-dashed">
                                    لا يوجد دروس في هذا القسم حالياً
                                </p>
                            )}

                            {options[menu.id]?.map((lesson, index) => (
                                <LessonAccordion
                                    key={lesson.id}
                                    lesson={lesson}
                                    index={index}
                                    isOpen={expandedLessonId === lesson.id}
                                    onToggle={() => handleLessonToggle(lesson.id)}
                                    fontSizeClass={contentSizes[fontSize]}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Font Control */}
            <div className="fixed bottom-3 left-3 z-50 flex items-center gap-1.5 bg-white/95 p-1.5 rounded-full shadow-2xl border border-slate-200 backdrop-blur-md transition-all hover:scale-105">
                <button
                    onClick={() => setFontSize(prev => Math.min(prev + 1, 4))}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-700 font-bold text-sm border border-slate-100 shadow-sm transition-colors"
                    aria-label="تكبير الخط"
                >
                    A+
                </button>
                <div className="w-px h-4 bg-slate-300"></div>
                <button
                    onClick={() => setFontSize(prev => Math.max(prev - 1, 0))}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-100 shadow-sm transition-colors"
                    aria-label="تصغير الخط"
                >
                    A-
                </button>
            </div>
        </div>
    );
};

export default PageView;
