/* Verificación del exportador de Momento contra la estructura del golden M1. */
import { exportMomento } from '../src/lib/segments/momento';
import type { MomentoData, CursoMeta } from '../src/lib/segments/types';
import type { JSONContent } from '@tiptap/core';

const p = (text: string): JSONContent => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

const curso: CursoMeta = {
  nombre: 'Estadística Descriptiva',
  moodleBase: 'https://virtual.udes.edu.co',
  ultimoAvance: null, // M1 no es el último momento → sin "Producto Final"
};

// Momento 1 de Estadística: Avance 1 (sem 1-3) + cuestionario, Avance 2 (sem 4-5) + cuestionario.
const data: MomentoData = {
  kind: 'momento',
  curso,
  momento: 'I',
  peso: 40,
  avances: [
    {
      numero: 1, nombre: 'Recolección de datos',
      descripcion: 'Informe con la elaboración de un mapa mental, clasificación de variables y ejercicio de muestreo.',
      semanaInicio: 1, semanaFin: 3, peso: 10,
      cuestionario: { unidad: 'Unidad 1', nombreUnidad: 'Investigación estadística', peso: 10 },
      idAssign: '1001',
    },
    {
      numero: 2, nombre: 'Organización de datos',
      descripcion: 'Informe con la construcción de un cuadro sinóptico y diagramas estadísticos.',
      semanaInicio: 4, semanaFin: 5, peso: 10,
      cuestionario: { unidad: 'Unidad 2', nombreUnidad: 'Fundamentos de Estadística', peso: 10 },
      idAssign: '1002',
    },
  ],
  descripcionGeneral: p('En este primer reporte de avances el estudiante debe entregar los productos del Avance 1 y 2.'),
  rubricaArchivo: 'RUBRICA_Momento_I.pdf',
  semanas: [
    { numero: 1, avanceNumero: 1, contenido: p('Contenido de la semana 1.') },
    { numero: 2, avanceNumero: 1, contenido: p('Contenido de la semana 2.') },
    { numero: 3, avanceNumero: 1, contenido: p('Contenido de la semana 3.'), parrafoEnvio: p('Envíe el documento en las fechas establecidas.') },
    { numero: 4, avanceNumero: 2, contenido: p('Contenido de la semana 4.') },
    { numero: 5, avanceNumero: 2, contenido: p('Contenido de la semana 5.'), parrafoEnvio: p('Envíe el documento en las fechas establecidas.') },
  ],
};

const html = exportMomento(data);

const countOf = (re: RegExp) => (html.match(re) ?? []).length;

const checks: [string, boolean][] = [
  ['rowspan="4" en la columna Momento (1 vez)', countOf(/rowspan="4"/g) === 1],
  ['rowspan="2" cuatro veces (duración+entrega ×2 avances)', countOf(/rowspan="2"/g) === 4],
  ['negrita ESPEJO Avance 1 = solo etiqueta', html.includes('<strong>Avance 1.</strong> Recolección de datos -')],
  ['negrita ESPEJO Cuestionario = solo etiqueta', html.includes('<strong>Cuestionario de evaluación –</strong> Unidad 1 - Investigación estadística')],
  ['5 pestañas de semana', countOf(/id="semana\d+-tab"/g) === 5],
  ['botón semanal solo en semana 3 y 5', html.includes('Enviar Entregable 1') && html.includes('Enviar Entregable 2')],
  ['NO hay botón semanal en semanas sin fin de avance', countOf(/Enviar Entregable \d+\s*<\/a>/g) === 2],
  ['Instrumento: 2 botones "Enviar Entregable Avance N"', html.includes('Enviar Entregable Avance 1') && html.includes('Enviar Entregable Avance 2')],
  ['título "Contenido de los Entregables 1 y 2"', html.includes('Contenido de los Entregables 1 y 2')],
  ['rúbrica con @@PLUGINFILE@@', html.includes('@@PLUGINFILE@@/RUBRICA_Momento_I.pdf')],
  ['sin <br><br>', !/<br>\s*<br>/.test(html)],
  ['sin <br> antes de cierre', !/<br>\s*<\/(li|ul|ol|div|p)>/.test(html)],
  ['SIN "Producto Final" (M1 no es el último)', !html.includes('Producto Final')],
];

let ok = true;
for (const [label, pass] of checks) {
  console.log(`${pass ? '✅' : '❌'} ${label}`);
  if (!pass) ok = false;
}

// Prueba aparte: con ultimoAvance = 2, el Avance 2 pasa a "Producto Final".
const dataPF: MomentoData = { ...data, curso: { ...curso, ultimoAvance: 2 } };
const htmlPF = exportMomento(dataPF);
const pfOk =
  htmlPF.includes('Enviar Producto Final') &&
  htmlPF.includes('<strong>Producto Final.</strong>') &&
  htmlPF.includes('Contenido de los Entregables 1 y Producto Final');
console.log(`${pfOk ? '✅' : '❌'} "Producto Final" global cuando ultimoAvance=2`);
if (!pfOk) ok = false;

process.exit(ok ? 0 : 1);
