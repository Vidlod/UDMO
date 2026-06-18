/* Verificación de richToHtml: comprueba que produce HTML GEO-limpio. */
import { richToHtml } from '../src/lib/html/richToHtml';
import type { JSONContent } from '@tiptap/core';

// Documento de muestra que un usuario podría crear con los atajos Markdown:
// un párrafo con negrita, una viñeta con sub-viñeta, y una lista numerada.
const doc: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Lea el ' },
        { type: 'text', marks: [{ type: 'bold' }], text: 'syllabus' },
        { type: 'text', text: ' del curso.' },
      ],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Primer recurso' }] },
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Sub-recurso' }] }],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'orderedList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Paso uno' }] }],
        },
      ],
    },
  ],
};

const html = richToHtml(doc);
console.log('--- HTML generado ---\n' + html + '\n');

const checks: [string, boolean][] = [
  ['negrita = <strong>', html.includes('<strong>syllabus</strong>')],
  ['párrafo con justify', html.includes('<p style="text-align: justify;">')],
  ['NO hay <p> dentro de <li>', !/<li>\s*<p/.test(html)],
  ['sub-viñeta anidada', html.includes('<ul><li>Sub-recurso</li></ul>')],
  ['lista numerada', html.includes('<ol><li>Paso uno</li></ol>')],
  ['SIN <br> (eso lo pone F2)', !html.includes('<br')],
  ['SIN cursiva', !/<em|<i[ >]/.test(html)],
];

let ok = true;
for (const [label, pass] of checks) {
  console.log(`${pass ? '✅' : '❌'} ${label}`);
  if (!pass) ok = false;
}
process.exit(ok ? 0 : 1);
