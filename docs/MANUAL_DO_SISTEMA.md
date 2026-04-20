# Manual do Fundador — Way2Go Engine

## 1. A Visão Geral (O que é a Way2Go agora)

A Way2Go já não é apenas um site que envia pedidos para outro sistema e espera resposta.  
Hoje, a Way2Go funciona como um **cérebro próprio de operação**.

Imagine uma empresa de transporte com:
- um **escritório central** que decide tudo,
- vários **fornecedores externos** que podem ajudar,
- e uma **equipa interna** pronta para assumir o trabalho.

É exatamente isso que existe agora:
- o sistema pode usar o **TransferCRM** (motor externo),
- ou o **Motor Nativo Way2Go** (motor interno),
- e pode alternar entre ambos sem que o cliente final perceba essa troca.

Resultado: mais controlo, mais independência e menos risco de ficar “preso” a um único fornecedor.

---

## 2. O Cérebro (Backend NestJS)

O backend é o **escritório central** da Way2Go.  
É onde entram os pedidos, onde se tomam decisões e onde se define quem trata cada reserva.

### Arquitetura Hexagonal, explicada de forma simples

Pense numa **ficha universal** de eletricidade:
- de um lado, tem sempre a mesma tomada;
- do outro lado, pode ligar diferentes aparelhos.

Na Way2Go:
- a “tomada” chama-se **interface comum** (`IBookingProvider`);
- os “aparelhos” são os motores de reservas (TransferCRM, Motor Nativo, e futuros motores).

Isto permite trocar de motor sem reconstruir o sistema inteiro.

### Shadow Mode (comparação em segredo)

No Shadow Mode, o sistema faz duas contas:
1. calcula o preço no motor principal (ex.: CRM),
2. calcula em paralelo no motor nativo (em segundo plano).

Ao cliente é mostrado apenas o preço oficial.  
Mas internamente, a Way2Go compara resultados para perceber:
- se o motor nativo está alinhado,
- onde há diferenças,
- quando está pronto para assumir mais tráfego.

É “batota no bom sentido”: aprendemos sem arriscar a operação.

---

## 3. O Arquivo e Memória (Supabase)

Se o backend é o escritório, o Supabase é o **arquivo central com memória histórica**.

### O que guardamos “em casa”

1. **Lista de motoristas e viaturas**
   - quem está ativo,
   - que tipo de viatura tem,
   - onde está (geolocalização).

2. **Rate Cards (preços por quilómetro)**
   - preço base por classe de viatura,
   - preço por km,
   - tarifa mínima.

3. **Histórico completo de cada reserva (Timeline)**
   - quando foi criada,
   - mudanças de estado (confirmada, atribuída, concluída, etc.),
   - eventos de motorista e webhooks.

Este arquivo dá rastreabilidade total: sabemos sempre o que aconteceu e quando.

---

## 4. O Portal B2B (Lojas para Parceiros)

A Way2Go consegue abrir “balcões de atendimento” para hotéis e agências sem desenvolvimento manual para cada caso.

Pense em **franchising digital**:
- cada parceiro recebe o seu espaço,
- com regras comerciais próprias,
- mas todos ligados ao mesmo cérebro central.

Hoje, os parceiros são geridos no Supabase e no Admin, o que permite:
- criar parceiro,
- ativar/desativar,
- definir comissões,
- manter operação sem depender de ficheiros `.env`.

Se não existirem parceiros, o sistema não bloqueia: apenas mostra estado vazio (“ainda não há parceiros”).

---

## 5. O Ciclo de Vida de uma Reserva (Passo a Passo)

### Passo 1 — Pedido de preço
O cliente pede orçamento.  
O sistema valida dados, rota e distância.

### Passo 2 — Cálculo e decisão de motor
O backend decide qual motor usar (CRM, Nativo, ou ambos em sombra), conforme modo configurado.

### Passo 3 — Criação da reserva
A reserva é criada no motor escolhido.  
Ao mesmo tempo, fica guardada no arquivo interno (espelho) para controlo operacional.

### Passo 4 — Atribuição de motorista
No motor nativo, o sistema procura motorista compatível e disponível, priorizando proximidade.

### Passo 5 — Acompanhamento em tempo real
Mudanças de estado (driver, webhook, sistema) entram na timeline da reserva.

### Passo 6 — Conclusão do serviço
Quando a reserva chega a **COMPLETED**, o sistema desencadeia automaticamente a emissão de fatura.

---

## 6. A Independência Fiscal (Faturação)

A faturação foi desenhada para não depender de processos manuais.

Quando o serviço termina:
1. o sistema deteta estado **COMPLETED**,
2. prepara dados da fatura (cliente, trajeto, valor),
3. envia para o provedor fiscal (Vendus).

Com isto, a Way2Go garante:
- consistência legal,
- redução de falhas humanas,
- rapidez na comunicação fiscal.

Em ambiente de simulação, existe modo **MOCK**, que testa o fluxo sem gastar créditos de API.

---

## 7. Guia do Painel de Controlo (Admin)

O Admin é a **torre de controlo** da Way2Go.

Na prática, o João consegue:

1. **Gerir parceiros**
   - criar e editar parceiros,
   - ajustar comissão,
   - ativar/desativar.

2. **Ajustar regras comerciais**
   - limites de crédito,
   - condições de cobrança,
   - parâmetros de operação B2B.

3. **Acompanhar desempenho dos motores**
   - observar comparação CRM vs Motor Nativo,
   - monitorizar sucesso de atribuição nativa,
   - analisar falhas de failover.

4. **Tomar decisões de crescimento**
   - aumentar tráfego no motor nativo,
   - manter sombra para validação,
   - reduzir dependência externa de forma controlada.

---

## Conclusão

A Way2Go passou de “website que encaminha pedidos” para uma **plataforma operacional inteligente**.

Isto dá três vantagens estratégicas:
- **controlo** (dados e decisões dentro de casa),
- **resiliência** (vários motores, menos risco),
- **escala** (parceiros, despacho e faturação com base sólida).

Em linguagem de fundador: a empresa deixou de ter apenas montra e passou a ter **fábrica própria**.
