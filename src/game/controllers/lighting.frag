precision mediump float;

varying vec2 vTextureCoord;
uniform sampler2D uTexture;

uniform vec2 uResolution;
uniform int uLightCount;
uniform vec3 uLights[32];
uniform float uAmbient;

void main() {

    vec2 uv = vTextureCoord * uResolution;

    float light = uAmbient;

    for (int i = 0; i < 32; i++) {
        if (i >= uLightCount) break;

        vec3 l = uLights[i];

        float dist = distance(uv, l.xy);

        float strength = 1.0 - smoothstep(0.0, l.z, dist);

        light += strength;
    }

    light = clamp(light, 0.0, 1.0);

    vec4 color = texture2D(uTexture, vTextureCoord);

    color.rgb *= light;

    gl_FragColor = color;
}