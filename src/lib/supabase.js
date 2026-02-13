
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables. Please check .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        storageKey: 'quran-app-auth',
        autoRefreshToken: true,
        detectSessionInUrl: true,
    }
});

/**
 * Gets a working URL for a Supabase Storage file.
 * If the file_url is a Supabase storage public URL, it extracts the path
 * and generates a signed URL (works even if bucket isn't public).
 * Falls back to the original URL if it's not a Supabase storage URL.
 */
export const getWorkingFileUrl = async (fileUrl) => {
    if (!fileUrl) return null;

    // Check if this is a Supabase storage URL
    if (supabaseUrl && fileUrl.includes(supabaseUrl) && fileUrl.includes('/storage/')) {
        try {
            // Extract bucket and path from URL
            // URL format: https://xxx.supabase.co/storage/v1/object/public/BUCKET/PATH
            const storagePrefix = '/storage/v1/object/public/';
            const signedPrefix = '/storage/v1/object/sign/';
            let pathPart = null;

            if (fileUrl.includes(storagePrefix)) {
                pathPart = fileUrl.split(storagePrefix)[1];
            } else if (fileUrl.includes(signedPrefix)) {
                pathPart = fileUrl.split(signedPrefix)[1];
            }

            if (pathPart) {
                // Remove query params from path
                const cleanPath = pathPart.split('?')[0];
                const slashIndex = cleanPath.indexOf('/');
                if (slashIndex > -1) {
                    const bucket = cleanPath.substring(0, slashIndex);
                    const filePath = cleanPath.substring(slashIndex + 1);

                    // Generate a signed URL (works regardless of bucket public setting)
                    const { data, error } = await supabase.storage
                        .from(bucket)
                        .createSignedUrl(filePath, 3600); // 1 hour expiry

                    if (!error && data?.signedUrl) {
                        return data.signedUrl;
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to generate signed URL, using original:', e);
        }
    }

    // Return original URL as fallback (external URLs, etc.)
    return fileUrl;
};
