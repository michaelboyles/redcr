import { DiffEditor, Monaco } from "@monaco-editor/react";
import * as React from "react";
import { useCallback, useState } from "react";
import { debounce } from "lodash";

const defaultLeft = `import { redcr } from 'redcr';

interface StringState {
    str: string;
};

const reducer = redcr((state: StringState) => {
    state.str = 'new';
});
`;

export const Editor = () => {
    const [rightText, setRightText] = useState(defaultLeft);
    const [isFetching, setIsFetching] = useState(false);

    const configureMonaco = (monaco: Monaco) => {
        // TODO Supposed to suppress the warning but doesn't
        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
            diagnosticCodesToIgnore: [2792] // Unknown imports
        });
    }
    
    const doUpdate = useCallback(
        debounce(async (newSource: string) => {
            setIsFetching(true);

            const resp = await fetch(`https://kcerramqp1.execute-api.eu-west-2.amazonaws.com/default/convert?code=${encodeURIComponent(newSource)}`)
            if (resp.ok) {
                const text = await resp.text();
                setRightText(text);
                setIsFetching(false);
            }
        }, 500),
        [setRightText]
    );

    return (
        <>
            <DiffEditor
                height="90vh"
                language="typescript"
                original={defaultLeft}
                modified={rightText}
                options={{
                    originalEditable: true,
                    readOnly: true
                }}
                beforeMount={configureMonaco}
                onMount={(editor) => {
                    editor.getOriginalEditor().onDidChangeModelContent(
                        () => doUpdate(editor.getOriginalEditor().getValue())
                    )
                }}
            />
            <div>{isFetching ? 'Fetching...' : ''}</div>
        </>
    );
}
