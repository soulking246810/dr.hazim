import { useState } from 'react';
import { FileText, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';

// Set up the worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const FileViewer = ({ fileUrl }) => {
    const [numPages, setNumPages] = useState(null);

    if (!fileUrl) return null;

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

    const getFileType = (url) => {
        try {
            // Remove query params and hash for extension extraction
            const cleanUrl = url.split('?')[0].split('#')[0];
            const ext = cleanUrl.split('.').pop()?.toLowerCase();

            if (['pdf'].includes(ext)) return 'pdf';
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image';

            // Fallback: Check if URL contains strict indicators if extension is missing/obfuscated
            if (url.toLowerCase().includes('.pdf')) return 'pdf';
            if (url.match(/\.(jpeg|jpg|png|gif|webp|svg)/i)) return 'image';

            return 'other';
        } catch (e) {
            return 'other';
        }
    };

    const type = getFileType(fileUrl);

    if (type === 'image') {
        return (
            <div className="w-full flex justify-center bg-slate-50 rounded-xl border border-slate-200 overflow-hidden p-4">
                <img
                    src={fileUrl}
                    alt="Preview"
                    className="max-w-full max-h-[600px] object-contain rounded-lg shadow-sm"
                    loading="lazy"
                />
            </div>
        );
    }

    if (type === 'pdf') {
        return (
            <div className="w-full bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex flex-col items-center p-4">
                {/* PDF Container */}
                <div className="max-h-[800px] overflow-y-auto w-full flex justify-center custom-scrollbar">
                    <Document
                        file={fileUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        className="flex flex-col gap-4"
                        loading={
                            <div className="flex items-center justify-center h-40 w-full">
                                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                            </div>
                        }
                        error={
                            <div className="text-center p-8 text-red-500 bg-red-50 rounded-xl w-full">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                <p className="font-bold">حدث خطأ أثناء تحميل ملف PDF</p>
                                <a href={fileUrl} target="_blank" rel="noreferrer" className="underline mt-2 block text-sm">
                                    اضغط هنا لفتح الملف خارجياً
                                </a>
                            </div>
                        }
                    >
                        {numPages && Array.from(new Array(numPages), (el, index) => (
                            <Page
                                key={`page_${index + 1}`}
                                pageNumber={index + 1}
                                width={Math.min(window.innerWidth - 64, 800)} // Responsive width calculation
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                className="shadow-lg mb-4 rounded-lg overflow-hidden bg-white"
                            />
                        ))}
                    </Document>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span>نوع الملف غير مدعوم للعرض المباشر.</span>
            <a href={fileUrl} target="_blank" rel="noreferrer" className="underline font-bold">تحميل الملف</a>
        </div>
    );
};

export default FileViewer;
