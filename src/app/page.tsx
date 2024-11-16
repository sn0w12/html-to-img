"use client";

import { useEffect, useState } from "react";
import { getMessageStats, getUserMap } from "@/lib/piego";

interface EnrichedMessageStats {
    user_id: number;
    sent: number;
    deleted: number;
    username: string;
    displayName: string;
}

export default function Home() {
    const [stats, setStats] = useState<EnrichedMessageStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const [messageStats, userMap] = await Promise.all([
                    getMessageStats(),
                    getUserMap(),
                ]);

                const enrichedStats = messageStats.map((stat) => {
                    const userInfo = userMap[stat.user_id.toString()] || {
                        username: "Unknown",
                        displayName: "Unknown",
                    };
                    return {
                        ...stat,
                        ...userInfo,
                    };
                });

                setStats(enrichedStats);
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : "An error occurred"
                );
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    if (loading)
        return <div className="flex justify-center p-8">Loading...</div>;
    if (error) return <div className="text-red-500 p-8">{error}</div>;

    return (
        <main className="p-8">
            <h1 className="text-2xl font-bold mb-6">Message Statistics</h1>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white shadow-md rounded-lg">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Display Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Messages Sent
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Messages Deleted
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-black">
                        {stats.map((stat) => (
                            <tr key={stat.user_id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {stat.username}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {stat.displayName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {stat.sent}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {stat.deleted}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </main>
    );
}
