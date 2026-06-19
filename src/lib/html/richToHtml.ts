/**
 * Serializa el documento de un campo (JSON de ProseMirror) a HTML limpio GEO.
 *
 * NO usamos `editor.getHTML()` porque produce `<li><p>…</p></li>` (ProseMirror
 * envuelve cada viñeta en un párrafo) y la regla GEO prohíbe `<p>` dentro de
 * `<li>`. Este serializador emite exactamente lo permitido:
 *   - `<p style="text-align: justify;">…</p>` (estilo configurable)
 *   - `<ul><li>…</li></ul>` y `<ol><li>…</li></ol>` (sub-listas anidadas)
 *   - `<strong>…</strong>` para la negrita
 *
 * **No inserta `<br>`.** El espaciado entre viñetas y al salir de listas (§7)
 * lo aplica la capa de espaciado del exportador de segmento (fase F2), no este
 * módulo, que solo produce la estructura semántica.
 */

import type { JSONContent } from '@tiptap/core';

export interface RichToHtmlOptions {
  /**
   * Estilo inline de los `<p>` de nivel superior. Por defecto
   * `text-align: justify;` (como en los esqueletos). `null` = sin atributo style.
   */
  paragraphStyle?: string | null;
}

const ESCAPE: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

function escapeText(s: string): string {
  return s.replace(/[&<>]/g, (c) => ESCAPE[c]);
}

/**
 * Serializa nodos inline:
 * - `text` plano o con marks bold / link (o ambos: → `<strong><a>`)
 * - `hardBreak` → `<br>` (usado en citas bibliográficas §5 del skill)
 *
 * Fusiona tramos de negrita consecutivos para no emitir `<strong><strong>`.
 * Los links rompen la fusión (cada link puede tener href distinto).
 */
function serializeInline(nodes: JSONContent[] | undefined): string {
  if (!nodes) return '';
  let out = '';
  let boldOpen = false;

  const closeBold = () => {
    if (boldOpen) { out += '</strong>'; boldOpen = false; }
  };

  for (const n of nodes) {
    if (n.type === 'hardBreak') {
      closeBold();
      out += '<br>';
      continue;
    }
    if (n.type !== 'text') continue;

    const marks = n.marks ?? [];
    const isBold = marks.some((m) => m.type === 'bold');
    const linkMark = marks.find((m) => m.type === 'link');

    if (linkMark) {
      // Links always close the running bold span and wrap themselves.
      closeBold();
      const href = escapeText(linkMark.attrs?.href ?? '');
      const inner = escapeText(n.text ?? '');
      const a = `<a href="${href}" target="_blank" rel="noopener">${inner}</a>`;
      out += isBold ? `<strong>${a}</strong>` : a;
    } else {
      if (isBold && !boldOpen) { out += '<strong>'; boldOpen = true; }
      else if (!isBold && boldOpen) { out += '</strong>'; boldOpen = false; }
      out += escapeText(n.text ?? '');
    }
  }
  closeBold();
  return out;
}

/** Serializa un `<li>`: contenido inline + sub-lista anidada, SIN `<p>` envoltorio. */
function serializeListItem(li: JSONContent, paragraphStyle: string | null): string {
  let inner = '';
  let nested = '';
  for (const child of li.content ?? []) {
    if (child.type === 'paragraph') {
      inner += serializeInline(child.content);
    } else if (child.type === 'bulletList' || child.type === 'orderedList') {
      nested += serializeBlock(child, paragraphStyle);
    }
  }
  return `<li>${inner}${nested}</li>`;
}

function serializeBlock(node: JSONContent, paragraphStyle: string | null): string {
  switch (node.type) {
    case 'paragraph': {
      const inner = serializeInline(node.content);
      const style = paragraphStyle ? ` style="${paragraphStyle}"` : '';
      return `<p${style}>${inner}</p>`;
    }
    case 'bulletList':
      return `<ul>${(node.content ?? []).map((li) => serializeListItem(li, paragraphStyle)).join('')}</ul>`;
    case 'orderedList':
      return `<ol>${(node.content ?? []).map((li) => serializeListItem(li, paragraphStyle)).join('')}</ol>`;
    default:
      return '';
  }
}

export function richToHtml(doc: JSONContent | null | undefined, options: RichToHtmlOptions = {}): string {
  const paragraphStyle =
    options.paragraphStyle === undefined ? 'text-align: justify;' : options.paragraphStyle;
  if (!doc || !doc.content) return '';
  return doc.content.map((b) => serializeBlock(b, paragraphStyle)).join('\n');
}
