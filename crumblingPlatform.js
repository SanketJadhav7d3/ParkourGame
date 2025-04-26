
import * as THREE from 'three';
import * as CANNON from 'cannon';
import zoneManager from './zoneManager.js';


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
        
    }

    addPhysicsBodies() {
        const boxShape = new CANNON.Box(new CANNON.Vec3(this.TILE_SIZE / 2, this.TILE_HEIGHT / 2, this.TILE_SIZE / 2)); 

        this.tiles.forEach((tile) => {
            const body = new CANNON.Body({ mass: 0, shape: boxShape });
            body.position.copy(tile.position);
            this.world.addBody(body);
            this.tileBodies.push(body);
        });

        this.hasPhysicsBodies = true;
    }

    update() {

    }

}

export default CrumblingPlatform;