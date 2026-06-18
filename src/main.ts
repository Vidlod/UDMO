import { mount } from 'svelte';
import App from './App.svelte';
import './styles/app.css';
import './styles/editor.css';

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
