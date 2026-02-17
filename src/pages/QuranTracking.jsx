import { useState } from 'react';
import QuranGrid from '../components/quran/QuranGrid';
import { useQuranParts } from '../hooks/useQuranParts';
import { useAuth } from '../hooks/useAuth';
import { BookOpen, PlusCircle, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';

const QuranTracking = () => {
    const { completeTrack, khatmaCount, parts, loading, togglePart, trackName } = useQuranParts();
    const { isAdmin } = useAuth();

    const [actionModalOpen, setActionModalOpen] = useState(false);
    const [newTrackName, setNewTrackName] = useState('');
    const [processing, setProcessing] = useState(false);

    const selectedCount = parts.filter(p => p.selected_by || p.guest_name).length;
    const totalCount = parts.length;
    const progress = totalCount > 0 ? Math.round((selectedCount / totalCount) * 100) : 0;

    const handleAddTrack = async () => {
        if (!newTrackName.trim()) {
            toast.error('الرجاء إدخال اسم للختمة الجديدة');
            return;
        }
        setProcessing(true);
        await completeTrack(newTrackName);
        setProcessing(false);
        setActionModalOpen(false);
        setNewTrackName('');
    };

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16 blur-2xl opacity-50"></div>

                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-10">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <BookOpen className="w-8 h-8 text-primary-600" />
                            <span className="flex flex-col">
                                <span>الختمات القرآنية الجماعية</span>
                                <span className="text-sm font-normal text-primary-600 mt-1 bg-primary-50 px-3 py-1 rounded-lg w-fit">
                                    {trackName}
                                </span>
                            </span>
                        </h1>
                        <p className="text-slate-500 mt-2 text-sm md:text-base max-w-2xl leading-relaxed">
                            اختر جزءاً لقراءته من الجدول أدناه. عند اختيارك، سيتم تسجيل اسمك ليراه الجميع.
                        </p>
                    </div>

                    {isAdmin && (
                        <button
                            onClick={() => setActionModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold transition-all shadow-lg shadow-slate-900/20"
                        >
                            <PlusCircle className="w-5 h-5" />
                            <span>إضافة ختمة جديدة</span>
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

                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm text-slate-500">نسبة الإنجاز</p>
                        <p className="text-sm font-bold text-primary-600">{progress}%</p>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-primary-500 to-primary-400 h-3 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <QuranGrid parts={parts} loading={loading} togglePart={togglePart} />

            {/* Admin Action Modal */}
            {actionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-slate-800 mb-2">بدء ختمة جديدة</h3>
                            <p className="text-slate-500 text-sm mb-6">
                                سيتم أرشفة الختمة الحالية "{trackName}" وإعادة تعيين جميع الأجزاء للبدء من جديد.
                            </p>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-slate-700 mb-2">اسم الختمة الجديدة</label>
                                <input
                                    type="text"
                                    value={newTrackName}
                                    onChange={(e) => setNewTrackName(e.target.value)}
                                    placeholder="مثلاً: ختمة رمضان ١٤٤٥"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                                />
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setActionModalOpen(false)}
                                    disabled={processing}
                                    className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors disabled:opacity-50"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleAddTrack}
                                    disabled={processing || !newTrackName.trim()}
                                    className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {processing ? 'جاري الحفظ...' : 'تأكيد وبدء'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuranTracking;
