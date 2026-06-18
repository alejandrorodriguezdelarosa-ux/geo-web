<?php
/*
 * Plugin Name: GEO Schema Enricher
 * Description: Registra el meta geo_schema_jsonld (REST) y lo renderiza como JSON-LD en el <head> de entradas y páginas. Para usar con OptimoIA.
 * Version: 1.0.0
 * Author: OptimoIA
 * License: GPL-2.0-or-later
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

add_action( 'init', function () {
    foreach ( [ 'post', 'page' ] as $post_type ) {
        register_post_meta( $post_type, 'geo_schema_jsonld', [
            'single'        => true,
            'type'          => 'string',
            'show_in_rest'  => true,
            'auth_callback' => fn() => current_user_can( 'edit_posts' ),
        ] );
    }
} );

add_action( 'wp_head', function () {
    if ( ! is_singular() ) return;
    $jsonld = get_post_meta( get_the_ID(), 'geo_schema_jsonld', true );
    if ( $jsonld ) {
        // Escapar </ para prevenir inyección de </script> en el bloque JSON-LD
        echo "\n<script type=\"application/ld+json\">" . str_replace( '</', '<\/', $jsonld ) . "</script>\n";
    }
} );
