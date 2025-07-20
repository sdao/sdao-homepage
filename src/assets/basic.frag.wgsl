struct Uniforms {
  modelViewProjectionMatrix : mat4x4f,
  time: f32,
  pixel_ratio: f32,
}
@binding(0) @group(0) var<uniform> uniforms : Uniforms;

const bayerMatrix4x4: mat4x4f = mat4x4(
    0.0,  8.0,  2.0, 10.0,
    12.0, 4.0,  14.0, 6.0,
    3.0,  11.0, 1.0, 9.0,
    15.0, 7.0,  13.0, 5.0
) * (1.0/16.0);

const bias = 0;

fn orderedDither(uv: vec2f, lum: f32,) -> f32 {
  let x = i32(uv.x / uniforms.pixel_ratio) % 4;
  let y = i32(uv.y / uniforms.pixel_ratio) % 4;
  let threshold = bayerMatrix4x4[y][x];

  if (lum < threshold + bias) {
      return 0.0;
  } else {
      return 1.0;
  }
}

@fragment
fn main(
  @location(0) fragUV: vec2f,
  @location(1) fragPosition: vec4f,
  @builtin(position) screenPos: vec4f
) -> @location(0) vec4f {
  return vec4f(0.0, 0.0, 0.0, orderedDither(vec2f(screenPos.x, screenPos.y), fragUV.x));
}
