#version 430

precision highp float;

in vec4 uv;
layout (location = 0) out vec4 colorOut;

uniform vec2 mouse;
uniform float time;

vec2 multComplex(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

void main() {
    vec2 coord = (uv.xy - 0.5)*2.0;// + (mouse*2.0-1.0);

    vec2 x = vec2(coord); //fract(time)
    float maxIterations = 100.0;
    float steps = 1.0;
    float r = mix(0.0, 4.0, mouse.x);

    while (steps < maxIterations) {
        //x = multComplex(x,x) + coord;

        //x.x = r * x.x * (1.0 - x.x);
        x = multComplex(r * x, vec2(1, 0.1) - x);

        /*if (abs(x.x)+abs(x.y) > 16.0) { // 16 is infinity
            break;
        }*/
        steps += 1.0;
    }
    colorOut = vec4(x, 0.0, 1.0);
    //colorOut = vec4(steps / maxIterations, 0.0, 0.0, 1.0);
}