<?php
/**
 * Plugin Name: Way2Go — Endpoint REST de Orçamentos
 * Description: Regista a rota REST personalizada que recebe pedidos de
 *              orçamento do formulário React (way2go.pt / Vercel) e os
 *              processa: envia alerta por e-mail e reserva espaço para
 *              integração futura com o TransferCRM.
 * Version:     1.0.0
 * Author:      Way2Go
 *
 * INSTRUÇÕES DE INSTALAÇÃO
 * ─────────────────────────
 * OPÇÃO A — Plugin dedicado (RECOMENDADO):
 *   1. Cria a pasta: /wp-content/plugins/way2go-orcamento/
 *   2. Guarda este ficheiro como: way2go-orcamento.php
 *   3. Ativa o plugin em WP Admin → Plugins.
 *
 * OPÇÃO B — functions.php do tema ativo:
 *   Cola o conteúdo deste ficheiro (sem o cabeçalho do plugin acima)
 *   no final do ficheiro functions.php do teu tema.
 */

// Bloco de segurança: impede o acesso direto ao ficheiro PHP.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}


// ============================================================================
// 1. CORS — Autoriza pedidos cross-origin vindos do domínio Vercel
// ============================================================================
//
// Aplica os cabeçalhos CORS EXCLUSIVAMENTE às rotas /way2go/v1/ para não
// interferir com o comportamento padrão do WP Admin e de outros plugins.
//
add_action( 'rest_api_init', function () {

    add_filter( 'rest_pre_serve_request', function ( $served, $result, $request ) {

        // Verifica se o pedido é para as nossas rotas personalizadas.
        if ( strpos( $request->get_route(), '/way2go/v1/' ) === false ) {
            return $served;
        }

        $allowed_origins = [
            'https://www.way2go.pt',
            'https://way2go.pt',
            // Adiciona aqui o URL de preview da Vercel durante desenvolvimento:
            // 'https://way2go-landing-v2-git-main-teu-user.vercel.app',
        ];

        $origin = get_http_origin();

        if ( in_array( $origin, $allowed_origins, true ) ) {
            header( 'Access-Control-Allow-Origin: '  . esc_url_raw( $origin ) );
            header( 'Access-Control-Allow-Methods: POST, OPTIONS' );
            header( 'Access-Control-Allow-Headers: Content-Type, X-WP-Nonce' );
            header( 'Access-Control-Allow-Credentials: true' );
            header( 'Vary: Origin' );
        }

        // Responde imediatamente a pedidos OPTIONS (preflight do browser).
        if ( 'OPTIONS' === $_SERVER['REQUEST_METHOD'] ) {
            status_header( 204 );
            exit;
        }

        return $served;

    }, 10, 3 );

}, 15 );


// ============================================================================
// 2. REGISTO DA ROTA REST
//    Endpoint: POST /wp-json/way2go/v1/orcamento
// ============================================================================

add_action( 'rest_api_init', function () {

    register_rest_route(
        'way2go/v1',
        '/orcamento',
        [
            'methods'             => WP_REST_Server::CREATABLE, // POST
            'callback'            => 'way2go_processar_orcamento',
            'permission_callback' => '__return_true', // Rota pública (sem autenticação WP).

            // Declaração e sanitização dos parâmetros esperados.
            // O WordPress rejeita automaticamente os campos 'required' em falta.
            'args' => [
                'name'        => [
                    'required'          => true,
                    'type'              => 'string',
                    'sanitize_callback' => 'sanitize_text_field',
                ],
                'email'       => [
                    'required'          => true,
                    'type'              => 'string',
                    'sanitize_callback' => 'sanitize_email',
                ],
                'phone'       => [
                    'required'          => true,
                    'type'              => 'string',
                    'sanitize_callback' => 'sanitize_text_field',
                ],
                'pickup'      => [
                    'required'          => true,
                    'type'              => 'string',
                    'sanitize_callback' => 'sanitize_text_field',
                ],
                'dropoff'     => [
                    'required'          => true,
                    'type'              => 'string',
                    'sanitize_callback' => 'sanitize_text_field',
                ],
                'dateTime'    => [
                    'required'          => true,
                    'type'              => 'string',
                    'sanitize_callback' => 'sanitize_text_field', // Formato recebido: "2025-06-15T14:30"
                ],
                'veiculo'     => [
                    'required'          => true,
                    'type'              => 'string',
                    'sanitize_callback' => 'sanitize_text_field', // "berlina" | "minivan"
                ],
                'idioma'      => [
                    'required'          => true,
                    'type'              => 'string',
                    'sanitize_callback' => 'sanitize_text_field', // "pt" | "en"
                ],
                'passageiros' => [
                    'required'          => false,
                    'type'              => 'integer',
                    'sanitize_callback' => 'absint',
                    'default'           => 1,
                ],
                'bagagem'     => [
                    'required'          => false,
                    'type'              => 'integer',
                    'sanitize_callback' => 'absint',
                    'default'           => 0,
                ],
            ],
        ]
    );

} );


// ============================================================================
// 3. CALLBACK PRINCIPAL — Processa o pedido de orçamento recebido
// ============================================================================

function way2go_processar_orcamento( WP_REST_Request $request ): WP_REST_Response {

    // ── 3.1 Extrair os parâmetros já sanitizados pelo WordPress ─────────────

    $name        = $request->get_param( 'name' );
    $email       = $request->get_param( 'email' );
    $phone       = $request->get_param( 'phone' );
    $pickup      = $request->get_param( 'pickup' );
    $dropoff     = $request->get_param( 'dropoff' );
    $date_time   = $request->get_param( 'dateTime' );  // Ex: "2025-06-15T14:30"
    $veiculo     = $request->get_param( 'veiculo' );   // "berlina" | "minivan"
    $idioma      = $request->get_param( 'idioma' );    // "pt" | "en"
    $passageiros = (int) $request->get_param( 'passageiros' );
    $bagagem     = (int) $request->get_param( 'bagagem' );


    // ── 3.2 Validação de negócio adicional ──────────────────────────────────

    if ( ! is_email( $email ) ) {
        return new WP_REST_Response(
            [ 'success' => false, 'message' => 'Endereço de e-mail inválido.' ],
            422
        );
    }

    $veiculos_validos = [ 'berlina', 'minivan', 'onRequest' ];
    if ( ! in_array( $veiculo, $veiculos_validos, true ) ) {
        return new WP_REST_Response(
            [ 'success' => false, 'message' => 'Tipo de veículo inválido.' ],
            422
        );
    }


    // ── 3.3 ALERTA IMEDIATO POR E-MAIL (wp_mail) ────────────────────────────
    //
    // Substitui 'geral@way2go.pt' pelo endereço interno da equipa, ou usa
    // get_option('admin_email') para o e-mail do administrador do WordPress.

    $destinatario = 'geral@way2go.pt';
    $assunto      = sprintf(
        '[Way2Go] Novo Pedido de Orçamento — %s',
        $name
    );

    $corpo = sprintf(
        "Novo pedido de orçamento submetido via formulário web (way2go.pt).\n\n"
        . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        . "  DADOS DO CLIENTE\n"
        . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        . "  Nome:           %s\n"
        . "  E-mail:         %s\n"
        . "  Telefone:       %s\n\n"
        . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        . "  DETALHES DA TRANSFERÊNCIA\n"
        . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        . "  Recolha:        %s\n"
        . "  Destino:        %s\n"
        . "  Data / Hora:    %s\n"
        . "  Passageiros:    %d\n"
        . "  Bagagem:        %d volumes\n"
        . "  Veículo:        %s\n"
        . "  Idioma:         %s\n",
        $name,        $email,       $phone,
        $pickup,      $dropoff,     $date_time,
        $passageiros, $bagagem,
        strtoupper( $veiculo ),
        strtoupper( $idioma )
    );

    $cabecalhos = [
        'Content-Type: text/plain; charset=UTF-8',
        // Permite responder diretamente ao cliente a partir do e-mail de alerta.
        sprintf( 'Reply-To: %s <%s>', $name, $email ),
    ];

    wp_mail( $destinatario, $assunto, $corpo, $cabecalhos );


    // ── 3.4 GUARDAR NO WORDPRESS como Custom Post Type (opcional) ───────────
    //
    // Descomenta este bloco se quiseres criar um histórico de orçamentos
    // consultável em WP Admin → Orçamentos. Requer registo prévio do CPT
    // 'orcamento' (ex: via Custom Post Type UI ou código adicional).
    /*
    wp_insert_post( [
        'post_type'   => 'orcamento',
        'post_title'  => sprintf( '%s — %s → %s', $name, $pickup, $dropoff ),
        'post_status' => 'private',
        'meta_input'  => [
            '_w2g_email'       => $email,
            '_w2g_phone'       => $phone,
            '_w2g_pickup'      => $pickup,
            '_w2g_dropoff'     => $dropoff,
            '_w2g_datetime'    => $date_time,
            '_w2g_passageiros' => $passageiros,
            '_w2g_bagagem'     => $bagagem,
            '_w2g_veiculo'     => $veiculo,
            '_w2g_idioma'      => $idioma,
        ],
    ] );
    */


    // ── 3.5 INTEGRAÇÃO TRANSFERCRM (reservada para implementação futura) ─────
    //
    // Quando a integração com o TransferCRM estiver pronta, mapeia os campos
    // abaixo para o payload da API e descomenta o bloco.
    // Define a constante TRANSFERCRM_API_KEY no wp-config.php:
    //   define( 'TRANSFERCRM_API_KEY', 'a-tua-chave-api' );
    /*
    $transfercrm_payload = [
        'passenger_name'  => $name,
        'passenger_email' => $email,
        'passenger_phone' => $phone,
        'pickup_address'  => $pickup,
        'dropoff_address' => $dropoff,
        'pickup_datetime' => $date_time,   // Confirma o formato aceite pela API
        'vehicle_class'   => $veiculo,
        'pax_count'       => $passageiros,
        'luggage_count'   => $bagagem,
    ];

    $response_crm = wp_remote_post(
        'https://api.transfercrm.com/v1/quotes', // Substitui pelo URL real da API
        [
            'headers' => [
                'Authorization' => 'Bearer ' . ( defined( 'TRANSFERCRM_API_KEY' ) ? TRANSFERCRM_API_KEY : '' ),
                'Content-Type'  => 'application/json',
            ],
            'body'    => wp_json_encode( $transfercrm_payload ),
            'timeout' => 15,
        ]
    );

    if ( is_wp_error( $response_crm ) ) {
        // Regista o erro no log do WordPress sem bloquear a resposta ao utilizador.
        error_log( '[Way2Go] Falha na chamada ao TransferCRM: ' . $response_crm->get_error_message() );
    }
    */


    // ── 3.6 Resposta de sucesso para o frontend React ────────────────────────

    return new WP_REST_Response(
        [
            'success' => true,
            'message' => 'Pedido de orçamento recebido com sucesso.',
        ],
        200
    );
}
