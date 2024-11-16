import { API_URL } from "./constants";

function getDateNDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().replace(/\.\d+Z$/, "Z");
}

interface UserMessageStats {
    user_id: number;
    sent: number;
    deleted: number;
}

interface ApiMessageItem {
    user_id: number;
    type: string;
    message_count: number;
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

    const userStats = data.items.reduce(
        (acc: { [key: string]: UserMessageStats }, item: ApiMessageItem) => {
            if (!acc[item.user_id]) {
                acc[item.user_id] = {
                    user_id: item.user_id,
                    sent: 0,
                    deleted: 0,
                };
            }

            if (item.type === "sent") {
                acc[item.user_id].sent = item.message_count;
            } else if (item.type === "deleted") {
                acc[item.user_id].deleted = item.message_count;
            }

            return acc;
        },
        {}
    );

    return Object.values(userStats);
}
