import * as monaco from 'monaco-editor';
import * as React from "react";

import Editor, { Monaco } from "@monaco-editor/react";
import { useCallback, useState } from "react";
import { debounce } from "lodash";
import { SampleSelect } from './SampleSelect';
import { TargetSelect, Target } from './TargetSelect';

const apiUrl = 'https://f5dvdbmccb.execute-api.eu-west-2.amazonaws.com/default';

export const Repl = () => {
    const [target, setTarget] = useState<Target>('ES2020');
    const [leftText, setLeftText] = useState('');
    const [rightText, setRightText] = useState('');
    const [isFetching, setIsFetching] = useState(false);
    const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>();

    const configureMonaco = (monaco: Monaco) => {
        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
            diagnosticCodesToIgnore: [2792] // Unknown imports
        });
    }

    const fetchCodeNow = useCallback(async (target: string, newSource: string) => {
        setIsFetching(true);

        const resp = await fetch(`${apiUrl}/convert?target=${target}&code=${encodeURIComponent(newSource)}`)
        setIsFetching(false);
        if (resp.ok) {
            const text = await resp.text();
            setRightText(text);
        }
    }, [setIsFetching, setRightText]);

    const fetchCode = useCallback(
        debounce(fetchCodeNow, 500), [fetchCodeNow]
    );

    const formatCode = () => {
        if (editor) {
            editor.getAction('editor.action.formatDocument').run();
        }
    };

    return (
        <>
            <TargetSelect initialTarget={target} onChange={target => { setTarget(target); fetchCodeNow(target, leftText) } } />
            <SampleSelect onChange={sample => { setLeftText(sample.source); fetchCodeNow(target, sample.source); }} />
            <button onClick={formatCode}>Format</button>
            
            <div className='editors'>
                <Editor
                    value={leftText}
                    height="100%"
                    width="50%"
                    language="typescript"
                    beforeMount={configureMonaco}
                    options={{minimap: {enabled: false}}}
                    onMount={editor => {
                        setEditor(editor);
                        editor.onDidChangeModelContent(
                            () => fetchCode(target, editor.getValue())
                        );
                    }}
                />
                <Editor
                    value={rightText}
                    height="100%"
                    width="50%"
                    language="javascript"
                    options={{readOnly: true, minimap: {enabled: false}}}
                />
            </div>
        
            <div>{isFetching ? 'Fetching...' : ''}</div>
        </>
    );
}
