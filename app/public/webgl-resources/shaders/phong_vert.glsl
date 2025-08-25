#version 300 es
precision mediump float;

in vec3 aPosition;
in vec3 aNormal;

out vec3 vN;
out vec3 vPos;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

void main() {
  vPos = (modelViewMatrix * vec4(aPosition, 1.0)).xyz;
  vN = normalize((modelViewMatrix * vec4(aNormal, 0.0)).xyz);
  gl_Position = projectionMatrix * vec4(vPos, 1.0);
}
