# Gestão de Cartões de Crédito e Débito - Sistema Atual

## 📊 Visão Geral

O sistema **CtrlGastos** atualmente gerencia cartões com funcionalidade **híbrida** (crédito + débito):

### Conceito Híbrido
Cada cartão possui:
- **Limite de Crédito** → Para compras parceladas e a prazo
- **Saldo Disponível (Débito)** → Para pagamentos diretos e abatimento de faturas

---

## 🔍 Estrutura Atual

### Tabela `credit_cards`

```sql
CREATE TABLE credit_cards (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  last_digits VARCHAR(4),
  credit_limit DECIMAL(12, 2) NOT NULL,      -- Limite para crédito
  closing_day INTEGER NOT NULL,              -- Dia de fechamento da fatura
  due_day INTEGER NOT NULL,                  -- Dia de vencimento
  color VARCHAR(7),
  is_active BOOLEAN DEFAULT true,
  balance DECIMAL(12, 2) DEFAULT 0,          -- ⚠️ Saldo (adicionado recentemente)
  available_balance DECIMAL(12, 2),          -- 💰 Saldo débito
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Campos Importantes

| Campo | Propósito | Exemplo |
|-------|-----------|---------|
| `credit_limit` | Limite máximo de crédito | R$ 5.000,00 |
| `balance` | Saldo atual (usado em transações) | R$ 1.500,00 |
| `available_balance` | Saldo para débito/abatimento | R$ 300,00 |
| `closing_day` | Dia que fecha a fatura | Dia 15 |
| `due_day` | Dia de vencimento da fatura | Dia 25 |

---

## 💳 Funcionalidades Atuais

### 1. **Transações com Cartão** (`app/transactions/actions.ts`)

#### Como Funciona:
```typescript
// Ao criar transação vinculada a cartão:
const { data } = await supabase.rpc("create_transaction_with_balance", {
  p_credit_card_id: cardId,
  p_type: "income" ou "expense",
  p_amount: 100.00
})
```

#### Regras:
- **Income (Receita)**: `balance += amount`
- **Expense (Despesa)**: `balance -= amount`
- **Atômica**: Usa `SELECT FOR UPDATE` (sem race condition)

#### Exemplo:
```
Saldo inicial: R$ 500,00
Nova despesa: R$ 50,00
Saldo final: R$ 450,00
```

---

### 2. **Compras no Cartão de Crédito** (`app/credit-cards/[id]/purchases/actions.ts`)

#### Fluxo:
1. Usuário registra compra (à vista ou parcelada)
2. Sistema calcula em qual fatura a compra entrará
3. Cria registro em `credit_card_purchases`
4. Vincula à fatura correspondente

#### Compra Parcelada:
```typescript
// Exemplo: R$ 300 em 3x
// Cria 3 compras de R$ 100 cada
for (let i = 0; i < 3; i++) {
  {
    description: "Notebook (1/3), (2/3), (3/3)",
    amount: 100.00,
    purchase_date: mes + i,
    invoice_id: faturaDoMes[i]
  }
}
```

#### Cálculo de Fatura:
```typescript
function calculateInvoiceDate(purchaseDate, closingDay, dueDay) {
  // Compra ANTES do fechamento → Fatura deste mês
  if (day <= closingDay) {
    fatura = mesAtual
  } else {
    // Compra DEPOIS do fechamento → Fatura mês seguinte
    fatura = proximoMes
  }
}
```

**Exemplo:**
```
Cartão: Fechamento dia 15, Vencimento dia 25
Compra dia 10/01 → Fatura de Janeiro (vence 25/01)
Compra dia 20/01 → Fatura de Fevereiro (vence 25/02)
```

---

### 3. **Faturas** (`app/credit-cards/[id]/invoices/`)

#### Tabela `credit_card_invoices`
```sql
CREATE TABLE credit_card_invoices (
  id UUID PRIMARY KEY,
  credit_card_id UUID NOT NULL,
  reference_month INTEGER,
  reference_year INTEGER,
  total_amount DECIMAL(12, 2) DEFAULT 0,
  status VARCHAR(20),  -- 'open', 'closed', 'paid'
  closing_date DATE,
  due_date DATE NOT NULL,
  payment_date DATE,
  transaction_id UUID  -- Transação de pagamento
);
```

#### Status da Fatura:
- **open** → Fatura aberta (ainda aceitando compras)
- **closed** → Fechada (aguardando pagamento)
- **paid** → Paga completamente

---

### 4. **Fechamento de Fatura** (`app/credit-cards/[id]/invoices/actions.ts`)

#### Fluxo Atual:
```typescript
async function closeInvoice(invoiceId, cardId) {
  // 1. Calcular total da fatura
  const totalInvoice = soma(compras)
  
  // 2. Verificar saldo disponível (débito)
  const availableBalance = card.available_balance
  
  // 3. Abater saldo da fatura
  const amountFromBalance = Math.min(totalInvoice, availableBalance)
  const amountToPay = totalInvoice - amountFromBalance
  
  // 4. Atualizar saldo do cartão
  card.available_balance = availableBalance - amountFromBalance
  
  // 5. Se sobrar valor, criar transação de despesa
  if (amountToPay > 0) {
    criar_transacao_expense({
      amount: amountToPay,
      description: "Fatura [Cartão] - [Mês/Ano]",
      category: "Cartão de Crédito"
    })
  }
  
  // 6. Atualizar status da fatura
  invoice.status = amountToPay > 0 ? "closed" : "paid"
}
```

#### Exemplo Prático:
```
Fatura total: R$ 800,00
Saldo disponível (débito): R$ 300,00

Abatimento: R$ 300,00 (do saldo)
Restante a pagar: R$ 500,00 → Cria despesa em transações

Resultado:
- Saldo débito: R$ 300 - R$ 300 = R$ 0
- Nova despesa: R$ 500 (categoria "Cartão de Crédito")
- Status fatura: "closed"
```

---

### 5. **Status do Cartão** (`app/credit-cards/[id]/status/page.tsx`)

#### Informações Exibidas:

**Card 1: Saldo Débito**
```
Saldo Disponível (Débito)
R$ 300,00
"Valor disponível para uso em débito"
```

**Card 2: Limite de Crédito**
```
Limite de Crédito: R$ 5.000,00
Disponível: R$ 4.200,00
Utilizado: R$ 800,00 (fatura aberta)
```

**Card 3: Fatura Atual**
```
Total da Fatura: R$ 800,00
Fechamento: 15/02/2026
Vencimento: 25/02/2026

✓ Você pode abater R$ 300,00 da fatura com seu saldo
```

---

## 🔄 Fluxo Completo de Uso

### Cenário: Usuário com Cartão Nubank

```
1. Cadastro do Cartão
   Nome: Nubank
   Limite: R$ 5.000,00
   Fechamento: Dia 10
   Vencimento: Dia 20
   Saldo débito inicial: R$ 0,00

2. Usuário adiciona saldo (receita)
   Transação: +R$ 500,00 (salário)
   credit_card_id: nubank_id
   → card.balance = R$ 500,00

3. Usuário faz compra no crédito
   Compra: R$ 200,00 em 2x (Netflix + Spotify)
   Data: 05/01 (antes do fechamento dia 10)
   → Cria 2 parcelas de R$ 100,00
   → Fatura Janeiro: +R$ 100,00
   → Fatura Fevereiro: +R$ 100,00

4. Fechamento da fatura Janeiro
   Total fatura: R$ 100,00
   Saldo disponível: R$ 500,00
   
   Sistema abate: R$ 100,00 do saldo
   Saldo novo: R$ 400,00
   Status: "paid" (pago totalmente)

5. Usuário faz compra grande
   Compra: R$ 1.500,00 à vista (viagem)
   Data: 25/01 (depois do fechamento dia 10)
   → Fatura Fevereiro: +R$ 1.500,00

6. Fechamento da fatura Fevereiro
   Total fatura: R$ 1.600,00 (R$ 100 parcela + R$ 1.500 viagem)
   Saldo disponível: R$ 400,00
   
   Sistema abate: R$ 400,00 do saldo
   Saldo novo: R$ 0,00
   Restante a pagar: R$ 1.200,00
   
   → Cria despesa de R$ 1.200,00
   → Status: "closed" (aguardando pagamento externo)
```

---

## ⚠️ Problemas Identificados

### 1. **Duplicação de Campos de Saldo**
```typescript
// Existem 2 campos para saldo:
balance            // Usado em transactions
available_balance  // Usado em invoices

// ❌ PROBLEMA: Podem ficar dessincronizados
```

### 2. **Falta Validação de Limite**
```typescript
// Ao criar compra, não valida se ultrapassou limite:
const availableCredit = credit_limit - totalInvoice

if (newPurchase + totalInvoice > credit_limit) {
  throw Error("Limite de crédito insuficiente")
}
```

### 3. **Sem Gestão de Débito Direto**
```typescript
// Sistema não diferencia:
// - Compra no CRÉDITO (vai pra fatura)
// - Compra no DÉBITO (desconta saldo imediatamente)

// Atualmente, transações mexem em 'balance'
// Compras mexem em faturas
// Mas não há integração clara
```

### 4. **Race Condition em Fechamento de Fatura**
```typescript
// closeInvoice() atualiza saldo sem lock atômico
const newBalance = availableBalance - amountFromBalance
await supabase.update({ available_balance: newBalance })
// ⚠️ Vulnerável a race condition (mesma issue de transactions)
```

### 5. **Falta Histórico de Saldo**
```
// Não há tabela de audit/histórico para rastrear:
// - Quando saldo foi adicionado
// - Por que saldo mudou
// - Saldo em cada ponto do tempo
```

---

## ✅ Melhorias Sugeridas

### 1. **Unificar Campo de Saldo**
```sql
-- Remover 'balance' e manter apenas 'available_balance'
-- OU
-- Remover 'available_balance' e usar apenas 'balance'

ALTER TABLE credit_cards DROP COLUMN balance;
-- Usar apenas 'available_balance' em todo lugar
```

### 2. **Validar Limite de Crédito**
```typescript
async function createPurchase() {
  // Calcular total da fatura aberta
  const currentInvoiceTotal = soma(purchases_fatura_aberta)
  
  // Validar limite
  if (currentInvoiceTotal + newPurchaseAmount > card.credit_limit) {
    return { error: "Limite de crédito insuficiente" }
  }
}
```

### 3. **Distinguir Débito vs Crédito**
```typescript
// Adicionar campo 'payment_method' em purchases
CREATE TABLE credit_card_purchases (
  payment_method VARCHAR(10) CHECK (payment_method IN ('credit', 'debit'))
)

// Se 'debit':
//   - Desconta saldo imediatamente
//   - NÃO cria compra na fatura
// Se 'credit':
//   - Vai para fatura
//   - Valida limite
```

### 4. **Resolver Race Condition em Fechamento**
```sql
-- Criar função SQL atômica para fechar fatura
CREATE OR REPLACE FUNCTION close_invoice_with_balance(
  p_invoice_id UUID,
  p_card_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
BEGIN
  -- Lock no cartão
  SELECT available_balance FROM credit_cards
  WHERE id = p_card_id FOR UPDATE;
  
  -- Calcular e abater atomicamente
  -- Criar transação se necessário
  -- Tudo na mesma transação DB
END;
$$;
```

### 5. **Criar Histórico de Saldo**
```sql
CREATE TABLE credit_card_balance_history (
  id UUID PRIMARY KEY,
  credit_card_id UUID NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  operation VARCHAR(20) NOT NULL,  -- 'add', 'subtract', 'invoice_payment'
  previous_balance DECIMAL(12, 2),
  new_balance DECIMAL(12, 2),
  reference_id UUID,  -- transaction_id ou invoice_id
  created_at TIMESTAMP DEFAULT NOW()
);

-- Trigger automático ao atualizar saldo
CREATE TRIGGER log_balance_change
AFTER UPDATE ON credit_cards
FOR EACH ROW
WHEN (OLD.available_balance IS DISTINCT FROM NEW.available_balance)
EXECUTE FUNCTION log_balance_change();
```

---

## 📈 Comparação: Antes vs Depois (Proposto)

| Aspecto | Atual | Proposto |
|---------|-------|----------|
| **Campos de Saldo** | 2 (`balance`, `available_balance`) | 1 (`available_balance`) |
| **Validação Limite** | ❌ Não valida | ✅ Valida antes de comprar |
| **Débito/Crédito** | ❌ Não diferencia | ✅ Campo `payment_method` |
| **Race Condition** | ❌ Fechamento vulnerável | ✅ Função SQL atômica |
| **Histórico** | ❌ Sem rastreamento | ✅ Tabela de audit |
| **Integridade** | ⚠️ Pode desincronizar | ✅ Garantida por DB |

---

## 🎯 Resumo Executivo

### Como Funciona Hoje:

1. **Cartão = Crédito + Débito**
   - Limite de crédito para compras parceladas
   - Saldo disponível para abater faturas

2. **Compras vão para faturas**
   - Parceladas ou à vista
   - Calculadas por data de fechamento

3. **Fechamento de fatura:**
   - Abate saldo disponível
   - Cria despesa do restante

4. **Transações podem usar cartão**
   - Atualizam campo `balance`
   - Operações atômicas (✅ sem race condition)

### Principais Gaps:

- ❌ Dois campos de saldo confusos
- ❌ Sem validação de limite
- ❌ Sem diferenciação débito/crédito
- ❌ Fechamento de fatura vulnerável
- ❌ Sem histórico/auditoria

---

## 🚀 Próximos Passos Recomendados

1. ✅ **FEITO**: Race condition em transações resolvida
2. ⏳ **TODO**: Unificar campos de saldo
3. ⏳ **TODO**: Adicionar validação de limite
4. ⏳ **TODO**: Resolver race condition em fechamento de fatura
5. ⏳ **TODO**: Criar histórico de saldo
6. ⏳ **TODO**: Adicionar payment_method (débito/crédito)
