#!/bin/bash

echo "🔍 A iniciar auditoria de variáveis para Produção (Way2Go)..."

# Lista de variáveis críticas que detetámos que faltavam nos logs
CRITICAL_VARS=(
  "TRANSFERCRM_BEARER_TOKEN"
  "TRANSFERCRM_AUTH_MODE"
  "W2G_MASTER_ADMIN_SESSION_SECRET"
  "PARTNER_SESSION_SECRET"
  "W2G_MASTER_ADMIN_PASSWORD"
  "SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
)

# Verifica se o Vercel CLI está logado e puxa as variáveis atuais para um ficheiro temporário
echo "📥 A ler variáveis configuradas na Vercel..."
vercel env pull .env.production --yes > /dev/null 2>&1

MISSING=0
for var in "${CRITICAL_VARS[@]}"; do
  if ! grep -q "^$var=" .env.production; then
    echo "❌ FALTA: $var"
    MISSING=$((MISSING + 1))
  else
    # Verifica se a variável tem o tamanho mínimo exigido (ex: os secrets de 16 chars)
    VALUE=$(grep "^$var=" .env.production | cut -d'=' -f2)
    if [[ "$var" == *"SECRET"* && ${#VALUE} -lt 16 ]]; then
      echo "⚠️  AVISO: $var é demasiado curta (tem menos de 16 caracteres)."
    else
      echo "✅ OK: $var"
    fi
  fi
done

if [ $MISSING -eq 0 ]; then
  echo "🚀 Auditoria concluída com sucesso! Podes avançar para o deploy."
else
  echo "🛑 Faltam $MISSING variáveis críticas. Corrige-as na Vercel antes do redeploy."
fi

# Remove o ficheiro temporário por segurança
rm .env.production
