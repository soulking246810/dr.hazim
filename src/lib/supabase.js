
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

    // Check if this is a Supabase storage URL (looser check)
    if (fileUrl && fileUrl.includes('/storage/v1/object/')) {
        try {
            // URL format: .../storage/v1/object/public/BUCKET/PATH or .../sign/BUCKET/PATH
            const storagePublicPrefix = '/storage/v1/object/public/';
            const storageSignPrefix = '/storage/v1/object/sign/';

            let pathPart = null;

            if (fileUrl.includes(storagePublicPrefix)) {
                pathPart = fileUrl.split(storagePublicPrefix)[1];
            } else if (fileUrl.includes(storageSignPrefix)) {
                pathPart = fileUrl.split(storageSignPrefix)[1];
            }

            if (pathPart) {
                // Remove query params
                const cleanPath = pathPart.split('?')[0];
                const slashIndex = cleanPath.indexOf('/');

                if (slashIndex > -1) {
                    const bucket = cleanPath.substring(0, slashIndex);
                    const filePath = cleanPath.substring(slashIndex + 1);

                    // Generate a new signed URL
                    const { data, error } = await supabase.storage
                        .from(bucket)
                        .createSignedUrl(filePath, 3600);

                    if (!error && data?.signedUrl) {
                        return data.signedUrl;
                    }
                }
            }
        } catch (e) {
            console.warn('Url signing failed:', e);
        }
    }

    // Return original URL as fallback (external URLs, etc.)
    return fileUrl;
};
