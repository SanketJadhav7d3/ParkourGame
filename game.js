

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
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
    this.scene.add(ambientLight);

    const axesHelper = new THREE.AxesHelper(100);
    this.scene.add(axesHelper);

    // sky 
    const sky = new Sky();
    sky.scale.setScalar(450000);

    const phi = THREE.MathUtils.degToRad(90);
    const theta = THREE.MathUtils.degToRad(180);
    const sunPosition = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

    sky.material.uniforms.sunPosition.value = sunPosition;
    this.scene.add(sky);

    // sunlight
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(1, 1, 1).normalize();

    // Assuming sunPosition is defined as in your Sky setup
    directionalLight.position.copy(sunPosition);
    this.scene.add(directionalLight);

    // hemisphere light
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x4682B4, 0.6);
    this.scene.add(hemisphereLight);



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
         _____ _ _         
        /  __ (_) |        
        | /  \/_| |_ _   _ 
        | |   | | __| | | |
        | \__/\ | |_| |_| |
         \____/_|\__|\__, |
                      __/ |
                     |___/ 
        */


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

    this.player.groundBody = this.meshWorld.heightfieldBody;

    // check for collision between player body and mesh world ground body
    this.player.playerBody.addEventListener("collide", (event) => {
      // how to reset the world
      if (event.body === this.meshWorld.heightfieldBody) {
        console.log("What the hell");

        // remove all the vehicles
        this.meshWorld.city.deleteVehicles();

        // add all the vehicles
        this.meshWorld.city.initVehicles();

        // reset player to its starting point
        this.player.reset();

        this.pause();
      }
    });


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
    });
  }

  animate() {
    this.requestId = requestAnimationFrame(() => { this.animate() });

    if (this.isPaused) return;

    const delta = this.clock.getDelta();

    // Step the physics world
    this.world.step(this.timeStep, delta);

    this.meshWorld.update(delta);

    this.player.update(delta);
    this.cannonDebugger.update();

    this.renderer.render(this.scene, this.player.camera);

    // this.composer.render();
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
