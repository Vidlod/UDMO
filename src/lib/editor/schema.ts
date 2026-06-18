/**
 * Esquemas restringidos por tipo de campo (la pieza clave de UDMO).
 *
 * Un esquema de ProseMirror define QUÉ nodos y marcas existen. Lo que no está
 * en el esquema NO se puede crear: ni escribiendo, ni con atajos, ni **pegando**
 * (al pegar, ProseMirror descarta todo lo que no encaje en el esquema → el
 * "sanitizador de pegado" es prácticamente gratis). Ver REQUISITOS.md §5.
 *
 * Dos modos:
 *   - `rich`   → párrafos + viñetas + sub-viñetas + listas numeradas + negrita.
 *   - `single` → un único párrafo con negrita; sin listas, sin saltos, sin
 *                poder partirlo en varios párrafos (Document.content = 'paragraph').
 *
 * Lo que deliberadamente NO se incluye (y por tanto es imposible producir):
 * cursiva, tachado, código, encabezados, citas, líneas horizontales, saltos
 * duros (`<br>` a mano), colores, tamaños, estilos inline.
 */

import { Extension, type Extensions } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import History from '@tiptap/extension-history';
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
import Placeholder from '@tiptap/extension-placeholder';
import { ExtraInputRules } from './inputRules';

export type FieldMode = 'rich' | 'single';

/**
 * En modo `single` el usuario no puede crear un segundo párrafo ni un salto
 * duro: capturamos Enter y Shift-Enter para que no hagan nada. (El esquema ya
 * lo impide; esto evita además el "salto" visual sin efecto.)
 */
const SingleLineGuard = Extension.create({
  name: 'singleLineGuard',
  addKeyboardShortcuts() {
    return {
      Enter: () => true,
      'Shift-Enter': () => true,
    };
  },
});

/**
 * ListItem con salida de lista robusta. El ListItem de TipTap solo asocia
 * `Enter → splitListItem`, que devuelve `false` en una viñeta vacía y deja al
 * usuario "atrapado" en la lista. Encadenamos: si splitListItem no aplica
 * (viñeta vacía), `liftListItem` saca al usuario de la lista a un `<p>`.
 */
const GeoListItem = ListItem.extend({
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      Enter: () =>
        this.editor.commands.first(({ commands }) => [
          () => commands.splitListItem(this.name),
          () => commands.liftListItem(this.name),
        ]),
    };
  },
});

/** Construye el conjunto de extensiones para un campo según su modo. */
export function buildExtensions(mode: FieldMode, placeholder = ''): Extensions {
  const common: Extensions = [
    Text,
    Bold,
    History,
    Dropcursor,
    Gapcursor,
    Placeholder.configure({ placeholder }),
  ];

  if (mode === 'single') {
    // Document que admite EXACTAMENTE un párrafo.
    const SingleDocument = Document.extend({ content: 'paragraph' });
    return [SingleDocument, Paragraph, SingleLineGuard, ...common];
  }

  // mode === 'rich'
  return [
    Document, // content por defecto: 'block+'
    Paragraph,
    BulletList,
    OrderedList,
    GeoListItem,
    ExtraInputRules,
    ...common,
  ];
}
