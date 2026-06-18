/**
 * Capa de espaciado GEO (§7) + invariantes de seguridad (§8).
 *
 * El usuario nunca escribe `<br>`. `richToHtml` produce estructura sin saltos.
 * Aquí insertamos los `<br>` que Moodle necesita, de forma determinista:
 *   - entre viñetas de una lista "pesada" (con enlace o ítems largos): un `<br>`.
 *   - al salir de una lista hacia un `<p>` (`</ul><p>` / `</ol><p>`): un `<br>`.
 * Y garantizamos que nunca quede `<br><br>` ni `<br>` antes de un cierre.
 *
 * Trabaja sobre el HTML de UN campo (bloques separados por '\n', como los emite
 * richToHtml). Las listas anidadas se consideran "cortas" (estructurales) y no
 * reciben `<br>` entre viñetas.
 */

const LI_LARGO = 60; // umbral de caracteres para considerar una viñeta "multilínea"

/** ¿La lista es "pesada"? (algún <li> con enlace, o texto largo) → lleva <br> entre viñetas. */
function listaPesada(block: string): boolean {
  if (/<a\s/i.test(block)) return true;
  const items = block.match(/<li>([\s\S]*?)<\/li>/g) ?? [];
  return items.some((li) => li.replace(/<[^>]+>/g, '').length > LI_LARGO);
}

/** Inserta un <br> entre viñetas de nivel superior si la lista es plana y pesada. */
function brEntreVinetas(block: string): string {
  const esLista = /^<(ul|ol)>/.test(block);
  if (!esLista) return block;
  // Plana = sin sub-listas anidadas.
  const plana = block.indexOf('<ul', 1) === -1 && block.indexOf('<ol', 1) === -1;
  if (!plana || !listaPesada(block)) return block;
  return block.replace(/<\/li><li>/g, '</li><br><li>');
}

/** Aplica el modelo de espaciado a un campo ya serializado por richToHtml. */
export function applySpacing(fieldHtml: string): string {
  if (!fieldHtml) return '';
  const blocks = fieldHtml.split('\n').map(brEntreVinetas);

  let out = '';
  for (let i = 0; i < blocks.length; i++) {
    out += blocks[i];
    const cur = blocks[i];
    const next = blocks[i + 1];
    // Saliendo de una lista hacia un <p>: un <br>.
    if (next && /^<(ul|ol)>/.test(cur) && /^<p[ >]/.test(next)) {
      out += '\n<br>';
    }
    if (i < blocks.length - 1) out += '\n';
  }
  return enforceInvariants(out);
}

/**
 * Red de seguridad: elimina lo que las reglas mecánicas prohíben siempre.
 * Idempotente; se puede correr sobre el HTML final completo.
 */
export function enforceInvariants(html: string): string {
  return (
    html
      // nunca <br><br> (colapsa cualquier run a uno solo)
      .replace(/(?:<br\s*\/?>\s*){2,}/gi, '<br>')
      // nunca <br> justo antes de un cierre de bloque/lista/viñeta
      .replace(/<br\s*\/?>\s*(<\/(?:li|ul|ol|div|p)>)/gi, '$1')
  );
}
