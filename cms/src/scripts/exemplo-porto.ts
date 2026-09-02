import { convertMarkdownToLexical, editorConfigFactory } from "@payloadcms/richtext-lexical";
import { getPayload } from "payload";

import config from "../../payload.config";

/**
 * Cria o destino «Porto» como exemplo completo.
 *
 * Corre-se uma vez: `npm run exemplo:porto`.
 *
 * ## Sobre o conteúdo
 *
 * Não é texto de encher. As afirmações sobre o serviço vêm dos termos reais em
 * `src/dictionaries/pt.json` — a hora de espera gratuita nos transfers de
 * aeroporto, o meet & greet com placa, o porta a porta, os meios de pagamento,
 * as 24 horas para cancelar sem custo. Os dados geográficos são verificáveis.
 *
 * Serve para duas coisas: dar um ponto de partida para os destinos seguintes, e
 * mostrar o nível de detalhe que uma página destas precisa. Vinte páginas de
 * cidade com o mesmo texto e o nome trocado não funcionam — o Google trata isso
 * como páginas-porta.
 *
 * ## Um campo fica vazio de propósito
 *
 * O `priceFrom`. Inventar um preço numa página que um cliente vai ler seria pior
 * do que não ter preço nenhum. Fica para quem souber o valor real desta rota.
 */

const PORTO = {
    pt: {
        title: "Transfer do Aeroporto do Porto para a cidade",
        city: "Porto",
        subtitle:
            "Do terminal à porta do seu alojamento, com motorista à espera e preço fechado antes de partir.",
        summary:
            "Ligação directa entre o Aeroporto Francisco Sá Carneiro e qualquer ponto do Porto. Cerca de 15 quilómetros, 25 minutos, com uma hora de espera incluída e acompanhamento do voo.",
        origin: "Aeroporto Francisco Sá Carneiro (OPO), Maia",
        body: `## Do terminal ao centro

O Aeroporto Francisco Sá Carneiro fica em Pedras Rubras, no concelho da Maia, a cerca de 15 quilómetros da Baixa do Porto. Pela A28 e pela VCI, a viagem demora tipicamente 25 minutos.

Às horas de ponta — entre as 8h00 e as 9h30, e das 17h30 às 19h00 — a VCI congestiona, e o mesmo percurso pode levar 40 a 45 minutos. Se tem hora marcada, conte com essa margem.

## Onde o motorista o espera

No átrio de chegadas, depois da alfândega, com uma placa com o seu nome. Acompanhamos o número do voo que indicar na reserva, por isso um atraso não o obriga a fazer nada: a recolha ajusta-se sozinha.

Nos transfers de aeroporto está incluída **uma hora de espera gratuita** a partir da hora programada. É tempo mais do que suficiente para o controlo de fronteira e para a bagagem, mesmo num dia mau.

## O que está incluído

Todos os veículos têm Wi-Fi, água e carregadores USB. O serviço é porta a porta: do ponto exacto de recolha até à morada indicada, sem paragens intermédias nem transbordos.

Cadeiras de criança podem ser pedidas na reserva.

## Quando o transfer compensa

A linha E do metro liga o aeroporto à Trindade em cerca de meia hora, e é uma boa opção para quem viaja leve. Um transfer privado faz mais sentido quando:

- chega de madrugada ou ao fim da noite, fora do horário do metro;
- viaja com crianças pequenas ou com bagagem volumosa;
- fica fora do centro — na Foz, em Gaia ou em Matosinhos;
- viaja em grupo, onde o custo por pessoa se aproxima do bilhete de metro;
- chega para trabalhar e precisa de hora certa.

## Pagamento e cancelamento

Aceitamos numerário, cartões de débito e crédito, MB Way e transferência bancária antecipada. O preço fecha-se na reserva e não muda com o trânsito nem com o tempo de espera.

Cancelamentos feitos com mais de 24 horas de antecedência não têm custo.`,
        highlights: [
            "Uma hora de espera gratuita nos transfers de aeroporto",
            "Motorista no átrio de chegadas, com placa com o seu nome",
            "Acompanhamos o voo — um atraso ajusta a recolha automaticamente",
            "Wi-Fi, água e carregadores USB em todos os veículos",
            "Preço fechado na reserva, sem acréscimos por trânsito",
        ],
        faq: [
            {
                question: "Quanto tempo demora do aeroporto ao centro do Porto?",
                answer:
                    "Cerca de 25 minutos pela A28 e VCI, em condições normais. Às horas de ponta, entre as 8h00 e as 9h30 e das 17h30 às 19h00, conte com 40 a 45 minutos.",
            },
            {
                question: "E se o meu voo atrasar?",
                answer:
                    "Não precisa de fazer nada. Acompanhamos o número do voo indicado na reserva e a recolha ajusta-se à hora real de chegada. Nos transfers de aeroporto está incluída uma hora de espera gratuita a partir da hora programada.",
            },
            {
                question: "Levam-me a Gaia, à Foz ou a Matosinhos?",
                answer:
                    "Sim. O serviço é porta a porta em toda a Área Metropolitana do Porto. Indique a morada exacta na reserva e o preço é calculado para esse destino.",
            },
            {
                question: "Onde encontro o motorista à chegada?",
                answer:
                    "No átrio de chegadas, depois da alfândega, com uma placa com o seu nome. O aeroporto tem um terminal único, por isso não há hipótese de troca.",
            },
            {
                question: "Posso pedir cadeira de criança?",
                answer:
                    "Sim, indique-o na reserva, com a idade da criança, para escolhermos o modelo adequado.",
            },
        ],
        seo: {
            title: "Transfer Aeroporto do Porto | Way2Go",
            description:
                "Transfer privado do Aeroporto Francisco Sá Carneiro para o Porto. Motorista à espera, uma hora de espera incluída e preço fechado na reserva.",
        },
    },
    en: {
        title: "Porto Airport Transfer to the City",
        city: "Porto",
        subtitle:
            "From the terminal to your door, with a driver waiting and the price fixed before you travel.",
        summary:
            "Direct transfer between Francisco Sá Carneiro Airport and anywhere in Porto. Around 15 kilometres, 25 minutes, with one hour of waiting time included and flight tracking.",
        origin: "Francisco Sá Carneiro Airport (OPO), Maia",
        body: `## From the terminal to the centre

Francisco Sá Carneiro Airport sits in Pedras Rubras, in the municipality of Maia, about 15 kilometres from downtown Porto. Via the A28 and the VCI ring road, the drive usually takes 25 minutes.

At peak times — between 8:00 and 9:30 in the morning, and 17:30 to 19:00 — the VCI backs up, and the same route can take 40 to 45 minutes. If you have somewhere to be, allow for that.

## Where your driver will be

In the arrivals hall, past customs, holding a sign with your name. We track the flight number you give us when booking, so a delay asks nothing of you: the pickup shifts on its own.

Airport transfers include **one hour of free waiting time** from the scheduled pickup. That is comfortably more than border control and baggage need, even on a bad day.

## What is included

Every vehicle has Wi-Fi, water and USB chargers. The service is door to door: from the exact pickup point to the address you give, with no intermediate stops or changes.

Child seats can be requested when booking.

## When a transfer is worth it

Metro line E links the airport to Trindade in about half an hour, and it is a good option if you travel light. A private transfer makes more sense when you:

- land late at night or before the metro runs;
- travel with small children or bulky luggage;
- are staying outside the centre — in Foz, Gaia or Matosinhos;
- travel as a group, where the cost per person approaches a metro ticket;
- are arriving for work and need a fixed time.

## Payment and cancellation

We accept cash, debit and credit cards, MB Way and advance bank transfer. The price is fixed at booking and does not change with traffic or waiting time.

Cancellations made more than 24 hours ahead are free of charge.`,
        highlights: [
            "One hour of free waiting time on airport transfers",
            "Driver in the arrivals hall, holding a sign with your name",
            "We track your flight — a delay shifts the pickup automatically",
            "Wi-Fi, water and USB chargers in every vehicle",
            "Price fixed at booking, with no traffic surcharges",
        ],
        faq: [
            {
                question: "How long does it take from the airport to central Porto?",
                answer:
                    "About 25 minutes via the A28 and VCI in normal conditions. At peak times, between 8:00 and 9:30 and from 17:30 to 19:00, allow 40 to 45 minutes.",
            },
            {
                question: "What if my flight is delayed?",
                answer:
                    "You need do nothing. We track the flight number given at booking and the pickup adjusts to your actual arrival. Airport transfers include one hour of free waiting from the scheduled time.",
            },
            {
                question: "Will you take me to Gaia, Foz or Matosinhos?",
                answer:
                    "Yes. The service is door to door across the whole Porto metropolitan area. Give the exact address when booking and the price is calculated for that destination.",
            },
            {
                question: "Where do I find the driver on arrival?",
                answer:
                    "In the arrivals hall, past customs, holding a sign with your name. The airport has a single terminal, so there is no chance of a mix-up.",
            },
            {
                question: "Can I request a child seat?",
                answer:
                    "Yes — say so when booking, with the child's age, so we bring the right model.",
            },
        ],
        seo: {
            title: "Porto Airport Transfer | Way2Go",
            description:
                "Private transfer from Francisco Sá Carneiro Airport to Porto. Driver waiting, one hour of waiting time included and a price fixed at booking.",
        },
    },
} as const;

const payload = await getPayload({ config });
const editorConfig = await editorConfigFactory.default({ config: payload.config });

const corpo = (markdown: string) => convertMarkdownToLexical({ editorConfig, markdown });

const existente = await payload.find({
    collection: "destinations",
    where: { slug: { equals: "porto" } },
    limit: 1,
});

if (existente.docs.length > 0) {
    console.error('Já existe um destino com o slug "porto". Nada foi escrito.');
    process.exit(1);
}

const criado = await payload.create({
    collection: "destinations",
    locale: "pt",
    data: {
        slug: "porto",
        _status: "published",
        title: PORTO.pt.title,
        city: PORTO.pt.city,
        subtitle: PORTO.pt.subtitle,
        summary: PORTO.pt.summary,
        body: corpo(PORTO.pt.body),
        highlights: PORTO.pt.highlights.map((text) => ({ text })),
        route: {
            origin: PORTO.pt.origin,
            distanceKm: 15,
            durationMin: 25,
            // priceFrom fica vazio de propósito — ver a nota no topo.
        },
        faq: [...PORTO.pt.faq],
        seo: { ...PORTO.pt.seo },
    },
});
console.log(`criado em português (id ${criado.id})`);

await payload.update({
    collection: "destinations",
    id: criado.id,
    locale: "en",
    data: {
        _status: "published",
        title: PORTO.en.title,
        city: PORTO.en.city,
        subtitle: PORTO.en.subtitle,
        summary: PORTO.en.summary,
        body: corpo(PORTO.en.body),
        highlights: PORTO.en.highlights.map((text) => ({ text })),
        route: { origin: PORTO.en.origin },
        faq: [...PORTO.en.faq],
        seo: { ...PORTO.en.seo },
    },
});
console.log("traduzido para inglês");

console.log("\nDestino «Porto» criado e publicado nos dois idiomas.");
process.exit(0);
