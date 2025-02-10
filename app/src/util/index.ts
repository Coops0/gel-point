export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
export const lerp = (a: number, b: number, alpha: number) => a + alpha * (b - a);
export const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

export const centerOfCells = (cells: Array<[number, number]>, [rows, cols]: [number, number]): [number, number] => {
    const cell = cells
        .reduce(([x1, y1], [x2, y2]) => [x1 + x2, y1 + y2], <[number, number]>[0, 0])
        .map(num => Math.floor(num / cells.length)) as [number, number];

    // error correction, if outside bounds then move back in
    cell[0] = clamp(cell[0], 0, rows - 1);
    cell[1] = clamp(cell[1], 0, cols - 1);

    return cell;
};

export const ratioToCenterOfCells = (cells: Array<[number, number]>, [rows, cols]: [number, number]): [number, number] => {
    const centerCell = cells
        .reduce(([x1, y1], [x2, y2]) => [x1 + x2, y1 + y2], <[number, number]>[0, 0]);

    centerCell[0] /= (rows * cells.length);
    centerCell[1] /= (cols * cells.length);

    return centerCell;
};