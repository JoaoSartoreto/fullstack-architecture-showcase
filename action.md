### 🗺️ O Plano de Ação Definitivo

Com esse último pedaço do quebra-cabeça, a nossa lista de correções ficou muito mais enxuta e focada na **Regra de Negócio / UX**, e não em falhas críticas de banco.

Aqui está o plano final, passo a passo, para deixarmos essa API blindada e pronta para o mundo real:

#### Parte 1: O Conserto do Estoque Preso (O cenário do Calote)

1. **`products.service.ts`**: Criar a função espelho `incrementStock(manager, productId, quantity)`, pois se o cliente não pagar e a gente cancelar o pedido, precisamos devolver os itens para a prateleira.
2. **`order-status.enum.ts` / `order-validation.util.ts**`: Permitir a transição de `APPROVED` para `REJECTED` (ou `CANCELED`).
3. **`orders.service.ts`**: No método `updateStatus`, fazer um `if` verificando se a transição é de `APPROVED` para `REJECTED/CANCELED`. Se for, chamamos a nova função de repor o estoque.

#### Parte 2: O Fim dos Carrinhos Fantasmas e Órfãos

1. **`orders.service.ts -> checkout`**: Adicionar a validação `if (order.items.length === 0)` lançando exceção, para impedir que um pedido sem itens avance para `PENDING`.
2. **`orders.service.ts -> createDraft`**: Alterar a lógica para primeiro fazer um `findOne({ where: { userId, status: DRAFT }})`.
* Se já existir: não cria um novo `OrderEntity`, apenas joga os itens novos pelo `OrderItemProcessor.syncNegotiatedItems` (que faz o upsert lindo que você programou).
* Se não existir: cria o cabeçalho novo.



#### Parte 3: A Autonomia do Cliente

1. **`orders.controller.ts`**: Criar um endpoint `PATCH /orders/:id/cancel` exclusivo para o `@Roles(Role.CUSTOMER)`.
2. **`orders.service.ts`**: Criar a função `cancelOrderByCustomer(orderId, userId)` que permite abortar o pedido se ele ainda estiver em `PENDING` ou `IN_NEGOTIATION`.

O que acha de começarmos executando a **Parte 1 (O cenário do Calote e Reposição de Estoque)**? É a mais crítica financeiramente para o sistema. Posso te mandar os trechos do `products.service` e `order-validation.util` atualizados?