var canvas;
var smfModel;

let radius  = 100;
let degrees = 0;
let height  = 0;

var thetaStep  = 0.01;

var cameraLightSource = new PointLightSource(
  vec4(1.0, 1.0, 1.0, 1.0),
  vec4(1.0, 1.0, 1.0, 1.0),
  vec4(1.0, 1.0, 1.0, 1.0),
  vec3(0, 0, 0)
);

var marsMaterial = new Material(
  vec4(0.6, 0.6, 0.6, 1.0),  // ambient — brighter
  vec4(1.0, 1.0, 1.0, 1.0),  // diffuse — full brightness
  vec4(0.2, 0.2, 0.2, 1.0),  // specular — slightly stronger
  50                         // shininess
);

var markerMaterial = new Material(
  vec4(0.3, 0.3, 0.3, 1.0), // ambient (dark gray)
  vec4(0.7, 0.7, 0.7, 1.0), // diffuse (medium gray)
  vec4(0.1, 0.1, 0.1, 1.0), // specular (subtle highlights)
  30                         // shininess
);

const RoverLocations = {
  curiosity: vec2(4.5895, 137.4417),
  opportunity: vec2(-1.9462, 354.4734),
  spirit: vec2(-14.5684, 175.472636),
  phoenix: vec2(68.2188, 234.2500)
};

var markers = [];

async function fetchShader(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load shader from ${url}: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  return text;
}

window.onload = async function init(){
  canvas = document.getElementById('gl-canvas');
  gl = canvas.getContext('webgl2');

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  var divContainer = document.getElementById('divcontainer');

  const [phongVertShader, phongFragShader] = await Promise.all([
    fetchShader('/webgl-resources/shaders/phong_vert.glsl'),
    fetchShader('/webgl-resources/shaders/phong_frag.glsl'),
  ]);

  const phongShaderProgram = initShadersFromSource(gl, phongVertShader, phongFragShader);

  for (const [name, coords] of Object.entries(RoverLocations)) {
    const marker = new SphereMarker(gl, name, divContainer, phongShaderProgram, 'white', 0.01, 16, 16)
    marker.configureMaterialProperties(markerMaterial, [cameraLightSource]);
    marker.coordinatePosition = coords;
    marker.textVisible = true;
    markers.push(marker);
  }

  const [gouraudVertShader, gouraudFragShader] = await Promise.all([
    fetchShader('/webgl-resources/shaders/gouraud_vert.glsl'),
    fetchShader('/webgl-resources/shaders/gouraud_frag.glsl'),
  ]);

  const model = await fetchShader('/webgl-resources/models/sphere.smf');
  const gouraudShaderProgram = initShadersFromSource(gl, gouraudVertShader, gouraudFragShader);

  smfModel = new SMFModel(gl, model, '/webgl-resources/textures/8k_mars.jpg', gouraudShaderProgram);
  smfModel.setPerspective(45 * Math.PI / 180, canvas.width / canvas.height, 0.1, 1000.0);
  smfModel.configureMaterialProperties(marsMaterial, [cameraLightSource]);

  initEventHandlers();

  render();
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  updateCameraTheta();

  const thetaRadians = degrees * Math.PI / 180;
  const eye = positionCamera(radius, thetaRadians, height);
  const at = vec3(0, 0, 0);
  const up = vec3(0, 1, 0);

  cameraLightSource._lightPos = eye;

  smfModel.setModelViewMatrix(eye, at, up);
  smfModel.draw();

  let viewMatrix = lookAt(eye, at, up);
  let modelRadius = Math.max(smfModel._size[0], smfModel._size[1], smfModel._size[2]) / 2;

  for (const marker of markers) {
    markerModelMatrix = markerModelMatrixFromLatLon(marker.coordinatePosition[0], marker.coordinatePosition[1], modelRadius + 0.01, viewMatrix);
    marker.configureMaterialProperties(markerMaterial, [cameraLightSource]);
    marker.draw(markerModelMatrix, smfModel._projectionMatrix);
  }

  requestAnimationFrame(render);
}

function positionCamera(radius, theta, height) {
  const x = radius * Math.cos(theta);
  const z = radius * Math.sin(theta);
  const y = height;
  return vec3(x, y, z);
}

function markerModelMatrixFromLatLon(lat, lon, radius, viewMatrix) {
  const lonRad = lon * Math.PI / 180;
  const latRad = lat * Math.PI / 180;

  const phi = Math.PI / 2 - latRad;
  const theta = lonRad;

  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  const translationMatrix = translate(x, y, z);
  return mult(viewMatrix, translationMatrix);
}

function updateCameraTheta() { degrees += thetaStep }

function initEventHandlers() {}