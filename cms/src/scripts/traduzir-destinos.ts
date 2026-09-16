import { convertMarkdownToLexical, editorConfigFactory } from "@payloadcms/richtext-lexical";
import { getPayload } from "payload";

import config from "../../payload.config";

/**
 * Traduz os destinos para francês, espanhol e alemão.
 *
 * Corre-se uma vez: `npm run traduzir:destinos`. É idempotente — voltar a correr
 * reescreve o mesmo texto.
 *
 * ## Porque um script e não o painel
 *
 * São dois destinos × três idiomas × onze campos, mais o corpo. Setenta e tal
 * caixas para preencher à mão é onde se esquece uma e se descobre meses depois.
 *
 * ## O corpo tem de manter os blocos que já existem
 *
 * No Payload, **que blocos existem** é partilhado por todos os idiomas; só o que
 * está dentro deles é que é localizado. Enviar um `body` com menos blocos do que
 * o português tem apagá-los-ia em todos os idiomas ao mesmo tempo.
 *
 * Por isso não se constrói o corpo do zero: lê-se o português, e substitui-se
 * bloco a bloco, pela ordem, mantendo os `id`. Um destino com mais blocos de
 * texto do que traduções fica com os que sobram em português — visível e
 * corrigível, ao contrário de desaparecerem.
 *
 * ## O que NÃO se traduz
 *
 * Nomes próprios de auto-estradas (A28, A41, VCI), o código IATA, os topónimos
 * (Largo da Oliveira, Campanhã) e o nome da cidade. Traduzir uma morada é torná-la
 * inútil para quem a tem de encontrar.
 */

type Traducao = {
    title: string;
    city: string;
    subtitle: string;
    summary: string;
    origin: string;
    airportName: string;
    highlights: string[];
    faq: Array<{ question: string; answer: string }>;
    seo: { title: string; description: string };
    /** Um markdown por bloco de texto, pela ordem em que aparecem no português. */
    corpos: string[];
    /** Um par por bloco de acção, pela ordem. */
    botoes: Array<{ buttonText: string; subtext: string }>;
};

const PORTO: Record<string, Traducao> = {
    fr: {
        title: "Transfert de l'aéroport de Porto vers la ville",
        city: "Porto",
        subtitle:
            "Du terminal à la porte de votre logement, avec un chauffeur qui vous attend et un prix fixé avant le départ.",
        summary:
            "Liaison directe entre l'aéroport Francisco Sá Carneiro et n'importe quel point de Porto. Environ 15 kilomètres, 25 minutes, avec une heure d'attente incluse et le suivi du vol.",
        origin: "Aéroport Francisco Sá Carneiro (OPO), Maia",
        airportName: "Aéroport Francisco Sá Carneiro",
        highlights: [
            "Une heure d'attente gratuite sur les transferts aéroport",
            "Chauffeur dans le hall d'arrivée, avec une pancarte à votre nom",
            "Nous suivons votre vol — un retard décale la prise en charge automatiquement",
            "Wi-Fi, eau et chargeurs USB dans tous les véhicules",
            "Prix fixé à la réservation, sans supplément pour les embouteillages",
        ],
        faq: [
            {
                question: "Combien de temps faut-il de l'aéroport au centre de Porto ?",
                answer: "Environ 25 minutes par l'A28 et la VCI, en conditions normales. Aux heures de pointe, entre 8h00 et 9h30 et de 17h30 à 19h00, comptez 40 à 45 minutes.",
            },
            {
                question: "Et si mon vol a du retard ?",
                answer: "Vous n'avez rien à faire. Nous suivons le numéro de vol indiqué lors de la réservation et la prise en charge s'ajuste à l'heure réelle d'arrivée. Les transferts aéroport comprennent une heure d'attente gratuite à partir de l'heure prévue.",
            },
            {
                question: "Allez-vous jusqu'à Gaia, Foz ou Matosinhos ?",
                answer: "Oui. Le service est de porte à porte dans toute l'aire métropolitaine de Porto. Indiquez l'adresse exacte lors de la réservation et le prix est calculé pour cette destination.",
            },
            {
                question: "Où est-ce que je trouve le chauffeur à l'arrivée ?",
                answer: "Dans le hall d'arrivée, après la douane, avec une pancarte à votre nom. L'aéroport n'a qu'un seul terminal, il n'y a donc aucun risque de se manquer.",
            },
            {
                question: "Puis-je demander un siège enfant ?",
                answer: "Oui, indiquez-le lors de la réservation, avec l'âge de l'enfant, pour que nous choisissions le modèle adapté.",
            },
        ],
        seo: {
            title: "Transfert aéroport de Porto | Way2Go",
            description:
                "Transfert privé de l'aéroport Francisco Sá Carneiro vers Porto. Chauffeur qui vous attend, une heure d'attente incluse et prix fixé à la réservation.",
        },
        corpos: [
            `## Du terminal au centre

L'aéroport Francisco Sá Carneiro se trouve à Pedras Rubras, dans la commune de Maia, à environ 15 kilomètres du centre de Porto. Par l'A28 et la VCI, le trajet prend en général 25 minutes.

Aux heures de pointe — entre 8h00 et 9h30, et de 17h30 à 19h00 — la VCI se charge, et le même trajet peut prendre 40 à 45 minutes. Si vous avez un rendez-vous, prévoyez cette marge.

## Où le chauffeur vous attend

Dans le hall d'arrivée, après la douane, avec une pancarte à votre nom. Nous suivons le numéro de vol que vous indiquez lors de la réservation : un retard ne vous demande donc rien, la prise en charge se décale toute seule.

Les transferts aéroport comprennent une heure d'attente gratuite à partir de l'heure prévue. C'est largement suffisant pour le contrôle des frontières et les bagages, même un mauvais jour.

## Ce qui est compris

Tous les véhicules disposent du Wi-Fi, d'eau et de chargeurs USB. Le service est de porte à porte : du point exact de prise en charge jusqu'à l'adresse indiquée, sans arrêt intermédiaire ni correspondance.

Les sièges enfant peuvent être demandés lors de la réservation.

## Quand le transfert vaut la peine

La ligne E du métro relie l'aéroport à Trindade en une demi-heure environ, et c'est une bonne option si vous voyagez léger. Un transfert privé a davantage de sens quand vous :

- arrivez tard le soir ou avant les premiers métros ;
- voyagez avec de jeunes enfants ou des bagages encombrants ;
- logez hors du centre — à Foz, Gaia ou Matosinhos ;
- voyagez en groupe, où le coût par personne se rapproche du ticket de métro ;
- arrivez pour travailler et avez besoin d'une heure précise.

## Prix et annulation

Le prix est fixé à la réservation et ne change ni avec la circulation ni avec le temps d'attente.

Les annulations faites plus de 24 heures à l'avance sont sans frais.`,
        ],
        botoes: [
            { buttonText: "Réserver mon transfert vers Porto", subtext: "" },
            {
                buttonText: "Réserver mon transfert vers Porto",
                subtext: "Confirmation immédiate · Annulation gratuite jusqu'à 24 heures",
            },
        ],
    },

    es: {
        title: "Traslado del aeropuerto de Oporto a la ciudad",
        city: "Oporto",
        subtitle:
            "Desde la terminal hasta la puerta de su alojamiento, con conductor esperándole y precio cerrado antes de salir.",
        summary:
            "Enlace directo entre el aeropuerto Francisco Sá Carneiro y cualquier punto de Oporto. Unos 15 kilómetros, 25 minutos, con una hora de espera incluida y seguimiento del vuelo.",
        origin: "Aeropuerto Francisco Sá Carneiro (OPO), Maia",
        airportName: "Aeropuerto Francisco Sá Carneiro",
        highlights: [
            "Una hora de espera gratuita en los traslados de aeropuerto",
            "Conductor en la sala de llegadas, con un cartel con su nombre",
            "Seguimos su vuelo — un retraso ajusta la recogida automáticamente",
            "Wi-Fi, agua y cargadores USB en todos los vehículos",
            "Precio cerrado en la reserva, sin recargos por tráfico",
        ],
        faq: [
            {
                question: "¿Cuánto se tarda del aeropuerto al centro de Oporto?",
                answer: "Unos 25 minutos por la A28 y la VCI, en condiciones normales. En hora punta, entre las 8:00 y las 9:30 y de 17:30 a 19:00, cuente con 40 a 45 minutos.",
            },
            {
                question: "¿Y si mi vuelo se retrasa?",
                answer: "No tiene que hacer nada. Seguimos el número de vuelo indicado en la reserva y la recogida se ajusta a la hora real de llegada. Los traslados de aeropuerto incluyen una hora de espera gratuita desde la hora prevista.",
            },
            {
                question: "¿Me llevan a Gaia, Foz o Matosinhos?",
                answer: "Sí. El servicio es puerta a puerta en toda el área metropolitana de Oporto. Indique la dirección exacta en la reserva y el precio se calcula para ese destino.",
            },
            {
                question: "¿Dónde encuentro al conductor al llegar?",
                answer: "En la sala de llegadas, después de la aduana, con un cartel con su nombre. El aeropuerto tiene una única terminal, así que no hay posibilidad de confusión.",
            },
            {
                question: "¿Puedo pedir silla infantil?",
                answer: "Sí, indíquelo en la reserva, con la edad del niño, para que elijamos el modelo adecuado.",
            },
        ],
        seo: {
            title: "Traslado aeropuerto de Oporto | Way2Go",
            description:
                "Traslado privado del aeropuerto Francisco Sá Carneiro a Oporto. Conductor esperándole, una hora de espera incluida y precio cerrado en la reserva.",
        },
        corpos: [
            `## De la terminal al centro

El aeropuerto Francisco Sá Carneiro está en Pedras Rubras, en el municipio de Maia, a unos 15 kilómetros del centro de Oporto. Por la A28 y la VCI, el viaje suele durar 25 minutos.

En hora punta — entre las 8:00 y las 9:30, y de 17:30 a 19:00 — la VCI se congestiona, y el mismo recorrido puede llevar de 40 a 45 minutos. Si tiene una cita, cuente con ese margen.

## Dónde le espera el conductor

En la sala de llegadas, después de la aduana, con un cartel con su nombre. Seguimos el número de vuelo que indique en la reserva, así que un retraso no le obliga a hacer nada: la recogida se ajusta sola.

Los traslados de aeropuerto incluyen una hora de espera gratuita desde la hora prevista. Es tiempo más que suficiente para el control de fronteras y el equipaje, incluso en un mal día.

## Qué está incluido

Todos los vehículos tienen Wi-Fi, agua y cargadores USB. El servicio es puerta a puerta: desde el punto exacto de recogida hasta la dirección indicada, sin paradas intermedias ni transbordos.

Las sillas infantiles pueden pedirse en la reserva.

## Cuándo compensa el traslado

La línea E del metro une el aeropuerto con Trindade en media hora aproximadamente, y es una buena opción si viaja ligero. Un traslado privado tiene más sentido cuando:

- llega de madrugada o al final de la noche, fuera del horario del metro;
- viaja con niños pequeños o con equipaje voluminoso;
- se aloja fuera del centro — en Foz, Gaia o Matosinhos;
- viaja en grupo, donde el coste por persona se acerca al billete de metro;
- llega para trabajar y necesita una hora fija.

## Precio y cancelación

El precio se cierra en la reserva y no cambia con el tráfico ni con el tiempo de espera.

Las cancelaciones hechas con más de 24 horas de antelación no tienen coste.`,
        ],
        botoes: [
            { buttonText: "Reservar traslado a Oporto", subtext: "" },
            {
                buttonText: "Reservar traslado a Oporto",
                subtext: "Confirmación inmediata · Cancelación gratuita hasta 24 horas",
            },
        ],
    },

    de: {
        title: "Flughafentransfer Porto in die Stadt",
        city: "Porto",
        subtitle:
            "Vom Terminal bis vor Ihre Unterkunft, mit wartendem Fahrer und festem Preis schon vor der Abfahrt.",
        summary:
            "Direkte Verbindung zwischen dem Flughafen Francisco Sá Carneiro und jedem Punkt in Porto. Rund 15 Kilometer, 25 Minuten, mit einer Stunde Wartezeit inklusive und Flugverfolgung.",
        origin: "Flughafen Francisco Sá Carneiro (OPO), Maia",
        airportName: "Flughafen Francisco Sá Carneiro",
        highlights: [
            "Eine Stunde kostenlose Wartezeit bei Flughafentransfers",
            "Fahrer in der Ankunftshalle, mit Schild mit Ihrem Namen",
            "Wir verfolgen Ihren Flug — eine Verspätung verschiebt die Abholung automatisch",
            "WLAN, Wasser und USB-Ladegeräte in allen Fahrzeugen",
            "Fester Preis bei der Buchung, ohne Zuschläge für Verkehr",
        ],
        faq: [
            {
                question: "Wie lange dauert es vom Flughafen bis ins Zentrum von Porto?",
                answer: "Etwa 25 Minuten über die A28 und die VCI, bei normalen Verhältnissen. Zur Hauptverkehrszeit, zwischen 8:00 und 9:30 Uhr sowie von 17:30 bis 19:00 Uhr, sollten Sie 40 bis 45 Minuten einplanen.",
            },
            {
                question: "Und wenn mein Flug Verspätung hat?",
                answer: "Sie müssen nichts tun. Wir verfolgen die bei der Buchung angegebene Flugnummer, und die Abholung richtet sich nach der tatsächlichen Ankunftszeit. Flughafentransfers enthalten eine Stunde kostenlose Wartezeit ab der planmäßigen Zeit.",
            },
            {
                question: "Fahren Sie auch nach Gaia, Foz oder Matosinhos?",
                answer: "Ja. Der Service ist Tür zu Tür im gesamten Großraum Porto. Geben Sie bei der Buchung die genaue Adresse an, und der Preis wird für dieses Ziel berechnet.",
            },
            {
                question: "Wo finde ich den Fahrer bei der Ankunft?",
                answer: "In der Ankunftshalle, nach dem Zoll, mit einem Schild mit Ihrem Namen. Der Flughafen hat nur ein Terminal, eine Verwechslung ist also ausgeschlossen.",
            },
            {
                question: "Kann ich einen Kindersitz anfordern?",
                answer: "Ja, geben Sie das bei der Buchung an, zusammen mit dem Alter des Kindes, damit wir das passende Modell mitbringen.",
            },
        ],
        seo: {
            title: "Flughafentransfer Porto | Way2Go",
            description:
                "Privater Transfer vom Flughafen Francisco Sá Carneiro nach Porto. Wartender Fahrer, eine Stunde Wartezeit inklusive und fester Preis bei der Buchung.",
        },
        corpos: [
            `## Vom Terminal ins Zentrum

Der Flughafen Francisco Sá Carneiro liegt in Pedras Rubras, in der Gemeinde Maia, rund 15 Kilometer von der Innenstadt Portos entfernt. Über die A28 und die VCI dauert die Fahrt in der Regel 25 Minuten.

Zur Hauptverkehrszeit — zwischen 8:00 und 9:30 Uhr sowie von 17:30 bis 19:00 Uhr — staut sich die VCI, und dieselbe Strecke kann 40 bis 45 Minuten dauern. Wenn Sie einen Termin haben, planen Sie diesen Puffer ein.

## Wo der Fahrer auf Sie wartet

In der Ankunftshalle, nach dem Zoll, mit einem Schild mit Ihrem Namen. Wir verfolgen die Flugnummer, die Sie bei der Buchung angeben — eine Verspätung verlangt Ihnen also nichts ab: die Abholung verschiebt sich von selbst.

Flughafentransfers enthalten eine Stunde kostenlose Wartezeit ab der planmäßigen Zeit. Das reicht für Grenzkontrolle und Gepäck bequem aus, selbst an einem schlechten Tag.

## Was enthalten ist

Alle Fahrzeuge haben WLAN, Wasser und USB-Ladegeräte. Der Service ist Tür zu Tür: vom genauen Abholpunkt bis zur angegebenen Adresse, ohne Zwischenstopps und ohne Umsteigen.

Kindersitze können bei der Buchung angefordert werden.

## Wann sich ein Transfer lohnt

Die Metrolinie E verbindet den Flughafen in etwa einer halben Stunde mit Trindade und ist eine gute Wahl, wenn Sie leicht reisen. Ein privater Transfer ist sinnvoller, wenn Sie:

- spät nachts ankommen oder bevor die Metro fährt;
- mit kleinen Kindern oder sperrigem Gepäck reisen;
- außerhalb des Zentrums wohnen — in Foz, Gaia oder Matosinhos;
- in der Gruppe reisen, wo die Kosten pro Person an ein Metroticket heranreichen;
- zum Arbeiten anreisen und eine feste Uhrzeit brauchen.

## Preis und Stornierung

Der Preis steht bei der Buchung fest und ändert sich weder durch Verkehr noch durch Wartezeit.

Stornierungen mehr als 24 Stunden im Voraus sind kostenlos.`,
        ],
        botoes: [
            { buttonText: "Transfer nach Porto buchen", subtext: "" },
            {
                buttonText: "Transfer nach Porto buchen",
                subtext: "Sofortige Bestätigung · Kostenlose Stornierung bis 24 Stunden",
            },
        ],
    },
};

const GUIMARAES: Record<string, Traducao> = {
    fr: {
        title: "Transfert de l'aéroport de Porto vers Guimarães",
        city: "Guimarães",
        subtitle:
            "Du terminal au centre historique en une cinquantaine de minutes, sans correspondance et avec un prix fixé avant le départ.",
        summary:
            "Liaison directe entre l'aéroport Francisco Sá Carneiro et Guimarães. Environ 50 kilomètres par l'A41, l'A3 et l'A7, avec une heure d'attente incluse et le suivi du vol.",
        origin: "Aéroport Francisco Sá Carneiro (OPO), Maia",
        airportName: "Aéroport Francisco Sá Carneiro",
        highlights: [
            "Environ 50 minutes, en direct et sans correspondance",
            "Une heure d'attente gratuite sur les transferts aéroport",
            "Chauffeur dans le hall d'arrivée, avec une pancarte à votre nom",
            "Dépose au point accessible le plus proche si vous logez en zone piétonne",
            "Prix fixé à la réservation, sans supplément pour les embouteillages",
        ],
        faq: [
            {
                question: "Combien de temps faut-il de l'aéroport à Guimarães ?",
                answer: "Environ 45 à 50 minutes par l'A41, l'A3 et l'A7, en conditions normales. Le lundi matin et le vendredi en fin de journée, quand l'A3 se charge, comptez une heure.",
            },
            {
                question: "Le chauffeur peut-il atteindre mon hôtel dans le centre historique ?",
                answer: "Une bonne partie du centre historique est piétonne ou à circulation restreinte. Nous vous déposons au point accessible le plus proche — généralement à quelques minutes à pied — et nous aidons avec les bagages. Indiquez l'adresse exacte lors de la réservation pour que nous préparions la dépose.",
            },
            {
                question: "Est-ce intéressant par rapport au train ?",
                answer: "Pour qui arrive en avion, oui. Le train part de Porto et met environ une heure et quart, mais depuis l'aéroport il faut d'abord prendre le métro puis changer de gare — avec des bagages, le total dépasse les deux heures. Le transfert fait le trajet en cinquante minutes, en direct.",
            },
            {
                question: "Et si mon vol a du retard ?",
                answer: "Vous n'avez rien à faire. Nous suivons le numéro de vol indiqué lors de la réservation et la prise en charge s'ajuste à l'heure réelle d'arrivée. Une heure d'attente gratuite est incluse à partir de l'heure prévue.",
            },
            {
                question: "Faites-vous aussi le trajet de Guimarães vers l'aéroport ?",
                answer: "Oui, dans les deux sens. Pour les vols tôt le matin, nous conseillons de partir avec de la marge : l'A3 en direction de Porto se charge à partir de sept heures et demie.",
            },
        ],
        seo: {
            title: "Transfert aéroport de Porto vers Guimarães | Way2Go",
            description:
                "Transfert privé de l'aéroport Francisco Sá Carneiro vers Guimarães. Cinquante minutes en direct, une heure d'attente incluse et prix fixé à la réservation.",
        },
        corpos: [
            `## De l'aéroport au berceau du Portugal

Guimarães se trouve à environ 50 kilomètres de l'aéroport Francisco Sá Carneiro. Par l'A41, puis l'A3 et enfin l'A7, le trajet prend généralement 45 à 50 minutes.

C'est de l'autoroute presque tout du long, sans les embouteillages de la VCI qui touchent ceux qui vont vers Porto. Les exceptions sont les lundis matin et les vendredis en fin de journée, quand l'A3 se charge entre Braga et Porto — comptez une heure à ces moments-là.

## Où le chauffeur vous attend

Dans le hall d'arrivée, après la douane, avec une pancarte à votre nom. Nous suivons le numéro de vol que vous indiquez lors de la réservation : un retard ne vous demande donc rien, la prise en charge se décale toute seule.

Les transferts aéroport comprennent une heure d'attente gratuite à partir de l'heure prévue.

## Le centre historique est à accès restreint

Cela vaut la peine de le savoir avant de réserver : une bonne partie du centre historique de Guimarães est piétonne ou à circulation restreinte. Les rues autour du Largo da Oliveira ne sont pas accessibles en voiture.

Le service est de porte à porte jusqu'où la voirie le permet. Si votre logement se trouve dans la zone piétonne, le chauffeur vous dépose au point accessible le plus proche — généralement à quelques minutes à pied — et aide avec les bagages. Indiquez l'adresse exacte lors de la réservation pour que nous préparions le meilleur point de dépose.

## Ce qu'il y a à voir

Le centre historique est inscrit au patrimoine mondial de l'UNESCO depuis 2001, et la ville a été Capitale européenne de la culture en 2012. C'est ici que se trouve la muraille portant la phrase « Le Portugal est né ici » — Afonso Henriques, le premier roi, est lié à la ville.

À quelques minutes les uns des autres :

- le château de Guimarães et le palais des ducs de Bragance ;
- le Largo da Oliveira et la Praça de São Tiago, le cœur de la vieille ville ;
- le téléphérique de la Penha, qui monte la montagne avec vue sur la vallée.

## Est-ce intéressant par rapport au train ?

Ici la réponse est plus nette que pour d'autres destinations, et mérite d'être dite franchement.

Il y a un train pour Guimarães, mais il part de Porto — de la gare de Campanhã — et met environ une heure et quart. Depuis l'aéroport, il faut d'abord prendre le métro jusqu'à la ville puis changer pour le train : avec les bagages et les attentes, le total dépasse facilement les deux heures.

Le transfert fait le trajet en cinquante minutes, en direct, du terminal à la porte. Pour qui arrive en avion, la différence est nette.

## Prix et annulation

Le prix est fixé à la réservation et ne change ni avec la circulation ni avec le temps d'attente.

Les annulations faites plus de 24 heures à l'avance sont sans frais.`,
        ],
        botoes: [],
    },

    es: {
        title: "Traslado del aeropuerto de Oporto a Guimarães",
        city: "Guimarães",
        subtitle:
            "De la terminal al centro histórico en unos cincuenta minutos, sin transbordos y con precio cerrado antes de salir.",
        summary:
            "Enlace directo entre el aeropuerto Francisco Sá Carneiro y Guimarães. Unos 50 kilómetros por la A41, A3 y A7, con una hora de espera incluida y seguimiento del vuelo.",
        origin: "Aeropuerto Francisco Sá Carneiro (OPO), Maia",
        airportName: "Aeropuerto Francisco Sá Carneiro",
        highlights: [
            "Unos 50 minutos, directo y sin transbordos",
            "Una hora de espera gratuita en los traslados de aeropuerto",
            "Conductor en la sala de llegadas, con un cartel con su nombre",
            "Bajada en el punto accesible más cercano si se aloja en la zona peatonal",
            "Precio cerrado en la reserva, sin recargos por tráfico",
        ],
        faq: [
            {
                question: "¿Cuánto se tarda del aeropuerto a Guimarães?",
                answer: "Unos 45 a 50 minutos por la A41, A3 y A7, en condiciones normales. Los lunes por la mañana y los viernes al final de la tarde, cuando la A3 acumula tráfico, cuente con una hora.",
            },
            {
                question: "¿Puede el conductor llegar a mi hotel en el centro histórico?",
                answer: "Buena parte del centro histórico es peatonal o de circulación restringida. Le llevamos al punto accesible más cercano — normalmente a pocos minutos a pie — y ayudamos con el equipaje. Indique la dirección exacta en la reserva para que preparemos la bajada.",
            },
            {
                question: "¿Compensa frente al tren?",
                answer: "Para quien llega en avión, sí. El tren sale de Oporto y tarda alrededor de una hora y cuarto, pero desde el aeropuerto hay que coger primero el metro y luego cambiar de estación — con equipaje, el total pasa de dos horas. El traslado hace el recorrido en cincuenta minutos, directo.",
            },
            {
                question: "¿Y si mi vuelo se retrasa?",
                answer: "No tiene que hacer nada. Seguimos el número de vuelo indicado en la reserva y la recogida se ajusta a la hora real de llegada. Se incluye una hora de espera gratuita desde la hora prevista.",
            },
            {
                question: "¿Hacen también el trayecto de Guimarães al aeropuerto?",
                answer: "Sí, en ambas direcciones. Para vuelos de primera hora recomendamos salir con margen: la A3 en sentido Oporto se congestiona a partir de las siete y media.",
            },
        ],
        seo: {
            title: "Traslado aeropuerto de Oporto a Guimarães | Way2Go",
            description:
                "Traslado privado del aeropuerto Francisco Sá Carneiro a Guimarães. Cincuenta minutos directo, una hora de espera incluida y precio cerrado en la reserva.",
        },
        corpos: [
            `## Del aeropuerto a la cuna de Portugal

Guimarães está a unos 50 kilómetros del aeropuerto Francisco Sá Carneiro. Por la A41, con enlace a la A3 y después a la A7, el viaje se hace normalmente en 45 a 50 minutos.

Es un recorrido de autopista casi todo el camino, sin las retenciones de la VCI que afectan a quien va a Oporto. Las excepciones son los lunes por la mañana y los viernes al final de la tarde, cuando la A3 acumula tráfico entre Braga y Oporto — en esos momentos, cuente con una hora.

## Dónde le espera el conductor

En la sala de llegadas, después de la aduana, con un cartel con su nombre. Seguimos el número de vuelo que indique en la reserva, así que un retraso no le obliga a hacer nada: la recogida se ajusta sola.

Los traslados de aeropuerto incluyen una hora de espera gratuita desde la hora prevista.

## El centro histórico es de acceso restringido

Vale la pena saberlo antes de reservar: buena parte del centro histórico de Guimarães es peatonal o tiene circulación restringida. Calles como las que rodean el Largo da Oliveira no son accesibles en coche.

El servicio es puerta a puerta hasta donde la vía lo permita. Si su alojamiento está dentro de la zona peatonal, el conductor le deja en el punto accesible más cercano — normalmente a pocos minutos a pie — y ayuda con el equipaje. Indique la dirección exacta en la reserva para que preparemos el mejor punto de bajada.

## Qué hay que ver

El centro histórico es Patrimonio Mundial de la UNESCO desde 2001, y la ciudad fue Capital Europea de la Cultura en 2012. Aquí está la muralla con la frase «Aquí nació Portugal» — Afonso Henriques, el primer rey, está ligado a la ciudad.

A pocos minutos unos de otros:

- el castillo de Guimarães y el Palacio de los Duques de Braganza;
- el Largo da Oliveira y la Praça de São Tiago, el corazón de la ciudad vieja;
- el teleférico de la Penha, que sube a la montaña con vistas sobre el valle.

## ¿Compensa frente al tren?

Aquí la respuesta es más clara que en otros destinos, y vale la pena ser directo.

Hay tren a Guimarães, pero sale de Oporto — de la estación de Campanhã — y tarda alrededor de una hora y cuarto. Desde el aeropuerto hay que coger primero el metro hasta la ciudad y después cambiar al tren: con equipaje y esperas, el total pasa fácilmente de dos horas.

El traslado hace el recorrido en cincuenta minutos, directo, de la terminal a la puerta. Para quien llega en avión, la diferencia es grande.

## Precio y cancelación

El precio se cierra en la reserva y no cambia con el tráfico ni con el tiempo de espera.

Las cancelaciones hechas con más de 24 horas de antelación no tienen coste.`,
        ],
        botoes: [],
    },

    de: {
        title: "Flughafentransfer Porto nach Guimarães",
        city: "Guimarães",
        subtitle:
            "Vom Terminal in die Altstadt in etwa fünfzig Minuten, ohne Umsteigen und mit festem Preis schon vor der Abfahrt.",
        summary:
            "Direkte Verbindung zwischen dem Flughafen Francisco Sá Carneiro und Guimarães. Rund 50 Kilometer über A41, A3 und A7, mit einer Stunde Wartezeit inklusive und Flugverfolgung.",
        origin: "Flughafen Francisco Sá Carneiro (OPO), Maia",
        airportName: "Flughafen Francisco Sá Carneiro",
        highlights: [
            "Etwa 50 Minuten, direkt und ohne Umsteigen",
            "Eine Stunde kostenlose Wartezeit bei Flughafentransfers",
            "Fahrer in der Ankunftshalle, mit Schild mit Ihrem Namen",
            "Absetzen am nächstgelegenen zugänglichen Punkt, wenn Sie in der Fußgängerzone wohnen",
            "Fester Preis bei der Buchung, ohne Zuschläge für Verkehr",
        ],
        faq: [
            {
                question: "Wie lange dauert es vom Flughafen nach Guimarães?",
                answer: "Etwa 45 bis 50 Minuten über A41, A3 und A7, bei normalen Verhältnissen. An Montagmorgen und Freitagabenden, wenn sich die A3 füllt, sollten Sie eine Stunde einplanen.",
            },
            {
                question: "Kommt der Fahrer bis zu meinem Hotel in der Altstadt?",
                answer: "Ein großer Teil der Altstadt ist Fußgängerzone oder verkehrsberuhigt. Wir bringen Sie zum nächstgelegenen zugänglichen Punkt — meist wenige Gehminuten entfernt — und helfen mit dem Gepäck. Geben Sie bei der Buchung die genaue Adresse an, damit wir das Absetzen planen können.",
            },
            {
                question: "Lohnt es sich gegenüber dem Zug?",
                answer: "Für alle, die mit dem Flugzeug ankommen, ja. Der Zug fährt ab Porto und braucht etwa eine Stunde und eine Viertelstunde, aber vom Flughafen aus müssen Sie erst die Metro nehmen und dann den Bahnhof wechseln — mit Gepäck überschreitet das Ganze leicht zwei Stunden. Der Transfer schafft die Strecke in fünfzig Minuten, direkt.",
            },
            {
                question: "Und wenn mein Flug Verspätung hat?",
                answer: "Sie müssen nichts tun. Wir verfolgen die bei der Buchung angegebene Flugnummer, und die Abholung richtet sich nach der tatsächlichen Ankunftszeit. Eine Stunde kostenlose Wartezeit ab der planmäßigen Zeit ist enthalten.",
            },
            {
                question: "Fahren Sie auch von Guimarães zum Flughafen?",
                answer: "Ja, in beide Richtungen. Für Flüge am frühen Morgen empfehlen wir, mit Puffer loszufahren: die A3 Richtung Porto füllt sich ab etwa halb acht.",
            },
        ],
        seo: {
            title: "Flughafentransfer Porto nach Guimarães | Way2Go",
            description:
                "Privater Transfer vom Flughafen Francisco Sá Carneiro nach Guimarães. Fünfzig Minuten direkt, eine Stunde Wartezeit inklusive und fester Preis bei der Buchung.",
        },
        corpos: [
            `## Vom Flughafen zur Wiege Portugals

Guimarães liegt rund 50 Kilometer vom Flughafen Francisco Sá Carneiro entfernt. Über die A41, mit Anschluss an die A3 und danach an die A7, dauert die Fahrt in der Regel 45 bis 50 Minuten.

Es ist fast durchgehend Autobahn, ohne die Staus auf der VCI, die Fahrten nach Porto selbst betreffen. Die Ausnahmen sind Montagmorgen und Freitagabend, wenn sich die A3 zwischen Braga und Porto füllt — planen Sie dann eine Stunde ein.

## Wo der Fahrer auf Sie wartet

In der Ankunftshalle, nach dem Zoll, mit einem Schild mit Ihrem Namen. Wir verfolgen die Flugnummer, die Sie bei der Buchung angeben — eine Verspätung verlangt Ihnen also nichts ab: die Abholung verschiebt sich von selbst.

Flughafentransfers enthalten eine Stunde kostenlose Wartezeit ab der planmäßigen Zeit.

## Die Altstadt ist nur eingeschränkt befahrbar

Das sollten Sie vor der Buchung wissen: Ein großer Teil der Altstadt von Guimarães ist Fußgängerzone oder verkehrsberuhigt. Straßen wie die rund um den Largo da Oliveira sind mit dem Auto nicht erreichbar.

Der Service ist Tür zu Tür, so weit die Straße es zulässt. Liegt Ihre Unterkunft in der Fußgängerzone, setzt der Fahrer Sie am nächstgelegenen zugänglichen Punkt ab — meist wenige Gehminuten entfernt — und hilft mit dem Gepäck. Geben Sie bei der Buchung die genaue Adresse an, damit wir den besten Punkt zum Absetzen planen können.

## Was es zu sehen gibt

Die Altstadt ist seit 2001 UNESCO-Weltkulturerbe, und die Stadt war 2012 Kulturhauptstadt Europas. Hier steht die Mauer mit dem Satz „Hier wurde Portugal geboren" — Afonso Henriques, der erste König, ist eng mit der Stadt verbunden.

Alles nur wenige Minuten voneinander entfernt:

- die Burg von Guimarães und der Palast der Herzöge von Bragança;
- der Largo da Oliveira und die Praça de São Tiago, das Herz der Altstadt;
- die Seilbahn auf die Penha, die den Berg hinauffährt mit Blick über das Tal.

## Lohnt es sich gegenüber dem Zug?

Hier ist die Antwort klarer als bei anderen Zielen, und es lohnt sich, deutlich zu werden.

Es gibt einen Zug nach Guimarães, aber er fährt ab Porto — vom Bahnhof Campanhã — und braucht etwa eine Stunde und eine Viertelstunde. Vom Flughafen aus müssen Sie zuerst die Metro in die Stadt nehmen und dann zum Zug wechseln: mit Gepäck und Wartezeiten überschreitet das Ganze leicht zwei Stunden.

Der Transfer schafft die Strecke in fünfzig Minuten, direkt, vom Terminal bis vor die Tür. Für alle, die mit dem Flugzeug ankommen, ist der Unterschied erheblich.

## Preis und Stornierung

Der Preis steht bei der Buchung fest und ändert sich weder durch Verkehr noch durch Wartezeit.

Stornierungen mehr als 24 Stunden im Voraus sind kostenlos.`,
        ],
        botoes: [],
    },
};

const TUDO: Record<string, Record<string, Traducao>> = {
    porto: PORTO,
    guimaraes: GUIMARAES,
};

const payload = await getPayload({ config });
const editorConfig = await editorConfigFactory.default({ config: payload.config });

for (const [slug, porIdioma] of Object.entries(TUDO)) {
    // O português é o molde: dá os `id` e a ordem dos blocos.
    const { docs } = await payload.find({
        collection: "destinations",
        locale: "pt",
        where: { slug: { equals: slug } },
        limit: 1,
        depth: 0,
        draft: true,
    });

    if (docs.length === 0) {
        console.error(`  ${slug}: não existe. Saltado.`);
        continue;
    }

    const molde = docs[0];
    const blocos = Array.isArray(molde.body) ? molde.body : [];

    for (const [locale, t] of Object.entries(porIdioma)) {
        // Substitui bloco a bloco, pela ordem, mantendo os `id` e os tipos. O que não
        // tiver tradução fica como está — em português, visível, em vez de desaparecer.
        let iTexto = 0;
        let iBotao = 0;

        const corpo = blocos.map((bruto) => {
            const b = bruto as Record<string, unknown>;

            if (b.blockType === "richText") {
                const markdown = t.corpos[iTexto++];
                if (!markdown) return b;
                return { ...b, content: convertMarkdownToLexical({ editorConfig, markdown }) };
            }

            if (b.blockType === "callToAction") {
                const botao = t.botoes[iBotao++];
                if (!botao) return b;
                return { ...b, buttonText: botao.buttonText, subtext: botao.subtext };
            }

            return b;
        });

        await payload.update({
            collection: "destinations",
            id: molde.id,
            locale: locale as "pt",
            data: {
                _status: "published",
                title: t.title,
                city: t.city,
                subtitle: t.subtitle,
                summary: t.summary,
                highlights: t.highlights.map((text) => ({ text })),
                faq: t.faq.map((f) => ({ ...f })),
                /*
                 * Os grupos vao INTEIROS, com os valores do molde por baixo.
                 *
                 * `airport.code` e `route.distanceKm` nao sao localizados: vivem uma so
                 * vez para todos os idiomas. Enviar o grupo so com o campo traduzido
                 * arriscava substitui-lo em vez de o fundir -- e perder o `distanceKm`
                 * era perder o «desde» que o motor calcula a partir dele.
                 */
                airport: { ...(molde.airport ?? {}), name: t.airportName },
                route: { ...(molde.route ?? {}), origin: t.origin },
                seo: { ...t.seo },
                body: corpo as never,
            },
        });

        console.log(`  ${slug}/${locale}: ${t.corpos.length} bloco(s) de texto, publicado`);
    }
}

console.log("Feito.");
process.exit(0);
