import { useEffect } from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

const FilePreviewModal = ({ isOpen, onClose, fileUrl, fileType, title }) => {
    // Close on ESC key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" />

            {/* Modal Content */}
            <div
                className="relative z-10 w-full h-full flex flex-col max-w-5xl max-h-[95vh] m-2 sm:m-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between bg-white rounded-t-2xl px-4 py-3 border-b border-slate-100 shrink-0">
                    <h3 className="font-bold text-slate-800 text-sm truncate ml-4">{title || 'عرض الملف'}</h3>
                    <div className="flex items-center gap-2">
                        <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="فتح في نافذة جديدة"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                        <a
                            href={fileUrl}
                            download
                            className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="تحميل"
                        >
                            <Download className="w-4 h-4" />
                        </a>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 bg-white rounded-b-2xl overflow-auto flex items-center justify-center">
                    {fileType === 'image' && (
                        <img
                            src={fileUrl}
                            alt={title || 'صورة'}
                            className="max-w-full max-h-[80vh] object-contain p-4"
                        />
                    )}

                    {fileType === 'pdf' && (
                        <div className="w-full h-full flex flex-col">
                            {/* PDF embed for desktop */}
                            <object
                                data={fileUrl}
                                type="application/pdf"
                                className="w-full flex-1 hidden sm:block"
                                style={{ minHeight: '70vh' }}
                            >
                                <div className="flex flex-col items-center justify-center py-16 gap-4">
                                    <p className="text-slate-500">لا يمكن عرض الملف مباشرة</p>
                                    <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-primary-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors"
                                    >
                                        فتح ملف PDF
                                    </a>
                                </div>
                            </object>
                            {/* Mobile fallback — PDF can't embed well on mobile */}
                            <div className="flex sm:hidden flex-col items-center justify-center py-16 gap-4 px-4">
                                <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                                    <svg className="w-10 h-10 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                </div>
                                <p className="text-slate-600 font-bold text-lg">ملف PDF</p>
                                <p className="text-slate-400 text-sm text-center">اضغط الزر أدناه لفتح الملف</p>
                                <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-primary-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/30"
                                >
                                    فتح ملف PDF
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FilePreviewModal;
