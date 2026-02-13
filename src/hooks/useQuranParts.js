import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

export const useQuranParts = () => {
    const [parts, setParts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [khatmaCount, setKhatmaCount] = useState(0);
    const { user, isAdmin } = useAuth();

    useEffect(() => {
        fetchParts();
        fetchKhatmaCount();

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
                    profiles:selected_by (full_name)
                `)
                .order('part_number');

            if (error) throw error;
            setParts(data);
        } catch (error) {
            console.error('Error fetching quran parts:', error);
            toast.error('فشل تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const fetchKhatmaCount = async () => {
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'khatma_count')
                .single();

            if (!error && data) {
                setKhatmaCount(parseInt(data.value) || 0);
            }
        } catch (error) {
            // Table might not exist yet, that's OK
            console.log('Khatma count not available');
        }
    };

    const togglePart = async (partId, isSelected, currentSelectedBy) => {
        if (isSelected && currentSelectedBy !== user.id && !isAdmin) {
            return;
        }

        try {
            if (!isSelected) {
                // Select
                const { error } = await supabase
                    .from('quran_parts')
                    .update({
                        selected_by: user.id,
                        selected_at: new Date().toISOString()
                    })
                    .eq('id', partId)
                    .is('selected_by', null);

                if (error) throw error;
                toast.success('تم اختيار الجزء بنجاح');
            } else {
                // Reset (Admin or own selection)
                if (!isAdmin && currentSelectedBy !== user.id) {
                    toast.error('ليس لديك صلاحية لإلغاء هذا الجزء');
                    return;
                }

                const { error } = await supabase
                    .from('quran_parts')
                    .update({
                        selected_by: null,
                        selected_at: null
                    })
                    .eq('id', partId);

                if (error) throw error;
                toast.success('تم إلغاء الاختيار');
            }
        } catch (error) {
            console.error('Error updating part:', error);
            toast.error('حدث خطأ، ربما تم اختيار الجزء مسبقاً');
            fetchParts();
        }
    };

    const resetAll = async () => {
        if (!isAdmin) return;

        try {
            const { error } = await supabase
                .from('quran_parts')
                .update({
                    selected_by: null,
                    selected_at: null
                })
                .not('id', 'is', null); // Update all rows

            if (error) throw error;

            // Increment khatma count
            try {
                const { data: existing } = await supabase
                    .from('app_settings')
                    .select('value')
                    .eq('key', 'khatma_count')
                    .single();

                const newCount = (parseInt(existing?.value) || 0) + 1;

                await supabase
                    .from('app_settings')
                    .upsert({
                        key: 'khatma_count',
                        value: String(newCount)
                    }, { onConflict: 'key' });

                setKhatmaCount(newCount);
            } catch (e) {
                console.log('Could not update khatma count:', e);
            }

            toast.success('تم إعادة تعيين جميع الأجزاء');
            fetchParts();
        } catch (error) {
            console.error('Error resetting all parts:', error);
            toast.error('فشل إعادة التعيين');
        }
    };

    return { parts, loading, togglePart, resetAll, khatmaCount };
};
