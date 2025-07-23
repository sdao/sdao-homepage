# Steven Dao's Homepage

This is based on the Cloudflare Workers React/TypeScript/Vite template.

## Contact Info

Update the contact info by directly editing `App.tsx`.

## WebGPU Animation

The animation is a static mesh that simply rotates, with the animated shading controlled by passing
the time into the shader and fading the alpha via the UVs.

The mesh is constructed in `squiggle.blend` using Blender, and then exported to text via
`squiggle.py`. The text files are arrays that can be dropped into `geometry.ts`.

WebGPU is supported in Chrome and Firefox 141 (for Windows).
