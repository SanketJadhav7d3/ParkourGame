
import * as THREE from 'three';
import * as CANNON from 'cannon';

export default class Tunnel {

    constructor(scene, world) {
        this.scene = scene;
        this.world = world;

        const cylinderGeometry = new THREE.CylinderGeometry(100, 100, 500, 32);

        const cylinderMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });

        const cylinderMesh = new THREE.Mesh(cylinderGeometry, cylinderMaterial);

        cylinderMesh.position.set(500, -576, -1500);

        cylinderMesh.rotation.x = THREE.MathUtils.degToRad(55);

        this.scene.add(cylinderMesh);

        const radialSegments = 32;
        const heightSegments = 32;
        const geometryParams = cylinderMesh.geometry.parameters;
        const radius = geometryParams.radiusTop;
        const height = geometryParams.height;

        console.log(radius, height);

        for (let i = 0; i < heightSegments; i++) {
            const localY = (-height / 2) + (height * i) / (heightSegments - 1);

            for (let j = 0; j < radialSegments; j++) {
                const angle = (j / radialSegments) * Math.PI * 2;

                const localX = radius * Math.cos(angle);
                const localZ = radius * Math.sin(angle);
                const localPosition = new THREE.Vector3(localX, localY, localZ)

                const worldPosition = cylinderMesh.localToWorld(localPosition.clone());

                const shape = new CANNON.Sphere(7.5);  // Example shape for the Cannon body
                const body = new CANNON.Body({ mass: 0 });
                body.addShape(shape);
                body.position.set(worldPosition.x, worldPosition.y, worldPosition.z);


                this.world.addBody(body);

            }
        }


    }

}