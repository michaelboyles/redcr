import * as React from "react";

const targets = [
    'ES2020', 'ES2019', 'ES2018', 'ES2017', 'ES2016', 'ES2015',
    'ES5', 'ES3'
] as const;
export type Target = typeof targets[number];

export interface Props {
    initialTarget: Target,
    onChange: (target: Target) => void
}

export const TargetSelect = (props: Props) => {
    return (
        <select onChange={e => props.onChange(e.target.value as Target)} defaultValue={props.initialTarget}>
            { targets.map(target => <option key={target}>{target}</option>)}
        </select>
    )
}
