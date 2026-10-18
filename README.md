# AniMed - App de Control Tirzepatida 💉⚖️

Aplicación móvil desarrollada con **React Native (Expo)** y **Supabase** para el seguimiento integral de la administración de Tirzepatida y evolución del control de peso corporal, con paneles y roles diferenciados para **Médicos** y **Pacientes**.

---

## 🚀 Características Principales

### 👤 Rol Paciente
- **Registro Rápido de Dosis:** Interfaz sencilla para registrar inyecciones en tiempo real (fecha automática hoy, peso en kg y dosis en mg).
- **Métricas de Progreso:** Tarjeta de resumen con cálculo dinámico del peso total perdido (kg) desde el primer pesaje.
- **Gráfica de Tendencia:** Gráfico de líneas interactivo con curva Bézier que visualiza el progreso en las últimas semanas.
- **Historial Reciente:** Lista detallada de las inyecciones aplicadas.

### 🩺 Rol Médico
- **Panel General de Métricas:** Contador de pacientes activos asignados al médico.
- **Directorio de Pacientes:** Búsqueda rápida por nombre o usuario.
- **Supervisión Clínica:** Acceso directo a la gráfica de progreso y métricas de peso de cada paciente en modo solo lectura.
- **Registro de Nuevos Pacientes:** Formulario integrado que genera automáticamente el nombre de usuario (`nombre + inicial paterno`, ej. `juanp`) y asigna la contraseña por defecto.

---

## 📁 Estructura del Proyecto

```text
animed/
├── assets/                 # Iconos e imágenes de la aplicación
├── src/
│   └── lib/
│       └── supabase.ts     # Cliente Supabase con AsyncStorage y auth aislada
├── App.tsx                 # Aplicación principal y vistas (Login, Paciente, Médico)
├── esquema_supabase.sql    # Script SQL con tablas, RLS y triggers automáticos
├── .env.example            # Plantilla de variables de entorno
├── app.json                # Configuración de Expo
├── package.json            # Dependencias del proyecto
└── README.md               # Esta documentación
```

---

## 🛠️ Configuración de Supabase (Paso a Paso)

1. **Crear Proyecto en Supabase:**
   - Ve a [supabase.com](https://supabase.com/) e inicia sesión o crea una cuenta.
   - Crea un nuevo proyecto (ej. `animed-db`).

2. **Ejecutar el Esquema de Base de Datos:**
   - En tu panel de Supabase, entra al menú **SQL Editor**.
   - Haz clic en **New query**, copia y pega el contenido del archivo [`esquema_supabase.sql`](./esquema_supabase.sql).
   - Haz clic en **Run**. Esto creará:
     - Tabla `profiles` con claves foráneas y roles.
     - Tabla `injections` para registros de dosis y peso.
     - Políticas de seguridad por fila (**Row Level Security - RLS**).
     - Trigger automático que crea el perfil al registrar un usuario en `auth.users`.

3. **Configurar Autenticación:**
   - Ve a **Authentication** -> **Providers** -> **Email**.
   - Asegúrate de que **Enable Email provider** esté activo.
   - *(Recomendado para pruebas y usuarios internos)*: Desactiva **Confirm email** para que los pacientes creados puedan iniciar sesión inmediatamente sin validar un correo real.

4. **Variables de Entorno:**
   - Ve a **Project Settings** -> **API**.
   - Copia la **Project URL** y la clave **anon public key**.
   - En la raíz de la carpeta `animed`, crea un archivo llamado `.env` basándote en `.env.example`:
     ```env
     EXPO_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
     EXPO_PUBLIC_SUPABASE_ANON_KEY=TU-ANON-KEY
     ```

---

## 📱 Ejecución en Desarrollo

1. **Instalar dependencias (si no se han instalado):**
   ```bash
   npm install
   ```

2. **Iniciar el servidor de Expo:**
   ```bash
   npx expo start
   ```

3. **Opciones de visualización:**
   - Presiona `a` para abrir en un emulador Android.
   - Presiona `i` para abrir en el simulador iOS (macOS).
   - Presiona `w` para abrir en el navegador web.
   - O escanea el código QR con la app **Expo Go** en tu dispositivo físico.

---

## 🔐 Formato de Usuarios y Credenciales

- **Formato de Usuario:** `nombre` + `inicial apellido paterno` (ejemplo: Juan Pérez -> `juanp`).
  - *Detalle técnico:* La app gestiona la autenticación usando internamente `${username}@animed.app` para aprovechar el sistema nativo y seguro de Supabase Auth.
- **Contraseña por defecto:** `AniMed2022!` para cuentas nuevas creadas desde la plataforma.

---

## 🐙 Conexión con GitHub

Este proyecto ya cuenta con su repositorio Git local inicializado con la rama principal `main` y su primer commit listo. Para subirlo a tu cuenta de GitHub, sigue estos pasos:

1. Crea un nuevo repositorio vacío en [GitHub](https://github.com/new) (por ejemplo, con el nombre `animed`). **No** selecciones inicializar con README, `.gitignore` ni licencia (ya existen localmente).

2. En tu terminal, dentro de la carpeta `animed`:
   ```bash
   cd animed
   git remote add origin https://github.com/TU-USUARIO/animed.git
   git push -u origin main
   ```

¡Y listo! Tu código estará publicado y sincronizado con GitHub.
