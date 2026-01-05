# Problema: Saldo do Cartão Zerado ao Virar o Mês

## 🐛 **PROBLEMA RELATADO**

Você fez um lançamento de **entrada (receita) no débito** do cartão da Débora.  
O saldo ficou disponível, mas ao **virar o mês**, o saldo foi **zerado**.

---

## 🔍 **POSSÍVEIS CAUSAS**

### **1. Coluna `available_balance` Não Existe**
- Scripts SQL não foram executados
- Campo não foi criado no banco
- Código tenta salvar mas banco rejeita silenciosamente

### **2. RLS Bloqueando Visualização**
- Saldo existe mas RLS impede leitura
- Parece zerado mas está lá

### **3. Fechamento Automático de Fatura**
- Algum processo fechou a fatura do mês anterior
- Usou o saldo disponível para pagar
- Saldo foi zerado no pagamento

### **4. Código Antigo Sem `available_balance`**
- Transações antigas usavam campo `balance`
- Campo `balance` pode ter sido removido
- Saldo foi perdido na migração

---

## 🔧 **DIAGNÓSTICO**

Execute o script de diagnóstico no **SQL Editor do Supabase**:

```bash
# Cole todo o conteúdo de:
scripts/009_diagnostic_balance.sql
```

O script vai:
1. ✅ Verificar se `available_balance` existe
2. ✅ Mostrar saldos atuais dos cartões
3. ✅ Verificar histórico de mudanças
4. ✅ Ver transações recentes
5. ✅ Criar a coluna se não existir
6. ✅ Corrigir valores nulos

---

## ✅ **SOLUÇÃO RÁPIDA**

### **Opção 1: Restaurar Saldo Manualmente**

Execute no Supabase (ajuste o nome e valor):

```sql
UPDATE credit_cards
SET available_balance = 150.00  -- ← Coloque o valor correto aqui
WHERE name ILIKE '%debora%'     -- ← Coloque o nome do cartão
  AND user_id = auth.uid();
```

### **Opção 2: Garantir Scripts Foram Executados**

Execute todos os scripts na ordem:

```sql
-- 1. Policies e índices
scripts/008_critical_fixes.sql

-- 2. Se quiser funções avançadas (opcional por agora)
-- scripts/007_comprehensive_card_improvements.sql
```

---

## 🎯 **CORREÇÃO PERMANENTE**

### **1. Garantir Campo Existe:**

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'credit_cards' 
      AND column_name = 'available_balance'
  ) THEN
    ALTER TABLE credit_cards 
    ADD COLUMN available_balance DECIMAL(12, 2) DEFAULT 0;
  END IF;
END $$;
```

### **2. Atualizar Código para Não Zerar:**

Verificar se em `app/transactions/actions.ts` a função RPC está sendo usada:

```typescript
// ✅ CORRETO - Usa função atômica
const { data, error } = await supabase.rpc("create_transaction_with_balance", {
  p_user_id: user.id,
  p_credit_card_id: cardId,
  p_amount: amount,
  p_type: "income",
  ...
})
```

Se **não** estiver usando RPC, o saldo pode estar sendo perdido.

### **3. Verificar RLS Policies:**

```sql
-- Ver policies de credit_cards
SELECT * FROM pg_policies 
WHERE tablename = 'credit_cards';

-- Deve ter pelo menos:
-- - SELECT policy para o user_id
-- - UPDATE policy para o user_id
```

---

## 📋 **COMO FUNCIONA O SALDO**

### **Lançamento de Entrada (Receita):**

```typescript
// Usuário adiciona R$ 150 no cartão
type: "income"
amount: 150
credit_card_id: cartao_debora_id

// Sistema deve:
available_balance = saldo_anterior + 150
```

### **O que NÃO deve acontecer:**

❌ Saldo zerar ao virar mês  
❌ Saldo zerar sem fechar fatura  
❌ Saldo não persistir no banco  

### **O que DEVE acontecer:**

✅ Saldo persiste indefinidamente  
✅ Só diminui ao pagar fatura ou fazer despesa  
✅ Não tem relação com mês/ano  

---

## 🔍 **VERIFICAR O QUE ACONTECEU**

### **1. Ver histórico do cartão:**

```sql
SELECT * FROM credit_card_balance_history
WHERE credit_card_id = (
  SELECT id FROM credit_cards 
  WHERE name ILIKE '%debora%' 
  LIMIT 1
)
ORDER BY created_at DESC;
```

Isso mostra todas as mudanças de saldo.

### **2. Ver transações do cartão:**

```sql
SELECT 
  t.title,
  t.amount,
  t.type,
  t.date,
  t.created_at
FROM transactions t
JOIN credit_cards cc ON cc.id = t.credit_card_id
WHERE cc.name ILIKE '%debora%'
ORDER BY t.date DESC;
```

### **3. Ver faturas abertas:**

```sql
SELECT * FROM credit_card_invoices
WHERE credit_card_id = (
  SELECT id FROM credit_cards 
  WHERE name ILIKE '%debora%' 
  LIMIT 1
)
AND status = 'open';
```

Se houver fatura aberta, pode estar "segurando" o saldo.

---

## 🚀 **AÇÕES IMEDIATAS**

### **Passo 1: Execute o diagnóstico**
```sql
-- scripts/009_diagnostic_balance.sql
```

### **Passo 2: Restaure o saldo manualmente**
```sql
UPDATE credit_cards
SET available_balance = 150.00  -- AJUSTE O VALOR
WHERE name ILIKE '%debora%';
```

### **Passo 3: Verifique se scripts foram executados**
```sql
-- Verificar se funções existem
SELECT routine_name FROM information_schema.routines
WHERE routine_name LIKE '%transaction_with_balance%';
```

### **Passo 4: Execute scripts faltantes**
Se funções não existirem:
```sql
-- scripts/008_critical_fixes.sql (obrigatório)
```

---

## 🛡️ **PREVENÇÃO**

Para não acontecer novamente:

1. ✅ Sempre use funções RPC para transações
2. ✅ Nunca feche fatura sem verificar saldo
3. ✅ Execute todos os scripts SQL de correção
4. ✅ Verifique se `available_balance` está persistindo

---

## ❓ **PERGUNTAS PARA ESCLARECER**

Para te ajudar melhor, responda:

1. **O saldo sumiu ao virar qual mês?** (Ex: De Janeiro para Fevereiro)
2. **Você fechou alguma fatura nesse período?**
3. **O valor que sumiu era exatamente o que estava no saldo?**
4. **Você executou algum dos scripts SQL? Quais?**

---

## 📌 **RESUMO EXECUTIVO**

**Problema:** Saldo zerado ao virar mês  
**Causa Provável:** Campo `available_balance` não existe ou scripts não executados  
**Solução:** Execute diagnóstico + restaure saldo + execute scripts  
**Tempo:** ~5 minutos  

---

**Execute o script de diagnóstico primeiro para entender o que aconteceu!** 🔍
