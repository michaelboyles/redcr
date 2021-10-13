import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Repl } from './Repl';

import './style.scss';

const container = document.getElementById('root');

ReactDOM.render(<Repl />, container);
