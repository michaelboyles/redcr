import * as React from "react";

import Editor, { Monaco } from "@monaco-editor/react";
import { useCallback, useState } from "react";
import { debounce } from "lodash";
import { SampleSelect } from './SampleSelect';
import { TargetSelect, Target } from './TargetSelect';

const apiUrl = 'https://bm5q7jmqm4.execute-api.eu-west-2.amazonaws.com/default';
const issueUrl = 'https://github.com/michaelboyles/redcr/issues/new?assignees=michaelboyles&labels=bug&template=bug_report.md&title=%5BBUG%5D+Enter+a+title';

export const Repl = () => {
    const [target, setTarget] = useState<Target>('ES2020');
    const [leftText, setLeftText] = useState('');
    const [rightText, setRightText] = useState('');
    const [isCompiling, setIsCompiling] = useState(false);

    const configureMonaco = (monaco: Monaco) => {
        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
            diagnosticCodesToIgnore: [2792] // Unknown imports
        });
    }

    const fetchCodeNow = useCallback(async (target: string, newSource: string) => {
        setIsCompiling(true);

        const resp = await fetch(`${apiUrl}/convert?target=${target}&code=${encodeURIComponent(newSource)}`)
        setIsCompiling(false);
        if (resp.ok) {
            const text = await resp.text();
            setRightText(text);
        }
    }, [setIsCompiling, setRightText]);

    const fetchCode = useCallback(
        debounce(fetchCodeNow, 500), [fetchCodeNow]
    );

    return (
        <div className='editors'>
            <div className='left editor'>
                <header>
                    <h2>Input - TypeScript</h2>
                    <SampleSelect onChange={sample => { setLeftText(sample.source); fetchCodeNow(target, sample.source); }} />
                </header>
                <Editor
                    value={leftText}
                    language="typescript"
                    beforeMount={configureMonaco}
                    options={{minimap: {enabled: false}}}
                    onMount={
                        editor => editor.onDidChangeModelContent(
                            () => fetchCode(target, editor.getValue())
                        )
                    }
                />
            </div>
            <div className='right editor'>
                <header>
                    <h2>Output - JavaScript {target}</h2>
                    <TargetSelect initialTarget={target} onChange={target => { setTarget(target); fetchCodeNow(target, leftText) } } />
                    <div className='report-issue'>Something look wrong? <a href={issueUrl}>Report an issue</a></div>
                </header>
                <Editor
                    value={rightText}
                    language="javascript"
                    options={{readOnly: true, minimap: {enabled: false}}}
                />
                {isCompiling ? <div className='loading'><div className='text'>Compiling...</div></div> : null}
            </div>
        </div>
    );
}
