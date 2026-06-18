# UDMO — Editor de estructuras Moodle (UDES / proyecto GEO)

> **Documento de contexto y requisitos.** Es la fuente de verdad del proyecto:
> qué construimos, por qué, y bajo qué reglas. Cualquier agente o persona que
> trabaje en UDMO debe leer este archivo primero.

---

## 1. Cambio de enfoque (por qué existe UDMO)

Hasta ahora el flujo era: un agente de IA leía los insumos del curso (AAA `.docx`,
PDFs, rúbrica `.xlsx`) y **generaba** el HTML de cada segmento siguiendo unas
*skills*. Después había que **corregir** los errores del agente (negritas de más,
celdas añadidas a la tabla, RED duplicados, foros sin enlazar, espaciado roto…).

El problema de fondo: **el agente —o el usuario al pegar contenido— modifica
ligeramente la estructura fija** para encajar la información. Ejemplo real
(Momento Evaluativo 1): se agregó una celda a la tabla de "Resumen de Entregas"
para meter un cuestionario con su porcentaje, rompiendo el `rowspan`.

**UDMO invierte el enfoque.** En vez de generar-y-corregir, ofrece un
**formulario con estructura fija** donde el usuario **solo llena información**.
La maquetación (HTML, clases Bootstrap, `<br>`, `rowspan`, botones, pestañas)
la pone el programa, **siempre igual, siempre limpia**. El usuario no puede tocar
la estructura porque no la ve: solo ve campos.

> **Regla rectora:** el usuario aporta *contenido*; UDMO aporta *estructura*.
> Es imposible producir "código basura" porque el usuario nunca escribe HTML.

---

## 2. Principios de diseño

1. **Estructura fija por segmento.** Cada tipo (Momento, Entregable, Glosario,
   Introducción, Línea de tiempo) tiene un esqueleto HTML inmutable. El usuario
   rellena ranuras; nunca añade, mueve ni borra elementos estructurales.
2. **Cero código basura por construcción.** No es que "el linter lo limpie
   después": es que el editor **no permite** generar nada fuera de la gramática
   permitida (ver §5). Los `<br>`, márgenes, `rowspan`, etc. los calcula el
   exportador, no el usuario.
3. **Crecimiento controlado.** Donde la estructura admite repetición (avances,
   semanas, viñetas, verbos del glosario), el usuario usa botones **"+ Añadir"**
   que insertan el bloque correcto y completo. No se "estira" una celda a mano.
4. **Escribir se siente normal.** El contenido se escribe como en cualquier
   editor; las viñetas, sub-viñetas, listas numeradas y negrita salen de
   **atajos tipo Markdown** (ver §4), sin menús engorrosos ni ver etiquetas.
5. **Espaciado automático fiel a Moodle.** El usuario nunca pulsa "Enter dos
   veces" ni inserta `<br>`. El exportador aplica el modelo de espaciado GEO
   (§7) de forma determinista.
6. **Vista previa fiel.** Mientras llena el formulario, el usuario ve a la
   derecha el render exacto que tendrá en Moodle.
7. **Sin instalación.** Es una web app: se abre en el navegador. Exporta el HTML
   por copiar-al-portapapeles o descarga. En el futuro, sube directo vía API de
   Moodle (§10).

---

## 3. Decisiones técnicas

| Decisión | Elección | Motivo |
|---|---|---|
| Tipo de producto | **Web app** (navegador, sin instalar) | El usuario lo pidió; fácil de compartir y actualizar. |
| Relación con geo-engine | **Proyecto separado, de cero** | El usuario lo pidió explícitamente. UDMO no depende de geo-engine. |
| Framework | **Svelte 5 + Vite + TypeScript** | Reactividad ideal para formularios con repetidores anidados (avances→semanas); bundle pequeño; TS evita errores de modelo. |
| Editor de contenido | **TipTap (ProseMirror)** con **esquema restringido** | El esquema *prohíbe estructuralmente* lo no permitido (p. ej. párrafos extra). Los atajos Markdown son nativos (input rules). |
| Exportación | Serializador propio doc→HTML por segmento | Traduce el modelo de datos al esqueleto Moodle exacto, aplicando el espaciado §7. |
| Persistencia local | `localStorage` + export/import `.udmo.json` | Guardar trabajo sin servidor; reanudar después. |
| Futuro | **API de Moodle Web Services** | Subir el HTML directo a la página UDES (§10). |

> El "peso" del bundle no es restricción (lo confirmó el usuario). Se prioriza
> que cumpla los requisitos y sea mantenible.

---

## 4. Cómo se escribe el contenido (atajos tipo Markdown)

Dentro de un campo de contenido, escribir se siente normal. Los atajos se
disparan **al escribir**, sin abrir menús:

| El usuario escribe… | UDMO produce | Equivale a |
|---|---|---|
| `- ` (guion + espacio) al inicio de línea | inicia una **viñeta** | `<ul><li>` |
| `1. ` o `1) ` al inicio de línea | inicia una **lista numerada** | `<ol><li>` |
| **Tab** dentro de una viñeta | la **anida** (sub-viñeta) | `<ul>` anidada |
| **Shift+Tab** | la saca un nivel | — |
| `**texto**` | **negrita** | `<strong>` |
| **Enter** en una viñeta | nueva viñeta del mismo nivel | nuevo `<li>` |
| **Enter** en viñeta vacía | sale de la lista | cierra `<ul>`/`<ol>` |

Reglas de la experiencia:
- **No existe la negrita libre arbitraria** más allá de `**…**`; no hay botones
  de color, tamaño, subrayado, cursiva (la cursiva está prohibida por GEO).
- **No se puede crear un párrafo extra** donde el diseño ya incrusta los párrafos
  (el esquema de ese campo no tiene nodo "paragraph" repetible; ver §5).
- El usuario **nunca teclea `<br>`**: el exportador decide dónde van (§7).

---

## 5. Cómo UDMO garantiza HTML limpio (la pieza clave)

Cada campo de contenido usa un **esquema de ProseMirror restringido** según el
contexto. El esquema define qué nodos y marcas existen; lo que no está en el
esquema, **no se puede crear** (ni pegando, ni con atajos).

Tres tipos de campo:

1. **Campo de línea simple** (`titulo`, `peso %`, `nombre de unidad`):
   solo texto plano + (a veces) negrita. Sin listas, sin saltos.
2. **Campo de párrafo único** (celda "Entregable", subtítulo): un solo párrafo,
   negrita permitida, **sin** poder partirlo en varios párrafos.
3. **Campo de contenido rico** (cuerpo de una semana, "Tenga en cuenta"):
   permite **viñetas, sub-viñetas, listas numeradas y negrita**. Los párrafos
   sueltos solo se permiten donde el esqueleto lo contempla; entre medias de una
   lista no se puede insertar un párrafo huérfano.

Al **pegar** texto con formato (desde Word/PDF), un *sanitizador* descarta todo
lo que no esté en el esquema (estilos, colores, tablas anidadas, `<font>`,
`margin`, etc.) y conserva solo texto + negrita + estructura de lista. Así, pegar
nunca introduce basura.

El **exportador** toma el documento del editor (un árbol limpio) y lo vierte en
el esqueleto del segmento, insertando los `<br>` y `rowspan` que correspondan.
El resultado es idéntico cada vez: no hay margen para variación humana.

---

## 6. Modelo de datos por segmento

Cada segmento es un **formulario** que produce un **objeto de datos**; el
exportador convierte ese objeto en el HTML del esqueleto. Lo que sigue describe
**qué llena el usuario** (campo) y **qué es fijo** (lo pone UDMO).

### 6.1 Momento Evaluativo (el más complejo)

Cabecera fija: 5 pestañas verticales (Resumen, Descripción General, Instrumento
de Evaluación, Instrumento para Enviar Entregable, Contenido de los Entregables).

**Datos del usuario:**
- `momento`: número/rótulo del momento (p. ej. "I") y su `peso %`.
- `avances[]` — lista **repetible** ("+ Añadir avance"). Por cada avance:
  - `etiqueta` (fija como `Avance N`, autocalculada; el último del último momento
    pasa a **"Producto Final"**, §9).
  - `nombre` + `descripcion` (texto exacto del AAA; van en la celda "Entregable").
  - `semanaInicio`–`semanaFin` (rango; define dónde va el botón de envío).
  - `pesoAvance %`.
  - `cuestionario?` — **toggle opcional**. Si el AAA lo trae: `unidad`,
    `nombreUnidad`, `pesoCuestionario %`. Si no, **no se crea fila** (resuelve el
    bug de la celda añadida a mano).
  - `idAssign` (Moodle `mod/assign/view.php?id=…`) para el botón.
- `descripcionGeneral`: párrafos + SABER/SER/HACER + `<h4>Condiciones
  Particulares de Entrega</h4>` (campo rico). **Fuente: tabla "Entregables del
  avance N…" del AAA**, no la de "reporte de avance" (regla crítica del skill).
- `rubrica`: nombre de archivo para el botón Rúbrica.
- `semanas[]` — generadas a partir de los rangos de los avances; por cada semana
  individual una pestaña. Por cada semana: `contenido` (campo rico: texto, RED en
  viñetas, citas, videos). El **botón de envío** aparece **solo** en la semana =
  `semanaFin` de cada avance (lo decide UDMO, no el usuario).

**Lo que UDMO calcula solo:** el `rowspan` de la tabla (caso A solo-avances vs.
caso B avance+cuestionario), la negrita-espejo (`<strong>Avance N.</strong>` /
`<strong>Cuestionario de evaluación –</strong>` y nada más), el nº de pestañas de
semana, la ubicación del botón, el nº de botones de la pestaña "Instrumento",
y la sustitución global "Producto Final".

### 6.2 Entregable / Avance

- `tipoTitulo`: `Avance N` o `Producto Final` (autocalculado).
- `subtitulo`: descripción desde el AAA (campo de párrafo único, `<h5>`).
- `documentoHeader?`: toggle "el PDF empieza con 'Documento:'" → decide si hay
  cabecera `<h5>Documento:…</h5>` o si ese párrafo entra en "Forma de entrega".
- Pestaña **"Forma de entrega"**: contenido rico. (El nombre de la pestaña se
  corrige a "Forma de entrega" solo en el rótulo; nunca en el cuerpo.)
- Pestaña **"Tenga en cuenta"**: contenido rico.
- `parrafoEnvio`: último párrafo (campo de párrafo único). **Se copia EXACTO del
  insumo; aquí NO se elimina "en formato X"** (excepción del skill geo-entregable).
- `idAssign`, `rubrica`.

### 6.3 Glosario

- `verbos[]` — repetible. Por cada verbo: `dimensión` (SER/SABER/HACER),
  `verbo`, `acepción`, `fuente` (texto o enlace RAE).
- UDMO: ordena **alfabético A→Z por verbo**, genera una tabla por verbo con el
  cierre exacto `<br>` + `<p></p>`, capitaliza la fuente, y produce el **mapeo
  Concepto / Definición / Categoría** para cargar en Moodle.

### 6.4 Introducción al curso

- 7 pestañas fijas: Introducción (RA + 3 dimensiones), Detalles del Curso
  (créditos/horas), Justificación, Problemas, Temas a trabajar (unidades
  repetibles), Palabras clave, Resumen de Entregas (misma tabla que el Momento).
- Barra fija de 4 botones: Instrucciones, Syllabus, Rúbricas (Rúbrica 1),
  Glosario (enlace `mod/glossary/view.php?id=…`).
- Campos: textos de cada pestaña (ricos/párrafo según corresponda), datos de
  créditos/horas (de la Rúbrica 1), nombres de archivos para los botones,
  imagen de portada (`@@PLUGINFILE@@`), y los mismos `avances[]` del Momento
  para la tabla de Resumen.

### 6.5 Línea de tiempo

- `avances[]`: por cada uno, solo el `título` (`Avance N` / `Producto Final`) y
  el `idAssign` (mismo destino que el botón de envío del Momento).
- UDMO: genera un hito por avance, enlazado, en pestaña nueva, `title` == texto;
  **elimina** cualquier "CIERRE DE CURSO".

---

## 7. Modelo de espaciado que UDMO aplica solo

El usuario nunca decide espaciado. El exportador aplica esta tabla (regla GEO §6):

| Situación | Mecanismo que inserta UDMO |
|---|---|
| Entre dos `<p>` | nada (el `<p>` ya trae su espacio) |
| `<p>` → `<ul>` (entrando a lista) | nada |
| `<ul>`/`<ol>` → `<p>` (saliendo de lista) | **un** `<br>` (`</ul><br><p>`) |
| Entre viñetas con mucho texto (citas, RED, multilínea) | **un** `<br>` (`</li><br><li>`) |
| Entre viñetas de un grupo de RED | **siempre un** `<br>` |
| Entre viñetas cortas de una línea | nada |
| Dentro de una viñeta, antes de iframe/audio | **un** `<br>` |
| Antes del `<div>` del botón de envío | nada |
| Entre dos botones (pestaña "Instrumento") | un `<p></p>` vacío |
| Encima de un `<h4>` secundario | `<h4><br>Título</h4>` |

Invariantes que UDMO **garantiza**: nunca `<br><br>`; nunca `margin-bottom`;
nunca `<br>` antes de `</li>`/`</ul>`/`</ol>`/`</div>`; nunca `<p>` dentro de
`<li>`; punto final en cada `<li>` de texto; botones de envío **sin** punto final.

---

## 8. Guardarraíles (lo que el programa impide)

- **No** se puede añadir/quitar/reordenar pestañas ni columnas de tabla.
- **No** se puede crear una fila de cuestionario "suelta": el cuestionario es un
  toggle del avance y genera su fila con el `rowspan` correcto.
- **No** se puede escribir HTML, estilos, colores, cursiva ni `<br>`.
- **No** se puede pegar formato sucio: el sanitizador lo reduce a la gramática.
- **No** se puede dejar un campo obligatorio vacío sin que UDMO marque un aviso
  visible (equivalente a los FLAGS de las skills) antes de exportar.
- La negrita de la tabla de Resumen es **espejo** y la pone UDMO (etiqueta del
  avance / cuestionario), no el usuario.

---

## 9. "Producto Final" (nomenclatura global)

El **último avance del último momento** se llama **"Producto Final"** en todo el
HTML (tabla, pestañas, botones, `title`, línea de tiempo). El usuario marca cuál
es el último momento/avance del curso (o UDMO lo deriva del avance de mayor
número) y la sustitución se aplica sola y de forma consistente en todos los
segmentos.

---

## 10. Exportación e integración futura

- **Fase 1 (MVP):** botón "Copiar HTML" (al portapapeles) y "Descargar .html"
  por segmento. También "Guardar proyecto" (`.udmo.json`) para reanudar.
- **Fase 2:** **API de Moodle Web Services.** Configurar la URL del Moodle UDES +
  token, y subir el HTML directo a la página/recurso del curso
  (`core_course_*`, `mod_page_*`, `mod_resource_*`). El `@@PLUGINFILE@@` y los
  archivos adjuntos se resuelven al subir. Esto evita el copiar-pegar manual.

---

## 11. Arquitectura de archivos (propuesta)

```
UDMO/
├── REQUISITOS.md            ← este documento
├── README.md                ← arranque rápido
├── package.json
├── vite.config.ts
├── svelte.config.js
├── tsconfig.json
├── index.html
└── src/
    ├── main.ts              ← punto de entrada
    ├── App.svelte           ← shell: selector de segmento + preview
    ├── lib/
    │   ├── segments/
    │   │   ├── types.ts     ← modelos de datos de los 5 segmentos
    │   │   ├── momento.ts    ← exportador Momento (datos → HTML)
    │   │   ├── entregable.ts
    │   │   ├── glosario.ts
    │   │   ├── introduccion.ts
    │   │   └── lineaTiempo.ts
    │   ├── html/
    │   │   ├── spacing.ts   ← aplica el modelo de espaciado §7
    │   │   ├── invariants.ts← garantías §7/§8 (post-proceso de seguridad)
    │   │   └── richToHtml.ts← doc ProseMirror → HTML limpio
    │   ├── editor/
    │   │   ├── schema.ts    ← esquemas restringidos por tipo de campo
    │   │   ├── inputRules.ts← atajos Markdown (§4)
    │   │   └── RichField.svelte
    │   └── ui/
    │       ├── Repeater.svelte  ← "+ Añadir" genérico
    │       └── Preview.svelte
    └── styles/
        └── moodle.css       ← estilos de preview fieles a Moodle
```

---

## 12. Roadmap por fases

- **F0 — Scaffold** (este commit): proyecto Svelte+Vite+TS, este documento,
  modelos de datos, shell mínimo.
- **F1 — Editor rico restringido:** esquemas + atajos Markdown + sanitizador de
  pegado + `RichField`.
- **F2 — Segmento Momento completo:** formulario con repetidores (avances con
  cuestionario opcional, semanas), exportador con `rowspan`/`<br>`/botones,
  preview en vivo. Es el más complejo: validarlo contra los HTML "golden"
  existentes (`geo-engine-releases/Refinado para skills/`).
- **F3 — Resto de segmentos:** Entregable, Glosario, Introducción, Línea de tiempo.
- **F4 — Persistencia + export:** localStorage, `.udmo.json`, copiar/descargar.
- **F5 — API de Moodle:** subida directa.

---

## 13. Glosario de términos GEO

- **AAA** — Agenda de Avance de Aprendizaje (`.docx`): insumo principal de
  Momentos, Introducción y Línea de tiempo.
- **RED** — Recurso Educativo Digital (mapa, infografía, video, podcast,
  presentación, **foro**). Cada uno va en su viñeta; nunca duplicado.
- **Producto Final** — nombre global del último avance del último momento (§9).
- **`@@PLUGINFILE@@`** — marcador portable de Moodle para archivos locales;
  prohibido `draftfile.php` y URLs de OneDrive/SharePoint.
- **FLAG** — aviso de dato faltante o decisión pendiente; en UDMO equivale a los
  avisos de validación previos a exportar.

> Las reglas completas (negritas, RED inline vs viñeta, foros, espaciado, etc.)
> viven en `geo-engine-releases/skills/_common/reglas-transversales.md` y en cada
> `SKILL.md`. UDMO las **implementa en código**; ese repositorio es la referencia
> normativa de cada decisión.
