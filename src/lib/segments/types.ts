/**
 * Modelos de datos de los 5 segmentos GEO.
 *
 * Cada segmento es un FORMULARIO que produce un objeto de datos; el exportador
 * (lib/segments/<segmento>.ts) convierte ese objeto en el HTML del esqueleto
 * Moodle, aplicando el espaciado e invariantes (ver REQUISITOS.md §6–§8).
 *
 * Regla rectora: el usuario aporta CONTENIDO; UDMO aporta ESTRUCTURA. Por eso
 * aquí solo hay campos de contenido, nunca HTML ni `<br>` ni clases CSS.
 *
 * `RichDoc` representa el contenido de un campo rico (texto + negrita + listas
 * con viñetas/sub-viñetas/numeradas). Es el JSON de un documento ProseMirror
 * con esquema restringido (ver lib/editor/schema.ts). `richToHtml()` lo serializa.
 */

import type { JSONContent } from '@tiptap/core';

/** Contenido de un campo rico (cuerpo de semana, "Tenga en cuenta", etc.). */
export type RichDoc = JSONContent;

/** Texto de una línea o párrafo único; puede llevar negrita (marcas inline). */
export type InlineText = JSONContent;

/** Los cinco tipos de segmento que UDMO sabe maquetar. */
export type SegmentKind =
  | 'momento'
  | 'entregable'
  | 'glosario'
  | 'introduccion'
  | 'linea-tiempo';

/* ─────────────────────────────────────────────────────────────────────────
   Datos comunes del curso (compartidos entre segmentos)
   ───────────────────────────────────────────────────────────────────────── */

export interface CursoMeta {
  /** Nombre del curso (p. ej. "Estadística Descriptiva"). */
  nombre: string;
  /** Base de Moodle (p. ej. "https://virtual.udes.edu.co"). */
  moodleBase: string;
  /**
   * Número del último avance del último momento → se renombra "Producto Final"
   * de forma global (REQUISITOS.md §9). Si es null, UDMO lo deriva del avance
   * de mayor número.
   */
  ultimoAvance: number | null;
  /** Autor de los RED (para quitar la atribución "Autor (Año)." de los recursos). */
  autorRed?: string;
}

/* ─────────────────────────────────────────────────────────────────────────
   1. Momento Evaluativo
   ───────────────────────────────────────────────────────────────────────── */

/** Fila opcional de cuestionario asociada a un avance (toggle). */
export interface Cuestionario {
  /** "Unidad N". */
  unidad: string;
  /** Nombre de la unidad (texto tras el guion). */
  nombreUnidad: string;
  /** Peso del cuestionario (entero, sin "%"). */
  peso: number;
}

/** Un avance del momento (repetible: "+ Añadir avance"). */
export interface Avance {
  /** 1-based. La etiqueta visible ("Avance N" / "Producto Final") la calcula UDMO. */
  numero: number;
  /** Nombre del avance (texto exacto del AAA). */
  nombre: string;
  /** Descripción del avance (texto exacto del AAA, va en la celda "Entregable"). */
  descripcion: string;
  /** Rango de semanas que abarca (define dónde va el botón = semanaFin). */
  semanaInicio: number;
  semanaFin: number;
  /** Peso del avance (entero, sin "%"). */
  peso: number;
  /** Cuestionario opcional; si es null NO se crea fila (evita el rowspan roto). */
  cuestionario: Cuestionario | null;
  /** ID de la tarea Moodle para el botón de envío (mod/assign/view.php?id=). */
  idAssign: string | null;
}

/** Contenido de una semana individual (una pestaña horizontal). */
export interface Semana {
  /** Número de semana (1-based, absoluto en el momento). */
  numero: number;
  /** A qué avance pertenece (para el subtítulo "Avance N"). */
  avanceNumero: number;
  /** Cuerpo de la semana: texto, RED en viñetas, citas, videos. */
  contenido: RichDoc;
  /**
   * Párrafo de envío (solo si esta semana es la última del avance → lleva botón).
   * UDMO decide si se muestra el botón comparando numero === avance.semanaFin.
   */
  parrafoEnvio?: InlineText;
}

export interface MomentoData {
  kind: 'momento';
  curso: CursoMeta;
  /** Rótulo del momento (p. ej. "I", "II"). */
  momento: string;
  /** Peso total del momento (entero, sin "%"). */
  peso: number;
  avances: Avance[];
  /** Pestaña "Descripción General" (fuente: tabla "Entregables del avance N…"). */
  descripcionGeneral: RichDoc;
  /** Nombre de archivo de la rúbrica para el botón "Instrumento de Evaluación". */
  rubricaArchivo: string | null;
  /** Semanas individuales (derivadas de los rangos de los avances). */
  semanas: Semana[];
}

/* ─────────────────────────────────────────────────────────────────────────
   2. Entregable / Avance
   ───────────────────────────────────────────────────────────────────────── */

export interface EntregableData {
  kind: 'entregable';
  curso: CursoMeta;
  /** Número de avance (la etiqueta "Avance N"/"Producto Final" la calcula UDMO). */
  avanceNumero: number;
  /** Tipo de entregable + descripción desde el AAA (subtítulo <h5>). */
  subtitulo: InlineText;
  /**
   * Si el PDF empieza con "Documento:" → cabecera <h5>Documento:…</h5>.
   * Si false → ese primer párrafo entra como primer párrafo de "Forma de entrega".
   */
  tieneCabeceraDocumento: boolean;
  /** Pestaña "Forma de entrega" (el rótulo se corrige solo en el nav-link). */
  formaEntrega: RichDoc;
  /** Pestaña "Tenga en cuenta". */
  tengaEnCuenta: RichDoc;
  /**
   * Párrafo de envío: SE COPIA EXACTO del insumo. Aquí NO se elimina
   * "en formato X" (excepción del skill geo-entregable).
   */
  parrafoEnvio: InlineText;
  idAssign: string | null;
  rubricaArchivo: string | null;
}

/* ─────────────────────────────────────────────────────────────────────────
   3. Glosario
   ───────────────────────────────────────────────────────────────────────── */

export type Dimension = 'SER' | 'SABER' | 'HACER';

/** Una entrada del glosario (repetible). UDMO ordena A→Z por verbo. */
export interface VerboGlosario {
  dimension: Dimension;
  verbo: string;
  acepcion: string;
  /** Fuente: texto (institución/autor) o un enlace (RAE). */
  fuenteTexto: string;
  fuenteUrl: string | null;
}

export interface GlosarioData {
  kind: 'glosario';
  curso: CursoMeta;
  verbos: VerboGlosario[];
}

/* ─────────────────────────────────────────────────────────────────────────
   4. Introducción al curso
   ───────────────────────────────────────────────────────────────────────── */

/** Una unidad temática (pestaña "Temas a trabajar"). */
export interface UnidadTematica {
  titulo: string;
  /** Temas de la unidad (viñetas cortas, sin <br>). */
  temas: string[];
}

export interface IntroduccionData {
  kind: 'introduccion';
  curso: CursoMeta;
  /** Pestaña Introducción. */
  resultadoAprendizaje: InlineText;
  /** Las 3 dimensiones del RA (Actitudinal / Cognitiva / Procedimental). */
  dimensiones: { actitudinal: string; cognitiva: string; procedimental: string };
  /** Detalles del curso (de la Rúbrica 1). */
  creditos: number | null;
  horasAcompanamiento: number | null;
  horasIndependientes: number | null;
  /** Pestañas de texto. */
  justificacion: RichDoc;
  problemas: RichDoc;
  unidades: UnidadTematica[];
  palabrasClave: string[];
  /** Tabla de Resumen de Entregas: reusa los avances del/los momentos. */
  avances: Avance[];
  /** Archivos para la barra de 4 botones + imagen de portada. */
  archivos: {
    instrucciones: string | null;
    syllabus: string | null;
    rubrica1: string | null;
    portada: string | null;
    /** ID del glosario en Moodle (mod/glossary/view.php?id=). */
    glosarioId: string | null;
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   5. Línea de tiempo
   ───────────────────────────────────────────────────────────────────────── */

/** Un hito de la línea de tiempo (uno por avance). */
export interface HitoTimeline {
  numero: number;
  /** Mismo destino que el botón de envío del avance en su Momento. */
  idAssign: string | null;
}

export interface LineaTiempoData {
  kind: 'linea-tiempo';
  curso: CursoMeta;
  hitos: HitoTimeline[];
}

/* ─────────────────────────────────────────────────────────────────────────
   Unión de todos los segmentos + envoltura de proyecto guardable
   ───────────────────────────────────────────────────────────────────────── */

export type SegmentData =
  | MomentoData
  | EntregableData
  | GlosarioData
  | IntroduccionData
  | LineaTiempoData;

/** Proyecto guardable (.udmo.json): metadatos del curso + los segmentos creados. */
export interface UdmoProject {
  version: 1;
  curso: CursoMeta;
  segments: SegmentData[];
}

/**
 * Calcula la etiqueta visible de un avance, aplicando "Producto Final" (§9).
 * El último avance del curso (curso.ultimoAvance) se renombra globalmente.
 */
export function etiquetaAvance(numero: number, curso: CursoMeta): string {
  if (curso.ultimoAvance != null && numero === curso.ultimoAvance) {
    return 'Producto Final';
  }
  return `Avance ${numero}`;
}
