import * as THREE from 'three';

// Hologram treatment for the Durk figure.
//
// This is deliberately implemented as an `onBeforeCompile` patch on the
// model's own MeshStandardMaterials rather than a material swap. Two reasons:
//
//  1. At uHologram = 0 the patched shader is byte-for-byte the previous
//     behaviour (the saturation lerp that already lived in DurkModel), so the
//     Vault's signed-off textures + RoomEnvironment lighting are untouched.
//  2. Materialization can then blend per-fragment between "hologram" and the
//     real shaded result, which a swap cannot do — the scan line needs real
//     lighting below it and wireframe ghost above it in the same draw.
//
// The "wire mesh" is a world-space lattice computed in the fragment shader,
// NOT a wireframe overlay mesh. The colored model is ~450k triangles; a real
// wireframe pass would be ~1.3M line segments and would kill mobile.

export const HOLO_DEFAULT_COLOR = '#00e5ff';

/**
 * One uniform set is shared by every material on the figure, so driving the
 * animation each frame is a handful of scalar writes instead of a traverse.
 */
export function createHologramUniforms(color = HOLO_DEFAULT_COLOR) {
  return {
    uSaturation: { value: 0 },
    uTime: { value: 0 },
    uHologram: { value: 0 },
    uReveal: { value: 0 },
    uGlitch: { value: 0 },
    uHoloColor: { value: new THREE.Color(color) },
    uHoloMinY: { value: 0 },
    uHoloMaxY: { value: 1 },
    uWireScale: { value: 8 },
  };
}

const VERT_HEAD = /* glsl */ `
uniform float uTime;
uniform float uGlitch;
varying vec3 vHoloPos;
varying vec3 vHoloNormal;
`;

// Horizontal slice displacement — the "shatter"/datamosh half of the
// materialization. Slices are quantised in world Y so whole bands of the
// figure kick sideways together instead of the mesh boiling.
const VERT_BODY = /* glsl */ `
#include <begin_vertex>
vec4 cmWorld = modelMatrix * vec4(transformed, 1.0);
float cmSlice = floor(cmWorld.y * 16.0 + floor(uTime * 18.0));
float cmRand = fract(sin(cmSlice * 78.233) * 43758.5453);
transformed.x += uGlitch * step(0.78, cmRand) * (cmRand - 0.5) * 1.1;
transformed.z += uGlitch * step(0.90, cmRand) * (cmRand - 0.5) * 0.5;
vHoloPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
`;

const FRAG_HEAD = /* glsl */ `
uniform float uSaturation;
uniform float uTime;
uniform float uHologram;
uniform float uReveal;
uniform float uGlitch;
uniform vec3  uHoloColor;
uniform float uHoloMinY;
uniform float uHoloMaxY;
uniform float uWireScale;
varying vec3 vHoloPos;
varying vec3 vHoloNormal;
`;

// The figure's color lives in baseColorTexture, where mat.color is white — so
// lerping mat.color can't desaturate it. Lerp diffuseColor toward its own
// luminance instead, which covers textured and untextured materials alike.
const FRAG_SATURATION = /* glsl */ `
#include <color_fragment>
float cmLum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
diffuseColor.rgb = mix(vec3(cmLum), diffuseColor.rgb, uSaturation);
`;

const FRAG_HOLOGRAM = /* glsl */ `
#include <dithering_fragment>
if (uHologram > 0.001) {
  float cmSpan = max(uHoloMaxY - uHoloMinY, 0.0001);

  // Materialization line, in world Y. uReveal 0 parks it just below the
  // figure (all hologram); uReveal 1 parks it just above (all real).
  float cmLine = mix(uHoloMinY - cmSpan * 0.08, uHoloMaxY + cmSpan * 0.08, uReveal);
  float cmStillHolo = smoothstep(cmLine - cmSpan * 0.05, cmLine + cmSpan * 0.05, vHoloPos.y);
  float cmH = uHologram * cmStillHolo;

  vec3 cmV = normalize(cameraPosition - vHoloPos);
  vec3 cmN = normalize(vHoloNormal);
  float cmFres = pow(1.0 - clamp(abs(dot(cmV, cmN)), 0.0, 1.0), 2.2);

  // World-space lattice reading as a wire mesh over the surface.
  vec3 cmLat = abs(fract(vHoloPos * uWireScale) - 0.5);
  float cmD = min(min(cmLat.x, cmLat.y), cmLat.z);
  float cmWire = 1.0 - smoothstep(0.0, 0.04, cmD);

  // Interference bands drifting up the figure.
  float cmScan = 0.5 + 0.5 * sin(vHoloPos.y * 28.0 - uTime * 3.5);
  float cmBands = smoothstep(0.55, 1.0, cmScan);

  // Continuous diagnostic probe sweeping the figure while it sits unclaimed.
  float cmProbeY = mix(uHoloMinY, uHoloMaxY, fract(uTime * 0.22));
  float cmProbe = exp(-pow((vHoloPos.y - cmProbeY) / (cmSpan * 0.05), 2.0));

  float cmAlpha = clamp(0.05 + cmFres * 0.80 + cmWire * 0.50 + cmBands * 0.10 + cmProbe * 0.40, 0.0, 1.0);
  vec3 cmCol = uHoloColor * (0.30 + cmFres * 2.0 + cmWire * 1.05 + cmBands * 0.35)
             + vec3(cmProbe * 0.85 + pow(cmFres, 6.0) * 1.25);

  // White-hot edge riding the materialization line. Peaks mid-sweep and is
  // zero at both ends, so no uniform is needed to gate it.
  float cmEdgeAmt = 4.0 * uReveal * (1.0 - uReveal);
  float cmEdge = exp(-pow((vHoloPos.y - cmLine) / (cmSpan * 0.03), 2.0)) * cmEdgeAmt;

  gl_FragColor.rgb = mix(gl_FragColor.rgb, cmCol, cmH) + uHoloColor * cmEdge * 1.5 + vec3(cmEdge * 0.55);
  gl_FragColor.a = clamp(mix(gl_FragColor.a, cmAlpha, cmH) + cmEdge * 0.5 + uGlitch * 0.1, 0.0, 1.0);
}
`;

/**
 * Patch a material once and wire it to the shared uniform set.
 * Safe to call repeatedly — subsequent calls are no-ops.
 */
export function patchHologramMaterial(material, uniforms) {
  if (material.userData.cmHoloPatched) return;
  material.userData.cmHoloPatched = true;
  material.userData.cmHoloOriginalState = {
    transparent: material.transparent,
    depthWrite: material.depthWrite,
    side: material.side,
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = VERT_HEAD + shader.vertexShader
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvHoloNormal = normalize(mat3(modelMatrix) * objectNormal);')
      .replace('#include <begin_vertex>', VERT_BODY);

    shader.fragmentShader = FRAG_HEAD + shader.fragmentShader
      .replace('#include <color_fragment>', FRAG_SATURATION)
      .replace('#include <dithering_fragment>', FRAG_HOLOGRAM);
  };

  material.needsUpdate = true;
}

/**
 * Ghost render state. depthWrite off + transparent is what lets you see the
 * far side of the figure through the near side; culling stays on (FrontSide)
 * so the fragment cost does not double on phones.
 */
export function setHologramRenderState(material, active) {
  const original = material.userData.cmHoloOriginalState;
  if (!original) return;

  if (active) {
    material.transparent = true;
    material.depthWrite = false;
    material.side = THREE.FrontSide;
  } else {
    material.transparent = original.transparent;
    material.depthWrite = original.depthWrite;
    material.side = original.side;
  }
}

/** Run `fn` over every material in a subtree. */
export function forEachMaterial(root, fn) {
  root.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach(fn);
  });
}
