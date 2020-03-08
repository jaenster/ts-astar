import {AStar} from '../src';
import {expect} from 'chai';

describe('astar', function () {

    it('straight line (array)', function () {
        // const path = AStar({x:100,y:100},{x:50,y:50},(point) => false);
        const path = AStar({x:50,y:50},{x:1000,y:1000},(point) => false);

        expect(path.length).equal(1900);
    });

});