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
        <>
            <label>Samples:</label>
            <select onChange={onChangeSelect}>
                { samples.map(sample => <option key={sample.name}>{sample.name}</option>)}
            </select>
        </>
    )
}

function getSamples(): Sample[] {
    const ctx = require.context('.', true, /\.sample\.ts$/);
    return ctx.keys().map(sample => ({
        name: userFriendlyName(sample),
        source: ctx(sample)
    }));
}

function userFriendlyName(str: string): string {
    str = str.substr(str.lastIndexOf('/') + 1);     // Remove directory
    str = str.substr(0, str.indexOf('.sample.ts')); // Remove extension
    str = str.replace('-', ' ');
    return str.charAt(0).toUpperCase() + str.substr(1).toLowerCase(); // Title case
}
