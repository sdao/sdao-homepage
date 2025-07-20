import { mat4, vec3 } from 'wgpu-matrix';

import {
  squiggleVertexarray,
  cubeVertexSize,
  cubeUVOffset,
  cubePositionOffset,
  cubeVertexCount,
} from './cube';

import basicVertWGSL from './assets/basic.vert.wgsl?raw';
import vertexPositionColorWGSL from './assets/basic.frag.wgsl?raw';
// import { quitIfWebGPUNotAvailable } from '../util';

let device: GPUDevice | undefined;
let uniformBindGroup: GPUBindGroup | undefined;
let renderPassDescriptor: GPURenderPassDescriptor | undefined;
let projectionMatrix = mat4.create();
const modelViewProjectionMatrix = mat4.create();
let uniformBuffer: GPUBuffer | undefined;
let pipeline: GPURenderPipeline | undefined;
let verticesBuffer: GPUBuffer | undefined;

async function setup(canvas: HTMLCanvasElement)
{
  // const canvas = document.querySelector('canvas') as HTMLCanvasElement;
  const adapter = await navigator.gpu?.requestAdapter({
    featureLevel: 'compatibility',
  });
  device = await adapter?.requestDevice();
  if (!device)
  {
    return;
  }
  // quitIfWebGPUNotAvailable(adapter, device);

  const context = canvas.getContext('webgpu') as GPUCanvasContext;

  const devicePixelRatio = window.devicePixelRatio;
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  // Create a vertex buffer from the cube data.
  verticesBuffer = device.createBuffer({
    size: squiggleVertexarray.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(verticesBuffer.getMappedRange()).set(squiggleVertexarray);
  verticesBuffer.unmap();

  pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: device.createShaderModule({
        code: basicVertWGSL,
      }),
      buffers: [
        {
          arrayStride: cubeVertexSize,
          attributes: [
            {
              // position
              shaderLocation: 0,
              offset: cubePositionOffset,
              format: 'float32x4',
            },
            {
              // uv
              shaderLocation: 1,
              offset: cubeUVOffset,
              format: 'float32x2',
            },
          ],
        },
      ],
    },
    fragment: {
      module: device.createShaderModule({
        code: vertexPositionColorWGSL,
      }),
      targets: [
        {
          format: presentationFormat,
          blend: {
              color: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha'
              },
              alpha: {
                operation: 'max',
                srcFactor: 'one',
                dstFactor: 'one'
              },
            },
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',

      // Backface culling since the cube is solid piece of geometry.
      // Faces pointing away from the camera will be occluded by faces
      // pointing toward the camera.
      cullMode: 'back',
    },
  });

  const uniformBufferSize = 4 * 16 + 16; // 4x4 matrix + 3 floats and padding
  uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  uniformBindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
        },
      },
    ],
  });

  renderPassDescriptor = {
    colorAttachments: [
      {
        view: context
    .getCurrentTexture()
    .createView(),

        clearValue: [0.0, 0.0, 0.0, 0.0],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };

  const aspect = canvas.width / canvas.height;
  projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);
  // const modelViewProjectionMatrix = mat4.create();
}

function getTransformationMatrix() {
  const viewMatrix = mat4.identity();
  mat4.translate(viewMatrix, vec3.fromValues(0, 0, -5), viewMatrix);
  const now = Date.now() / 2000;
  mat4.rotate(
    viewMatrix,
    vec3.fromValues(Math.sin(now), Math.cos(now), 0),
    1,
    viewMatrix
  );

  mat4.multiply(projectionMatrix, viewMatrix, modelViewProjectionMatrix);

  return modelViewProjectionMatrix;
}

function frame(canvas: HTMLCanvasElement, timestamp: DOMHighResTimeStamp) {
  if (!device || !renderPassDescriptor || !uniformBuffer || !pipeline)
  {
    return;
  }
  const devicePixelRatio = window.devicePixelRatio;
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;

  const aspect = canvas.width / canvas.height;
  projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);

  const transformationMatrix = getTransformationMatrix();
  device.queue.writeBuffer(
    uniformBuffer,
    0,
    transformationMatrix.buffer,
    transformationMatrix.byteOffset,
    transformationMatrix.byteLength
  );
  const additional = new Float32Array([timestamp, window.devicePixelRatio]);
  device.queue.writeBuffer(
    uniformBuffer,
    4 * 16,
    additional.buffer,
    additional.byteOffset,
    additional.byteLength
  );

  for (const foo of renderPassDescriptor.colorAttachments)
  {
    if (foo)
    {
      foo.view = (canvas.getContext('webgpu') as GPUCanvasContext)
        .getCurrentTexture()
        .createView();
        break;
    }
  }

  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, uniformBindGroup);
  passEncoder.setVertexBuffer(0, verticesBuffer);
  passEncoder.draw(cubeVertexCount);
  passEncoder.end();
  device.queue.submit([commandEncoder.finish()]);

  requestAnimationFrame((timestamp) => frame(canvas, timestamp));
}

export async function start(element: HTMLCanvasElement) {
  await setup(element);
  requestAnimationFrame((timestamp) => frame(element, timestamp));
}