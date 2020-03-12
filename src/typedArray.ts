if (typeof getDistance === 'undefined') {
    var getDistance = function getDistance(a: point, b: point) {
        return Math.hypot(b.x - a.x, b.y - a.y)
    }
}
export type point = { x: number, y: number }

// Can be overriden ofcourse.
export const defaultNeighbours = [{x: -1, y: 0}, {x: 1, y: 0}, {x: 0, y: -1}, {x: 0, y: 1}];

const [floatToInt, intToFloat] = (dv => [
    num => {
        dv.setFloat32(0, num);
        return dv.getInt32(0);
    },
    num => {
        dv.setInt32(0, num);
        return dv.getFloat32(0);
    },
])(new DataView(new ArrayBuffer(8)));

console.log(floatToInt(1));

export function AStar_typedArray(begin: point, end: point, isWall: ((point: point) => boolean)): point[] {
    const size = 6;
    type node = point & { from?: node, h?: number, g?: number }

    // Append some crap to Uint16Arrays
    interface myTypedArray extends Uint32Array {
        filledTo?: number, // Something i use internally
        emtpy?: number[]
    }

    const write = ((field: myTypedArray, pos: number, ...what: number[]) => {
        const floored = (pos - (pos % size));
        what.forEach((e: number, i: number) => field[floored + i] = e);
    });

    const push = (field: myTypedArray, ...what: number[]) => {
        if (field.emtpy.length) {
            // reuse fields
            write(field, field.emtpy.pop(), ...what);
        } else if (field.filledTo + size >= field.length) {
            // full yet no

        } else {
            write(field, field.filledTo = field.filledTo | 0, ...what);
            const len = what.length;
            field.filledTo += (((len - (len % size))));
        }
    };

    const lowestField = (offset: number, field: myTypedArray): false | number => {
        let winner = Infinity, index = null;
        let to = field.filledTo - size;
        if (to < 0) to = 1;
        for (let i = 0, val; i < to; i += size) {
            val = field[i + offset];
            if (val < winner && field[i] && field[i] !== 0xFFFF) {
                winner = val;
                index = i;
            }
        }
        if (index === null) {
            console.log(field.filledTo);
            console.log(field.length);
            throw new Error('not found');
        }
        return index;
    };

    const zeroOut = (field: myTypedArray, offset: number) => {
        if (!field.hasOwnProperty('empty')) field.emtpy = [];
        field.emtpy.push(offset);
        write(field, offset, 0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF);
    };

    const findByCoord = (field: myTypedArray, x: number, y: number): number | false => {
        for (let i = 0, m = field.filledTo, val; i < m; i += size) {
            if (field[i] === x && field[i + 1] === y) {
                return i;
            }
        }
        return false;
    };

    const read = (field: myTypedArray, offset: number): myTypedArray => {
        return field.slice(offset, offset + size);
    };

    const lowestG = lowestField.bind(null, 2);
    const lowestH = lowestField.bind(null, 3);


    const open: myTypedArray = new Uint32Array(0xFFF);
    const closed: myTypedArray = new Uint32Array(0xFFFF);
    const closedBin = new Uint8Array(0xFFFFFF);
    // const openRef = new Uint8Array(0xFFFFFF);
    open.emtpy = [];
    closed.emtpy = [];

    push(open, ...[begin.x, begin.y,
        /*h*/floatToInt(getDistance(begin, end)),
        /*g*/floatToInt(0)
    ]);

    let currIndex: number;
    let loops = 0;
    while (true) {
        loops++;
        currIndex = lowestH(open);
        // const current = open.slice(currIndex,currIndex+ size);
        const current = read(open, currIndex);
        let g = intToFloat(current[2]);
        let h = intToFloat(current[3]);
        const [x, y, , , fromX, fromY] = current;

        zeroOut(open, currIndex);
        // register the fact this is closed now
        closedBin[(x << 8) + y] = 1;

        push(closed, x, y, g, h, fromX, fromY);
        if (x === end.x && y === end.y) {

            //ToDO; reserve engineer path
            let cur = [fromX, fromY], path: node[] = [{x, y}], last;
            while (true) {
                const found = findByCoord(closed, cur[0], cur[1]);
                if (typeof found !== 'number') break;
                let [x, y, , , fromX, fromY] = read(closed, found);
                path.push({x, y});
                cur = [fromX, fromY]
            }
            return path;
        }
        if (h === 0) {
            console.log('')
        }

        defaultNeighbours.forEach((nb) => {
            nb = {x: x + nb.x, y: y + nb.y};

            // If unreachable / already visited.
            if (isWall(nb) || closedBin[(nb.x << 8) + nb.y]) return;

            // If not listed, or this is a shorter path.
            const offset = findByCoord(open, nb.x, nb.y);
            if (!offset) {
                // new path, put it to the paths to check
                const lg = g + getDistance({x, y}, nb),
                    lh = getDistance(end, nb);

                push(
                    open,
                    nb.x,  // Our x
                    nb.y,  // y
                    floatToInt(lg), // g
                    floatToInt(lh), // h
                    x, // our parent
                    y
                );
            } else if (open[offset + 2] >= g) {
                open[offset + 2] = floatToInt(g + getDistance({x, y}, nb)); // Field g
                open[offset + 3] = floatToInt(getDistance(end, nb));          // field h
                open[offset + 4] = x;
                open[offset + 5] = y;
            }
        })
    }

    return [];
}