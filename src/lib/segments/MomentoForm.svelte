<script lang="ts">
  import { untrack } from 'svelte';
  import type { MomentoData, Avance, Semana } from './types';
  import { etiquetaAvance } from './types';
  import { exportMomento } from './momento';
  import RichField from '../editor/RichField.svelte';

  // Props: permiten reutilizar este mismo formulario para Momento I y Momento II.
  // El padre pasa valores iniciales; el usuario puede cambiarlos libremente después.
  let {
    momentoNum = 'I',
    pesoTotal = 40,
    pesoAvance = 10,
    lastMomento = false,
  }: {
    momentoNum?: string;
    pesoTotal?: number;
    pesoAvance?: number;
    lastMomento?: boolean;
  } = $props();

  type Tab = 'resumen' | 'descripcion' | 'instrumento' | 'enviar' | 'contenido';

  let data = $state<MomentoData>({
    kind: 'momento',
    curso: { nombre: '', moodleBase: 'https://virtual.udes.edu.co', ultimoAvance: null },
    momento: untrack(() => momentoNum),
    peso: untrack(() => pesoTotal),
    avances: [nuevoAvance(1)],
    descripcionGeneral: null,
    condicionesEntrega: null,
    rubricaArchivo: '',
    semanas: [],
  });

  // untrack() le dice a Svelte que capturar el valor inicial del prop es intencional
  // (el usuario puede cambiar el checkbox libremente; el prop no se volverá a leer).
  let esUltimoMomento = $state(untrack(() => lastMomento));
  let configOpen = $state(true);
  let tabActiva = $state<Tab>('resumen');
  // Tracks the active semana by its WEEK NUMBER (not array index).
  // Using the number makes the selection stable when reconciliar() reorders
  // or replaces the semanas array — the index can shift, the number cannot.
  let semanaActiva = $state(0); // 0 = none selected yet
  let copied = $state(false);

  function nuevoAvance(numero: number): Avance {
    return {
      numero,
      nombre: '',
      descripcion: '',
      semanaInicio: numero === 1 ? 1 : 0,
      semanaFin: 0,
      peso: pesoAvance,
      cuestionario: null,
      idAssign: '',
    };
  }

  function addAvance() {
    const prev = data.avances[data.avances.length - 1];
    const nuevo = nuevoAvance(data.avances.length + 1);
    if (prev?.semanaFin > 0) nuevo.semanaInicio = prev.semanaFin + 1;
    data.avances.push(nuevo);
    reconciliar();
  }

  function removeAvance(i: number) {
    data.avances.splice(i, 1);
    data.avances.forEach((a, k) => (a.numero = k + 1));
    reconciliar();
  }

  function toggleCuestionario(av: Avance) {
    av.cuestionario = av.cuestionario
      ? null
      : { unidad: '', nombreUnidad: '', peso: 10 };
  }

  /** Avances 2+ siempre arrancan en semanaFin(anterior) + 1. */
  function sincronizarInicios() {
    for (let i = 1; i < data.avances.length; i++) {
      const fin = data.avances[i - 1].semanaFin;
      if (fin > 0) data.avances[i].semanaInicio = fin + 1;
    }
  }

  function reconciliar() {
    sincronizarInicios();
    const previas = new Map(data.semanas.map((s) => [s.numero, s]));
    // Use a Map keyed by week number to automatically deduplicate.
    // Later avances overwrite earlier ones for the same week (shouldn't overlap,
    // but this prevents duplicate tab labels if ranges are inconsistent).
    const result = new Map<number, Semana>();
    for (const av of data.avances) {
      if (!av.semanaInicio || !av.semanaFin) continue;
      const ini = Math.max(1, av.semanaInicio);
      const fin = Math.max(ini, av.semanaFin);
      for (let w = ini; w <= fin; w++) {
        const prev = previas.get(w);
        result.set(
          w,
          prev
            ? { ...prev, avanceNumero: av.numero }
            : { numero: w, avanceNumero: av.numero, contenido: null },
        );
      }
    }
    const nuevas = Array.from(result.values()).sort((a, b) => a.numero - b.numero);
    data.semanas = nuevas;
    // Reset to first semana if the previously-active week no longer exists.
    if (!nuevas.some((s) => s.numero === semanaActiva)) {
      semanaActiva = nuevas.length > 0 ? nuevas[0].numero : 0;
    }
  }

  /** Suma de los porcentajes de avances + cuestionarios del momento. */
  const sumaAvances = $derived(
    data.avances.reduce((s, av) => s + (av.peso || 0) + (av.cuestionario?.peso || 0), 0),
  );
  const pesoOk = $derived(sumaAvances === data.peso);

  /** Acción Svelte: auto-altura de un textarea al escribir. */
  function autoResize(node: HTMLTextAreaElement) {
    const resize = () => { node.style.height = 'auto'; node.style.height = node.scrollHeight + 'px'; };
    resize();
    node.addEventListener('input', resize);
    return { destroy: () => node.removeEventListener('input', resize) };
  }

  $effect(() => {
    data.curso.ultimoAvance =
      esUltimoMomento && data.avances.length > 0
        ? Math.max(...data.avances.map((a) => a.numero))
        : null;
  });

  function esUltimaSemana(s: Semana): boolean {
    const av = data.avances.find((a) => a.numero === s.avanceNumero);
    return !!av && s.numero === av.semanaFin;
  }

  /**
   * Creates a stable (non-reactive) onchange handler for a semana editor.
   * `semNumero` is a JS primitive — passed by value, not as a reactive signal —
   * so the returned closure always targets the correct semana regardless of
   * how Svelte's reactive context evolves after the {#key} block was created.
   */
  function makeHandler(semNumero: number, field: 'contenido' | 'parrafoEnvio') {
    return (v: import('@tiptap/core').JSONContent) => {
      const target = data.semanas.find((s) => s.numero === semNumero);
      if (target) {
        if (field === 'contenido') target.contenido = v;
        else target.parrafoEnvio = v;
      }
    };
  }

  const totalFilas = $derived(
    data.avances.reduce((n, av) => n + (av.cuestionario ? 2 : 1), 0),
  );

  const labelContenido = $derived(
    (() => {
      const etqs = data.avances.map((av) => etiquetaAvance(av.numero, data.curso));
      if (etqs.length <= 1) return etqs[0] ?? '';
      return `${etqs.slice(0, -1).join(', ')} y ${etqs[etqs.length - 1]}`;
    })(),
  );

  let html = $derived(exportMomento(data));

  async function copiar() {
    await navigator.clipboard.writeText(html);
    copied = true;
    setTimeout(() => (copied = false), 2500);
  }
</script>

<div class="mc-wrap">
  <!-- ── Panel de configuración ── -->
  <div class="mc-config">
    <button
      class="mc-config__toggle"
      onclick={() => (configOpen = !configOpen)}
      type="button"
    >
      ⚙ Configuración del curso
      <span class="mc-config__caret" class:open={configOpen}>▲</span>
    </button>

    {#if configOpen}
      <div class="mc-config__fields">
        <div class="mc-config__field">
          <span class="mc-config__label">Nombre del curso</span>
          <input
            bind:value={data.curso.nombre}
            placeholder="Estadística Descriptiva"
            style="min-width:190px"
          />
        </div>
        <div class="mc-config__field">
          <span class="mc-config__label">Base Moodle</span>
          <input
            bind:value={data.curso.moodleBase}
            style="min-width:230px"
          />
        </div>
        <label class="mc-config__check">
          <input type="checkbox" bind:checked={esUltimoMomento} />
          Último momento del curso
        </label>
      </div>
    {/if}
  </div>

  <!-- ── Canvas Moodle ── -->
  <div class="mc-canvas">
    <div class="mc-page">
      <div class="mc-page__title">Momento Evaluativo {data.momento}</div>

      <div class="mc-page__body">
        <!-- Nav vertical izquierda -->
        <nav class="mc-nav">
          <button
            class="mc-nav__item"
            class:active={tabActiva === 'resumen'}
            onclick={() => (tabActiva = 'resumen')}
            type="button"
          >
            <i class="mc-nav__icon">☑</i>
            RESUMEN DE ENTREGAS
          </button>

          <button
            class="mc-nav__item"
            class:active={tabActiva === 'descripcion'}
            onclick={() => (tabActiva = 'descripcion')}
            type="button"
          >
            <i class="mc-nav__icon">☰</i>
            DESCRIPCIÓN GENERAL
          </button>

          <button
            class="mc-nav__item"
            class:active={tabActiva === 'instrumento'}
            onclick={() => (tabActiva = 'instrumento')}
            type="button"
          >
            <i class="mc-nav__icon">✓</i>
            INSTRUMENTO DE EVALUACIÓN
          </button>

          <button
            class="mc-nav__item"
            class:active={tabActiva === 'enviar'}
            onclick={() => (tabActiva = 'enviar')}
            type="button"
          >
            <i class="mc-nav__icon">↗</i>
            INSTRUMENTO PARA ENVIAR ENTREGABLE
          </button>

          <button
            class="mc-nav__item"
            class:active={tabActiva === 'contenido'}
            onclick={() => (tabActiva = 'contenido')}
            type="button"
          >
            <i class="mc-nav__icon">✏</i>
            CONTENIDO DE LOS ENTREGABLES {labelContenido.toUpperCase()}
          </button>
        </nav>

        <!-- Panel de contenido -->
        <div class="mc-content">

          <!-- ── Resumen de Entregas ── -->
          {#if tabActiva === 'resumen'}
            <h4>Resumen de Entregas</h4>
            <div class="mc-table-wrap">
              <table class="mc-table">
                <thead>
                  <tr>
                    <th>Momento<br />Evaluativo</th>
                    <th>Duración<br />Semana</th>
                    <th style="min-width:220px; text-align:left">Entregable</th>
                    <th>Peso %</th>
                    <th>Semana<br />de Entrega</th>
                    <th class="mc-th-actions">acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {#each data.avances as av, i (av.numero)}
                    <!-- Fila principal del avance -->
                    <tr>
                      {#if i === 0}
                        <td rowspan={totalFilas} class="mc-table__center">
                          <div class="mc-momento-cell">
                            <input
                              class="mc-input mc-input--center"
                              bind:value={data.momento}
                              style="width:34px;font-size:1rem;font-weight:700"
                              title="Número del momento"
                            />
                            <div class="mc-momento-peso">
                              <input
                                class="mc-input mc-input--center mc-input--pct"
                                type="number"
                                bind:value={data.peso}
                                title="Peso total del momento %"
                              />%
                            </div>
                          </div>
                        </td>
                      {/if}

                      <!-- Duración semana: inicio auto-derivado para avances 2+ -->
                      <td rowspan={av.cuestionario ? 2 : 1} class="mc-table__center">
                        <div class="mc-duracion-cell">
                          {#if i === 0}
                            <input
                              class="mc-input mc-input--sm"
                              type="number"
                              bind:value={av.semanaInicio}
                              onchange={reconciliar}
                              min="1"
                              title="Semana inicio"
                            />
                          {:else}
                            <span class="mc-semana-derived" title="Calculado: semanaFin anterior + 1">
                              {av.semanaInicio || '?'}
                            </span>
                          {/if}
                          <span class="mc-duracion-sep">-</span>
                          <input
                            class="mc-input mc-input--sm"
                            type="number"
                            bind:value={av.semanaFin}
                            onchange={reconciliar}
                            min="1"
                            title="Semana fin"
                          />
                        </div>
                      </td>

                      <!-- Entregable: layout apilado para que el texto largo se vea completo -->
                      <td>
                        <div class="mc-ent-cell">
                          <div class="mc-ent-head">
                            <strong>{etiquetaAvance(av.numero, data.curso)}.</strong>
                            <input
                              class="mc-input mc-input--nombre"
                              bind:value={av.nombre}
                              placeholder="nombre del avance"
                            />
                          </div>
                          <textarea
                            class="mc-textarea"
                            bind:value={av.descripcion}
                            placeholder="descripción del entregable…"
                            use:autoResize
                          ></textarea>
                        </div>
                      </td>

                      <!-- Peso % -->
                      <td class="mc-table__center">
                        <div class="mc-duracion-cell">
                          <input
                            class="mc-input mc-input--center mc-input--pct"
                            type="number"
                            bind:value={av.peso}
                          />%
                        </div>
                      </td>

                      <!-- Semana de entrega (derivada de semanaFin) -->
                      <td
                        rowspan={av.cuestionario ? 2 : 1}
                        class="mc-table__center"
                        style="color:#555"
                      >
                        {av.semanaFin || '—'}
                      </td>

                      <!-- Acciones -->
                      <td rowspan={av.cuestionario ? 2 : 1} class="mc-td-actions">
                        {#if data.avances.length > 1}
                          <button
                            class="mc-btn-del"
                            onclick={() => removeAvance(i)}
                            type="button"
                            title="Quitar este avance"
                          >× quitar</button>
                        {/if}
                        <button
                          class="mc-btn-cuest"
                          class:active-cuest={!!av.cuestionario}
                          onclick={() => toggleCuestionario(av)}
                          type="button"
                        >{av.cuestionario ? '− cuest.' : '+ cuest.'}</button>
                      </td>
                    </tr>

                    <!-- Fila cuestionario (si existe) -->
                    {#if av.cuestionario}
                      <tr>
                        <td>
                          <div class="mc-ent-cell">
                            <div class="mc-ent-head">
                              <strong>Cuestionario de evaluación –</strong>
                              <input
                                class="mc-input mc-input--nombre"
                                bind:value={av.cuestionario.unidad}
                                placeholder="Unidad 1"
                              />
                            </div>
                            <textarea
                              class="mc-textarea"
                              bind:value={av.cuestionario.nombreUnidad}
                              placeholder="nombre de la unidad…"
                              use:autoResize
                            ></textarea>
                          </div>
                        </td>
                        <td class="mc-table__center">
                          <div class="mc-duracion-cell">
                            <input
                              class="mc-input mc-input--center mc-input--pct"
                              type="number"
                              bind:value={av.cuestionario.peso}
                            />%
                          </div>
                        </td>
                      </tr>
                    {/if}
                  {/each}

                  <!-- Fila añadir avance -->
                  <tr class="mc-add-row">
                    <td colspan="6">
                      <button class="mc-btn-add" onclick={addAvance} type="button">
                        + Añadir avance
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Aviso de porcentajes si no cuadran -->
            {#if !pesoOk}
              <div class="mc-peso-warn">
                ⚠ Los porcentajes suman <strong>{sumaAvances}%</strong> pero el momento vale
                <strong>{data.peso}%</strong>. Ajusta hasta que sean iguales.
              </div>
            {:else if data.avances.length > 0}
              <div class="mc-peso-ok">✓ Porcentajes correctos — suman {sumaAvances}%</div>
            {/if}

          <!-- ── Descripción General ── -->
          {:else if tabActiva === 'descripcion'}
            <h4>Descripción General</h4>
            <div class="mc-rich-wrap">
              <RichField
                bind:value={data.descripcionGeneral}
                placeholder="Párrafos de la tabla 'Entregables del avance N…' (SABER / SER / HACER)…"
              />
            </div>
            <h4 class="mc-sub-heading">Condiciones Particulares de Entrega</h4>
            <div class="mc-rich-wrap">
              <RichField
                bind:value={data.condicionesEntrega}
                placeholder="Condiciones específicas: formato del documento, estructura mínima, herramientas requeridas…"
              />
            </div>

          <!-- ── Instrumento de Evaluación ── -->
          {:else if tabActiva === 'instrumento'}
            <h4>Instrumento de Evaluación</h4>
            <div class="mc-rubrica-section">
              <div
                class="mc-btn-rubrica"
                class:sin-archivo={!data.rubricaArchivo}
              >
                📄 Rúbrica{data.rubricaArchivo ? ` — ${data.rubricaArchivo}` : ''}
              </div>
              <div class="mc-field-wrap">
                <span class="mc-field-label">Archivo de rúbrica</span>
                <input
                  class="mc-field-input"
                  bind:value={data.rubricaArchivo}
                  placeholder="RUBRICA_Momento_I.pdf"
                />
              </div>
            </div>

          <!-- ── Instrumento para Enviar Entregable ── -->
          {:else if tabActiva === 'enviar'}
            <h4>Instrumento para Enviar Entregable</h4>
            <div class="mc-enviar-list">
              {#each data.avances as av (av.numero)}
                <div class="mc-enviar-item">
                  <div class="mc-btn-send">
                    <span class="mc-spinner"></span>
                    {etiquetaAvance(av.numero, data.curso) === 'Producto Final'
                      ? 'Enviar Producto Final'
                      : `Enviar Entregable Avance ${av.numero}`}
                  </div>
                  <div class="mc-id-row">
                    <span class="mc-id-label">ID tarea Moodle (assign):</span>
                    <input
                      class="mc-id-input"
                      bind:value={av.idAssign}
                      placeholder="1001"
                    />
                  </div>
                </div>
              {/each}
            </div>

          <!-- ── Contenido de los Entregables ── -->
          {:else if tabActiva === 'contenido'}
            <h4>Contenido de los Entregables {labelContenido}</h4>
            {#if data.semanas.length === 0}
              <p class="mc-semanas-empty">
                Define los rangos de semana en "Resumen de Entregas" para ver las semanas aquí.
              </p>
            {:else}
              <div class="mc-weektabs">
                {#each data.semanas as s}
                  <button
                    class="mc-weektab"
                    class:active={semanaActiva === s.numero}
                    onclick={() => (semanaActiva = s.numero)}
                    type="button"
                  >
                    Semana {s.numero}
                    <small>{etiquetaAvance(s.avanceNumero, data.curso)}</small>
                  </button>
                {/each}
              </div>

              <!--
                {#key semanaActiva} fuerza un re-mount completo de TipTap cada
                vez que el usuario cambia de semana. La semana se busca por
                NÚMERO (semanaActiva), no por índice de array, así reconciliar()
                puede reordenar data.semanas sin afectar la selección activa.
              -->
              {#key semanaActiva}
                {@const sem = data.semanas.find((s) => s.numero === semanaActiva) ?? null}
                {#if sem}
                  <div class="mc-rich-wrap">
                    <RichField
                      value={sem.contenido}
                      onchange={makeHandler(semanaActiva, 'contenido')}
                      placeholder="Contenido de la semana: RED, actividades, recursos…"
                    />
                  </div>
                  {#if esUltimaSemana(sem)}
                    <div class="mc-week-envio">
                      <div class="mc-week-envio-label">Párrafo de envío</div>
                      <div class="mc-rich-wrap">
                        <RichField
                          value={sem.parrafoEnvio ?? null}
                          onchange={makeHandler(semanaActiva, 'parrafoEnvio')}
                          mode="single"
                          placeholder="Envíe el documento en las fechas establecidas."
                        />
                      </div>
                    </div>
                  {/if}
                {/if}
              {/key}
            {/if}
          {/if}

        </div>
      </div>
    </div>
  </div>

  <!-- ── Barra inferior ── -->
  <div class="mc-toolbar">
    <span class="mc-toolbar-hint">HTML listo para pegar en Moodle</span>
    <button
      class="mc-copy-btn"
      class:done={copied}
      onclick={copiar}
      type="button"
    >{copied ? '✓ Copiado' : 'Copiar HTML'}</button>
  </div>
</div>
