
import * as THREE from 'three';
import * as CANNON from 'cannon';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { Ambulance, Limousine, Pickup, Firetruck, Bus, Hatchback, PoliceSport, PoliceSuv, TruckWithTrailer } from './vehicles.js';
import materialsManager from './materialManager.js';
import materialManager from './materialManager.js';
import Tunnel from './tunnels.js';


class RoadPath {
  constructor(scene) {
    // calculate track points on the road
    // get its bounding box 
    // get its world coordinates 

    this.meshes = [];
    this.scene = scene;
    this.samples = 2;

    this.leftLanePath = [];
    this.rightLanePath = [];
  }

  addRoadMesh(mesh) {
    this.meshes.push(mesh);
  }

  radiansToDegrees(radians) {
    return radians * (180 / Math.PI);
  }

  calculateLanePaths() {
    const leftLanePath = [];
    const rightLanePath = [];

    this.meshes.forEach((mesh) => {
      // get its bounding box
      mesh.updateMatrixWorld(true);

      const boundingBox = new THREE.Box3().setFromObject(mesh);

      // to visualize bounding boxes

      const boxHelper = new THREE.Box3Helper(boundingBox, 0xffff00); // Yellow color for the helper.
      this.scene.add(boxHelper);

      const { min, max } = boundingBox;

      // get center of the road
      const centerX = (min.x + max.x) / 2;
      const centerY = (min.y + max.y) / 2;
      const centerZ = (min.z + max.z) / 2;

      // calculate road with
      const roadWidth = max.x - min.x;
      const laneWidth = roadWidth / 2;

      // calculate leftx and rightx
      const leftX = centerX - (laneWidth / 2);
      const rightX = centerX + (laneWidth / 2);

      const leftPoint = new THREE.Vector3();
      const rightPoint = new THREE.Vector3();

      const offset = -10;

      // apply rotation if z rotation is not zero
      if (this.radiansToDegrees(mesh.rotation.z) != 0) {

        // calculate Z coordinates for lanes
        // center around x
        const leftZ = centerZ - (laneWidth / 2);
        const rightZ = centerZ + (laneWidth / 2);

        leftPoint.set(centerX, centerY, leftZ - offset);
        rightPoint.set(centerX, centerY, rightZ + offset);
      } else {
        leftPoint.set(leftX - offset, centerY, centerZ);
        rightPoint.set(rightX + offset, centerY, centerZ);
      }

      if (mesh.name.includes('corner')) {
        // get a diagonal line
        // top-left quadrant
        const topLeftQuadCenterZ = (min.z + centerZ) / 2;
        // bottom-left quadrant x center 
        const bottomLeftQuadCenterX = (centerX + min.x) / 2;

        // bottom-right quadrant z center
        const bottomLeftQuadCenterZ = (max.z + centerZ) / 2;
        const bottomRightQuadCenterX = (centerX + max.x) / 2;

        let topOffset = 10;

        if (this.radiansToDegrees(mesh.rotation.z) != 0) {
          topOffset = -topOffset
        }

        leftPoint.set(bottomLeftQuadCenterX - offset, centerY, topLeftQuadCenterZ - offset + topOffset);
        rightPoint.set(bottomRightQuadCenterX + offset, centerY, bottomLeftQuadCenterZ + offset + topOffset);
      }

      // Construct 3D vectors for each lane.
      leftLanePath.push(leftPoint);
      rightLanePath.push(rightPoint);

      this.leftLanePath.push(leftPoint);
      this.rightLanePath.push(rightPoint);
    });

    this.sortLanePath();

    return { "left": leftLanePath, "right": rightLanePath };
  }

  findNearest(point, array) {
    let minDistance = Infinity;
    let nearestPoint = null;

    array.forEach(pathPoint => {
      const distance = point.distanceTo(pathPoint);

      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = pathPoint
      }
    });

    return nearestPoint;
  }

  sortLanePath() {
    let referencePointLeft = new THREE.Vector3(3.032, 3.999, 773.079);
    let referencePointRight = new THREE.Vector3(3.032, 3.999, 773.079);

    // create a copy of 
    const leftLanePathCopy = this.leftLanePath.slice();
    const rightLanePathCopy = this.rightLanePath.slice();

    const sortedLeft = []
    const sortedRight = []

    this.leftLanePath.forEach((point) => {
      // find the nearest point in the array 
      const nearestPoint = this.findNearest(referencePointLeft, leftLanePathCopy);

      // remove that point from the copy
      const index = leftLanePathCopy.indexOf(nearestPoint);

      if (index !== -1) {
        leftLanePathCopy.splice(index, 1);
      }

      sortedLeft.push(nearestPoint);

      referencePointLeft = nearestPoint;
    });

    this.leftLanePath = sortedLeft;
    this.rightLanePath.forEach((point) => {
      // find the nearest point in the array 
      const nearestPoint = this.findNearest(referencePointRight, rightLanePathCopy);

      // remove that point from the copy
      const index = rightLanePathCopy.indexOf(nearestPoint);

      if (index !== -1) {
        rightLanePathCopy.splice(index, 1);
      }

      sortedRight.push(nearestPoint);
      referencePointRight = nearestPoint;
    });

    this.rightLanePath = sortedRight;
  }

  visualizeLanePaths() {

    const leftPoints = [];
    const rightPoints = [];

    this.leftLanePath.forEach((point) => {
      leftPoints.push(point.x, point.y, point.z);
    })

    this.rightLanePath.forEach((point) => {
      rightPoints.push(point.x, point.y, point.z);
    })

    const bufferLeftGeometry = new THREE.BufferGeometry();
    bufferLeftGeometry.setAttribute('position', new THREE.Float32BufferAttribute(leftPoints, 3));

    const bufferRightGeometry = new THREE.BufferGeometry();
    bufferRightGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rightPoints, 3));

    this.scene.add(new THREE.Points(bufferLeftGeometry, new THREE.PointsMaterial({ color: 0xff0000, size: 3.5 })));
    this.scene.add(new THREE.Points(bufferRightGeometry, new THREE.PointsMaterial({ color: 0xfff000, size: 3.5 })));
  }
}

class City {

  constructor(scene, world, assetPath) {
    // for a single or multiple buildings or whatever

    this.fbxLoader = new FBXLoader();
    this.scene = scene;
    this.world = world;
    this.object = null;

    this.paths = null;

    // road path
    this.roadPath = new RoadPath(this.scene);

    this.fbxLoader.load(
      assetPath,
      (object) => {
        object.scale.multiplyScalar(0.5);

        // get size
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = new THREE.Vector3();
        box.getSize(size);

        // set position
        object.position.set(0, -3, 0);

        this.scene.add(object);
        this.object = object;

        this.object.traverse((child) => {
          if (child.isMesh && !Array.isArray(child.material)) {
            // road mesh
            child.material.transparent = false;
            this.roadPath.addRoadMesh(child);
          } else {
            if (child.material)
              child.material.forEach((childMaterial) => {
                childMaterial.transparent = false;
              })
          }
        });

        // calculate road paths 
        this.paths = this.roadPath.calculateLanePaths();
        // this.roadPath.visualizeLanePaths();

        // provide a copy of the roadpath lane to the cars as they modify it in a loop

        this.vehicles = [];

        /*
        for (var i = 0; i < 9; ++i) {
          if (Math.random() > 0.5) {
            this.vehicles.push(new Bus(scene, world, this.roadPath.leftLanePath[i], this.roadPath.leftLanePath.slice(i), false));
            this.vehicles.push(new Firetruck(scene, world, this.roadPath.rightLanePath[i], this.roadPath.rightLanePath.slice(i), false));
          } else {
            this.vehicles.push(new Bus(scene, world, this.roadPath.rightLanePath[i], this.roadPath.rightLanePath.slice(i), false));
            this.vehicles.push(new Firetruck(scene, world, this.roadPath.leftLanePath[i], this.roadPath.leftLanePath.slice(i), false));
          }
        }

        for (var i = 9; i < 12; ++i) {
          if (Math.random() > 0.5) {
            this.vehicles.push(new Bus(scene, world, this.roadPath.leftLanePath[i], this.roadPath.leftLanePath.slice(i), true));
            this.vehicles.push(new Firetruck(scene, world, this.roadPath.rightLanePath[i], this.roadPath.rightLanePath.slice(i), true));
          } else {
            this.vehicles.push(new Bus(scene, world, this.roadPath.rightLanePath[i], this.roadPath.rightLanePath.slice(i), true));
            this.vehicles.push(new Firetruck(scene, world, this.roadPath.leftLanePath[i], this.roadPath.leftLanePath.slice(i), true));
          }
        }
        */

      }
    );

    this.createBox({"x": -100, "y": 50, "z": 300}, {"height": 100, "width": 100, "depth": 900});
    this.createBox({"x": 100, "y": 50, "z": 360}, {"height": 100, "width": 100, "depth": 800});
    this.createBox({"x": 130, "y": 50, "z": -210}, {"height": 100, "width": 600, "depth": 100});
    this.createBox({"x": 340, "y": 50, "z": 10}, {"height": 100, "width": 400, "depth": 100});
    this.createBox({"x": 600, "y": 50, "z": -300}, {"height": 100, "width": 100, "depth": 700});
    this.createBox({"x": 380, "y": 50, "z": -450}, {"height": 100, "width": 100, "depth": 400});

  }

  createBox(position, size) {
    var boxShape = new CANNON.Box(new CANNON.Vec3(size.width / 2, size.height / 2, size.depth / 2));

    var boxBody = new CANNON.Body({
      mass: 0  // Set mass (non-zero for dynamic bodies)
    });

    boxBody.addShape(boxShape);
    boxBody.position.set(position.x, position.y, position.z);
    this.world.addBody(boxBody);
  }

  update(deltaTime) {

    if (this.vehicles) {
      this.vehicles.forEach(vehicle => {
        vehicle.update(deltaTime);
      });
    }

    // if (this.car6) this.car6.update(deltaTime);
  }
}

export default class MeshWorld {

  constructor(scene, world) {

    this.worldSize = 1500;
    const gridResolution = 100;
    const visualResolution = 200;
    this.scene = scene;
    this.world = world;

    // material
    this.material = materialsManager.createMaterial('groundMaterial')

    // 3d models loader
    this.loader = new OBJLoader();

    // fbx loader
    this.fbxLoader = new FBXLoader();

    // texture loader
    this.textureLoader = new MTLLoader();

    const elementSize = this.worldSize / gridResolution;
    const heights = [];
    const fluctuation = 0;

    for (let i = 0; i < gridResolution; i++) {
      heights.push([]);

      for (let j = 0; j < gridResolution; j++) {
        heights[i].push((Math.random() - 0.5) * fluctuation);
      }
    }

    // plane geometery
    this.groundGeo = new THREE.PlaneGeometry(this.worldSize, this.worldSize, visualResolution, visualResolution);
    this.groundGeo.rotateX(-Math.PI / 2);

    for (let i = 0; i < this.groundGeo.attributes.position.count; i++) {

      const vertex = new THREE.Vector3().fromBufferAttribute(this.groundGeo.attributes.position, i);

      // Convert the vertex position to indices in the heightfield grid.
      // Note: This assumes the plane spans from -worldSize/2 to worldSize/2.

      const xIndex = Math.floor(((vertex.x + this.worldSize / 2) / this.worldSize) * (gridResolution - 1));
      const zIndex = Math.floor(((vertex.z + this.worldSize / 2) / this.worldSize) * (gridResolution - 1));

      // Use the corresponding height; for smoother results, you might interpolate between nearby grid values.
      const height = heights[zIndex][xIndex]; // Ensure consistent indexing (row = z, column = x)

      vertex.y = height;
      this.groundGeo.attributes.position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    this.groundGeo.computeVertexNormals();

    this.groundMat = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.groundMesh = new THREE.Mesh(this.groundGeo, this.groundMat);


    // physics
    // heightfield shape
    const heightfieldShape = new CANNON.Heightfield(heights, { elementSize: elementSize });
    this.heightfieldBody = new CANNON.Body({
      mass: 0,
      material: this.material
    });

    this.heightfieldBody.addShape(heightfieldShape);

    // Rotate the groundBody so the plane faces upward
    this.heightfieldBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

    // place groundBody's center at origin
    this.heightfieldBody.position.set(-this.worldSize / 2, 0, this.worldSize / 2 + 90);

    // scene.add(this.groundMesh);

    world.addBody(this.heightfieldBody);

    /*
    const gridRows = heights.length;
    const gridCols = heights[0].length;
    const positions = [];

    for (let i = 0; i < gridRows; i++) {
      for (let j = 0; j < gridCols; j++) {
        // Calculate world position based on grid indices.
        // Adjust the offset if your heightfield isn't centered at (0,0)

        const xOffset = -this.worldSize / 2
        const zOffset = -this.worldSize / 2
        const x = j * elementSize;
        const y = heights[i][j];
        const z = i * elementSize;
        positions.push(x + xOffset, y, z + zOffset);

      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    // Create a PointsMaterial with a contrasting color and desired point size.
    const material = new THREE.PointsMaterial({ color: 0xff0000, size: 2 });

    // Create the points cloud and add it to the scene.
    const pointsCloud = new THREE.Points(geometry, material);
    scene.add(pointsCloud);
    */

    // cylinder

    this.tunnel = new Tunnel(scene, world);

    this.city = new City(scene, world, 'assets/City model 2.fbx')

    // this.monsterTruck = new MonsterTruck(scene, world, {x: 500, y: 30, z: 10});

    this.defineMaterials();

    // contact material
  }

  defineMaterials() {

    materialManager.createMaterial('vehicleMaterial');

    const vehiclePlayerContactMaterial = materialsManager.createContactMaterial('playerMaterial', 'vehicleMaterial', {
      friction: 1,   // Low friction for sliding behavior
      restitution: 0.0
    });

    const groundPlayerContactMaterial = materialsManager.createContactMaterial('playerMaterial', 'groundMaterial', {
      friction: 0.1,   // Low friction for sliding behavior
      restitution: 0.1
    });

    this.world.addContactMaterial(vehiclePlayerContactMaterial);
    this.world.addContactMaterial(groundPlayerContactMaterial);
  }

  update(deltaTime) {

    this.city.update(deltaTime);
    this.tunnel.update(deltaTime);

    // this.monsterTruck.update(deltaTime);
  }
}
