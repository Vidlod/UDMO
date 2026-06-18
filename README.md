# UDMO

Editor web de **estructuras Moodle** para el proyecto GEO (UDES). El usuario llena
un formulario de **estructura fija** y UDMO genera el HTML limpio de cada segmento
(Momento, Entregable, Glosario, Introducción, Línea de tiempo) — sin código basura,
porque el usuario nunca escribe HTML.

> 📋 **Lee primero [`REQUISITOS.md`](REQUISITOS.md)**: visión, principios, modelos de
> datos por segmento, reglas de espaciado y roadmap. Es la fuente de verdad.

## Arranque

```bash
npm install
npm run dev      # abre el servidor de Vite
```

```bash
npm run build    # type-check (svelte-check) + build de producción
npm run check    # solo type-check
```

## Stack

- **Svelte 5 + Vite + TypeScript** — formularios reactivos con repetidores anidados.
- **TipTap (ProseMirror)** — campos de contenido con **esquema restringido** y atajos
  tipo Markdown (`- ` viñeta, Tab sub-viñeta, `1. ` numerada, `**negrita**`).
  El esquema impide estructuralmente el HTML no permitido.

## Estado

Fase **F0 (scaffold)**. Implementado: shell, modelos de datos
([`src/lib/segments/types.ts`](src/lib/segments/types.ts)) y este andamiaje.
Pendiente: editor rico (F1), segmento Momento (F2), resto de segmentos (F3),
persistencia/export (F4), API de Moodle (F5). Ver `REQUISITOS.md §12`.

## Relación con geo-engine

Proyecto **independiente**. La referencia normativa de las reglas GEO (negritas,
RED, foros, espaciado, "Producto Final") vive en
`../geo-engine-releases/skills/`. UDMO las implementa en código.
