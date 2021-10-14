import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Repl } from './Repl';

import './style.scss';

const container = document.getElementById('root');

const redcrUrl = 'https://github.com/michaelboyles/redcr';
const reduxUrl = 'https://redux.js.org/tutorials/fundamentals/part-3-state-actions-reducers';

ReactDOM.render(
    <>
        <p className='help'>
            This is an online REPL for <a href={redcrUrl}>Redcr</a> which aims to simplify writing <a href={reduxUrl}>Redux reducers</a>.
            Reducers need to create a new immutable copy of the state. Try writing a reducer on the left using normal mutable operations,
            or select one of the samples. It will be compiled to an immutable version on the right.
        </p>
        <Repl />
    </>    
, container);
