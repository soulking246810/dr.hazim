import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Smartphone, Clock, Award, Calendar, ChevronDown, ChevronUp, History } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const UserParticipation = () => {
    const [participants, setParticipants] = useState([]);
    const [historyTracks, setHistoryTracks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('participants'); // 'participants' | 'history'
    const [expandedTrack, setExpandedTrack] = useState(null);

    useEffect(() => {
        fetchData();

        // Realtime Subscription
        const channel = supabase
            .channel('participation_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'quran_parts' },
                () => fetchData()
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'completed_tracks' },
                () => fetchData()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchData = async () => {
        try {
            // 1. Fetch current active participants
            const { data: currentParts } = await supabase
                .from('quran_parts')
                .select(`
                    id,
                    part_number,
                    selected_at,
                    
                    guest_name,
                    device_id,
                    selected_by,
                    profiles:selected_by (full_name)
                `)
                .or('selected_by.neq.null,guest_name.neq.null');

            // 2. Fetch history from completed_tracks
            const { data: history } = await supabase
                .from('completed_tracks')
                .select('*')
                .order('completed_at', { ascending: false });

            setHistoryTracks(history || []);

            // Process and Group Data for Stats View
            const userMap = new Map();

            // Helper to add/update user in map
            const addOrUpdateUser = (key, name, type, source, timestamp) => {
                if (!userMap.has(key)) {
                    userMap.set(key, {
                        id: key,
                        name: name || 'مستخدم',
                        type: type, // 'admin', 'guest'
                        actions: [],
                        lastActive: timestamp,
                        deviceCount: 1
                    });
                }
                const user = userMap.get(key);
                user.actions.push(source);
                if (new Date(timestamp) > new Date(user.lastActive)) {
                    user.lastActive = timestamp;
                }
            };

            // Process CURRENT parts
            currentParts?.forEach(part => {
                const name = part.profiles?.full_name || part.guest_name;
                const timestamp = part.selected_at;

                if (part.selected_by) {
                    addOrUpdateUser(part.selected_by, name, 'registered', `الجزء ${part.part_number} (الحالية)`, timestamp);
                } else if (part.guest_name) {
                    const key = part.device_id || `guest_${part.id}`;
                    addOrUpdateUser(key, name, 'guest', `الجزء ${part.part_number} (الحالية)`, timestamp);
                }
            });

            // Process HISTORY
            history?.forEach(track => {
                const details = track.details; // JSONB
                if (Array.isArray(details)) {
                    details.forEach(part => {
                        if (part.selected_by || part.guest_name) {
                            const name = part.profiles?.full_name || part.guest_name;
                            const timestamp = track.completed_at;

                            if (part.selected_by) {
                                addOrUpdateUser(part.selected_by, name, 'registered', `الجزء ${part.part_number} (${track.name})`, timestamp);
                            } else {
                                const key = part.device_id || `guest_${part.id}_old`;
                                addOrUpdateUser(key, name, 'guest', `الجزء ${part.part_number} (${track.name})`, timestamp);
                            }
                        }
                    });
                }
            });

            setParticipants(Array.from(userMap.values()));

        } catch (error) {
            console.error('Error fetching participants:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleTrack = (trackId) => {
        if (expandedTrack === trackId) {
            setExpandedTrack(null);
        } else {
            setExpandedTrack(trackId);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return format(new Date(dateString), 'dd MMMM yyyy', { locale: ar });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Users className="w-8 h-8 text-primary-600" />
                        سجل المشاركين والأرشيف
                    </h1>
                    <p className="text-slate-500 mt-2">
                        قائمة بجميع المشاركين وأرشيف الختمات المكتملة.
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('participants')}
                        className={clsx(
                            "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                            activeTab === 'participants' ? "bg-white shadow-sm text-primary-600" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        المشاركين ({participants.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={clsx(
                            "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                            activeTab === 'history' ? "bg-white shadow-sm text-primary-600" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        أرشيف الختمات ({historyTracks.length})
                    </button>
                </div>
            </div>

            {/* Content Switcher */}
            {activeTab === 'participants' ? (
                <div className="grid gap-4 animate-fade-in">
                    {/* Participants List (Existing Logic) */}
                    {participants.map((user) => (
                        <div key={user.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group hover:border-primary-200 transition-colors">
                            <div className="flex items-start gap-4">
                                <div className={clsx(
                                    "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0",
                                    user.type === 'guest' ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"
                                )}>
                                    {user.type === 'guest' ? <Smartphone className="w-6 h-6" /> : <Award className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">{user.name}</h3>
                                    <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-1">
                                        <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                                            <Clock className="w-3 h-3" />
                                            آخر ظهور: {new Date(user.lastActive).toLocaleDateString('ar-EG')}
                                        </span>
                                        {user.type === 'guest' && (
                                            <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded-lg">زائر</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 w-full md:w-auto">
                                <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">آخر المشاركات</p>
                                <div className="flex flex-wrap gap-2">
                                    {user.actions.slice(0, 5).map((action, idx) => ( // Limit to 5 recent
                                        <span key={idx} className="inline-block px-3 py-1 bg-primary-50 text-primary-700 text-sm rounded-full border border-primary-100">
                                            {action}
                                        </span>
                                    ))}
                                    {user.actions.length > 5 && (
                                        <span className="inline-block px-2 py-1 text-slate-400 text-xs rounded-full">
                                            +{user.actions.length - 5} المزيد
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {participants.length === 0 && (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">لا توجد مشاركات حتى الآن</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4 animate-fade-in">
                    {/* History List */}
                    {historyTracks.map((track) => (
                        <div key={track.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            <div
                                onClick={() => toggleTrack(track.id)}
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                                        <History className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg">{track.name}</h3>
                                        <p className="text-xs text-slate-500 flex items-center gap-2">
                                            <Calendar className="w-3 h-3" />
                                            اكتملت بتاريخ: {formatDate(track.completed_at)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-bold text-slate-600">المشاركين</p>
                                        <p className="text-xs text-slate-500">{track.participants_count} قارئ</p>
                                    </div>
                                    {expandedTrack === track.id ? (
                                        <ChevronUp className="w-5 h-5 text-slate-400" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-slate-400" />
                                    )}
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedTrack === track.id && (
                                <div className="bg-slate-50 p-4 border-t border-slate-100 animate-slide-in">
                                    <h4 className="text-sm font-bold text-slate-500 mb-3">تفاصيل التوزيع</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                        {Array.isArray(track.details) && track.details
                                            .filter(p => p.selected_by || p.guest_name)
                                            .map((part) => (
                                                <div key={part.id} className="bg-white p-2 rounded-lg border border-slate-200 flex items-center gap-2 text-sm">
                                                    <span className="font-bold text-primary-600 w-8">ج{part.part_number}</span>
                                                    <span className="text-slate-700 truncate" title={part.profiles?.full_name || part.guest_name}>
                                                        {part.profiles?.full_name || part.guest_name}
                                                    </span>
                                                </div>
                                            ))
                                        }
                                        {(!Array.isArray(track.details) || track.details.filter(p => p.selected_by || p.guest_name).length === 0) && (
                                            <p className="text-slate-400 text-sm col-span-full">لا تتوفر تفاصيل لهذه الختمة.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {historyTracks.length === 0 && (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                            <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">لا توجد ختمات مؤرشفة حتى الآن</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UserParticipation;
