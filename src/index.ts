export type Reducer<T, U> = ((state: T) => void) | ((state: T, action: U) => void);

export function redcr<R extends Reducer<any, any>>(reducer: R): R {
    console.error("redcr is supposed to be removed at compile time. If you can see this message then it wasn't");
    return reducer;
}
