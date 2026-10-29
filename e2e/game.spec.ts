import { test, expect } from "@playwright/test";
import type { Room } from "../src/lib/types";
const saved = (page: import("@playwright/test").Page) =>
  page.evaluate(
    () => JSON.parse(localStorage.getItem("deu-merda:local:v1")!) as Room,
  );
test("navegação, layouts e configuração online explícita", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: /A amizade acaba/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("inicio.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: /Criar uma sala/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Online aguardando configuração.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Criar sala online" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: /Explorar cartas/ }).click();
  await expect(page.getByRole("heading", { name: /360 cartas/ })).toBeVisible();
  await page.getByRole("button", { name: /Como jogar/ }).click();
  await expect(
    page.getByRole("heading", { name: /Amizades fortes/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("partida local completa, mãos por assento e sessão recuperável", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await page.getByRole("button", { name: /Só dando uma olhada/ }).click();
  await expect(
    page.getByText("DEMONSTRAÇÃO LOCAL", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Pessoa 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Desativar o bom senso/ }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  for (let round = 0; round < 15; round++) {
    const r = await saved(page);
    if (r.phase === "finished") break;
    expect(r.phase).toBe("answering");
    for (const p of r.players.filter((p) => p.id !== r.judge)) {
      await page
        .getByRole("combobox", { name: "Trocar jogador local" })
        .selectOption(p.id);
      await expect(page.locator(".hand .answer-card")).toHaveCount(10);
      for (let i = 0; i < r.prompt!.pick; i++)
        await page.locator(".hand .answer-card").nth(i).click();
      await page.getByRole("button", { name: /Enviar \d/ }).click();
      await page
        .getByRole("button", { name: "Confirmar", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Sua resposta está no anonimato." }),
      ).toBeVisible();
    }
    await page
      .getByRole("combobox", { name: "Trocar jogador local" })
      .selectOption(r.judge);
    await page.getByRole("button", { name: "Abrir as atrocidades" }).click();
    const reveal = await saved(page);
    const desired = reveal.submissions.findIndex((s) => s.player === "local-2");
    if (desired >= 0)
      await page
        .getByRole("button", {
          name: `Ver resposta ${desired + 1}`,
          exact: true,
        })
        .click();
    await expect(page.locator(".revealed-cards .answer-card")).toHaveCount(
      r.prompt!.pick,
    );
    await page
      .getByRole("button", { name: "Essa ganhou. Infelizmente." })
      .click();
    await page.getByRole("button", { name: "Confirmar", exact: true }).click();
    const result = await saved(page);
    if (result.phase === "finished") break;
    await page
      .getByRole("combobox", { name: "Trocar jogador local" })
      .selectOption("local-1");
    await page.getByRole("button", { name: "Próxima rodada" }).click();
  }
  expect((await saved(page)).phase).toBe("finished");
  await expect(page.getByText("CAMPEÃO DA FALTA DE NOÇÃO")).toBeVisible();
  await page.screenshot({ path: info.outputPath("final.png"), fullPage: true });
  await page.reload();
  await page
    .getByRole("button", { name: /Continuar demonstração salva/ })
    .click();
  await expect(page.getByText("CAMPEÃO DA FALTA DE NOÇÃO")).toBeVisible();
  expect(errors).toEqual([]);
});

test("cartas privadas da sala: criar, editar, ativar e excluir", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: /Só dando uma olhada/ }).click();
  await page.getByLabel("Texto da carta").fill("Uma descarga com Wi-Fi.");
  await page.getByRole("button", { name: "Adicionar carta" }).click();
  await expect(page.locator(".custom-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Editar carta", exact: true }).click();
  await page.getByLabel("Texto da carta").fill("Uma privada com Bluetooth.");
  await page.getByRole("button", { name: "Salvar carta" }).click();
  await expect(page.locator(".custom-row")).toContainText(
    "Uma privada com Bluetooth.",
  );
  await page
    .getByRole("button", { name: "Desativar carta", exact: true })
    .click();
  await expect(page.locator(".custom-row")).toContainText("inativa");
  await page.getByRole("button", { name: "Ativar carta", exact: true }).click();
  await expect(page.locator(".custom-row")).not.toContainText("inativa");
  await page
    .getByRole("button", { name: "Excluir carta", exact: true })
    .click();
  await expect(page.locator(".custom-row")).toHaveCount(0);
});

test("anfitrião escolhe tabus e filtra temas antes da partida", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: /Só dando uma olhada/ }).click();
  const acid = page.getByRole("button", { name: /Humor Ácido e Tabus/ });
  await expect(acid).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText(/18\+: morte, humor negro/)).toBeVisible();
  await acid.click();
  await expect(acid).toHaveAttribute("aria-pressed", "true");
  await page
    .getByText("Temas incluídos · ajustar no lobby", { exact: true })
    .click();
  const medical = page.getByRole("button", {
    name: "Constrangimentos médicos",
    exact: true,
  });
  await medical.click();
  await expect(medical).toHaveAttribute("aria-pressed", "false");
  expect((await saved(page)).excludedThemes).toContain("medicina");
  await acid.click();
  await expect(acid).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: /Desativar o bom senso/ }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  const room = await saved(page);
  expect(room.packs).not.toContain("acido");
  const cards = [
    ...room.players.flatMap((p) => p.hand),
    ...room.questions,
    ...room.deck,
    room.prompt!,
  ];
  expect(cards.every((c) => c.pack !== "acido" && c.theme !== "medicina")).toBe(
    true,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
