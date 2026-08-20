import { ImageResponse } from "next/og";

/**
 * Cartão social. Sem isto, qualquer link partilhado no WhatsApp, LinkedIn ou
 * Facebook aparecia sem imagem e sem título — para um site cujo único objetivo
 * é captar contactos, é tráfego perdido à entrada.
 *
 * Desenhado com os elementos de marca que já existem (preto, dourado #D4AF37,
 * o "W" do Navbar) em vez de embutir um ficheiro novo.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Way2Go — Transfers privados de aeroporto";

const COPY = {
    pt: {
        title: "Transfers Privados de Aeroporto",
        subtitle: "Motorista profissional · Portugal e Espanha",
    },
    en: {
        title: "Private Airport Transfers",
        subtitle: "Professional chauffeurs · Portugal and Spain",
    },
} as const;

export default async function OpengraphImage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const copy = COPY[locale as keyof typeof COPY] ?? COPY.pt;

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    background: "#050816",
                    padding: 72,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <div
                        style={{
                            width: 64,
                            height: 64,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#ffffff",
                            color: "#050816",
                            fontSize: 40,
                            fontWeight: 700,
                            borderRadius: 14,
                        }}
                    >
                        W
                    </div>
                    <div style={{ fontSize: 40, fontWeight: 700, color: "#ffffff" }}>Way2Go</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                    <div
                        style={{
                            fontSize: 76,
                            fontWeight: 700,
                            color: "#ffffff",
                            lineHeight: 1.1,
                            maxWidth: 900,
                        }}
                    >
                        {copy.title}
                    </div>
                    <div style={{ display: "flex", width: 90, height: 5, background: "#D4AF37" }} />
                    <div style={{ fontSize: 32, color: "#9ca3af" }}>{copy.subtitle}</div>
                </div>
            </div>
        ),
        size,
    );
}
