

import * as THREE from 'three';
import * as CANNON from 'cannon';
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import MeshWorld from './city.js';
import Player from './player.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GlitchPass } from 'three/addons/postprocessing/GlitchPass.js';
import { DotScreenPass } from 'three/addons/postprocessing/DotScreenPass.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { HalftonePass } from 'three/addons/postprocessing/HalftonePass.js';
import { DotScreenShader } from 'three/addons/shaders/DotScreenShader.js';
import CannonDebugger from './cannonDebugger.js';
import { Sky } from 'three/addons/objects/Sky.js';
import CrumblingPlatform from './crumblingPlatform.js';
import zoneManager from './zoneManager.js';
import groundBodies from './groundBodies.js';


export default class Game {
  constructor() {

    /*
         _______                              _______         __               
        |     __|.----.-----.-----.-----.    |     __|.-----.|  |_.--.--.-----.
        |__     ||  __|  -__|     |  -__|    |__     ||  -__||   _|  |  |  _  |
        |_______||____|_____|__|__|_____|    |_______||_____||____|_____|   __|
                                                                        |__|   
    */

    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(this.renderer.domElement);

    // Add lights for better visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 8.5);
    this.scene.add(ambientLight);

    const axesHelper = new THREE.AxesHelper(100);
    this.scene.add(axesHelper);

    this.accumulatedTime = 0;                 // initialize accumulator

    // sky 
    this.sky = new Sky();
    this.sky.scale.setScalar(450000);

    const u = this.sky.material.uniforms;

    this.renderer.toneMapping = THREE.LinearToneMapping;
    this.renderer.toneMappingExposure = 0.26;

    u['turbidity'].value = 2;
    u['rayleigh'].value = 1;
    u['mieCoefficient'].value = 0.001;
    u['mieDirectionalG'].value = 0.6;


    if (u['luminance']) u['luminance'].value = 0.5;

    const phi = THREE.MathUtils.degToRad(180);
    const theta = THREE.MathUtils.degToRad(180);
    const sunPosition = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

    this.sky.material.uniforms.sunPosition.value = sunPosition;

    this.scene.add(this.sky);

    // sunlight
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.005);
    this.directionalLight.position.set(1, 1, 1).normalize();

    // Assuming sunPosition is defined as in your Sky setup
    this.directionalLight.position.copy(sunPosition);

    this.scene.add(this.directionalLight);

    // hemisphere light
    // const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x4682B4, 0.2);
    // this.scene.add(hemisphereLight);

    /*
        const sky = new Sky();
        sky.scale.setScalar(450000);
        this.scene.add(sky);

        const skyUniforms = sky.material.uniforms;

        skyUniforms['turbidity'].value = 10;
        skyUniforms['rayleigh'].value = 0.5;
        skyUniforms['mieCoefficient'].value = 0.005;
        skyUniforms['mieDirectionalG'].value = 0.8;

        const sun = new THREE.Vector3();
        const theta = Math.PI * (0.5 - 0.01); // Elevation
        const phi = 2 * Math.PI * (0.25); // Azimuth
        sun.setFromSphericalCoords(1, theta, phi);
        skyUniforms['sunPosition'].value.copy(sun);
    */


    /*
        ______ _               _            _____      _               
        | ___ \ |             (_)          /  ___|    | |              
        | |_/ / |__  _   _ ___ _  ___ ___  \ `--.  ___| |_ _   _ _ __  
        |  __/| '_ \| | | / __| |/ __/ __|  `--. \/ _ \ __| | | | '_ \ 
        | |   | | | | |_| \__ \ | (__\__ \ /\__/ /  __/ |_| |_| | |_) |
        \_|   |_| |_|\__, |___/_|\___|___/ \____/ \___|\__|\__,_| .__/ 
                    __/ |                                     | |    
                    |___/                                      |_|    
    */

    this.world = new CANNON.World();
    this.world.gravity.set(0, -30, 0); // Gravity pulls objects down along Y
    // collision detection algorithm
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;

    // debugger
    this.cannonDebugger = new CannonDebugger(this.scene, this.world);

    /*
         ___   _                              
        (  _`\(_ )                            
        | |_) )| |    _ _  _   _    __   _ __ 
        | ,__/'| |  /'_` )( ) ( ) /'__`\( '__)
        | |    | | ( (_| || (_) |(  ___/| |   
        (_)   (___)`\__,_)`\__, |`\____)(_)   
                          ( )_| |             
                          `\___/'             
    */

    this.player = new Player(this.scene, this.world, this.renderer, null);

    this.meshWorld = new MeshWorld(this.scene, this.world);

    // add height field body
    groundBodies.addGroundBody(this.meshWorld.heightfieldBody);

    this.player.groundBody = this.meshWorld.heightfieldBody;

    // check for collision between player body and mesh world ground body
    this.player.playerBody.addEventListener("collide", (event) => {
      // how to reset the world
      if (event.body === this.meshWorld.heightfieldBody) {
        // remove all the vehicles
        // this.meshWorld.city.deleteVehicles();

        // add all the vehicles
        // this.meshWorld.city.initVehicles();

        // reset player to its starting point
        // this.player.reset();

        // this.pause();
      }
    });

    // crumbling platform
    this.crumblingPlatform = new CrumblingPlatform(this.scene, this.world);

    // this.meshWorld.defineMaterials();
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.player.camera);

    this.composer.addPass(renderPass);

    const halftonePass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.2, // strength
      0.4, // radius
      0.85 // threshold
    );

    this.composer.addPass(halftonePass);

    this.clock = new THREE.Clock();
    this.timeStep = 1 / 60;

    this.isPaused = false;
    this.maxSubSteps = 10;
    this.requestId = null;

    // overlay
    this.pauseOverlay = document.createElement('div');
    this.pauseOverlay.id = 'pauseOverlay';
    this.pauseOverlay.innerHTML = '<div id="pauseText">You died<br>Press [R] to Resume</div>';
    document.body.appendChild(this.pauseOverlay);

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR' && this.isPaused) {
        this.resume();
      }

      if (e.code === 'KeyP' && !this.isPaused) {
        this.pause();
      }

    });

    this.dayDuration = 50; // seconds for full sunset→night

    const starCount = 10000;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // spread stars in a sphere of radius 1000
      const r = 30000;
      positions[3 * i] = (Math.random() - 0.5) * 2 * r;
      positions[3 * i + 1] = (Math.random() - 0.5) * 2 * r;
      positions[3 * i + 2] = (Math.random() - 0.5) * 2 * r;
    }

    // 2. Build geometry & material
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 13.5,
      sizeAttenuation: true,
    });

    // 3. Create Points and add to scene
    const starField = new THREE.Points(starGeo, starMat);

    this.scene.add(starField);

    // add fog

    const horizonColor = new THREE.Color(0xffffff);
    this.scene.fog = new THREE.Fog(horizonColor, 0, 3000);
    this.renderer.setClearColor( this.scene.fog.color );

  }

  updateDayNight(t) {

    // interpolate elevation from +90° (sunset horizon) down to -90° (midnight)
    const phi = THREE.MathUtils.lerp(
      THREE.MathUtils.degToRad(-90),
      THREE.MathUtils.degToRad(90),
      t
    );  // :contentReference[oaicite:0]{index=0}

    const theta = THREE.MathUtils.degToRad(180); // due south

    // recompute sun vector
    const sunPos = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

    const sunUni = this.sky.material.uniforms.sunPosition;
    sunUni.value.copy(sunPos);

    this.directionalLight.position.copy(sunPos);            // :contentReference[oaicite:1]{index=1}

    // fade out light intensity toward night
    this.directionalLight.intensity = THREE.MathUtils.lerp(0.4, 0.05, t);

    // optional: shift light color toward cooler/moonlight
    this.directionalLight.color.setHSL(
      THREE.MathUtils.lerp(0.1, 0.6, t),
      0.5,
      THREE.MathUtils.lerp(0.9, 0.3, t)
    );

    // tweak sky shader parameters
    this.sky.material.uniforms.turbidity.value = THREE.MathUtils.lerp(10, 2, t);
    this.sky.material.uniforms.rayleigh.value = THREE.MathUtils.lerp(2, 0.2, t);
    this.sky.material.uniforms.mieCoefficient.value = THREE.MathUtils.lerp(0.005, 0.0001, t);
  }

  animate() {

    this.requestId = requestAnimationFrame(() => { this.animate() });

    if (this.isPaused) return;

    const delta = this.clock.getDelta();

    this.accumulatedTime = (this.accumulatedTime || 0) + delta;

    const t = Math.min(this.accumulatedTime / this.dayDuration, 1);

    if (t < 1) {
      this.updateDayNight(t);   // interpolate your Sun, lights & sky shader
    }

    // Step the physics world
    this.world.step(this.timeStep, delta);

    // if player not in cityZone
    if (this.meshWorld && !zoneManager.isMeshInZone(this.player.playerMesh, 'cityZone')) {

      this.meshWorld.city.deleteCityMesh();
      this.meshWorld.removeGround();

      // add physics bodies to crumbling platform 
      // add only once
      if (!this.crumblingPlatform.hasPhysicsBodies) this.crumblingPlatform.addPhysicsBodies();

      if (this.crumblingPlatform.hasPhysicsBodies) {
        this.crumblingPlatform.update(delta, this.player.playerBody);
      }
    }

    if (this.meshWorld)
      this.meshWorld.update(delta);

    this.player.update(delta);



    this.cannonDebugger.update();

    this.renderer.render(this.scene, this.player.camera);
  }

  pause() {
    if (this.isPaused) return;

    this.isPaused = true;

    window.cancelAnimationFrame(this.requestId);

    this.pauseOverlay.style.display = 'flex'; 
  }

  resume() {
    if (!this.isPaused) return;

    this.pauseOverlay.style.display = 'none';

    this.isPaused = false;

    this.clock.start();

    this.animate();
  }
}
