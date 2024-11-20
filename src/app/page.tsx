import { DiscordStatsComponent } from "@/components/discord-stats";
import { getMessageStats, getVoiceStats, getUserMap } from "@/lib/piego";

export const dynamic = "force-dynamic";

export default async function Home() {
    const [messageStats, voiceStats, userMap] = await Promise.all([
        getMessageStats(),
        getVoiceStats(),
        getUserMap(),
    ]);
    console.log(messageStats, voiceStats, userMap);

    return <DiscordStatsComponent />;
}
