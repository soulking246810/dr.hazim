import { useState, useEffect } from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';

// KEY FIX 1: Point to the local worker file in your public folder
// Ensure you copied 'pdf.worker.min.mjs' from node_modules/pdfjs-dist/build/ to your public/ folder
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// KEY FIX 2: Polyfill for Promise.withResolvers (Required for latest react-pdf on older Safari/Edge)
if (typeof Promise.withResolvers === 'undefined') {
    if (window)
        window.Promise.withResolvers = function () {
            let resolve, reject;
            const promise = new Promise((res, rej) => {
                resolve = res;
                reject = rej;
            });
            return { promise, resolve, reject };
        };
}

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const FileViewer = ({ fileUrl }) => {
    const [numPages, setNumPages] = useState(null);
    const [containerWidth, setContainerWidth] = useState(null);

    // Responsive width handler
    useEffect(() => {
        const updateWidth = () => {
            const width = Math.min(window.innerWidth - 64, 800);
            setContainerWidth(width);
        };

        // Set initial
        updateWidth();

        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    if (!fileUrl) return null;

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

    const getFileType = (url) => {
        try {
            const cleanUrl = url.split('?')[0].split('#')[0];
            const ext = cleanUrl.split('.').pop()?.toLowerCase();
            if (['pdf'].includes(ext)) return 'pdf';
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image';
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
                <div className="max-h-[800px] overflow-y-auto w-full flex justify-center custom-scrollbar">
                    <Document
                        file={fileUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        className="flex flex-col gap-4"
                        // KEY FIX 3: Add cMapUrl. This fixes blank/garbled text on Safari/iOS
                        options={{
                            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                            cMapPacked: true,
                        }}
                        loading={
                            <div className="flex items-center justify-center h-40 w-full">
                                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                            </div>
                        }
                        error={
                            <div className="text-center p-8 text-red-500 bg-red-50 rounded-xl w-full">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                <p className="font-bold">Error loading PDF</p>
                                <p className="text-xs text-red-400 mt-1">Try opening externally</p>
                                <a href={fileUrl} target="_blank" rel="noreferrer" className="underline mt-2 block text-sm">
                                    Open File
                                </a>
                            </div>
                        }
                    >
                        {numPages && containerWidth && Array.from(new Array(numPages), (el, index) => (
                            <Page
                                key={`page_${index + 1}`}
                                pageNumber={index + 1}
                                width={containerWidth}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                className="shadow-lg mb-4 rounded-lg overflow-hidden bg-white"
                                loading={
                                    <div className="h-[500px] w-full bg-white animate-pulse rounded-lg mb-4" />
                                }
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
            <span>File type not supported for direct preview.</span>
            <a href={fileUrl} target="_blank" rel="noreferrer" className="underline font-bold">Download</a>
        </div>
    );
};

export default FileViewer;