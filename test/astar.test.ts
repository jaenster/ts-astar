import {AStar} from '../src';
import {expect} from 'chai';
import {AStar_typedArray} from "../src/typedArray";

const timer = function (name) {
    var start = new Date();
    return {
        stop: function () {
            var end = new Date();
            var time = end.getTime() - start.getTime();
            console.log('Timer:', name, 'finished in', time, 'ms');
        }
    }
};

const astarArray = (id) => {
    it('straight line (array) 50 -> '+id, function() {
        const path = AStar({x: 50, y: 50}, {x: id, y: id}, (point) => false);

        expect(!!path.length).equal(true);
    })
};
const astarTyped = (id) => {
    it('straight line (typed) 50 -> '+id, function () {
        const path = AStar_typedArray({x: 50, y: 50}, {x: id, y: id}, (point) => false);

        expect(!!path.length).equal(true);
    })
};


describe('astar', function () {
    const to = 150;

    astarArray(220);
    astarTyped(220);

    for(let i = 60;i<250;i+=10) {
        astarArray(i);
        astarTyped(i);
    }

});