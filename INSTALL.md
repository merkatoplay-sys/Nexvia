# NEXVIA - Guia de Instalacion

## Requisitos Previos

- Node.js 18+ (https://nodejs.org)
- PostgreSQL 14+ (local o en la nube)
- npm o yarn

## Instalacion Local (Windows/Linux/Mac)

### 1. Descargar el proyecto

Descarga el ZIP desde Replit o clona el repositorio.

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales:

```env
DATABASE_URL=postgresql://postgres:tu_password@localhost:5432/nexvia
JWT_SECRET=tu-clave-secreta-aqui
```

### 4. Crear la base de datos

En PostgreSQL, crea la base de datos:

```sql
CREATE DATABASE nexvia;
```

### 5. Sincronizar el esquema

```bash
# Windows (PowerShell)
$env:DATABASE_URL="postgresql://postgres:tu_password@localhost:5432/nexvia"; npm run db:push

# Windows (CMD)
set DATABASE_URL=postgresql://postgres:tu_password@localhost:5432/nexvia && npm run db:push

# Linux/Mac
DATABASE_URL="postgresql://postgres:tu_password@localhost:5432/nexvia" npm run db:push
```

### 6. Ejecutar el proyecto

```bash
npm run dev
```

Abre http://localhost:5000 en tu navegador.

---

## Deployment en Railway

### 1. Crear proyecto en Railway

1. Ve a https://railway.app
2. Crea un nuevo proyecto
3. Agrega un servicio PostgreSQL
4. Conecta tu repositorio de GitHub

### 2. Configurar variables de entorno

En Railway, agrega estas variables:

- `DATABASE_URL` - Se genera automaticamente con PostgreSQL
- `JWT_SECRET` - Tu clave secreta para tokens
- `NODE_ENV` - production
- `PORT` - 5000

### 3. Configurar el build

Railway detectara automaticamente el proyecto Node.js.

Build command:
```
npm run build
```

Start command:
```
npm run start
```

### 4. Desplegar

Railway desplegara automaticamente cuando hagas push a main.

---

## Comandos Disponibles

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Compila para produccion |
| `npm run start` | Inicia en modo produccion |
| `npm run db:push` | Sincroniza el esquema de BD |

---

## Solucion de Problemas

### Error: DATABASE_URL must be set

Asegurate de que el archivo `.env` existe y tiene la variable `DATABASE_URL` configurada correctamente.

### Error de conexion a PostgreSQL

1. Verifica que PostgreSQL este corriendo
2. Verifica el usuario y password
3. Verifica que la base de datos exista

### Error en Windows con variables de entorno

El proyecto ya esta configurado para cargar `.env` automaticamente. Solo asegurate de que el archivo existe en la raiz del proyecto.
