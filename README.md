# Connection-4

Simulação — Segurança em Obras (frontend)

Projeto em estrutura MVC para simular sensores de proximidade, cadastro de pessoas e associação de chips.

Como usar (rápido):

1. Abra um terminal na pasta do projeto (onde está este README).
2. Rode: `npx http-server -p 8001` (ou instale `http-server` globalmente).
3. Abra: `http://127.0.0.1:8001/view/map.html`

Notas:
- Dados de teste são persistidos no localStorage.
- As páginas usam WebAudio e Vibration APIs para simular alertas.

Este commit restaura arquivos apagados localmente e organiza os assets.<<<<<<< HEAD

Simulação - Segurança em Obras (Frontend)
Estrutura MVC (apenas frontend).

Como usar:
1. Extraia e abra index.html no navegador (ou sirva via servidor estático).
2. Navegue entre 'Mapa', 'Cadastro Pessoas' e 'Cadastro Dispositivos'.
3. Cadastre dispositivos e pessoas; associe devices a pessoas.
4. No mapa, movimente devices manualmente para simular entrada/saída de zonas de risco.

Observações:
- Dados persistem no localStorage do navegador.
- Mapa é simulado (coordenadas relativas 0..1).
=======
```markdown
# Connection-4

Projeto minimal para monitoramento de sensores de proximidade em canteiros de obra.

Estrutura recomendada:
- `model/` — modelos e persistência
- `view/` — páginas estáticas (mapa e cadastro)
- `controller/` — endpoints / integração com hardware
- `assets/` — CSS, JS e imagens compartilhadas

Como rodar localmente (requer Node.js/npm):

1. Abrir terminal na raiz do projeto (onde está este README)
2. Instalar http-server (opcional): `npm i -g http-server` ou usar `npx http-server` para rodar sem instalar.
3. Rodar: `npx http-server -p 8001` e abrir `http://127.0.0.1:8001/view/map.html`

Obs: as páginas usam APIs de navegador (WebAudio e Vibration). Teste em um navegador moderno.

Commit de limpeza: arquivos duplicados removidos e `assets/` centralizado.

``` 
# Connection-4
>>>>>>> origin/main
