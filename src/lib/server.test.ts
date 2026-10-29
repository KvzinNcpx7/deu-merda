import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { catalog } from "./engine";
import type { Action, View } from "./types";
const ids = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
  "44444444-4444-4444-8444-444444444444",
  ...Array.from(
    { length: 10 },
    (_, i) => `00000000-0000-4000-8000-${String(i + 4).padStart(12, "0")}`,
  ),
];
let db: PGlite;
async function as(i: number) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    ids[i],
  ]);
  await db.exec("set role authenticated");
}
async function call(i: number, code: string, action: Action) {
  await as(i);
  const res = await db.query<{ v: View }>(
    "select public.game($1,$2::jsonb) v",
    [code, JSON.stringify(action)],
  );
  const value = res.rows[0].v as View & { error?: string };
  if (value?.error) throw new Error(value.error);
  return value;
}
async function lobby() {
  const r = await call(0, "", {
    type: "create",
    name: "Pessoa A",
    emoji: "💀",
  });
  await call(1, r.code.toLowerCase(), {
    type: "join",
    name: "Pessoa B",
    emoji: "🤡",
  });
  return call(2, r.code, { type: "join", name: "Pessoa C", emoji: "🦆" });
}
async function start() {
  const r = await lobby();
  return call(0, r.code, { type: "start" });
}
async function answer(r: View) {
  for (let i = 1; i < 3; i++) {
    const v = await call(i, r.code, { type: "sync" });
    await call(i, r.code, {
      type: "submit",
      cards: v.players[i].hand.slice(0, v.prompt!.pick).map((c) => c.id),
    });
  }
  return call(0, r.code, { type: "reveal" });
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon; create role authenticated; create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated; create publication supabase_realtime;",
  );
  for (const migration of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    await db.exec(readFileSync(`supabase/migrations/${migration}`, "utf8"));
  }
}, 30000);
beforeEach(async () => {
  await db.exec(
    "reset role; delete from private.rooms; delete from public.room_signals; delete from private.rate_limits;",
  );
});
afterAll(async () => {
  await db?.close();
});
describe("PostgreSQL real embarcado: migrações, RPC e permissões", () => {
  it("preserva integralmente uma partida em andamento ao atualizar o catálogo", async () => {
    const room = await start();
    await db.exec("reset role");
    const readState = () =>
      db.query<{ state: unknown }>(
        "select state from private.rooms where code=$1",
        [room.code],
      );
    const before = (await readState()).rows[0].state;
    await db.exec(
      readFileSync("supabase/migrations/202610290004_editorial.sql", "utf8"),
    );
    expect((await readState()).rows[0].state).toEqual(before);
  });
  it("sincroniza exatamente o catálogo e os metadados do cliente", async () => {
    await db.exec("reset role");
    const result = await db.query("select * from private.cards order by id");
    expect(result.rows).toEqual(
      [...catalog].sort((a, b) => a.id.localeCompare(b.id)),
    );
  });
  it("aplica opt-in de tabus, temas e permissões no servidor", async () => {
    let r = await lobby();
    expect(r.packs).not.toContain("acido");
    const change = {
      type: "config",
      packs: [...r.packs, "acido"],
      target: 5,
      mode: "classic",
      excludedThemes: ["religiao", "medicina"],
    };
    await expect(call(1, r.code, change)).rejects.toThrow("anfitrião");
    await expect(
      call(0, r.code, { ...change, excludedThemes: ["inexistente"] }),
    ).rejects.toThrow("Temas");
    await expect(
      call(0, r.code, { ...change, excludedThemes: null }),
    ).rejects.toThrow("Temas");
    r = await call(0, r.code, change);
    expect(r.excludedThemes).toEqual(change.excludedThemes);
    // A later configuration keeps the filter when this optional field is omitted.
    await call(0, r.code, {
      type: "config",
      packs: r.packs,
      target: 7,
      mode: "classic",
    });
    await call(0, r.code, { type: "start" });
    await db.exec("reset role");
    const state = (
      await db.query<{ state: View & { questions: typeof catalog } }>(
        "select state from private.rooms where code=$1",
        [r.code],
      )
    ).rows[0].state;
    const cards = [
      ...state.players.flatMap((p) => p.hand),
      ...state.questions,
      state.prompt!,
    ];
    expect(cards.every((c) => !change.excludedThemes.includes(c.theme!))).toBe(
      true,
    );
    expect(cards.some((c) => c.pack === "acido")).toBe(true);
    await expect(call(0, r.code, change)).rejects.toThrow("lobby");
  });
  it("entra por código, reconecta e mantém cartas privadas", async () => {
    let r = await start();
    expect(r.players[0].hand).toHaveLength(10);
    expect(r.players[1].hand).toHaveLength(0);
    const other = await call(1, r.code, { type: "join" });
    expect(other.players).toHaveLength(3);
    expect(other.players[1].hand).toHaveLength(10);
    expect(other.players[0].hand).toHaveLength(0);
    expect(other).not.toHaveProperty("questions");
    expect(other).not.toHaveProperty("deck");
    expect(other.players[1].hand).toEqual(
      (await call(1, r.code, { type: "sync" })).players[1].hand,
    );
  });
  it("RLS esconde sinais de estranhos e bloqueia tabelas/funções privadas", async () => {
    const r = await start();
    await as(3);
    expect(
      (await db.query("select * from public.room_signals")).rows,
    ).toHaveLength(0);
    await expect(db.query("select state from private.rooms")).rejects.toThrow(
      "permission denied",
    );
    await expect(
      db.query("select private.snapshot('{}'::jsonb,$1)", [ids[3]]),
    ).rejects.toThrow("permission denied");
    await expect(call(3, r.code, { type: "sync" })).rejects.toThrow(
      "participa",
    );
    await as(0);
    expect(
      (await db.query("select * from public.room_signals")).rows,
    ).toHaveLength(1);
    await expect(
      db.query("update public.room_signals set revision=999"),
    ).rejects.toThrow("permission denied");
  });
  it("rejeita juiz, carta roubada, envio duplicado e revelação precoce", async () => {
    let r = await start();
    await expect(
      call(0, r.code, {
        type: "submit",
        cards: r.players[0].hand.slice(0, r.prompt!.pick).map((c) => c.id),
      }),
    ).rejects.toThrow();
    await expect(
      call(1, r.code, {
        type: "submit",
        cards: r.players[0].hand.slice(0, r.prompt!.pick).map((c) => c.id),
      }),
    ).rejects.toThrow("não é sua");
    await expect(call(1, r.code, { type: "submit" })).rejects.toThrow();
    await expect(call(0, r.code, { type: "reveal" })).rejects.toThrow("faltam");
    const b = await call(1, r.code, { type: "sync" });
    r = await call(1, r.code, {
      type: "submit",
      cards: b.players[1].hand.slice(0, r.prompt!.pick).map((c) => c.id),
    });
    expect(r.submissions).toHaveLength(0);
    await expect(
      call(1, r.code, { type: "submit", cards: [] }),
    ).rejects.toThrow("já enviou");
  });
  it("responde duplas em ordem e recusa a mesma carta duas vezes", async () => {
    let r = await start();
    await db.exec("reset role");
    await db.query(
      "update private.rooms set state=jsonb_set(state,'{prompt}',(select to_jsonb(c) from private.cards c where pick=2 limit 1)) where code=$1",
      [r.code],
    );
    const b = await call(1, r.code, { type: "sync" });
    const hand = b.players[1].hand;
    await expect(
      call(1, r.code, { type: "submit", cards: [hand[0].id, hand[0].id] }),
    ).rejects.toThrow("sem repetir");
    await call(1, r.code, { type: "submit", cards: [hand[1].id, hand[0].id] });
    const c = await call(2, r.code, { type: "sync" });
    await call(2, r.code, {
      type: "submit",
      cards: c.players[2].hand.slice(0, 2).map((c) => c.id),
    });
    r = await call(0, r.code, { type: "reveal" });
    expect(r.submissions.every((s) => s.player === "")).toBe(true);
    expect(
      r.submissions.find((s) => s.cards[0].id === hand[1].id)!.cards[1].id,
    ).toBe(hand[0].id);
  });
  it("pontua somente por decisão autorizada e alterna o juiz", async () => {
    let r = await answer(await start());
    await expect(
      call(1, r.code, { type: "choose", id: r.submissions[0].id }),
    ).rejects.toThrow("Somente");
    await expect(
      call(0, r.code, { type: "choose", id: "inventado" }),
    ).rejects.toThrow("inexistente");
    r = await call(0, r.code, { type: "choose", id: r.submissions[0].id });
    expect(r.phase).toBe("result");
    expect(r.submissions[0].player).not.toBe("");
    expect(r.players.find((p) => p.id === r.winner)!.score).toBe(1);
    await expect(
      call(0, r.code, { type: "choose", id: r.submissions[0].id }),
    ).rejects.toThrow();
    r = await call(0, r.code, { type: "next" });
    expect(r.judge).toBe(ids[1]);
    expect(r.round).toBe(2);
    for (let i = 0; i < 3; i++) {
      const v = await call(i, r.code, { type: "sync" });
      expect(v.players[i].hand).toHaveLength(10);
    }
  });
  it("democracia bloqueia voto próprio e repetido, conta e resolve vencedor", async () => {
    let r = await lobby();
    await call(0, r.code, {
      type: "config",
      packs: r.packs,
      target: 5,
      mode: "democracy",
    });
    r = await answer(await call(0, r.code, { type: "start" }));
    const b = await call(1, r.code, { type: "sync" });
    const own = r.submissions.find((s) =>
      b.players[1].hand.some((c) => c.id === s.cards[0].id),
    )!;
    const other = r.submissions.find((s) => s.id !== own.id)!;
    await expect(
      call(1, r.code, { type: "vote", id: own.id }),
    ).rejects.toThrow();
    await call(1, r.code, { type: "vote", id: other.id });
    await expect(
      call(1, r.code, { type: "vote", id: other.id }),
    ).rejects.toThrow();
    await call(2, r.code, { type: "vote", id: own.id });
    r = await call(0, r.code, { type: "vote", id: own.id });
    expect(r.winner).toBe(ids[1]);
    expect(r.phase).toBe("result");
  });
  it("limita cartas próprias e só permite ao anfitrião antes do início", async () => {
    let r = await lobby();
    await expect(
      call(1, r.code, { type: "custom", text: "Uma coisa.", pick: 0 }),
    ).rejects.toThrow();
    await expect(
      call(0, r.code, { type: "custom", text: "Uma coisa." }),
    ).rejects.toThrow();
    await expect(call(0, r.code, { type: "config" })).rejects.toThrow();
    r = await call(0, r.code, {
      type: "custom",
      text: "O pato pediu ________.",
      pick: 1,
    });
    expect(r.custom).toHaveLength(1);
    const id = r.custom[0].id;
    r = await call(0, r.code, { type: "deleteCustom", id });
    expect(r.custom).toHaveLength(0);
    await call(0, r.code, { type: "start" });
    await expect(
      call(0, r.code, { type: "custom", text: "Outra coisa.", pick: 0 }),
    ).rejects.toThrow();
  });
  it("transfere anfitrião e juiz desconectados preservando o assento", async () => {
    let r = await start();
    await db.exec("reset role");
    await db.query(
      "update private.rooms set state=jsonb_set(state,'{players,0,seen}','0') where code=$1",
      [r.code],
    );
    r = await call(1, r.code, { type: "ping" });
    expect(r.host).toBe(ids[1]);
    expect(r.judge).toBe(ids[1]);
    expect(r.round).toBe(2);
    const reconnected = await call(0, r.code, { type: "join" });
    expect(reconnected.players[0].hand).toHaveLength(10);
    expect(reconnected.players).toHaveLength(3);
  });
  it("remove ausente só depois do limite e volta ao lobby com duas pessoas", async () => {
    let r = await start();
    await expect(call(0, r.code, { type: "kick", id: ids[1] })).rejects.toThrow(
      "90 segundos",
    );
    await db.exec("reset role");
    await db.query(
      "update private.rooms set state=jsonb_set(state,'{players,1,seen}','0') where code=$1",
      [r.code],
    );
    r = await call(0, r.code, { type: "kick", id: ids[1] });
    expect(r.phase).toBe("lobby");
    expect(r.players).toHaveLength(2);
  });
  it("reação é predefinida e tem cooldown", async () => {
    let r = await answer(await start());
    r = await call(1, r.code, { type: "reaction", text: "💀" });
    expect(r.reactions).toHaveLength(1);
    await expect(
      call(1, r.code, { type: "reaction", text: "💀" }),
    ).rejects.toThrow("Respira");
    await expect(
      call(2, r.code, { type: "reaction", text: "<script>" }),
    ).rejects.toThrow();
  });
  it("termina partida de verdade aos cinco pontos", async () => {
    let r = await start();
    for (let round = 0; round < 20 && r.phase !== "finished"; round++) {
      for (let i = 0; i < 3; i++)
        if (ids[i] !== r.judge) {
          const v = await call(i, r.code, { type: "sync" });
          await call(i, r.code, {
            type: "submit",
            cards: v.players[i].hand.slice(0, r.prompt!.pick).map((c) => c.id),
          });
        }
      const judge = ids.indexOf(r.judge);
      r = await call(judge, r.code, { type: "reveal" });
      const b = await call(1, r.code, { type: "sync" });
      const desired =
        r.submissions.find((s) =>
          b.players[1].hand.some((c) => c.id === s.cards[0].id),
        ) ?? r.submissions[0];
      r = await call(judge, r.code, { type: "choose", id: desired.id });
      if (r.phase !== "finished") r = await call(0, r.code, { type: "next" });
    }
    expect(r.phase).toBe("finished");
    expect(Math.max(...r.players.map((p) => p.score))).toBe(5);
    await expect(call(0, r.code, { type: "next" })).rejects.toThrow();
  }, 15000);
  it("edita e ativa cartas próprias com permissão e fase validadas", async () => {
    let r = await lobby();
    r = await call(0, r.code, {
      type: "custom",
      text: "Uma descarga com Wi-Fi.",
      pick: 0,
    });
    const id = r.custom[0].id;
    await expect(
      call(1, r.code, {
        type: "editCustom",
        id,
        text: "Uma privada com Bluetooth.",
        pick: 0,
      }),
    ).rejects.toThrow("anfitrião");
    r = await call(0, r.code, {
      type: "editCustom",
      id,
      text: "Uma privada com Bluetooth.",
      pick: 0,
    });
    expect(r.custom[0].text).toBe("Uma privada com Bluetooth.");
    r = await call(0, r.code, { type: "toggleCustom", id });
    expect(r.custom[0].active).toBe(false);
    await expect(call(0, r.code, { type: "deleteCustom" })).rejects.toThrow(
      "inexistente",
    );
    expect((await call(0, r.code, { type: "sync" })).custom).toHaveLength(1);
    await call(0, r.code, { type: "start" });
    await expect(
      call(0, r.code, {
        type: "editCustom",
        id,
        text: "Outra carta.",
        pick: 0,
      }),
    ).rejects.toThrow("lobby");
    await db.exec("reset role");
    const state = (
      await db.query<{ state: { players: View["players"] } }>(
        "select state from private.rooms where code=$1",
        [r.code],
      )
    ).rows[0].state;
    expect(state.players.flatMap((p) => p.hand).some((c) => c.id === id)).toBe(
      false,
    );
  });
  it("conta tentativas inválidas no rate limit e não altera a sala", async () => {
    const r = await lobby();
    for (let n = 0; n < 99; n++)
      await expect(
        call(3, r.code, { type: "choose", id: "inventado" }),
      ).rejects.toThrow("participa");
    await expect(call(3, r.code, { type: "ping" })).rejects.toThrow(
      "participa",
    );
    await expect(call(3, r.code, { type: "ping" })).rejects.toThrow(
      "Muitas ações",
    );
    expect((await call(0, r.code, { type: "sync" })).phase).toBe("lobby");
  });
  it("recusa execução interna direta e acesso sem Auth", async () => {
    const r = await start();
    await as(1);
    await expect(
      db.query('select private.apply_game($1,\'{"type":"start"}\'::jsonb)', [
        r.code,
      ]),
    ).rejects.toThrow("permission denied");
    await db.exec("reset role; set role anon");
    await expect(
      db.query('select public.game($1,\'{"type":"sync"}\'::jsonb)', [r.code]),
    ).rejects.toThrow("permission denied");
  });
  it("aceita até 12 pessoas e distribui 120 IDs únicos", async () => {
    const r = await lobby();
    for (let i = 3; i < 12; i++)
      await call(i, r.code, { type: "join", name: "Pessoa " + i, emoji: "💀" });
    await expect(
      call(12, r.code, { type: "join", name: "Pessoa extra", emoji: "💀" }),
    ).rejects.toThrow("lotada");
    await call(0, r.code, { type: "start" });
    await db.exec("reset role");
    const hands = (
      await db.query<{ id: string }>(
        "select h->>'id' id from private.rooms r,jsonb_array_elements(r.state->'players') p,jsonb_array_elements(p->'hand') h where r.code=$1",
        [r.code],
      )
    ).rows;
    expect(hands).toHaveLength(120);
    expect(new Set(hands.map((h) => h.id)).size).toBe(120);
  });
  it("falha de distribuição desfaz a partida inteira", async () => {
    const r = await lobby();
    for (let i = 3; i < 6; i++)
      await call(i, r.code, { type: "join", name: "Pessoa " + i, emoji: "💀" });
    await call(0, r.code, {
      type: "config",
      packs: ["quinta"],
      target: 5,
      mode: "classic",
    });
    await expect(call(0, r.code, { type: "start" })).rejects.toThrow(
      "mais baralhos",
    );
    const unchanged = await call(0, r.code, { type: "sync" });
    expect(unchanged.phase).toBe("lobby");
    expect(unchanged.players[0].hand).toHaveLength(0);
  });
});
