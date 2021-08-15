import * as monaco from 'monaco-editor';
import * as React from "react";
import { DiffEditor, Monaco } from "@monaco-editor/react";
import { useCallback, useEffect, useState } from "react";
import { debounce } from "lodash";

const apiUrl = 'https://1p4eospzg9.execute-api.eu-west-2.amazonaws.com/default';

const defaultLeft = `import { redcr } from 'redcr';

interface StringState {
    str: string;
};

const reducer = redcr((state: StringState) => {
    state.str = 'new';
});
`;

export const Editor = () => {
    const [rightText, setRightText] = useState('');
    const [isFetching, setIsFetching] = useState(false);
    const [editor, setEditor] = useState<monaco.editor.IStandaloneDiffEditor | null>();

    const configureMonaco = (monaco: Monaco) => {
        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
            diagnosticCodesToIgnore: [2792] // Unknown imports
        });
    }

    const fetchCodeNow = useCallback(async (newSource: string) => {
        setIsFetching(true);

        const resp = await fetch(`${apiUrl}/convert?code=${encodeURIComponent(newSource)}`)
        if (resp.ok) {
            const text = await resp.text();
            setRightText(text);
            setIsFetching(false);
        }
    }, [setIsFetching, setRightText]);

    const fetchCode = useCallback(
        debounce(fetchCodeNow, 500), [fetchCodeNow]
    );

    useEffect(() => {
        fetchCodeNow(defaultLeft);
    }, []);

    const formatCode = () => {
        if (editor) {
            editor.getOriginalEditor().getAction('editor.action.formatDocument').run();
        }
    };

    return (
        <>
            <button onClick={formatCode}>Format</button>
            <DiffEditor
                height="90vh"
                originalLanguage="typescript"
                modifiedLanguage="javascript"
                original={defaultLeft}
                modified={rightText}
                options={{
                    originalEditable: true,
                    readOnly: true
                }}
                beforeMount={configureMonaco}
                onMount={editor => {
                    setEditor(editor);
                    editor.getOriginalEditor().onDidChangeModelContent(
                        () => fetchCode(editor.getOriginalEditor().getValue())
                    )
                }}
            />
            <div>{isFetching ? 'Fetching...' : ''}</div>
        </>
    );
}
