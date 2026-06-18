<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor, type JSONContent } from '@tiptap/core';
  import { buildExtensions, type FieldMode } from './schema';

  let {
    value = $bindable(null),
    mode = 'rich',
    placeholder = '',
  }: {
    value?: JSONContent | null;
    mode?: FieldMode;
    placeholder?: string;
  } = $props();

  let element: HTMLDivElement;
  let editor: Editor | undefined;

  onMount(() => {
    editor = new Editor({
      element,
      extensions: buildExtensions(mode, placeholder),
      content: value ?? undefined,
      // Enlace SOLO de salida (editor → value). NO empujamos value de vuelta al
      // editor: hacerlo en un $effect compite con las pulsaciones y reinicia el
      // documento/selección a media escritura, lo que rompía las input rules
      // (`- ` no creaba viñeta) y la edición en general. Para cargar un proyecto
      // (F4) se re-montará el componente con una `key`, no con setContent en vivo.
      onUpdate: ({ editor }) => {
        value = editor.getJSON();
      },
    });
  });

  onDestroy(() => editor?.destroy());
</script>

<div class="richfield" bind:this={element}></div>
