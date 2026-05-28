import { NextResponse } from "next/server";
import { z } from "zod";

// ── Payload schema ────────────────────────────────────────────────────────────

const schema = z.object({
  pickup:         z.string().min(1),
  dropoff:        z.string().min(1),
  dateTime:       z.string().min(1),
  passageiros:    z.number().int().min(1),
  bagagem:        z.number().int().min(0),
  cadeiraBebe:    z.number().int().min(0),
  cadeiraCrianca: z.number().int().min(0),
  assentoBooster: z.number().int().min(0),
  veiculo:        z.string().min(1),
  veiculoLabel:   z.string().min(1),
  name:           z.string().min(1),
  email:          z.string().email(),
  phone:          z.string().min(1),
  idioma:         z.enum(["pt", "en"]),
  flightOrTrain:  z.string().optional(),
  observations:   z.string().optional(),
});

type BudgetPayload = z.infer<typeof schema>;

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Corpo do pedido inválido." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados inválidos.", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("[send-budget] DISCORD_WEBHOOK_URL não definido.");
    return NextResponse.json(
      { message: "Serviço de notificação não configurado." },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(webhookUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(buildDiscordPayload(parsed.data)),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[send-budget] Discord rejeitou o pedido:", res.status, text);
      return NextResponse.json(
        { message: "Erro ao enviar notificação." },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error("[send-budget] Falha na ligação ao Discord:", err);
    return NextResponse.json(
      { message: "Erro ao enviar notificação." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

// ── Discord embed builder ─────────────────────────────────────────────────────

function buildDiscordPayload(d: BudgetPayload) {
  const [datePart, timePart] = d.dateTime.split("T");
  const [year, month, day]   = (datePart ?? "").split("-");
  const formattedDate        = `${day}/${month}/${year} às ${timePart ?? ""}`;

  const fields: { name: string; value: string; inline: boolean }[] = [
    // ── Cliente ──────────────────────────────────────────────
    { name: "👤 Nome",     value: d.name,  inline: true },
    { name: "📧 Email",    value: d.email, inline: true },
    { name: "📱 Telefone", value: d.phone, inline: true },

    // ── Trajeto ───────────────────────────────────────────────
    { name: "📍 Origem",  value: d.pickup,  inline: true },
    { name: "🏁 Destino", value: d.dropoff, inline: true },
    // 3rd column: voo/comboio se existir, senão spacer para manter grelha
    d.flightOrTrain
      ? { name: "✈️ Voo / Comboio", value: d.flightOrTrain, inline: true }
      : { name: "​",            value: "​",         inline: true },

    // ── Logística ─────────────────────────────────────────────
    { name: "📅 Data / Hora",  value: formattedDate,       inline: true },
    { name: "👥 Passageiros",  value: String(d.passageiros), inline: true },
    { name: "🧳 Bagagem",      value: `${d.bagagem} mala${d.bagagem !== 1 ? "s" : ""}`, inline: true },

    // ── Veículo (linha inteira) ───────────────────────────────
    { name: "🚗 Veículo Sugerido", value: d.veiculoLabel, inline: false },
  ];

  // Extras — só se existirem
  const extraLines: string[] = [];
  if (d.cadeiraBebe    > 0) extraLines.push(`Cadeira de Bebé: ${d.cadeiraBebe}`);
  if (d.cadeiraCrianca > 0) extraLines.push(`Cadeira de Criança: ${d.cadeiraCrianca}`);
  if (d.assentoBooster > 0) extraLines.push(`Assento Elevatório: ${d.assentoBooster}`);
  if (extraLines.length > 0) {
    fields.push({ name: "🪑 Extras", value: extraLines.join("\n"), inline: false });
  }

  if (d.observations) {
    fields.push({ name: "📝 Observações", value: d.observations, inline: false });
  }

  // Language tag no footer
  const lang = d.idioma === "pt" ? "PT-PT" : "EN-US";

  return {
    embeds: [
      {
        title:     "🔔 Novo Pedido de Orçamento — Way2Go",
        color:     0xC9A84C, // executive gold
        fields,
        footer:    { text: `Way2Go · Formulário ${lang} · way2go.pt` },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
