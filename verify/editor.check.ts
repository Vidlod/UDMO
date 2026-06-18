/* Verificación headless (jsdom) del editor: salida de lista y wrap de viñeta. */
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><body><div id="e"></div></body>');
const g = globalThis as unknown as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;
g.requestAnimationFrame = (cb: (t: number) => void) => setTimeout(() => cb(0), 0);
g.cancelAnimationFrame = (id: number) => clearTimeout(id);

const { Editor } = await import('@tiptap/core');
const { buildExtensions } = await import('../src/lib/editor/schema');
const { inputRegex } = await import('@tiptap/extension-bullet-list');

const el = dom.window.document.getElementById('e')!;
const editor = new Editor({ element: el as unknown as HTMLElement, extensions: buildExtensions('rich') });

const checks: [string, boolean][] = [];

// 1. La input rule de viñeta reconoce "- ".
checks.push(['regex viñeta reconoce "- "', inputRegex.test('- ')]);

// 2. Salir de una lista vacía con Enter (split → lift) deja un <p>, no una lista.
editor.commands.setContent({
  type: 'doc',
  content: [
    { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }] },
  ],
});
editor.commands.focus('end');
editor.commands.first(({ commands }) => [
  () => commands.splitListItem('listItem'),
  () => commands.liftListItem('listItem'),
]);
const afterExit = (editor.getJSON().content ?? []).map((n) => n.type);
checks.push(['Enter en viñeta vacía sale a <p>', afterExit.includes('paragraph') && !afterExit.includes('bulletList')]);

// 3. wrapInList/toggle de viñeta funciona sobre texto.
editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hola' }] }] });
editor.commands.selectAll();
editor.commands.toggleBulletList();
checks.push(['toggleBulletList envuelve en <ul>', (editor.getJSON().content ?? [])[0]?.type === 'bulletList']);

// 4. La lista numerada también sale a <p> con la misma cadena.
editor.commands.setContent({
  type: 'doc',
  content: [
    { type: 'orderedList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }] },
  ],
});
editor.commands.focus('end');
editor.commands.first(({ commands }) => [
  () => commands.splitListItem('listItem'),
  () => commands.liftListItem('listItem'),
]);
const afterExitOl = (editor.getJSON().content ?? []).map((n) => n.type);
checks.push(['Enter en numerada vacía sale a <p>', afterExitOl.includes('paragraph') && !afterExitOl.includes('orderedList')]);

let ok = true;
for (const [label, pass] of checks) {
  console.log(`${pass ? '✅' : '❌'} ${label}`);
  if (!pass) ok = false;
}
editor.destroy();
process.exit(ok ? 0 : 1);
