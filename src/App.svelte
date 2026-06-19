<script lang="ts">
  import type { SegmentKind } from './lib/segments/types';
  import type { JSONContent } from '@tiptap/core';
  import RichField from './lib/editor/RichField.svelte';
  import MomentoForm from './lib/segments/MomentoForm.svelte';
  import { richToHtml } from './lib/html/richToHtml';

  // 'momento2' es solo un alias de nav — no tiene SegmentData propio;
  // ambos momentos generan MomentoData (kind: 'momento').
  type NavKind = SegmentKind | 'momento2';
  type Vista = NavKind | 'demo';

  /** Segmentos disponibles. El formulario de cada uno llega en fases F2–F3. */
  const segmentos: { kind: NavKind; label: string; estado: string }[] = [
    { kind: 'momento',    label: 'Momento Evaluativo I',  estado: 'F2 — listo' },
    { kind: 'momento2',   label: 'Momento Evaluativo II', estado: 'F2 — listo' },
    { kind: 'entregable', label: 'Entregable / Avance',   estado: 'F3' },
    { kind: 'glosario',   label: 'Glosario',              estado: 'F3' },
    { kind: 'introduccion', label: 'Introducción al curso', estado: 'F3' },
    { kind: 'linea-tiempo', label: 'Línea de tiempo',      estado: 'F3' },
  ];

  let vista = $state<Vista>('demo');

  // Estado del editor de demostración (F1).
  let doc = $state<JSONContent | null>(null);
  let html = $derived(richToHtml(doc));
</script>

<header class="topbar">
  <h1>UDMO</h1>
  <span class="topbar__sub">Editor de estructuras Moodle · UDES / GEO</span>
</header>

<main class="shell">
  <nav class="segmentos">
    <button
      class="segmentos__item"
      class:active={vista === 'demo'}
      onclick={() => (vista = 'demo')}
    >
      <span>Editor (demo)</span>
      <small>F1 — listo</small>
    </button>

    <p class="segmentos__head">Segmentos</p>
    {#each segmentos as s}
      <button
        class="segmentos__item"
        class:active={vista === s.kind}
        onclick={() => (vista = s.kind)}
      >
        <span>{s.label}</span>
        <small>{s.estado}</small>
      </button>
    {/each}
  </nav>

  <section class="panel">
    {#if vista === 'demo'}
      <div class="demo">
        <h2>Editor restringido — prueba de atajos (F1)</h2>
        <p class="demo__hint">
          Escribe como normal. Atajos: <code>- </code> viñeta · <kbd>Tab</kbd>
          sub-viñeta · <code>1. </code> o <code>1) </code> numerada ·
          <code>**negrita**</code>. No se puede escribir HTML, cursiva ni saltos a
          mano: el esquema lo impide. Pega texto con formato y verás que se limpia solo.
        </p>

        <div class="demo__grid">
          <div>
            <p class="demo__label">Campo rico</p>
            <RichField bind:value={doc} placeholder="Escribe aquí el contenido…" />
          </div>
          <div>
            <p class="demo__label">HTML generado (limpio, sin &lt;br&gt; — eso lo pone F2)</p>
            <pre class="demo__out">{html || '—'}</pre>
          </div>
        </div>
      </div>
    {:else if vista === 'momento'}
      <MomentoForm />
    {:else if vista === 'momento2'}
      <!--
        Momento II: peso total 60%, avances a 20% c/u, "Último momento del curso"
        activo por defecto → el último avance se rotula "Producto Final".
      -->
      <MomentoForm momentoNum="II" pesoTotal={60} pesoAvance={20} lastMomento={true} />
    {:else}
      <div class="panel__placeholder">
        <h2>{segmentos.find((s) => s.kind === vista)?.label}</h2>
        <p>
          El formulario de este segmento se implementa en la fase F3.
          Revisa <code>REQUISITOS.md</code> §6 para su modelo de datos.
        </p>
      </div>
    {/if}
  </section>
</main>
