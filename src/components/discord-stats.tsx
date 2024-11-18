"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { calculateElo } from "@/lib/stats";
import { getMessageStats, getVoiceStats, getUserMap } from "@/lib/piego";

interface UserStats {
    user_id: number;
    stats: { date: string; sent: number; deleted: number }[];
    voice: number;
    muted: number;
    username: string;
    displayName: string;
}

interface ServerStats {
    messageStats: { date: string; sent: number; deleted: number }[];
    voiceStats: { voice: number; muted: number };
}

export function DiscordStatsComponent() {
    const [activeTab, setActiveTab] = useState("server");
    const [stats, setStats] = useState<UserStats[]>([]);
    const [serverStats, setServerStats] = useState<ServerStats>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const [messageStats, voiceStats, userMap] = await Promise.all([
                    getMessageStats(),
                    getVoiceStats(),
                    getUserMap(),
                ]);

                console.log(messageStats, voiceStats, userMap);
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

    const renderUserTabs = () => {
        return stats.map((user) => (
            <TabsTrigger
                key={user.user_id}
                value={`user-${user.user_id}`}
                className="flex-grow hover:bg-gray-700"
            >
                {user.displayName}
            </TabsTrigger>
        ));
    };

    const renderUserContent = () => {
        return stats.map((user) => (
            <TabsContent key={user.user_id} value={`user-${user.user_id}`}>
                <UserStats user={user} />
            </TabsContent>
        ));
    };

    if (loading || !serverStats) {
        return <div>Loading...</div>;
    }
    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6 text-white">
                Discord Server Stats
            </h1>
            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="space-y-4"
            >
                <TabsList className="bg-gray-800 w-full h-auto flex-wrap gap-1">
                    <TabsTrigger
                        value="server"
                        className="flex-grow hover:bg-gray-700 w-full"
                    >
                        Server
                    </TabsTrigger>
                    {renderUserTabs()}
                </TabsList>
                <TabsContent value="server">
                    <ServerStats stats={serverStats} />
                </TabsContent>
                {renderUserContent()}
            </Tabs>
        </div>
    );
}

function ServerStats({ stats }: { stats: ServerStats }) {
    const messageData = stats.messageStats.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const totalSent = messageData.reduce((sum, day) => sum + day.sent, 0);
    const totalDeleted = messageData.reduce((sum, day) => sum + day.deleted, 0);

    const pieData = [
        { name: "Sent", value: totalSent },
        { name: "Deleted", value: totalDeleted },
    ];

    const voiceData = [
        {
            name: "Active",
            value: stats.voiceStats.voice - stats.voiceStats.muted,
        },
        { name: "Muted", value: stats.voiceStats.muted },
    ];

    const COLORS = ["#4CAF50", "#F44336", "#2196F3", "#FF9800"];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gray-800">
                <CardHeader>
                    <CardTitle>Message Stats</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={messageData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar
                                    dataKey="sent"
                                    stackId="a"
                                    fill="#4CAF50"
                                    name="Sent"
                                />
                                <Bar
                                    dataKey="deleted"
                                    stackId="a"
                                    fill="#F44336"
                                    name="Deleted"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
            <Card className="bg-gray-800">
                <CardHeader>
                    <CardTitle>Voice Stats (minutes)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={voiceData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }) =>
                                        `${name} ${(percent * 100).toFixed(0)}%`
                                    }
                                >
                                    {voiceData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function UserStats({ user }: { user: UserStats }) {
    const messageData = user.stats.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const totalSent = messageData.reduce((sum, day) => sum + day.sent, 0);
    const totalDeleted = messageData.reduce((sum, day) => sum + day.deleted, 0);
    const elo = calculateElo(user.voice, user.muted, totalSent, totalDeleted);

    const voiceData = [
        { name: "Active", value: user.voice - user.muted },
        { name: "Muted", value: user.muted },
    ];

    return (
        <div className="space-y-6">
            <Card className="bg-gray-800">
                <CardHeader>
                    <CardTitle>{user.displayName}&apos;s Stats</CardTitle>
                    <CardDescription>ELO Score: {elo}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">
                            Message Stats
                        </h3>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={messageData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar
                                        dataKey="sent"
                                        stackId="a"
                                        fill="#4CAF50"
                                        name="Sent"
                                    />
                                    <Bar
                                        dataKey="deleted"
                                        stackId="a"
                                        fill="#F44336"
                                        name="Deleted"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-2">
                            Voice Stats (minutes)
                        </h3>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={voiceData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({ name, percent }) =>
                                            `${name} ${(percent * 100).toFixed(
                                                0
                                            )}%`
                                        }
                                    >
                                        {voiceData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={
                                                    index === 0
                                                        ? "#2196F3"
                                                        : "#FF9800"
                                                }
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
