/**
 * Reglas de entrada (input rules) extra tipo Markdown.
 *
 * Las reglas base ya las traen las extensiones de TipTap:
 *   - `**texto**`  → negrita        (extension-bold)
 *   - `- ` / `* `  → viñeta         (extension-bullet-list)
 *   - `1. `        → lista numerada (extension-ordered-list)
 *   - Tab / Shift-Tab → anidar / desanidar viñeta (extension-list-item)
 *
 * Aquí solo añadimos lo que falta para cumplir REQUISITOS.md §4:
 *   - `1) ` (con paréntesis) también inicia una lista numerada.
 */

import { Extension, wrappingInputRule } from '@tiptap/core';

export const ExtraInputRules = Extension.create({
  name: 'extraInputRules',

  addInputRules() {
    const orderedList = this.editor.schema.nodes.orderedList;
    if (!orderedList) return [];

    return [
      wrappingInputRule({
        find: /^(\d+)\)\s$/,
        type: orderedList,
        getAttributes: (match) => ({ start: Number(match[1]) }),
        joinPredicate: (match, node) =>
          node.childCount + (node.attrs.start as number) === Number(match[1]),
      }),
    ];
  },
});
