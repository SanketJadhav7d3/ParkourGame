
import * as THREE from 'three';
import * as CANNON from 'cannon';
import Building from './building.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';


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
        const CUBE_COUNT = 5000;
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

        // load blade
        this.fbxloader = new FBXLoader();
        this.sawBlade = null;

        this.fbxloader.load(
            'assets/sawblade.fbx',
            (object) => {

                const box = new THREE.Box3().setFromObject(object);
                const center = box.getCenter(new THREE.Vector3());

                object.position.copy(cylinderMesh.position);
                object.rotation.y = THREE.MathUtils.degToRad(90)

                const pivot = new THREE.Object3D();
                scene.add(pivot);

                pivot.add(object);

                object.position.sub(center);

                this.scene.add(object);
                this.sawBlade = pivot;

                console.log(pivot);
            }
        );


    }

    update(deltaTime) {
        const RADIUS = 100;
        const HEIGHT = 1000;
        const LIFT_SPEED = 50;

        for (let i = 0; i < this.cubeStates.length; i++) {
            const s = this.cubeStates[i];
            s.angle += s.speed * deltaTime;
            s.y += LIFT_SPEED * deltaTime;
            if (s.y > HEIGHT / 2) s.y = -HEIGHT / 2;

            const x = RADIUS * Math.cos(s.angle);
            const z = RADIUS * Math.sin(s.angle);

            this.dummy.position.set(x, s.y, z);
            this.dummy.scale.set(s.scale, s.scale, s.scale); 
            this.dummy.rotation.y = s.angle;
            this.dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
        }

        this.instancedMesh.instanceMatrix.needsUpdate = true;

        if (this.sawBlade) {
            const axis = new THREE.Vector3(1, 0, 0);
            this.sawBlade.rotateOnAxis(axis, THREE.MathUtils.degToRad(1));
        }
    }
}