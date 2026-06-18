<script lang="ts">
  import type { MomentoData, Avance, Semana } from './types';
  import { exportMomento } from './momento';
  import RichField from '../editor/RichField.svelte';

  // ── Estado del Momento ──
  let data = $state<MomentoData>({
    kind: 'momento',
    curso: { nombre: '', moodleBase: 'https://virtual.udes.edu.co', ultimoAvance: null },
    momento: 'I',
    peso: 40,
    avances: [nuevoAvance(1)],
    descripcionGeneral: null,
    rubricaArchivo: '',
    semanas: [],
  });

  let esUltimoMomento = $state(false);

  function nuevoAvance(numero: number): Avance {
    return {
      numero, nombre: '', descripcion: '',
      semanaInicio: numero === 1 ? 1 : 0, semanaFin: 0, peso: 10,
      cuestionario: null, idAssign: '',
    };
  }

  function addAvance() {
    data.avances.push(nuevoAvance(data.avances.length + 1));
    reconciliar();
  }
  function removeAvance(i: number) {
    data.avances.splice(i, 1);
    data.avances.forEach((a, k) => (a.numero = k + 1));
    reconciliar();
  }
  function toggleCuestionario(av: Avance) {
    av.cuestionario = av.cuestionario ? null : { unidad: '', nombreUnidad: '', peso: 10 };
  }

  /** Reconstruye la lista de semanas a partir de los rangos de los avances,
   *  conservando el contenido ya escrito (por número de semana). */
  function reconciliar() {
    const previas = new Map(data.semanas.map((s) => [s.numero, s]));
    const nuevas: Semana[] = [];
    for (const av of data.avances) {
      const ini = Math.max(1, av.semanaInicio || 0);
      const fin = Math.max(ini, av.semanaFin || 0);
      if (!av.semanaInicio || !av.semanaFin) continue;
      for (let w = ini; w <= fin; w++) {
        const prev = previas.get(w);
        nuevas.push(prev
          ? { ...prev, avanceNumero: av.numero }
          : { numero: w, avanceNumero: av.numero, contenido: null });
      }
    }
    nuevas.sort((a, b) => a.numero - b.numero);
    data.semanas = nuevas;
  }

  // Mantén ultimoAvance sincronizado con el toggle "último momento".
  $effect(() => {
    data.curso.ultimoAvance = esUltimoMomento
      ? Math.max(...data.avances.map((a) => a.numero))
      : null;
  });

  function esUltimaSemana(s: Semana): boolean {
    const av = data.avances.find((a) => a.numero === s.avanceNumero);
    return !!av && s.numero === av.semanaFin;
  }

  let html = $derived(exportMomento(data));

  async function copiar() {
    await navigator.clipboard.writeText(html);
  }
</script>

<div class="mf">
  <div class="mf__form">
    <h2>Momento Evaluativo</h2>

    <fieldset class="mf__group">
      <legend>Curso</legend>
      <label>Nombre del curso<input bind:value={data.curso.nombre} placeholder="Estadística Descriptiva" /></label>
      <label>Base de Moodle<input bind:value={data.curso.moodleBase} /></label>
      <div class="mf__row">
        <label class="mf__sm">Momento<input bind:value={data.momento} placeholder="I" /></label>
        <label class="mf__sm">Peso %<input type="number" bind:value={data.peso} /></label>
        <label class="mf__check"><input type="checkbox" bind:checked={esUltimoMomento} /> Último momento del curso</label>
      </div>
    </fieldset>

    <fieldset class="mf__group">
      <legend>Avances</legend>
      {#each data.avances as av, i (i)}
        <div class="mf__avance">
          <div class="mf__avance-head">
            <strong>Avance {av.numero}{esUltimoMomento && av.numero === Math.max(...data.avances.map((a) => a.numero)) ? ' → Producto Final' : ''}</strong>
            {#if data.avances.length > 1}
              <button class="mf__del" onclick={() => removeAvance(i)} type="button">Quitar</button>
            {/if}
          </div>
          <label>Nombre<input bind:value={av.nombre} placeholder="Recolección de datos" /></label>
          <label>Descripción<input bind:value={av.descripcion} placeholder="Informe con la elaboración de…" /></label>
          <div class="mf__row">
            <label class="mf__sm">Semana inicio<input type="number" bind:value={av.semanaInicio} onchange={reconciliar} /></label>
            <label class="mf__sm">Semana fin<input type="number" bind:value={av.semanaFin} onchange={reconciliar} /></label>
            <label class="mf__sm">Peso %<input type="number" bind:value={av.peso} /></label>
          </div>
          <label>ID tarea Moodle (assign)<input bind:value={av.idAssign} placeholder="1001" /></label>
          <label class="mf__check">
            <input type="checkbox" checked={!!av.cuestionario} onchange={() => toggleCuestionario(av)} /> Tiene cuestionario
          </label>
          {#if av.cuestionario}
            <div class="mf__row mf__cuest">
              <label class="mf__sm">Unidad<input bind:value={av.cuestionario.unidad} placeholder="Unidad 1" /></label>
              <label>Nombre unidad<input bind:value={av.cuestionario.nombreUnidad} placeholder="Investigación estadística" /></label>
              <label class="mf__sm">Peso %<input type="number" bind:value={av.cuestionario.peso} /></label>
            </div>
          {/if}
        </div>
      {/each}
      <button class="mf__add" onclick={addAvance} type="button">+ Añadir avance</button>
    </fieldset>

    <fieldset class="mf__group">
      <legend>Descripción General</legend>
      <RichField bind:value={data.descripcionGeneral} placeholder="Párrafos de la tabla 'Entregables del avance N…' (SABER/SER/HACER)…" />
      <label>Archivo de la rúbrica<input bind:value={data.rubricaArchivo} placeholder="RUBRICA_Momento_I.pdf" /></label>
    </fieldset>

    <fieldset class="mf__group">
      <legend>Contenido por semana</legend>
      {#if data.semanas.length === 0}
        <p class="mf__hint">Define los rangos de semana de cada avance para generar las pestañas.</p>
      {/if}
      {#each data.semanas as s, i (s.numero)}
        <div class="mf__semana">
          <div class="mf__avance-head">
            <strong>Semana {s.numero}</strong>
            <span class="mf__tag">Avance {s.avanceNumero}{esUltimaSemana(s) ? ' · lleva botón' : ''}</span>
          </div>
          <RichField bind:value={data.semanas[i].contenido} placeholder="Contenido de la semana…" />
          {#if esUltimaSemana(s)}
            <label class="mf__envio">Párrafo de envío
              <RichField bind:value={data.semanas[i].parrafoEnvio} mode="single" placeholder="Envíe el documento en las fechas establecidas." />
            </label>
          {/if}
        </div>
      {/each}
    </fieldset>
  </div>

  <div class="mf__out">
    <div class="mf__out-head">
      <span>HTML para Moodle</span>
      <button onclick={copiar} type="button">Copiar</button>
    </div>
    <pre class="mf__code">{html}</pre>
  </div>
</div>
