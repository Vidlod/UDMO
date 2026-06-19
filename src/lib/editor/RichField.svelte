<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor, type JSONContent } from '@tiptap/core';
  import { buildExtensions, type FieldMode } from './schema';

  let {
    value = $bindable(null),
    // Optional stable callback (used by semana editors to avoid reactive-binding
    // contamination). When provided, onUpdate writes via this instead of value=.
    // The parent must pass a stable closure — RichField captures it once at mount.
    onchange,
    mode = 'rich',
    placeholder = '',
  }: {
    value?: JSONContent | null;
    onchange?: (v: JSONContent) => void;
    mode?: FieldMode;
    placeholder?: string;
  } = $props();

  let element: HTMLDivElement;
  let wrapEl: HTMLDivElement;
  let editor: Editor | undefined;

  // Bubble menu state
  let bubbleVisible = $state(false);
  let bubbleX = $state(0);
  let bubbleY = $state(0);
  let bubbleIsBold = $state(false);
  let bubbleIsLink = $state(false);
  let showLinkInput = $state(false);
  let linkHref = $state('');
  let linkInputEl: HTMLInputElement | undefined = $state();

  function updateBubble() {
    if (!editor || !wrapEl) return;
    const { empty } = editor.state.selection;
    if (empty) {
      bubbleVisible = false;
      showLinkInput = false;
      return;
    }
    const { from, to } = editor.state.selection;
    const startCoords = editor.view.coordsAtPos(from);
    const endCoords = editor.view.coordsAtPos(to);
    const wrapRect = wrapEl.getBoundingClientRect();

    const midX = (startCoords.left + endCoords.left) / 2 - wrapRect.left;
    bubbleX = Math.round(Math.max(80, Math.min(wrapRect.width - 80, midX)));
    bubbleY = Math.round(startCoords.top - wrapRect.top - 44);

    bubbleIsBold = editor.isActive('bold');
    bubbleIsLink = editor.isActive('link');
    bubbleVisible = true;
  }

  onMount(() => {
    // Capture onchange once at mount time as a plain JS const — this breaks the
    // Svelte 5 reactive chain so the callback never writes to the wrong semana
    // even if the parent's reactive context updates before this block tears down.
    const stableOnchange = onchange;

    editor = new Editor({
      element,
      extensions: buildExtensions(mode, placeholder),
      content: value ?? undefined,
      onUpdate: ({ editor }) => {
        const json = editor.getJSON();
        if (stableOnchange) {
          stableOnchange(json);   // stable closure — always targets the right semana
        } else {
          value = json;           // bind:value path for non-semana fields
        }
      },
      onSelectionUpdate: () => updateBubble(),
      onBlur: () => {
        // Delay so bubble button clicks fire before the menu hides.
        setTimeout(() => { bubbleVisible = false; showLinkInput = false; }, 200);
      },
    });
  });

  onDestroy(() => editor?.destroy());

  // ── Bubble actions ──────────────────────────────────────────────────────────

  function toggleBold(e: MouseEvent) {
    e.preventDefault(); // keep editor focus
    editor?.chain().focus().toggleBold().run();
    updateBubble();
  }

  function openLinkInput(e: MouseEvent) {
    e.preventDefault();
    if (bubbleIsLink) {
      editor?.chain().focus().unsetLink().run();
      bubbleIsLink = false;
      showLinkInput = false;
    } else {
      showLinkInput = !showLinkInput;
      if (showLinkInput) {
        linkHref = '';
        setTimeout(() => linkInputEl?.focus(), 10);
      }
    }
  }

  function applyLink(e?: MouseEvent | KeyboardEvent) {
    e?.preventDefault();
    const url = linkHref.trim();
    if (url) {
      editor?.chain().focus()
        .setLink({ href: url, target: '_blank', rel: 'noopener' })
        .run();
    }
    showLinkInput = false;
    linkHref = '';
  }

  function onLinkKey(e: KeyboardEvent) {
    if (e.key === 'Enter') applyLink(e);
    if (e.key === 'Escape') { e.preventDefault(); showLinkInput = false; editor?.commands.focus(); }
  }

  // ── Citation insertion ──────────────────────────────────────────────────────
  // Inserts a GEO-formatted citation template (§5 reglas transversales):
  // <li>Autor (Año). Título.<br><strong><a href="URL">URL</a></strong>.</li>

  function insertCitation(e: MouseEvent) {
    e.preventDefault();
    editor?.chain().focus().insertContent([
      {
        type: 'bulletList',
        content: [{
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Autor (Año). Título de la fuente.' },
              { type: 'hardBreak' },
              {
                type: 'text',
                text: 'https://enlace.com',
                marks: [
                  { type: 'bold' },
                  { type: 'link', attrs: { href: 'https://enlace.com', target: '_blank', rel: 'noopener' } },
                ],
              },
              { type: 'text', text: '.' },
            ],
          }],
        }],
      },
    ]).run();
  }
</script>

<div class="richfield-wrap" bind:this={wrapEl}>
  {#if mode === 'rich'}
    <div class="rf-toolbar">
      <button class="rf-tool-btn" onmousedown={insertCitation} title="Insertar cita bibliográfica GEO">
        📚 Cita
      </button>
    </div>
  {/if}

  {#if bubbleVisible && mode === 'rich'}
    <div class="bubble-menu" style="left:{bubbleX}px; top:{bubbleY}px">
      <button
        class="bubble-btn"
        class:bubble-btn--active={bubbleIsBold}
        onmousedown={toggleBold}
        title="Negrita (Ctrl+B)"
      >
        <b>N</b>
      </button>
      <div class="bubble-sep"></div>
      <button
        class="bubble-btn"
        class:bubble-btn--active={bubbleIsLink}
        onmousedown={openLinkInput}
        title={bubbleIsLink ? 'Quitar enlace' : 'Agregar enlace'}
      >
        {bubbleIsLink ? '🔗✕' : '🔗'}
      </button>
      {#if showLinkInput}
        <input
          bind:this={linkInputEl}
          class="bubble-link-input"
          type="url"
          placeholder="https://..."
          bind:value={linkHref}
          onkeydown={onLinkKey}
        />
        <button class="bubble-btn bubble-btn--confirm" onmousedown={applyLink} title="Aplicar">✓</button>
      {/if}
    </div>
  {/if}

  <div class="richfield" bind:this={element}></div>
</div>
