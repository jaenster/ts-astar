if (typeof getDistance === 'undefined') {
    var getDistance = function getDistance(a: point, b: point) {
        return Math.hypot(b.x - a.x, b.y - a.y)
    }
}
export type point = { x: number, y: number }

// Can be overriden ofcourse.
export const defaultNeighbours = [{x: -1, y: 0}, {x: 1, y: 0}, {x: 0, y: -1}, {x: 0, y: 1}];

export function AStar(begin: point, end: point, isWall: ((point: point) => boolean)): point[] {
    type node = point & { from?: node, h?: number, g?: number}

    const toDo: node[] = [];
    const done: node[] = [];

    toDo.push({
        ...begin,
        h: getDistance(begin, end),
        g: 0,
    });

    let current: node;
    while (toDo.length) {

        current = toDo.sort((a: node, b: node) => (b.h - a.h)).pop();
        done.push(current);

        if (current.x === end.x && current.y === end.y) {
            // Found a path, track which path we walked
            let cur = current.from, path: node[] = [{x: cur.x, y: cur.y}];
            while (cur.from) {
                path.push({x: cur.x, y: cur.y});
                cur = cur.from
            }
            return path;
        }


        defaultNeighbours.forEach((nb) => {
            nb = {x: current.x + nb.x, y: current.y + nb.y};

            // If unreachable / already visited. ToDo; work around this find
            if (isWall(nb) || done.find(el => el.x === nb.x && el.y === nb.y)) return;

            // If not listed, or this is a shorter path. ToDo; work around this find
            const original = toDo.find(el => el.x === nb.x && el.y === nb.y);

            if (!original) {
                // New node, add it to the pile
                toDo.push({
                    ...nb,
                    from: current,
                    g: current.g + getDistance(current, nb),
                    h: getDistance(end, nb),
                });
            } else if (original.g >= current.g) {
                original.g = current.g + getDistance(current, nb);
                original.h = getDistance(end, nb);
            }
        });
    }

    return [];
}
