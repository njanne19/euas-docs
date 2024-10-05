// assets/js/splash.js
import * as THREE from 'three';
import { gsap } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.2/index.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 *  SETUP
*/
const ASPECT_RATIO = 16 / 6; 
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    75, 
    ASPECT_RATIO,
    0.1,
    1000
);
camera.position.set(0, 5, 20);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer();
renderer.setClearColor(0xffffff, 0);
const container = document.getElementById('threejs-homepage-container');
container.appendChild(renderer.domElement);

// Refresh the rendere's size once at start
onWindowResize();


/**
 * SCENE ELEMENTS
 */ 
const particlesGeometry = new THREE.BufferGeometry(); 
const particleCount = 5000; 


// Initialize particle positions randomly off-screen 
const positions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 400;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 400;
    positions[i * 3 + 2] = (Math.random() - 1.0) * 100;
}
particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const particlesMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.5, 
    blending: THREE.AdditiveBlending,
    depthWrite: false, 
})

const particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particleSystem);

const fontLoader = new FontLoader(); 
fontLoader.load('/assets/fonts/BABAPRO_font.json', (font) => {
    // Create the text geometry 
    const textGeometry = new TextGeometry('EXPERIMENTAL \nUAS', {
        font: font, 
        size: 25, 
        height: 1,
        curveSegments: 12,
        // bevelEnabled: true, 
    })
    textGeometry.center(); 

    const textMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.lookAt(camera.position);
    textMesh.position.set(-50, 20, 0);
    textMesh.updateMatrixWorld(); 

    // Get the geometry's position attribute
    const sampler = new MeshSurfaceSampler(textMesh).build();
    
    // Determine the number of samples you want
    const numSamples = particleCount; // Or set a specific number

    // Create an array to hold the sampled positions
    const worldPositions = new Float32Array(numSamples * 3);

    // Temporary vector for sampling
    const tempPosition = new THREE.Vector3();

    // Sample points
    for (let i = 0; i < numSamples; i++) {
        sampler.sample(tempPosition);

        worldPositions[i * 3] = tempPosition.x;
        worldPositions[i * 3 + 1] = tempPosition.y;
        worldPositions[i * 3 + 2] = tempPosition.z;
    }

    preanimateParticles(1, () => {
        animateParticles(worldPositions); // Move particles to final positions after oscillation fades
    });
})


// Add drone model 
const gltf_loader = new GLTFLoader();
let propellers = []; 
let propellerPivots = []; 

gltf_loader.load('/assets/models/fpv_quad/scene.gltf', (gltf) => {
    let model = gltf.scene;
    // model.position.set(6, 0, 8); 
    //model.scale.set(180, 180, 180); 
    // model.rotateZ(Math.PI / 4);
    // model.rotateX(Math.PI / 4);
    // model.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), Math.PI/4);
    // model.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -Math.PI / 4);
    model.scale.set(100, 100, 100); 
    scene.add(model);

    model.updateMatrixWorld(true); 
    model.traverse((child) => {
        if (child.isMesh) {
            // Enable texture filtering
            child.material.map && (child.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy());
        }
    });

});  

const ambientLight = new THREE.AmbientLight(0xffffff, 1); 
scene.add(ambientLight);


/**
 * INTERACTION 
 */
window.addEventListener('resize', onWindowResize, false); 

function onWindowResize() {
    const width = container.clientWidth; 
    const height = width / ASPECT_RATIO; 
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio)
    // Adjust the canvas element's dimensions 
    renderer.domElement.style.width = width + 'px';
    renderer.domElement.style.height = height + 'px';
}


/**
 * ANIMATION 
 */
function preanimateParticles(duration, onComplete) {
    const positions = particleSystem.geometry.attributes.position.array;
    const oscillationAmplitude = { value: 2 }; // Amplitude of oscillation
    
    // Animate small oscillations using gsap, reducing the amplitude gradually
    gsap.to(oscillationAmplitude, {
        value: 0, // Gradually reduce oscillation to 0
        duration: duration, // Time over which the oscillation fades
        ease: 'power2.in',
        onUpdate: () => {
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += (Math.random() - 0.5) * 0.05; // Adjust based on amplitude
                positions[i + 1] += (Math.random()) * oscillationAmplitude.value;
                positions[i + 2] += (Math.random() - 0.5) * 0.05;
            }
            particleSystem.geometry.attributes.position.needsUpdate = true;
        },
        onComplete: () => {
            // Call the callback function (to start moving particles to final positions) after oscillation
            if (onComplete) onComplete();
        }
    });
}
function animateParticles(targetPositions) {
    const positions = particleSystem.geometry.attributes.position.array; 

    // Create an array to hold the destination positions
    const destinationPositions = new Float32Array(positions.length);

    // Adjust the number of particles to match target positions 
    for (let i = 0; i < positions.length; i+= 3) {
        if (i < targetPositions.length) {
            destinationPositions[i] = targetPositions[i]; 
            destinationPositions[i + 1] = targetPositions[i + 1];
            destinationPositions[i + 2] = targetPositions[i + 2];
        } else {
            // Extra particles move off screen
            destinationPositions[i] = (Math.random() - 0.5) * 400;
            destinationPositions[i + 1] = (Math.random() - 0.5) * 400;
            destinationPositions[i + 2] = (Math.random() - 0.5) * 400;
        }

    }

    // Animate using gsap 
    gsap.to(positions, {
        duration: 5, 
        ease: 'back.inOut', 
        endArray: destinationPositions, 
        onUpdate: () => {
            particleSystem.geometry.attributes.position.needsUpdate = true;
        },
    })
}

function animate() {
    requestAnimationFrame(animate);

    // if (propellerPivots.length != 0) {
    //     propellerPivots[0].rotation.y += 0.1;
    // }
    

    renderer.render(scene, camera);
}

animate();