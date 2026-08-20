import { NextResponse } from "next/server";

/**
 * Erro que transporta o estado HTTP e o corpo da resposta.
 *
 * Substitui o `HttpException` do NestJS, que era a única razão pela qual a
 * lógica de reservas dependia desse framework. Os serviços continuam a não
 * saber nada de Next nem de Express: lançam este erro, e a rota traduz.
 */
export class ApiHttpError extends Error {
    constructor(
        readonly status: number,
        readonly body: unknown,
    ) {
        super(
            typeof body === "object" && body !== null && "message" in body
                ? String((body as { message: unknown }).message)
                : `HTTP ${status}`,
        );
        this.name = "ApiHttpError";
    }
}

/** Identificador curto por pedido, para ligar uma resposta de erro à sua entrada no log. */
export function createRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Envolve um handler, traduzindo `ApiHttpError` em resposta.
 *
 * O que **não** for `ApiHttpError` é um erro não previsto: fica registado com o
 * `requestId` e devolve 500 genérico. Nunca se devolve a mensagem original ao
 * cliente — pode conter detalhes internos.
 */
export async function withApiErrors<T>(
    handler: () => Promise<T>,
    context: { route: string; requestId?: string; successStatus?: number },
): Promise<NextResponse> {
    const requestId = context.requestId ?? createRequestId();

    try {
        const result = await handler();
        return NextResponse.json(result as object, { status: context.successStatus ?? 200 });
    } catch (error) {
        if (error instanceof ApiHttpError) {
            return NextResponse.json(error.body as object, { status: error.status });
        }

        console.error(
            `[${context.route}] Erro não tratado requestId=${requestId}:`,
            error instanceof Error ? error.message : String(error),
        );
        return NextResponse.json(
            { success: false, code: "INTERNAL_ERROR", message: "Erro interno.", requestId },
            { status: 500 },
        );
    }
}
