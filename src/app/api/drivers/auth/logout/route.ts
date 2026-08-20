import { NextResponse } from "next/server";

import { isDriverSupabaseAuthConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Terminar sessão nunca deve falhar do lado de quem pede.
 *
 * `createSupabaseServerClient()` e `signOut()` fazem I/O e podem lançar. Sem
 * tratamento, o Supabase em baixo devolvia 500 e o motorista **ficava preso na
 * sessão** — sem forma de sair pela interface. O erro fica no log; a resposta é
 * sempre `ok`, para o cliente poder limpar o estado local e seguir para o login.
 */
export async function POST() {
  if (!isDriverSupabaseAuthConfigured()) {
    return NextResponse.json({ ok: true });
  }

  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error("[drivers/logout] Falha ao terminar a sessão no Supabase:", error);
  }

  return NextResponse.json({ ok: true });
}
