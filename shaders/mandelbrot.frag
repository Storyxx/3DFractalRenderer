#version 450

precision highp float;

in vec4 uv;
layout (location = 0) out vec4 colorOut;

uniform layout(binding = 3, rgba32f) readonly image2D lastFrame;
uniform layout(binding = 4, rgba32f) writeonly image2D nextFrame;

uniform vec2 mouse;
uniform float time;
//uniform sampler2D accumulation;
uniform int frame;

#define MAX_ITER 100
#define EPSILON 0.001
#define PI 3.1415926353



vec3 hash( uvec3 x ) {
    const uint k = 1103515245U;
    x = ((x>>8U)^x.yzx)*k;
    x = ((x>>8U)^x.yzx)*k;
    x = ((x>>8U)^x.yzx)*k;

    return vec3(x)*(1.0/float(0xffffffffU));
}



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

float fractalDE(vec3 p) {
    float t = -0.5;
    p.xz = abs(p.xz);
    p.xz *= mat2(cos(PI*-0.25), -sin(PI*-0.25),
                 sin(PI*-0.25), cos(PI*-0.25));

    float dist = rootsSDF(p);

    for (float i=0; i<8; i+=1.0) {
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

float DE(vec3 p) {
    float planeDist = planeSDF(p);
    float fractalDist = fractalDE(p);
    return min(planeDist, fractalDist);
}

float colorDE(vec3 p, out vec3 color) {
    float planeDist = planeSDF(p);
    float fractalDist = fractalDE(p);
    float dist = min(planeDist, fractalDist);

    if (dist == planeDist) {
        color = vec3(1,0.8,0.2);
    } else {
        color = vec3(1,1,1);
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

    for (int i=0; i<MAX_ITER; i++) {
        float dist = DE(pos);
        totalDist += dist;

        pos += dir*dist;

        if (dist < 0.001 || i==MAX_ITER-1) {
            return 0.0;
        } else if (totalDist > 100.0) {
            return 1.0;
        }
    }
    return 1.0;
}


vec3 secondaryRay(vec3 pos, vec3 dir, vec3 randDir) {
    float totalDist = 0.0;
    vec3 lightPos = vec3(5, -10, 10);
    lightPos += randDir*0.5;

    for (int i=0; i<MAX_ITER; i++) {
        vec3 color = vec3(0);

        float dist = colorDE(pos, color);
        totalDist += dist;

        pos += dir*dist;

        if (dist < 0.001 || i==MAX_ITER-1) {
            vec3 normal = estimateNormal(pos);

            vec3 lightDir = normalize(lightPos - pos);

            float shadow = shadowRay(pos+normal*0.01, lightDir);

            return color*shadow;
        } else if (totalDist > 100.0) {
            return vec3(1.0);//vec3(max(0.0, dot(-lightDir, dir)));
        }
    }
    return vec3(0);
}


vec3 marchRay(vec3 pos, vec3 dir, vec3 randDir) {
    float totalDist = 0.0;
    vec3 lightPos = vec3(5, -10, 10);
    lightPos += randDir*0.5;

    for (int i=0; i<MAX_ITER; i++) {
        vec3 color = vec3(0);

        float dist = colorDE(pos, color);
        totalDist += dist;

        pos += dir*dist;

        if (dist < 0.001 || i==MAX_ITER-1) {
            vec3 normal = estimateNormal(pos);

            if (dot(randDir, normal) < 0.0) {
                randDir *= -1;
            }

            vec3 lightDir = normalize(lightPos - pos);

            float shadow = shadowRay(pos+normal*0.01, lightDir);
            vec3 secondary = secondaryRay(pos+normal*0.01, randDir, randDir);

            vec3 result = color * secondary + color * shadow;

            result = result / (result + vec3(1.0));
            result = pow(result, vec3(1.0/2.2));

            return result;
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

    vec3 rand = hash(uvec3(uint(uv.x*800.0),
                              uint(time*10.0),
                              uint(uv.y*800.0)));
    
    coord.xy += rand.xy*0.01;

    vec3 target = forward*fov + coord.x * right + coord.y * up;

    vec3 dir = normalize(target - eye);
    vec3 pos = eye;
    
    vec3 randDir = normalize(rand * 2.0 - 1.0);

    color = marchRay(pos, dir, randDir);

    /*vec3 average = texture(accumulation, vec2(uv.x, 1.0-uv.y)).rgb;
    average -= average / float(frame);
    average += color / float(frame);*/
    
    //colorOut = vec4(average, 1.0);

    vec3 average = imageLoad(lastFrame, ivec2(uv.xy * 800.0)).rgb;
    average -= average / float(frame);
    average += color / float(frame);
    imageStore(nextFrame, ivec2(uv.xy * 800), vec4(average, 1));

    colorOut = vec4(average, 1.0);
}