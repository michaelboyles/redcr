export function redcr<T>(reducer: (state: T) => void) {
    console.error("redcr is supposed to be removed at compile time. If you can see this message then it wasn't");
    return reducer;
}