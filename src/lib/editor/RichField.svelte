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
      onUpdate: ({ editor }) => {
        value = editor.getJSON();
      },
    });
  });

  onDestroy(() => editor?.destroy());

  // Refleja cambios EXTERNOS del valor en el editor (p. ej. cargar un proyecto).
  // El guard por comparación evita el bucle con onUpdate.
  $effect(() => {
    const v = value;
    if (!editor) return;
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(v)) {
      editor.commands.setContent(v ?? '', false);
    }
  });
</script>

<div class="richfield" bind:this={element}></div>
