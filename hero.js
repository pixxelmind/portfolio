// A single native WebGL pass keeps the glass sculpture independent of a 3D library.
const canvas = document.querySelector('#glass-canvas');

if (canvas) initGlass(canvas);

function initGlass(canvas) {
  const surface = canvas.parentElement;
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: 'low-power',
  });
  if (!gl) return;

  const vertexSource = `
    attribute vec2 a_position;
    void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
  `;
  const fragmentSource = `
    precision highp float;
    uniform vec2 u_resolution;
    uniform vec2 u_pointer;
    uniform float u_time;

    mat2 rotate(float a) {
      float s = sin(a), c = cos(a);
      return mat2(c, -s, s, c);
    }

    // The elliptical section turns along a gently triangular ring, like folded glass.
    float sculpture(vec3 p) {
      p.xz = rotate(0.48 + sin(u_time * 0.19) * 0.12 + u_pointer.x * 0.15) * p.xz;
      p.yz = rotate(-0.31 + cos(u_time * 0.17) * 0.08 - u_pointer.y * 0.11) * p.yz;
      p.xy = rotate(-0.37 + sin(u_time * 0.12) * 0.07) * p.xy;
      float a = atan(p.y, p.x);
      float ring = 1.02 + 0.10 * cos(a * 3.0 + 0.6);
      vec2 q = vec2(length(p.xy) - ring, p.z);
      q = rotate(a * 1.5 + 0.55) * q;
      vec2 radii = vec2(0.30, 0.56);
      float k0 = length(q / radii);
      float k1 = length(q / (radii * radii));
      return k0 * (k0 - 1.0) / max(k1, 0.0001) * 0.72;
    }

    vec3 normalAt(vec3 p) {
      vec2 e = vec2(0.0014, -0.0014);
      return normalize(
        e.xyy * sculpture(p + e.xyy) +
        e.yyx * sculpture(p + e.yyx) +
        e.yxy * sculpture(p + e.yxy) +
        e.xxx * sculpture(p + e.xxx)
      );
    }

    // Broad studio softboxes create the long, curved highlights of polished glass.
    vec3 environment(vec3 d) {
      vec3 color = vec3(0.035, 0.025, 0.065);
      float violet = pow(max(dot(d, normalize(vec3(-0.8, 0.3, -0.3))), 0.0), 3.0);
      float blue = pow(max(dot(d, normalize(vec3(0.8, -0.2, 0.2))), 0.0), 5.0);
      color += vec3(0.63, 0.17, 1.25) * violet;
      color += vec3(0.10, 0.77, 1.05) * blue;
      float box = exp(-pow((d.x + 0.45) / 0.14, 2.0) - pow((d.y - 0.45) / 0.72, 2.0));
      float strip = exp(-pow((d.y + d.x * 0.35 - 0.67) / 0.07, 2.0));
      float rim = exp(-pow((d.x - 0.65) / 0.045, 2.0) - pow((d.y + 0.2) / 0.85, 2.0));
      color += vec3(3.9, 3.7, 4.2) * box;
      color += vec3(1.8, 2.0, 2.4) * strip;
      color += vec3(1.15, 1.65, 2.0) * rim;
      return color;
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / u_resolution.y;
      vec3 origin = vec3(0.0, 0.0, 5.8);
      vec3 direction = normalize(vec3(uv * 4.0, -5.8));
      float travel = 3.5;
      float distanceToSurface = 1.0;
      for (int i = 0; i < 76; i++) {
        distanceToSurface = sculpture(origin + direction * travel);
        if (distanceToSurface < 0.0014 || travel > 8.0) break;
        travel += distanceToSurface;
      }
      if (travel > 8.0 || distanceToSurface > 0.006) {
        gl_FragColor = vec4(0.0);
        return;
      }

      vec3 point = origin + direction * travel;
      vec3 normal = normalAt(point);
      float facing = max(dot(normal, -direction), 0.0);
      float fresnel = 0.045 + 0.955 * pow(1.0 - facing, 3.7);
      vec3 reflection = environment(reflect(direction, normal));
      vec3 inside = refract(direction, normal, 1.0 / 1.43);
      vec3 exitPoint = point + inside * 0.025;
      float thickness = 0.025;
      for (int i = 0; i < 24; i++) {
        float stepLength = abs(sculpture(exitPoint));
        if (stepLength < 0.002 && i > 2) break;
        stepLength = max(stepLength, 0.009);
        thickness += stepLength;
        exitPoint += inside * stepLength;
      }
      vec3 exitNormal = -normalAt(exitPoint);
      vec3 transmitted = refract(inside, exitNormal, 1.43);
      if (dot(transmitted, transmitted) < 0.1) transmitted = reflect(inside, exitNormal);

      // Subtle dispersion and violet absorption give the object depth, not a flat tint.
      vec3 refraction;
      refraction.r = environment(normalize(transmitted + normal * 0.035)).r;
      refraction.g = environment(transmitted).g;
      refraction.b = environment(normalize(transmitted - normal * 0.035)).b;
      vec3 absorption = exp(-vec3(0.32, 1.3, 0.10) * thickness);
      vec3 color = refraction * absorption * 0.64;
      color += vec3(0.14, 0.048, 0.24) * (1.0 - absorption) * 0.8;
      color = mix(color, reflection, 0.24 + fresnel * 0.7);
      vec3 iridescence = 0.5 + 0.5 * cos(vec3(0.4, 2.6, 4.7) + facing * 7.0 + point.y * 0.9);
      color += iridescence * pow(1.0 - facing, 2.0) * 0.19;
      color += vec3(0.22, 0.08, 0.40) * pow(facing, 1.7) * 0.16;
      color = color / (color + vec3(0.82));
      color = pow(color, vec3(0.83));
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      throw new Error('Glass shader is not supported.');
    }
    return shader;
  }

  let program;
  try {
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Glass program is not supported.');
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  } catch {
    if (program) gl.deleteProgram(program);
    return;
  }

  const resolution = gl.getUniformLocation(program, 'u_resolution');
  const pointer = gl.getUniformLocation(program, 'u_pointer');
  const time = gl.getUniformLocation(program, 'u_time');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const target = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };
  let frame = 0;
  let lastDraw = 0;
  let elapsed = 0;
  let inView = true;
  let lost = false;
  let paused = document.body.classList.contains('motion-paused');
  let ready = false;
  const maxDimension = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4 ? 560 : 720;

  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const scale = Math.min(window.devicePixelRatio || 1, 1.35, maxDimension / Math.max(width, height));
    const nextWidth = Math.max(1, Math.round(width * scale));
    const nextHeight = Math.max(1, Math.round(height * scale));
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
      gl.viewport(0, 0, nextWidth, nextHeight);
    }
    requestDraw();
  }

  function draw(now) {
    frame = 0;
    if (lost || !inView || document.hidden) return;
    const animated = !paused;
    if (animated && lastDraw && now - lastDraw < 32) {
      frame = requestAnimationFrame(draw);
      return;
    }
    if (animated) elapsed += Math.min(lastDraw ? now - lastDraw : 0, 70) / 1000;
    lastDraw = now;
    current.x += ((animated ? target.x : 0) - current.x) * 0.07;
    current.y += ((animated ? target.y : 0) - current.y) * 0.07;
    gl.uniform2f(resolution, canvas.width, canvas.height);
    gl.uniform2f(pointer, current.x, current.y);
    gl.uniform1f(time, elapsed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!ready && gl.getError() === gl.NO_ERROR) {
      ready = true;
      surface.classList.add('webgl-ready');
    }
    if (animated) frame = requestAnimationFrame(draw);
  }

  function requestDraw() {
    if (!frame && !lost && inView && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function updateMotion() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastDraw = 0;
    requestDraw();
  }

  surface.addEventListener('pointermove', (event) => {
    if (paused || event.pointerType === 'touch') return;
    const bounds = surface.getBoundingClientRect();
    target.x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
    target.y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
  }, { passive: true });
  surface.addEventListener('pointerleave', () => { target.x = 0; target.y = 0; });
  document.addEventListener('visibilitychange', updateMotion);
  motion.addEventListener('change', updateMotion);
  window.addEventListener('pixxel:motion', (event) => {
    paused = Boolean(event.detail?.paused);
    updateMotion();
  });
  canvas.addEventListener('webglcontextlost', () => {
    lost = true;
    cancelAnimationFrame(frame);
    surface.classList.remove('webgl-ready');
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      updateMotion();
    }, { rootMargin: '100px' }).observe(surface);
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize, { passive: true });
  resize();
}
