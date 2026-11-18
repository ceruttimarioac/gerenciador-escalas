# Passo a passo para instalar e executar

Este guia é para Windows e pressupõe que você já tem acesso à conta Google e ao projeto Firebase usados pelo sistema. Não crie outra conta ou projeto se já tiver acesso ao projeto existente.

## 1. Instale os programas necessários

Abra cada endereço no navegador e instale o programa com as opções recomendadas:

1. Git: https://git-scm.com/download/win
2. Node.js LTS: https://nodejs.org/en/download
3. Docker Desktop: https://www.docker.com/products/docker-desktop/

Durante a instalação do Docker, aceite a instalação do WSL 2 caso seja solicitada. Reinicie o computador se o instalador pedir. Depois, abra o Docker Desktop e espere aparecer que ele está em execução.

## 2. Crie uma pasta na Área de Trabalho e baixe o projeto

1. Abra o Explorador de Arquivos com `Windows + E`.
2. Abra a **Área de Trabalho**.
3. Crie uma pasta chamada `ambiente`.
4. Abra a pasta `ambiente`.
5. Clique na barra de endereço do Explorador, digite `powershell` e pressione `Enter`.
6. Na janela que abrir, copie e execute:

```powershell
git clone https://github.com/ceruttimarioac/gerenciador-escalas.git
cd gerenciador-escalas
```

Mantenha essa janela aberta. Os próximos comandos devem ser executados nela, dentro da pasta `gerenciador-escalas`.

## 3. Crie os arquivos de configuração

Copie e execute estes três comandos no PowerShell:

```powershell
Copy-Item .\ApiGerenciador\config-apigerenciador-exemplo.js .\ApiGerenciador\config-apigerenciador.js
Copy-Item .\ApiIa\config-apiia-exemplo.js .\ApiIa\config-apiia.js
Copy-Item .\ApiRegistrador\config-apiregistrador-exemplo.js .\ApiRegistrador\config-apiregistrador.js
```

Agora abra cada arquivo para editar:

```powershell
notepad .\ApiGerenciador\config-apigerenciador.js
notepad .\ApiIa\config-apiia.js
notepad .\ApiRegistrador\config-apiregistrador.js
```

Execute um comando por vez. Depois de editar cada arquivo no Bloco de Notas, clique em **Arquivo > Salvar** e feche-o.

## 4. Pegue a chave do Firebase e habilite email e senha

1. Abra https://console.firebase.google.com/
2. Entre com a conta Google que já tem acesso ao projeto Firebase do sistema.
3. Selecione o projeto existente do sistema. Não crie outro projeto.
4. Clique na engrenagem ao lado de **Visão geral do projeto** e escolha **Configurações do projeto**.
5. Na aba **Geral**, localize **Chave da API da Web** e copie o valor.
6. No menu esquerdo, abra **Authentication** e depois **Sign-in method** ou **Método de login**.
7. Abra **Email/Password** ou **E-mail/senha**, habilite a opção e clique em **Salvar**.

Cole a chave da API da Web no campo `KEY_FIREBASE_API` de `ApiGerenciador/config-apigerenciador.js`. Mantenha as aspas:

```js
export const KEY_FIREBASE_API = 'COLE_A_CHAVE_DA_API_WEB_AQUI'
```

## 5. Pegue a chave do Gemini

1. Abra https://aistudio.google.com/app/apikey
2. Entre com sua conta Google.
3. Selecione um projeto Google ao qual você já tenha acesso.
4. Clique em **Create API key** ou **Criar chave de API**. Se já tiver uma chave para esse projeto, pode reutilizá-la.
5. Copie a chave e cole no campo `GEMINI_API_KEY` de `ApiIa/config-apiia.js`, mantendo as aspas:

```js
export const GEMINI_API_KEY = 'COLE_A_CHAVE_DO_GEMINI_AQUI'
```

## 6. Preencha os arquivos de configuração

Use os valores abaixo nos arquivos que abriu. Substitua somente os textos indicados para as chaves.

### `ApiGerenciador/config-apigerenciador.js`

```js
export const ADDRESS_WEB = 'http://localhost:5173'
export const ADDRESS_API = '127.0.0.1'
export const PORT_API = 20222
export const ADDRESS_APIIA = '127.0.0.1:20221'
export const ADDRESS_APIREGISTRADOR = '127.0.0.1:20220'
export const KEY_FIREBASE_API = 'COLE_A_CHAVE_DA_API_WEB_AQUI'
```

### `ApiIa/config-apiia.js`

```js
export const ADDRESS_API = '127.0.0.1'
export const PORT_API = 20221
export const TIMEOUT_IA = 60000
export const GEMINI_API_KEY = 'COLE_A_CHAVE_DO_GEMINI_AQUI'
```

### `ApiRegistrador/config-apiregistrador.js`

```js
export const ADDRESS_API = '127.0.0.1'
export const PORT_API = '20220'
export const IP_DB = '127.0.0.1'
export const PORT_DB = '5433'
export const USER_DB = 'escalas'
export const PASSWORD_DB = 'escalas_dev_123'
export const DATABASE_DB = 'gerenciador_escalas'
```

Salve os três arquivos. Não cole suas chaves nos arquivos com `-exemplo.js` e não as envie em mensagens ou capturas de tela.

## 7. Inicie o banco de dados

Confirme que o Docker Desktop está aberto e em execução. No PowerShell, ainda dentro da pasta `gerenciador-escalas`, execute:

```powershell
docker compose up -d postgres
docker compose ps
```

Na coluna `STATUS`, espere aparecer `healthy`. Se aparecer `starting`, aguarde alguns segundos e execute `docker compose ps` novamente.

Se aparecer erro informando que a porta `5433` já está em uso, outro programa ou container está usando essa porta. Feche o container antigo pelo Docker Desktop e repita o comando. Não apague volumes do Docker: eles podem conter dados.

## 8. Instale os arquivos do projeto

No mesmo PowerShell, execute:

```powershell
npm install
```

Espere o comando terminar. Não feche a janela.

## 9. Inicie o sistema

Execute:

```powershell
npm run dev
```

Deixe essa janela aberta enquanto estiver usando o sistema. Abra o navegador e acesse:

http://localhost:5173

## 10. Crie o primeiro usuário do sistema

1. Na página de login, clique em **Registrar-se**.
2. Cadastre um email e uma senha.
3. Volte à página de login e entre com esse email e senha.
4. No primeiro acesso, preencha os dados da empresa, do administrador e da função inicial.
5. Depois da configuração, o sistema estará pronto para uso.

## 11. Para parar e iniciar novamente

Para parar o sistema, volte ao PowerShell onde executou `npm run dev` e pressione `Ctrl + C`.

Para iniciar novamente:

1. Abra o Docker Desktop e espere ficar em execução.
2. Abra o PowerShell dentro da pasta `gerenciador-escalas`.
3. Execute:

```powershell
docker compose up -d postgres
npm run dev
```

Os dados do banco continuam salvos. Não use comandos para apagar volumes se quiser manter os dados.
