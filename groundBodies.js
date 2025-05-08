
import * as CANNON from 'cannon';


class GroundBodies {
    constructor() {
        if (GroundBodies.instance) {
            return GroundBodies.instance;
        }

        this.bodies = [];
        GroundBodies.instance = this;
    }

    addGroundBody(body) {
        this.bodies.push(body)
    }

    removeGroundBody(body) {
    }
}

const groundBodies = Object.freeze(new GroundBodies());
export default groundBodies;
