import type { Access } from "payload";

/**
 * Quem pode ler o quê.
 *
 * ## Porque isto passou a ser preciso
 *
 * Até aqui nenhuma coleção declarava `access`, e valia o comportamento por
 * omissão do Payload: **qualquer utilizador autenticado lê tudo**. Com um só
 * consumidor — o site institucional — isso não tinha consequência visível.
 *
 * Com dois passa a ter, e a pior delas não é o conteúdo. É a coleção `users`:
 * é lá que vivem as chaves de API. Uma chave nova, criada sem restrição, podia
 * ler a chave do site — e revogar uma deixaria de ser possível sem cortar a
 * outra, que é precisamente a razão pela qual se criam chaves separadas.
 *
 * ## Como se distingue um consumidor de outro
 *
 * Pelo campo `consumer` do utilizador a que a chave pertence, e não por
 * adivinhar a estratégia de autenticação. Depender de `_strategy` ou de
 * `_apiKey` seria depender de detalhes internos do Payload que mudam entre
 * versões sem aviso.
 *
 * ## Porque «sem valor» é tratado como pessoa do painel
 *
 * Os utilizadores que já existem não têm este campo. Tratá-los como acesso
 * total mantém o site institucional a funcionar exactamente como funcionava —
 * esta alteração não pode partir nada que já lá esteja. Quem é máquina tem de
 * ser marcado como tal, de propósito.
 */

export type Consumidor = "painel" | "site" | "app";

/** O consumidor de quem faz o pedido. Sem sessão, `null`. */
function consumidorDe(req: { user?: unknown }): Consumidor | null {
    const u = req.user as { consumer?: Consumidor } | undefined | null;
    if (!u) return null;
    // Sem valor significa pessoa do painel: é o que os utilizadores antigos são.
    return u.consumer ?? "painel";
}

/** Só pessoas com acesso ao painel. Nenhuma chave de máquina passa aqui. */
export const apenasPainel: Access = ({ req }) => consumidorDe(req) === "painel";

/** Qualquer sessão autenticada — painel ou qualquer uma das chaves. */
export const qualquerConsumidor: Access = ({ req }) => consumidorDe(req) !== null;

/** Conteúdo partilhado: o painel edita, os dois sítios leem. */
export const leemOsDois: Access = ({ req }) => {
    const c = consumidorDe(req);
    return c === "painel" || c === "site" || c === "app";
};

/** Conteúdo que só interessa ao site institucional. */
export const apenasSite: Access = ({ req }) => {
    const c = consumidorDe(req);
    return c === "painel" || c === "site";
};

/** Conteúdo que só interessa à aplicação de reservas. */
export const apenasApp: Access = ({ req }) => {
    const c = consumidorDe(req);
    return c === "painel" || c === "app";
};

/**
 * Nada é escrito por uma chave de máquina.
 *
 * Os dois consumidores são de leitura. Se algum dia um deles precisar de
 * escrever — um formulário de contacto, por exemplo — isso é uma decisão a
 * tomar e a escrever aqui, não algo que se herde por omissão.
 */
export const ninguemEscrevePorAPI: Access = ({ req }) => consumidorDe(req) === "painel";
