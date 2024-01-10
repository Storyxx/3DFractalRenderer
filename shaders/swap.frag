#version 450

precision highp float;

in vec4 uv;
layout (location = 0) out vec4 colorOut;

uniform vec2 resolution;

uniform layout(binding = 3, rgba32f) writeonly image2D lastFrame;
uniform layout(binding = 4, rgba32f) readonly image2D nextFrame;



void main() {
    vec3 average = imageLoad(nextFrame, ivec2(uv.xy * resolution)).rgb;
    imageStore(lastFrame, ivec2(uv.xy * resolution), vec4(average, 1));
    colorOut = vec4(1,0,0,1);
}