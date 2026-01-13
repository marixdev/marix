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
</p>

---

## 🌍 Outros Idiomas

| | | | |
|---|---|---|---|
| 🇺🇸 [English](../README.md) | 🇻🇳 [Tiếng Việt](README.vi.md) | 🇮🇩 [Bahasa Indonesia](README.id.md) | 🇨🇳 [中文](README.zh.md) |
| 🇰🇷 [한국어](README.ko.md) | 🇯🇵 [日本語](README.ja.md) | 🇫🇷 [Français](README.fr.md) | 🇩🇪 [Deutsch](README.de.md) |
| 🇪🇸 [Español](README.es.md) | 🇹🇭 [ภาษาไทย](README.th.md) | 🇲🇾 [Bahasa Melayu](README.ms.md) | 🇷🇺 [Русский](README.ru.md) |
| 🇵🇭 [Filipino](README.fil.md) | | | |

---

## ⚠️ Aviso Legal

> **VOCÊ É RESPONSÁVEL PELOS SEUS PRÓPRIOS DADOS.**
>
> O Marix armazena todos os dados localmente no seu dispositivo com criptografia forte. No entanto:
> - **Não podemos recuperar seus dados** se você perder sua senha de backup
> - **Não temos servidores** — não há opção "esqueci a senha"
> - **Faça backup regularmente** — hardware pode falhar
> - **Você controla sua segurança** — fornecemos as ferramentas, você toma as decisões

---

## 🔒 Arquitetura Zero-Knowledge

### Princípios Fundamentais

| | Princípio | Descrição |
|---|-----------|-----------|
| 🔐 | **100% Offline** | Todas as credenciais armazenadas localmente—nunca enviadas |
| ☁️ | **Sem Nuvem** | Não temos servidores. Seus dados nunca tocam a Internet |
| 📊 | **Sem Telemetria** | Sem rastreamento, sem análises, sem coleta de dados |
| 🔓 | **Código Aberto** | Código totalmente auditável sob GPL-3.0 |

### Tecnologia de Criptografia

| | Recurso | Tecnologia | Descrição |
|---|---------|------------|-----------|
| 🛡️ | **Armazenamento Local** | Argon2id + AES-256 | Credenciais criptografadas no dispositivo |
| 📦 | **Backup de Arquivo** | Argon2id + AES-256-GCM | Exportar arquivos `.marix` criptografados |
| 🔄 | **Sincronização GitHub** | Argon2id + AES-256-GCM | Backup na nuvem zero-knowledge |

---

## ⚡ Performance e Otimização

### Gerenciamento de Memória Adaptativo

| RAM do Sistema | Memória Argon2id | Nível de Segurança |
|----------------|------------------|-------------------|
| ≥ 8 GB | 64 MB | Alto |
| ≥ 4 GB | 32 MB | Médio |
| < 4 GB | 16 MB | Otimizado para pouca memória |

### Otimizações de Runtime

| Otimização | Tecnologia | Benefício |
|------------|------------|-----------|
| **Limite de Heap V8** | `--max-old-space-size=256MB` | Previne inchaço de memória |
| **Throttling em Background** | `--disable-renderer-backgrounding` | Mantém conexões ativas |
| **Buffer do Terminal** | Scrollback: 3.000 linhas | 70% de redução de memória |
| **Carregamento Lazy** | Carregamento de componentes sob demanda | Inicialização mais rápida |

### Stack Tecnológico

| Componente | Tecnologia | Propósito |
|------------|------------|-----------|
| **Framework** | Electron 39 + React 19 | Aplicativo desktop multiplataforma |
| **Terminal** | xterm.js 6 | Emulação de terminal de alta performance |
| **SSH/SFTP** | ssh2 + node-pty | Implementação nativa do protocolo SSH |
| **Editor de Código** | CodeMirror 6 | Realce de sintaxe leve |
| **Criptografia** | Argon2 + Node.js Crypto | Segurança de nível militar |
| **Estilização** | Tailwind CSS 4 | CSS moderno e minimalista |
| **Build** | Webpack 5 + TypeScript 5 | Bundles de produção otimizados |

---

## 📥 Download

| SO | Download |
|----|----------|
| **Windows** | [Baixar .exe](https://github.com/user/marix/releases/latest/download/Marix-Setup.exe) |
| **macOS** | [Intel .dmg](https://github.com/user/marix/releases/latest/download/Marix.dmg) • [Apple Silicon](https://github.com/user/marix/releases/latest/download/Marix-arm64.dmg) |
| **Linux** | [.AppImage](https://github.com/user/marix/releases/latest/download/Marix.AppImage) • [.deb](https://github.com/user/marix/releases/latest/download/marix.deb) • [.rpm](https://github.com/user/marix/releases/latest/download/marix.rpm) |

---

## ✨ Recursos

### 🔌 Conexões Multi-Protocolo

| Protocolo | Tecnologia | Descrição |
|-----------|------------|-----------|
| **SSH** | ssh2 + node-pty | Secure Shell com autenticação por senha e chave privada |
| **SFTP** | ssh2 | Gerenciador de arquivos de painel duplo com arrastar e soltar |
| **FTP/FTPS** | basic-ftp | Suporte FTP padrão e seguro |
| **RDP** | xfreerdp3 / mstsc | Área de Trabalho Remota (xfreerdp3 no Linux, mstsc no Windows) |

### 💻 Terminal

- **400+ temas de cores** — Dracula, Solarized, Catppuccin, Nord...
- **Fontes personalizadas** — Qualquer fonte do sistema
- **xterm.js 6 completo** — Emulação de terminal completa com suporte Unicode
- **Preservação de sessão** — Abas persistem ao reconectar
- **Detecção de SO** — Detecção automática de distro Linux

### 📁 Gerenciador de Arquivos SFTP

- **Interface de painel duplo** — Local ↔ Remoto lado a lado
- **Editor integrado** — CodeMirror 6 com realce de sintaxe para 15+ linguagens
- **Arrastar e soltar** — Upload/download de arquivos fácil
- **Gerenciamento de permissões** — Interface visual de chmod

### 🛠️ Ferramentas Integradas

- **DNS e Rede**: A, AAAA, MX, TXT, SPF, CNAME, NS, SOA, PTR, Ping, Traceroute, porta TCP, HTTP/HTTPS, SMTP, Lista Negra, WHOIS, ARIN
- **Gerenciador DNS Cloudflare**: Gerenciar domínios, registros DNS, proxy Cloudflare
- **Gerenciador de Chaves SSH**: Gerar RSA-4096, Ed25519, ECDSA-521, importar/exportar chaves
- **Gerenciador de Known Hosts**: Ver impressões digitais, importar do host, remover hosts não confiáveis

---

## 💾 Backup e Restauração

### Como a Criptografia Funciona

Todos os backups usam criptografia de nível militar com **Argon2id** e **AES-256-GCM**:

<p align="center">
  <img src="flow.png" alt="Fluxo de Criptografia" width="800">
</p>

### O Que é Feito Backup

| Dados | Incluído | Criptografado |
|-------|----------|---------------|
| Lista de servidores | ✅ | ✅ AES-256-GCM |
| Chaves privadas SSH | ✅ | ✅ AES-256-GCM |
| Token API Cloudflare | ✅ | ✅ AES-256-GCM |
| Configurações do app | ✅ | ✅ AES-256-GCM |
| Known hosts | ❌ | — |

### Garantias de Segurança

- 🔐 **Senha nunca armazenada** — Nem no arquivo, nem no GitHub
- 🔒 **Zero-knowledge** — Nem os desenvolvedores podem descriptografar
- 🛡️ **Resistente a brute-force** — Argon2id requer 16-64 MB de RAM por tentativa
- ✅ **À prova de adulteração** — AES-GCM detecta qualquer modificação

### Backup GitHub (Zero-Knowledge)

1. **Entrar com GitHub** → Código do dispositivo aparece → Navegador abre → Autorizar → Repositório `marix-backup` criado automaticamente
2. **Backup**: Clique "Backup para GitHub" → Digite a senha → Dados criptografados são enviados
3. **Restauração**: Entrar no GitHub → "Restaurar do GitHub" → Digite a senha para descriptografar

> ⚠️ **Importante**: Se você perder sua senha de backup, seu backup é **permanentemente irrecuperável**. Ninguém pode descriptografá-lo.

---

## 🛡️ Especificações de Segurança

| Componente | Algoritmo | Parâmetros |
|------------|-----------|------------|
| Derivação de Chave | Argon2id | 16-64 MB de memória, 3 iterações, 4 lanes |
| Criptografia | AES-256-GCM | Chave de 256 bits, autenticada |
| Salt | CSPRNG | 32 bytes por backup |
| IV/Nonce | CSPRNG | 16 bytes por operação |

### Requisitos de Senha

- ✅ Mínimo 10 caracteres
- ✅ Pelo menos 1 letra maiúscula (A-Z)
- ✅ Pelo menos 1 letra minúscula (a-z)
- ✅ Pelo menos 1 número (0-9)
- ✅ Pelo menos 1 caractere especial (!@#$%^&*...)

---

## 🔧 Compilar do Código Fonte

```bash
git clone https://github.com/marixdev/marix.git
cd marix
npm install
npm run dev      # Desenvolvimento
npm run build    # Compilar
npm run package:linux  # Empacotar
```

### Dependências RDP para Linux

```bash
# Ubuntu/Debian
sudo apt install freerdp3-x11 xdotool

# Fedora
sudo dnf install freerdp xdotool

# Arch
sudo pacman -S freerdp xdotool
```

---

## 📄 Licença

**GNU General Public License v3.0** (GPL-3.0)

---

<p align="center">
  <strong>Marix</strong> — Cliente SSH zero-knowledge moderno<br>
  <em>Seus dados. Sua responsabilidade. Sua liberdade.</em>
</p>
