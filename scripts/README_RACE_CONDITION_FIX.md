# Correção de Race Condition - Saldo de Cartões

## Problema Identificado

O código anterior tinha uma **race condition crítica** ao atualizar saldos de cartões de crédito:

```typescript
// ❌ CÓDIGO ANTERIOR (COM RACE CONDITION)
const { data: creditCard } = await supabase
  .from("credit_cards")
  .select("balance")
  .eq("id", creditCardId)
  .single()

// PROBLEMA: Entre SELECT e UPDATE, outra transação pode modificar o saldo
const newBalance = currentBalance + amount

await supabase
  .from("credit_cards")
  .update({ balance: newBalance })
  .eq("id", creditCardId)
```

### Cenário de Falha

1. **Transação A** lê saldo = R$ 100
2. **Transação B** lê saldo = R$ 100 (simultaneamente)
3. **Transação A** adiciona R$ 50 → atualiza para R$ 150
4. **Transação B** adiciona R$ 30 → atualiza para R$ 130 ❌

**Resultado esperado**: R$ 180  
**Resultado obtido**: R$ 130 (perdeu R$ 50!)

---

## Solução Implementada

Criação de **PostgreSQL Functions** com `SELECT FOR UPDATE` que garante lock de linha durante a transação, tornando as operações **atômicas**.

### Arquivos Modificados

1. ✅ `scripts/006_fix_race_condition_balance.sql` - Funções SQL
2. ✅ `app/transactions/actions.ts` - Uso das funções RPC

---

## Como Aplicar a Correção

### Passo 1: Executar o Script SQL

No painel do **Supabase** (SQL Editor):

```bash
# Copie todo o conteúdo de:
scripts/006_fix_race_condition_balance.sql

# E execute no SQL Editor do Supabase
```

Ou via CLI:

```bash
psql -h seu-projeto.supabase.co -U postgres -d postgres -f scripts/006_fix_race_condition_balance.sql
```

### Passo 2: Verificar Criação das Funções

Execute no SQL Editor para confirmar:

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%transaction%balance%';
```

Deve retornar:
- `create_transaction_with_balance`
- `update_transaction_with_balance`
- `delete_transaction_with_balance`
- `update_credit_card_balance`

### Passo 3: Testar

```bash
npm run dev
```

Teste criando transações simultâneas e verifique se o saldo está correto.

---

## Funções Criadas

### 1. `create_transaction_with_balance`
Cria transação e atualiza saldo atomicamente.

**Parâmetros:**
- `p_user_id` - UUID do usuário
- `p_title` - Título da transação
- `p_amount` - Valor
- `p_type` - 'income' ou 'expense'
- `p_category_id` - UUID da categoria (opcional)
- `p_credit_card_id` - UUID do cartão (opcional)
- `p_date` - Data da transação
- `p_description` - Descrição (opcional)

**Retorno:**
```json
{
  "success": true,
  "transaction_id": "uuid",
  "new_balance": 150.00
}
```

### 2. `update_transaction_with_balance`
Atualiza transação e ajusta saldo (reverte antiga + aplica nova).

**Parâmetros:** (mesmos acima + `p_transaction_id`)

### 3. `delete_transaction_with_balance`
Deleta transação e reverte saldo.

**Parâmetros:**
- `p_transaction_id`
- `p_user_id`

### 4. `update_credit_card_balance` (utilitária)
Atualiza saldo diretamente (uso interno).

**Parâmetros:**
- `p_card_id`
- `p_user_id`
- `p_amount`
- `p_operation` - 'add', 'subtract' ou 'set'

---

## Diferenças Técnicas

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Race Condition** | ❌ Sim | ✅ Não |
| **Atomicidade** | ❌ Não | ✅ Sim (transação DB) |
| **Lock de Linha** | ❌ Não | ✅ `FOR UPDATE` |
| **Queries** | 3-4 separadas | 1 função atômica |
| **Rollback** | ❌ Manual | ✅ Automático |

---

## Benefícios

1. ✅ **Elimina race conditions** - Lock garante serialização
2. ✅ **Integridade de dados** - Transações ACID
3. ✅ **Menos código** - Lógica no banco
4. ✅ **Melhor performance** - 1 round-trip ao invés de 3-4
5. ✅ **Rollback automático** - Se qualquer operação falhar, tudo é revertido
6. ✅ **Reduz latência** - Queries executadas no servidor DB

---

## Próximos Passos Recomendados

Aplicar a mesma solução em:

1. ⏳ `app/credit-cards/[id]/purchases/actions.ts` (compras parceladas)
2. ⏳ Faturas de cartões (fechamento)
3. ⏳ Qualquer outra operação que modifique saldo

---

## Debugging

Se houver erro ao chamar as funções:

```typescript
const { data, error } = await supabase.rpc("create_transaction_with_balance", {...})

if (error) {
  console.error("Erro RPC:", error)
  // Verificar se funções foram criadas no banco
}
```

Verificar logs do Supabase:
```sql
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%transaction_with_balance%';
```

---

## Rollback (se necessário)

Para reverter as mudanças:

```sql
DROP FUNCTION IF EXISTS create_transaction_with_balance;
DROP FUNCTION IF EXISTS update_transaction_with_balance;
DROP FUNCTION IF EXISTS delete_transaction_with_balance;
DROP FUNCTION IF EXISTS update_credit_card_balance;
```

E restaurar o código antigo de `app/transactions/actions.ts` via git:

```bash
git checkout HEAD~1 -- app/transactions/actions.ts
```
