# Guia de Configuração de Backup do Box.net

> **Idiomas**: [🇺🇸 English](BOX_SETUP.en.md) | [🇻🇳 Tiếng Việt](BOX_SETUP.vi.md) | [🇮🇩 Bahasa Indonesia](BOX_SETUP.id.md) | [🇨🇳 中文](BOX_SETUP.zh.md) | [🇰🇷 한국어](BOX_SETUP.ko.md) | [🇯🇵 日本語](BOX_SETUP.ja.md) | [🇫🇷 Français](BOX_SETUP.fr.md) | [🇩🇪 Deutsch](BOX_SETUP.de.md) | [🇪🇸 Español](BOX_SETUP.es.md) | [🇹🇭 ภาษาไทย](BOX_SETUP.th.md) | [🇲🇾 Bahasa Melayu](BOX_SETUP.ms.md) | [🇷🇺 Русский](BOX_SETUP.ru.md) | [🇵🇭 Filipino](BOX_SETUP.fil.md) | [🇧🇷 Português](BOX_SETUP.pt.md)

---

## Passo 1: Criar Conta de Desenvolvedor Box

1. Acesse o [Box Developer Console](https://app.box.com/developers/console)
2. Faça login com sua conta Box (ou crie uma)
3. Clique em **"Create New App"**

## Passo 2: Criar Aplicação OAuth 2.0

1. Selecione **"Custom App"**
2. Escolha **"User Authentication (OAuth 2.0)"**
3. Nomeie sua aplicação: `Marix SSH Client` ou qualquer nome preferido
4. Clique em **"Create App"**

## Passo 3: Configurar Definições da Aplicação

### 3.1. Credenciais OAuth 2.0

1. Nas configurações da aplicação, vá para a aba **"Configuration"**
2. Anote:
   - **Client ID**
   - **Client Secret** (clique em "Fetch Client Secret" se necessário)

### 3.2. OAuth 2.0 Redirect URI

1. Role até **"OAuth 2.0 Redirect URI"**
2. Adicione: `http://localhost` (Box permite qualquer porta localhost)
3. Clique em **"Save Changes"**

### 3.3. Escopos da Aplicação

1. Em **"Application Scopes"**, certifique-se de que estão habilitados:
   - ✅ Read all files and folders stored in Box
   - ✅ Write all files and folders stored in Box
2. Clique em **"Save Changes"**

## Passo 4: Configurar Credenciais no Marix

### Opção A: Desenvolvimento Local

1. Crie `box-credentials.json` em `src/main/services/`:
```json
{
  "client_id": "YOUR_BOX_CLIENT_ID",
  "client_secret": "YOUR_BOX_CLIENT_SECRET"
}
```

2. **IMPORTANTE**: Adicione ao `.gitignore`:
```
src/main/services/box-credentials.json
```

### Opção B: CI/CD com GitHub Secrets (Recomendado)

1. Vá para seu repositório GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Adicione estes secrets:
   - `BOX_CLIENT_ID`: Seu Box Client ID
   - `BOX_CLIENT_SECRET`: Seu Box Client Secret
3. O workflow de build injetará automaticamente as credenciais durante a compilação

## Passo 5: Testar Fluxo OAuth

1. Abra a aplicação Marix
2. Vá para **Configurações** > **Backup e Restauração** > **Criar/Restaurar Backup**
3. Selecione a aba **"Box"**
4. Clique em **"Conectar ao Box"**
5. O navegador abrirá a tela OAuth do Box
6. Faça login e conceda permissões
7. A aplicação receberá o token e exibirá "Conectado"

## Notas de Segurança

- **NÃO** faça commit de `box-credentials.json` no Git
- Use **GitHub Secrets** para builds CI/CD para proteger o client_secret
- Tokens são armazenados com segurança usando safeStorage do Electron
- PKCE é usado para segurança adicional do fluxo OAuth
- Portas de callback aleatórias são usadas para evitar conflitos

## Aprovação da Aplicação (Opcional)

Para uso pessoal, sua aplicação funciona imediatamente. Para distribuição pública:

1. Vá para a aba **"General Settings"**
2. Submeta sua aplicação para revisão se necessário
3. Box revisará e aprovará sua aplicação

## Solução de Problemas

### Erro: "Invalid client_id or client_secret"
- Verifique as credenciais no seu arquivo box-credentials.json
- Copie novamente o Client ID e Client Secret do Box Developer Console

### Erro: "Redirect URI mismatch"
- Certifique-se de que `http://localhost` está adicionado nas configurações da aplicação Box
- Box suporta portas dinâmicas com localhost

### Erro: "Access denied"
- Usuário negou a concessão de permissão
- Verifique os escopos da aplicação no Box Developer Console
