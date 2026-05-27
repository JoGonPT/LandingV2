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
});

type BudgetPayload = z.infer<typeof schema>;

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // 1. Parse + validate
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

  // 2. SMTP transporter
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // 3. Send
  try {
    await transporter.sendMail({
      from:    `"Way2Go" <${process.env.SMTP_USER}>`,
      to:      process.env.BUDGET_TO_EMAIL ?? "reservas@vruum.pt",
      replyTo: d.email,
      subject: `Novo Pedido de Orçamento — ${d.name}`,
      html:    buildHtml(d),
    });
  } catch (err) {
    console.error("[send-budget] Falha SMTP:", err);
    return NextResponse.json(
      { message: "Erro ao enviar o email. Tente novamente." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

// ── HTML template ─────────────────────────────────────────────────────────────

function buildHtml(d: BudgetPayload): string {
  const receivedAt = new Date().toLocaleString("pt-PT", {
    timeZone: "Europe/Lisbon",
    dateStyle: "full",
    timeStyle: "short",
  });

  // Format dateTime "2025-06-15T14:30" → "15/06/2025 às 14:30"
  const [datePart, timePart] = d.dateTime.split("T");
  const [year, month, day]   = (datePart ?? "").split("-");
  const formattedDate        = `${day}/${month}/${year} às ${timePart ?? ""}`;

  const extrasRows = [
    d.cadeiraBebe    > 0 ? row("Cadeira de Bebé",      String(d.cadeiraBebe))    : "",
    d.cadeiraCrianca > 0 ? row("Cadeira de Criança",   String(d.cadeiraCrianca)) : "",
    d.assentoBooster > 0 ? row("Assento Elevatório",   String(d.assentoBooster)) : "",
  ].join("");

  const extrasSection = extrasRows
    ? section("Extras", extrasRows)
    : "";

  const idioma = d.idioma === "pt" ? "Português (PT-PT)" : "English (EN-US)";

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pedido de Orçamento Way2Go</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5;">

          <!-- Header -->
          <tr>
            <td style="background:#000000;padding:28px 32px;">
              <p style="margin:0;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#999999;">Way2Go</p>
              <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#ffffff;">Novo Pedido de Orçamento</p>
              <p style="margin:6px 0 0;font-size:12px;color:#aaaaaa;">Recebido em ${receivedAt}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 32px;">

              ${section("Rota", [
                row("Origem",    d.pickup),
                row("Destino",   d.dropoff),
                row("Data / Hora", formattedDate),
              ].join(""))}

              ${section("Capacidade", [
                row("Passageiros", String(d.passageiros)),
                row("Bagagem",     String(d.bagagem)),
              ].join(""))}

              ${extrasSection}

              ${section("Veículo Sugerido", row("Classe", d.veiculoLabel))}

              ${section("Contacto", [
                row("Nome",      d.name),
                row("Email",     `<a href="mailto:${d.email}" style="color:#000000;">${d.email}</a>`),
                row("Telefone",  d.phone),
                row("Idioma",    idioma),
              ].join(""))}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f5f5f5;padding:20px 32px;border-top:1px solid #e5e5e5;">
              <p style="margin:0;font-size:11px;color:#999999;text-align:center;">
                Esta mensagem foi gerada automaticamente pelo formulário em way2go.pt.<br/>
                Responda diretamente a este email para contactar o cliente.
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

function section(title: string, rows: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="padding-bottom:8px;border-bottom:2px solid #000000;">
          <p style="margin:0;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#000000;">${title}</p>
        </td>
      </tr>
      ${rows}
    </table>`;
}

function row(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:8px 0 0;width:40%;font-size:12px;color:#888888;vertical-align:top;">${label}</td>
      <td style="padding:8px 0 0;font-size:13px;color:#000000;font-weight:500;">${value}</td>
    </tr>`;
}
