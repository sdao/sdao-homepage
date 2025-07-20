import { mat4, vec3, type Mat4 } from 'wgpu-matrix';

import {
  squiggleVertexArray,
  squiggleVertexSize,
  squiggleUVOffset,
  squigglePositionOffset,
  squiggleVertexCount,
} from './geometry';

import basicVertWGSL from './assets/basic.vert.wgsl?raw';
import vertexPositionColorWGSL from './assets/basic.frag.wgsl?raw';

type RenderData = {
  device: GPUDevice,
  uniformBindGroup: GPUBindGroup,
  renderPassDescriptor: GPURenderPassDescriptor,
  projectionMatrix: Mat4,
  modelViewProjectionMatrix: Mat4,
  uniformBuffer: GPUBuffer,
  pipeline: GPURenderPipeline,
  verticesBuffer: GPUBuffer,
};

async function setup(canvas: HTMLCanvasElement): Promise<RenderData | undefined> {
  const adapter = await navigator.gpu?.requestAdapter({
    featureLevel: 'compatibility',
  });
  const device = await adapter?.requestDevice();
  if (!device)
  {
    return;
  }

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
  const verticesBuffer = device.createBuffer({
    size: squiggleVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(verticesBuffer.getMappedRange()).set(squiggleVertexArray);
  verticesBuffer.unmap();

  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: device.createShaderModule({
        code: basicVertWGSL,
      }),
      buffers: [
        {
          arrayStride: squiggleVertexSize,
          attributes: [
            {
              // position
              shaderLocation: 0,
              offset: squigglePositionOffset,
              format: 'float32x4',
            },
            {
              // uv
              shaderLocation: 1,
              offset: squiggleUVOffset,
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
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformBindGroup = device.createBindGroup({
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

  const renderPassDescriptor: GPURenderPassDescriptor = {
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
  const projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);
  
  return {
    device,
    uniformBindGroup,
    renderPassDescriptor,
    projectionMatrix,
    modelViewProjectionMatrix: mat4.create(),
    uniformBuffer,
    pipeline,
    verticesBuffer,
  };
}

function getTransformationMatrix(renderData: RenderData) {
  const viewMatrix = mat4.identity();
  mat4.translate(viewMatrix, vec3.fromValues(0, 0, -5), viewMatrix);
  const now = Date.now() / 2000;
  mat4.rotate(
    viewMatrix,
    vec3.fromValues(Math.sin(now), Math.cos(now), 0),
    1,
    viewMatrix
  );

  mat4.multiply(renderData.projectionMatrix, viewMatrix, renderData.modelViewProjectionMatrix);

  return renderData.modelViewProjectionMatrix;
}

function frame(canvas: HTMLCanvasElement, renderData: RenderData, timestamp: DOMHighResTimeStamp) {
  const devicePixelRatio = window.devicePixelRatio;
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;

  const aspect = canvas.width / canvas.height;
  renderData.projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);

  const transformationMatrix = getTransformationMatrix(renderData);
  renderData.device.queue.writeBuffer(
    renderData.uniformBuffer,
    0,
    transformationMatrix.buffer,
    transformationMatrix.byteOffset,
    transformationMatrix.byteLength
  );
  const additional = new Float32Array([timestamp, window.devicePixelRatio]);
  renderData.device.queue.writeBuffer(
    renderData.uniformBuffer,
    4 * 16,
    additional.buffer,
    additional.byteOffset,
    additional.byteLength
  );

  for (const attachment of renderData.renderPassDescriptor.colorAttachments) {
    if (attachment) {
      attachment.view = (canvas.getContext('webgpu') as GPUCanvasContext)
        .getCurrentTexture()
        .createView();
        break;
    }
  }

  const commandEncoder = renderData.device.createCommandEncoder();
  const passEncoder = commandEncoder.beginRenderPass(renderData.renderPassDescriptor);
  passEncoder.setPipeline(renderData.pipeline);
  passEncoder.setBindGroup(0, renderData.uniformBindGroup);
  passEncoder.setVertexBuffer(0, renderData.verticesBuffer);
  passEncoder.draw(squiggleVertexCount);
  passEncoder.end();
  renderData.device.queue.submit([commandEncoder.finish()]);

  requestAnimationFrame((timestamp) => frame(canvas, renderData, timestamp));
}

export async function start(element: HTMLCanvasElement) {
  const renderData = await setup(element);
  if (renderData) {
    requestAnimationFrame((timestamp) => frame(element, renderData, timestamp));
  }
}