import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { z } from "zod";

import { clientKey, rateLimit } from "@/lib/rate-limit";

// ── Payload schema ────────────────────────────────────────────────────────────

/**
 * Limites de comprimento em todas as strings.
 *
 * Sem eles, um campo longo (`observations` acima de 1024 caracteres) fazia o
 * Discord devolver 400, o endpoint devolver 500 e **o lead perder-se**.
 * `observations` fica abaixo do limite de 1024 do embed do Discord.
 */
const schema = z.object({
  pickup:         z.string().min(1).max(200),
  dropoff:        z.string().min(1).max(200),
  dateTime:       z.string().min(1).max(40),
  passageiros:    z.number().int().min(1).max(100),
  bagagem:        z.number().int().min(0).max(100),
  cadeiraBebe:    z.number().int().min(0).max(20),
  cadeiraCrianca: z.number().int().min(0).max(20),
  assentoBooster: z.number().int().min(0).max(20),
  veiculo:        z.string().min(1).max(60),
  veiculoLabel:   z.string().min(1).max(120),
  /** Classe do catálogo do CRM escolhida pelo cliente, quando houve preço. */
  vehicleClassCode: z.string().max(60).optional(),
  /** Preço que o cliente viu ao submeter — fica no registo do pedido. */
  precoEstimado:  z.number().nonnegative().max(1_000_000).optional(),
  moeda:          z.string().max(8).optional(),
  name:           z.string().min(1).max(120),
  email:          z.string().email().max(254),
  phone:          z.string().min(1).max(40),
  idioma:         z.enum(["pt", "en"]),
  flightOrTrain:  z.string().max(60).optional(),
  observations:   z.string().max(900).optional(),
  /**
   * Honeypot: invisível para pessoas, preenchido por bots que submetem todos
   * os campos. Se vier com conteúdo, respondemos 200 sem fazer nada — negar
   * abertamente ensinaria o bot a contornar.
   */
  website:        z.string().max(200).optional(),
});

type BudgetPayload = z.infer<typeof schema>;

/**
 * Destinatário interno dos leads.
 *
 * O valor por defeito mantém o endereço que estava hardcoded, para não alterar
 * comportamento. Configurável por env para que uma mudança de caixa de correio
 * não exija deploy — ver F2-1 em docs/TODO.md (unificação de marca way2go.pt).
 */
const INTERNAL_RECIPIENT = process.env.LEADS_INTERNAL_EMAIL?.trim() || "reservas@vruum.pt";

// ── Route handler ─────────────────────────────────────────────────────────────

/** 5 pedidos por IP a cada 10 minutos — folgado para uso humano, apertado para scripts. */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  const limit = rateLimit(`send-budget:${clientKey(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: "Demasiados pedidos. Tente novamente daqui a alguns minutos." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

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

  // Honeypot preenchido: responder como se tivesse corrido bem, sem notificar.
  if (d.website && d.website.trim().length > 0) {
    console.warn("[send-budget] Honeypot preenchido — submissão descartada.");
    return NextResponse.json({ success: true });
  }

  // Emails e Discord arrancam em paralelo: a latência passa a ser a do mais
  // lento em vez da soma dos dois. Continua `await`ed antes de responder — uma
  // promise solta pode ser cortada quando a resposta é enviada em serverless.
  const emails = sendEmails(d);
  const discordOk = await notifyDiscord(d);
  const emailOk = await emails;

  // O Discord é um canal de notificação, o email é o registo formal. Antes,
  // uma falha do Discord devolvia 500 e **o lead perdia-se**, mesmo com o
  // email entregue. Agora só falha se *nenhum* dos canais tiver funcionado.
  if (!discordOk && !emailOk) {
    console.error("[send-budget] Nenhum canal de notificação funcionou — lead em risco.");
    return NextResponse.json(
      { message: "Não foi possível registar o pedido. Contacte-nos diretamente." },
      { status: 500 },
    );
  }

  if (!discordOk) console.warn("[send-budget] Discord falhou; o lead seguiu por email.");
  if (!emailOk) console.warn("[send-budget] Email falhou; o lead seguiu por Discord.");

  return NextResponse.json({ success: true });
}

/** @returns `true` se a notificação chegou ao Discord. */
async function notifyDiscord(d: BudgetPayload): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("[send-budget] DISCORD_WEBHOOK_URL não definido.");
    return false;
  }

  try {
    const res = await fetch(webhookUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(buildDiscordPayload(d)),
    });

    if (!res.ok) {
      console.error("[send-budget] Discord rejeitou o pedido:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[send-budget] Falha na ligação ao Discord:", err);
    return false;
  }
}

// ── Email sender ──────────────────────────────────────────────────────────────

/** @returns `true` se o email interno (o registo do lead) foi aceite pelo servidor SMTP. */
async function sendEmails(d: BudgetPayload): Promise<boolean> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error("[send-budget] Variáveis SMTP em falta:", {
      SMTP_HOST: SMTP_HOST ? "SET" : "UNDEFINED",
      SMTP_USER: SMTP_USER ? "SET" : "UNDEFINED",
      SMTP_PASS: SMTP_PASS ? "SET" : "UNDEFINED",
    });
    return false;
  }

  const transporter = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   Number(SMTP_PORT ?? 465),
    secure: true,
    auth:   { user: SMTP_USER, pass: SMTP_PASS },
  });

  const from = `"Way2Go" <${SMTP_USER}>`;

  // Os dois emails são independentes — enviados em paralelo.
  // Os logs registam apenas contagens e messageId: nunca endereços de clientes
  // (RGPD — os logs têm retenção e não são o sítio para dados pessoais).
  const results = await Promise.allSettled([
    transporter.sendMail({
      from,
      to:      d.email,
      subject: CLIENT_EMAIL_COPY[d.idioma].subject,
      html:    buildClientHtml(d),
    }),
    transporter.sendMail({
      from,
      to:      INTERNAL_RECIPIENT,
      replyTo: d.email,
      subject: `🔔 [BACKUP] Novo Orçamento Web — ${d.name}`,
      html:    buildInternalHtml(d),
    }),
  ]);

  const labels = ["cliente", "interno"] as const;
  const delivered = results.map((result, i) => {
    if (result.status === "rejected") {
      console.error(`[send-budget] Falha no email ${labels[i]}:`, result.reason);
      return false;
    }
    const { messageId, accepted, rejected } = result.value;
    if (rejected.length > 0) {
      console.error(
        `[send-budget] Email ${labels[i]} rejeitado pelo servidor SMTP` +
          ` (${rejected.length} destinatário(s)) | messageId: ${messageId}`,
      );
      return false;
    }
    console.log(
      `[send-budget] Email ${labels[i]} aceite` +
        ` (${accepted.length} destinatário(s)) | messageId: ${messageId}`,
    );
    return true;
  });

  // Só o email interno conta como registo do lead: o do cliente é cortesia.
  return delivered[1] === true;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formata `YYYY-MM-DDTHH:mm` para leitura humana.
 *
 * Devolve a string original se o formato não bater certo. Antes destruturava o
 * `split` sem validar e produzia `"undefined/undefined/undefined"` no email de
 * confirmação — o cliente recebia lixo em vez da data que submeteu.
 *
 * EN usa ISO (`YYYY-MM-DD`) de propósito: `DD/MM` e `MM/DD` são indistinguíveis
 * para metade dos leitores e trocar o dia pelo mês numa recolha custa a viagem.
 */
function formatDateTime(dateTime: string, locale: "pt" | "en" = "pt"): string {
  const [datePart = "", timePart = ""] = dateTime.split("T");
  const [year, month, day] = datePart.split("-");

  if (!year || !month || !day) return dateTime;

  const date = locale === "en" ? `${year}-${month}-${day}` : `${day}/${month}/${year}`;
  if (!timePart) return date;

  return `${date} ${locale === "en" ? "at" : "às"} ${timePart}`;
}

/** O preço é o que o cliente viu; formatá-lo mal seria pior do que não o mostrar. */
function formatPrice(amount: number, currency: string | undefined, locale: "pt" | "en"): string {
  try {
    return new Intl.NumberFormat(locale === "en" ? "en-GB" : "pt-PT", {
      style: "currency",
      currency: currency || "EUR",
    }).format(amount);
  } catch {
    return `${amount} ${currency || "EUR"}`;
  }
}

function summaryRow(label: string, value: string): string {
  return `
  <tr>
    <td style="padding:12px 24px;width:38%;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#9ca3af;font-weight:600;vertical-align:top;border-bottom:1px solid #f3f4f6;">${label}</td>
    <td style="padding:12px 24px;font-size:14px;color:#111827;font-weight:500;vertical-align:top;border-bottom:1px solid #f3f4f6;">${value}</td>
  </tr>`;
}

// ── Client email — premium PT-PT ──────────────────────────────────────────────

/**
 * Copy do email de confirmação ao cliente.
 *
 * Antes era sempre em português, mesmo quando o formulário era submetido em
 * inglês: o `idioma` só aparecia no rodapé do email interno, nunca era usado
 * para trocar o template. O email interno mantém-se em PT — é para a equipa.
 */
const CLIENT_EMAIL_COPY = {
  pt: {
    subject:   "Recebemos o seu pedido de orçamento — Way2Go",
    title:     "Pedido Recebido",
    preamble:  "A nossa equipa irá contactá-lo com a brevidade possível.",
    greeting:  "Olá",
    thanks:    "Obrigado pelo seu contacto e pela preferência na",
    received:  "Recebemos o seu pedido de orçamento com sucesso.",
    analysing: "A nossa equipa está a analisar o seu trajeto e irá enviar-lhe o valor final com a maior brevidade possível. Abaixo encontra o resumo dos detalhes que nos enviou:",
    summary:   "Resumo do Pedido",
    doubts:    "Se tiver dúvidas ou precisar de alterar os detalhes, contacte-nos:",
    autoNote:  "Este email foi gerado automaticamente. Por favor não responda diretamente a esta mensagem.",
    tagline:   "Serviço Premium de Transfer",
    rows: {
      route:     "Trajeto",
      dateTime:  "Data e Hora",
      pax:       "Passageiros",
      luggage:   "Bagagem",
      vehicle:   "Viatura Sugerida",
      extras:    "Extras",
      flight:    "Voo / Comboio",
      price:     "Preço Estimado",
    },
    bag:  (n: number) => `${n} mala${n !== 1 ? "s" : ""}`,
    seats: { baby: "Cadeira de Bebé", child: "Cadeira de Criança", booster: "Assento Elevatório" },
  },
  en: {
    subject:   "We received your quote request — Way2Go",
    title:     "Request Received",
    preamble:  "Our team will get back to you as soon as possible.",
    greeting:  "Hello",
    thanks:    "Thank you for contacting and choosing",
    received:  "We have successfully received your quote request.",
    analysing: "Our team is reviewing your route and will send you the final price as soon as possible. Below is a summary of the details you submitted:",
    summary:   "Request Summary",
    doubts:    "If you have any questions or need to change the details, contact us:",
    autoNote:  "This email was generated automatically. Please do not reply directly to this message.",
    tagline:   "Premium Transfer Service",
    rows: {
      route:     "Route",
      dateTime:  "Date and Time",
      pax:       "Passengers",
      luggage:   "Luggage",
      vehicle:   "Suggested Vehicle",
      extras:    "Extras",
      flight:    "Flight / Train",
      price:     "Estimated Price",
    },
    bag:  (n: number) => `${n} bag${n !== 1 ? "s" : ""}`,
    seats: { baby: "Baby Seat", child: "Child Seat", booster: "Booster Seat" },
  },
} as const;

function buildClientHtml(d: BudgetPayload): string {
  const t = CLIENT_EMAIL_COPY[d.idioma];
  const formattedDate = formatDateTime(d.dateTime, d.idioma);

  const extraLines: string[] = [];
  if (d.cadeiraBebe    > 0) extraLines.push(`${d.cadeiraBebe}× ${t.seats.baby}`);
  if (d.cadeiraCrianca > 0) extraLines.push(`${d.cadeiraCrianca}× ${t.seats.child}`);
  if (d.assentoBooster > 0) extraLines.push(`${d.assentoBooster}× ${t.seats.booster}`);

  const rows = [
    summaryRow(t.rows.route, `${escapeHtml(d.pickup)} → ${escapeHtml(d.dropoff)}`),
    summaryRow(t.rows.dateTime, formattedDate),
    summaryRow(t.rows.pax, String(d.passageiros)),
    summaryRow(t.rows.luggage, t.bag(d.bagagem)),
    summaryRow(t.rows.vehicle, escapeHtml(d.veiculoLabel)),
    ...(extraLines.length > 0 ? [summaryRow(t.rows.extras, extraLines.join("<br/>"))] : []),
    ...(d.precoEstimado !== undefined
      ? [summaryRow(t.rows.price, formatPrice(d.precoEstimado, d.moeda, d.idioma))]
      : []),
    ...(d.flightOrTrain ? [summaryRow(t.rows.flight, escapeHtml(d.flightOrTrain))] : []),
  ].join("");

  return `<!DOCTYPE html>
<html lang="${d.idioma}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Way2Go — ${t.title}</title>
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
              <p style="margin:10px 0 4px;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">${t.title}</p>
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.5;">${t.preamble}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
                ${t.greeting} <strong style="color:#0a0a0a;">${escapeHtml(d.name)}</strong>,
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">
                ${t.thanks} <strong style="color:#0a0a0a;">Way2Go</strong>.
                ${t.received}
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#374151;line-height:1.7;">
                ${t.analysing}
              </p>

              <!-- Summary card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;margin-bottom:32px;">
                <tr>
                  <td colspan="2" style="background:#f9fafb;padding:14px 24px;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#6b7280;font-weight:700;">${t.summary}</p>
                  </td>
                </tr>
                ${rows}
              </table>

              <p style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.7;">
                ${t.doubts}
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
                © ${new Date().getFullYear()} Way2Go · ${t.tagline}<br/>
                ${t.autoNote}
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

    { name: "🚗 Veículo Escolhido", value: d.veiculoLabel, inline: false },
  ];

  if (d.precoEstimado !== undefined) {
    // O preço que o cliente viu. Sem isto, quem responde não sabe o que foi
    // mostrado e arrisca cotar um valor diferente.
    fields.push({
      name: "💶 Preço Mostrado",
      value: `${formatPrice(d.precoEstimado, d.moeda, d.idioma)}${d.vehicleClassCode ? ` · ${d.vehicleClassCode}` : ""}`,
      inline: false,
    });
  }

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
    .replace(/"/g, "&quot;")
    // A plica fecha atributos em HTML com aspas simples. Hoje todas as
    // interpolações usam aspas duplas, mas depender disso é um invariante
    // frágil que se perde na primeira edição distraída.
    .replace(/'/g, "&#39;");
}
