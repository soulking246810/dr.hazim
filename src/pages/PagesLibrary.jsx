import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Book } from 'lucide-react';

const PagesLibrary = () => {
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        const { data, error } = await supabase.from('pages').select('*').order('order_index');
        if (!error) setPages(data);
        setLoading(false);
    };

    if (loading) return <div className="text-center p-10 font-sakkal text-2xl">تحميل...</div>;

    return (
        <div className="space-y-8 font-sakkal">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <h1 className="text-4xl font-bold text-slate-800">المكتبة</h1>
                <p className="text-slate-500 mt-2 text-xl">تصفح المحتوى والدروس المتاحة.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pages.map(page => (
                    <Link key={page.id} to={`/pages/${page.id}`} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:border-primary-500 hover:shadow-md transition-all group">
                        <div className="w-14 h-14 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors mb-6">
                            <Book className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800">{page.title}</h3>
                        <p className="text-slate-500 mt-3 text-lg">اضغط للتصفح</p>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default PagesLibrary;
