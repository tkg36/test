#version 300 es
precision mediump float;

in vec3 aVertexPosition;
in vec4 aVertexColor;

uniform mat4 uMVPMatrix;
out vec4 vColor;

void main() {
    vColor = aVertexColor; // Pass through vertex color
    gl_Position = uMVPMatrix * vec4(aVertexPosition, 1.0);
}