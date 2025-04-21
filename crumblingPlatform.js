
import * as THREE from 'three';
import * as CANNON from 'cannon';


class CrumblingPlatform {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;

        this.tiles = [];
        this.tileBodies = [];

        const ROWS = 20;
        const COLS = 20;

        const TILE_SIZE = 50;
        const TILE_HEIGHT = 10.2;

        const tileGeo = new THREE.BoxGeometry(TILE_SIZE, TILE_HEIGHT, TILE_SIZE);
        const tileMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

        const position = new THREE.Vector3(1000, 2000, -1000);

        for (let i = 0; i < ROWS; i++) {
            for (let j = 0; j < COLS; j++) {
                const mesh = new THREE.Mesh(tileGeo, tileMat);

                mesh.position.set(
                    position.x + ((j - COLS / 2) * TILE_SIZE + TILE_SIZE / 2),
                    position.y + (-TILE_HEIGHT / 2),
                    position.z + ((i - ROWS / 2) * TILE_SIZE + TILE_SIZE / 2)
                );

                this.scene.add(mesh);
            }
        }
    }

    update() {

    }
}

export default CrumblingPlatform;