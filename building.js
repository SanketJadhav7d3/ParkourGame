
import * as THREE from 'three';
import * as CANNON from 'cannon';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';


export default class Building {
    constructor(scene, world, assetPath, position, cylinderCenter) {
        // loader
        this.fbxLoader = new FBXLoader();
        this.scene = scene;
        this.world = world;
        this.object = null;

        this.fbxLoader.load(
            assetPath,
            (object) => {
                // add building mesh 
                object.scale.multiplyScalar(0.5);
                object.position.set(position.x, position.y, position.z);
                // object.rotation.x = THREE.MathUtils.degToRad(55);

                const box = new THREE.Box3().setFromObject(object);
                const center = box.getCenter(new THREE.Vector3());
                const size = new THREE.Vector3();

                const worldCenter = center.clone();
                object.localToWorld(worldCenter);

                box.getSize(size);

                const cannonOffset = new CANNON.Vec3(
                    center.x - object.position.x,
                    center.y - object.position.y,
                    center.z - object.position.z
                );

                console.log(object);

                this.scene.add(object);
                // add physics body

                const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
                const boxShape = new CANNON.Box(halfExtents);

                const body = new CANNON.Body({ mass: 0 });
                body.addShape(boxShape, cannonOffset);

                // body.rotation.x = THREE.MathUtils.degToRad(55);
                body.position.set(position.x, position.y, position.z);
                this.world.addBody(body);
            }
        ); 
    }
    
}
