import { h, render } from 'preact';
import { useState } from 'preact/hooks';
import App from './components/App.jsx';
import './style.css';

render(<App />, document.getElementById('app'));
