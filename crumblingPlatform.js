
import * as THREE from 'three';
import * as CANNON from 'cannon';
import zoneManager from './zoneManager.js';
import groundBodies from './groundBodies.js';
import materialManager from './materialManager.js';


class CrumblingPlatform {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;

        this.tiles = [];
        this.tileBodies = [];

        const ROWS = 20;
        const COLS = 20;

        this.TILE_SIZE = 300;
        this.TILE_HEIGHT = 10.2;

        const tileGeo = new THREE.BoxGeometry(this.TILE_SIZE, this.TILE_HEIGHT, this.TILE_SIZE);
        const tileMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

        const position = new THREE.Vector3(1700, 2100, -4000);

        // tiles group
        this.tilesGroup = new THREE.Group();

        for (let i = 0; i < ROWS; i++) {
            for (let j = 0; j < COLS; j++) {
                const mesh = new THREE.Mesh(tileGeo, tileMat);

                mesh.position.set(
                    position.x + ((j - COLS / 2) * this.TILE_SIZE + this.TILE_SIZE / 2),
                    position.y + (-this.TILE_HEIGHT / 2),
                    position.z + ((i - ROWS / 2) * this.TILE_SIZE + this.TILE_SIZE / 2)
                );

                this.tilesGroup.add(mesh);

                this.tiles.push(mesh);
            }
        }

        this.scene.add(this.tilesGroup);
        // create zone for crumbling platform

        const clonedMesh = this.tilesGroup.clone();

        clonedMesh.scale.y *= 1.5;

        zoneManager.createZoneForMesh('crumblingPlatformZone', this.tilesGroup);

        const boxHelper = new THREE.Box3Helper(zoneManager.getZoneByName('crumblingPlatformZone'), 0xffff00); // Yellow color for the helper.
        this.scene.add(boxHelper);

        this.hasPhysicsBodies = false;
        

        // create material
        // materialManager.createContactMaterial('tileMaterial');

        // create contact material
        //const tileContactMaterial = materialManager.createContactMaterial('tileMaterial', 'tileMaterial', {
            //friction: 0.1,   // Low friction for sliding behavior
            //restitution: 0.0
        //});

        // this.world.addContactMaterial(tileContactMaterial);
    }

    addPhysicsBodies() {
        const boxShape = new CANNON.Box(new CANNON.Vec3(this.TILE_SIZE / 2, this.TILE_HEIGHT / 2, this.TILE_SIZE / 2)); 


        this.tiles.forEach((tile) => {
            const body = new CANNON.Body({ mass: 0, shape: boxShape });
            body.position.copy(tile.position);
            body.hasFallen = false;
            this.world.addBody(body);
            this.tileBodies.push(body);
            groundBodies.addGroundBody(body);
        });

        this.hasPhysicsBodies = true;
    }

    update(delta, playerBody) {
        // use raycast to get tile beneath the player
        

        const from = new CANNON.Vec3(
            playerBody.position.x,
            playerBody.position.y + 4,
            playerBody.position.z
        );

        const to = new CANNON.Vec3(
            playerBody.position.x,
            playerBody.position.y - 4,
            playerBody.position.z
        )

        const ray = new CANNON.Ray(from, to);
        const result = new CANNON.RaycastResult();

        ray.intersectBodies(this.tileBodies, result);

        if (result.hasHit && !result.body.hasFallen) {
            console.log("has hit", result);
            this._scheduleCrumble(result.body);
        }

        // Sync meshes to bodies
        for (let i = 0; i < this.tiles.length; i++) {
            // world coordinates
            const bodyPosition = this.tileBodies[i].position;
            const bodyQuaternion = this.tileBodies[i].quaternion;

            const worldPos = new THREE.Vector3(
                bodyPosition.x,
                bodyPosition.y,
                bodyPosition.z
            );

            const tileMesh  = this.tiles[i];
            const localPos = tileMesh.parent.worldToLocal(worldPos);

            if (this.tileBodies[i].hasFallen)
                console.log('fallen', localPos);


            tileMesh.position.copy(localPos);

            this.tiles[i].quaternion.copy(bodyQuaternion);
        }

    }

    _scheduleCrumble(body) {

        setTimeout(() => {
            this._crumbleTile(body);
        }, 500);
    }

    _crumbleTile(body) {

        body.hasFallen = true;

        body.mass = 0.5;

        body.type = CANNON.Body.DYNAMIC;

        body.updateMassProperties();

        body.wakeUp();

        const impulse = new CANNON.Vec3(
            (Math.random() - 0.5) * 2,
            0,
            (Math.random() - 0.5) * 2
        );

        body.applyImpulse(impulse, body.position);
    }
}

export default CrumblingPlatform;