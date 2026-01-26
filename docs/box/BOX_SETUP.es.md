# Guía de configuración de copia de seguridad de Box.net

> **Idiomas**: [🇺🇸 English](BOX_SETUP.en.md) | [🇻🇳 Tiếng Việt](BOX_SETUP.vi.md) | [🇮🇩 Bahasa Indonesia](BOX_SETUP.id.md) | [🇨🇳 中文](BOX_SETUP.zh.md) | [🇰🇷 한국어](BOX_SETUP.ko.md) | [🇯🇵 日本語](BOX_SETUP.ja.md) | [🇫🇷 Français](BOX_SETUP.fr.md) | [🇩🇪 Deutsch](BOX_SETUP.de.md) | [🇪🇸 Español](BOX_SETUP.es.md) | [🇹🇭 ภาษาไทย](BOX_SETUP.th.md) | [🇲🇾 Bahasa Melayu](BOX_SETUP.ms.md) | [🇷🇺 Русский](BOX_SETUP.ru.md) | [🇵🇭 Filipino](BOX_SETUP.fil.md) | [🇧🇷 Português](BOX_SETUP.pt.md)

---

## Paso 1: Crear cuenta de desarrollador de Box

1. Ve a [Box Developer Console](https://app.box.com/developers/console)
2. Inicia sesión con tu cuenta de Box (o crea una)
3. Haz clic en **"Create New App"**

## Paso 2: Crear aplicación OAuth 2.0

1. Selecciona **"Custom App"**
2. Elige **"User Authentication (OAuth 2.0)"**
3. Nombra tu aplicación: `Marix SSH Client` o el nombre que prefieras
4. Haz clic en **"Create App"**

## Paso 3: Configurar ajustes de la aplicación

### 3.1. Credenciales OAuth 2.0

1. En la configuración de tu aplicación, ve a la pestaña **"Configuration"**
2. Anota:
   - **Client ID**
   - **Client Secret** (haz clic en "Fetch Client Secret" si es necesario)

### 3.2. URI de redirección OAuth 2.0

1. Desplázate hasta **"OAuth 2.0 Redirect URI"**
2. Añade: `http://localhost` (Box permite cualquier puerto localhost)
3. Haz clic en **"Save Changes"**

### 3.3. Ámbitos de la aplicación

1. En **"Application Scopes"**, asegúrate de que estén habilitados:
   - ✅ Read all files and folders stored in Box
   - ✅ Write all files and folders stored in Box
2. Haz clic en **"Save Changes"**

## Paso 4: Configurar credenciales en Marix

### Opción A: Desarrollo local

1. Crea `box-credentials.json` en `src/main/services/`:
```json
{
  "client_id": "YOUR_BOX_CLIENT_ID",
  "client_secret": "YOUR_BOX_CLIENT_SECRET"
}
```

2. **IMPORTANTE**: Añade a `.gitignore`:
```
src/main/services/box-credentials.json
```

### Opción B: CI/CD con GitHub Secrets (Recomendado)

1. Ve a tu repositorio de GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Añade estos secrets:
   - `BOX_CLIENT_ID`: Tu Client ID de Box
   - `BOX_CLIENT_SECRET`: Tu Client Secret de Box
3. El flujo de trabajo de compilación inyectará automáticamente las credenciales durante la compilación

## Paso 5: Probar el flujo OAuth

1. Abre la aplicación Marix
2. Ve a **Configuración** > **Copia de seguridad y restauración** > **Crear/Restaurar copia de seguridad**
3. Selecciona la pestaña **"Box"**
4. Haz clic en **"Conectar a Box"**
5. El navegador abrirá la pantalla OAuth de Box
6. Inicia sesión y otorga permisos
7. La aplicación recibirá el token y mostrará "Conectado"

## Notas de seguridad

- **NO** commitear `box-credentials.json` a Git
- Usa **GitHub Secrets** para compilaciones CI/CD para proteger el client_secret
- Los tokens se almacenan de forma segura usando safeStorage de Electron
- PKCE se usa para seguridad adicional del flujo OAuth
- Se usan puertos de callback aleatorios para evitar conflictos

## Aprobación de la aplicación (Opcional)

Para uso personal, tu aplicación funciona inmediatamente. Para distribución pública:

1. Ve a la pestaña **"General Settings"**
2. Envía tu aplicación para revisión si es necesario
3. Box revisará y aprobará tu aplicación

## Solución de problemas

### Error: "Invalid client_id or client_secret"
- Verifica las credenciales en tu archivo box-credentials.json
- Vuelve a copiar el Client ID y Client Secret desde Box Developer Console

### Error: "Redirect URI mismatch"
- Asegúrate de que `http://localhost` esté añadido en la configuración de la app de Box
- Box soporta puertos dinámicos con localhost

### Error: "Access denied"
- El usuario denegó el permiso
- Verifica los ámbitos de la aplicación en Box Developer Console
