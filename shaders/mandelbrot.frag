#version 430

precision highp float;

in vec4 uv;
layout (location = 0) out vec4 colorOut;

uniform vec2 mouse;
uniform float time;

#define MAX_ITER 1000
#define EPSILON 0.001
#define PI 3.1415926353


float boxSDF(vec3 p, vec3 b) {
    float r = 0.1;
    vec3 q = abs(p) - b;
    return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float planeSDF(vec3 p) {
    return dot(p-vec3(0,1,0),vec3(0,-1,0));
}

float rootsSDF(vec3 p) {
    float b1 = boxSDF(p, vec3(0.2, 1, 0.2));
    float b2 = boxSDF(p-vec3(0.2,0,0), vec3(1, 0.1, 0.1));
    float b3 = boxSDF(p-vec3(1.1,0.5,0), vec3(0.1, 0.5, 0.1));
    return min(min(b1, b2),b3);
}

float DE(vec3 p) {
    float dist = planeSDF(p);

    float t = -0.5;
    p.xz = abs(p.xz);
    p.xz *= mat2(cos(PI*-0.25), -sin(PI*-0.25),
                 sin(PI*-0.25), cos(PI*-0.25));

    dist = min(dist, rootsSDF(p));

    for (float i=0; i<10; i+=1.0) {
        float scale = pow(2.0, i);
        vec3 p2 = p-vec3(1.1,0.5,0)/scale;
        p2.xz *= mat2(cos(PI*0.25), -sin(PI*0.25),
                      sin(PI*0.25), cos(PI*0.25));
        p2.xz = abs(p2.xz);
        p2.xz *= mat2(cos(PI*-0.25), -sin(PI*-0.25),
                      sin(PI*-0.25), cos(PI*-0.25));
        float dist2 = rootsSDF(p2*2.0*scale)*(0.5/scale);
        dist = min(dist, dist2);
        p = p2;
    }


    return dist;
}

vec3 estimateNormal(vec3 p) {
    return normalize(vec3(
        DE(vec3(p.x + EPSILON, p.y, p.z)) - DE(vec3(p.x - EPSILON, p.y, p.z)),
        DE(vec3(p.x, p.y + EPSILON, p.z)) - DE(vec3(p.x, p.y - EPSILON, p.z)),
        DE(vec3(p.x, p.y, p.z  + EPSILON)) - DE(vec3(p.x, p.y, p.z - EPSILON))
    ));
}



float shadowRay(vec3 pos, vec3 dir) {
    float totalDist = 0.0;
    float minDist = 100000.0;

    for (int i=0; i<MAX_ITER; i++) {
        float dist = DE(pos);
        totalDist += dist;
        minDist = min(minDist, dist);

        pos += dir*dist;

        if (dist < 0.001 || i==MAX_ITER-1) {
            return 0.0;
        } else if (totalDist > 100.0) {
            return 1.0;
        }
    }
    return 1.0;
}


vec3 marchRay(vec3 pos, vec3 dir) {
    float totalDist = 0.0;

    for (int i=0; i<MAX_ITER; i++) {
        float dist = DE(pos);
        totalDist += dist;

        pos += dir*dist;

        if (dist < 0.001 || i==MAX_ITER-1) {
            vec3 normal = estimateNormal(pos);
            vec3 lightDir = normalize(vec3(sin(time), -1, cos(time)));

            float shadow = shadowRay(pos+normal*0.01, lightDir);

            return vec3(max(0.0, dot(normal, lightDir)))*shadow + vec3(0.1);
        } else if (totalDist > 100.0) {
            return vec3(0);
        }
    }
    return vec3(1,1,0);
}


void main() {
    vec2 coord = (uv.xy*2.0 - 1.0) * 10.0;
    vec3 color = vec3(1.0,0,1.0);

    float theta = 2.0 * PI * (1.0-mouse.x);
    float phi = 0.01 + (PI-0.01) * mouse.y;

    vec3 eye = vec3(sin(phi)*sin(theta), cos(phi), sin(phi)*cos(theta)) * 5.0;
    vec3 center = vec3(0, 0, 0);

    vec3 forward = normalize(center - eye);
    vec3 right = normalize(cross(forward, vec3(0, 1, 0)));
    vec3 up = cross(right, forward);

    float fov = 10.0; // fix this

    vec3 target = forward*fov + coord.x * right + coord.y * up;

    vec3 dir = normalize(target - eye);
    vec3 pos = eye;

    color = marchRay(pos, dir);
    
    colorOut = vec4(color, 1.0);
}