export function createLavaScene(canvas, reducedMotion) {
  const context = canvas.getContext('2d');
  if (!context) return null;

  const layout = [
    [0.12, 0.3, 0.173],
    [0.25, 0.69, 0.172],
    [0.37, 0.44, 0.124],
    [0.53, 0.72, 0.184],
    [0.68, 0.22, 0.177],
    [0.88, 0.64, 0.206],
  ];
  const blobs = layout.map(([x, y, r], index) => ({
    x,
    y,
    r,
    homeX: x,
    homeY: y,
    phase: index * 2.13,
    speed: 0.33 + (index % 3) * 0.035,
  }));
  let idleTime = 0;
  let idleSize = 1;
  let pointer = null;
  let visible = false;
  let time = 0;
  let lastFrame = null;
  let nextFrame = 0;

  // Each entry connects the crossed edges of one cell. The two saddle
  // cases choose a connection based on the field at the cell's center.
  const cellEdges = [
    [],
    [3, 0],
    [0, 1],
    [3, 1],
    [1, 2],
    [3, 0, 1, 2],
    [0, 2],
    [3, 2],
    [2, 3],
    [0, 2],
    [0, 1, 2, 3],
    [1, 2],
    [1, 3],
    [0, 1],
    [3, 0],
    [],
  ];
  let viewWidth = 1;
  let viewHeight = 1;
  let pixelRatio = 1;
  let columns = 1;
  let rows = 1;
  let stepX = 1;
  let stepY = 1;
  let field = new Float32Array(0);

  function traceContour(level) {
    const links = new Map();
    function connect(a, b) {
      const endpoints = links.get(a);
      if (endpoints) endpoints.push(b);
      else links.set(a, [b]);
    }
    for (let row = 0; row < rows - 1; row++) {
      for (let col = 0; col < columns - 1; col++) {
        const i = row * columns + col;
        const tl = field[i],
          tr = field[i + 1],
          br = field[i + columns + 1],
          bl = field[i + columns];
        const mask =
          (tl >= level ? 1 : 0) |
          (tr >= level ? 2 : 0) |
          (br >= level ? 4 : 0) |
          (bl >= level ? 8 : 0);
        if (mask === 0 || mask === 15) continue;
        let edges = cellEdges[mask];
        if ((mask === 5 || mask === 10) && (tl + tr + br + bl) / 4 >= level) {
          edges = cellEdges[15 - mask];
        }
        const ids = [i * 2, (i + 1) * 2 + 1, (i + columns) * 2, i * 2 + 1];
        for (let j = 0; j < edges.length; j += 2) {
          const a = ids[edges[j]],
            b = ids[edges[j + 1]];
          connect(a, b);
          connect(b, a);
        }
      }
    }
    const path = new Path2D();
    const visited = new Set();
    for (const start of links.keys()) {
      if (visited.has(start)) continue;
      const points = [];
      let current = start;
      let previous = -1;
      while (current !== undefined && !visited.has(current)) {
        visited.add(current);
        const i = Math.floor(current / 2),
          vertical = current % 2;
        const end = i + (vertical ? columns : 1);
        const fraction = (level - field[i]) / (field[end] - field[i]);
        const x = ((i % columns) - 2 + (vertical ? 0 : fraction)) * stepX;
        const y =
          (Math.floor(i / columns) - 2 + (vertical ? fraction : 0)) * stepY;
        points.push([x, y]);
        const [a, b] = links.get(current);
        const next = a === previous ? b : a;
        previous = current;
        current = next;
      }
      if (current !== start || points.length < 3) continue;
      const first = points[0],
        last = points[points.length - 1];
      path.moveTo((first[0] + last[0]) / 2, (first[1] + last[1]) / 2);
      points.forEach(([x, y], index) => {
        const [nx, ny] = points[(index + 1) % points.length];
        path.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
      });
      path.closePath();
    }
    return path;
  }

  function paint() {
    const scale = Math.min(viewWidth, viewHeight);
    const positions = blobs.map((blob, index) => {
      const r =
        scale *
        blob.r *
        (1 + 0.13 * idleSize) *
        (1 + 0.085 * Math.sin(idleTime * 0.71 + index));
      return {
        x: blob.x * viewWidth,
        y: blob.y * viewHeight,
        r,
        radius2: r * r,
      };
    });
    // The field grid locates the contours. The browser draws the fitted
    // curves on a device-pixel canvas, so the grid itself is never visible.
    for (let row = 1; row < rows - 1; row++) {
      const y = (row - 2) * stepY;
      for (let col = 1; col < columns - 1; col++) {
        const x = (col - 2) * stepX;
        let value = 0;
        for (const blob of positions) {
          const dx = x - blob.x,
            dy = (y - blob.y) * 1.08;
          value += blob.radius2 / (dx * dx + dy * dy + blob.radius2 * 0.14);
        }
        field[row * columns + col] = value;
      }
    }
    const contour = traceContour(1.02);
    context.clearRect(0, 0, viewWidth, viewHeight);
    context.lineWidth = 5;
    context.strokeStyle = '#f7254219';
    context.stroke(contour);
    context.fillStyle = '#75091bd4';
    context.fill(contour);

    context.save();
    context.clip(contour);
    for (const { x, y, r } of positions) {
      const sheen = context.createRadialGradient(
        x - r * 0.28,
        y - r * 0.33,
        r * 0.04,
        x,
        y,
        r * 1.58,
      );
      sheen.addColorStop(0, '#f6294487');
      sheen.addColorStop(0.52, '#d3153640');
      sheen.addColorStop(1, '#bc0a2800');
      context.fillStyle = sheen;
      context.fillRect(x - r * 1.6, y - r * 1.6, r * 3.2, r * 3.2);
    }
    context.restore();
    context.lineWidth = 1.35;
    context.strokeStyle = '#ff365778';
    context.stroke(contour);
  }

  function tick(now) {
    nextFrame = 0;
    const dt =
      lastFrame === null ? 0 : Math.min((now - lastFrame) / 1000, 0.06);
    lastFrame = now;
    time += dt;
    idleTime += dt * 0.65;
    idleSize += ((pointer ? 0 : 1) - idleSize) * (1 - Math.exp(-dt * 5));
    const width = viewWidth;
    const height = viewHeight;
    const span = Math.min(width, height);
    blobs.forEach((blob, index) => {
      const drift = idleTime * blob.speed + blob.phase;
      let x =
        blob.homeX +
        0.123 * Math.sin(drift) +
        0.052 * Math.sin(drift * 0.57 + 1);
      let y = blob.homeY + 0.255 * Math.cos(drift * 1.1);
      if (pointer) {
        const angle = index * 2.4 + time * 0.49;
        const spread =
          index === 0
            ? 0
            : span *
              (0.12 + index * 0.055) *
              (1 + 0.2 * Math.sin(time * 0.83 + index));
        x = pointer.x + (Math.cos(angle) * spread) / width;
        y = pointer.y + (Math.sin(angle) * spread) / height;
      }
      const ease = 1 - Math.exp(-dt * (pointer ? 8.6 - index * 0.74 : 3.25));
      blob.x += (Math.max(0.035, Math.min(0.965, x)) - blob.x) * ease;
      blob.y += (Math.max(0.035, Math.min(0.965, y)) - blob.y) * ease;
    });
    paint();
    schedule();
  }

  function schedule() {
    if (visible && !reducedMotion.matches && !nextFrame) {
      nextFrame = requestAnimationFrame(tick);
    }
  }

  function syncMotion() {
    cancelAnimationFrame(nextFrame);
    nextFrame = 0;
    lastFrame = null;
    if (reducedMotion.matches) {
      pointer = null;
      blobs.forEach((blob) => {
        blob.x = blob.homeX;
        blob.y = blob.homeY;
      });
      time = idleTime = 0;
      idleSize = 1;
      paint();
    }
    schedule();
  }

  function resize() {
    viewWidth = Math.max(1, canvas.clientWidth);
    viewHeight = Math.max(1, canvas.clientHeight);
    pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(viewWidth * pixelRatio);
    canvas.height = Math.round(viewHeight * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    columns = Math.ceil(viewWidth / 6) + 5;
    rows = Math.ceil(viewHeight / 6) + 5;
    stepX = viewWidth / (columns - 5);
    stepY = viewHeight / (rows - 5);
    field = new Float32Array(columns * rows);
    paint();
  }

  const resizeObserver = new ResizeObserver(resize);
  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      syncMotion();
    },
    { rootMargin: '50px' },
  );
  resize();
  resizeObserver.observe(canvas);
  observer.observe(canvas);
  reducedMotion.addEventListener('change', syncMotion);
  return {
    target(x, y) {
      pointer = { x, y };
    },
    release() {
      pointer = null;
    },
  };
}

export function createChipScene(card, reducedMotion) {
  const layer = card.querySelector('.chip-layer');
  const chip = card.querySelector('.brain-chip');
  layer.append(chip);
  const mark = card.querySelector('.brain-mark');
  const dock = mark.querySelector('.chip-dock');
  const canvas = mark.querySelector('.brain-signals');
  const brain = mark.querySelector('img');
  const context = canvas.getContext('2d');
  mark.style.setProperty('--brain-mask', `url("${brain.src}")`);

  let originX = 0;
  let originY = 0;
  let dockX = 0;
  let dockY = 0;
  let width = 1;
  let height = 1;
  let brainWidth = 1;
  let brainHeight = 1;
  let chipRadius = 26;
  let paths = [];
  let pathX = Infinity;
  let pathY = Infinity;
  let silhouette = null;
  let position = null;
  let pointer = null;
  let visible = false;
  let mode = 'docked';
  let pulseStart = null;
  let last = null;
  let frame = 0;

  // Normalized signal paths travel out in different directions from the dock.
  const branches = [
    [
      [0.53, 0.24],
      [0.45, 0.18],
      [0.34, 0.2],
      [0.29, 0.3],
      [0.19, 0.28],
      [0.11, 0.35],
    ],
    [
      [0.46, 0.39],
      [0.37, 0.39],
      [0.28, 0.52],
      [0.18, 0.5],
      [0.11, 0.6],
    ],
    [
      [0.52, 0.49],
      [0.43, 0.55],
      [0.46, 0.64],
      [0.32, 0.7],
      [0.23, 0.67],
    ],
    [
      [0.63, 0.46],
      [0.61, 0.57],
      [0.71, 0.65],
      [0.69, 0.77],
      [0.6, 0.86],
    ],
    [
      [0.68, 0.34],
      [0.76, 0.42],
      [0.82, 0.39],
      [0.89, 0.49],
      [0.85, 0.6],
    ],
    [
      [0.63, 0.24],
      [0.69, 0.16],
      [0.79, 0.24],
      [0.85, 0.3],
      [0.9, 0.37],
    ],
  ];

  // Sample the actual alpha silhouette, rather than the artwork's rectangle.
  function readSilhouette() {
    if (!brain.naturalWidth) return;
    const probe = document.createElement('canvas');
    probe.width = brain.naturalWidth;
    probe.height = brain.naturalHeight;
    const sampler = probe.getContext('2d');
    if (!sampler) return;
    sampler.drawImage(brain, 0, 0, probe.width, probe.height);
    silhouette = sampler.getImageData(0, 0, probe.width, probe.height);
  }

  function isBrainSurface(x, y) {
    if (!silhouette) return false;
    const u = (x - originX) / brainWidth;
    const v = (y - originY) / brainHeight;
    if (u < 0 || u >= 1 || v < 0 || v >= 1) return false;
    const row = Math.floor(v * silhouette.height);
    const col = Math.floor(u * silhouette.width);
    return silhouette.data[(row * silhouette.width + col) * 4 + 3] >= 48;
  }

  function makePaths(x, y) {
    return branches.map((branch) => {
      const points = [
        [x, y],
        ...branch.map(([nx, ny]) => [nx * brainWidth, ny * brainHeight]),
      ];
      const path = new Path2D();
      path.moveTo(x, y);
      let length = 0;
      for (let i = 1; i < points.length; i++) {
        const [cx, cy] = points[i];
        const [px, py] = points[i - 1];
        const next = points[i + 1];
        length += Math.hypot(cx - px, cy - py);
        if (next)
          path.quadraticCurveTo(cx, cy, (cx + next[0]) / 2, (cy + next[1]) / 2);
        else path.lineTo(cx, cy);
      }
      return { path, length };
    });
  }

  function clearSignals() {
    context?.clearRect(0, 0, brainWidth, brainHeight);
  }

  function drawSignals(progress, x, y) {
    if (!context) return;
    clearSignals();
    const strength = Math.max(
      0,
      Math.min(1, progress * 16, (1 - progress) * 3.4),
    );
    const radius = 10 + progress * brainWidth * 0.78;
    const startX = x - originX,
      startY = y - originY;
    if (Math.hypot(startX - pathX, startY - pathY) >= 0.8) {
      paths = makePaths(startX, startY);
      pathX = startX;
      pathY = startY;
    }
    context.beginPath();
    context.ellipse(startX, startY, radius, radius * 0.85, 0, 0, Math.PI * 2);
    context.lineWidth = 13;
    context.strokeStyle = `rgba(255, 25, 57, ${strength * 0.17})`;
    context.stroke();
    context.lineWidth = 2.2;
    context.strokeStyle = `rgba(255, 98, 112, ${strength * 0.76})`;
    context.stroke();

    context.lineCap = 'round';
    paths.forEach(({ path, length }, index) => {
      context.lineWidth = 1;
      context.strokeStyle = 'rgba(255, 54, 79, .16)';
      context.stroke(path);
      const travel = Math.max(0, progress * 1.4 - index * 0.035);
      const tail = Math.min(25, length * 0.22);
      context.setLineDash([tail, length * 4]);
      context.lineDashOffset = -(travel * length - tail);
      context.lineWidth = 6;
      context.strokeStyle = `rgba(255, 21, 55, ${strength * 0.22})`;
      context.stroke(path);
      context.lineWidth = 1.75;
      context.strokeStyle = `rgba(255, 137, 146, ${strength * 0.94})`;
      context.stroke(path);
      context.setLineDash([]);
    });
  }

  function place() {
    const turn = position.lift;
    chip.style.transform = `translate3d(${position.x}px,${position.y}px,0) rotate(${turn * 20}deg) scale(${1 + turn * 0.18})`;
    chip.classList.add('is-positioned');
  }

  function measure() {
    const surface = layer.getBoundingClientRect();
    const artwork = mark.getBoundingClientRect();
    const anchor = dock.getBoundingClientRect();
    width = surface.width || 1;
    height = surface.height || 1;
    brainWidth = artwork.width || 1;
    brainHeight = artwork.height || 1;
    originX = artwork.left - surface.left;
    originY = artwork.top - surface.top;
    dockX = anchor.left - surface.left;
    dockY = anchor.top - surface.top;
    chipRadius = chip.offsetWidth * 0.67;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.max(1, Math.round(brainWidth * dpr));
    canvas.height = Math.max(1, Math.round(brainHeight * dpr));
    context?.setTransform(dpr, 0, 0, dpr, 0, 0);
    pathX = pathY = Infinity;
    if (!position || mode === 'docked')
      position = { x: dockX, y: dockY, lift: 0 };
    place();
  }

  function schedule() {
    if (
      (visible || pointer || mode !== 'docked') &&
      !reducedMotion.matches &&
      !frame
    )
      frame = requestAnimationFrame(tick);
  }

  function tick(now) {
    frame = 0;
    const dt = last === null ? 0 : Math.min(0.055, (now - last) / 1000);
    last = now;
    const clamp = (value, max) =>
      Math.max(chipRadius, Math.min(max - chipRadius, value));
    // Check the cursor itself before clamping the position of a lifted chip.
    const onSurface = pointer !== null && isBrainSurface(pointer.x, pointer.y);
    const x = onSurface ? pointer.x : pointer ? clamp(pointer.x, width) : dockX;
    const y = onSurface
      ? pointer.y
      : pointer
        ? clamp(pointer.y, height)
        : dockY;
    const motion = 1 - Math.exp(-dt * (onSurface ? 22 : pointer ? 13 : 9));
    position.x += (x - position.x) * motion;
    position.y += (y - position.y) * motion;
    const lift = pointer && !onSurface ? 1 : 0;
    position.lift += (lift - position.lift) * motion;
    const atDock =
      !pointer &&
      Math.hypot(position.x - dockX, position.y - dockY) < 1.3 &&
      position.lift < 0.045;
    const next = atDock ? 'docked' : onSurface ? 'surface' : 'lifted';

    if (atDock) {
      position.x = dockX;
      position.y = dockY;
      position.lift = 0;
    } else if (onSurface) {
      // If easing would leave the chip off the silhouette, land at the cursor.
      if (!isBrainSurface(position.x, position.y)) {
        position.x = x;
        position.y = y;
      }
      position.lift = 0;
    }
    if (next !== mode) {
      card.classList.toggle('chip-detached', next === 'lifted');
      card.classList.toggle('chip-surface', next === 'surface');
    }
    if (next === 'lifted') {
      if (mode !== 'lifted') clearSignals();
      pulseStart = null;
    } else {
      if (pulseStart === null) pulseStart = now - 130;
      drawSignals(((now - pulseStart) % 2450) / 2450, position.x, position.y);
    }
    if (!atDock || mode !== 'docked') place();
    mode = next;
    schedule();
  }

  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = null;
    if (reducedMotion.matches) {
      pointer = null;
      mode = 'docked';
      pulseStart = null;
      card.classList.remove('chip-detached', 'chip-surface');
      clearSignals();
      position = { x: dockX, y: dockY, lift: 0 };
      place();
    }
    schedule();
  }

  const dimensions = new ResizeObserver(measure);
  dimensions.observe(layer);
  dimensions.observe(mark);
  const visibility = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      sync();
    },
    { rootMargin: '45px' },
  );
  visibility.observe(card);
  reducedMotion.addEventListener('change', sync);
  if (brain.complete) readSilhouette();
  else brain.addEventListener('load', readSilhouette, { once: true });
  measure();
  return {
    target(clientX, clientY) {
      const { left, top } = layer.getBoundingClientRect();
      pointer = { x: clientX - left, y: clientY - top };
      schedule();
    },
    release() {
      pointer = null;
      schedule();
    },
  };
}
