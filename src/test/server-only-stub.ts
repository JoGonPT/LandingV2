/**
 * Substituto de `server-only` para os testes.
 *
 * O pacote real é um guarda de compilação do Next: quem o importa não pode ser
 * puxado para um componente de cliente, e a tentativa falha o build. Fora do
 * Next não existe, e sem isto qualquer módulo protegido por ele ficaria
 * impossível de testar.
 *
 * Ligado em `vitest.config.ts`. Vazio de propósito — o guarda é do build, não
 * do tempo de execução, e não há nada para reproduzir aqui.
 */
export {};
