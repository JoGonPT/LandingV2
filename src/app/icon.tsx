import { ImageResponse } from "next/og";

/**
 * Favicon gerado a partir do logótipo que já existe no Navbar: quadrado preto,
 * "W" branco. Gerado em build em vez de um .ico versionado para não haver duas
 * fontes de verdade sobre a marca.
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#000000",
                    color: "#ffffff",
                    fontSize: 22,
                    fontWeight: 700,
                    borderRadius: 7,
                }}
            >
                W
            </div>
        ),
        size,
    );
}
