# Sistema de Controle de Acesso - Connection-4

## 📋 Visão Geral

Sistema completo de controle de acesso implementado para monitorar e restringir o acesso de colaboradores às áreas do canteiro de obras baseado em suas funções.

## 🎯 Funcionalidades Implementadas

### 1. **Modelo de Controle de Acesso** (`accessControlModel.js`)
- ✅ Definição de permissões por área
- ✅ Verificação automática de autorização
- ✅ Registro de alertas de acesso não autorizado
- ✅ Sistema de níveis de risco (ALTO, MÉDIO, BAIXO)

### 2. **Áreas Restritas**

#### **Área de Guindastes** (zona_perigo_1)
- **Nível de Risco:** ALTO
- **Acesso Restrito:** Sim
- **Funções Autorizadas:**
  - Operador de Guindaste
  - Guincheiro
  - Operador de Torre
  - Engenheiro/Engenheira Civil
  - Engenheiro de Segurança
  - Técnico de Segurança
  - Supervisor

#### **Área de Soldas** (zona_perigo_2)
- **Nível de Risco:** ALTO
- **Acesso Restrito:** Sim
- **Funções Autorizadas:**
  - Soldador/Soldadora
  - Auxiliar de Solda
  - Engenheiro/Engenheira Civil
  - Engenheiro de Segurança
  - Técnico de Segurança
  - Supervisor

### 3. **Áreas Controladas** (Acesso por Função)

#### **Construção Principal**
- Nível de Risco: MÉDIO
- Funções: Pedreiro, Servente, Armador, Carpinteiro, Encarregado, Engenheiro, Mestre de Obras, Supervisor

#### **Oficina Mecânica**
- Nível de Risco: MÉDIO
- Funções: Mecânico, Eletricista, Técnico de Manutenção, Auxiliar de Manutenção, Engenheiro, Supervisor

#### **Central de Concreto**
- Nível de Risco: MÉDIO
- Funções: Operador de Betoneira, Operador de Bomba, Motorista, Engenheiro, Técnico em Qualidade, Supervisor

### 4. **Áreas de Acesso Livre**
- Portaria Principal
- Escritório de Obras
- Almoxarifado Geral
- Depósito Material
- Estacionamento
- Refeitório
- Enfermaria
- Vestiários (Masculino e Feminino)
- Área de Limpeza
- Manutenção
- Guarita Saída
- Lab. Qualidade

## 🚨 Sistema de Alertas

### Tipos de Alertas

#### **Alerta de Acesso Não Autorizado**
- **Tipo:** UNAUTHORIZED_ACCESS
- **Severidade:** HIGH
- **Disparo:** Quando colaborador sem autorização entra em área restrita
- **Informações Registradas:**
  - Nome do colaborador
  - Função do colaborador
  - ID do dispositivo
  - Área acessada
  - Nível de risco da área
  - Posição no mapa
  - Timestamp
  - Motivo da restrição

#### **Visualização de Alertas**
- Painel de Controle: Mostra últimos 5 alertas em tempo real
- Histórico: Mantém últimos 50 alertas
- Auto-limpeza: Remove alertas com mais de 1 hora

## 🎨 Indicadores Visuais

### No Mapa
- **🟢 Verde:** Colaborador em área autorizada
- **🔴 Vermelho:** Colaborador em zona de perigo
- **🟠 Laranja (Pulsante):** Colaborador sem autorização na área

### Na Lista de Colaboradores
- **Badge Verde:** ✅ OK - Tudo normal
- **Badge Vermelho:** ⚠️ RISCO - Em zona perigosa
- **Badge Laranja:** 🚫 SEM ACESSO - Acesso não autorizado

### Animações
- Ícones pulsantes para acessos não autorizados
- Badge de alerta no ícone do colaborador
- Destaque visual na lista lateral

## 📊 Como Funciona

### Fluxo de Verificação
1. Sistema detecta posição do colaborador (x, y)
2. Identifica em qual área o colaborador está
3. Consulta função/cargo do colaborador
4. Verifica permissões para aquela área
5. Se não autorizado:
   - Registra alerta no sistema
   - Atualiza visualização (cor laranja)
   - Mostra notificação no painel
   - Adiciona badge de alerta
6. Atualização a cada 3 segundos

### Persistência
- Alertas armazenados em memória (frontend)
- Histórico de últimos 50 alertas
- Limpeza automática de alertas antigos (>1h)

## 🔧 APIs Disponíveis

### AccessControlModel

```javascript
// Verificar acesso de um colaborador
AccessControlModel.checkAccess(role, areaId)
// Retorna: {authorized: boolean, reason: string, riskLevel: string, areaName: string}

// Registrar alerta manualmente
AccessControlModel.registerAlert(alertData)

// Obter todos os alertas
AccessControlModel.getAlerts()

// Obter informações de uma área
AccessControlModel.getAreaPermissions(areaId)

// Listar áreas restritas
AccessControlModel.getRestrictedAreas()

// Verificar acessos a áreas de risco por função
AccessControlModel.getRiskAreasAccess(role)
```

## 🎯 Integração com Simulador Python

O simulador Python (`simple_simulator.py`) já está configurado com as funções corretas:
- Operador de Guindaste → Área de Guindastes ✅
- Soldadora → Área de Soldas ✅
- Outros colaboradores em suas áreas específicas ✅

**Teste de Acesso Não Autorizado:**
Para testar o sistema, mova um colaborador (ex: "Cozinheira") para a área de Guindastes ou Soldas - o sistema gerará alerta automaticamente.

## 📱 Interface do Usuário

### Painel de Controle
- **Colaboradores Ativos:** Lista com status visual
- **Alertas de Segurança:** Zonas de perigo tradicionais
- **Controle de Acesso:** Novos alertas de acesso não autorizado
- **Botão "Áreas Restritas":** Modal com documentação completa

### Modal de Áreas Restritas
- Lista de áreas de alto risco
- Funções autorizadas para cada área
- Nível de risco e requisitos de EPI
- Informações sobre outras áreas

## ✅ Benefícios do Sistema

1. **Segurança:** Previne acidentes por acesso indevido a áreas perigosas
2. **Rastreabilidade:** Registra todos os acessos não autorizados
3. **Conformidade:** Garante que apenas pessoal qualificado acesse áreas críticas
4. **Visibilidade:** Gestores veem em tempo real quem está onde
5. **Alertas Proativos:** Notificações imediatas de violações
6. **Auditoria:** Histórico de alertas para análise posterior

## 🚀 Próximos Passos (Opcional)

- [ ] Integrar alertas com backend (persistência)
- [ ] Enviar notificações por e-mail/SMS
- [ ] Dashboard de relatórios de acesso
- [ ] Integração com catracas eletrônicas
- [ ] Logs de auditoria persistentes
- [ ] Configuração dinâmica de permissões via interface

## 📞 Uso

1. Acesse `http://localhost:3000`
2. Vá para "Central de Monitoramento"
3. Execute o simulador Python: `python simple_simulator.py`
4. Observe colaboradores se movendo pelo mapa
5. Clique em "Áreas Restritas" para ver as permissões
6. Quando um colaborador entrar em área não autorizada, verá:
   - Ícone laranja pulsante no mapa
   - Alerta no painel de controle
   - Badge "SEM ACESSO" na lista

---

**Status:** ✅ Sistema totalmente funcional e operacional
**Última Atualização:** 04/11/2025
