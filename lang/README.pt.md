<p align="center">
  <img src="../icon/icon.png" alt="Marix Logo" width="128" height="128">
</p>

<h1 align="center">Marix</h1>

<p align="center">
  <strong>Cliente SSH Zero-Knowledge Moderno</strong>
</p>

<p align="center">
  <em>Suas credenciais nunca saem do seu dispositivo. Sem nuvem. Sem rastreamento. Sem compromissos.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License">
  <img src="https://img.shields.io/badge/zero--knowledge-🔒-critical" alt="Zero Knowledge">
  <img src="https://img.shields.io/badge/version-1.0.4-orange" alt="Version">
</p>

<p align="center">
  <a href="https://marix.dev">🌐 Site</a> •
  <a href="#-download">Download</a> •
  <a href="#-recursos">Recursos</a> •
  <a href="#-segurança">Segurança</a> •
  <a href="#-idiomas">Idiomas</a>
</p>

---

## 🌍 Outros Idiomas

| | | | |
|---|---|---|---|
| 🇺🇸 [English](../README.md) | 🇻🇳 [Tiếng Việt](README.vi.md) | 🇮🇩 [Bahasa Indonesia](README.id.md) | 🇨🇳 [中文](README.zh.md) |
| 🇰🇷 [한국어](README.ko.md) | 🇯🇵 [日本語](README.ja.md) | 🇫🇷 [Français](README.fr.md) | 🇩🇪 [Deutsch](README.de.md) |
| 🇪🇸 [Español](README.es.md) | 🇹🇭 [ภาษาไทย](README.th.md) | 🇲🇾 [Bahasa Melayu](README.ms.md) | 🇷🇺 [Русский](README.ru.md) |
| 🇵🇭 [Filipino](README.fil.md) | 🇧🇷 [Português](README.pt.md) | | |

---

## 🎯 Para Quem é o Marix?

- **Desenvolvedores e engenheiros DevOps** - Gerenciando múltiplos servidores
- **Administradores de sistemas** - Que priorizam segurança e eficiência
- **Usuários conscientes da segurança** - Que não confiam em soluções em nuvem
- **Qualquer pessoa** - Que queira controle total sobre suas credenciais SSH

---

## ⚠️ Aviso Legal

> **Você é responsável pelos seus dados.**
>
> Marix armazena todos os dados localmente com criptografia forte. No entanto:
> - Se você perder sua senha de backup, **seus dados são irrecuperáveis**
> - **Sem servidor** - não há opção "esqueci a senha"
> - **Faça backup regularmente** - hardware pode falhar
> - **A segurança é sua** - fornecemos as ferramentas, você toma as decisões
>
> Ao usar Marix, você aceita total responsabilidade pela segurança dos seus dados.

---

## 🔒 Arquitetura Zero-Knowledge

> **"Suas chaves. Seus servidores. Sua privacidade."**

### Princípios Fundamentais

| | Princípio | Descrição |
|---|-----------|-----------|
| 🔐 | **100% Offline** | Todas as credenciais armazenadas localmente no seu dispositivo—nunca enviadas |
| ☁️ | **Sem Nuvem** | Sem servidores. Seus dados nunca tocam a Internet |
| 📊 | **Sem Telemetria** | Sem rastreamento, sem analytics, sem coleta de dados |
| 🔓 | **Código Aberto** | Código totalmente auditável sob GPL-3.0, sem backdoors ocultos |

### Tecnologias de Criptografia

| | Recurso | Tecnologia | Descrição |
|---|---------|------------|-----------|
| 🛡️ | **Armazenamento Local** | Argon2id + AES-256 | Criptografa credenciais no dispositivo |
| �� | **Backup de Arquivo** | Argon2id + AES-256-GCM | Exporta arquivos `.marix` com criptografia autenticada |
| 🔄 | **Sincronização GitHub** | Argon2id + AES-256-GCM | Backup em nuvem zero-knowledge—GitHub armazena apenas blobs criptografados |

---

## ⚡ Desempenho e Otimização

Marix é otimizado para funcionar suavemente mesmo em máquinas de baixo desempenho:

### Gerenciamento Adaptativo de Memória

| RAM do Sistema | Memória Argon2id | Nível de Segurança |
|----------------|------------------|-------------------|
| ≥ 8 GB | 64 MB | Alto |
| ≥ 4 GB | 32 MB | Médio |
| < 4 GB | 16 MB | Otimizado para pouca memória |

O app detecta automaticamente a RAM do sistema e ajusta os parâmetros de criptografia para desempenho ideal enquanto mantém a segurança.

### Otimizações de Runtime

| Otimização | Técnica | Benefício |
|------------|---------|-----------|
| **Limite de Heap V8** | `--max-old-space-size=256MB` | Previne inchaço de memória |
| **Limitação em Background** | `--disable-renderer-backgrounding` | Mantém conexões ativas |
| **Buffer do Terminal** | Scrollback: 3.000 linhas | 70% menos memória que o padrão |
| **Carregamento Lazy** | Carregamento sob demanda | Inicialização mais rápida |
| **Dicas de GC** | Trigger manual de GC | Footprint de memória reduzido |

### Stack Tecnológico

| Componente | Tecnologia | Propósito |
|------------|------------|-----------|
| **Framework** | Electron 39 + React 19 | App desktop multiplataforma |
| **Terminal** | xterm.js 6 | Emulação de terminal de alto desempenho |
| **SSH/SFTP** | ssh2 + node-pty | Implementação nativa do protocolo SSH |
| **Editor de Código** | CodeMirror 6 | Destaque de sintaxe leve |
| **Criptografia** | Argon2 + Node.js Crypto | Criptografia forte do lado do cliente |
| **Estilos** | Tailwind CSS 4 | CSS moderno e minimal |
| **Build** | Webpack 5 + TypeScript 5 | Bundle de produção otimizado |

---

## 📥 Download

<table>
<tr>
<td align="center" width="33%">
<img src="https://img.icons8.com/fluency/96/windows-10.png" width="64"><br>
<b>Windows</b><br>
<a href="https://github.com/user/marix/releases/latest/download/Marix-Setup.exe">Baixar .exe</a>
</td>
<td align="center" width="33%">
<img src="https://img.icons8.com/fluency/96/mac-os.png" width="64"><br>
<b>macOS</b><br>
<a href="https://github.com/user/marix/releases/latest/download/Marix-Intel.zip">Intel .zip</a><br>
<a href="https://github.com/user/marix/releases/latest/download/Marix-arm64.zip">Apple Silicon</a>
</td>
<td align="center" width="33%">
<img src="https://img.icons8.com/fluency/96/linux.png" width="64"><br>
<b>Linux</b><br>
<a href="https://github.com/user/marix/releases/latest/download/Marix.AppImage">.AppImage</a> •
<a href="https://github.com/user/marix/releases/latest/download/marix.deb">.deb</a> •
<a href="https://github.com/user/marix/releases/latest/download/marix.rpm">.rpm</a>
</td>
</tr>
</table>

---

## ✨ Recursos

### 🔌 Conexões Multi-Protocolo

| Protocolo | Descrição |
|-----------|-----------|
| **SSH** | Secure Shell com autenticação por senha e chave privada |
| **SFTP** | Gerenciador de arquivos de painel duplo com arrastar e soltar |
| **FTP/FTPS** | Suporte a FTP padrão e seguro |
| **RDP** | Desktop remoto (xfreerdp3 no Linux, mstsc no Windows) |

### 💻 Terminal

- **400+ temas de cores** - De Dracula a Solarized, Catppuccin, Nord e mais
- **Fontes personalizáveis** - Qualquer fonte do sistema, qualquer tamanho
- **xterm.js 6 completo** - Emulação de terminal completa com suporte Unicode
- **Persistência de sessão** - Abas persistem após reconectar
- **Detecção de SO** - Detecta automaticamente a distro Linux e exibe info do sistema

### 📁 Gerenciador de Arquivos SFTP

- **Interface de painel duplo** - Local ↔ Remoto lado a lado
- **Editor integrado** - CodeMirror 6 com destaque de sintaxe para 15+ linguagens
- **Arrastar e soltar** - Upload/Download de arquivos facilmente
- **Gerenciamento de permissões** - chmod com interface visual
- **Operações em lote** - Selecionar múltiplos arquivos para transferência

### 🛠️ Ferramentas Integradas

#### Transferência de Arquivos LAN
*Compartilhar arquivos instantaneamente entre dispositivos na rede local.*

#### Compartilhamento de Servidores LAN
*Compartilhar configurações de servidor de forma segura com dispositivos próximos.*

#### Ferramentas DNS e Rede
- Consulta DNS
- Consultas WHOIS
- Scanner de portas
- Traceroute

#### Gerenciador de DNS Cloudflare
*Ferramenta integrada opcional para gerenciar DNS do Cloudflare diretamente do seu espaço de trabalho SSH.*

#### Gerenciador de Chaves SSH
- Gerar pares de chaves SSH (Ed25519, RSA, ECDSA)
- Importar/Exportar chaves
- Gerenciar known hosts

#### Gerenciador de Known Hosts
- Ver e gerenciar known hosts
- Remover fingerprints antigos
- Exportar/Importar known hosts

### 🎨 Experiência do Usuário

- **Temas escuro e claro** - Seguir o sistema ou alternar manualmente
- **14 idiomas** suportados
- **Tags de servidor** - Organizar com tags coloridas
- **Conexão rápida** - Cmd/Ctrl+K para buscar servidores
- **Histórico de conexões** - Acesso rápido a conexões recentes

---

## 💾 Backup e Restauração

### Como a Criptografia Funciona

Todos os backups usam **Argon2id** (vencedor da Password Hashing Competition) e **AES-256-GCM** (criptografia autenticada):

```
Senha → Argon2id(memória 16-64MB) → Chave 256-bit → AES-256-GCM → Backup Criptografado
```

### Dados do Backup

| Dados | Incluídos | Criptografados |
|-------|-----------|----------------|
| Lista de servidores (host, porta, credenciais) | ✅ | ✅ |
| Chaves privadas SSH | ✅ | ✅ |
| Tokens de API do Cloudflare | ✅ | ✅ |
| Configurações e preferências do app | ✅ | ✅ |
| Known hosts | ✅ | ✅ |

### Garantias de Segurança

🔐 **Senha nunca armazenada** — nem no arquivo, nem no GitHub, em lugar nenhum  
🔒 **Zero-Knowledge** — nem os desenvolvedores do Marix podem descriptografar seus backups  
🛡️ **Resistente a força bruta** — Argon2id requer 16-64MB de RAM por tentativa  
✅ **À prova de adulteração** — AES-GCM detecta qualquer alteração nos dados criptografados  
🔄 **Compatível entre máquinas** — backups armazenam custo de memória para portabilidade

---

### Backup Local Criptografado

Exporte todos os seus dados como arquivo `.marix` criptografado:

1. **Vá para Configurações** → **Backup e Restauração**
2. **Crie uma senha** (atendendo aos requisitos):
   - Mínimo 10 caracteres
   - 1 maiúscula, 1 minúscula, 1 dígito, 1 caractere especial
3. **Exporte** - o arquivo é criptografado antes de salvar
4. **Guarde com segurança** - mantenha o arquivo de backup, lembre-se da senha

---

### Backup no Google Drive (Zero-Knowledge)

Sincronize backups criptografados com segurança no Google Drive:

#### Configuração

📘 **Guia de Configuração**: Veja [docs/google/GOOGLE_DRIVE_SETUP.pt.md](../docs/google/GOOGLE_DRIVE_SETUP.pt.md)

ℹ️ **Versões pré-construídas**: Se você estiver usando releases pré-construídas (AppImage, RPM, etc.), as credenciais do Google já estão incluídas. Você pode pular o passo 1 e conectar diretamente.

1. **Configure as credenciais OAuth**:
   - Crie um projeto no Google Cloud
   - Habilite a API do Google Drive
   - Crie um OAuth 2.0 Client ID
   - Baixe o arquivo JSON de credenciais
   - Salve como `src/main/services/google-credentials.json`

2. **Conecte no Marix**:
   - Vá para Configurações → Backup e Restauração → Google Drive
   - Clique em "Conectar ao Google Drive"
   - O navegador abre para OAuth do Google
   - Conceda permissões
   - O app recebe o token seguro

3. **Crie um backup**:
   - Insira a senha de criptografia (10+ caracteres)
   - Clique em "Criar backup"
   - O arquivo é enviado para a pasta "Marix Backups" no Drive

4. **Restaure um backup**:
   - Clique em "Restaurar do Google Drive"
   - Insira a senha do backup
   - Todos os servidores e configurações são restaurados

#### Como Funciona

✅ **Criptografia ponta-a-ponta** - dados são criptografados antes de sair do seu dispositivo  
✅ **Zero-Knowledge** - Google só vê blobs criptografados  
✅ **Só você tem a chave** - token OAuth armazenado localmente  
✅ **Pasta privada** - arquivos acessíveis apenas pelo seu app

---

### Backup no GitHub (Zero-Knowledge)

Sincronize backups criptografados com segurança em um repositório privado do GitHub:

#### Configuração

1. **Faça login com GitHub**:
   - Vá para Configurações → Backup e Restauração → Backup GitHub
   - Clique em "Fazer login com GitHub"
   - Um código de dispositivo aparece no app
   - O navegador abre automaticamente - insira o código para autenticar
   - Pronto! Um repositório privado `marix-backup` é criado automaticamente

2. **Faça backup**:
   - Clique em "Fazer backup no GitHub"
   - Insira a senha do backup
   - Dados criptografados são enviados para o repositório

3. **Restaure em outro dispositivo**:
   - Instale o Marix
   - Faça login com GitHub (mesmos passos)
   - Clique em "Restaurar do GitHub"
   - Insira a senha do backup para descriptografar

#### Por Que o GitHub é Seguro

| Camada | Proteção |
|--------|----------|
| **Criptografia do lado do cliente** | Dados são criptografados antes de sair do dispositivo |
| **Argon2id KDF** | 16-64MB memória, 3 iterações, 4 lanes paralelas |
| **AES-256-GCM** | Criptografia autenticada com IV aleatório |
| **Armazenamento GitHub** | Armazena apenas texto cifrado criptografado |
| **Sem servidor Marix** | Cliente ↔ GitHub diretamente |

⚠️ **Importante**: Se você perder sua senha de backup, seus backups são **permanentemente irrecuperáveis**. Não podemos descriptografá-los. Ninguém pode.

---

## 🛡️ Especificações de Segurança

### Detalhes da Criptografia

| Algoritmo | Parâmetros |
|-----------|------------|
| **Derivação de chave** | Argon2id (Memória: 16-64MB, Iterações: 3, Paralelismo: 4) |
| **Criptografia simétrica** | AES-256-GCM |
| **Salt** | 32 bytes (aleatório criptográfico) |
| **IV/Nonce** | 16 bytes (único por criptografia) |
| **Tag de autenticação** | 16 bytes (GCM auth tag) |

### Algoritmos de Chaves SSH

| Algoritmo | Tamanho da Chave | Uso |
|-----------|------------------|-----|
| **Ed25519** | 256-bit | Recomendado (rápido, seguro) |
| **RSA** | 2048-4096-bit | Compatibilidade legada |
| **ECDSA** | 256-521-bit | Alternativa ao Ed25519 |

### Requisitos de Senha

Senhas de backup devem ter:

✅ Mínimo 10 caracteres  
✅ Pelo menos 1 maiúscula (A-Z)  
✅ Pelo menos 1 minúscula (a-z)  
✅ Pelo menos 1 dígito (0-9)  
✅ Pelo menos 1 caractere especial (!@#$%^&*...)

---

## 🔧 Compilar do Código Fonte

```bash
# Clone o repositório
git clone https://github.com/user/marix.git
cd marix

# Instale as dependências
npm install

# Desenvolvimento
npm run dev

# Compilar
npm run build

# Empacotar para distribuição
npm run package:win    # Windows (.exe)
npm run package:mac    # macOS (.zip)
npm run package:linux  # Linux (.AppImage, .deb, .rpm)
```

### Requisitos do Sistema

|  | Mínimo | Recomendado |
|--|--------|-------------|
| **SO** | Windows 10, macOS 10.13, Ubuntu 18.04 | Última versão |
| **RAM** | 2 GB | 4 GB+ |
| **Armazenamento** | 200 MB | 500 MB |

### Dependências RDP para Linux

```bash
# Instale xfreerdp3 para suporte RDP
sudo apt install freerdp3-x11  # Debian/Ubuntu
sudo dnf install freerdp       # Fedora
sudo pacman -S freerdp         # Arch
```

---

## 📄 Licença

Este projeto é licenciado sob a **GNU General Public License v3.0** (GPL-3.0).

Isso significa:

✅ Você pode usar, modificar e distribuir este software  
✅ Você pode usá-lo para propósitos comerciais  
⚠️ Todas as modificações devem também ser lançadas sob GPL-3.0  
⚠️ Você deve disponibilizar o código fonte ao distribuir  
⚠️ Você deve indicar as alterações feitas no código

Veja [LICENSE](../LICENSE) para o texto completo da licença.

---

<p align="center">
  <strong>Marix</strong><br>
  Cliente SSH Zero-Knowledge Moderno<br><br>
  <em>Seus dados. Sua responsabilidade. Sua liberdade.</em><br><br>
  Se você quer conveniência ao custo da sua privacidade, Marix não é para você.
</p>
