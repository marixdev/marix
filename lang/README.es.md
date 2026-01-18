<p align="center">
  <img src="../icon/icon.png" alt="Marix Logo" width="128" height="128">
</p>

<h1 align="center">Marix</h1>

<p align="center">
  <strong>Cliente SSH Zero-Knowledge Moderno</strong>
</p>

<p align="center">
  <em>Tus credenciales nunca salen de tu dispositivo. Sin cloud. Sin rastreo. Sin compromisos.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License">
  <img src="https://img.shields.io/badge/client--side%20encryption-🔒-critical" alt="Client-Side Encryption">
  <img src="https://img.shields.io/badge/version-1.0.7-orange" alt="Version">
</p>

<p align="center">
  <a href="https://marix.dev">🌐 Sitio Web</a> •
  <a href="#-descarga">Descarga</a> •
  <a href="#-características">Características</a> •
  <a href="#-seguridad">Seguridad</a> •
  <a href="#-idiomas">Idiomas</a>
</p>

---

## 🌍 Otros Idiomas

| | | | |
|---|---|---|---|
| 🇺🇸 [English](../README.md) | 🇻🇳 [Tiếng Việt](README.vi.md) | 🇮🇩 [Bahasa Indonesia](README.id.md) | 🇨🇳 [中文](README.zh.md) |
| 🇰🇷 [한국어](README.ko.md) | 🇯🇵 [日本語](README.ja.md) | 🇫🇷 [Français](README.fr.md) | 🇩🇪 [Deutsch](README.de.md) |
| 🇪🇸 [Español](README.es.md) | 🇹🇭 [ภาษาไทย](README.th.md) | 🇲🇾 [Bahasa Melayu](README.ms.md) | 🇷🇺 [Русский](README.ru.md) |
| 🇵🇭 [Filipino](README.fil.md) | 🇧🇷 [Português](README.pt.md) | | |

---

## 🎯 ¿Para quién es Marix?

- **Desarrolladores e ingenieros DevOps** - Gestionando múltiples servidores
- **Administradores de sistemas** - Que priorizan seguridad y eficiencia
- **Usuarios conscientes de la seguridad** - Que no confían en soluciones cloud
- **Cualquiera** - Que quiera control total sobre sus credenciales SSH

---

## ⚠️ Aviso Legal

> **Eres responsable de tus datos.**
>
> Marix almacena todos los datos localmente con cifrado fuerte. Sin embargo:
> - Si pierdes tu contraseña de respaldo, **tus datos son irrecuperables**
> - **Sin servidor** - no hay opción de "olvidé mi contraseña"
> - **Respalda regularmente** - el hardware puede fallar
> - **La seguridad es tuya** - proporcionamos las herramientas, tú tomas las decisiones
>
> Al usar Marix, aceptas toda la responsabilidad por la seguridad de tus datos.

---

## 🔒 Arquitectura de Cifrado del Lado del Cliente

> **"Tus llaves. Tus servidores. Tu privacidad."**

### Modelo de Amenazas

Marix está diseñado para las siguientes suposiciones de seguridad:

> ⚠️ **Marix asume un entorno de host local no comprometido.**  
> No intenta defenderse contra adversarios maliciosos a nivel de SO o entornos de ejecución comprometidos.

**Dentro del alcance (protegido contra):**
- Robo de archivos de respaldo sin contraseña
- Ataques de fuerza bruta en respaldos cifrados
- Manipulación de datos en tránsito o almacenamiento (detectado via AEAD)
- Acceso del proveedor cloud a tus datos (cifrado del lado del cliente)

**Fuera del alcance (no protegido contra):**
- Malware con acceso root/admin en tu dispositivo
- Acceso físico a dispositivo desbloqueado con la app ejecutándose
- Keyloggers o malware de captura de pantalla
- Sistema operativo o runtime de Electron comprometido

### Lo que Marix NO Hace

| ❌ | Descripción |
|----|-------------|
| **Sin almacenamiento remoto de claves** | Las claves privadas nunca salen de tu dispositivo |
| **Sin custodia de claves** | No podemos recuperar tus claves bajo ninguna circunstancia |
| **Sin recuperación sin contraseña** | Contraseña perdida = respaldo perdido (por diseño) |
| **Sin llamadas de red durante el cifrado** | Las operaciones criptográficas son 100% offline |
| **Sin servidores cloud** | No operamos ninguna infraestructura |
| **Sin telemetría** | Cero analíticas, cero rastreo, cero recolección de datos |

### Principios Fundamentales

| | Principio | Descripción |
|---|-----------|-------------|
| 🔐 | **100% Offline** | Todas las credenciales almacenadas localmente en tu dispositivo—nunca subidas |
| ☁️ | **Sin Cloud** | Sin servidores. Tus datos nunca tocan Internet |
| 📊 | **Sin Telemetría** | Sin rastreo, sin analíticas, sin recolección de datos |
| 🔓 | **Código Abierto** | Código completamente auditable bajo GPL-3.0, sin puertas traseras ocultas |

### Tecnologías de Cifrado

| | Característica | Tecnología | Descripción |
|---|----------------|------------|-------------|
| 🛡️ | **Almacenamiento Local** | Argon2id + AES-256 | Cifra credenciales en el dispositivo |
| 📦 | **Respaldo de Archivos** | Argon2id + AES-256-GCM | Exporta archivos `.marix` con cifrado autenticado |
| 🔄 | **Sincronización Cloud** | Argon2id + AES-256-GCM | Cifrado del lado del cliente—el proveedor cloud solo almacena blobs cifrados |

---

## ⚡ Rendimiento y Optimización

Marix está optimizado para funcionar suavemente incluso en máquinas de gama baja:

### KDF Auto-Ajustado (Mejor Práctica)

Marix utiliza **auto-calibración** para los parámetros de Argon2id—una práctica ampliamente adoptada en criptografía aplicada:

| Característica | Descripción |
|----------------|-------------|
| **Tiempo Objetivo** | ~1 segundo (800-1200ms) en la máquina del usuario |
| **Auto-Calibración** | Memoria e iteraciones auto-ajustadas en la primera ejecución |
| **Adaptativo** | Funciona óptimamente tanto en máquinas débiles como potentes |
| **Calibración en Segundo Plano** | Se ejecuta al iniciar la app para una UX fluida |
| **Parámetros Almacenados** | Los parámetros KDF se guardan con los datos cifrados para descifrado entre máquinas |
| **Piso de Seguridad** | Mínimo 64MB de memoria, 2 iteraciones (supera OWASP 47MB) |

> **¿Por qué ~1 segundo?** Esta es la recomendación estándar en criptografía práctica. Proporciona fuerte resistencia a fuerza bruta mientras permanece aceptable para la experiencia del usuario. Los parámetros se adaptan automáticamente a cada máquina—no hay necesidad de adivinar configuraciones "estándar".

### Memoria Base (Punto de Partida para Auto-Ajuste)

| RAM del Sistema | Memoria Base | Luego Auto-Ajustado |
|-----------------|--------------|---------------------|
| ≥ 16 GB | 512 MB | → Calibrado a ~1s |
| ≥ 8 GB | 256 MB | → Calibrado a ~1s |
| ≥ 4 GB | 128 MB | → Calibrado a ~1s |
| < 4 GB | 64 MB | → Calibrado a ~1s |

### Optimizaciones en Tiempo de Ejecución

| Optimización | Técnica | Beneficio |
|--------------|---------|-----------|
| **Límite de Heap V8** | `--max-old-space-size=256MB` | Previene inflado de memoria |
| **Limitación en Segundo Plano** | `--disable-renderer-backgrounding` | Mantiene conexiones activas |
| **Buffer del Terminal** | Scrollback: 3,000 líneas | 70% menos memoria que por defecto |
| **Carga Diferida** | Carga de componentes bajo demanda | Inicio más rápido |
| **Indicaciones GC** | Activación manual de GC | Huella de memoria reducida |

### Stack Tecnológico

| Componente | Tecnología | Propósito |
|------------|------------|-----------|
| **Framework** | Electron 39 + React 19 | App de escritorio multiplataforma |
| **Terminal** | xterm.js 6 | Emulación de terminal de alto rendimiento |
| **SSH/SFTP** | ssh2 + node-pty | Implementación nativa del protocolo SSH |
| **Editor de Código** | CodeMirror 6 | Resaltado de sintaxis ligero |
| **Cifrado** | Argon2 + Node.js Crypto | Cifrado fuerte del lado del cliente |
| **Estilos** | Tailwind CSS 4 | CSS moderno y minimal |
| **Build** | Webpack 5 + TypeScript 5 | Bundle de producción optimizado |

---

## 📥 Descarga

<table>
<tr>
<td align="center" width="33%">
<img src="https://img.icons8.com/fluency/96/windows-10.png" width="64"><br>
<b>Windows</b><br>
<a href="https://github.com/user/marix/releases/latest/download/Marix-Setup.exe">Descargar .exe</a>
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

## ✨ Características

### 🔌 Conexiones Multi-Protocolo

| Protocolo | Descripción |
|-----------|-------------|
| **SSH** | Secure Shell con autenticación de contraseña y clave privada |
| **SFTP** | Gestor de archivos de doble panel con arrastrar y soltar |
| **FTP/FTPS** | Soporte FTP estándar y seguro |
| **RDP** | Escritorio remoto (xfreerdp3 en Linux, mstsc en Windows) |

### 💻 Terminal

- **400+ temas de color** - Desde Dracula hasta Solarized, Catppuccin, Nord y más
- **Fuentes personalizables** - Cualquier fuente del sistema, cualquier tamaño
- **xterm.js 6 completo** - Emulación de terminal completa con soporte Unicode
- **Persistencia de sesión** - Las pestañas persisten después de reconectar
- **Detección de OS** - Detecta automáticamente la distribución Linux y muestra info del sistema

### 📁 Gestor de Archivos SFTP

- **Interfaz de doble panel** - Local ↔ Remoto lado a lado
- **Editor integrado** - CodeMirror 6 con resaltado de sintaxis para 15+ lenguajes
- **Arrastrar y soltar** - Subir/bajar archivos fácilmente
- **Gestión de permisos** - chmod con interfaz visual
- **Operaciones por lotes** - Seleccionar múltiples archivos para transferencia

### 🛠️ Herramientas Integradas

#### Transferencia de Archivos LAN
*Compartir archivos instantáneamente entre dispositivos en la red local.*

#### Compartir Servidores LAN
*Compartir configuraciones de servidor de forma segura con dispositivos cercanos.*

#### Herramientas DNS y Red
- Búsqueda DNS
- Consultas WHOIS
- Escáner de puertos
- Traceroute

#### Gestor de DNS Cloudflare
*Herramienta integrada opcional para gestionar DNS de Cloudflare directamente desde tu espacio de trabajo SSH.*

#### Gestor de Claves SSH
- Generar pares de claves SSH (Ed25519, RSA, ECDSA)
- Importar/Exportar claves
- Gestionar known hosts

#### Gestor de Known Hosts
- Ver y gestionar known hosts
- Eliminar huellas antiguas
- Exportar/Importar known hosts

### 🎨 Experiencia de Usuario

- **Temas oscuro y claro** - Seguir al sistema o cambiar manualmente
- **14 idiomas** soportados
- **Etiquetas de servidor** - Organizar con etiquetas de colores
- **Conexión rápida** - Cmd/Ctrl+K para buscar servidores
- **Historial de conexiones** - Acceso rápido a conexiones recientes

---

## 💾 Respaldo y Restauración

### Cómo Funciona el Cifrado

Todos los respaldos usan **Argon2id** (ganador del Password Hashing Competition) y **AES-256-GCM** (cifrado autenticado):

```
Contraseña → Argon2id(64-512MB memoria) → Clave 256-bit → AES-256-GCM → Respaldo Cifrado
```

### Datos Respaldados

| Datos | Incluidos | Cifrados |
|-------|-----------|----------|
| Lista de servidores (host, puerto, credenciales) | ✅ | ✅ |
| Claves privadas SSH | ✅ | ✅ |
| Tokens API de Cloudflare | ✅ | ✅ |
| Configuración y preferencias de la app | ✅ | ✅ |
| Known hosts | ✅ | ✅ |

### Garantías de Seguridad

🔐 **Contraseña nunca almacenada** — ni en el archivo, ni en GitHub, en ningún lugar  
🔒 **Zero-Knowledge** — ni siquiera los desarrolladores de Marix pueden descifrar tus respaldos  
🛡️ **Resistente a fuerza bruta** — Argon2id requiere 64-512MB de RAM por intento (auto-ajustado)  
✅ **A prueba de manipulaciones** — AES-GCM detecta cualquier cambio en los datos cifrados  
🔄 **Compatible entre máquinas** — los respaldos almacenan el costo de memoria para portabilidad

---

### Respaldo Local Cifrado

Exporta todos tus datos como archivo `.marix` cifrado:

1. **Ir a Configuración** → **Respaldo y Restauración**
2. **Crear una contraseña** (cumpliendo los requisitos):
   - Mínimo 10 caracteres
   - 1 mayúscula, 1 minúscula, 1 dígito, 1 carácter especial
3. **Exportar** - el archivo se cifra antes de guardar
4. **Guardar de forma segura** - mantener el archivo de respaldo, recordar la contraseña

---

### Respaldo en Google Drive (Zero-Knowledge)

Sincronizar respaldos cifrados de forma segura con Google Drive:

#### Configuración

📘 **Guía de Configuración**: Ver [docs/google/GOOGLE_DRIVE_SETUP.es.md](../docs/google/GOOGLE_DRIVE_SETUP.es.md)

ℹ️ **Versiones pre-construidas**: Si usas releases pre-construidos (AppImage, RPM, etc.), las credenciales de Google ya están incluidas. Puedes saltar el paso 1 y conectarte directamente.

1. **Configurar credenciales OAuth**:
   - Crear un proyecto de Google Cloud
   - Habilitar la API de Google Drive
   - Crear un ID de cliente OAuth 2.0
   - Descargar el JSON de credenciales
   - Guardar como `src/main/services/google-credentials.json`

2. **Conectar en Marix**:
   - Ir a Configuración → Respaldo y Restauración → Google Drive
   - Hacer clic en "Conectar a Google Drive"
   - El navegador abre para OAuth de Google
   - Conceder permisos
   - La app recibe el token seguro

3. **Crear respaldo**:
   - Ingresar contraseña de cifrado (10+ caracteres)
   - Hacer clic en "Crear respaldo"
   - El archivo se sube a la carpeta "Marix Backups" en Drive

4. **Restaurar respaldo**:
   - Hacer clic en "Restaurar desde Google Drive"
   - Ingresar contraseña de respaldo
   - Todos los servidores y configuraciones se restauran

#### Cómo Funciona

✅ **Cifrado de extremo a extremo** - los datos se cifran antes de salir de tu dispositivo  
✅ **Zero-Knowledge** - Google solo ve blobs cifrados  
✅ **Solo tú tienes la clave** - el token OAuth se almacena localmente  
✅ **Carpeta privada** - los archivos solo son accesibles desde tu app

---

### Respaldo en GitHub (Zero-Knowledge)

Sincronizar respaldos cifrados de forma segura con un repositorio privado de GitHub:

#### Configuración

1. **Iniciar sesión con GitHub**:
   - Ir a Configuración → Respaldo y Restauración → Respaldo GitHub
   - Hacer clic en "Iniciar sesión con GitHub"
   - Un código de dispositivo aparece en la app
   - El navegador se abre automáticamente - ingresar el código para autenticar
   - ¡Listo! Un repositorio privado `marix-backup` se crea automáticamente

2. **Respaldar**:
   - Hacer clic en "Respaldar en GitHub"
   - Ingresar contraseña de respaldo
   - Los datos cifrados se envían al repositorio

3. **Restaurar en otro dispositivo**:
   - Instalar Marix
   - Iniciar sesión con GitHub (mismos pasos)
   - Hacer clic en "Restaurar desde GitHub"
   - Ingresar contraseña de respaldo para descifrar

#### Por Qué GitHub es Seguro

| Capa | Protección |
|------|------------|
| **Cifrado del lado del cliente** | Los datos se cifran antes de salir del dispositivo |
| **Argon2id KDF** | 64-512MB memoria (auto), 4 iteraciones, 1-4 carriles paralelos |
| **AES-256-GCM** | Cifrado autenticado con IV aleatorio |
| **Almacenamiento GitHub** | Solo almacena texto cifrado |
| **Sin servidor Marix** | Cliente ↔ GitHub directamente |

⚠️ **Importante**: Si pierdes tu contraseña de respaldo, tus respaldos son **permanentemente irrecuperables**. No podemos descifrarlos. Nadie puede.

---

## 🛡️ Especificaciones de Seguridad

### Detalles de Cifrado

| Algoritmo | Parámetros |
|-----------|------------|
| **Derivación de clave** | Argon2id (Memoria: 64-512MB auto, Iteraciones: 4, Paralelismo: 1-4) |
| **Cifrado simétrico** | AES-256-GCM |
| **Sal** | 32 bytes (aleatorio criptográfico) |
| **IV/Nonce** | 16 bytes (único por cifrado) |
| **Etiqueta de autenticación** | 16 bytes (etiqueta de autenticación GCM) |

### Algoritmos de Claves SSH

| Algoritmo | Tamaño de Clave | Uso |
|-----------|-----------------|-----|
| **Ed25519** | 256-bit | Recomendado (rápido, seguro) |
| **RSA** | 2048-4096-bit | Compatibilidad legacy |
| **ECDSA** | 256-521-bit | Alternativa a Ed25519 |

### Requisitos de Contraseña

Las contraseñas de respaldo deben tener:

✅ Mínimo 10 caracteres  
✅ Al menos 1 mayúscula (A-Z)  
✅ Al menos 1 minúscula (a-z)  
✅ Al menos 1 dígito (0-9)  
✅ Al menos 1 carácter especial (!@#$%^&*...)

---

## 🔧 Compilar desde Fuente

```bash
# Clonar el repositorio
git clone https://github.com/user/marix.git
cd marix

# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Compilar
npm run build

# Empaquetar para distribución
npm run package:win    # Windows (.exe)
npm run package:mac    # macOS (.zip)
npm run package:linux  # Linux (.AppImage, .deb, .rpm)
```

### Requisitos del Sistema

|  | Mínimo | Recomendado |
|--|--------|-------------|
| **OS** | Windows 10, macOS 10.13, Ubuntu 18.04 | Última versión |
| **RAM** | 2 GB | 4 GB+ |
| **Almacenamiento** | 200 MB | 500 MB |

### Dependencias RDP para Linux

```bash
# Instalar xfreerdp3 para soporte RDP
sudo apt install freerdp3-x11  # Debian/Ubuntu
sudo dnf install freerdp       # Fedora
sudo pacman -S freerdp         # Arch
```

---

## 📄 Licencia

Este proyecto está licenciado bajo la **GNU General Public License v3.0** (GPL-3.0).

Esto significa:

✅ Puedes usar, modificar y distribuir este software  
✅ Puedes usarlo para propósitos comerciales  
⚠️ Todas las modificaciones deben también ser publicadas bajo GPL-3.0  
⚠️ Debes hacer el código fuente disponible al distribuir  
⚠️ Debes indicar los cambios hechos al código

Ver [LICENSE](../LICENSE) para el texto completo de la licencia.

---

<p align="center">
  <strong>Marix</strong><br>
  Cliente SSH Zero-Knowledge Moderno<br><br>
  <em>Tus datos. Tu responsabilidad. Tu libertad.</em><br><br>
  Si quieres conveniencia a costa de tu privacidad, Marix no es para ti.
</p>
