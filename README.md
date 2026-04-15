# Transfer Profissional - Landing Page

Uma landing page moderna e minimalista para serviços de transfer profissional, construída com Next.js 15 e Tailwind CSS.

## 🚀 Características

- **Design Minimalista**: Inspirado em designs clean e profissionais
- **Totalmente Responsivo**: Otimizado para mobile, tablet e desktop
- **SEO Otimizado**: Metadata completa e JSON-LD structured data
- **RGPD Compliant**: Política de privacidade, termos e gestão de cookies
- **Formulário Avançado**: Sistema completo de reservas com validação
- **Performance**: Construído com Next.js App Router para máxima performance

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn

## 🛠️ Instalação

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Executar em produção
npm start
```

## 🌐 Acesso

Após executar `npm run dev`, aceda a aplicação em:
- Local: http://localhost:3000
- Network: http://192.168.1.70:3000

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── layout.tsx          # Layout principal com SEO
│   ├── page.tsx             # Página inicial
│   ├── globals.css          # Estilos globais
│   └── legal/
│       ├── privacy/         # Política de Privacidade
│       ├── terms/           # Termos e Condições
│       └── cookies/         # Política de Cookies
└── components/
    ├── HeroSection.tsx      # Secção hero
    ├── BookingForm.tsx      # Formulário de reserva
    ├── FAQSection.tsx       # Perguntas frequentes
    ├── Footer.tsx           # Rodapé
    └── CookieConsent.tsx    # Banner de cookies
```

## ✨ Funcionalidades

### Hero Section
- Título elegante e minimalista
- Botão CTA com scroll suave para formulário

### Formulário de Reserva
- Trajeto (De/Para)
- Data e hora de recolha
- Número de passageiros e malas
- Número de voo (opcional)
- Extras (cadeira de criança)
- Dados de contacto (nome, email, WhatsApp)
- Checkbox RGPD obrigatória
- Mensagem de sucesso após submissão

### FAQ
- Accordion com perguntas frequentes
- Informações sobre cancelamento, espera, pagamento, etc.

### Páginas Legais
- Política de Privacidade (RGPD)
- Termos e Condições
- Política de Cookies

### Cookie Consent
- Banner discreto no rodapé
- Opções de aceitar/rejeitar
- Persistência em localStorage

## 🎨 Design System

### Tipografia
- Font: Inter (Google Fonts)
- Pesos: Light (300), Regular (400), Medium (500)

### Cores
- Background: White, Gray-50
- Text: Gray-900, Gray-700, Gray-600
- Borders: Gray-200, Gray-300
- Accent: Gray-900

## 🔍 SEO

### Metadata
- Title e description otimizados
- Keywords relevantes
- Open Graph tags

### JSON-LD
- Schema LocalBusiness
- Informações de contacto
- Horários de funcionamento
- Área de serviço

### HTML Semântico
- Uso correto de `<main>`, `<section>`, `<h1>`-`<h3>`
- Estrutura acessível

## 📱 Responsividade

- Mobile-first approach
- Breakpoint principal: `md:` (768px)
- Layouts adaptativos
- Touch-friendly

## 🔐 RGPD

- Política de privacidade completa
- Termos e condições
- Gestão de cookies
- Consentimento explícito no formulário

## 🚀 Deploy

### Vercel (Recomendado)
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm run build
# Deploy a pasta .next
```

### Outros
Qualquer plataforma que suporte Next.js

## 📝 Próximos Passos

### Backend
- [ ] Criar API route para processar reservas
- [ ] Integrar com serviço de email
- [ ] Adicionar base de dados para armazenar reservas

### Funcionalidades
- [ ] Cálculo de preço em tempo real
- [ ] Integração de pagamento
- [ ] Dashboard de administração
- [ ] Suporte multi-idioma (PT/EN)

### Performance
- [ ] Otimização de imagens
- [ ] Analytics
- [ ] Sitemap e robots.txt

## 📄 Licença

Propriedade de Transfer Profissional

## 📧 Contacto

- Email: info@transferpro.pt
- Telefone: +351 XXX XXX XXX
- WhatsApp: +351 XXX XXX XXX
