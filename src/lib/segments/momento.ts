/**
 * Exportador del Momento Evaluativo: convierte `MomentoData` en el HTML del
 * esqueleto Moodle (mismas clases/atributos Bootstrap que la plantilla GEO).
 *
 * Toda la maquetación que el agente solía equivocar la pone aquí, fija:
 *   - `rowspan` de la tabla (caso A solo-avances / caso B con cuestionario),
 *   - negrita ESPEJO (solo la etiqueta del avance/cuestionario),
 *   - una pestaña por semana, botón solo en la última semana de cada avance,
 *   - tantos botones en "Instrumento" como avances, "Producto Final" global.
 */

import type { MomentoData, Avance, CursoMeta } from './types';
import { etiquetaAvance } from './types';
import { richToHtml } from '../html/richToHtml';
import { applySpacing, enforceInvariants } from '../html/spacing';

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const esc = (s: string) => s.replace(/[&<>]/g, (c) => ESC[c]);

function esProductoFinal(av: Avance, curso: CursoMeta): boolean {
  return curso.ultimoAvance != null && av.numero === curso.ultimoAvance;
}

/** URL de la tarea de envío, o marcador + FLAG si falta el id. */
function assignUrl(av: Avance, curso: CursoMeta): { url: string; flag: string } {
  if (!av.idAssign) {
    return {
      url: `${curso.moodleBase}/mod/assign/view.php?id=`,
      flag: `\n<!-- FLAG: dato-faltante Falta el id de la tarea de envío del Avance ${av.numero} -->`,
    };
  }
  return { url: `${curso.moodleBase}/mod/assign/view.php?id=${esc(av.idAssign)}`, flag: '' };
}

/* ── Pestaña 1: Resumen de Entregas ──────────────────────────────────── */

function buildResumen(data: MomentoData): string {
  const totalFilas = data.avances.reduce((n, av) => n + (av.cuestionario ? 2 : 1), 0);

  let filas = '';
  data.avances.forEach((av, i) => {
    const etiqueta = etiquetaAvance(av.numero, data.curso);
    const rangoSemanas =
      av.semanaInicio === av.semanaFin ? `${av.semanaInicio}` : `${av.semanaInicio} - ${av.semanaFin}`;
    const span = av.cuestionario ? 2 : 1;
    const momentoCell =
      i === 0
        ? `\n                                        <td rowspan="${totalFilas}" style="vertical-align: middle; text-align: center;">${esc(data.momento)} <br>${data.peso}%</td>`
        : '';

    filas += `
                                    <tr>${momentoCell}
                                        <td rowspan="${span}" style="vertical-align: middle; text-align: center;">${rangoSemanas}</td>
                                        <td style="text-align: left; vertical-align: middle;"><strong>${esc(etiqueta)}.</strong> ${esc(av.nombre)} - ${esc(av.descripcion)}</td>
                                        <td style="vertical-align: middle; text-align: center;">${av.peso}%</td>
                                        <td rowspan="${span}" style="vertical-align: middle; text-align: center;">${av.semanaFin}</td>
                                    </tr>`;

    if (av.cuestionario) {
      const c = av.cuestionario;
      filas += `
                                    <tr>
                                        <td style="text-align: left; vertical-align: middle;"><strong>Cuestionario de evaluación –</strong> ${esc(c.unidad)} - ${esc(c.nombreUnidad)}</td>
                                        <td style="vertical-align: middle; text-align: center;">${c.peso}%</td>
                                    </tr>`;
    }
  });

  return `
                    <div class="tab-pane fade shadow rounded bg-white p-5"
                        id="v-pills-home" role="tabpanel" aria-labelledby="v-pills-home-tab">
                        <h4 class="mb-4">Resumen de Entregas</h4>
                        <div style="text-align: center;">
                            <table class="table table-bordered">
                                <tbody>
                                    <tr>
                                        <th bgcolor="#F9F9F9" style="vertical-align: middle; text-align: center;">Momento Evaluativo</th>
                                        <th bgcolor="#F9F9F9" style="vertical-align: middle; text-align: center;">Duración Semana</th>
                                        <th bgcolor="#F9F9F9" style="vertical-align: middle; text-align: center;">Entregable</th>
                                        <th bgcolor="#F9F9F9" style="vertical-align: middle; text-align: center;" nowrap="">Peso %</th>
                                        <th bgcolor="#F9F9F9" style="vertical-align: middle; text-align: center;">Semana de Entrega</th>
                                    </tr>${filas}
                                </tbody>
                            </table>
                        </div>
                    </div>`;
}

/* ── Pestaña 2: Descripción General ──────────────────────────────────── */

function buildDescripcion(data: MomentoData): string {
  const cuerpo = applySpacing(richToHtml(data.descripcionGeneral));
  // §6 skill: h4 secundario lleva <br> al inicio para el espaciado Moodle.
  // Solo se emite si el usuario llenó el campo.
  const condHtml = richToHtml(data.condicionesEntrega);
  const condiciones = condHtml
    ? `\n                        <h4><br>Condiciones Particulares de Entrega</h4>\n                        ${applySpacing(condHtml)}`
    : '';
  return `
                    <div class="tab-pane fade shadow rounded bg-white p-5"
                        id="v-pills-profile" role="tabpanel" aria-labelledby="v-pills-profile-tab">
                        <h4 class="mb-4">Descripción General</h4>
                        ${cuerpo}${condiciones}
                    </div>`;
}

/* ── Pestaña 3: Instrumento de Evaluación (Rúbrica) ──────────────────── */

function buildInstrumentoEval(data: MomentoData): string {
  // Use the specific filename if provided; fall back to a generic @@PLUGINFILE@@ path.
  const archivo = data.rubricaArchivo || 'rubrica.pdf';
  const rubrica = `<strong><a href="@@PLUGINFILE@@/${esc(archivo)}" target="_blank" rel="noopener">
                            <button type="button" class="btn btn-outline-primary btn-lg" aria-pressed="true" role="button">
                                <i class="fa fa fa-file-pdf-o fa-lg"></i> Rúbrica
                            </button>
                        </a></strong>`;
  return `
                    <div class="tab-pane fade shadow rounded bg-white p-5"
                        id="v-pills-profile1" role="tabpanel" aria-labelledby="v-pills-profile1-tab">
                        <h4 class="mb-4">Instrumento de Evaluación</h4>
                        ${rubrica}
                    </div>`;
}

/* ── Pestaña 4: Instrumento para Enviar Entregable ───────────────────── */

function buildInstrumentoEnviar(data: MomentoData): string {
  const botones = data.avances
    .map((av) => {
      const texto = esProductoFinal(av, data.curso)
        ? 'Enviar Producto Final'
        : `Enviar Entregable Avance ${av.numero}`;
      const { url, flag } = assignUrl(av, data.curso);
      return `${flag}
                        <div style="text-align: center;">
                            <a target="_blank" href="${url}" rel="noopener">
                                <button type="button" class="btn btn-outline-primary btn-lg" aria-pressed="true" role="button">
                                    <span class="spinner-grow spinner-grow-sm"></span> ${texto}
                                </button>
                            </a>
                        </div>`;
    })
    .join('\n                        <p></p>');

  return `
                    <div class="tab-pane fade shadow rounded bg-white p-5"
                        id="v-pills-profile2" role="tabpanel" aria-labelledby="v-pills-profile2-tab">
                        <h4 class="mb-4">Instrumento para Enviar Entregable</h4>${botones}
                    </div>`;
}

/* ── Pestaña 5: Contenido de los Entregables (una pestaña por semana) ── */

function tituloContenido(data: MomentoData): string {
  const etiquetas = data.avances.map((av) =>
    esProductoFinal(av, data.curso) ? 'Producto Final' : `${av.numero}`,
  );
  if (etiquetas.length <= 1) return etiquetas.join('');
  return `${etiquetas.slice(0, -1).join(', ')} y ${etiquetas[etiquetas.length - 1]}`;
}

function buildContenido(data: MomentoData): string {
  const titulo = tituloContenido(data);

  // nav-tabs: una por semana.
  const tabs = data.semanas
    .map((s, i) => {
      const av = data.avances.find((a) => a.numero === s.avanceNumero);
      const sub = av && esProductoFinal(av, data.curso) ? 'Producto Final' : `Avance ${s.avanceNumero}`;
      const activa = i === 0;
      const cls = activa ? 'nav-link active' : 'nav-link';
      const extra = activa ? 'aria-selected="true"' : 'aria-selected="false" tabindex="-1"';
      return `                                <li class="nav-item">
                                    <a class="${cls}" id="semana${s.numero}-tab" data-toggle="tab"
                                        href="#semana${s.numero}" role="tab" aria-controls="semana${s.numero}" ${extra}>
                                        Semana ${s.numero} <small class="d-block" style="text-align: center;">${sub}</small>
                                    </a>
                                </li>`;
    })
    .join('\n');

  // paneles: contenido + botón solo si es la última semana del avance.
  const paneles = data.semanas
    .map((s, i) => {
      const av = data.avances.find((a) => a.numero === s.avanceNumero);
      const esUltimaDelAvance = av ? s.numero === av.semanaFin : false;
      const cls = i === 0 ? 'tab-pane fade active show' : 'tab-pane fade';

      let cuerpo = applySpacing(richToHtml(s.contenido));

      if (esUltimaDelAvance && av) {
        const texto = esProductoFinal(av, data.curso)
          ? 'Enviar Producto Final'
          : `Enviar Entregable ${av.numero}`;
        const envio = s.parrafoEnvio ? applySpacing(richToHtml(s.parrafoEnvio)) : '';
        const { url, flag } = assignUrl(av, data.curso);
        cuerpo += `${envio}${flag}
                                        <div style="text-align: center;">
                                            <a href="${url}">
                                                <button type="button" class="btn btn-outline-primary btn-lg" aria-pressed="true" role="button">
                                                    <span class="spinner-grow spinner-grow-sm"></span> ${texto}
                                                </button>
                                            </a>
                                        </div>`;
      }

      return `                                <div class="${cls}" id="semana${s.numero}"
                                    role="tabpanel" aria-labelledby="semana${s.numero}-tab">
                                    <div class="card-body">
                                        ${cuerpo}
                                    </div>
                                </div>`;
    })
    .join('\n');

  return `
                    <div class="tab-pane fade shadow rounded bg-white p-5 active show"
                        id="v-pills-settings" role="tabpanel" aria-labelledby="v-pills-settings-tab">
                        <h4 class="mb-4">Contenido de los Entregables ${titulo}</h4>
                        <div>
                            <ul class="nav nav-tabs" id="myTab" role="tablist">
${tabs}
                            </ul>
                            <div class="tab-content" id="myTabContent">
${paneles}
                            </div>
                        </div>
                    </div>`;
}

/* ── Navegación vertical (nav-pills) ─────────────────────────────────── */

function buildNav(data: MomentoData): string {
  const titulo = tituloContenido(data).toUpperCase();
  return `            <div class="col-md-3">
                <div class="nav flex-column nav-pills nav-pills-custom" id="v-pills-tab"
                    role="tablist" aria-orientation="vertical">

                    <a class="nav-link mb-3 p-3 shadow border" id="v-pills-home-tab"
                        data-toggle="pill" href="#v-pills-home" role="tab"
                        aria-controls="v-pills-home" aria-selected="false" tabindex="-1">
                        <i class="fa fa-calendar-check-o mr-2"></i>
                        <span class="font-weight-bold small text-uppercase">RESUMEN DE ENTREGAS</span>
                    </a>

                    <a class="nav-link mb-3 p-3 shadow border" id="v-pills-profile-tab"
                        data-toggle="pill" href="#v-pills-profile" role="tab"
                        aria-controls="v-pills-profile" aria-selected="false" tabindex="-1">
                        <i class="fa fa-bars mr-2"></i>
                        <span class="font-weight-bold small text-uppercase">DESCRIPCIÓN GENERAL</span>
                    </a>

                    <a class="nav-link mb-3 p-3 shadow border" id="v-pills-profile1-tab"
                        data-toggle="pill" href="#v-pills-profile1" role="tab"
                        aria-controls="v-pills-profile1" aria-selected="false" tabindex="-1">
                        <i class="fa fa-check-square-o mr-2"></i>
                        <span class="font-weight-bold small text-uppercase">INSTRUMENTO DE EVALUACIÓN</span>
                    </a>

                    <a class="nav-link mb-3 p-3 shadow border" id="v-pills-profile2-tab"
                        data-toggle="pill" href="#v-pills-profile2" role="tab"
                        aria-controls="v-pills-profile2" aria-selected="false" tabindex="-1">
                        <i class="fa fa-share-square-o mr-2"></i>
                        <span class="font-weight-bold small text-uppercase">INSTRUMENTO PARA ENVIAR ENTREGABLE</span>
                    </a>

                    <a class="nav-link mb-3 p-3 shadow border active" id="v-pills-settings-tab"
                        data-toggle="pill" href="#v-pills-settings" role="tab"
                        aria-controls="v-pills-settings" aria-selected="true" tabindex="0">
                        <i class="fa fa-pencil-square-o mr-2"></i>
                        <span class="font-weight-bold small text-uppercase">CONTENIDO DE LOS ENTREGABLES ${titulo}</span>
                    </a>

                </div>
            </div>`;
}

/** Exporta el Momento completo a HTML Moodle. */
export function exportMomento(data: MomentoData): string {
  const html = `<section class="py-1 header">
    <div class="container py-4">
        <header class="text-center mb-1 pb-1 text-white"></header>
        <div class="row">

${buildNav(data)}

            <div class="col-md-9">
                <div class="tab-content" id="v-pills-tabContent">
${buildResumen(data)}
${buildDescripcion(data)}
${buildInstrumentoEval(data)}
${buildInstrumentoEnviar(data)}
${buildContenido(data)}
                </div>
            </div>
        </div>
    </div>
</section>`;
  return enforceInvariants(html);
}
