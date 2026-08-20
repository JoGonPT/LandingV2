"use client";

import { useEffect } from "react";

import { ErrorScreen } from "@/components/ErrorScreen";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // O `digest` é a única forma de ligar este ecrã à entrada correspondente
        // nos logs do servidor — a mensagem real não chega ao cliente.
        console.error("[app] Erro não tratado:", error.digest ?? error.message);
    }, [error]);

    return <ErrorScreen variant="error" reset={reset} />;
}
