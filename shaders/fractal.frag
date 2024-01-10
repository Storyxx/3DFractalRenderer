#version 450

precision highp float;

in vec4 uv;
layout (location = 0) out vec4 colorOut;

uniform layout(binding = 3, rgba32f) readonly image2D lastFrame;
uniform layout(binding = 4, rgba32f) writeonly image2D nextFrame;

uniform vec2 mouse;
uniform float time;
uniform int frame;
uniform vec3 eye;
uniform vec3 forward;
uniform vec2 resolution;

#define MAX_ITER 1000
#define MAX_DIST 100.0
#define EPSILON 0.001
#define PI 3.1415926353



vec3 hash( uvec3 x ) {
    const uint k = 1103515245U;
    x = ((x>>8U)^x.yzx)*k;
    x = ((x>>8U)^x.yzx)*k;
    x = ((x>>8U)^x.yzx)*k;

    return vec3(x)*(1.0/float(0xffffffffU));
}

float sdBox( vec3 p, vec3 b )
{
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}


float planeSDF(vec3 p) {
    return dot(p-vec3(0,1,0),vec3(0,-1,0));
}


/*float fractalDE(vec3 p) {
    vec3 z = p;
	float dr = 1.0;
	float r = 0.0;
    int mandelbulb_iter_num = 100;
    float mandelbulb_power = 8.0;
	for (int i = 0; i < mandelbulb_iter_num ; i++)
	{
		r = length(z);
		if (r>1.5) break;
		
		// convert to polar coordinates
		float theta = acos(z.z / r);
		float phi = atan(z.y, z.x);

		dr =  pow( r, mandelbulb_power-1.0)*mandelbulb_power*dr + 1.0;
		
		// scale and rotate the point
		float zr = pow( r,mandelbulb_power);
		theta = theta*mandelbulb_power;
		phi = phi*mandelbulb_power;
		
		// convert back to cartesian coordinates
		z = p + zr*vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
	}
	return 0.5*log(r)*r/dr;
}*/

float fractalDE(vec3 pt) {
    //pt *= 0.2;
    //pt.y += 0.8;
    float scale = 1.0;
    float iterations = 3.;

    float dist = sdBox(vec3(pt.x, pt.y, pt.z), vec3(scale));
    
    float s = 1.;
    
    float da, db, dc;
    
    for(int i = 0; i < 6; i++) {
        vec3 a = mod(pt * s, 2.0) - 1.0;
        s *= iterations;
        vec3 r = abs(1.0 - 3.0*abs(a));
        
        da = max(r.x, r.y);
        db = max(r.y, r.z);
        dc = max(r.z, r.x);
        
        float c = (min(da, min(db, dc)) - 1.) / s;
        if ( c > dist) dist = c;
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
        color = vec3(1.0,0.2,0.2);
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

        if (dist < 0.0001 || i==MAX_ITER-1) {
            return 0.0;
        } else if (totalDist > 100.0) {
            return 1.0;
        }
    }
    return 1.0;
}


vec3 secondaryRay(vec3 pos, vec3 dir, vec3 randDir) {
    float totalDist = 0.0;
    vec3 lightPos = vec3(27, -100, 89);
    lightPos += randDir*5.0;

    for (int i=0; i<MAX_ITER; i++) {
        vec3 color = vec3(0);

        float dist = colorDE(pos, color);
        totalDist += dist;

        pos += dir*dist;

        if (dist < 0.0001 || i==MAX_ITER-1) {
            vec3 normal = estimateNormal(pos);

            vec3 lightDir = normalize(lightPos - pos);

            float shadow = shadowRay(pos+normal*0.001, lightDir);

            return color*shadow;
        } else if (totalDist > 100.0) {
            return vec3(1.0);
        }
    }
    return vec3(0);
}


vec3 marchRay(vec3 pos, vec3 dir, vec3 randDir) {
    float totalDist = 0.0;
    vec3 lightPos = vec3(27, -100, 89);
    lightPos += randDir*5.0;

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

            float shadow = shadowRay(pos+normal*0.001, lightDir);
            vec3 secondary = secondaryRay(pos+normal*0.001, randDir, randDir);

            vec3 result = color * secondary + color * shadow * max(0, dot(normal, lightDir));

            result = result / (result + vec3(1.0));
            result = pow(result, vec3(1.0/2.2));

            return result;
        } else if (totalDist > 100.0) {
            return vec3(1.0); // white sky
        }
    }
    return vec3(0);
}


void main() {
    vec2 coord = (uv.xy*2.0 - 1.0) * 10.0;
    coord.x *= resolution.x / resolution.y;
    vec3 color = vec3(1.0,0,1.0);

    float theta = 2.0 * PI * (1.0-mouse.x);
    float phi = 0.01 + (PI-0.01) * mouse.y;

    vec3 forward = normalize(forward);
    vec3 right = normalize(cross(forward, vec3(0, 1, 0)));
    vec3 up = normalize(cross(right, forward));

    float fov = 20.0; // fix this

    vec3 rand = hash(uvec3(uint(uv.x*resolution.x),
                           uint(time*10.0),
                           uint(uv.y*resolution.y)));
    
    coord.xy += rand.xy*0.01;

    vec3 target = eye+ forward*fov + coord.x * right + coord.y * up;

    vec3 dir = normalize(target - eye);
    vec3 pos = eye;
    
    vec3 randDir = normalize(rand * 2.0 - 1.0);

    color = marchRay(pos, dir, randDir);

    vec3 average = imageLoad(lastFrame, ivec2(uv.xy * resolution)).rgb;
    average -= average / float(frame);
    average += color / float(frame);
    imageStore(nextFrame, ivec2(uv.xy * resolution), vec4(average, 1));

    colorOut = vec4(average, 1.0);
}