
import * as CANNON from 'cannon';
import * as THREE from 'three'; 


class ZoneManager {

    constructor() {
        if (ZoneManager.instance)
            return ZoneManager.instance;

        this.zones = {}
        ZoneManager.instance = this;
    }

    addZone(name, bbox) {
        this.zones[name] = bbox;
    }

    createZoneForMesh(name, mesh) {
        // get bounding box of that mesh
        const boundingBox = new THREE.Box3().setFromObject(mesh);
        this.zones[name] = boundingBox;
    }

    getZoneByName(name) {
        if (!name in this.zones) return false;

        return this.zones[name];
    }

    isZone(name) {
        return (name in this.zones);
    }

    isMeshInZone(mesh, name) {
        if (!name in this.zones) return false;

        if (!mesh) return false;

        // get bounding box of mesh
        const meshBox = new THREE.Box3().setFromObject(mesh);

        return this.zones[name].containsBox(meshBox);
    }
}

const zoneManager = Object.freeze(new ZoneManager());
export default zoneManager;
