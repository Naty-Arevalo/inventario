# Inventario

Aplicación web para gestionar el stock de un sector: registro de mercadería que ingresa, conteos de inventario por fecha, control de stock mínimo con alertas y sugerencia automática de reposición.

Construida con **Next.js 16** (App Router), **React 19**, **Tailwind CSS 4** y **Turso** (base libSQL en la nube, accedida con `@libsql/client`).

## Puesta en marcha

1. Crear un archivo `.env.local` en la raíz con las credenciales de la base:

   ```
   TURSO_DATABASE_URL=libsql://<tu-base>.turso.io
   TURSO_AUTH_TOKEN=<tu-token>
   ```

2. Instalar y arrancar:

   ```bash
   npm install
   npm run dev
   ```

3. Abrir [http://localhost:3000](http://localhost:3000).

- Las tablas e índices se crean solos en la base al primer arranque, si todavía no existen.
- Cada instancia de la app apunta a su propia base (por ejemplo, una por comercio): alcanza con cambiar las dos variables de entorno.
- Para usar la app desde otro dispositivo de la red (`http://<ip>:3000`), la IP debe estar en `allowedDevOrigins` dentro de `next.config.ts`.

## Funcionalidades

### Cargar Mercadería (`/mercaderia`)
Registro de productos que ingresan al sector, asociados a una fecha.

1. Elegir la fecha de carga (por defecto hoy).
2. Filtrar por categoría y/o usar el buscador de productos.
3. Cargar cantidades y presionar **Guardar Mercadería**.

Si se carga la misma fecha y producto de nuevo, se actualiza la cantidad (no se duplica). Con **"Revisar fecha guardada"** (esquina derecha del contenedor) se pueden ver y corregir las cargas de un día anterior.

### Hacer Inventario (`/inventario`)
Conteo físico de productos por fecha. Es el corazón del sistema: define el stock real.

1. Seleccionar categoría → aparecen los productos de esa categoría.
2. Cargar el conteo físico en **Mi Conteo** (arranca en 0).
3. **Guardar Inventario**.

El aviso "¡POCAS!" aparece mientras contás si ese producto queda igual o por debajo de su stock mínimo. Con **"Revisar inventario guardado"** se consulta lo cargado en cualquier fecha anterior.

### Stock Total (`/stock`)
Vista general y administración de productos y categorías.

- Tabla con: Último Inventario, Ingresó (mercadería desde el último conteo) y **Stock Actual** (último inventario + ingresos).
- Filtro por categorías con contador de productos.
- Alta/edición/borrado de productos (nombre, categoría, stock mínimo) y alta/borrado de categorías.
- Los productos con stock actual igual o por debajo del mínimo se marcan en rojo con "¡POCAS!".

El **stock mínimo** es un valor interno por producto (default 5): define cuándo salta la alerta. No se muestra como columna pero es editable desde "Editar".

### Reposición Sugerida (`/reposicion`)
Calcula automáticamente qué conviene comprar.

- Estima el **consumo real por día**: `(inventario anterior + ingresos − último conteo) / días entre inventarios`.
- Sugiere comprar lo necesario para cubrir **7, 14 o 30 días** sin bajar del stock mínimo.
- Muestra consumo/día y días restantes estimados por producto.
- Filtro por **categoría**, pensado para armar el pedido de cada proveedor por separado.
- Botón **"Copiar lista"**: copia al portapapeles del sistema el pedido filtrado, listo para pegar (Ctrl+V) en WhatsApp, mail, etc.

Solo proyecta consumo para productos con inventario en las dos últimas fechas; los productos nuevos usan como objetivo su stock mínimo directo.

### Alertas en la home (`/`)
Muestra los productos con stock bajo ordenados por criticidad (mayor déficit respecto al mínimo primero). Lista acotada a 4 con botón **"Ver más"** y acceso directo a Reposición.

## Flujo de trabajo diario

1. **Ingresa mercadería** → cargarla en `/mercaderia` con la fecha del día.
2. **Se hace el conteo** → `/inventario`, contar y guardar.
3. A partir de ahí, la home avisa qué falta y `/reposicion` arma la lista de compras por proveedor.

## Datos importantes

- **Base de datos**: Turso (libSQL en la nube), configurada por variables de entorno (`TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` en `.env.local`, ignorado por git). Las credenciales nunca van al repositorio.
- **Esquema**: `categorias`, `productos`, `inventarios` (único por fecha+producto), `mercaderia` (único por fecha+producto). Se crea automáticamente si no existe, en el primer acceso a la base (`src/lib/db.ts`), con índices sobre `producto_id` en `inventarios` y `mercaderia`.
- **Convención de fechas**: la mercadería cargada el mismo día de un inventario cuenta como ingresada *después* del conteo (sumará al siguiente inventario).
- **Server Actions**: toda la lógica de datos está en `src/lib/actions/*` como server actions; las páginas son client components que las consumen.
- **Scripts**: `npm run dev` (desarrollo), `npm run build` + `npm start` (producción), `npm run lint`.
