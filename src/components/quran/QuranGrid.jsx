import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import clsx from 'clsx';
import { CheckCircle, Lock } from 'lucide-react';

const QuranGrid = ({ parts, loading, togglePart }) => {
    const { user, isAdmin } = useAuth();
    const [confirmModal, setConfirmModal] = useState(null);
    const [guestName, setGuestName] = useState('');

    // Device ID check (read from localStorage just for UI state matching)
    const deviceId = localStorage.getItem('quran_app_device_id');

    if (loading) {
        return (
            <div className="text-center py-10">
                <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-slate-500">جاري تحميل الأجزاء...</p>
            </div>
        );
    }

    const handlePartClick = (part) => {
        const isTaken = !!(part.selected_by || part.guest_name);

        let isTakenByMe = false;
        if (user && part.selected_by === user.id) isTakenByMe = true;
        if (!user && part.device_id === deviceId) isTakenByMe = true;

        if (isTaken && !isTakenByMe && !isAdmin) return;

        setConfirmModal({
            partId: part.id,
            partNumber: part.part_number,
            isSelected: isTaken,
            selectedBy: part.selected_by,
            guestName: part.guest_name,
            deviceId: part.device_id,
            takenByName: part.profiles?.full_name || part.guest_name || 'مستخدم',
            isTakenByMe
        });
        setGuestName(''); // Reset input
    };

    const handleConfirm = async () => {
        if (!confirmModal) return;

        if (!confirmModal.isSelected && !user && !guestName.trim()) {
            return; // Prevent empty name for guests
        }

        await togglePart(
            confirmModal.partId,
            confirmModal.isSelected,
            confirmModal.selectedBy,
            confirmModal.guestName,
            confirmModal.deviceId,
            guestName // Pass new guest name
        );
        setConfirmModal(null);
    };

    return (
        <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
                {parts.map((part) => {
                    const isTaken = !!(part.selected_by || part.guest_name);

                    let isTakenByMe = false;
                    if (user && part.selected_by === user.id) isTakenByMe = true;
                    if (!user && part.device_id === deviceId) isTakenByMe = true;

                    const takenByName = part.profiles?.full_name || part.guest_name || 'مستخدم';

                    return (
                        <button
                            key={part.id}
                            onClick={() => handlePartClick(part)}
                            disabled={isTaken && !isTakenByMe && !isAdmin}
                            className={clsx(
                                "relative rounded-2xl p-3 md:p-4 flex flex-col items-center justify-center transition-all duration-300 border shadow-sm group min-h-[100px]",
                                !isTaken
                                    ? "bg-white border-slate-200 hover:border-primary-500 hover:shadow-md hover:-translate-y-1 cursor-pointer"
                                    : isTakenByMe
                                        ? "bg-primary-50 border-primary-200 cursor-pointer"
                                        : "bg-slate-50 border-slate-200 opacity-90 cursor-not-allowed"
                            )}
                        >
                            <span className={clsx(
                                "text-2xl md:text-3xl font-bold mb-1",
                                !isTaken ? "text-primary-600" : isTakenByMe ? "text-primary-700" : "text-slate-400"
                            )}>
                                {part.part_number}
                            </span>

                            <span className={clsx(
                                "text-[10px] md:text-xs font-medium z-10 text-center leading-tight truncate w-full px-1",
                                "text-slate-500"
                            )}>
                                {!isTaken ? 'متاح' : isTakenByMe ? (user ? 'أنت' : takenByName) : takenByName}
                            </span>

                            {isTaken && (
                                <div className="absolute top-2 left-2">
                                    {isTakenByMe ? (
                                        <CheckCircle className="w-4 h-4 text-primary-500" />
                                    ) : (
                                        <Lock className="w-3 h-3 text-slate-400" />
                                    )}
                                </div>
                            )}

                            {isTaken && isAdmin && !isTakenByMe && (
                                <div className="absolute inset-0 bg-red-500/10 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">إلغاء</span>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Confirmation Modal */}
            {confirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
                        <div className="p-6 text-center">
                            <div className={clsx(
                                "w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold",
                                confirmModal.isSelected ? "bg-red-50 text-red-600" : "bg-primary-50 text-primary-600"
                            )}>
                                {confirmModal.partNumber}
                            </div>

                            <h3 className="text-xl font-bold text-slate-800 mb-2">
                                {confirmModal.isSelected
                                    ? (confirmModal.isTakenByMe ? 'إلغاء اختيارك' : `إلغاء اختيار ${confirmModal.takenByName}`)
                                    : 'تأكيد الاختيار'}
                            </h3>

                            <p className="text-slate-500 text-sm leading-relaxed mb-4">
                                {confirmModal.isSelected
                                    ? `هل أنت متأكد من إلغاء اختيار الجزء ${confirmModal.partNumber}؟`
                                    : `هل أنت متأكد من اختيار الجزء ${confirmModal.partNumber}؟`}
                            </p>

                            {/* Guest Name Input */}
                            {!user && !confirmModal.isSelected && (
                                <div className="mb-4">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">الاسم الكريم</label>
                                    <input
                                        type="text"
                                        value={guestName}
                                        onChange={(e) => setGuestName(e.target.value)}
                                        placeholder="اكتب اسمك هنا..."
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-center"
                                        autoFocus
                                    />
                                    <p className="text-xs text-slate-500 mt-2">سيتم تسجيل هذا الجزء باسمك.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!user && !confirmModal.isSelected && !guestName.trim()}
                                className={clsx(
                                    "flex-1 py-3 text-white rounded-xl font-bold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed",
                                    confirmModal.isSelected
                                        ? "bg-red-500 hover:bg-red-600 shadow-red-500/30"
                                        : "bg-primary-600 hover:bg-primary-700 shadow-primary-500/30"
                                )}
                            >
                                {confirmModal.isSelected ? 'نعم، إلغاء' : 'تأكيد وحفظ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default QuranGrid;
