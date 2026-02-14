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

    if (!page) return <div className="text-center p-12 text-slate-500 font-bold text-lg">الصفحة غير موجودة</div>;

    return (
        <div className="max-w-4xl mx-auto pb-20 animate-fade-in relative z-0">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3 leading-tight">{page.title}</h1>
                <div className="h-1.5 w-24 bg-gradient-to-r from-primary-500 to-primary-300 rounded-full"></div>
            </div>

            {/* Menus & Content */}
            <div className="space-y-12">
                {menus.map(menu => (
                    <div key={menu.id}>
                        {/* Section Header */}
                        <div className="flex items-center gap-3 mb-6">
                            <span className="w-1.5 h-6 rounded-full bg-primary-500"></span>
                            <h2 className="text-2xl font-bold text-slate-800">{menu.title}</h2>
                        </div>

                        {/* Lessons List (Accordion) */}
                        <div className="space-y-4">
                            {options[menu.id]?.length === 0 && (
                                <p className="text-slate-400 font-medium py-4 text-sm bg-slate-50 rounded-xl px-4 border border-slate-100 border-dashed">
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
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PageView;
