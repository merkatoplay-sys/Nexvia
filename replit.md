# NEXVIA - Sistema de Gestión de Streaming Multi-Tenant

## Descripción del Proyecto
NEXVIA es una aplicación SaaS multi-tenant en español diseñada para gestionar servicios de streaming. Permite a cada usuario administrar sus propias cuentas maestras, distribuir perfiles a clientes, registrar renovaciones, procesar devoluciones, hacer seguimiento financiero completo (ganancias/gastos/ajustes), y configurar notificaciones automáticas vía Telegram/WhatsApp.

## Características Principales
- ✅ **Multi-tenant**: Cada usuario tiene datos completamente aislados
- ✅ **Autenticación Real**: Integración con Replit Auth (Google, GitHub, X, Apple, Email/Password)
- ✅ **Servicios de Streaming**: Netflix, Spotify, Disney+, Prime Video, HBO, Crunchyroll, Vix + servicios personalizados
- ✅ **Gestión de Cuentas Maestras**: Control completo de cuentas con múltiples perfiles
- ✅ **Gestión de Perfiles**: Asignación, venta, renovación y devolución de perfiles
- ✅ **Gestión de Clientes**: Registro de información de clientes
- ✅ **Seguimiento Financiero**: Ganancias, gastos y ajustes con reportes
- ✅ **Notificaciones**: Configuración para alertas de vencimientos (Telegram/WhatsApp)
- ✅ **Múltiples Monedas**: Soporte para monedas latinoamericanas

## Arquitectura Técnica

### Stack Tecnológico
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Wouter (routing)
- **Backend**: Express.js + TypeScript
- **Base de Datos**: PostgreSQL + Drizzle ORM
- **Autenticación**: Replit Auth (OpenID Connect)
- **UI Components**: shadcn/ui + Radix UI
- **Gestión de Estado**: React Query (@tanstack/react-query)
- **Validación**: Zod
- **Iconos**: Lucide React

### Estructura de Base de Datos

#### Tablas Principales
1. **users** - Usuarios autenticados (gestionado por Replit Auth)
2. **sessions** - Sesiones de usuario (gestionado por Replit Auth)
3. **services** - Servicios de streaming (Netflix, Spotify, etc.)
4. **accounts** - Cuentas maestras de streaming
5. **profiles** - Perfiles dentro de las cuentas
6. **clients** - Clientes que compran perfiles
7. **expenses** - Transacciones financieras (ganancias/gastos/ajustes)
8. **settings** - Configuración por usuario

#### Aislamiento de Datos
- Todas las tablas (excepto users/sessions) tienen campo `userId`
- Todas las consultas filtran por `userId` del usuario autenticado
- Eliminaciones en cascada: `account` → `profiles` + `expenses`

### Flujo de Autenticación
1. Usuario visita la app
2. Si no está autenticado, redirige a `/api/login`
3. Replit Auth maneja el flujo OAuth
4. Usuario retorna autenticado con sesión en PostgreSQL
5. Frontend obtiene datos del usuario desde `/api/auth/user`

### API Endpoints

#### Autenticación (Replit Auth)
- `GET /api/login` - Inicia el flujo de autenticación
- `GET /api/logout` - Cierra la sesión
- `GET /api/auth/user` - Obtiene el usuario actual

#### Servicios
- `GET /api/services` - Lista servicios del usuario
- `POST /api/services` - Crea un nuevo servicio
- `PATCH /api/services/:id` - Actualiza un servicio
- `DELETE /api/services/:id` - Elimina un servicio

#### Cuentas Maestras
- `GET /api/accounts` - Lista cuentas del usuario
- `POST /api/accounts` - Crea una nueva cuenta
- `PATCH /api/accounts/:id` - Actualiza una cuenta
- `DELETE /api/accounts/:id` - Elimina una cuenta (y perfiles relacionados)

#### Perfiles
- `GET /api/profiles` - Lista perfiles del usuario
- `POST /api/profiles` - Crea un nuevo perfil
- `PATCH /api/profiles/:id` - Actualiza un perfil
- `DELETE /api/profiles/:id` - Elimina un perfil

#### Clientes
- `GET /api/clients` - Lista clientes del usuario
- `POST /api/clients` - Crea un nuevo cliente

#### Transacciones Financieras
- `GET /api/expenses` - Lista transacciones del usuario
- `POST /api/expenses` - Registra una transacción

#### Configuración
- `GET /api/settings` - Obtiene la configuración del usuario
- `PATCH /api/settings` - Actualiza la configuración

### Estructura de Archivos

```
.
├── client/
│   ├── src/
│   │   ├── components/       # Componentes UI reutilizables
│   │   ├── context/         # AuthContext (Replit Auth) + StreamingContext (API)
│   │   ├── hooks/           # useAuth (Replit Auth)
│   │   ├── lib/             # Utilidades y helpers
│   │   ├── pages/           # Páginas de la aplicación
│   │   └── App.tsx          # Router principal + QueryClientProvider
│   └── index.html
├── server/
│   ├── replit_integrations/ # Módulos de Replit Auth (NO MODIFICAR)
│   │   └── auth/
│   ├── db.ts                # Configuración de Drizzle
│   ├── storage.ts           # Capa de acceso a datos
│   ├── routes.ts            # Endpoints de API
│   └── index.ts             # Servidor Express
├── shared/
│   ├── models/
│   │   └── auth.ts          # Esquema de autenticación (users, sessions)
│   └── schema.ts            # Esquemas de Drizzle + tipos
└── drizzle.config.ts        # Configuración de Drizzle Kit
```

## Cambios Recientes (27 Diciembre 2025)

### Migración de Prototipo a Full-Stack Multi-Tenant
- ✅ Reemplazado localStorage con PostgreSQL
- ✅ Integrada autenticación real con Replit Auth
- ✅ Implementada capa de almacenamiento DatabaseStorage
- ✅ Creadas rutas de API protegidas con middleware `isAuthenticated`
- ✅ Actualizado frontend para usar React Query
- ✅ Agregado aislamiento de datos por `userId`
- ✅ Inicialización automática de servicios por defecto para nuevos usuarios

## Comandos Importantes

```bash
# Desarrollo
npm run dev

# Push de esquema a base de datos
npm run db:push

# Forzar push (si hay conflictos)
npm run db:push -- --force

# Build para producción
npm run build
```

## Flujo de Desarrollo

### Añadir Nueva Funcionalidad
1. Actualizar `shared/schema.ts` con nuevas tablas/campos
2. Ejecutar `npm run db:push` para sincronizar BD
3. Actualizar `IStorage` en `server/storage.ts`
4. Implementar métodos en `DatabaseStorage`
5. Crear endpoints en `server/routes.ts`
6. Actualizar frontend (context/pages) para usar nuevos endpoints

### Modificar Esquema Existente
1. Modificar definiciones en `shared/schema.ts`
2. Ejecutar `npm run db:push` (o `--force` si hay conflictos)
3. Actualizar tipos TypeScript y métodos relacionados

## Notas de Seguridad
- ⚠️ **NO modificar** archivos en `server/replit_integrations/auth/`
- ⚠️ Todas las rutas de API usan middleware `isAuthenticated`
- ⚠️ Datos filtrados por `userId` del token de sesión
- ⚠️ Sesiones almacenadas en PostgreSQL (no en memoria)
- ⚠️ Secretos manejados por variables de entorno de Replit

## Estado Actual
- ✅ Base de datos PostgreSQL configurada
- ✅ Autenticación funcional con Replit Auth
- ✅ API REST completa con aislamiento multi-tenant
- ✅ Frontend conectado a API real
- ✅ Listo para pruebas multi-usuario

## Próximos Pasos
- [ ] Probar con múltiples usuarios reales
- [ ] Verificar aislamiento de datos entre tenants
- [ ] Implementar notificaciones de Telegram/WhatsApp
- [ ] Optimizar consultas de base de datos
- [ ] Agregar tests automatizados
