/**
 * Envio para o webhook do Discord.
 *
 * Nunca lança e nunca é aguardado por um caminho crítico: uma notificação que
 * falha não pode impedir a operação que a originou.
 *
 * `src/app/api/send-budget/route.ts` tem a sua própria versão disto, com um
 * payload rico próprio dos pedidos de orçamento. Não foi migrada de propósito —
 * é o único funil de receita do site e não se mexe nele de passagem.
 */
export async function postDiscordWebhook(payload: unknown, tag: string): Promise<boolean> {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL?.trim();
    if (!webhookUrl) return false;

    try {
        const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            cache: "no-store",
        });
        if (!res.ok) {
            console.error(`[${tag}] Discord rejeitou o pedido:`, res.status);
            return false;
        }
        return true;
    } catch (error) {
        console.error(`[${tag}] falha na ligação ao Discord:`, error);
        return false;
    }
}
