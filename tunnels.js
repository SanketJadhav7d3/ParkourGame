
import * as THREE from 'three';
import * as CANNON from 'cannon';
import Building from './building.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

class Saw {
    constructor(scene, world, position, revolvingRadius) {
        this.scene = scene;
        this.world = world;

        const radiusTop = 20;
        const radiusBottom = 20;
        const height = 1;
        const numSegments = 20;
        const mass = 0;

        // create cylinder mesh
        const sawGeo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, numSegments);
        const sawMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff});

        this.sawMesh = new THREE.Mesh(sawGeo, sawMaterial);
        this.scene.add(this.sawMesh);

        this.sawMesh.position.set(position);

        // physics body
        const cannonShape = new CANNON.Cylinder(radiusTop, radiusBottom, height, numSegments);

        this.cannonBody = new CANNON.Body({ mass });
        this.cannonBody.addShape(cannonShape);

        const quat = new CANNON.Quaternion();
        quat.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
        this.cannonBody.quaternion = quat;

        this.cannonBody.position.set(position.x, position.y, position.z);
        this.world.addBody(this.cannonBody);

        this.sawMesh.userData.physicsBody = this.cannonBody;
        this.center = position;
        this.radius = 90;

        this.sawMesh.rotation.x = Math.PI / 2;

        this.angle = 0;
    }

    update() {
        this.sawMesh.rotation.y += 0.1;

        this.angle -= 0.04; // Adjust for faster or slower movement

        this.sawMesh.position.x = this.center.x + this.radius * Math.cos(this.angle);
        this.sawMesh.position.y = this.center.y + this.radius * Math.sin(this.angle);
        this.sawMesh.position.z = this.center.z;

        this.cannonBody.position.copy(this.sawMesh.position);

        this.cannonBody.quaternion.copy(this.sawMesh.quaternion);
    }
}

export default class Tunnel {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;

        const cylinderGeometry = new THREE.CylinderGeometry(100, 100, 1000, 32, 1, true);

        const cylinderMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });

        const cylinderMesh = new THREE.Mesh(cylinderGeometry, cylinderMaterial);

        cylinderMesh.position.set(500, -576, -1500);

        cylinderMesh.rotation.x = THREE.MathUtils.degToRad(65);

        cylinderMesh.material.transparent = true;
        cylinderMesh.material.opacity = 0;
        this.scene.add(cylinderMesh);

        const vertices = Array.from(cylinderGeometry.attributes.position.array);
        const indices  = Array.from(cylinderGeometry.index.array);

        const tubeShape = new CANNON.Trimesh(vertices, indices);
        const tubeBody  = new CANNON.Body({ mass: 0 });

        tubeBody.position.set(500, -576, -1500);

        const axis = new CANNON.Vec3(1, 0, 0); 
        tubeBody.quaternion.setFromAxisAngle(axis, THREE.MathUtils.degToRad(65));

        tubeBody.addShape(tubeShape);
        this.world.addBody(tubeBody);

        // Tornado cube
        const CUBE_COUNT = 7000;
        const CUBE_SIZE = 10;
        const RADIUS = 100;
        const HEIGHT = 1000;

        const cubeGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
        const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ffff });

        this.instancedMesh = new THREE.InstancedMesh(cubeGeometry, cubeMaterial, CUBE_COUNT);
        this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        cylinderMesh.add(this.instancedMesh);

        this.cubeStates = [];
        for (let i = 0; i < CUBE_COUNT; i++) {
            this.cubeStates.push({
                angle: Math.random() * Math.PI * 2,
                y: (Math.random() - 0.5) * HEIGHT,
                speed: 0.5 + Math.random() * 1.0, // radians/sec
                scale: 0.5 + Math.random() * 1.1
            });
        }

        this.dummy = new THREE.Object3D();

        // saws
        this.saw = new Saw(this.scene, this.world, cylinderMesh.position);
    }

    update(deltaTime) {
        const RADIUS = 100;
        const HEIGHT = 1000;
        const LIFT_SPEED = 50;

        for (let i = 0; i < this.cubeStates.length; i++) {
            const s = this.cubeStates[i];

            s.angle += s.speed * deltaTime;
            s.y += LIFT_SPEED * deltaTime;

            if (s.y > HEIGHT / 2) s.y -= HEIGHT;

            const x = RADIUS * Math.cos(s.angle);
            const z = RADIUS * Math.sin(s.angle);

            this.dummy.position.set(x, s.y, z);
            this.dummy.scale.set(s.scale, s.scale, s.scale); 
            this.dummy.rotation.y = s.angle;
            this.dummy.updateMatrix();

            this.instancedMesh.setMatrixAt(i, this.dummy.matrix);

        }

        this.instancedMesh.instanceMatrix.needsUpdate = true;

        if (this.boxHelper) {
            this.boxHelper.update();
        }

        this.saw.update();
    }
}