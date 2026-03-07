import React, { useState, useEffect } from 'react';
import { activity } from '../utils/api';
import { X, Search, Filter, RefreshCw, Smartphone, Monitor } from 'lucide-react';

interface ActivityLog {
    id: number;
    user_id: number;
    username: string;
    role: string;
    action: string;
    details: string;
    ip_address: string;
    created_at: string;
}

interface ActivityLogScreenProps {
    onClose: () => void;
}

const ActivityLogScreen: React.FC<ActivityLogScreenProps> = ({ onClose }) => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterUser, setFilterUser] = useState('');
    const [filterAction, setFilterAction] = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await activity.getAll({
                limit: 100,
                user_id: filterUser ? parseInt(filterUser) : undefined
            });
            if (response.data.success) {
                setLogs(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch activity logs', error);
            alert('فشل تحميل السجلات');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [filterUser]);

    const filteredLogs = logs.filter(log => {
        if (filterAction && !log.action.toLowerCase().includes(filterAction.toLowerCase())) return false;
        return true;
    });

    const getActionColor = (action: string) => {
        if (action === 'LOGIN') return 'bg-green-100 text-green-800';
        if (action === 'CREATE_ORDER') return 'bg-blue-100 text-blue-800';
        if (action === 'UPDATE_SETTINGS') return 'bg-yellow-100 text-yellow-800';
        return 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 z-50 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm p-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">سجل النشاطات</h1>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition"
                >
                    <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>
            </div>

            {/* Filters */}
            <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex gap-4 items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="بحث بنوع الإجراء..."
                        className="w-full pr-10 pl-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                    />
                </div>
                <button
                    onClick={fetchLogs}
                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center gap-2"
                >
                    <RefreshCw className="w-5 h-5" />
                    <span>تحديث</span>
                </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            <tr>
                                <th className="p-4 font-semibold">المستخدم</th>
                                <th className="p-4 font-semibold">الإجراء</th>
                                <th className="p-4 font-semibold">التفاصيل</th>
                                <th className="p-4 font-semibold">IP Address</th>
                                <th className="p-4 font-semibold">التوقيت</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">جاري التحميل...</td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">لا توجد سجلات</td>
                                </tr>
                            ) : (
                                filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                                        <td className="p-4">
                                            <div className="font-bold text-gray-900 dark:text-white">{log.username || `User #${log.user_id}`}</div>
                                            <div className="text-xs text-gray-500">{log.role}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-600 dark:text-gray-300 text-sm max-w-md truncate" title={log.details}>
                                            {log.details.length > 50 ? log.details.substring(0, 50) + '...' : log.details}
                                        </td>
                                        <td className="p-4 text-gray-500 text-sm font-mono">
                                            {log.ip_address || '-'}
                                        </td>
                                        <td className="p-4 text-gray-500 text-sm">
                                            {new Date(log.created_at).toLocaleString('ar-EG')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ActivityLogScreen;
