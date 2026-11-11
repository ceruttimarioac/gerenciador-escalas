# Gerenciador de Escalas

Aplicação web para gerenciar colaboradores, funções e escalas de trabalho. O projeto usa React/Vite no frontend, APIs Node.js e PostgreSQL para persistência.

## Requisitos

- Node.js e npm
- Docker Desktop com o engine Linux iniciado (Windows/macOS) ou Docker Engine com o plugin Docker Compose (Linux)

## PostgreSQL com Docker

O arquivo `compose.yaml` define um serviço PostgreSQL 17. O banco é exposto somente no computador local, na porta `5433`, e usa o volume `postgres_data` para manter os dados entre reinicializações.

### Instalar o Docker

- **Windows/macOS:** instale o [Docker Desktop](https://www.docker.com/products/docker-desktop/). No Windows, habilite o WSL 2 caso o instalador solicite e aguarde o Docker Desktop indicar que está em execução.
- **Linux:** instale o Docker Engine e o plugin Docker Compose para sua distribuição.

Na pasta do projeto, confirme que o Docker está acessível:

```powershell
docker info
docker compose version
```

Se `docker info` informar que não consegue conectar ao engine, inicie o Docker Desktop antes de executar os comandos seguintes.

### Subir o banco

Na raiz do projeto:

```powershell
docker compose up -d postgres
docker compose ps
docker compose logs -f postgres
```

O Compose cria o banco `gerenciador_escalas`, com usuário `escalas`, e executa os scripts SQL de `database/init` na primeira inicialização do volume. Quando o log indicar que o servidor está pronto para aceitar conexões, o banco pode ser usado. Para sair da visualização dos logs, pressione `Ctrl+C`; isso não para o container.

Para parar o serviço sem apagar os dados:

```powershell
docker compose down
```

Para iniciar novamente:

```powershell
docker compose up -d postgres
```

### Configuração da conexão da API

As configurações locais do Registrador ficam em `ApiRegistrador/config-apiregistrador.js`. Esse arquivo é ignorado pelo Git, então ajuste-o na sua cópia local. Para executar as APIs diretamente no computador (fora do Docker), os valores do banco devem corresponder ao serviço do Compose:

```js
export const IP_DB = '127.0.0.1'
export const PORT_DB = 5433
export const USER_DB = 'escalas'
export const PASSWORD_DB = 'escalas_dev_123'
export const DATABASE_DB = 'gerenciador_escalas'
```

Mantenha as demais configurações locais desse arquivo, como endereço e porta da API. O mapeamento `127.0.0.1:5433:5432` significa que a conexão do computador usa a porta `5433`; a porta interna do PostgreSQL no container continua sendo `5432`.

Se futuramente executar a API dentro de um container na mesma rede do Compose, use `postgres` como host e `5432` como porta. Nesse cenário, o container da API deve estar conectado à rede do Compose.

### Personalizar o banco

As opções principais estão no serviço `postgres` de `compose.yaml`:

- `POSTGRES_DB`: nome inicial do banco.
- `POSTGRES_USER` e `POSTGRES_PASSWORD`: usuário e senha iniciais.
- `ports`: porta e endereço expostos no computador. Por exemplo, para usar a porta local `5434`, altere para `"127.0.0.1:5434:5432"` e configure `PORT_DB = 5434` na API.
- `postgres_data`: volume persistente do banco.
- `./database/init:/docker-entrypoint-initdb.d:ro`: scripts SQL executados na primeira criação do banco/volume.

Ao alterar nome do banco, usuário, senha ou porta, atualize também os valores correspondentes em `ApiRegistrador/config-apiregistrador.js`. As variáveis `POSTGRES_*` são aplicadas pelo container oficial ao inicializar um diretório de dados vazio; alterar esses valores depois que o volume já existe não recria o usuário/banco nem executa novamente os scripts.

As credenciais incluídas no Compose são somente para desenvolvimento local. Use credenciais fortes e um mecanismo seguro de configuração de segredos fora do desenvolvimento; não exponha a porta do banco à rede pública.

### Recriar o banco do zero

**Atenção:** remover o volume apaga permanentemente os dados armazenados no PostgreSQL. Para recriar somente o volume deste projeto:

```powershell
docker compose down
docker volume rm gerenciador-escalas_postgres_data
docker compose up -d postgres
```

O script `database/init/001_schema.sql` será executado novamente na criação do volume vazio. Não é necessário remover o volume para iniciar ou parar normalmente o banco.

## Instalar dependências e executar a aplicação

Depois de configurar o Docker e a conexão local da API:

```powershell
npm install
npm run dev
```

O script `dev` inicia o frontend e as APIs do projeto. Consulte as configurações locais ignoradas pelo Git (incluindo Firebase e outros serviços usados pelas APIs) e preencha os valores exigidos para seu ambiente antes de usar os recursos correspondentes.

## Scripts disponíveis

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia frontend e APIs em modo de desenvolvimento. |
| `npm run dev:frontend` | Inicia somente o frontend Vite. |
| `npm run dev:apigerenciador` | Inicia somente a API Gerenciador. |
| `npm run dev:apiregistrador` | Inicia somente a API Registrador. |
| `npm run dev:apiia` | Inicia somente a API de IA. |
| `npm run build` | Gera a build de produção do frontend. |
| `npm run lint` | Executa o Oxlint. |
