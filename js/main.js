import * as THREE from 'three';
import { SceneManager }         from './SceneManager.js';
import { DeformManager }        from './DeformManager.js';
import { AxesDisplay }          from './AxesDisplay.js';
import { Minimap }              from './Minimap.js';
import { ModelLoader }          from './ModelLoader.js';
import { ParticleSystem }       from './ParticleSystem.js';
import { WeatherController }    from './WeatherController.js';
import { SimulationController } from './SimulationController.js';
import { UIController }         from './UIController.js';

// ── 인스턴스 생성 ──────────────────────────────────────────────
const sceneManager     = new SceneManager();
const { scene, camera, controls, renderer, ambient, sunLight } = sceneManager;

const deformManager    = new DeformManager();
const axesDisplay      = new AxesDisplay(scene);
const minimap          = new Minimap(scene);
const modelLoader      = new ModelLoader(scene, camera, controls, deformManager, axesDisplay, minimap);
const particleSystem   = new ParticleSystem(scene);
const weatherController = new WeatherController(scene, ambient, sunLight);
const simController    = new SimulationController(deformManager);
const uiController     = new UIController({ deformManager, simController, weatherController, modelLoader });

// ── Render Loop ────────────────────────────────────────────────
const clock = new THREE.Clock();

(function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  if (window._mixer) window._mixer.update(dt);
  controls.update();
  deformManager.uTime.value += dt;
  particleSystem.tick(weatherController.weatherType, weatherController.intensity);
  weatherController.updateAtmosphere();
  deformManager.updateAgeMaterials();

  simController.tick(dt);
  if (!simController.playing && !simController.completed) {
    uiController.tickAutoDeform(dt);
  }

  sceneManager.renderMain();
  minimap.render(renderer, camera);
})();
