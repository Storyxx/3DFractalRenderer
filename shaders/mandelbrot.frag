#version 430

precision highp float;

in vec4 uv;
layout (location = 0) out vec4 colorOut;

uniform vec2 mouse;
uniform float time;

#define MAX_ITER 1000
#define EPSILON 0.001


float DE(vec3 pos) {
    pos /= 5.0;
	vec3 z = pos;
	float dr = 1.0;
	float r = 0.0;
    float Power = 16.0;
	for (int i = 0; i < 20 ; i++) {
		r = length(z);
		if (r>4.0) break;
		
		// convert to polar coordinates
		float theta = acos(z.z/r);
		float phi = atan(z.y,z.x);
		dr =  pow( r, Power-1.0)*Power*dr + 1.0;
		
		// scale and rotate the point
		float zr = pow( r,Power);
		theta = theta*Power;
		phi = phi*Power;
		
		// convert back to cartesian coordinates
		z = zr*vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
		z+=pos;
	}

	return 0.5*log(r)*r/dr;
}

vec3 estimateNormal(vec3 p) {
    return normalize(vec3(
        DE(vec3(p.x + EPSILON, p.y, p.z)) - DE(vec3(p.x - EPSILON, p.y, p.z)),
        DE(vec3(p.x, p.y + EPSILON, p.z)) - DE(vec3(p.x, p.y - EPSILON, p.z)),
        DE(vec3(p.x, p.y, p.z  + EPSILON)) - DE(vec3(p.x, p.y, p.z - EPSILON))
    ));
}



vec3 marchRay(vec3 pos, vec3 dir) {
    float totalDist = 0.0;

    for (int i=0; i<MAX_ITER; i++) {
        float dist = DE(pos);
        totalDist += dist;

        pos += dir*dist;

        if (dist < 0.001 || i==MAX_ITER-1) {
            vec3 normal = estimateNormal(pos);
            vec3 lightDir = normalize(vec3(1, -1, 1));

            return vec3(max(0.0, dot(normal, lightDir)));
        } else if (totalDist > 100.0) {
            return vec3(0);
        }
    }
    return vec3(1,1,0);
}


void main() {
    vec2 coord = (uv.xy*2.0 - 1.0) * 10.0;
    vec3 color = vec3(1.0,0,1.0);

    vec3 eye = vec3(sin(time)*10.0, 0, cos(time)*10.0);
    vec3 center = vec3(0, 0, 0);
    vec3 up = vec3(0, 1, 0);

    vec3 forward = normalize(center - eye);
    vec3 right = cross(forward, up);

    float fov = 1.0; // fix this

    vec3 target = forward*fov + coord.x * right + coord.y * up;

    vec3 dir = normalize(target - eye);
    vec3 pos = eye;

    color = marchRay(pos, dir);
    
    colorOut = vec4(color, 1.0);
}