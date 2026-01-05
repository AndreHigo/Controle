# 🚀 Setup Único - Execute UMA VEZ e Pronto!

## ❓ **Por que preciso executar um script?**

Seu sistema precisa de algumas **configurações no banco de dados** que não podem ser feitas automaticamente pelo código. São coisas como:

- Adicionar colunas novas (ex: `available_balance`)
- Criar regras de segurança (RLS)
- Criar funções para evitar bugs (race conditions)
- Adicionar índices para ficar mais rápido

**Você só precisa fazer isso UMA VEZ!** Depois, tudo funciona automaticamente. ✨

---

## ✅ **O QUE FAZER (1 minuto)**

### **Passo 1: Abra o Supabase**
1. Vá em https://supabase.com
2. Abra seu projeto
3. Clique em **SQL Editor** (na barra lateral)

### **Passo 2: Execute o Script**
1. Abra o arquivo: `scripts/000_SETUP_INICIAL_COMPLETO.sql`
2. **Copie TODO o conteúdo**
3. Cole no SQL Editor do Supabase
4. Clique em **Run** (ou aperte F5)

### **Passo 3: Pronto!**
Você vai ver uma mensagem:
```
✅ SETUP COMPLETO!
🎉 Você pode usar o sistema normalmente agora!
```

**E nunca mais precisa fazer isso!** 🎉

---

## 🎯 **O que o script faz?**

1. ✅ Cria coluna `available_balance` (saldo do cartão)
2. ✅ Adiciona `user_id` em faturas e compras
3. ✅ Configura segurança (RLS) para proteger seus dados
4. ✅ Cria índices para o sistema ficar rápido
5. ✅ Instala funções que evitam bugs de saldo

**Tudo automático em 1 segundo!**

---

## 🔧 **Depois disso, o que acontece?**

### ✅ **Tudo funciona sozinho:**

- Criar transação → Atualiza saldo automaticamente
- Fechar fatura → Usa saldo automaticamente
- Adicionar compra → Cria fatura automaticamente
- Virar o mês → **Saldo NÃO zera** (corrigido!)

### ❌ **Você NÃO precisa:**

- Executar scripts toda hora
- Configurar nada no código
- Rodar comandos no terminal
- Fazer backup manual

---

## 🐛 **E se eu já usei o sistema antes?**

**Sem problema!** O script é inteligente:

- ✅ Detecta o que já existe
- ✅ Corrige dados antigos automaticamente
- ✅ Não quebra nada que já funciona
- ✅ Pode executar várias vezes sem problema

---

## 📋 **Checklist Rápido**

Antes de executar o script:
- [ ] Abri o Supabase
- [ ] Estou no **SQL Editor**
- [ ] Copiei TODO o conteúdo de `000_SETUP_INICIAL_COMPLETO.sql`

Depois de executar:
- [ ] Vi a mensagem "✅ SETUP COMPLETO!"
- [ ] Não teve erro vermelho
- [ ] Voltei pro sistema e testei

---

## ❓ **Perguntas Frequentes**

### **1. Preciso executar toda vez que reiniciar o sistema?**
❌ **NÃO!** Só uma vez. O banco de dados guarda tudo.

### **2. E se eu deletar o banco e criar outro?**
✅ Aí sim, precisa executar de novo. Mas é raro.

### **3. E se der erro?**
- Copia a mensagem de erro
- Me mostra
- Eu te ajudo a corrigir

### **4. Tem como fazer isso automaticamente no código?**
❌ Infelizmente não. Bancos de dados precisam de comandos SQL diretos.  
✅ Mas só precisa fazer **UMA VEZ**!

### **5. Meu saldo zerado vai voltar?**
✅ Sim! Depois de executar o script, você pode restaurar manualmente:

```sql
-- Ajuste o nome do cartão e o valor:
UPDATE credit_cards
SET available_balance = 150.00
WHERE name ILIKE '%debora%'
  AND user_id = auth.uid();
```

---

## 🎉 **Resumo**

1. ✅ Execute `000_SETUP_INICIAL_COMPLETO.sql` no Supabase (1 minuto)
2. ✅ Nunca mais precisa fazer isso
3. ✅ Tudo funciona automaticamente depois

**É como instalar um aplicativo: faz uma vez e pronto!** 📱

---

## 📞 **Precisa de Ajuda?**

Se der qualquer erro ou dúvida, me chama que eu resolvo! 💪

**Mas confia: é super rápido e fácil!** 😊
