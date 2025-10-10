# Sistema de Monitoramento de Segurança em Obras

Projeto acadêmico desenvolvido como parte da disciplina **Desenvolvimento de Sistemas Web**, com o objetivo de simular um ambiente de monitoramento em tempo real para controle de segurança em canteiros de obras.

---

## 1. Objetivo

O sistema visa representar, de forma simplificada, um modelo de monitoramento de segurança baseado em sensores e dispositivos de rastreamento.  
A aplicação permite o **cadastro de pessoas e dispositivos**, bem como a **simulação de movimentações em tempo real**.

---

## 2. Estrutura do Projeto

O projeto foi desenvolvido seguindo o padrão **MVC (Model-View-Controller)**, dividido em:

- **Model:** Gerencia os dados e a persistência local (via `localStorage`);
- **View:** Responsável pela renderização das interfaces e interação com o usuário;
- **Controller:** Faz a ponte entre as ações do usuário e os dados da aplicação.

