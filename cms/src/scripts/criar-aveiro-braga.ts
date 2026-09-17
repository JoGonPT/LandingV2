import { convertMarkdownToLexical, editorConfigFactory } from "@payloadcms/richtext-lexical";
import path from "path";
import { getPayload } from "payload";

import config from "../../payload.config";

/**
 * Cria os destinos «Aveiro» e «Braga», com imagem, nos cinco idiomas.
 *
 * Corre-se uma vez: `npm run criar:aveiro-braga`.
 *
 * ## As imagens
 *
 * Vêm do Wikimedia Commons e são as duas **CC0 — dedicação ao domínio público**. Foi um
 * critério, não um acaso: há fotografias melhores sob CC BY-SA, mas o Payload gera versões
 * redimensionadas em WebP, que são obras derivadas, e o *ShareAlike* obrigaria a publicá-las
 * sob a mesma licença. Num sítio comercial isso é uma complicação que não vale a pena
 * comprar por uma fotografia.
 *
 * O crédito fica gravado na mesma. O CC0 dispensa-o; a boa educação não.
 *
 * ## Os números vieram da rota, não do mapa de cabeça
 *
 * As distâncias e as durações foram medidas contra a produção, com o mesmo motor que dá o
 * preço: Aveiro 87,7 km / 66 min, Braga 60,9 km / 45 min. O texto diz «cerca de», que é o
 * que uma página editorial deve dizer, mas o número de que se aproxima é verdadeiro.
 *
 * Lembrar: o `distanceKm` NÃO alimenta o preço. Quem o faz são a origem e a cidade — a
 * aplicação mede a estrada entre as duas.
 *
 * ## Sobre o comboio
 *
 * Os dois textos respondem à pergunta, e respondem com honestidade. Para Aveiro o comboio
 * é mesmo bom, e diz-se. Uma página que finge que a alternativa não presta perde a
 * confiança de quem já a conhece — e quem chega ao Porto de avião costuma ter feito o
 * trabalho de casa.
 */

const AEROPORTO_PT = "Aeroporto Francisco Sá Carneiro (OPO), Maia";
const AEROPORTO_EN = "Francisco Sá Carneiro Airport (OPO), Maia";

type Idioma = "pt" | "en" | "fr" | "es" | "de";

interface Texto {
    title: string;
    city: string;
    subtitle: string;
    summary: string;
    origin: string;
    airportName: string;
    highlights: string[];
    faq: Array<{ question: string; answer: string }>;
    seo: { title: string; description: string };
    corpo: string;
    botao: { buttonText: string; subtext: string };
}

// ---------------------------------------------------------------------------------------
// AVEIRO — 87,7 km, 66 min
// ---------------------------------------------------------------------------------------

const AVEIRO: Record<Idioma, Texto> = {
    pt: {
        title: "Transfer do Aeroporto do Porto para Aveiro",
        city: "Aveiro",
        subtitle:
            "Do terminal aos canais em pouco mais de uma hora, sem transbordos e com preço fechado antes de partir.",
        summary:
            "Ligação directa entre o Aeroporto Francisco Sá Carneiro e Aveiro. Cerca de 88 quilómetros pela A28, A29 e A25, com uma hora de espera incluída e acompanhamento do voo.",
        origin: AEROPORTO_PT,
        airportName: "Aeroporto Francisco Sá Carneiro",
        highlights: [
            "Cerca de 65 minutos, directo e sem transbordos",
            "Uma hora de espera gratuita nos transfers de aeroporto",
            "Motorista no átrio de chegadas, com placa com o seu nome",
            "Também levamos à Costa Nova e à Barra, do outro lado da ria",
            "Preço fechado na reserva, sem acréscimos por trânsito",
        ],
        faq: [
            {
                question: "Quanto tempo demora do aeroporto a Aveiro?",
                answer: "Cerca de 65 minutos pela A28, A29 e A25, em condições normais. É quase tudo auto-estrada, sem os congestionamentos que afectam quem entra no Porto.",
            },
            {
                question: "Compensa face ao comboio?",
                answer: "Depende de como viaja, e vale a pena ser directo: o comboio para Aveiro é bom. Um Intercidades faz Campanhã–Aveiro em cerca de 40 minutos. O problema não é o comboio, é o que vem antes — do aeroporto tem de apanhar o metro até Campanhã, esperar pelo comboio, e depois sair da estação de Aveiro até ao alojamento. Com bagagem, o total passa das duas horas e meia. O transfer faz o percurso de uma vez, à hora que escolher.",
            },
            {
                question: "Levam-me à Costa Nova ou à Praia da Barra?",
                answer: "Sim. Ficam a 10 a 15 minutos do centro de Aveiro, do outro lado da ria. Indique a morada exacta na reserva e o preço é calculado para esse destino.",
            },
            {
                question: "E se o meu voo atrasar?",
                answer: "Não precisa de fazer nada. Acompanhamos o número do voo indicado na reserva e a recolha ajusta-se à hora real de chegada. Está incluída uma hora de espera gratuita a partir da hora programada.",
            },
            {
                question: "Fazem também o percurso de Aveiro para o aeroporto?",
                answer: "Sim, nas duas direcções. Para voos de manhã cedo recomendamos sair com margem: a A29 junto a Espinho e a entrada no Porto acumulam trânsito a partir das sete e meia.",
            },
        ],
        seo: {
            title: "Transfer Aeroporto do Porto para Aveiro | Way2Go",
            description:
                "Transfer privado do Aeroporto Francisco Sá Carneiro para Aveiro. Cerca de 65 minutos directos, uma hora de espera incluída e preço fechado na reserva.",
        },
        corpo: `## Do aeroporto à ria

Aveiro fica a cerca de 88 quilómetros do Aeroporto Francisco Sá Carneiro. Pela A28, com ligação à A29 e depois à A25, a viagem faz-se tipicamente em 65 minutos.

É um percurso de auto-estrada quase todo, e tem a vantagem de não passar pelo Porto: contorna-se a cidade pelo litoral, sem apanhar a VCI. Mesmo às horas de ponta, o tempo varia pouco.

## Onde o motorista o espera

No átrio de chegadas, depois da alfândega, com uma placa com o seu nome. Acompanhamos o número do voo que indicar na reserva, por isso um atraso não o obriga a fazer nada: a recolha ajusta-se sozinha.

Nos transfers de aeroporto está incluída uma hora de espera gratuita a partir da hora programada.

## O centro faz-se a pé, e isso conta

Aveiro é plana e pequena. Deixado o carro à porta do alojamento, é provável que não precise de mais transportes durante a estadia: os canais, o mercado, a estação e a zona de restaurantes estão todos a dez minutos a pé uns dos outros.

Vale a pena saber ao contrário também: se ficar na Costa Nova ou na Barra, do outro lado da ria, já não é assim. São 10 a 15 minutos de carro, e a ponte só tem um atravessamento.

## O que há para ver

Os canais são o que traz toda a gente, e os moliceiros — os barcos pintados, de proa levantada — deixaram de transportar algas para transportar visitantes. O passeio dura cerca de 45 minutos.

Em poucos minutos a pé:

- o Canal Central e as fachadas de arte nova que o acompanham;
- o Museu de Aveiro, no antigo Convento de Jesus, com o túmulo de Santa Joana;
- a Estação Velha, revestida a azulejo, que é um monumento por direito próprio;
- a Costa Nova, a 15 minutos de carro, com os palheiros às riscas.

E os ovos moles, que têm Indicação Geográfica Protegida desde 2006 — não é folclore, é um selo europeu.

## Compensa face ao comboio?

Aqui a resposta honesta é «às vezes», e não vale a pena fingir o contrário.

O comboio para Aveiro é bom. Um Intercidades faz Campanhã–Aveiro em cerca de 40 minutos, e sai várias vezes por dia. Se viaja leve e não tem hora marcada, é uma opção legítima.

O que o transfer resolve é o resto do percurso. Do aeroporto até Campanhã são cerca de 35 minutos de metro, mais a espera pelo comboio, mais a saída da estação de Aveiro até ao alojamento. Com bagagem, o total passa facilmente das duas horas e meia — e nenhum desses passos se faz com malas grandes sem esforço.

Para quem chega com família, com bagagem, fora de horas ou com hora marcada, a conta muda de sentido.

## Preço e cancelamento

O preço fecha-se na reserva e não muda com o trânsito nem com o tempo de espera.

Cancelamentos feitos com mais de 24 horas de antecedência não têm custo.`,
        botao: {
            buttonText: "Reservar transfer para Aveiro",
            subtext: "Confirmação imediata · Cancelamento gratuito até 24 horas",
        },
    },

    en: {
        title: "Porto Airport Transfer to Aveiro",
        city: "Aveiro",
        subtitle:
            "From the terminal to the canals in a little over an hour, with no changes and the price fixed before you travel.",
        summary:
            "Direct transfer between Francisco Sá Carneiro Airport and Aveiro. Around 88 kilometres via the A28, A29 and A25, with one hour of waiting time included and flight tracking.",
        origin: AEROPORTO_EN,
        airportName: "Francisco Sá Carneiro Airport",
        highlights: [
            "About 65 minutes, direct and with no changes",
            "One hour of free waiting time on airport transfers",
            "Driver in the arrivals hall, holding a sign with your name",
            "We also serve Costa Nova and Barra, across the lagoon",
            "Price fixed at booking, with no traffic surcharges",
        ],
        faq: [
            {
                question: "How long does it take from the airport to Aveiro?",
                answer: "About 65 minutes via the A28, A29 and A25 in normal conditions. It is motorway almost the whole way, avoiding the congestion that affects journeys into Porto itself.",
            },
            {
                question: "Is it worth it compared to the train?",
                answer: "It depends on how you travel, and it is worth being straight about it: the train to Aveiro is good. An Intercidades covers Campanhã–Aveiro in about 40 minutes. The train is not the problem — everything around it is. From the airport you first take the metro to Campanhã, wait for the train, then get from Aveiro station to your accommodation. With luggage, the total easily passes two and a half hours. The transfer does it in one go, at a time you choose.",
            },
            {
                question: "Will you take me to Costa Nova or Praia da Barra?",
                answer: "Yes. They are 10 to 15 minutes from central Aveiro, across the lagoon. Give the exact address when booking and the price is calculated for that destination.",
            },
            {
                question: "What if my flight is delayed?",
                answer: "You need do nothing. We track the flight number given at booking and the pickup adjusts to your actual arrival. One hour of free waiting is included from the scheduled time.",
            },
            {
                question: "Do you also drive from Aveiro to the airport?",
                answer: "Yes, in both directions. For early morning flights we suggest leaving with margin: the A29 near Espinho and the approach to Porto build up from about half past seven.",
            },
        ],
        seo: {
            title: "Porto Airport Transfer to Aveiro | Way2Go",
            description:
                "Private transfer from Francisco Sá Carneiro Airport to Aveiro. About 65 minutes direct, one hour of waiting included and the price fixed at booking.",
        },
        corpo: `## From the airport to the lagoon

Aveiro sits about 88 kilometres from Francisco Sá Carneiro Airport. Via the A28, joining the A29 and then the A25, the drive usually takes 65 minutes.

It is motorway almost the whole way, and it has the advantage of skirting Porto entirely: the route runs down the coast without touching the VCI ring road. Even at peak times, the journey varies little.

## Where your driver will be

In the arrivals hall, past customs, holding a sign with your name. We track the flight number you give us when booking, so a delay asks nothing of you: the pickup shifts on its own.

Airport transfers include one hour of free waiting time from the scheduled pickup.

## The centre is walkable, and that matters

Aveiro is flat and small. Once you are dropped at your door, you may well need no further transport during your stay: the canals, the market, the station and the restaurant quarter are all within ten minutes of each other on foot.

It is worth knowing the other way round too. If you are staying at Costa Nova or Barra, across the lagoon, that no longer holds — it is a 10 to 15 minute drive, and there is only one crossing.

## What there is to see

The canals are what brings everyone, and the moliceiros — the painted boats with their raised prows — stopped carrying seaweed and started carrying visitors. The trip lasts about 45 minutes.

All within a few minutes on foot:

- the Central Canal and the Art Nouveau facades along it;
- the Museum of Aveiro, in the former Convent of Jesus, with the tomb of Saint Joan;
- the old railway station, tiled from top to bottom, a monument in its own right;
- Costa Nova, a 15 minute drive away, with its striped fishermen's houses.

And the ovos moles, which have held a Protected Geographical Indication since 2006 — not folklore, a European mark.

## Is it worth it against the train?

Here the honest answer is "sometimes", and there is no point pretending otherwise.

The train to Aveiro is good. An Intercidades covers Campanhã–Aveiro in about 40 minutes, several times a day. If you travel light and have nowhere to be, it is a legitimate choice.

What the transfer solves is everything around it. From the airport to Campanhã is about 35 minutes by metro, plus the wait for the train, plus getting from Aveiro station to your accommodation. With luggage the total easily passes two and a half hours — and none of those steps is effortless with large cases.

For anyone arriving with family, with luggage, outside normal hours or to a fixed appointment, the arithmetic reverses.

## Price and cancellation

The price is fixed at booking and does not change with traffic or waiting time.

Cancellations made more than 24 hours ahead are free of charge.`,
        botao: {
            buttonText: "Book your Aveiro transfer",
            subtext: "Instant confirmation · Free cancellation up to 24 hours",
        },
    },

    fr: {
        title: "Transfert de l'aéroport de Porto vers Aveiro",
        city: "Aveiro",
        subtitle:
            "Du terminal aux canaux en un peu plus d'une heure, sans correspondance et avec un prix fixé avant le départ.",
        summary:
            "Liaison directe entre l'aéroport Francisco Sá Carneiro et Aveiro. Environ 88 kilomètres par l'A28, l'A29 et l'A25, avec une heure d'attente incluse et le suivi du vol.",
        origin: "Aéroport Francisco Sá Carneiro (OPO), Maia",
        airportName: "Aéroport Francisco Sá Carneiro",
        highlights: [
            "Environ 65 minutes, en direct et sans correspondance",
            "Une heure d'attente gratuite sur les transferts aéroport",
            "Chauffeur dans le hall d'arrivée, avec une pancarte à votre nom",
            "Nous desservons aussi Costa Nova et Barra, de l'autre côté de la ria",
            "Prix fixé à la réservation, sans supplément pour les embouteillages",
        ],
        faq: [
            {
                question: "Combien de temps faut-il de l'aéroport à Aveiro ?",
                answer: "Environ 65 minutes par l'A28, l'A29 et l'A25, en conditions normales. C'est de l'autoroute presque tout du long, sans les embouteillages qui touchent ceux qui entrent dans Porto.",
            },
            {
                question: "Est-ce intéressant par rapport au train ?",
                answer: "Cela dépend de votre façon de voyager, et autant être direct : le train pour Aveiro est bon. Un Intercidades fait Campanhã–Aveiro en environ 40 minutes. Le problème n'est pas le train, c'est tout ce qui l'entoure — depuis l'aéroport il faut prendre le métro jusqu'à Campanhã, attendre le train, puis rejoindre votre logement depuis la gare d'Aveiro. Avec des bagages, le total dépasse facilement deux heures et demie. Le transfert fait le trajet d'un seul coup, à l'heure que vous choisissez.",
            },
            {
                question: "Allez-vous jusqu'à Costa Nova ou Praia da Barra ?",
                answer: "Oui. Elles sont à 10 ou 15 minutes du centre d'Aveiro, de l'autre côté de la ria. Indiquez l'adresse exacte lors de la réservation et le prix est calculé pour cette destination.",
            },
            {
                question: "Et si mon vol a du retard ?",
                answer: "Vous n'avez rien à faire. Nous suivons le numéro de vol indiqué lors de la réservation et la prise en charge s'ajuste à l'heure réelle d'arrivée. Une heure d'attente gratuite est incluse à partir de l'heure prévue.",
            },
            {
                question: "Faites-vous aussi le trajet d'Aveiro vers l'aéroport ?",
                answer: "Oui, dans les deux sens. Pour les vols tôt le matin, nous conseillons de partir avec de la marge : l'A29 près d'Espinho et l'entrée de Porto se chargent à partir de sept heures et demie.",
            },
        ],
        seo: {
            title: "Transfert aéroport de Porto vers Aveiro | Way2Go",
            description:
                "Transfert privé de l'aéroport Francisco Sá Carneiro vers Aveiro. Environ 65 minutes en direct, une heure d'attente incluse et prix fixé à la réservation.",
        },
        corpo: `## De l'aéroport à la ria

Aveiro se trouve à environ 88 kilomètres de l'aéroport Francisco Sá Carneiro. Par l'A28, puis l'A29 et enfin l'A25, le trajet prend généralement 65 minutes.

C'est de l'autoroute presque tout du long, avec l'avantage de contourner Porto : la route longe le littoral sans emprunter la VCI. Même aux heures de pointe, le temps varie peu.

## Où le chauffeur vous attend

Dans le hall d'arrivée, après la douane, avec une pancarte à votre nom. Nous suivons le numéro de vol que vous indiquez lors de la réservation : un retard ne vous demande donc rien, la prise en charge se décale toute seule.

Les transferts aéroport comprennent une heure d'attente gratuite à partir de l'heure prévue.

## Le centre se fait à pied, et cela compte

Aveiro est plate et petite. Une fois déposé devant votre logement, vous n'aurez probablement besoin d'aucun autre transport : les canaux, le marché, la gare et le quartier des restaurants sont tous à dix minutes à pied les uns des autres.

L'inverse mérite aussi d'être su : si vous logez à Costa Nova ou à Barra, de l'autre côté de la ria, ce n'est plus le cas. Il faut compter 10 à 15 minutes en voiture, et il n'y a qu'un seul passage.

## Ce qu'il y a à voir

Les canaux attirent tout le monde, et les moliceiros — ces barques peintes à la proue relevée — ont cessé de transporter des algues pour transporter des visiteurs. La promenade dure environ 45 minutes.

À quelques minutes à pied :

- le Canal Central et les façades Art nouveau qui le bordent ;
- le musée d'Aveiro, dans l'ancien couvent de Jésus, avec le tombeau de sainte Jeanne ;
- l'ancienne gare, entièrement revêtue d'azulejos, monument à part entière ;
- Costa Nova, à 15 minutes en voiture, avec ses maisons de pêcheurs à rayures.

Et les ovos moles, qui bénéficient d'une Indication géographique protégée depuis 2006 — pas du folklore, un label européen.

## Est-ce intéressant par rapport au train ?

Ici la réponse honnête est « parfois », et il ne sert à rien de prétendre le contraire.

Le train pour Aveiro est bon. Un Intercidades fait Campanhã–Aveiro en environ 40 minutes, plusieurs fois par jour. Si vous voyagez léger et sans contrainte d'horaire, c'est un choix légitime.

Ce que le transfert résout, c'est tout le reste. De l'aéroport à Campanhã, comptez 35 minutes de métro, plus l'attente du train, plus le trajet de la gare d'Aveiro à votre logement. Avec des bagages, le total dépasse facilement deux heures et demie — et aucune de ces étapes ne se fait sans effort avec de grandes valises.

Pour qui arrive en famille, avec des bagages, en dehors des heures ouvrables ou avec un rendez-vous, le calcul s'inverse.

## Prix et annulation

Le prix est fixé à la réservation et ne change ni avec la circulation ni avec le temps d'attente.

Les annulations faites plus de 24 heures à l'avance sont sans frais.`,
        botao: {
            buttonText: "Réserver mon transfert vers Aveiro",
            subtext: "Confirmation immédiate · Annulation gratuite jusqu'à 24 heures",
        },
    },

    es: {
        title: "Traslado del aeropuerto de Oporto a Aveiro",
        city: "Aveiro",
        subtitle:
            "De la terminal a los canales en poco más de una hora, sin transbordos y con precio cerrado antes de salir.",
        summary:
            "Enlace directo entre el aeropuerto Francisco Sá Carneiro y Aveiro. Unos 88 kilómetros por la A28, A29 y A25, con una hora de espera incluida y seguimiento del vuelo.",
        origin: "Aeropuerto Francisco Sá Carneiro (OPO), Maia",
        airportName: "Aeropuerto Francisco Sá Carneiro",
        highlights: [
            "Unos 65 minutos, directo y sin transbordos",
            "Una hora de espera gratuita en los traslados de aeropuerto",
            "Conductor en la sala de llegadas, con un cartel con su nombre",
            "También llevamos a Costa Nova y a Barra, al otro lado de la ría",
            "Precio cerrado en la reserva, sin recargos por tráfico",
        ],
        faq: [
            {
                question: "¿Cuánto se tarda del aeropuerto a Aveiro?",
                answer: "Unos 65 minutos por la A28, A29 y A25, en condiciones normales. Es casi todo autopista, sin las retenciones que afectan a quien entra en Oporto.",
            },
            {
                question: "¿Compensa frente al tren?",
                answer: "Depende de cómo viaje, y conviene ser directo: el tren a Aveiro es bueno. Un Intercidades hace Campanhã–Aveiro en unos 40 minutos. El problema no es el tren, es todo lo que lo rodea — desde el aeropuerto hay que coger el metro hasta Campanhã, esperar el tren y después llegar desde la estación de Aveiro al alojamiento. Con equipaje, el total pasa fácilmente de dos horas y media. El traslado hace el recorrido de una vez, a la hora que elija.",
            },
            {
                question: "¿Me llevan a Costa Nova o a Praia da Barra?",
                answer: "Sí. Están a 10 o 15 minutos del centro de Aveiro, al otro lado de la ría. Indique la dirección exacta en la reserva y el precio se calcula para ese destino.",
            },
            {
                question: "¿Y si mi vuelo se retrasa?",
                answer: "No tiene que hacer nada. Seguimos el número de vuelo indicado en la reserva y la recogida se ajusta a la hora real de llegada. Se incluye una hora de espera gratuita desde la hora prevista.",
            },
            {
                question: "¿Hacen también el trayecto de Aveiro al aeropuerto?",
                answer: "Sí, en ambas direcciones. Para vuelos de primera hora recomendamos salir con margen: la A29 junto a Espinho y la entrada a Oporto se congestionan a partir de las siete y media.",
            },
        ],
        seo: {
            title: "Traslado aeropuerto de Oporto a Aveiro | Way2Go",
            description:
                "Traslado privado del aeropuerto Francisco Sá Carneiro a Aveiro. Unos 65 minutos directo, una hora de espera incluida y precio cerrado en la reserva.",
        },
        corpo: `## Del aeropuerto a la ría

Aveiro está a unos 88 kilómetros del aeropuerto Francisco Sá Carneiro. Por la A28, con enlace a la A29 y después a la A25, el viaje se hace normalmente en 65 minutos.

Es un recorrido de autopista casi todo el camino, con la ventaja de rodear Oporto: se bordea la ciudad por el litoral, sin coger la VCI. Incluso en hora punta, el tiempo varía poco.

## Dónde le espera el conductor

En la sala de llegadas, después de la aduana, con un cartel con su nombre. Seguimos el número de vuelo que indique en la reserva, así que un retraso no le obliga a hacer nada: la recogida se ajusta sola.

Los traslados de aeropuerto incluyen una hora de espera gratuita desde la hora prevista.

## El centro se hace a pie, y eso cuenta

Aveiro es llana y pequeña. Una vez dejado en la puerta del alojamiento, es probable que no necesite más transporte durante la estancia: los canales, el mercado, la estación y la zona de restaurantes están a diez minutos a pie unos de otros.

Conviene saberlo también al revés: si se aloja en Costa Nova o en Barra, al otro lado de la ría, ya no es así. Son 10 o 15 minutos en coche, y sólo hay un paso.

## Qué hay que ver

Los canales son lo que trae a todo el mundo, y los moliceiros — las barcas pintadas, de proa levantada — dejaron de transportar algas para transportar visitantes. El paseo dura unos 45 minutos.

A pocos minutos a pie:

- el Canal Central y las fachadas modernistas que lo acompañan;
- el Museo de Aveiro, en el antiguo Convento de Jesús, con el sepulcro de Santa Juana;
- la Estación Vieja, revestida de azulejos, monumento por derecho propio;
- Costa Nova, a 15 minutos en coche, con sus casas de pescadores a rayas.

Y los ovos moles, con Indicación Geográfica Protegida desde 2006 — no es folclore, es un sello europeo.

## ¿Compensa frente al tren?

Aquí la respuesta honesta es «a veces», y no vale la pena fingir lo contrario.

El tren a Aveiro es bueno. Un Intercidades hace Campanhã–Aveiro en unos 40 minutos, varias veces al día. Si viaja ligero y sin hora fija, es una opción legítima.

Lo que el traslado resuelve es todo lo demás. Del aeropuerto a Campanhã son unos 35 minutos de metro, más la espera del tren, más llegar desde la estación de Aveiro al alojamiento. Con equipaje el total pasa fácilmente de dos horas y media — y ninguno de esos pasos se hace sin esfuerzo con maletas grandes.

Para quien llega con familia, con equipaje, fuera de horas o con cita, la cuenta cambia de sentido.

## Precio y cancelación

El precio se cierra en la reserva y no cambia con el tráfico ni con el tiempo de espera.

Las cancelaciones hechas con más de 24 horas de antelación no tienen coste.`,
        botao: {
            buttonText: "Reservar traslado a Aveiro",
            subtext: "Confirmación inmediata · Cancelación gratuita hasta 24 horas",
        },
    },

    de: {
        title: "Flughafentransfer Porto nach Aveiro",
        city: "Aveiro",
        subtitle:
            "Vom Terminal zu den Kanälen in gut einer Stunde, ohne Umsteigen und mit festem Preis schon vor der Abfahrt.",
        summary:
            "Direkte Verbindung zwischen dem Flughafen Francisco Sá Carneiro und Aveiro. Rund 88 Kilometer über A28, A29 und A25, mit einer Stunde Wartezeit inklusive und Flugverfolgung.",
        origin: "Flughafen Francisco Sá Carneiro (OPO), Maia",
        airportName: "Flughafen Francisco Sá Carneiro",
        highlights: [
            "Etwa 65 Minuten, direkt und ohne Umsteigen",
            "Eine Stunde kostenlose Wartezeit bei Flughafentransfers",
            "Fahrer in der Ankunftshalle, mit Schild mit Ihrem Namen",
            "Wir fahren auch nach Costa Nova und Barra, auf der anderen Seite der Lagune",
            "Fester Preis bei der Buchung, ohne Zuschläge für Verkehr",
        ],
        faq: [
            {
                question: "Wie lange dauert es vom Flughafen nach Aveiro?",
                answer: "Etwa 65 Minuten über A28, A29 und A25, bei normalen Verhältnissen. Es ist fast durchgehend Autobahn, ohne die Staus, die Fahrten nach Porto hinein betreffen.",
            },
            {
                question: "Lohnt es sich gegenüber dem Zug?",
                answer: "Das hängt davon ab, wie Sie reisen, und man sollte es offen sagen: Der Zug nach Aveiro ist gut. Ein Intercidades schafft Campanhã–Aveiro in etwa 40 Minuten. Nicht der Zug ist das Problem, sondern alles darum herum — vom Flughafen müssen Sie erst die Metro nach Campanhã nehmen, auf den Zug warten und dann vom Bahnhof Aveiro zu Ihrer Unterkunft. Mit Gepäck überschreitet das Ganze leicht zweieinhalb Stunden. Der Transfer fährt in einem durch, zu der Zeit, die Sie wählen.",
            },
            {
                question: "Fahren Sie auch nach Costa Nova oder Praia da Barra?",
                answer: "Ja. Sie liegen 10 bis 15 Minuten vom Zentrum Aveiros entfernt, auf der anderen Seite der Lagune. Geben Sie bei der Buchung die genaue Adresse an, und der Preis wird für dieses Ziel berechnet.",
            },
            {
                question: "Und wenn mein Flug Verspätung hat?",
                answer: "Sie müssen nichts tun. Wir verfolgen die bei der Buchung angegebene Flugnummer, und die Abholung richtet sich nach der tatsächlichen Ankunftszeit. Eine Stunde kostenlose Wartezeit ab der planmäßigen Zeit ist enthalten.",
            },
            {
                question: "Fahren Sie auch von Aveiro zum Flughafen?",
                answer: "Ja, in beide Richtungen. Für Flüge am frühen Morgen empfehlen wir, mit Puffer loszufahren: die A29 bei Espinho und die Einfahrt nach Porto füllen sich ab etwa halb acht.",
            },
        ],
        seo: {
            title: "Flughafentransfer Porto nach Aveiro | Way2Go",
            description:
                "Privater Transfer vom Flughafen Francisco Sá Carneiro nach Aveiro. Etwa 65 Minuten direkt, eine Stunde Wartezeit inklusive und fester Preis bei der Buchung.",
        },
        corpo: `## Vom Flughafen zur Lagune

Aveiro liegt rund 88 Kilometer vom Flughafen Francisco Sá Carneiro entfernt. Über die A28, mit Anschluss an die A29 und danach an die A25, dauert die Fahrt in der Regel 65 Minuten.

Es ist fast durchgehend Autobahn, mit dem Vorteil, Porto ganz zu umgehen: Die Strecke führt an der Küste entlang, ohne die VCI zu berühren. Selbst zur Hauptverkehrszeit schwankt die Fahrzeit kaum.

## Wo der Fahrer auf Sie wartet

In der Ankunftshalle, nach dem Zoll, mit einem Schild mit Ihrem Namen. Wir verfolgen die Flugnummer, die Sie bei der Buchung angeben — eine Verspätung verlangt Ihnen also nichts ab: die Abholung verschiebt sich von selbst.

Flughafentransfers enthalten eine Stunde kostenlose Wartezeit ab der planmäßigen Zeit.

## Das Zentrum lässt sich zu Fuß erschließen, und das zählt

Aveiro ist flach und klein. Sind Sie erst einmal vor Ihrer Unterkunft abgesetzt, brauchen Sie während des Aufenthalts wahrscheinlich kein weiteres Verkehrsmittel: Kanäle, Markt, Bahnhof und das Restaurantviertel liegen alle zehn Gehminuten voneinander entfernt.

Das gilt auch umgekehrt: Wohnen Sie in Costa Nova oder Barra, auf der anderen Seite der Lagune, ist das nicht mehr so. Das sind 10 bis 15 Autominuten, und es gibt nur eine Querung.

## Was es zu sehen gibt

Die Kanäle bringen alle her, und die Moliceiros — die bemalten Boote mit dem hochgezogenen Bug — transportieren statt Seegras inzwischen Besucher. Die Fahrt dauert etwa 45 Minuten.

Alles wenige Gehminuten entfernt:

- der Canal Central und die Jugendstilfassaden an seinen Ufern;
- das Museum von Aveiro im früheren Jesus-Kloster, mit dem Grab der heiligen Johanna;
- der alte Bahnhof, ganz mit Azulejos verkleidet, ein Denkmal für sich;
- Costa Nova, 15 Autominuten entfernt, mit den gestreiften Fischerhäusern.

Und die Ovos moles, die seit 2006 eine geschützte geografische Angabe tragen — keine Folklore, ein europäisches Siegel.

## Lohnt es sich gegenüber dem Zug?

Hier lautet die ehrliche Antwort „manchmal", und es bringt nichts, etwas anderes zu behaupten.

Der Zug nach Aveiro ist gut. Ein Intercidades schafft Campanhã–Aveiro in etwa 40 Minuten, mehrmals täglich. Wenn Sie leicht reisen und keinen Termin haben, ist das eine legitime Wahl.

Was der Transfer löst, ist alles andere. Vom Flughafen bis Campanhã sind es etwa 35 Minuten mit der Metro, dazu die Wartezeit auf den Zug und der Weg vom Bahnhof Aveiro zur Unterkunft. Mit Gepäck überschreitet das Ganze leicht zweieinhalb Stunden — und keiner dieser Schritte gelingt mit großen Koffern mühelos.

Wer mit Familie, mit Gepäck, außerhalb der üblichen Zeiten oder zu einem festen Termin ankommt, für den kehrt sich die Rechnung um.

## Preis und Stornierung

Der Preis steht bei der Buchung fest und ändert sich weder durch Verkehr noch durch Wartezeit.

Stornierungen mehr als 24 Stunden im Voraus sind kostenlos.`,
        botao: {
            buttonText: "Transfer nach Aveiro buchen",
            subtext: "Sofortige Bestätigung · Kostenlose Stornierung bis 24 Stunden",
        },
    },
};

// ---------------------------------------------------------------------------------------
// BRAGA — 60,9 km, 45 min
// ---------------------------------------------------------------------------------------

const BRAGA: Record<Idioma, Texto> = {
    pt: {
        title: "Transfer do Aeroporto do Porto para Braga",
        city: "Braga",
        subtitle:
            "Do terminal ao centro em cerca de quarenta e cinco minutos, sem transbordos e com preço fechado antes de partir.",
        summary:
            "Ligação directa entre o Aeroporto Francisco Sá Carneiro e Braga. Cerca de 61 quilómetros pela A3, com uma hora de espera incluída e acompanhamento do voo.",
        origin: AEROPORTO_PT,
        airportName: "Aeroporto Francisco Sá Carneiro",
        highlights: [
            "Cerca de 45 minutos, directo e sem transbordos",
            "Uma hora de espera gratuita nos transfers de aeroporto",
            "Motorista no átrio de chegadas, com placa com o seu nome",
            "Também levamos ao Bom Jesus e ao Sameiro, fora da cidade",
            "Preço fechado na reserva, sem acréscimos por trânsito",
        ],
        faq: [
            {
                question: "Quanto tempo demora do aeroporto a Braga?",
                answer: "Cerca de 45 minutos pela A3, em condições normais. Nas manhãs de segunda-feira e ao fim da tarde de sexta, quando a A3 acumula tráfego entre Braga e o Porto, conte com uma hora.",
            },
            {
                question: "Levam-me ao Bom Jesus do Monte?",
                answer: "Sim. Fica a cerca de 6 quilómetros do centro, na encosta, e é subida — não é percurso para fazer a pé com bagagem. Indique-o na reserva e o preço é calculado para esse destino.",
            },
            {
                question: "Compensa face ao comboio?",
                answer: "Para quem chega de avião, normalmente sim. Há comboio para Braga, mas parte do Porto — de Campanhã — e demora cerca de uma hora. A partir do aeroporto é preciso apanhar primeiro o metro até à cidade e depois mudar: com bagagem e esperas, o total aproxima-se das duas horas e meia. O transfer faz o percurso em 45 minutos, directo.",
            },
            {
                question: "E se o meu voo atrasar?",
                answer: "Não precisa de fazer nada. Acompanhamos o número do voo indicado na reserva e a recolha ajusta-se à hora real de chegada. Está incluída uma hora de espera gratuita a partir da hora programada.",
            },
            {
                question: "Fazem também o percurso de Braga para o aeroporto?",
                answer: "Sim, nas duas direcções. Para voos de manhã cedo recomendamos sair com margem: a A3 no sentido do Porto congestiona a partir das sete e meia.",
            },
        ],
        seo: {
            title: "Transfer Aeroporto do Porto para Braga | Way2Go",
            description:
                "Transfer privado do Aeroporto Francisco Sá Carneiro para Braga. Cerca de 45 minutos directos, uma hora de espera incluída e preço fechado na reserva.",
        },
        corpo: `## Do aeroporto a Braga

Braga fica a cerca de 61 quilómetros do Aeroporto Francisco Sá Carneiro. Pela A3, a viagem faz-se tipicamente em 45 minutos, quase toda em auto-estrada.

É dos percursos mais previsíveis que fazemos a partir do aeroporto. As excepções são as manhãs de segunda-feira e os fins de tarde de sexta, quando a A3 acumula tráfego entre Braga e o Porto — nesses períodos, conte com uma hora.

## Onde o motorista o espera

No átrio de chegadas, depois da alfândega, com uma placa com o seu nome. Acompanhamos o número do voo que indicar na reserva, por isso um atraso não o obriga a fazer nada: a recolha ajusta-se sozinha.

Nos transfers de aeroporto está incluída uma hora de espera gratuita a partir da hora programada.

## O Bom Jesus não fica na cidade

Vale a pena saber antes de reservar: o Santuário do Bom Jesus do Monte, que é o que traz a maioria dos visitantes a Braga, fica a cerca de 6 quilómetros do centro, na encosta do monte Espinho.

Não é percurso para fazer a pé, e menos ainda com bagagem. Há o elevador do Bom Jesus, a funcionar desde 1882 — o mais antigo do mundo movido a contrapeso de água — mas é preciso lá chegar primeiro. Se é esse o seu destino, indique-o na reserva e levamo-lo à porta.

O mesmo vale para o Santuário do Sameiro, ainda mais acima.

## O que há para ver

Braga é a cidade mais antiga de Portugal com esse nome de raiz: começou como Bracara Augusta, fundada por Augusto no século I antes de Cristo. A Sé é a catedral mais antiga do país, anterior à própria nacionalidade.

A poucos minutos uns dos outros, no centro:

- a Sé de Braga e o seu tesouro-museu;
- o Jardim de Santa Bárbara, encostado às muralhas do antigo Paço Episcopal;
- a Avenida Central e o Theatro Circo;
- o Bom Jesus do Monte, a 6 quilómetros, Património Mundial da UNESCO desde 2019.

## Compensa face ao comboio?

Para quem chega de avião, normalmente sim.

Há comboio para Braga e é um bom comboio, mas parte do Porto — da estação de Campanhã — e demora cerca de uma hora. A partir do aeroporto, é preciso primeiro apanhar o metro até à cidade e depois mudar para o comboio: com bagagem e esperas, o total aproxima-se das duas horas e meia.

O transfer faz o percurso em 45 minutos, directo, do terminal à porta. E se o seu destino for o Bom Jesus ou o Sameiro, a diferença é maior ainda: pelo comboio, ficaria à mesma a 6 quilómetros de subida do sítio onde quer estar.

## Preço e cancelamento

O preço fecha-se na reserva e não muda com o trânsito nem com o tempo de espera.

Cancelamentos feitos com mais de 24 horas de antecedência não têm custo.`,
        botao: {
            buttonText: "Reservar transfer para Braga",
            subtext: "Confirmação imediata · Cancelamento gratuito até 24 horas",
        },
    },

    en: {
        title: "Porto Airport Transfer to Braga",
        city: "Braga",
        subtitle:
            "From the terminal to the centre in about forty-five minutes, with no changes and the price fixed before you travel.",
        summary:
            "Direct transfer between Francisco Sá Carneiro Airport and Braga. Around 61 kilometres via the A3, with one hour of waiting time included and flight tracking.",
        origin: AEROPORTO_EN,
        airportName: "Francisco Sá Carneiro Airport",
        highlights: [
            "About 45 minutes, direct and with no changes",
            "One hour of free waiting time on airport transfers",
            "Driver in the arrivals hall, holding a sign with your name",
            "We also serve Bom Jesus and Sameiro, outside the city",
            "Price fixed at booking, with no traffic surcharges",
        ],
        faq: [
            {
                question: "How long does it take from the airport to Braga?",
                answer: "About 45 minutes via the A3 in normal conditions. On Monday mornings and Friday evenings, when the A3 builds up between Braga and Porto, allow an hour.",
            },
            {
                question: "Will you take me to Bom Jesus do Monte?",
                answer: "Yes. It sits about 6 kilometres from the centre, on the hillside, and it is uphill — not a walk to attempt with luggage. Say so when booking and the price is calculated for that destination.",
            },
            {
                question: "Is it worth it compared to the train?",
                answer: "For anyone arriving by air, usually yes. There is a train to Braga, but it leaves from Porto — Campanhã station — and takes about an hour. From the airport you first need the metro into the city and then a change: with luggage and waiting, the total approaches two and a half hours. The transfer covers it in 45 minutes, direct.",
            },
            {
                question: "What if my flight is delayed?",
                answer: "You need do nothing. We track the flight number given at booking and the pickup adjusts to your actual arrival. One hour of free waiting is included from the scheduled time.",
            },
            {
                question: "Do you also drive from Braga to the airport?",
                answer: "Yes, in both directions. For early morning flights we suggest leaving with margin: the A3 towards Porto builds up from about half past seven.",
            },
        ],
        seo: {
            title: "Porto Airport Transfer to Braga | Way2Go",
            description:
                "Private transfer from Francisco Sá Carneiro Airport to Braga. About 45 minutes direct, one hour of waiting included and the price fixed at booking.",
        },
        corpo: `## From the airport to Braga

Braga sits about 61 kilometres from Francisco Sá Carneiro Airport. Via the A3 the drive usually takes 45 minutes, almost entirely on motorway.

It is one of the most predictable routes we run from the airport. The exceptions are Monday mornings and Friday evenings, when the A3 builds up between Braga and Porto — allow an hour at those times.

## Where your driver will be

In the arrivals hall, past customs, holding a sign with your name. We track the flight number you give us when booking, so a delay asks nothing of you: the pickup shifts on its own.

Airport transfers include one hour of free waiting time from the scheduled pickup.

## Bom Jesus is not in the city

Worth knowing before you book: the Sanctuary of Bom Jesus do Monte, which is what brings most visitors to Braga, sits about 6 kilometres from the centre, on the slope of Mount Espinho.

It is not a walk, and certainly not with luggage. There is the Bom Jesus funicular, running since 1882 — the oldest water-counterweight funicular in the world — but you have to get there first. If that is your destination, say so when booking and we take you to the door.

The same goes for the Sameiro Sanctuary, higher still.

## What there is to see

Braga is the oldest city in Portugal to have kept its name: it began as Bracara Augusta, founded by Augustus in the first century BC. Its cathedral is the oldest in the country, older than Portuguese nationhood itself.

All within a few minutes of each other in the centre:

- Braga Cathedral and its treasury museum;
- the Santa Bárbara Garden, against the walls of the old Episcopal Palace;
- Avenida Central and the Theatro Circo;
- Bom Jesus do Monte, 6 kilometres away, a UNESCO World Heritage Site since 2019.

## Is it worth it against the train?

For anyone arriving by air, usually yes.

There is a train to Braga and it is a good one, but it leaves from Porto — Campanhã station — and takes about an hour. From the airport you first have to take the metro into the city and then change to the train: with luggage and waiting, the total approaches two and a half hours.

The transfer covers it in 45 minutes, direct, from the terminal to the door. And if your destination is Bom Jesus or Sameiro, the gap widens: by train you would still be 6 uphill kilometres from where you want to be.

## Price and cancellation

The price is fixed at booking and does not change with traffic or waiting time.

Cancellations made more than 24 hours ahead are free of charge.`,
        botao: {
            buttonText: "Book your Braga transfer",
            subtext: "Instant confirmation · Free cancellation up to 24 hours",
        },
    },

    fr: {
        title: "Transfert de l'aéroport de Porto vers Braga",
        city: "Braga",
        subtitle:
            "Du terminal au centre en environ quarante-cinq minutes, sans correspondance et avec un prix fixé avant le départ.",
        summary:
            "Liaison directe entre l'aéroport Francisco Sá Carneiro et Braga. Environ 61 kilomètres par l'A3, avec une heure d'attente incluse et le suivi du vol.",
        origin: "Aéroport Francisco Sá Carneiro (OPO), Maia",
        airportName: "Aéroport Francisco Sá Carneiro",
        highlights: [
            "Environ 45 minutes, en direct et sans correspondance",
            "Une heure d'attente gratuite sur les transferts aéroport",
            "Chauffeur dans le hall d'arrivée, avec une pancarte à votre nom",
            "Nous desservons aussi le Bom Jesus et le Sameiro, hors de la ville",
            "Prix fixé à la réservation, sans supplément pour les embouteillages",
        ],
        faq: [
            {
                question: "Combien de temps faut-il de l'aéroport à Braga ?",
                answer: "Environ 45 minutes par l'A3, en conditions normales. Le lundi matin et le vendredi en fin de journée, quand l'A3 se charge entre Braga et Porto, comptez une heure.",
            },
            {
                question: "Allez-vous jusqu'au Bom Jesus do Monte ?",
                answer: "Oui. Il se trouve à environ 6 kilomètres du centre, à flanc de colline, et ça monte — ce n'est pas un trajet à faire à pied avec des bagages. Précisez-le lors de la réservation et le prix est calculé pour cette destination.",
            },
            {
                question: "Est-ce intéressant par rapport au train ?",
                answer: "Pour qui arrive en avion, généralement oui. Il y a un train pour Braga, mais il part de Porto — de la gare de Campanhã — et met environ une heure. Depuis l'aéroport, il faut d'abord prendre le métro jusqu'à la ville puis changer : avec bagages et attentes, le total approche les deux heures et demie. Le transfert fait le trajet en 45 minutes, en direct.",
            },
            {
                question: "Et si mon vol a du retard ?",
                answer: "Vous n'avez rien à faire. Nous suivons le numéro de vol indiqué lors de la réservation et la prise en charge s'ajuste à l'heure réelle d'arrivée. Une heure d'attente gratuite est incluse à partir de l'heure prévue.",
            },
            {
                question: "Faites-vous aussi le trajet de Braga vers l'aéroport ?",
                answer: "Oui, dans les deux sens. Pour les vols tôt le matin, nous conseillons de partir avec de la marge : l'A3 en direction de Porto se charge à partir de sept heures et demie.",
            },
        ],
        seo: {
            title: "Transfert aéroport de Porto vers Braga | Way2Go",
            description:
                "Transfert privé de l'aéroport Francisco Sá Carneiro vers Braga. Environ 45 minutes en direct, une heure d'attente incluse et prix fixé à la réservation.",
        },
        corpo: `## De l'aéroport à Braga

Braga se trouve à environ 61 kilomètres de l'aéroport Francisco Sá Carneiro. Par l'A3, le trajet prend généralement 45 minutes, presque entièrement sur autoroute.

C'est l'un des parcours les plus prévisibles que nous faisons depuis l'aéroport. Les exceptions sont les lundis matin et les vendredis en fin de journée, quand l'A3 se charge entre Braga et Porto — comptez une heure à ces moments-là.

## Où le chauffeur vous attend

Dans le hall d'arrivée, après la douane, avec une pancarte à votre nom. Nous suivons le numéro de vol que vous indiquez lors de la réservation : un retard ne vous demande donc rien, la prise en charge se décale toute seule.

Les transferts aéroport comprennent une heure d'attente gratuite à partir de l'heure prévue.

## Le Bom Jesus n'est pas dans la ville

Cela vaut la peine de le savoir avant de réserver : le sanctuaire du Bom Jesus do Monte, qui attire la plupart des visiteurs à Braga, se trouve à environ 6 kilomètres du centre, sur le versant du mont Espinho.

Ce n'est pas un trajet à faire à pied, encore moins avec des bagages. Il y a le funiculaire du Bom Jesus, en service depuis 1882 — le plus ancien au monde à contrepoids d'eau — mais encore faut-il y arriver. Si c'est votre destination, précisez-le lors de la réservation et nous vous déposons devant.

Il en va de même pour le sanctuaire du Sameiro, plus haut encore.

## Ce qu'il y a à voir

Braga est la plus ancienne ville du Portugal à avoir gardé son nom : elle a commencé comme Bracara Augusta, fondée par Auguste au premier siècle avant notre ère. Sa cathédrale est la plus ancienne du pays, antérieure à la nation portugaise elle-même.

À quelques minutes les uns des autres, au centre :

- la cathédrale de Braga et son musée du trésor ;
- le jardin de Santa Bárbara, adossé aux murs de l'ancien palais épiscopal ;
- l'Avenida Central et le Theatro Circo ;
- le Bom Jesus do Monte, à 6 kilomètres, inscrit au patrimoine mondial de l'UNESCO depuis 2019.

## Est-ce intéressant par rapport au train ?

Pour qui arrive en avion, généralement oui.

Il y a un train pour Braga, et c'est un bon train, mais il part de Porto — de la gare de Campanhã — et met environ une heure. Depuis l'aéroport, il faut d'abord prendre le métro jusqu'à la ville puis changer pour le train : avec bagages et attentes, le total approche les deux heures et demie.

Le transfert fait le trajet en 45 minutes, en direct, du terminal à la porte. Et si votre destination est le Bom Jesus ou le Sameiro, l'écart se creuse : en train, vous seriez encore à 6 kilomètres de montée de l'endroit où vous voulez être.

## Prix et annulation

Le prix est fixé à la réservation et ne change ni avec la circulation ni avec le temps d'attente.

Les annulations faites plus de 24 heures à l'avance sont sans frais.`,
        botao: {
            buttonText: "Réserver mon transfert vers Braga",
            subtext: "Confirmation immédiate · Annulation gratuite jusqu'à 24 heures",
        },
    },

    es: {
        title: "Traslado del aeropuerto de Oporto a Braga",
        city: "Braga",
        subtitle:
            "De la terminal al centro en unos cuarenta y cinco minutos, sin transbordos y con precio cerrado antes de salir.",
        summary:
            "Enlace directo entre el aeropuerto Francisco Sá Carneiro y Braga. Unos 61 kilómetros por la A3, con una hora de espera incluida y seguimiento del vuelo.",
        origin: "Aeropuerto Francisco Sá Carneiro (OPO), Maia",
        airportName: "Aeropuerto Francisco Sá Carneiro",
        highlights: [
            "Unos 45 minutos, directo y sin transbordos",
            "Una hora de espera gratuita en los traslados de aeropuerto",
            "Conductor en la sala de llegadas, con un cartel con su nombre",
            "También llevamos al Bom Jesus y al Sameiro, fuera de la ciudad",
            "Precio cerrado en la reserva, sin recargos por tráfico",
        ],
        faq: [
            {
                question: "¿Cuánto se tarda del aeropuerto a Braga?",
                answer: "Unos 45 minutos por la A3, en condiciones normales. Los lunes por la mañana y los viernes al final de la tarde, cuando la A3 acumula tráfico entre Braga y Oporto, cuente con una hora.",
            },
            {
                question: "¿Me llevan al Bom Jesus do Monte?",
                answer: "Sí. Está a unos 6 kilómetros del centro, en la ladera, y es subida — no es un trayecto para hacer a pie con equipaje. Indíquelo en la reserva y el precio se calcula para ese destino.",
            },
            {
                question: "¿Compensa frente al tren?",
                answer: "Para quien llega en avión, normalmente sí. Hay tren a Braga, pero sale de Oporto — de la estación de Campanhã — y tarda alrededor de una hora. Desde el aeropuerto hay que coger primero el metro hasta la ciudad y después cambiar: con equipaje y esperas, el total se acerca a las dos horas y media. El traslado hace el recorrido en 45 minutos, directo.",
            },
            {
                question: "¿Y si mi vuelo se retrasa?",
                answer: "No tiene que hacer nada. Seguimos el número de vuelo indicado en la reserva y la recogida se ajusta a la hora real de llegada. Se incluye una hora de espera gratuita desde la hora prevista.",
            },
            {
                question: "¿Hacen también el trayecto de Braga al aeropuerto?",
                answer: "Sí, en ambas direcciones. Para vuelos de primera hora recomendamos salir con margen: la A3 en sentido Oporto se congestiona a partir de las siete y media.",
            },
        ],
        seo: {
            title: "Traslado aeropuerto de Oporto a Braga | Way2Go",
            description:
                "Traslado privado del aeropuerto Francisco Sá Carneiro a Braga. Unos 45 minutos directo, una hora de espera incluida y precio cerrado en la reserva.",
        },
        corpo: `## Del aeropuerto a Braga

Braga está a unos 61 kilómetros del aeropuerto Francisco Sá Carneiro. Por la A3, el viaje se hace normalmente en 45 minutos, casi todo en autopista.

Es de los recorridos más previsibles que hacemos desde el aeropuerto. Las excepciones son los lunes por la mañana y los viernes al final de la tarde, cuando la A3 acumula tráfico entre Braga y Oporto — en esos momentos, cuente con una hora.

## Dónde le espera el conductor

En la sala de llegadas, después de la aduana, con un cartel con su nombre. Seguimos el número de vuelo que indique en la reserva, así que un retraso no le obliga a hacer nada: la recogida se ajusta sola.

Los traslados de aeropuerto incluyen una hora de espera gratuita desde la hora prevista.

## El Bom Jesus no está en la ciudad

Vale la pena saberlo antes de reservar: el Santuario del Bom Jesus do Monte, que es lo que trae a la mayoría de los visitantes a Braga, está a unos 6 kilómetros del centro, en la ladera del monte Espinho.

No es un trayecto para hacer a pie, y menos aún con equipaje. Está el funicular del Bom Jesus, en servicio desde 1882 — el más antiguo del mundo movido por contrapeso de agua — pero primero hay que llegar allí. Si es ese su destino, indíquelo en la reserva y le llevamos a la puerta.

Lo mismo vale para el Santuario del Sameiro, aún más arriba.

## Qué hay que ver

Braga es la ciudad más antigua de Portugal que conserva su nombre: empezó como Bracara Augusta, fundada por Augusto en el siglo I antes de Cristo. Su catedral es la más antigua del país, anterior a la propia nacionalidad portuguesa.

A pocos minutos unos de otros, en el centro:

- la Sé de Braga y su museo del tesoro;
- el Jardín de Santa Bárbara, pegado a las murallas del antiguo Palacio Episcopal;
- la Avenida Central y el Theatro Circo;
- el Bom Jesus do Monte, a 6 kilómetros, Patrimonio Mundial de la UNESCO desde 2019.

## ¿Compensa frente al tren?

Para quien llega en avión, normalmente sí.

Hay tren a Braga y es un buen tren, pero sale de Oporto — de la estación de Campanhã — y tarda alrededor de una hora. Desde el aeropuerto hay que coger primero el metro hasta la ciudad y después cambiar al tren: con equipaje y esperas, el total se acerca a las dos horas y media.

El traslado hace el recorrido en 45 minutos, directo, de la terminal a la puerta. Y si su destino es el Bom Jesus o el Sameiro, la diferencia es aún mayor: en tren seguiría a 6 kilómetros de subida del sitio donde quiere estar.

## Precio y cancelación

El precio se cierra en la reserva y no cambia con el tráfico ni con el tiempo de espera.

Las cancelaciones hechas con más de 24 horas de antelación no tienen coste.`,
        botao: {
            buttonText: "Reservar traslado a Braga",
            subtext: "Confirmación inmediata · Cancelación gratuita hasta 24 horas",
        },
    },

    de: {
        title: "Flughafentransfer Porto nach Braga",
        city: "Braga",
        subtitle:
            "Vom Terminal ins Zentrum in etwa fünfundvierzig Minuten, ohne Umsteigen und mit festem Preis schon vor der Abfahrt.",
        summary:
            "Direkte Verbindung zwischen dem Flughafen Francisco Sá Carneiro und Braga. Rund 61 Kilometer über die A3, mit einer Stunde Wartezeit inklusive und Flugverfolgung.",
        origin: "Flughafen Francisco Sá Carneiro (OPO), Maia",
        airportName: "Flughafen Francisco Sá Carneiro",
        highlights: [
            "Etwa 45 Minuten, direkt und ohne Umsteigen",
            "Eine Stunde kostenlose Wartezeit bei Flughafentransfers",
            "Fahrer in der Ankunftshalle, mit Schild mit Ihrem Namen",
            "Wir fahren auch zum Bom Jesus und zum Sameiro, außerhalb der Stadt",
            "Fester Preis bei der Buchung, ohne Zuschläge für Verkehr",
        ],
        faq: [
            {
                question: "Wie lange dauert es vom Flughafen nach Braga?",
                answer: "Etwa 45 Minuten über die A3, bei normalen Verhältnissen. An Montagmorgen und Freitagabenden, wenn sich die A3 zwischen Braga und Porto füllt, sollten Sie eine Stunde einplanen.",
            },
            {
                question: "Fahren Sie zum Bom Jesus do Monte?",
                answer: "Ja. Er liegt etwa 6 Kilometer vom Zentrum entfernt am Hang, und es geht bergauf — kein Weg, den man mit Gepäck zu Fuß zurücklegt. Geben Sie es bei der Buchung an, und der Preis wird für dieses Ziel berechnet.",
            },
            {
                question: "Lohnt es sich gegenüber dem Zug?",
                answer: "Für alle, die mit dem Flugzeug ankommen, meistens ja. Es gibt einen Zug nach Braga, aber er fährt ab Porto — vom Bahnhof Campanhã — und braucht etwa eine Stunde. Vom Flughafen aus müssen Sie zuerst die Metro in die Stadt nehmen und dann umsteigen: mit Gepäck und Wartezeiten nähert sich das Ganze zweieinhalb Stunden. Der Transfer schafft die Strecke in 45 Minuten, direkt.",
            },
            {
                question: "Und wenn mein Flug Verspätung hat?",
                answer: "Sie müssen nichts tun. Wir verfolgen die bei der Buchung angegebene Flugnummer, und die Abholung richtet sich nach der tatsächlichen Ankunftszeit. Eine Stunde kostenlose Wartezeit ab der planmäßigen Zeit ist enthalten.",
            },
            {
                question: "Fahren Sie auch von Braga zum Flughafen?",
                answer: "Ja, in beide Richtungen. Für Flüge am frühen Morgen empfehlen wir, mit Puffer loszufahren: die A3 Richtung Porto füllt sich ab etwa halb acht.",
            },
        ],
        seo: {
            title: "Flughafentransfer Porto nach Braga | Way2Go",
            description:
                "Privater Transfer vom Flughafen Francisco Sá Carneiro nach Braga. Etwa 45 Minuten direkt, eine Stunde Wartezeit inklusive und fester Preis bei der Buchung.",
        },
        corpo: `## Vom Flughafen nach Braga

Braga liegt rund 61 Kilometer vom Flughafen Francisco Sá Carneiro entfernt. Über die A3 dauert die Fahrt in der Regel 45 Minuten, fast durchgehend auf der Autobahn.

Es ist eine der berechenbarsten Strecken, die wir ab Flughafen fahren. Die Ausnahmen sind Montagmorgen und Freitagabend, wenn sich die A3 zwischen Braga und Porto füllt — planen Sie dann eine Stunde ein.

## Wo der Fahrer auf Sie wartet

In der Ankunftshalle, nach dem Zoll, mit einem Schild mit Ihrem Namen. Wir verfolgen die Flugnummer, die Sie bei der Buchung angeben — eine Verspätung verlangt Ihnen also nichts ab: die Abholung verschiebt sich von selbst.

Flughafentransfers enthalten eine Stunde kostenlose Wartezeit ab der planmäßigen Zeit.

## Der Bom Jesus liegt nicht in der Stadt

Das sollten Sie vor der Buchung wissen: Die Wallfahrtskirche Bom Jesus do Monte, die die meisten Besucher nach Braga bringt, liegt etwa 6 Kilometer vom Zentrum entfernt am Hang des Monte Espinho.

Das ist kein Fußweg, mit Gepäck erst recht nicht. Es gibt die Standseilbahn zum Bom Jesus, in Betrieb seit 1882 — die älteste wassergegengewichtsbetriebene der Welt — aber man muss erst einmal hinkommen. Ist das Ihr Ziel, geben Sie es bei der Buchung an, und wir bringen Sie bis vor die Tür.

Dasselbe gilt für die Wallfahrtskirche Sameiro, noch weiter oben.

## Was es zu sehen gibt

Braga ist die älteste Stadt Portugals, die ihren Namen behalten hat: Sie begann als Bracara Augusta, gegründet von Augustus im ersten Jahrhundert vor Christus. Ihre Kathedrale ist die älteste des Landes, älter als die portugiesische Nation selbst.

Alles wenige Minuten voneinander entfernt, im Zentrum:

- die Kathedrale von Braga und ihr Schatzmuseum;
- der Santa-Bárbara-Garten an den Mauern des alten Bischofspalasts;
- die Avenida Central und das Theatro Circo;
- der Bom Jesus do Monte, 6 Kilometer entfernt, seit 2019 UNESCO-Weltkulturerbe.

## Lohnt es sich gegenüber dem Zug?

Für alle, die mit dem Flugzeug ankommen, meistens ja.

Es gibt einen Zug nach Braga, und es ist ein guter Zug, aber er fährt ab Porto — vom Bahnhof Campanhã — und braucht etwa eine Stunde. Vom Flughafen aus müssen Sie zuerst die Metro in die Stadt nehmen und dann zum Zug wechseln: mit Gepäck und Wartezeiten nähert sich das Ganze zweieinhalb Stunden.

Der Transfer schafft die Strecke in 45 Minuten, direkt, vom Terminal bis vor die Tür. Und ist Ihr Ziel der Bom Jesus oder der Sameiro, wird der Abstand größer: mit dem Zug wären Sie immer noch 6 Kilometer bergauf von dort entfernt, wo Sie hinwollen.

## Preis und Stornierung

Der Preis steht bei der Buchung fest und ändert sich weder durch Verkehr noch durch Wartezeit.

Stornierungen mehr als 24 Stunden im Voraus sind kostenlos.`,
        botao: {
            buttonText: "Transfer nach Braga buchen",
            subtext: "Sofortige Bestätigung · Kostenlose Stornierung bis 24 Stunden",
        },
    },
};

interface Plano {
    slug: string;
    distanceKm: number;
    durationMin: number;
    airportCode: string;
    order: number;
    imagem: { ficheiro: string; alt: string; credit: string };
    textos: Record<Idioma, Texto>;
}

const PLANOS: Plano[] = [
    {
        slug: "braga",
        distanceKm: 61,
        durationMin: 45,
        airportCode: "OPO",
        order: 3,
        imagem: {
            ficheiro: "braga-bom-jesus.jpg",
            alt: "Vista do Santuário do Bom Jesus do Monte sobre a cidade de Braga",
            credit: "Carlos Luis M C da Cruz, via Wikimedia Commons (CC0)",
        },
        textos: BRAGA,
    },
    {
        slug: "aveiro",
        distanceKm: 88,
        durationMin: 65,
        airportCode: "OPO",
        order: 4,
        imagem: {
            ficheiro: "aveiro-canal-central.jpg",
            alt: "Moliceiros no Canal Central de Aveiro, com as fachadas de arte nova ao fundo",
            credit: "Vlach Pavel, via Wikimedia Commons (CC0)",
        },
        textos: AVEIRO,
    },
];

const IDIOMAS: Idioma[] = ["pt", "en", "fr", "es", "de"];
const PASTA_IMAGENS = path.resolve(process.cwd(), ".imagens-temp");

const payload = await getPayload({ config });
const editorConfig = await editorConfigFactory.default({ config: payload.config });

/** O corpo: um bloco de texto seguido de um botão. */
const corpoDe = (markdown: string, botao: { buttonText: string; subtext: string }) => [
    {
        blockType: "richText" as const,
        content: convertMarkdownToLexical({ editorConfig, markdown }),
    },
    {
        blockType: "callToAction" as const,
        linkType: "bookingForm" as const,
        variant: "primary" as const,
        alignment: "center" as const,
        buttonText: botao.buttonText,
        subtext: botao.subtext,
    },
];

for (const plano of PLANOS) {
    const jaExiste = await payload.find({
        collection: "destinations",
        where: { slug: { equals: plano.slug } },
        limit: 1,
        depth: 0,
    });

    if (jaExiste.docs.length > 0) {
        console.error(`  ${plano.slug}: já existe (id ${jaExiste.docs[0].id}). Saltado.`);
        continue;
    }

    // A imagem primeiro: sem ela o destino fica com um cartão cinzento.
    const media = await payload.create({
        collection: "media",
        filePath: path.join(PASTA_IMAGENS, plano.imagem.ficheiro),
        data: { alt: plano.imagem.alt, credit: plano.imagem.credit },
    });
    console.log(`  ${plano.slug}: imagem carregada (id ${media.id})`);

    const pt = plano.textos.pt;

    const criado = await payload.create({
        collection: "destinations",
        locale: "pt",
        data: {
            slug: plano.slug,
            _status: "published",
            title: pt.title,
            city: pt.city,
            subtitle: pt.subtitle,
            summary: pt.summary,
            image: media.id,
            body: corpoDe(pt.corpo, pt.botao) as never,
            highlights: pt.highlights.map((text) => ({ text })),
            faq: pt.faq.map((f) => ({ ...f })),
            airport: { name: pt.airportName, code: plano.airportCode },
            route: {
                origin: pt.origin,
                distanceKm: plano.distanceKm,
                durationMin: plano.durationMin,
                // `priceFrom` fica vazio de propósito: a aplicação calcula o «desde» com o
                // motor, a partir da estrada que mede entre a origem e a cidade. Um número
                // escrito aqui à mão divergiria à primeira alteração de preços.
            },
            order: plano.order,
            seo: { ...pt.seo },
        },
    });
    console.log(`  ${plano.slug}: criado em português (id ${criado.id})`);

    /*
     * Os `id` dos blocos que o Payload acabou de atribuir.
     *
     * Que blocos existem é partilhado por todos os idiomas; só o conteúdo deles é
     * localizado. Enviar blocos novos, sem `id`, em cada tradução substituiria os do
     * português em vez de os traduzir — e no fim ficariam cinco versões a lutar pelo
     * mesmo lugar.
     */
    const molde = await payload.findByID({
        collection: "destinations",
        id: criado.id,
        locale: "pt",
        depth: 0,
        draft: true,
    });
    const ids = (Array.isArray(molde.body) ? molde.body : []).map(
        (b) => (b as { id?: string }).id
    );

    for (const locale of IDIOMAS.filter((l) => l !== "pt")) {
        const t = plano.textos[locale];
        const corpo = corpoDe(t.corpo, t.botao).map((b, i) => ({ ...b, id: ids[i] }));

        await payload.update({
            collection: "destinations",
            id: criado.id,
            locale,
            data: {
                _status: "published",
                title: t.title,
                city: t.city,
                subtitle: t.subtitle,
                summary: t.summary,
                body: corpo as never,
                highlights: t.highlights.map((text) => ({ text })),
                faq: t.faq.map((f) => ({ ...f })),
                // Os grupos vão inteiros: `airport.code`, `route.distanceKm` e
                // `route.durationMin` não são localizados, e enviar só o campo traduzido
                // arriscava substituí-los em vez de os fundir.
                airport: { name: t.airportName, code: plano.airportCode },
                route: {
                    origin: t.origin,
                    distanceKm: plano.distanceKm,
                    durationMin: plano.durationMin,
                },
                seo: { ...t.seo },
            },
        });
        console.log(`  ${plano.slug}/${locale}: traduzido`);
    }
}

console.log("Feito.");
process.exit(0);
