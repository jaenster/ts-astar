if (typeof getDistance === 'undefined') {
    var getDistance = function getDistance(a: point, b: point) {
        return Math.hypot(b.x - a.x, b.y - a.y)
    }
}
export type point = { x: number, y: number }

// Can be overriden ofcourse.
export const defaultNeighbours = [{x: -1, y: 0}, {x: 1, y: 0}, {x: 0, y: -1}, {x: 0, y: 1}];

class myDataView extends Uint32Array {
    public readonly innerBuffer: ArrayBufferLike;
    public readonly size: number;
    public readonly emptyTrack: number[];
    public lowestH: null | number;
    public filledTo: number;
    public total: number;

    constructor(props: number = 0xFFFFF, size = 4) {
        super(props);
        this.size = size;
        this.emptyTrack = [];
        this.lowestH = null;
        this.filledTo = 0;
        this.total = 0;
    }

    write(pos: number, ...what: number[]) {
        const floored = (pos - (pos % this.size));
        what.forEach((e: number, index: number) => this[floored + index] = e);
        return floored;
    }

    push(...what: number[]) {
        const empty = this.emptyTrack;
        const max = this.length;
        const filledTo = this.filledTo;
        const inf = floatToInt(Infinity);

        // Remove an item that is above avg size
        if (filledTo + this.size >= max && !empty.length) {
            let avg = this.total / (this.length / 4);
            if (isNaN(avg)) { // Sometimes its impossible to keep track of all values
                this.total = 0;
                for(let i = 0;i<this.length;i+=4) !this.emptyTrack.includes(i) && (this.total += floatToInt(this[i+3]||0));
            }
            for (let i = 0; i < max; i += this.size) {
                const val = intToFloat(this[i + 3]);
                if (val > avg && !this.emptyTrack.includes(i) ) {
                    empty.push(i);
                    // Remove this h from the total counter
                    this.total -= intToFloat(this[i + 3] || 0);
                    this[i+3] = inf;
                }
                if (this.emptyTrack.length > 30) {
                    break;
                }
            }
            if (!empty.length) {
                throw new Error('No more space');
            }
        }

        if (!empty.length) {
            const val = this.write(filledTo, ...what);
            const len = what.length;
            this.filledTo += (((len - (len % this.size))));
            return val;
        }

        // Reuse a field
        return this.write(empty.pop(), ...what);
    };

    calculateLowestH() {
        // If we already know which is the lowest
        if (this.lowestH !== null) {
            const tmp = this.lowestH;
            this.lowestH = null;
            return tmp;
        }
        const filledTo = this.filledTo;
        let winner = -1, increase = this.size;
        for (let i = 0, val, lowest = Infinity, e = this.emptyTrack.includes.bind(this.emptyTrack), l = this.emptyTrack.length; i < filledTo; i += increase) {
            val = intToFloat(this[i + 3]);
            if (val < lowest && (!l || !e(i))) {
                lowest = val;
                winner = i;
            }
        }
        return winner;
    }

    read(pos: number) {
        const size = this.size,
            floored = (pos - (pos % size)),
            ret = [];
        for (let i = 0; i < size; i++) ret[i] = this[floored + i];
        return ret;
    }
}

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

export function AStar_typedArray(begin: point, end: point, isWall: ((point: point) => boolean)): point[] {

    const open = new myDataView(0x7FFFF, 4);
    const closed = new myDataView(0x7FFFFF, 4);

    const closedBin = new Map();
    const openBin = new Map();
    const fromBin = new Map();

    open.push(
        begin.x,
        begin.y,
        getDistance(begin, end),
        0
    );

    let loops = 0;
    while (++loops) {
        const currentWinner = open.calculateLowestH();
        const current = open.read(currentWinner);
        current[2] = intToFloat(current[2]);
        current[3] = intToFloat(current[3]);
        const [x, y, g, h] = current;


        if (loops % 100 === 0) {
        }
        const key = (x << 16) + y;

        if (end.x === x && end.y === y) {
            let ret = [], [px, py] = [x, y], parent;
            while (parent = fromBin[px + ',' + py]) {
                ret.push([px, py] = parent);
                if (begin.x===px && begin.y === py ) break;
            }
            return ret;
        }

        // avg calculation
        open.emptyTrack.push(currentWinner); // This field can be reused again
        open.total -= g||0; // Total is now without g.

        // open / close maps
        openBin.delete([key]);
        closedBin[key] = closed.push(x, y, g, h);

        // Todo check if we are at the end
        defaultNeighbours.forEach((nb) => {
            const {x: nx, y: ny} = nb = {x: x + nb.x, y: y + nb.y};
            const nkey = (nx << 16) + ny;

            if (isWall(nb) || closedBin[nkey]) return;

            let checkLowest = false;
            // if not known yet, lets add it
            let ng, nh, offset;
            if (!openBin.has(nkey)) {
                openBin[nkey] = offset = open.push(nx, ny,
                    floatToInt(g + getDistance({x, y}, nb)),
                    floatToInt(nh = getDistance(end, nb))
                );
                open.total += nh;
                fromBin[nx + ',' + ny] = [x, y];
            } else {
                // its known, but is it a shorter path to this node as we know?
                offset = openBin[nkey];

                if (open[offset + 2] >= g) {
                    open[offset + 2] = floatToInt(g + getDistance({x, y}, nb));
                    open.total -= intToFloat(open[offset + 3]);
                    open[offset + 3] = floatToInt(nh = getDistance(end, nb));
                    open.total += nh;
                    fromBin[nx + ',' + ny] = [x, y];
                }
            }

            // If we calculated the ng
            // if (typeof nh !== 'undefined') {
            //     //check if its lower as current
            //     const check1 = (open.lowestH === null) && nh < h;
            //     const check2 = open.lowestH !== null && open.read(open.lowestH)[2] > nh;
            //     if ((open.lowestH === null && nh < h) || (open.lowestH !== null && open.read(open.lowestH)[2] > nh)) {
            //         open.lowestH = offset; // and if so, store that as the lowest g
            //     }
            // }
        });
    }

    return [{x: 1, y: 1}];
}