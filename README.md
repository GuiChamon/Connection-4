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
