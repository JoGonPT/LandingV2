import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
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

  const d = parsed.data;

  // ── 1. Discord (primary — awaited) ────────────────────────────────────────
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
      body:    JSON.stringify(buildDiscordPayload(d)),
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

  // ── 2. Emails (background — sem bloquear a resposta) ──────────────────────
  void sendEmailsBackground(d);

  return NextResponse.json({ success: true });
}

// ── Background email sender ───────────────────────────────────────────────────
//
// Promise.allSettled garante que ambos os emails são disparados em paralelo
// e que um falha isoladamente sem afectar o outro. Erros são apenas logged.

async function sendEmailsBackground(d: BudgetPayload): Promise<void> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn("[send-budget] Variáveis SMTP não configuradas — emails omitidos.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   Number(SMTP_PORT ?? 465),
    secure: true,
    auth:   { user: SMTP_USER, pass: SMTP_PASS },
  });

  const from = `"Way2Go" <${SMTP_USER}>`;

  const results = await Promise.allSettled([
    transporter.sendMail({
      from,
      to:      d.email,
      subject: "Recebemos o seu pedido de orçamento — Way2Go",
      html:    buildClientHtml(d),
    }),
    transporter.sendMail({
      from,
      to:      "reservas@vruum.pt",
      replyTo: d.email,
      subject: `🔔 [BACKUP] Novo Orçamento Web — ${d.name}`,
      html:    buildInternalHtml(d),
    }),
  ]);

  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(
        `[send-budget] Email ${i === 0 ? "cliente" : "interno"} falhou:`,
        result.reason,
      );
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(dateTime: string): string {
  const [datePart, timePart] = dateTime.split("T");
  const [year, month, day]   = (datePart ?? "").split("-");
  return `${day}/${month}/${year} às ${timePart ?? ""}`;
}

function summaryRow(label: string, value: string): string {
  return `
  <tr>
    <td style="padding:12px 24px;width:38%;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#9ca3af;font-weight:600;vertical-align:top;border-bottom:1px solid #f3f4f6;">${label}</td>
    <td style="padding:12px 24px;font-size:14px;color:#111827;font-weight:500;vertical-align:top;border-bottom:1px solid #f3f4f6;">${value}</td>
  </tr>`;
}

// ── Client email — premium PT-PT ──────────────────────────────────────────────

function buildClientHtml(d: BudgetPayload): string {
  const formattedDate = formatDateTime(d.dateTime);

  const extraLines: string[] = [];
  if (d.cadeiraBebe    > 0) extraLines.push(`${d.cadeiraBebe}× Cadeira de Bebé`);
  if (d.cadeiraCrianca > 0) extraLines.push(`${d.cadeiraCrianca}× Cadeira de Criança`);
  if (d.assentoBooster > 0) extraLines.push(`${d.assentoBooster}× Assento Elevatório`);

  const rows = [
    summaryRow("Trajeto", `${d.pickup} → ${d.dropoff}`),
    summaryRow("Data e Hora", formattedDate),
    summaryRow("Passageiros", String(d.passageiros)),
    summaryRow("Bagagem", `${d.bagagem} mala${d.bagagem !== 1 ? "s" : ""}`),
    summaryRow("Viatura Sugerida", d.veiculoLabel),
    ...(extraLines.length > 0 ? [summaryRow("Extras", extraLines.join("<br/>"))] : []),
    ...(d.flightOrTrain ? [summaryRow("Voo / Comboio", d.flightOrTrain)] : []),
  ].join("");

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Way2Go — Pedido Recebido</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
          style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">

          <!-- Header -->
          <tr>
            <td style="background:#0a0a0a;padding:36px 40px;">
              <p style="margin:0;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#6b7280;">Way2Go</p>
              <p style="margin:10px 0 4px;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Pedido Recebido</p>
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.5;">A nossa equipa irá contactá-lo com a brevidade possível.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
                Olá <strong style="color:#0a0a0a;">${escapeHtml(d.name)}</strong>,
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">
                Obrigado pelo seu contacto e pela preferência na <strong style="color:#0a0a0a;">Way2Go</strong>.
                Recebemos o seu pedido de orçamento com sucesso.
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#374151;line-height:1.7;">
                A nossa equipa está a analisar o seu trajeto e irá enviar-lhe o valor final com a maior brevidade possível.
                Abaixo encontra o resumo dos detalhes que nos enviou:
              </p>

              <!-- Summary card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;margin-bottom:32px;">
                <tr>
                  <td colspan="2" style="background:#f9fafb;padding:14px 24px;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#6b7280;font-weight:700;">Resumo do Pedido</p>
                  </td>
                </tr>
                ${rows}
              </table>

              <p style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.7;">
                Se tiver dúvidas ou precisar de alterar os detalhes, contacte-nos:
              </p>
              <p style="margin:0;font-size:14px;color:#374151;">
                ✉️&nbsp;<a href="mailto:support@way2go.pt" style="color:#0a0a0a;font-weight:600;text-decoration:none;">support@way2go.pt</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;line-height:1.7;">
                © 2026 Way2Go · Serviço Premium de Transfer<br/>
                Este email foi gerado automaticamente. Por favor não responda diretamente a esta mensagem.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Internal email — operacional ──────────────────────────────────────────────

function buildInternalHtml(d: BudgetPayload): string {
  const formattedDate = formatDateTime(d.dateTime);
  const receivedAt    = new Date().toLocaleString("pt-PT", {
    timeZone:  "Europe/Lisbon",
    dateStyle: "full",
    timeStyle: "short",
  });

  const extraLines: string[] = [];
  if (d.cadeiraBebe    > 0) extraLines.push(`${d.cadeiraBebe}× Cadeira de Bebé`);
  if (d.cadeiraCrianca > 0) extraLines.push(`${d.cadeiraCrianca}× Cadeira de Criança`);
  if (d.assentoBooster > 0) extraLines.push(`${d.assentoBooster}× Assento Elevatório`);

  const iRow = (label: string, value: string) => `
  <tr>
    <td style="padding:9px 16px;width:36%;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#6b7280;font-weight:600;border-bottom:1px solid #f3f4f6;vertical-align:top;">${label}</td>
    <td style="padding:9px 16px;font-size:13px;color:#111827;font-weight:500;border-bottom:1px solid #f3f4f6;vertical-align:top;">${value}</td>
  </tr>`;

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <title>Orçamento Web — Way2Go</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
          style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">

          <!-- Header -->
          <tr>
            <td style="background:#0a0a0a;padding:24px 28px;">
              <p style="margin:0;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#6b7280;">Way2Go · Interno</p>
              <p style="margin:8px 0 2px;font-size:18px;font-weight:700;color:#ffffff;">🔔 Novo Orçamento Web</p>
              <p style="margin:0;font-size:11px;color:#9ca3af;">Recebido: ${receivedAt}</p>
            </td>
          </tr>

          <!-- Contact section -->
          <tr>
            <td style="padding:20px 28px 0;">
              <p style="margin:0 0 8px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#9ca3af;font-weight:700;">Contacto do Cliente</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                style="border-radius:6px;border:1px solid #e5e7eb;overflow:hidden;">
                ${iRow("Nome",     escapeHtml(d.name))}
                ${iRow("Email",    `<a href="mailto:${d.email}" style="color:#111827;text-decoration:none;">${d.email}</a>`)}
                ${iRow("Telefone", escapeHtml(d.phone))}
                ${d.flightOrTrain ? iRow("Voo / Comboio", escapeHtml(d.flightOrTrain)) : ""}
              </table>
            </td>
          </tr>

          <!-- Trip section -->
          <tr>
            <td style="padding:8px 28px 0;">
              <p style="margin:0 0 8px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#9ca3af;font-weight:700;">Detalhes do Trajeto</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                style="border-radius:6px;border:1px solid #e5e7eb;overflow:hidden;">
                ${iRow("Origem",       escapeHtml(d.pickup))}
                ${iRow("Destino",      escapeHtml(d.dropoff))}
                ${iRow("Data / Hora",  formattedDate)}
                ${iRow("Passageiros",  String(d.passageiros))}
                ${iRow("Bagagem",      `${d.bagagem} mala${d.bagagem !== 1 ? "s" : ""}`)}
                ${iRow("Viatura",      escapeHtml(d.veiculoLabel))}
                ${extraLines.length > 0 ? iRow("Extras", extraLines.join("<br/>")) : ""}
              </table>
            </td>
          </tr>

          ${d.observations ? `
          <!-- Observations -->
          <tr>
            <td style="padding:8px 28px 0;">
              <p style="margin:0 0 8px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#9ca3af;font-weight:700;">Observações</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 20px;">
              <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:6px;padding:14px 16px;font-size:13px;color:#374151;line-height:1.6;">
                ${escapeHtml(d.observations)}
              </div>
            </td>
          </tr>` : ""}

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:16px 28px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
                Formulário ${d.idioma === "pt" ? "PT-PT" : "EN-US"} · way2go.pt · Respondendo a este email contacta diretamente o cliente.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Discord embed builder ─────────────────────────────────────────────────────

function buildDiscordPayload(d: BudgetPayload) {
  const [datePart, timePart] = d.dateTime.split("T");
  const [year, month, day]   = (datePart ?? "").split("-");
  const formattedDate        = `${day}/${month}/${year} às ${timePart ?? ""}`;

  const fields: { name: string; value: string; inline: boolean }[] = [
    { name: "👤 Nome",     value: d.name,  inline: true },
    { name: "📧 Email",    value: d.email, inline: true },
    { name: "📱 Telefone", value: d.phone, inline: true },

    { name: "📍 Origem",  value: d.pickup,  inline: true },
    { name: "🏁 Destino", value: d.dropoff, inline: true },
    d.flightOrTrain
      ? { name: "✈️ Voo / Comboio", value: d.flightOrTrain, inline: true }
      : { name: "​",            value: "​",         inline: true },

    { name: "📅 Data / Hora", value: formattedDate,              inline: true },
    { name: "👥 Passageiros", value: String(d.passageiros),       inline: true },
    { name: "🧳 Bagagem",     value: `${d.bagagem} mala${d.bagagem !== 1 ? "s" : ""}`, inline: true },

    { name: "🚗 Veículo Sugerido", value: d.veiculoLabel, inline: false },
  ];

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

  const lang = d.idioma === "pt" ? "PT-PT" : "EN-US";

  return {
    embeds: [
      {
        title:     "🔔 Novo Pedido de Orçamento — Way2Go",
        color:     0xC9A84C,
        fields,
        footer:    { text: `Way2Go · Formulário ${lang} · way2go.pt` },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

// ── XSS guard for HTML templates ──────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
