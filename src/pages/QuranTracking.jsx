import { useState } from 'react';
import QuranGrid from '../components/quran/QuranGrid';
import { useQuranParts } from '../hooks/useQuranParts';
import { useAuth } from '../hooks/useAuth';
import { BookOpen, RotateCcw, Trophy } from 'lucide-react';

const QuranTracking = () => {
    const { resetAll, khatmaCount, parts } = useQuranParts();
    const { isAdmin } = useAuth();
    const [resetting, setResetting] = useState(false);

    const selectedCount = parts.filter(p => p.selected_by).length;
    const totalCount = parts.length;
    const progress = totalCount > 0 ? Math.round((selectedCount / totalCount) * 100) : 0;

    const handleResetAll = async () => {
        setResetting(true);
        await resetAll();
        setResetting(false);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <BookOpen className="w-6 h-6 text-primary-600" />
                            متابعة الختمات
                        </h1>
                        <p className="text-slate-500 mt-1">اختر جزءاً لقراءته. سيظهر اسمك تحت الجزء المختار للجميع.</p>
                    </div>

                    {isAdmin && (
                        <button
                            onClick={handleResetAll}
                            disabled={resetting}
                            className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold transition-all border border-red-200 text-sm"
                        >
                            <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
                            إعادة تعيين الكل
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">الأجزاء المختارة</p>
                        <p className="text-xl font-bold text-slate-800">{selectedCount} / {totalCount}</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">عدد الختمات المكتملة</p>
                        <p className="text-xl font-bold text-slate-800">{khatmaCount}</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm text-slate-500">نسبة الإنجاز</p>
                        <p className="text-sm font-bold text-primary-600">{progress}%</p>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3">
                        <div
                            className="bg-gradient-to-r from-primary-500 to-primary-400 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <QuranGrid />
        </div>
    );
};

export default QuranTracking;
