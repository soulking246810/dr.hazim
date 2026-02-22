import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, PlayCircle } from 'lucide-react';
import FileViewer from './FileViewer';

/**
 * Convert any YouTube URL to an embeddable URL.
 * Supports: watch?v=, youtu.be/, /embed/, /shorts/, /live/
 */
const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    let videoId = null;

    try {
        const urlObj = new URL(url);

        if (urlObj.hostname.includes('youtu.be')) {
            // https://youtu.be/VIDEO_ID
            videoId = urlObj.pathname.slice(1).split('/')[0];
        } else if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtube-nocookie.com')) {
            if (urlObj.pathname.startsWith('/embed/')) {
                // Already an embed URL
                videoId = urlObj.pathname.split('/embed/')[1]?.split('/')[0];
            } else if (urlObj.pathname.startsWith('/shorts/')) {
                videoId = urlObj.pathname.split('/shorts/')[1]?.split('/')[0];
            } else if (urlObj.pathname.startsWith('/live/')) {
                videoId = urlObj.pathname.split('/live/')[1]?.split('/')[0];
            } else if (urlObj.searchParams.get('v')) {
                // https://www.youtube.com/watch?v=VIDEO_ID
                videoId = urlObj.searchParams.get('v');
            }
        }
    } catch {
        // Fallback regex for malformed URLs
        const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (match) videoId = match[1];
    }

    if (videoId) {
        // Strip any extra characters
        videoId = videoId.split('?')[0].split('&')[0].split('#')[0];
        return `https://www.youtube.com/embed/${videoId}`;
    }
    return null;
};

const LessonAccordion = ({ lesson, isOpen, onToggle, index, fontSizeClass = 'prose-lg' }) => {

    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4 transition-shadow hover:shadow-md">
            {/* Accordion Header */}
            <button
                onClick={onToggle}
                className={`w-full flex items-center justify-between p-5 text-right transition-colors ${isOpen ? 'bg-primary-50 text-primary-900' : 'bg-white hover:bg-slate-50 text-slate-800'}`}
            >
                <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${isOpen ? 'bg-primary-200 text-primary-800' : 'bg-slate-100 text-slate-500'}`}>
                        {index + 1}
                    </div>
                    <h3 className={`text-lg font-bold ${isOpen ? 'text-primary-800' : 'text-slate-800'}`}>
                        {lesson.title}
                    </h3>
                </div>

                <div className={`p-2 rounded-full transition-colors ${isOpen ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-400'}`}>
                    {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
            </button>

            {/* Accordion Content */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="p-6 border-t border-primary-100 bg-white">

                            {/* Text Content */}
                            {lesson.content && (
                                <div
                                    className={`prose ${fontSizeClass} prose-slate max-w-none 
                                    prose-p:text-slate-700 prose-p:leading-8 
                                    prose-headings:text-slate-900 prose-headings:font-bold
                                    prose-li:text-slate-700 prose-strong:text-slate-900
                                    mb-6 font-sakkal`}
                                    dangerouslySetInnerHTML={{ __html: lesson.content }}
                                />
                            )}

                            {/* Video Embed */}
                            {lesson.video_url && (() => {
                                const embedUrl = getYouTubeEmbedUrl(lesson.video_url);
                                return (
                                    <div className="mb-8 rounded-xl overflow-hidden shadow-lg border border-slate-200 bg-slate-900 aspect-video relative group max-w-3xl mx-auto">
                                        {embedUrl ? (
                                            <iframe
                                                className="w-full h-full"
                                                src={embedUrl}
                                                title={lesson.title}
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            ></iframe>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                                                <PlayCircle className="w-16 h-16 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                                                <a href={lesson.video_url} target="_blank" rel="noopener noreferrer" className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors font-bold backdrop-blur-sm">
                                                    فتح الفيديو في نافذة جديدة
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* File Viewer (PDF / Image) */}
                            {lesson.file_url && (
                                <div className="mt-6">
                                    <FileViewer fileUrl={lesson.file_url} />
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LessonAccordion;
