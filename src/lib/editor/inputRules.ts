/**
 * Reglas de entrada (input rules) extra tipo Markdown.
 *
 * Las reglas base ya las traen las extensiones de TipTap:
 *   - `**texto**`  → negrita        (extension-bold)
 *   - `- ` / `* `  → viñeta         (extension-bullet-list)
 *   - `1. `        → lista numerada (extension-ordered-list)
 *   - Tab / Shift-Tab → anidar / desanidar viñeta (extension-list-item)
 *
 * Aquí añadimos lo que falta:
 *   - `1) `   → lista numerada (variante paréntesis)
 *   - `1). `  → lista numerada (paréntesis + punto)
 *   - `a. `   → viñeta (letra eliminada per regla §11 GEO)
 *   - `-texto` / `*texto` (sin espacio) → viñeta inmediata
 */

import { Extension, InputRule, wrappingInputRule } from '@tiptap/core';

export const ExtraInputRules = Extension.create({
  name: 'extraInputRules',

  addInputRules() {
    const orderedList = this.editor.schema.nodes.orderedList;
    const bulletList = this.editor.schema.nodes.bulletList;
    if (!orderedList || !bulletList) return [];

    return [
      // "1) " → ordered list
      wrappingInputRule({
        find: /^(\d+)\)\s$/,
        type: orderedList,
        getAttributes: (match) => ({ start: Number(match[1]) }),
        joinPredicate: (match, node) =>
          node.childCount + (node.attrs.start as number) === Number(match[1]),
      }),

      // "1). " → ordered list (variante con punto)
      wrappingInputRule({
        find: /^(\d+)\)\.\s$/,
        type: orderedList,
        getAttributes: (match) => ({ start: Number(match[1]) }),
        joinPredicate: (match, node) =>
          node.childCount + (node.attrs.start as number) === Number(match[1]),
      }),

      // "a. " / "b. " / "c. " → bullet (letra eliminada, regla §11)
      wrappingInputRule({
        find: /^[a-zA-Z]\.\s$/,
        type: bulletList,
      }),

      // "-texto" / "*texto" (sin espacio tras el guion/asterisco) → bullet inmediato
      // Fires when a non-space char is typed right after the trigger at line start.
      new InputRule({
        find: /^([-+*])([^\s])/,
        handler({ range, match, chain }) {
          chain()
            .deleteRange({ from: range.from, to: range.from + match[1].length })
            .toggleBulletList()
            .run();
        },
      }),
    ];
  },
});
