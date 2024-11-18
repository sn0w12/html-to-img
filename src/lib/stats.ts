export function calculateElo(
    vc: number,
    vcm: number,
    msg: number,
    msgd: number
) {
    const VC_WEIGHT = 0.8;
    const VCM_WEIGHT = -1.0;
    const MSG_WEIGHT = 0.5;
    const MSGD_WEIGHT = -2.0;
    const BASE_SCORE = 1000;

    const voice_score = vc * VC_WEIGHT + vcm * VCM_WEIGHT;
    const message_score = msg * MSG_WEIGHT + msgd * MSGD_WEIGHT;

    const total_score = BASE_SCORE + voice_score + message_score;

    return Math.max(100, Math.floor(total_score));
}
