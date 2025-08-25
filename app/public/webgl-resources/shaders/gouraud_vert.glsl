#version 300 es
precision mediump float;

#define MAX_LIGHTS 8
uniform int uTotalLightSources;

in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexCoord;
out vec4 vColor;
out vec2 vTexCoord;
uniform vec4 ambientProducts[MAX_LIGHTS];
uniform vec4 diffuseProducts[MAX_LIGHTS];
uniform vec4 specularProducts[MAX_LIGHTS];
uniform vec3 lightPositions[MAX_LIGHTS];
uniform float shininess;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

void main()
{
  vec3 pos = (modelViewMatrix * vec4(aPosition, 1.0)).xyz;
  vec3 N = normalize( (modelViewMatrix*vec4(aNormal, 0.0)).xyz);

  vec3 totalAmbient = vec3(0.0);
  vec3 totalDiffuse = vec3(0.0);
  vec3 totalSpecular = vec3(0.0);

  for (int i = 0; i < uTotalLightSources; i++) {
    vec3 lightPosView = (modelViewMatrix * vec4(lightPositions[i], 1.0)).xyz;
    vec3 L = normalize(lightPosView - pos);
    vec3 E = normalize( -pos );
    vec3 H = normalize( L + E );

    vec3 ambient = ambientProducts[i].rgb;
    float diffuseTerm = max( dot(L, N), 0.0 );
    vec3 diffuse = diffuseTerm*diffuseProducts[i].rgb;
    float specularTerm = pow( max(dot(N, H), 0.0), shininess );
    vec3 specular = specularTerm * specularProducts[i].rgb;
    if( dot(L, N) < 0.0 ) specular = vec3(0.0, 0.0, 0.0);

    totalAmbient += ambient;
    totalDiffuse += diffuse;
    totalSpecular += specular;
  }

  gl_Position = projectionMatrix * vec4(pos, 1.0);
  vColor = vec4(min(totalAmbient + totalDiffuse + totalSpecular, 1.0), 1.0);
  vTexCoord = aTexCoord;
}