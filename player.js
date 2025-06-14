

import * as THREE from 'three';
import * as CANNON from 'cannon';
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import materialManager from './materialManager.js';
import zoneManager from './zoneManager.js';
import groundBodies from './groundBodies.js'; 


export default class Player {
    constructor(scene, world, renderer, groundBody) {
        // Player for now is just a sphere
        // ----------------------------
        // Sphere (Ball) Creation
        // ----------------------------

        this.playerRadius = 4;
        this.playerMass = 10;

        this.groundBody = groundBody;

        this.material = materialManager.createMaterial('playerMaterial');

        // Cannon.js: create a dynamic sphere body with non-zero mass
        const playerShape = new CANNON.Sphere(this.playerRadius);
        this.initPosition = new CANNON.Vec3(-234, 50, 549);

        this.playerBody = new CANNON.Body({
            mass: this.playerMass, // Dynamic body
            position: this.initPosition,
            // material: this.material,
        });

        this.playerBody.fixedRotation = true;
        this.playerBody.updateMassProperties();
        // this.playerBody.linearDamping = 0.5;
        this.playerBody.linearDamping = 0.05;
        this.playerBody.angularDamping = 0.05;

        // instance variable to keep track of vehicle on which the player is on
        this.currentVehicle = null;

        this.playerBody.addShape(playerShape);
        world.addBody(this.playerBody);

        // Controls
        this.moveForward = false;
        this.moveBackward = false
        this.moveLeft = false
        this.moveRight = false;

        let canJump = false
        const jumpVelocity = 28;

        // Three.js: create a visual sphere mesh
        const playerGeo = new THREE.SphereGeometry(this.playerRadius, 12, 12);
        const playerMat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        this.playerMesh = new THREE.Mesh(playerGeo, playerMat);
        // scene.add(this.playerMesh);

        /*
         _____                                
        /  __ \                               
        | /  \/ __ _ _ __ ___   ___ _ __ __ _ 
        | |    / _` | '_ ` _ \ / _ \ '__/ _` |
        | \__/\ (_| | | | | | |  __/ | | (_| |
         \____/\__,_|_| |_| |_|\___|_|  \__,_|
        */

        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            5000
        );

        this.camera.position.set(0, 1.6, 0);

        this.controls = new PointerLockControls( this.camera, document.body );
        scene.add(this.controls.object);

        // mouse controls goes to PointerLockControls
        document.addEventListener('click', () => {
            this.controls.lock();
        });

        this.controls.addEventListener('lock', () => {
            console.log('Pointer locked');
        });

        this.controls.addEventListener('unlock', () => {
            console.log('Pointer unlocked');
        });


        /*
         _____             _             _     
        /  __ \           | |           | |    
        | /  \/ ___  _ __ | |_ _ __ ___ | |___ 
        | |    / _ \| '_ \| __| '__/ _ \| / __|
        | \__/\ (_) | | | | |_| | | (_) | \__ \
         \____/\___/|_| |_|\__|_|  \___/|_|___/
        */

        window.addEventListener('keydown', (event) => {
            if (event.code == 'Space' && (canJump || this.currentVehicle != null)) {
                // this.playerBody.velocity.y += jumpSpeed;
                const impulseMagnitude = this.playerMass * jumpVelocity;
                const impulse = new CANNON.Vec3(0, impulseMagnitude, 0);
                this.playerBody.applyImpulse(impulse, this.playerBody.position);
                canJump = false;
                this.currentVehicle = null;
            }
        });

        this.playerBody.addEventListener("collide", (event) => {
            if (groundBodies.bodies.includes(event.body)) {
                canJump = true;
            } else if (event.body.isVehicle && !this.currentVehicle) {
                this.currentVehicle = event.body;
            }
        });

        world.addEventListener("endContact", (event) => {
            const { bodyA, bodyB } = event;
            if (
                (bodyA === this.playerBody && bodyB === this.currentVehicle) ||
                (bodyB === this.playerBody && bodyA === this.currentVehicle)
            ) {
                // The contact has ended—clear the reference.
                this.playerBody.velocity.copy(this.currentVehicle.velocity);
                this.currentVehicle = null;
            }
        });

        document.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'KeyW':
                    this.moveForward = true;
                    break;
                case 'KeyS':
                    this.moveBackward = true;
                    break;
                case 'KeyA':
                    this.moveLeft = true;
                    break;
                case 'KeyD':
                    this.moveRight = true;
                    break;
                case 'KeyG':
                    console.log(this.playerBody.position);
                    break;
            }
        });

        document.addEventListener('keyup', (event) => {
            switch (event.code) {
                case 'KeyW':
                    this.moveForward = false;
                    break;
                case 'KeyS':
                    this.moveBackward = false;
                    break;
                case 'KeyA':
                    this.moveLeft = false;
                    break;
                case 'KeyD':
                    this.moveRight = false;
                    break;
            }
        });

        this.velocity = new THREE.Vector3(0, 0, 0);

        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

    }

    reset() {
        this.playerBody.position.set(this.initPosition.x, this.initPosition.y, this.initPosition.z);
    }

    update(deltaTime) {

        const acceleration = 80;
        const moveSpeed = 130;

        const inputVelocity = new THREE.Vector3(0, 0, 0);

        if (this.moveForward) inputVelocity.z -= 1;
        if (this.moveBackward) inputVelocity.z += 1;
        if (this.moveLeft) inputVelocity.x -= 0.5;
        if (this.moveRight) inputVelocity.x += 0.5;

        inputVelocity.multiplyScalar(moveSpeed);

        const moveQuaternion = new THREE.Quaternion();
        moveQuaternion.setFromRotationMatrix(this.controls.object.matrixWorld);
        inputVelocity.applyQuaternion(moveQuaternion);

        // we get the difference
        // get the desired velocity
        let desiredVel = new CANNON.Vec3(inputVelocity.x, 0, inputVelocity.z);

        // match player's velocity with that of the vehicle
        if (this.currentVehicle) {
            const vehicleVel = new CANNON.Vec3(
                this.currentVehicle.velocity.x,
                0,
                this.currentVehicle.velocity.z
            );

            desiredVel = desiredVel.vadd(vehicleVel);
        }

        const currentVel = new CANNON.Vec3(
            this.playerBody.velocity.x,
            0,
            this.playerBody.velocity.z
        );

        // if player is inside a tunnel
        if (zoneManager.isZone('tunnelZone') && zoneManager.isMeshInZone(this.playerMesh, 'tunnelZone')) {
            const impulseMagnitude = this.playerMass * 1.5;
            const impulse = new CANNON.Vec3(0, impulseMagnitude, 0);
            this.playerBody.applyImpulse(impulse, this.playerBody.position);
        } 

        const velDiff = desiredVel.vsub(currentVel)
        const impulse = velDiff.scale(this.playerMass * acceleration * deltaTime);
        this.playerBody.applyImpulse(impulse, this.playerBody.position);

        this.playerMesh.position.copy(this.playerBody.position);

        const eyeLevel = new THREE.Vector3(0, 6, 0);
        this.camera.position.copy(this.playerBody.position).add(eyeLevel);
    }
}