
# Enlaces de compartir funcionales para clientes

## Problema

Actualmente hay tres problemas que impiden que los enlaces compartidos funcionen:

1. El boton "Copiar enlace" genera URLs con la ruta `/pdf/:id`, pero esa ruta no existe en la app (solo existe `/export/:id`)
2. La ruta `/export/:id` esta envuelta en `ProtectedRoute`, lo que obliga al visitante a iniciar sesion para ver el presupuesto
3. Los datos del presupuesto se cargan desde el contexto de autenticacion (`QuotesContext`), que solo funciona para usuarios logueados

Resultado: cuando un cliente recibe el enlace por WhatsApp o email, ve un error 404 o es redirigido al login.

## Solucion

Crear una pagina publica `/pdf/:id` que no requiera autenticacion, con una edge function backend que sirva los datos del presupuesto de forma segura sin exponer la tabla directamente.

---

## Cambios tecnicos

### 1. Nueva edge function: `get-public-quote`

Crear una edge function que reciba el ID del presupuesto y devuelva los datos del quote + template asociado. Esta funcion usara el service role key para leer directamente de la base de datos, sin depender de la sesion del usuario.

- Ruta: `supabase/functions/get-public-quote/index.ts`
- Metodo: GET con query param `?id=<quote-id>`
- Retorna: `{ quote, template }` en formato JSON
- No requiere autenticacion (es un enlace publico para el cliente)

### 2. Nueva pagina publica: `src/pages/PublicPDF.tsx`

Una pagina que:
- Extrae el ID de la URL (`/pdf/:id`)
- Llama a la edge function para obtener los datos
- Muestra el presupuesto usando los mismos componentes PDF existentes (`PDFCoverPage`, `PDFDetailsPages`, etc.)
- No muestra el menu de compartir ni el boton "Volver" (es una vista solo-lectura para el cliente)
- Muestra un estado de carga mientras obtiene los datos
- Muestra un mensaje de error si el presupuesto no existe

### 3. Agregar ruta publica en `src/App.tsx`

Agregar la ruta `/pdf/:id` SIN `ProtectedRoute`, para que cualquier persona pueda acceder.

### 4. Corregir URL en `PDFShareMenu.tsx`

Actualmente la URL ya apunta a `/pdf/:id` que es la ruta correcta de la nueva pagina publica. No requiere cambios, pero se verificara que sea consistente.

---

## Flujo del usuario

```text
Agente crea presupuesto
        |
        v
Agente va a /export/:id (vista privada, con controles)
        |
        v
Agente comparte enlace /pdf/:id por WhatsApp o email
        |
        v
Cliente abre /pdf/:id (pagina publica, solo lectura)
        |
        v
Edge function obtiene datos con service role
        |
        v
Cliente ve el presupuesto completo
```

## Archivos nuevos

| Archivo | Descripcion |
|---|---|
| `supabase/functions/get-public-quote/index.ts` | Edge function que devuelve quote + template por ID |
| `src/pages/PublicPDF.tsx` | Pagina publica de solo lectura para clientes |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/App.tsx` | Agregar ruta `/pdf/:id` sin ProtectedRoute |

## Seguridad

- No se modifican las politicas RLS existentes (la tabla sigue protegida)
- La edge function usa el service role key para leer, pero solo expone los datos del presupuesto solicitado por ID
- No se exponen datos sensibles adicionales (user_id, etc.)
- El ID del presupuesto es un UUID, lo que hace practicamente imposible adivinar enlaces
