import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// CRITICAL: Disable the worker entirely.
// This runs PDF parsing on the main thread, which avoids ALL worker compatibility
// issues across Safari, Edge, Firefox, and mobile browsers.
// For a learning platform with typical lesson PDFs, performance is fine.
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

const PdfCanvas = ({ page, scale }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!page || !canvasRef.current) return;
        let cancelled = false;

        const renderPage = async () => {
            const viewport = page.getViewport({ scale });
            const canvas = canvasRef.current;
            if (!canvas || cancelled) return;

            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport,
            };

            try {
                await page.render(renderContext).promise;
            } catch (err) {
                if (!cancelled) console.error('Page render error:', err);
            }
        };

        renderPage();
        return () => { cancelled = true; };
    }, [page, scale]);

    return (
        <canvas
            ref={canvasRef}
            className="shadow-lg rounded-lg bg-white mb-4"
            style={{ maxWidth: '100%', height: 'auto' }}
        />
    );
};

const FileViewer = ({ fileUrl }) => {
    const [pdfDoc, setPdfDoc] = useState(null);
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [scale, setScale] = useState(1.0);
    const containerRef = useRef(null);

    if (!fileUrl) return null;

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

    // Calculate initial scale based on container width
    const calculateScale = useCallback(() => {
        const containerWidth = containerRef.current?.clientWidth || window.innerWidth - 32;
        // Target width for PDF pages (leave some padding)
        const targetWidth = Math.min(containerWidth - 32, 800);
        return targetWidth / 612; // 612 is standard US Letter width in PDF points
    }, []);

    // Load PDF using pdfjs-dist directly (no worker needed)
    useEffect(() => {
        if (type !== 'pdf') return;
        let cancelled = false;

        const loadPdf = async () => {
            setLoading(true);
            setError(null);

            try {
                const loadingTask = pdfjsLib.getDocument({
                    url: fileUrl,
                    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + pdfjsLib.version + '/cmaps/',
                    cMapPacked: true,
                });

                const pdf = await loadingTask.promise;
                if (cancelled) return;

                setPdfDoc(pdf);

                // Load all pages
                const loadedPages = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    if (cancelled) return;
                    loadedPages.push(page);
                }

                setPages(loadedPages);
                setScale(calculateScale());
                setLoading(false);
            } catch (err) {
                console.error('PDF load error:', err);
                if (!cancelled) {
                    setError(err.message || 'Failed to load PDF');
                    setLoading(false);
                }
            }
        };

        loadPdf();
        return () => { cancelled = true; };
    }, [fileUrl, type, calculateScale]);

    // Recalculate scale on window resize
    useEffect(() => {
        if (type !== 'pdf' || !pdfDoc) return;

        const handleResize = () => {
            setScale(calculateScale());
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [type, pdfDoc, calculateScale]);

    // Zoom controls
    const zoomIn = () => setScale(prev => Math.min(prev * 1.25, 3));
    const zoomOut = () => setScale(prev => Math.max(prev * 0.8, 0.5));

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
        // Loading state
        if (loading) {
            return (
                <div className="w-full bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex flex-col items-center justify-center p-8" style={{ minHeight: '300px' }}>
                    <div className="w-10 h-10 border-4 border-slate-300 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-500 text-sm">جاري تحميل ملف PDF...</p>
                </div>
            );
        }

        // Error state — use native browser PDF viewer as fallback
        if (error) {
            return (
                <div className="w-full bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex flex-col items-center" ref={containerRef}>
                    <object
                        data={fileUrl}
                        type="application/pdf"
                        className="w-full rounded-lg"
                        style={{ height: '80vh', maxHeight: '800px', minHeight: '500px' }}
                    >
                        {/* If <object> fails too (e.g. on mobile), show embedded iframe + download */}
                        <div className="text-center p-8">
                            <embed
                                src={fileUrl}
                                type="application/pdf"
                                className="w-full"
                                style={{ height: '70vh', minHeight: '400px' }}
                            />
                            <div className="mt-4 space-y-2">
                                <p className="text-slate-600 text-sm">إذا لم يظهر الملف، يمكنك تحميله:</p>
                                <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-bold text-sm hover:bg-blue-600 transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    تحميل الملف
                                </a>
                            </div>
                        </div>
                    </object>
                </div>
            );
        }

        // Success — render pages to canvases
        return (
            <div className="w-full bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex flex-col items-center" ref={containerRef}>
                {/* Toolbar */}
                <div className="w-full flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
                    <span className="text-sm text-slate-500">{pages.length} صفحة</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={zoomOut}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                            title="تصغير"
                        >
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-slate-500 min-w-[3rem] text-center">
                            {Math.round(scale * 100)}%
                        </span>
                        <button
                            onClick={zoomIn}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                            title="تكبير"
                        >
                            <ZoomIn className="w-4 h-4" />
                        </button>
                        <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                            title="فتح في نافذة جديدة"
                        >
                            <Download className="w-4 h-4" />
                        </a>
                    </div>
                </div>

                {/* Pages */}
                <div className="max-h-[800px] overflow-y-auto w-full flex flex-col items-center p-4 gap-4 custom-scrollbar">
                    {pages.map((page, index) => (
                        <PdfCanvas key={index} page={page} scale={scale} />
                    ))}
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
