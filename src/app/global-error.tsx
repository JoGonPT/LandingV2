"use client";

import { ErrorScreen } from "@/components/ErrorScreen";

/**
 * Último recurso: só dispara quando o próprio layout raiz falha, pelo que tem
 * de trazer as suas próprias tags `<html>` e `<body>`.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
    return (
        <html lang="pt">
            <body>
                <ErrorScreen variant="error" reset={reset} />
            </body>
        </html>
    );
}
