#version 430

precision highp float;

uniform mat4 transform;
uniform mat4 texMatrix;

in vec4 position;
in vec2 texCoord;

out vec4 uv;

void main() {
  gl_Position = transform * position;
  uv = texMatrix * vec4(texCoord, 1.0, 1.0);
}