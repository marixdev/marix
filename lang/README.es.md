<p align="center">
  <img src="../icon/icon.png" alt="Marix Logo" width="128" height="128">
</p>

<h1 align="center">Marix</h1>

<p align="center">
  <strong>Cliente SSH Zero-Knowledge Moderno</strong>
</p>

<p align="center">
  <em>Tus credenciales nunca salen de tu dispositivo. Sin nube. Sin rastreo. Sin compromisos.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License">
  <img src="https://img.shields.io/badge/zero--knowledge-🔒-critical" alt="Zero Knowledge">
</p>

---

## 🌍 Otros Idiomas

| | | | |
|---|---|---|---|
| 🇺🇸 [English](../README.md) | 🇻🇳 [Tiếng Việt](README.vi.md) | 🇮🇩 [Bahasa Indonesia](README.id.md) | 🇨🇳 [中文](README.zh.md) |
| 🇰🇷 [한국어](README.ko.md) | 🇯🇵 [日本語](README.ja.md) | 🇫🇷 [Français](README.fr.md) | 🇩🇪 [Deutsch](README.de.md) |
| 🇹🇭 [ภาษาไทย](README.th.md) | 🇲🇾 [Bahasa Melayu](README.ms.md) | 🇷🇺 [Русский](README.ru.md) | 🇵🇭 [Filipino](README.fil.md) |
| 🇧🇷 [Português](README.pt.md) | | | |

---

## ⚠️ Disclaimer

> **You are responsible for your own data.**
>
> Marix stores all data locally with strong encryption. However:
> - Password lost = **data unrecoverable**
> - **No servers** — no "forgot password" option
> - **Backup regularly** — hardware can fail
> - You own your security

---

## 🔒 Arquitectura Zero-Knowledge

### Principios Fundamentales

| | Principio | Descripción |
|---|-----------|-------------|
| 🔐 | **100% Sin Conexión** | Todas las credenciales almacenadas localmente—nunca cargadas |
| ☁️ | **Sin Nube** | No tenemos servidores. Tus datos nunca tocan Internet |
| 📊 | **No Telemetry** | Sin rastreo, sin análisis, sin recolección de datos |
| 🔓 | **Código Abierto** | Código completamente auditable bajo GPL-3.0 |

### Tecnología de Cifrado

| | Característica | Tecnología | Descripción |
|---|----------------|------------|-------------|
| 🛡️ | **Almacenamiento Local** | Argon2id + AES-256 | Credenciales cifradas en reposo en tu dispositivo |
| 📦 | **Respaldo de Archivos** | Argon2id + AES-256-GCM | Exportación de archivos `.marix` cifrados |
| 🔄 | **Sincronización GitHub** | Argon2id + AES-256-GCM | Respaldo en la nube zero-knowledge |

---

## ⚡ Rendimiento y Optimización

### Gestión de Memoria Adaptativa

| RAM del Sistema | Memoria Argon2id | Nivel de Seguridad |
|-----------------|------------------|-------------------|
| ≥ 8 GB | 64 MB | Alto |
| ≥ 4 GB | 32 MB | Medio |
| < 4 GB | 16 MB | Optimizado para poca memoria |

### Optimizaciones de Ejecución

| Optimización | Tecnología | Beneficio |
|--------------|------------|-----------|
| **Límite de Heap V8** | `--max-old-space-size=256MB` | Previene hinchazón de memoria |
| **Throttling en Segundo Plano** | `--disable-renderer-backgrounding` | Mantiene conexiones activas |
| **Buffer de Terminal** | Scrollback: 3,000 líneas | 70% de reducción de memoria |
| **Carga Diferida** | Carga de componentes bajo demanda | Inicio más rápido |

### Stack Tecnológico

| Componente | Tecnología | Propósito |
|------------|------------|-----------|
| **Framework** | Electron 39 + React 19 | Aplicación de escritorio multiplataforma |
| **Terminal** | xterm.js 6 | Emulación de terminal de alto rendimiento |
| **SSH/SFTP** | ssh2 + node-pty | Implementación nativa del protocolo SSH |
| **Editor de Código** | CodeMirror 6 | Resaltado de sintaxis ligero |
| **Cifrado** | Argon2 + Node.js Crypto | Client-side encryption robusto |
| **Estilos** | Tailwind CSS 4 | CSS moderno y minimalista |
| **Build** | Webpack 5 + TypeScript 5 | Bundles de producción optimizados |

---

## 📥 Descargas

| SO | Descarga |
|----|----------|
| **Windows** | [Descargar .exe](https://github.com/user/marix/releases/latest/download/Marix-Setup.exe) |
| **macOS** | [Intel .dmg](https://github.com/user/marix/releases/latest/download/Marix.dmg) • [Apple Silicon](https://github.com/user/marix/releases/latest/download/Marix-arm64.dmg) |
| **Linux** | [.AppImage](https://github.com/user/marix/releases/latest/download/Marix.AppImage) • [.deb](https://github.com/user/marix/releases/latest/download/marix.deb) • [.rpm](https://github.com/user/marix/releases/latest/download/marix.rpm) |

---

## ✨ Características

### 🔌 Conexiones Multi-Protocolo

| Protocolo | Tecnología | Descripción |
|-----------|------------|-------------|
| **SSH** | ssh2 + node-pty | Secure Shell con autenticación por contraseña y clave privada |
| **SFTP** | ssh2 | Gestor de archivos de doble panel con arrastrar y soltar |
| **FTP/FTPS** | basic-ftp | Soporte FTP estándar y seguro |
| **RDP** | xfreerdp3 / mstsc | Escritorio Remoto (xfreerdp3 en Linux, mstsc en Windows) |

### 💻 Terminal

- **400+ temas de colores** — Dracula, Solarized, Catppuccin, Nord...
- **Fuentes personalizadas** — Cualquier fuente del sistema
- **xterm.js 6 completo** — Emulación de terminal completa con soporte Unicode
- **Preservación de sesión** — Las pestañas persisten al reconectar
- **Detección de SO** — Detección automática de distribución Linux

### 📁 Gestor de Archivos SFTP

- **Interfaz de doble panel** — Local ↔ Remoto lado a lado
- **Editor integrado** — CodeMirror 6 con resaltado de sintaxis para 15+ lenguajes
- **Arrastrar y soltar** — Subir/descargar archivos fácilmente
- **Gestión de permisos** — Interfaz visual de chmod

### 🛠️ Herramientas Integradas

- **DNS y Red**: A, AAAA, MX, TXT, SPF, CNAME, NS, SOA, PTR, Ping, Traceroute, puerto TCP, HTTP/HTTPS, SMTP, Lista negra, WHOIS, ARIN
- **Gestor DNS de Cloudflare**: Gestión de dominios, registros DNS, proxy de Cloudflare
- **Gestor de Claves SSH**: Generar RSA-4096, Ed25519, ECDSA-521, importar/exportar claves
- **Gestor de Known Hosts**: Ver huellas, importar desde host, eliminar hosts no confiables

---

## 💾 Respaldo y Restauración

### Cómo Funciona el Cifrado

Todos los respaldos usan **Argon2id** y **AES-256-GCM**:

<p align="center">
  <img src="flow.png" alt="Flujo de Cifrado" width="800">
</p>

### Qué se Respalda

| Datos | Incluido | Cifrado |
|-------|----------|---------|
| Lista de servidores | ✅ | ✅ AES-256-GCM |
| Claves privadas SSH | ✅ | ✅ AES-256-GCM |
| Token API de Cloudflare | ✅ | ✅ AES-256-GCM |
| Configuración de la app | ✅ | ✅ AES-256-GCM |
| Known hosts | ❌ | — |

### Garantías de Seguridad

- 🔐 **Contraseña nunca almacenada** — Ni en el archivo, ni en GitHub
- 🔒 **Zero-knowledge** — Ni siquiera los desarrolladores pueden descifrar
- 🛡️ **Resistente a fuerza bruta** — Argon2id requiere 16-64 MB de RAM por intento
- ✅ **A prueba de manipulación** — AES-GCM detecta cualquier modificación

### Respaldo en GitHub (Zero-Knowledge)

1. **Iniciar sesión con GitHub** → Código de dispositivo aparece → Navegador se abre → Autorizar → Repositorio `marix-backup` se crea automáticamente
2. **Respaldo**: Clic en "Respaldar en GitHub" → Ingresar contraseña → Datos cifrados se suben
3. **Restauración**: Iniciar sesión en GitHub → "Restaurar desde GitHub" → Ingresar contraseña para descifrar

> ⚠️ **Importante**: Si pierdes tu contraseña de respaldo, tu respaldo es **permanentemente irrecuperable**. Nadie puede descifrarlo.

---

## 🛡️ Especificaciones de Seguridad

| Componente | Algoritmo | Parámetros |
|------------|-----------|------------|
| Derivación de Clave | Argon2id | 16-64 MB de memoria, 3 iteraciones, 4 carriles |
| Cifrado | AES-256-GCM | Clave de 256 bits, autenticado |
| Sal | CSPRNG | 32 bytes por respaldo |
| IV/Nonce | CSPRNG | 16 bytes por operación |

### Requisitos de Contraseña

- ✅ Mínimo 10 caracteres
- ✅ Al menos 1 mayúscula (A-Z)
- ✅ Al menos 1 minúscula (a-z)
- ✅ Al menos 1 número (0-9)
- ✅ Al menos 1 carácter especial (!@#$%^&*...)

---

## 🔧 Compilar desde el Código Fuente

```bash
git clone https://github.com/marixdev/marix.git
cd marix
npm install
npm run dev      # Desarrollo
npm run build    # Compilar
npm run package:linux  # Empaquetar
```

### Dependencias RDP para Linux

```bash
# Ubuntu/Debian
sudo apt install freerdp3-x11 xdotool

# Fedora
sudo dnf install freerdp xdotool

# Arch
sudo pacman -S freerdp xdotool
```

---

## 📄 Licencia

**GNU General Public License v3.0** (GPL-3.0)

---

<p align="center">
  <strong>Marix</strong> — Cliente SSH zero-knowledge moderno<br>
  <em>Tus datos. Tu responsabilidad. Tu libertad.</em>
</p>
