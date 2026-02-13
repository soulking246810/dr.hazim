import { useState } from 'react';
import { useQuranParts } from '../../hooks/useQuranParts';
import { useAuth } from '../../hooks/useAuth';
import clsx from 'clsx';
import { CheckCircle, Lock, X } from 'lucide-react';

const QuranGrid = () => {
    const { parts, loading, togglePart } = useQuranParts();
    const { user, isAdmin } = useAuth();
    const [confirmModal, setConfirmModal] = useState(null); // { partId, partNumber, isSelected, selectedBy }

    if (loading) {
        return (
            <div className="text-center py-10">
                <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-slate-500">جاري تحميل الأجزاء...</p>
            </div>
        );
    }

    const handlePartClick = (part) => {
        const isTaken = !!part.selected_by;
        const isTakenByMe = part.selected_by === user?.id;

        // If taken by someone else and not admin, do nothing
        if (isTaken && !isTakenByMe && !isAdmin) return;

        // Show confirmation modal
        setConfirmModal({
            partId: part.id,
            partNumber: part.part_number,
            isSelected: isTaken,
            selectedBy: part.selected_by,
            takenByName: part.profiles?.full_name || 'مستخدم',
            isTakenByMe
        });
    };

    const handleConfirm = async () => {
        if (!confirmModal) return;
        await togglePart(confirmModal.partId, confirmModal.isSelected, confirmModal.selectedBy);
        setConfirmModal(null);
    };

    return (
        <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
                {parts.map((part) => {
                    const isTaken = !!part.selected_by;
                    const isTakenByMe = part.selected_by === user?.id;
                    const takenByName = part.profiles?.full_name || 'مستخدم';

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
                                "text-[10px] md:text-xs font-medium z-10 text-center leading-tight",
                                isTaken && !isTakenByMe ? "text-slate-500" : "text-slate-500"
                            )}>
                                {!isTaken ? 'متاح' : isTakenByMe ? 'اختياري' : takenByName}
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

                            {/* Admin Reset Overlay */}
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

                            <p className="text-slate-500 text-sm leading-relaxed">
                                {confirmModal.isSelected
                                    ? `هل أنت متأكد من إلغاء اختيار الجزء ${confirmModal.partNumber}؟`
                                    : `هل أنت متأكد من اختيار الجزء ${confirmModal.partNumber}؟ سيظهر اسمك تحت هذا الجزء للجميع.`}
                            </p>
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
                                className={clsx(
                                    "flex-1 py-3 text-white rounded-xl font-bold transition-all shadow-lg",
                                    confirmModal.isSelected
                                        ? "bg-red-500 hover:bg-red-600 shadow-red-500/30"
                                        : "bg-primary-600 hover:bg-primary-700 shadow-primary-500/30"
                                )}
                            >
                                {confirmModal.isSelected ? 'نعم، إلغاء' : 'نعم، اختيار'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default QuranGrid;
