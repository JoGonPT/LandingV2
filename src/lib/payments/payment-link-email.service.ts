export interface BookingEmailDetails {
  bookingId: string;
  pickup?: string;
  dropoff?: string;
  tripDate?: string;
  tripTime?: string;
  amount?: number | null;
  currency?: string | null;
}

function requireFromEmail(): string {
  const from = process.env.PAYMENT_LINK_FROM_EMAIL?.trim();
  if (!from) {
    throw new Error("PAYMENT_LINK_FROM_EMAIL is not configured.");
  }
  return from;
}

function buildEmailContent(paymentUrl: string, booking: BookingEmailDetails) {
  const subject = `Way2Go - Link de Pagamento da Reserva ${booking.bookingId}`;
  const amountLine =
    typeof booking.amount === "number" && booking.currency
      ? `Valor: ${booking.amount.toFixed(2)} ${booking.currency.toUpperCase()}`
      : "";
  const tripLine =
    booking.pickup && booking.dropoff
      ? `Rota: ${booking.pickup} -> ${booking.dropoff}`
      : "";
  const whenLine =
    booking.tripDate && booking.tripTime ? `Data/Hora: ${booking.tripDate} ${booking.tripTime}` : "";

  const text = [
    "A sua reserva Way2Go esta pre-confirmada.",
    "Para garantir o seu transfer, por favor conclua o pagamento atraves do link seguro abaixo.",
    "",
    paymentUrl,
    "",
    `Reserva: ${booking.bookingId}`,
    amountLine,
    tripLine,
    whenLine,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.45;color:#111">
    <p>A sua reserva Way2Go esta pre-confirmada.</p>
    <p>Para garantir o seu transfer, por favor conclua o pagamento atraves do link seguro abaixo.</p>
    <p><a href="${paymentUrl}" style="background:#000;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Concluir Pagamento</a></p>
    <p style="font-size:13px;color:#444">
      Reserva: ${booking.bookingId}<br/>
      ${amountLine ? `${amountLine}<br/>` : ""}
      ${tripLine ? `${tripLine}<br/>` : ""}
      ${whenLine ? `${whenLine}<br/>` : ""}
    </p>
  </div>`;

  return { subject, text, html };
}

async function sendWithResend(to: string, from: string, subject: string, text: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend failed: ${res.status} ${body}`);
  }
  return true;
}

async function sendWithSendGrid(to: string, from: string, subject: string, text: string, html: string): Promise<boolean> {
  const key = process.env.SENDGRID_API_KEY?.trim();
  if (!key) return false;
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`SendGrid failed: ${res.status} ${body}`);
  }
  return true;
}

export async function sendPaymentLinkEmail(
  clientEmail: string,
  paymentUrl: string,
  bookingDetails: BookingEmailDetails,
): Promise<void> {
  const to = clientEmail.trim();
  if (!to) throw new Error("Client email is required.");
  const from = requireFromEmail();
  const { subject, text, html } = buildEmailContent(paymentUrl, bookingDetails);

  if (await sendWithResend(to, from, subject, text, html)) return;
  if (await sendWithSendGrid(to, from, subject, text, html)) return;
  throw new Error("No email provider configured. Set RESEND_API_KEY or SENDGRID_API_KEY.");
}

