import { createClient } from "@supabase/supabase-js";
import type { Action, View } from "./types";
const url = import.meta.env.VITE_SUPABASE_URL;
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;
function configuredClient() {
  if (!url || !key) return null;
  try {
    return createClient(url, key);
  } catch {
    return null;
  }
}
export const supabase = configuredClient();
export class GameError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
  }
}
export async function session() {
  if (!supabase)
    throw new Error(
      "Configure o novo projeto Supabase para jogar online. O modo local já está disponível.",
    );
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) throw error;
  if (session) return session.user.id;
  const { data, error: signError } = await supabase.auth.signInAnonymously();
  if (signError)
    throw new Error(
      "Não foi possível entrar. Confira se a autenticação anônima está ativada no Supabase.",
    );
  return data.user!.id;
}
export async function rpc(code: string, action: Action): Promise<View> {
  if (!supabase) throw new Error("Supabase não configurado.");
  const { data, error } = await supabase.rpc("game", {
    p_code: code.toUpperCase().trim(),
    p_action: action,
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new GameError(data.error, data.code);
  if (action.type !== "leave" && data?.version !== 1)
    throw new Error(
      "Versão da sala incompatível. Atualize a página antes de continuar.",
    );
  return data as View;
}
