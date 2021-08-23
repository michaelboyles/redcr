import * as React from "react";
import { ChangeEvent, useEffect, useMemo } from "react";

export interface Sample {
    name: string,
    source: string
}

export interface Props {
    onChange: (sample: Sample) => void
}

export const SampleSelect = (props: Props) => {
    const samples = useMemo(() => getSamples(), []);

    useEffect(() => {
        props.onChange(samples[0]);
    }, []);

    const onChangeSelect = (e: ChangeEvent<HTMLSelectElement>) => { 
        const sample = samples.find(sample => sample.name === e.target.value);
        props.onChange(sample);
    };

    return (
        <select onChange={onChangeSelect}>
            { samples.map(sample => <option key={sample.name}>{sample.name}</option>)}
        </select>
    )
}

function getSamples(): Sample[] {
    const ctx = require.context('.', true, /\.sample\.ts$/);
    return ctx.keys().map(sample => ({
        name: sample,
        source: ctx(sample)
    }));
}
