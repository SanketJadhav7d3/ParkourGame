
import * as THREE from 'three';
import * as CANNON from 'cannon';
import Building from './building.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import zoneManager from './zoneManager.js';


class Saw {

    constructor(scene, world, tunnelMesh, positionY) {
        this.scene = scene;
        this.world = world;
        this.positionY = positionY;

        const radiusTop = 30;
        const radiusBottom = 30;
        const height = 1;
        const numSegments = 20;
        const mass = 0;

        // create cylinder mesh
        const sawGeo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, numSegments);
        const sawMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff});

        this.sawMesh = new THREE.Mesh(sawGeo, sawMaterial);
        this.scene.add(this.sawMesh);


        tunnelMesh.add(this.sawMesh);

        this.sawMesh.position.y += positionY;

        // physics body
        const cannonShape = new CANNON.Cylinder(radiusTop, radiusBottom, height, numSegments / 2);

        this.cannonBody = new CANNON.Body({ mass });
        this.cannonBody.addShape(cannonShape);

        const quat = new CANNON.Quaternion();
        quat.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
        this.cannonBody.quaternion = quat;

        // this.cannonBody.position.set(position.x, position.y, position.z);
        this.world.addBody(this.cannonBody);

        this.sawMesh.userData.physicsBody = this.cannonBody;
        this.radius = 70;

        // this.sawMesh.rotation.x = Math.PI / 2;

        this.angle = Math.random() * Math.PI * 2;
    }

    update() {
        this.sawMesh.rotation.y += 0.4;

        this.angle += 0.04; // Adjust for faster or slower movement

        this.sawMesh.position.x = this.radius * Math.cos(this.angle);
        this.sawMesh.position.z = this.radius * Math.sin(this.angle);

        const meshWorldCoordinates = new THREE.Vector3();

        this.sawMesh.localToWorld(meshWorldCoordinates);

        this.cannonBody.position.copy(meshWorldCoordinates);

        const worldPosition = new THREE.Vector3();
        const worldQuaternion = new THREE.Quaternion();
        const worldScale = new THREE.Vector3();

        // Decompose the world matrix
        this.sawMesh.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale)

        this.cannonBody.quaternion.copy(worldQuaternion);
    }

    delete() {
        this.scene.remove(this.sawMesh);
        this.world.remove(this.cannonBody);

        return [this.scene, this.world, this.tunnelMesh, this.positionY]
    }

    static init(scene, world, tunnelMesh, positionY) {
        return new Saw(scene, world, tunnelMesh, positionY);
    }

    reset() {
        const properties = this.delete();

        return Saw.init(...properties);
    }
}

export default class Tunnel {

    constructor(scene, world) {
        this.scene = scene;
        this.world = world;

        const cylinderGeometry = new THREE.CylinderGeometry(100, 100, 1000, 32, 1, true);

        const cylinderMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });

        this.cylinderMesh = new THREE.Mesh(cylinderGeometry, cylinderMaterial);

        this.meshPosition = new THREE.Vector3(500, 700, -750);

        this.cylinderMesh.position.set(
            this.meshPosition.x,
            this.meshPosition.y,
            this.meshPosition.z
        );

        this.cylinderMesh.rotation.x = THREE.MathUtils.degToRad(0);

        this.cylinderMesh.material.transparent = true;
        this.cylinderMesh.material.opacity = 0;

        this.scene.add(this.cylinderMesh);

        // add mesh to zoneManager
        zoneManager.createZoneForMesh('tunnelZone', this.cylinderMesh);


        const vertices = Array.from(cylinderGeometry.attributes.position.array);
        const indices  = Array.from(cylinderGeometry.index.array);

        const tubeShape = new CANNON.Trimesh(vertices, indices);
        this.tubeBody  = new CANNON.Body({ mass: 0 });

        this.tubeBody.position.set(
            this.meshPosition.x,
            this.meshPosition.y,
            this.meshPosition.z
        );

        const axis = new CANNON.Vec3(1, 0, 0); 
        this.tubeBody.quaternion.setFromAxisAngle(axis, THREE.MathUtils.degToRad(0));

        this.tubeBody.addShape(tubeShape);
        this.world.addBody(this.tubeBody);

        // Tornado cube
        const CUBE_COUNT = 7000;
        const CUBE_SIZE = 10;
        const RADIUS = 100;
        const HEIGHT = 1000;

        const cubeGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
        const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ffff });

        this.instancedMesh = new THREE.InstancedMesh(cubeGeometry, cubeMaterial, CUBE_COUNT);
        this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        this.cylinderMesh.add(this.instancedMesh);

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
        this.saws = []

        for (let i = -HEIGHT / 2; i < HEIGHT / 2; i+=100)
            this.saws.push(new Saw(this.scene, this.world, this.cylinderMesh, i));
    }

    update(deltaTime) {
        const RADIUS = 100;
        const HEIGHT = 1000;
        const LIFT_SPEED = 100;

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

        this.saws.forEach((saw) => {
            saw.update();
        });
    }

    delete() {
        this.scene.remove(this.cylinderMesh);

        this.world.remove(this.tubeBody);

        return [this.scene, this.world];
    }

    static init(scene, world) {
        return new Tunnel(scene, world);
    }

    reset() {
        this.delete()
        return Tunnel.init()
    }
}