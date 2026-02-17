import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

// Helper to get or create a device ID for guest users
const getDeviceId = () => {
    let deviceId = localStorage.getItem('quran_app_device_id');
    if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        localStorage.setItem('quran_app_device_id', deviceId);
    }
    return deviceId;
};

export const useQuranParts = () => {
    const [parts, setParts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [khatmaCount, setKhatmaCount] = useState(0);
    const [trackName, setTrackName] = useState('الختمة الحالية');
    const { user, isAdmin } = useAuth();
    const deviceId = getDeviceId();

    useEffect(() => {
        fetchParts();
        fetchSettings();

        // Realtime Subscription
        const channel = supabase
            .channel('quran_parts_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'quran_parts',
                },
                () => {
                    fetchParts();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'app_settings',
                },
                () => {
                    fetchSettings();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchParts = async () => {
        try {
            const { data, error } = await supabase
                .from('quran_parts')
                .select(`
                    id,
                    part_number,
                    selected_at,
                    selected_by,
                    guest_name,
                    device_id,
                    profiles:selected_by (full_name)
                `)
                .order('part_number');

            if (error) throw error;
            setParts(data);
        } catch (error) {
            console.error('Error fetching quran parts:', error);
            // toast.error('فشل تحميل البيانات'); // Suppress to avoid spam on load errors
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('key, value')
                .in('key', ['khatma_count', 'current_track_name']);

            if (!error && data) {
                const count = data.find(item => item.key === 'khatma_count')?.value;
                const name = data.find(item => item.key === 'current_track_name')?.value;
                if (count) setKhatmaCount(parseInt(count) || 0);
                if (name) setTrackName(name);
            }
        } catch (error) {
            console.log('Settings not available');
        }
    };

    const togglePart = async (partId, isSelected, currentSelectedBy, currentGuestName = null, currentDeviceId = null, newGuestName = null) => {
        // Validation logic
        const isMySelection = user
            ? currentSelectedBy === user.id
            : currentDeviceId === deviceId;

        if (isSelected && !isMySelection && !isAdmin) {
            return;
        }

        const previousParts = [...parts];

        // Optimistic Update
        if (!isSelected) {
            // SELECTING
            setParts(prev => prev.map(p =>
                p.id === partId
                    ? {
                        ...p,
                        selected_by: user?.id || null,
                        guest_name: user ? null : newGuestName,
                        device_id: user ? null : deviceId,
                        selected_at: new Date().toISOString(),
                        profiles: user ? { full_name: 'أنت' } : null
                    }
                    : p
            ));
        } else {
            // DESELECTING
            if (!isAdmin && !isMySelection) {
                toast.error('ليس لديك صلاحية لإلغاء هذا الجزء');
                return;
            }
            setParts(prev => prev.map(p =>
                p.id === partId
                    ? { ...p, selected_by: null, guest_name: null, device_id: null, selected_at: null, profiles: null }
                    : p
            ));
        }

        try {
            if (!isSelected) {
                // Determine what to update based on auth state
                const updateData = user
                    ? { selected_by: user.id, selected_at: new Date().toISOString(), guest_name: null, device_id: null }
                    : { guest_name: newGuestName, device_id: deviceId, selected_at: new Date().toISOString(), selected_by: null };

                const { error } = await supabase
                    .from('quran_parts')
                    .update(updateData)
                    .eq('id', partId)
                    .is('selected_by', null)
                    .is('guest_name', null); // Ensure it's not taken by anyone

                if (error) throw error;
                toast.success('تم اختيار الجزء بنجاح');
            } else {
                const { error } = await supabase
                    .from('quran_parts')
                    .update({
                        selected_by: null,
                        guest_name: null,
                        device_id: null,
                        selected_at: null
                    })
                    .eq('id', partId);

                if (error) throw error;
                toast.success('تم إلغاء الاختيار');
            }
            fetchParts();
        } catch (error) {
            console.error('Error updating part:', error);
            toast.error('حدث خطأ، ربما تم اختيار الجزء مسبقاً');
            setParts(previousParts);
        }
    };

    // Rename to completeTrack to better reflect functionality
    const completeTrack = async (newTrackName) => {
        if (!isAdmin) return;

        try {
            // 1. Archive current track to completed_tracks
            // We need to gather who participated.
            // Since we don't have a direct correlation stored in a separate table yet,
            // we will just store a snapshot of current parts or just the count/name.
            // Ideally we'd have a 'track_participants' table, but for now we'll store a JSON snapshot.

            const participantsCount = parts.filter(p => p.selected_by || p.guest_name).length;

            // Create history record
            await supabase.from('completed_tracks').insert({
                name: trackName,
                participants_count: participantsCount,
                details: parts // Store full snapshot of who read what
            });

            // 2. Reset all parts
            const { error: resetError } = await supabase
                .from('quran_parts')
                .update({
                    selected_by: null,
                    guest_name: null,
                    device_id: null,
                    selected_at: null
                })
                .not('id', 'is', null);

            if (resetError) throw resetError;

            // 3. Increment khatma count & Update Track Name
            const newCount = khatmaCount + 1;

            // Upsert Loop for settings
            const settingsUpdates = [
                { key: 'khatma_count', value: String(newCount) },
                { key: 'current_track_name', value: newTrackName }
            ];

            for (const setting of settingsUpdates) {
                await supabase
                    .from('app_settings')
                    .upsert(setting, { onConflict: 'key' });
            }

            setKhatmaCount(newCount);
            setTrackName(newTrackName);

            toast.success('تم إكمال الختمة وبدء ختمة جديدة');
            fetchParts();
        } catch (error) {
            console.error('Error completing track:', error);
            toast.error('فشل إكمال الختمة');
        }
    };

    return { parts, loading, togglePart, completeTrack, khatmaCount, trackName, deviceId };
};
