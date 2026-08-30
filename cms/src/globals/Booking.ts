import type { GlobalConfig } from "payload";

/**
 * O formulário de reserva e todo o funil que se lhe segue — 78 textos, de longe
 * a maior secção do site.
 *
 * A hierarquia repete a do dicionário em vez de a aplanar. Aplanar daria nomes
 * como `checkoutSummaryTotal` e pouparia alguns `group`, mas quebraria a forma
 * dos dados — e é justamente por a manter que ligar o site ao CMS, mais tarde,
 * não exige mexer nos componentes.
 *
 * A localização está declarada no nível mais alto de cada ramo: marcar um
 * `group` como `localized` localiza tudo o que está lá dentro. São oito
 * declarações em vez de setenta e oito.
 */
export const Booking: GlobalConfig = {
    slug: "booking",
    label: "Reserva",
    admin: {
        group: "Textos do site",
        description: "Formulário de reserva, escolha de viatura, pagamento e erros.",
    },
    fields: [
        { name: "title", type: "text", label: "Título", localized: true },
        { name: "route", type: "text", label: "Percurso", localized: true },
        { name: "pickup", type: "text", label: "Recolha", localized: true },
        { name: "dropoff", type: "text", label: "Destino", localized: true },
        { name: "datetime", type: "text", label: "Data e hora", localized: true },
        { name: "date", type: "text", label: "Data", localized: true },
        { name: "time", type: "text", label: "Hora", localized: true },
        { name: "details", type: "text", label: "Detalhes", localized: true },
        { name: "passengers", type: "text", label: "Passageiros", localized: true },
        { name: "luggage", type: "text", label: "Bagagem", localized: true },
        { name: "distanceKm", type: "text", label: "Distância (km)", localized: true },
        { name: "flight", type: "text", label: "Voo", localized: true },
        { name: "flightPlaceholder", type: "text", label: "Voo — texto de exemplo", localized: true },
        { name: "childSeat", type: "text", label: "Cadeira de criança", localized: true },
        { name: "contactInfo", type: "text", label: "Dados de contacto", localized: true },
        { name: "name", type: "text", label: "Nome", localized: true },
        { name: "email", type: "text", label: "E-mail", localized: true },
        { name: "confirmEmail", type: "text", label: "Confirmar e-mail", localized: true },
        { name: "whatsapp", type: "text", label: "WhatsApp", localized: true },
        {
            name: "gdpr",
            type: "group",
            label: "Consentimento RGPD",
            localized: true,
            fields: [
                { name: "text", type: "textarea", label: "Texto" },
                { name: "link", type: "text", label: "Texto da ligação" },
            ],
        },
        { name: "submit", type: "text", label: "Botão de submissão", localized: true },
        {
            name: "checkout",
            type: "group",
            label: "Pagamento",
            localized: true,
            fields: [
                { name: "chooseVehicle", type: "text", label: "Escolher viatura" },
                { name: "vehicleStepTitle", type: "text", label: "Título do passo da viatura" },
                { name: "continueFromForm", type: "text", label: "Continuar a partir do formulário" },
                { name: "continueToPay", type: "text", label: "Continuar para pagamento" },
                { name: "loadingVehicles", type: "text", label: "A carregar viaturas" },
                { name: "loadingCheckout", type: "text", label: "A carregar pagamento" },
                { name: "totalToPay", type: "text", label: "Total a pagar" },
                { name: "confirmPay", type: "text", label: "Confirmar e pagar" },
                { name: "processing", type: "text", label: "A processar" },
                { name: "back", type: "text", label: "Voltar" },
                { name: "noVehicles", type: "text", label: "Sem viaturas disponíveis" },
                { name: "stripeMissing", type: "text", label: "Stripe indisponível" },
                { name: "breakdownTitle", type: "text", label: "Título do detalhe de preço" },
                {
                    name: "summary",
                    type: "group",
                    label: "Resumo",
                    fields: [
                        { name: "title", type: "text", label: "Título" },
                        { name: "route", type: "text", label: "Percurso" },
                        { name: "when", type: "text", label: "Quando" },
                        { name: "vehicle", type: "text", label: "Viatura" },
                        { name: "extras", type: "text", label: "Extras" },
                        { name: "childSeat", type: "text", label: "Cadeira de criança" },
                        { name: "luggage", type: "text", label: "Bagagem" },
                        { name: "seats", type: "text", label: "Lugares" },
                        { name: "total", type: "text", label: "Total" },
                        { name: "updating", type: "text", label: "A actualizar" },
                        { name: "pendingPrice", type: "text", label: "Preço por apurar" },
                        { name: "none", type: "text", label: "Nenhum" },
                    ],
                },
                {
                    name: "vehicles",
                    type: "group",
                    label: "Classes de viatura",
                    fields: [
                        { name: "businessClass", type: "text", label: "Business" },
                        { name: "firstClass", type: "text", label: "First" },
                        { name: "businessVan", type: "text", label: "Business Van" },
                        { name: "businessHint", type: "text", label: "Business — descrição" },
                        { name: "firstHint", type: "text", label: "First — descrição" },
                        { name: "vanHint", type: "text", label: "Van — descrição" },
                        { name: "seats", type: "text", label: "Lugares" },
                    ],
                },
                {
                    name: "routePreview",
                    type: "group",
                    label: "Pré-visualização do percurso",
                    fields: [
                        { name: "title", type: "text", label: "Título" },
                        { name: "loading", type: "text", label: "A carregar" },
                        { name: "suggested", type: "text", label: "Sugerido" },
                        { name: "from", type: "text", label: "A partir de" },
                        { name: "distanceEta", type: "text", label: "Distância e tempo" },
                        { name: "distanceOnly", type: "text", label: "Só distância" },
                        { name: "etaNote", type: "text", label: "Nota sobre o tempo" },
                        { name: "availabilityNote", type: "text", label: "Nota sobre disponibilidade" },
                    ],
                },
                {
                    name: "breakdown",
                    type: "group",
                    label: "Detalhe do preço",
                    fields: [
                        { name: "baseFee", type: "text", label: "Taxa base" },
                        { name: "perKm", type: "text", label: "Por km" },
                        { name: "perMin", type: "text", label: "Por minuto" },
                        { name: "vehicleMultiplier", type: "text", label: "Multiplicador da viatura" },
                        { name: "timeSurcharge", type: "text", label: "Suplemento horário" },
                        { name: "minimumFare", type: "text", label: "Tarifa mínima" },
                    ],
                },
            ],
        },
        {
            name: "success",
            type: "group",
            label: "Confirmação",
            localized: true,
            fields: [
                { name: "title", type: "text", label: "Título" },
                { name: "message", type: "textarea", label: "Mensagem" },
                { name: "orderLabel", type: "text", label: "Rótulo da encomenda" },
                { name: "referenceHint", type: "text", label: "Nota sobre a referência" },
                { name: "close", type: "text", label: "Fechar" },
            ],
        },
        {
            name: "errors",
            type: "group",
            label: "Mensagens de erro",
            localized: true,
            admin: {
                description:
                    "São o que o cliente lê quando alguma coisa corre mal. Devem dizer o que aconteceu e o que fazer a seguir.",
            },
            fields: [
                { name: "generic", type: "text", label: "Erro genérico" },
                { name: "gdpr", type: "text", label: "Consentimento em falta" },
                { name: "emailMismatch", type: "text", label: "E-mails não coincidem" },
                { name: "distanceRequired", type: "text", label: "Distância obrigatória" },
                { name: "distancePending", type: "text", label: "Distância por apurar" },
            ],
        },
    ],
};
