import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AlertCircle, ZoomIn, ZoomOut, Download } from 'lucide-react';

// Use pdfjs-dist v3 — battle-tested, works on ALL browsers (Chrome, Safari, Edge, Firefox)
// The .js worker (not .mjs) is supported everywhere
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

// Use the local .js worker file (copied to public/) for maximum cross-browser compatibility
// This is a classic .js file, NOT a .mjs module — works on ALL browsers including Safari
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

/* ------------------------------------------------------------------ */
/*  Single PDF page rendered as a high-res IMAGE                      */
/*  Renders at 2× resolution for crisp Arabic text, then converts     */
/*  to a PNG image — guarantees ALL content looks perfect.             */
/* ------------------------------------------------------------------ */
const RENDER_SCALE_MULTIPLIER = 2; // 2× for Retina-quality output

const PdfPage = ({ page, scale }) => {
    const [imgSrc, setImgSrc] = useState(null);
    const renderTaskRef = useRef(null);

    useEffect(() => {
        if (!page) return;
        let cancelled = false;

        // Cancel previous render
        if (renderTaskRef.current) {
            renderTaskRef.current.cancel();
            renderTaskRef.current = null;
        }

        const renderToImage = async () => {
            try {
                // Render at 2× the display scale for crisp text
                const hiResScale = scale * RENDER_SCALE_MULTIPLIER;
                const viewport = page.getViewport({ scale: hiResScale });

                // Create an offscreen canvas
                const offscreen = document.createElement('canvas');
                offscreen.width = viewport.width;
                offscreen.height = viewport.height;
                const ctx = offscreen.getContext('2d');

                const renderTask = page.render({
                    canvasContext: ctx,
                    viewport: viewport,
                });
                renderTaskRef.current = renderTask;

                await renderTask.promise;

                if (!cancelled) {
                    // Convert to image data URL (PNG)
                    const dataUrl = offscreen.toDataURL('image/png');
                    setImgSrc(dataUrl);
                }

                // Clean up offscreen canvas
                offscreen.width = 0;
                offscreen.height = 0;
            } catch (err) {
                if (err?.name !== 'RenderingCancelled' && !cancelled) {
                    console.warn('Page render issue:', err);
                }
            }
        };

        renderToImage();

        return () => {
            cancelled = true;
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
                renderTaskRef.current = null;
            }
        };
    }, [page, scale]);

    if (!imgSrc) {
        // Placeholder while rendering
        return (
            <div className="w-full flex items-center justify-center bg-white rounded-lg shadow-lg"
                style={{ aspectRatio: '210 / 297', maxWidth: '100%' }}>
                <div className="w-6 h-6 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <img
            src={imgSrc}
            alt={`PDF page`}
            className="shadow-lg rounded-lg bg-white"
            style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
        />
    );
};

/* ------------------------------------------------------------------ */
/*  Main FileViewer component                                         */
/* ------------------------------------------------------------------ */
const FileViewer = ({ fileUrl }) => {
    const [pages, setPages] = useState([]);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [scale, setScale] = useState(1.0);
    const containerRef = useRef(null);

    // Determine file type
    const type = useMemo(() => {
        if (!fileUrl) return null;
        try {
            const cleanUrl = fileUrl.split('?')[0].split('#')[0];
            const ext = cleanUrl.split('.').pop()?.toLowerCase();
            if (ext === 'pdf') return 'pdf';
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image';
            if (fileUrl.toLowerCase().includes('.pdf')) return 'pdf';
            if (fileUrl.match(/\.(jpeg|jpg|png|gif|webp|svg)/i)) return 'image';
            return 'other';
        } catch {
            return 'other';
        }
    }, [fileUrl]);

    // Calculate the best scale for the screen width
    const calculateScale = useCallback(() => {
        const w = containerRef.current?.clientWidth || window.innerWidth;
        const target = Math.min(w - 48, 800);
        // 612 = standard PDF page width in points (US Letter)
        return Math.max(target / 612, 0.5);
    }, []);

    /* ---- Load PDF ---- */
    useEffect(() => {
        if (type !== 'pdf' || !fileUrl) return;
        let cancelled = false;

        (async () => {
            setLoading(true);
            setError(false);
            setPages([]);

            try {
                const pdf = await pdfjsLib.getDocument({
                    url: fileUrl,
                    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
                    cMapPacked: true,
                    standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
                }).promise;

                if (cancelled) return;
                setTotalPages(pdf.numPages);

                // Load ALL pages
                const allPages = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    const pg = await pdf.getPage(i);
                    if (cancelled) return;
                    allPages.push(pg);
                }

                if (!cancelled) {
                    setPages(allPages);
                    setScale(calculateScale());
                    setLoading(false);
                }
            } catch (err) {
                console.error('PDF.js load error:', err);
                if (!cancelled) {
                    setError(true);
                    setLoading(false);
                }
            }
        })();

        return () => { cancelled = true; };
    }, [fileUrl, type, calculateScale]);

    /* ---- Resize handler ---- */
    useEffect(() => {
        if (pages.length === 0) return;
        const onResize = () => setScale(calculateScale());
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [pages, calculateScale]);

    /* ---- Zoom controls ---- */
    const zoomIn = () => setScale((s) => Math.min(s * 1.25, 4));
    const zoomOut = () => setScale((s) => Math.max(s * 0.8, 0.4));

    /* ---- Early return ---- */
    if (!fileUrl) return null;

    /* ---- IMAGE ---- */
    if (type === 'image') {
        return (
            <div className="w-full flex justify-center bg-slate-50 rounded-xl border border-slate-200 overflow-hidden p-4">
                <img src={fileUrl} alt="Preview"
                    className="max-w-full max-h-[600px] object-contain rounded-lg shadow-sm"
                    loading="lazy" />
            </div>
        );
    }

    /* ---- PDF: Loading ---- */
    if (type === 'pdf' && loading) {
        return (
            <div className="w-full bg-slate-100 rounded-xl border border-slate-200 flex flex-col items-center justify-center p-8"
                style={{ minHeight: 300 }}>
                <div className="w-10 h-10 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin mb-4" />
                <p className="text-slate-500 text-sm">جاري تحميل ملف PDF...</p>
            </div>
        );
    }

    /* ---- PDF: Error → Mozilla hosted viewer fallback ---- */
    if (type === 'pdf' && error) {
        const mozillaViewerUrl =
            `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(fileUrl)}`;
        const googleViewerUrl =
            `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;

        return (
            <div className="w-full bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex flex-col items-center"
                ref={containerRef}>
                {/* Try Mozilla PDF.js hosted viewer first */}
                <iframe
                    src={mozillaViewerUrl}
                    title="Mozilla PDF.js Viewer"
                    className="w-full border-0 rounded-t-xl"
                    style={{ height: '80vh', maxHeight: '800px', minHeight: '500px' }}
                    allowFullScreen
                />
                {/* Backup links */}
                <div className="w-full flex flex-wrap items-center justify-center gap-3 p-3 bg-white border-t border-slate-200">
                    <a href={googleViewerUrl} target="_blank" rel="noreferrer"
                        className="text-xs text-blue-600 underline">
                        فتح في Google Docs Viewer
                    </a>
                    <span className="text-slate-300">|</span>
                    <a href={fileUrl} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 underline">
                        <Download className="w-3 h-3" /> تحميل الملف
                    </a>
                </div>
            </div>
        );
    }

    /* ---- PDF: Success → Render all pages ---- */
    if (type === 'pdf' && pages.length > 0) {
        return (
            <div className="w-full bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex flex-col"
                ref={containerRef}>

                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-2 bg-white/90 backdrop-blur border-b border-slate-200 sticky top-0 z-10">
                    <span className="text-sm text-slate-600 font-medium">{totalPages} صفحة</span>
                    <div className="flex items-center gap-1">
                        <button onClick={zoomOut} className="p-1.5 rounded hover:bg-slate-100 text-slate-600" title="تصغير">
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-slate-500 w-12 text-center">{Math.round(scale * 100)}%</span>
                        <button onClick={zoomIn} className="p-1.5 rounded hover:bg-slate-100 text-slate-600" title="تكبير">
                            <ZoomIn className="w-4 h-4" />
                        </button>
                        <a href={fileUrl} target="_blank" rel="noreferrer"
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-600 mr-1" title="تحميل">
                            <Download className="w-4 h-4" />
                        </a>
                    </div>
                </div>

                {/* All pages – scrollable */}
                <div className="overflow-y-auto w-full flex flex-col items-center p-4 gap-4 custom-scrollbar"
                    style={{ maxHeight: '85vh' }}>
                    {pages.map((page, idx) => (
                        <PdfPage key={`pdf-page-${idx}`} page={page} scale={scale} />
                    ))}
                </div>
            </div>
        );
    }

    /* ---- OTHER / unsupported ---- */
    return (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span>نوع الملف غير مدعوم للعرض المباشر.</span>
            <a href={fileUrl} target="_blank" rel="noreferrer" className="underline font-bold">تحميل الملف</a>
        </div>
    );
};

export default FileViewer;
