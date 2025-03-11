precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform sampler2D uTexture;
uniform float uFishEyeLevel;
varying vec2 vUv;
varying vec2 vScreenPosition;

#define PI 3.1415926535897932384626433832795

float somestep(float t) {
    return pow(t, 4.0);
}

vec3 getFishEye(vec2 uv, float level) {
    float len = length(uv);
    float a = len * level;
    return vec3(uv / len * sin(a), -cos(a));
}

vec3 textureAVG(sampler2D tex, vec3 tc) {
    const float diff0 = 0.35;
    const float diff1 = 0.12;
    vec2 flippedCoord = vec2(tc.x, 1.0 - tc.y);
    vec3 s0 = texture2D(tex, flippedCoord).xyz;
    vec3 s1 = texture2D(tex, (vec2(flippedCoord.x + diff0, flippedCoord.y))).xyz;
    vec3 s2 = texture2D(tex, (vec2(flippedCoord.x - diff0, flippedCoord.y))).xyz;
    vec3 s3 = texture2D(tex, (vec2(flippedCoord.x - diff0, flippedCoord.y + diff0))).xyz;
    vec3 s4 = texture2D(tex, (vec2(flippedCoord.x + diff0, flippedCoord.y - diff0))).xyz;
    
    vec3 s5 = texture2D(tex, (vec2(flippedCoord.x + diff1, flippedCoord.y))).xyz;
    vec3 s6 = texture2D(tex, (vec2(flippedCoord.x - diff1, flippedCoord.y))).xyz;
    vec3 s7 = texture2D(tex, (vec2(flippedCoord.x - diff1, flippedCoord.y + diff1))).xyz;
    vec3 s8 = texture2D(tex, (vec2(flippedCoord.x + diff1, flippedCoord.y - diff1))).xyz;
    
    return (s0 + s1 + s2 + s3 + s4 + s5 + s6 + s7 + s8) * 0.111111111;
}

vec3 textureBlured(sampler2D tex, vec3 tc) {
    vec3 r = textureAVG(tex, vec3(1.0, 0.0, 0.0));
    vec3 t = textureAVG(tex, vec3(0.0, 1.0, 0.0));
    vec3 f = textureAVG(tex, vec3(0.0, 0.0, 1.0));
    vec3 l = textureAVG(tex, vec3(-1.0, 0.0, 0.0));
    vec3 b = textureAVG(tex, vec3(0.0, -1.0, 0.0));
    vec3 a = textureAVG(tex, vec3(0.0, 0.0, -1.0));
    
    float kr = dot(tc, vec3(1.0, 0.0, 0.0)) * 0.5 + 0.5;
    float kt = dot(tc, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
    float kf = dot(tc, vec3(0.0, 0.0, 1.0)) * 0.5 + 0.5;
    float kl = 1.0 - kr;
    float kb = 1.0 - kt;
    float ka = 1.0 - kf;
    
    kr = somestep(kr);
    kt = somestep(kt);
    kf = somestep(kf);
    kl = somestep(kl);
    kb = somestep(kb);
    ka = somestep(ka);
    
    float d;
    vec3 ret;
    ret = f * kf; d = kf;
    ret += a * ka; d += ka;
    ret += l * kl; d += kl;
    ret += r * kr; d += kr;
    ret += t * kt; d += kt;
    ret += b * kb; d += kb;
    
    return ret / d;
}

vec3 getColor(vec3 ray) {
    vec2 baseUV = ray.xy;
    baseUV = (baseUV + 1.0) * 0.5;
    baseUV.y = 1.0 - baseUV.y;
    
    vec3 baseColor = texture2D(uTexture, baseUV).xyz;
    return baseColor;
}

void main() {
    vec2 uv = vScreenPosition.xy;
    
    // Корректируем соотношение сторон для полного заполнения экрана
    float aspect = uResolution.x / uResolution.y;
    uv.x *= aspect;
    
    // Применяем эффект рыбьего глаза
    vec3 dir = getFishEye(uv, uFishEyeLevel);
    
    float c = cos(uTime);
    float s = sin(uTime);
    dir.xz = vec2(dir.x * c - dir.z * s, dir.x * s + dir.z * c);
    
    // Уменьшаем виньетирование
    float fish_eye = smoothstep(2.0, 1.6, length(uv)) * 0.15 + 0.85;
    gl_FragColor = vec4(getColor(dir) * fish_eye, 1.0);
}