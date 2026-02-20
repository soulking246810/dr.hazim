import { useEffect } from 'react';
import { X, Download, ExternalLink } from 'lucide-react';
import FileViewer from './LessonViewer/FileViewer';

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
                        <div className="w-full h-full flex-1 overflow-hidden bg-slate-100">
                            <FileViewer fileUrl={fileUrl} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FilePreviewModal;
