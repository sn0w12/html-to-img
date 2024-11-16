import { Client, GatewayIntentBits } from "discord.js";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
    ],
});
client.login(process.env.DISCORD_TOKEN);

interface DiscordUserInfo {
    username: string;
    displayName: string;
}

export async function getUsernameMap(
    guildId: string
): Promise<Map<string, DiscordUserInfo>> {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
        throw new Error(`Guild with ID ${guildId} not found`);
    }

    await guild.members.fetch();
    const userMap = new Map<string, DiscordUserInfo>();

    guild.members.cache.forEach((member) => {
        userMap.set(member.id, {
            username: member.user.username,
            displayName: member.displayName,
        });
    });

    return userMap;
}
