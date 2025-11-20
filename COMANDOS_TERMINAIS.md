# 🚀 COMANDOS PARA EXECUTAR O SISTEMA CONNECTION-4

## 📋 INSTRUÇÕES: Execute cada comando em um terminal separado do VS Code

### 🖥️ **TERMINAL 1 - BACKEND**
```powershell
cd c:\projetos\Connection-4\backend
node server.js
```
✅ **Resultado esperado**: Backend rodando na porta 3000

---

### 🌐 **TERMINAL 2 - FRONTEND** 
```powershell
cd c:\projetos\Connection-4
# Use o Live Server do VS Code (clique direito no index.html > Open with Live Server)
# OU execute um servidor simples:
python -m http.server 8000
```
✅ **Resultado esperado**: Frontend em http://localhost:8000

---

### 🐍 **TERMINAL 3 - SIMULADOR**
```powershell
cd c:\projetos\Connection-4
python simple_simulator.py
```
✅ **Resultado esperado**: Colaboradores se movendo no mapa

**⚠️ IMPORTANTE**: O simulador precisa que o backend esteja rodando primeiro!

---

## 🎯 **COMO EXECUTAR:**

1. **Abra 3 terminais no VS Code** (Terminal > New Terminal)
2. **Execute cada comando em um terminal diferente**
3. **Aguarde cada serviço iniciar** antes do próximo
4. **Acesse http://localhost:8000** no navegador
5. **Vá para "Central de Monitoramento"**
6. **Execute o simulador** para ver movimento

---

## 🔧 **ALTERNATIVA - COMANDOS INDIVIDUAIS:**

### Terminal 1:
```powershell
cd c:\projetos\Connection-4\backend
node server.js
```

### Terminal 2:
Use o Live Server do VS Code ou:
```powershell
cd c:\projetos\Connection-4
python -m http.server 8000
```

### Terminal 3:
```powershell
cd c:\projetos\Connection-4
python simple_simulator.py
```

---

## 🎮 **SIMULADOR AVANÇADO** (Opcional):
```powershell
cd c:\projetos\Connection-4
python simulator.py --workers 8 --duration 30 --speed 2
```

**Parâmetros:**
- `--workers 8`: 8 colaboradores
- `--duration 30`: 30 minutos de simulação  
- `--speed 2`: Velocidade 2x

---

## ✅ **VERIFICAÇÃO DE STATUS:**

- **Backend**: http://localhost:3000/api/status
- **Frontend**: http://localhost:8000
- **MongoDB**: Deve estar rodando localmente

---

## 🎯 **SEQUÊNCIA RECOMENDADA:**

1. ✅ Iniciar **Backend** (Terminal 1)
2. ✅ Iniciar **Frontend** (Terminal 2 ou Live Server)  
3. ✅ Acessar sistema e fazer login
4. ✅ Ir para "Central de Monitoramento"
5. ✅ Executar **Simulador** (Terminal 3)
6. ✅ Observar colaboradores se movendo!

**🎉 Sistema completo funcionando!**