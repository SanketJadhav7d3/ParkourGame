
import * as THREE from 'three';
import * as CANNON from 'cannon';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import materialManager from './materialManager.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';


class Vehicle {
    constructor(assetPath, scene, world, position, roadPath, faceX) {
        this.assetPath = assetPath;
        this.scene = scene;
        this.world = world;
        this.position = position;
        this.object = null;
        this.body = null;
        this.mixer = null;
        this.chassisBody = null;
        this.vehicle = null;
        this.wheelMeshes = [];
        this.frontWheelIdx = { 'left': null, 'right': null };
        this.roadPath = roadPath;
        this.radius = 5;

        // target to move towards to 
        this.currentTarget = null;
        this.visited = [];

        this.isOnGround = false;
        this.fbxLoader = new FBXLoader();

        this.fbxLoader.load(
            this.assetPath,
            (object) => {

                if (object.animations && object.animations.length > 0) {
                    this.mixer = new THREE.AnimationMixer(object);
                    const action = this.mixer.clipAction(object.animations[0]);
                    action.play();
                }

                // mesh
                object.scale.multiplyScalar(0.05);
                object.position.set(this.position.x, this.position.y + 50, this.position.z);
                scene.add(object);
                this.object = object;

                // create a chassis (phsyics)
                const objectBbox = new THREE.Box3().setFromObject(object);
                const size = new THREE.Vector3();
                objectBbox.getSize(size);
                size.multiplyScalar(0.95);
                const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
                const boxShape = new CANNON.Box(halfExtents);

                const center = new THREE.Vector3();
                objectBbox.getCenter(center);
                const cannonOffset = new CANNON.Vec3(
                    center.x - object.position.x,
                    center.y - object.position.y,
                    center.z - object.position.z
                );


                this.chassisBody = new CANNON.Body({
                    mass: 1000,
                    material: materialManager.getMaterial('vehicleMaterial')
                });

                this.chassisBody.isVehicle = true;

                this.chassisBody.addShape(boxShape, cannonOffset);
                this.chassisBody.position.set(this.position.x, this.position.y, this.position.z);

                // make it face negative-z-axis
                const axis = new CANNON.Vec3(0, 1, 0);

                if (faceX)
                    this.chassisBody.quaternion.setFromAxisAngle(axis, Math.PI / 2);
                else
                    this.chassisBody.quaternion.setFromAxisAngle(axis, Math.PI);

                this.world.addBody(this.chassisBody);

                this.vehicle = new CANNON.RaycastVehicle({
                    chassisBody: this.chassisBody,
                    indexRightAxis: 0,  // X-axis is right
                    indexUpAxis: 1,     // Y-axis is up
                    indexForwardAxis: 2 // Z-axis is forward
                });

                const wheelOptions = {
                    radius: this.radius,
                    directionLocal: new CANNON.Vec3(0, -1, 0),
                    suspensionStiffness: 30,
                    suspensionRestLength: 0.3,
                    frictionSlip: 5,
                    dampingRelaxation: 2.3,
                    dampingCompression: 4.4,
                    maxSuspensionForce: 100000,
                    rollInfluence: 0.01,
                    axleLocal: new CANNON.Vec3(-1, 0, 0),
                    chassisConnectionPointLocal: new CANNON.Vec3(), // to be set per wheel
                    maxSuspensionTravel: 0.3,
                    customSlidingRotationalSpeed: -30,
                    useCustomSlidingRotationalSpeed: true
                };

                const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
                const childrenMesh = [];

                object.traverse((child) => {
                    if (child.isMesh && child.name.toLowerCase().includes("wheel")) {
                        child.geometry.computeBoundingSphere();
                        const radius = child.geometry.boundingSphere.radius;

                        const boundingBox = new THREE.Box3().setFromObject(child);
                        const wheelCenter = new THREE.Vector3();
                        boundingBox.getCenter(wheelCenter);

                        // local pos where the cylinder wheels are placed are calculated using the relative
                        // position of actual mesh wheel to its parent
                        // however while updating their position the wheelinfos from raycastvehicle uses 
                        // world coordinates whereas the mesh wheels realtive coordinates to update their position
                        // that's why detach them from parent such that they get updated correctly according to word coordinates 

                        const localPos = wheelCenter.clone().sub(object.position);

                        wheelOptions.chassisConnectionPointLocal.copy(localPos);
                        this.vehicle.addWheel(wheelOptions);

                        this.wheelMeshes.push(child);
                    }
                });

                // detach all the children stored in wheelmeshes
                this.wheelMeshes.forEach((child, index) => {

                    this.object.remove(child);
                    child.scale.multiplyScalar(0.05);
                    scene.add(child);

                    if (child.name.toLowerCase().includes("front_right"))
                        this.frontWheelIdx['right'] = index

                    if (child.name.toLowerCase().includes("front_left"))
                        this.frontWheelIdx['left'] = index
                });

                this.vehicle.addToWorld(this.world);
            },
            (xhr) => {
                console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`);
            },
            (error) => {
                console.error('An error occurred while loading the FBX file:', error);
            }
        );

        // vehicular movements
        this.desiredDirection = new THREE.Vector3(1, 0, 0);
        this.speed = 70;
        this.brakeMultiplier = 600;
    }

    getNearestPoint() {
        let minDistance = Infinity;
        const reachThreshold = 1.0; 
        let nearest = null;

        this.roadPath.forEach((point) => {
            const distance = this.chassisBody.position.distanceTo(point);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = point;
            }
        });

        this.currentTarget = nearest;
    }

    update(deltaTime) {
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }

        if (!this.vehicle) return;

        // see if current target is set

        if (!this.currentTarget && this.roadPath.length > 0) {
            this.getNearestPoint();
        }

        // check if vehicle has reached the point
        if (this.currentTarget && this.chassisBody.position.distanceTo(this.currentTarget) < 80.0) {
            // remove the point 
            const index = this.roadPath.indexOf(this.currentTarget);

            if (index > -1) this.roadPath.splice(index, 1);

            // set current target to null
            this.currentTarget = null;
        }

        // steer towards the point 

        if (this.currentTarget) {

            const targetDirection = new THREE.Vector3().subVectors(this.currentTarget, this.chassisBody.position).normalize();

            const vehicleForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.chassisBody.quaternion);

            const angleDiff = vehicleForward.angleTo(targetDirection);

            const cross = new THREE.Vector3().crossVectors(vehicleForward, targetDirection);
            const sign = Math.sign(cross.y);

            const steeringSensitivity = 0.5; // adjust this value as needed
            const steeringValue = angleDiff * steeringSensitivity * sign;

            if (this.frontWheelIdx['left'] != null)
                this.vehicle.setSteeringValue(steeringValue, this.frontWheelIdx['left']);

            if (this.frontWheelIdx['right'] != null) {
                this.vehicle.setSteeringValue(steeringValue, this.frontWheelIdx['right']);
            }

            const maxSteeringAngle = Math.PI / 4;

            const steeringFactor = Math.max(0.5, 1 - Math.abs(steeringValue) / maxSteeringAngle);

            const engineForce = -this.speed * 40;

            const adjustedForce = engineForce * steeringFactor;

            // get current speed of the vehicle
            const currentSpeed = this.chassisBody.velocity.length();

            const normalizedSpeed = currentSpeed / this.speed;

            const brakeStrength = Math.abs(steeringValue) * normalizedSpeed * this.brakeMultiplier;
            
            // apply break as well
            // const brakeStrength = Math.abs(steeringValue) * this.brakeMultiplier;

            // four wheel drive
            for (let i = 0; i < 4; i++) {
                this.vehicle.applyEngineForce(adjustedForce, i);
                this.vehicle.setBrake(brakeStrength, i);
            }

        } else {

            if (this.frontWheelIdx['left'])
                this.vehicle.setSteeringValue(0, this.frontWheelIdx['left']);

            if (this.frontWheelIdx['right'])
                this.vehicle.setSteeringValue(0, this.frontWheelIdx['right']);
        }

        // update wheel position and its rotation
        for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
            this.vehicle.updateWheelTransform(i);
            const t = this.vehicle.wheelInfos[i].worldTransform;

            if (this.wheelMeshes[i]) {
                this.wheelMeshes[i].position.copy(t.position);
                this.wheelMeshes[i].quaternion.copy(t.quaternion);

                const offsetQuat = new THREE.Quaternion();
                offsetQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);

                // this.wheelMeshes[i].quaternion.multiply(offsetQuat);
            }
        }

        if (this.object) {
            this.object.position.copy(this.chassisBody.position);
            this.object.quaternion.copy(this.chassisBody.quaternion);
        }
    }

    remove() {
        function disposeMesh(mesh) {
            mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    const mats = Array.isArray(child.material)
                        ? child.material
                        : [child.material];
                    mats.forEach(mat => {
                        for (const key in mat) {
                            if (mat[key]?.isTexture) mat[key].dispose();
                        }
                        mat.dispose();
                    });
                }
            });
        }

        if (this.object) {
            this.scene.remove(this.object);
            disposeMesh(this.object);
            this.object = null;
        }
        this.wheelMeshes.forEach(wheel => {
            this.scene.remove(wheel);
            disposeMesh(wheel);
        });
        this.wheelMeshes = [];

        if (this.vehicle) {
            this.vehicle.removeFromWorld(this.world);
            this.vehicle = null;
        }
        if (this.chassisBody) {
            this.world.removeBody(this.chassisBody);
            this.chassisBody = null;
        }

        this.currentTarget = null;
        this.roadPath = [];
    }
}

export class Bus extends Vehicle {
    constructor(scene, world, position, roadPath, faceX) {
        const assetPath = 'assets/Free Low Poly Vehicles Pack by Rgsdev/Bus/Bus.fbx'
        super(assetPath, scene, world, position, roadPath, faceX);
        this.radius = 6;
        this.speed = 120;
    }
}

export class Firetruck extends Vehicle {
    constructor(scene, world, position, roadPath, faceX) {
        const assetPath = 'assets/Free Low Poly Vehicles Pack by Rgsdev/Firetruck/Firetruck.fbx'
        super(assetPath, scene, world, position, roadPath, faceX);
        this.speed = 80;
        this.brakeMultiplier = 200;
    }
}

export class Hatchback extends Vehicle {
    constructor(scene, world, position, roadPath, faceX) {
        const assetPath = 'assets/Free Low Poly Vehicles Pack by Rgsdev/Hatchback/Hatchback.fbx'
        super(assetPath, scene, world, position, roadPath, faceX);
    }
}

export class MonsterTruck extends Vehicle {
    constructor(scene, world, position, roadPath, faceX) {
        const assetPath = 'assets/Free Low Poly Vehicles Pack by Rgsdev/Monster Truck/Monster Truck.fbx'
        super(assetPath, scene, world, position, roadPath, faceX);
    }
}

export class PoliceSport extends Vehicle {
    constructor(scene, world, position, roadPath, faceX) {
        const assetPath = 'assets/Free Low Poly Vehicles Pack by Rgsdev/Police Sports/Police Sports.fbx'
        super(assetPath, scene, world, position, roadPath, faceX);
    }
}

export class Truck extends Vehicle {
    constructor(scene, world, position, roadPath, faceX) {
        const assetPath = 'assets/Free Low Poly Vehicles Pack by Rgsdev/Truck/Truck.fbx'
        super(assetPath, scene, world, position, roadPath, faceX);
    }
}

export class PoliceSuv extends Vehicle {
    constructor(scene, world, position, roadPath, faceX) {
        const assetPath = 'assets/Free Low Poly Vehicles Pack by Rgsdev/Police SUV/Police SUV.fbx'
        super(assetPath, scene, world, position, roadPath, faceX);
    }
}

export class TruckWithTrailer extends Vehicle {
    constructor(scene, world, position, roadPath, faceX) {
        const assetPath = 'assets/Free Low Poly Vehicles Pack by Rgsdev/Truck with trailer/Truck with trailer.fbx'
        super(assetPath, scene, world, position, roadPath, faceX);
    }
}

export class Pickup extends Vehicle {
    constructor(scene, world, position, roadPath, faceX) {
        const assetPath = 'assets/Free Low Poly Vehicles Pack by Rgsdev/Pickup/Pickup.fbx'
        super(assetPath, scene, world, position, roadPath, faceX);
    }
}


export class Limousine extends Vehicle {
    constructor(scene, world, position, roadPath, faceX) {
        const assetPath = 'assets/Free Low Poly Vehicles Pack by Rgsdev/Limousine/Limousine.fbx'
        super(assetPath, scene, world, position, roadPath, faceX);
    }
}


export class Ambulance extends Vehicle {
    constructor(scene, world, position, roadPath, faceX) {
        const assetPath = 'assets/Free Low Poly Vehicles Pack by Rgsdev/Ambulance/Ambulance.fbx'
        super(assetPath, scene, world, position, roadPath, faceX);
    }
}


