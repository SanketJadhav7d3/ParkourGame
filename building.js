
import * as THREE from 'three';
import * as CANNON from 'cannon';
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

class Building {

    constructors(scene, world, position, dimensions, materialProperties, physicsProperties) {
        this.height = dimensions.height;
        this.width = dimensions.width;
        this.depth = dimensions.depth;

        // PHYSICS REPRESENTATION
        // create collision shape
        this.shape = new CANNON.Box(new CANNON.Vec3(this.width / 2, this.height / 2, this.depth / 2));
        // create physics body
        this.body = new CANNON.Body({
            mass: physicsProperties.mass,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            material: physicsProperties.material
        });

        this.body.addShape(this.shape);
        world.add(this.body)

        // VISUAL REPRESENTATION
        this.geometery = new THREE.BoxGeometry(dimensions.height, dimensions.widht, dimensions.depth);
        this.material = new THREE.MeshStandardMaterial(materialProperties);

        this.mesh = new THREE.Mesh(this.geometery, this.material)
        this.mesh.position.set(position.x, position.y, position.z);
        scene.add(this.mesh);

        this.update = () => {
            this.mesh.position.copy(this.body.position);
            this.mesh.quaternion.copy(this.body.quaternion);
        }
    }
    
}