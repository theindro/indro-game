import {Filter, GlProgram} from "pixi.js";

export function createLightingFilter(app) {
    // Use PixiJS standard vertex shader
    const vertex = `
        in vec2 aPosition;
        out vec2 vTextureCoord;
        
        uniform vec4 uInputSize;
        uniform vec4 uOutputFrame;
        uniform vec4 uOutputTexture;
        
        vec4 filterVertexPosition( void )
        {
            vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
            
            position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
            position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
            
            return vec4(position, 0.0, 1.0);
        }
        
        vec2 filterTextureCoord( void )
        {
            return aPosition * (uOutputFrame.zw * uInputSize.zw);
        }
        
        void main(void)
        {
            gl_Position = filterVertexPosition();
            vTextureCoord = filterTextureCoord();
        }
    `;

    const fragment = `
    in vec2 vTextureCoord;
    uniform sampler2D uTexture;
    
    uniform vec2 uResolution;
    uniform int uLightCount;
    uniform vec3 uLights[32];  // x, y, radius (intensity implied)
    uniform float uAmbient;
    
    void main(void)
    {
        vec4 color = texture2D(uTexture, vTextureCoord);
        
        // Convert UV to pixel coordinates
        vec2 pixelCoord = vTextureCoord * uResolution;
        
        float lightIntensity = uAmbient;
        
        for (int i = 0; i < 32; i++) {
            if (i >= uLightCount) break;
            
            vec3 light = uLights[i];
            float dist = distance(pixelCoord, light.xy);
            float radius = light.z;
            
            // Light falloff with intensity (radius includes intensity scaling)
            float strength = 1.0 - smoothstep(0.0, radius, dist);
            
            // You can modify this to use separate intensity if needed
            // float intensity = 1.0; // or extract from w component if you add it
            
            lightIntensity += strength;
        }
        
        // Clamp and apply lighting
        lightIntensity = clamp(lightIntensity, 0.0, 1.5); // Allow over-bright
        
        // Apply lighting by multiplying color
        color.rgb *= lightIntensity;
        
        gl_FragColor = color;
    }
`;

    const filter = new Filter({
        glProgram: new GlProgram({
            vertex: vertex,
            fragment: fragment
        }),
        resources: {
            lightingUniforms: {
                uResolution: { value: [app.screen.width, app.screen.height], type: 'vec2<f32>' },
                uAmbient: { value: 0.2, type: 'f32' },
                uLightCount: { value: 0, type: 'i32' },
                uLights: { value: new Float32Array(32 * 3), type: 'vec3<f32>' }
            }
        }
    });

    function updateLighting(lightSources, cameraX, cameraY) {
        const uniforms = filter.resources.lightingUniforms.uniforms;

        // Set light count
        const count = Math.min(lightSources.length, 32);

        uniforms.uLightCount = count;

        // Get screen center
        const screenCenterX = app.screen.width / 2  / 1.25;
        const screenCenterY = app.screen.height / 2 / 1.25 ;

        console.log('Screen center:', screenCenterX, screenCenterY);
        console.log('Camera:', cameraX, cameraY);
        console.log('Light count:', count);


        // Update light positions
        for (let i = 0; i < count; i++) {
            const light = lightSources[i];
            // Transform world to screen coordinates
            const screenX = screenCenterX + (light.x - cameraX);
            const screenY = screenCenterY + (light.y - cameraY);

            console.log(light);

            uniforms.uLights[i*3] = screenX;
            uniforms.uLights[i*3+1] = screenY;
            uniforms.uLights[i*3+2] = light.radius;

            console.log(`Light ${i}: world(${light.x}, ${light.y}) → screen(${screenX}, ${screenY}) radius:${light.radius}`);
        }

        // Re-upload the array to the GPU
        filter.resources.lightingUniforms.update();
    }

    return { filter, updateLighting };
}