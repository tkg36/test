#version 300 es
precision mediump float;

in vec4 vColor;
in vec2 vTexCoord;
out vec4 fColor;

uniform sampler2D uTexture;

void main()
{
  vec4 texColor = texture(uTexture, vTexCoord);
  fColor = vColor * texColor;
}
