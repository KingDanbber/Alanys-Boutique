# Supabase · Alany Boutique

## Cómo aplicar el schema

1. Entra a tu proyecto en [Supabase](https://supabase.com/dashboard)
2. Ve a **SQL Editor** → New query
3. Copia y pega el contenido de `schema.sql`
4. Ejecuta (Run)

## Después del schema

### 1. Crear tu usuario Developer
- Authentication → Users → Add user (o regístrate desde la app)
- Copia el `User UID`

### 2. Asignar rol developer y negocio
En SQL Editor:

```sql
-- 1) Crear el negocio
insert into public.businesses (id, name, whatsapp, facebook)
values (
  '00000000-0000-0000-0000-000000000001',
  'Alany Boutique',
  '8716079531',
  'Alany boutique'
)
on conflict (id) do nothing;

-- 2) Tu perfil como developer (reemplaza TU_USER_UID)
update public.profiles
set
  role = 'developer',
  full_name = 'Tu Nombre',
  active_business_id = '00000000-0000-0000-0000-000000000001'
where id = 'TU_USER_UID';

-- 3) Vincularte al negocio
insert into public.business_members (business_id, user_id, role)
values (
  '00000000-0000-0000-0000-000000000001',
  'TU_USER_UID',
  'admin'
)
on conflict do nothing;
```

### 3. Variables de entorno en la app
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_CLOUDINARY_CLOUD_NAME=tu_cloud
VITE_CLOUDINARY_UPLOAD_PRESET=alany_boutique
```

## Tablas principales

| Tabla | Uso |
|-------|-----|
| profiles | Usuarios + rol + nombre (vendedora automática) |
| businesses | Alany Boutique |
| products | Prendas + tags + stock + Cloudinary |
| clients | Clientes (WhatsApp, dirección) |
| orders / order_items | Pedidos y líneas |
| expenses / expense_items | Gastos |
| inventory_movements | Historial de stock |
| app_modules | Módulos del panel Developer |

## Roles

- `developer` → panel técnico + todo
- `admin` → dueñas, app operativa completa
- `staff` → mismo acceso operativo (opcional)
