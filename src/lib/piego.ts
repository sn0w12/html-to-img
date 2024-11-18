import { API_URL } from "./constants";

function getDateNDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().replace(/\.\d+Z$/, "Z");
}

interface UserMessageStats {
    user_id: number;
    stats: [
        {
            type: string;
            date: string;
            count: number;
        }
    ];
}

interface ApiMessageItem {
    user_id: number;
    type: string;
    message_count: number;
}

interface UserVoiceStats {
    user_id: number;
    session_count: number;
    total_duration: number;
}

interface UserMap {
    [key: string]: {
        username: string;
        displayName: string;
    };
}

interface ApiUser {
    discord_id: number;
    username: string;
    display_name: string;
}

export async function getUserMap(): Promise<UserMap> {
    const url = `${API_URL}/users`;
    const response = await fetch(url);
    const data = await response.json();

    return data.items.reduce((acc: UserMap, user: ApiUser) => {
        acc[user.discord_id.toString()] = {
            username: user.username,
            displayName: user.display_name,
        };
        return acc;
    }, {});
}

export async function getMessageStats(
    endDayOffset: number = 0,
    startDayOffset: number = 30
): Promise<UserMessageStats[]> {
    const startTimestamp = getDateNDaysAgo(startDayOffset);
    const endTimestamp = getDateNDaysAgo(endDayOffset);

    const url = `${API_URL}/messages/all?start_time=${startTimestamp}&end_time=${endTimestamp}`;
    const response = await fetch(url);
    const data = await response.json();

    return data.items.map((item: { user_id: number; user_data: string }) => ({
        userId: item.user_id,
        stats: JSON.parse(item.user_data),
    }));
}

export async function getVoiceStats(
    endDayOffset: number = 0,
    startDayOffset: number = 30
): Promise<UserVoiceStats[]> {
    const startTimestamp = getDateNDaysAgo(startDayOffset);
    const endTimestamp = getDateNDaysAgo(endDayOffset);

    const url = `${API_URL}/voice_sessions/all?start_time=${startTimestamp}&end_time=${endTimestamp}`;
    const response = await fetch(url);
    const data = await response.json();

    return data.items;
}
