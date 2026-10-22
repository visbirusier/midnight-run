// Two-dimensional oriented vehicle bodies. The simulation runs at 120 Hz;
// even a boost-speed car travels less than one metre per collision step.
export const PHYSICS_STEP = 1 / 120;
const dot = (a, b) => a.x * b.x + a.z * b.z;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function pose(body, route) {
  const p = route.point(body.s, body.lane);
  const h = route.heading(body.s) + (body.yaw || 0);
  return { x: p.x, z: p.z, right: { x: Math.cos(h), z: -Math.sin(h) }, forward: { x: -Math.sin(h), z: -Math.cos(h) }, w: body.halfWidth || 1.12, l: body.halfLength || 2.5 };
}
export function contact(a, b) {
  const delta = { x: b.x - a.x, z: b.z - a.z };
  if (dot(delta, delta) > (Math.hypot(a.w, a.l) + Math.hypot(b.w, b.l) + .1) ** 2) return null;
  let depth = Infinity, normal;
  for (const axis of [a.right, a.forward, b.right, b.forward]) {
    const radius = a.w * Math.abs(dot(a.right, axis)) + a.l * Math.abs(dot(a.forward, axis)) + b.w * Math.abs(dot(b.right, axis)) + b.l * Math.abs(dot(b.forward, axis));
    const distance = dot(delta, axis), overlap = radius - Math.abs(distance);
    if (overlap <= 0) return null;
    if (overlap < depth) { depth = overlap; const sign = distance < 0 ? -1 : 1; normal = { x: axis.x * sign, z: axis.z * sign }; }
  }
  return { depth, normal };
}
function keepInside(body, route) {
  const yaw = body.yaw || 0;
  const radius = Math.abs(Math.cos(yaw)) * (body.halfWidth || 1.12) + Math.abs(Math.sin(yaw)) * (body.halfLength || 2.5);
  const edge = Math.max(0, route.halfWidth(body.s) - radius - .06);
  body.lane = clamp(body.lane, -edge, edge);
}
function translate(body, normal, amount, route) {
  const h = route.heading(body.s);
  body.lane += (normal.x * Math.cos(h) - normal.z * Math.sin(h)) * amount;
  body.s += (-normal.x * Math.sin(h) - normal.z * Math.cos(h)) * amount;
  keepInside(body, route);
}
export function resolveVehicles(bodies, route) {
  const touched = new Set();
  bodies.forEach(b => keepInside(b, route));
  // Re-evaluate after each correction, including wall constraints and chain contacts.
  // Feedback cooldowns never disable collision resolution.
  for (let iteration = 0; iteration < 80; iteration++) {
    let maxDepth = 0;
    for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i], b = bodies[j];
      if (Math.abs(a.s - b.s) > 18) continue;
      const pa = pose(a, route), pb = pose(b, route), hit = contact(pa, pb);
      if (!hit) continue;
      maxDepth = Math.max(maxDepth, hit.depth);
      touched.add(a); touched.add(b);
      const amount = (hit.depth + .012) / 2;
      translate(a, hit.normal, -amount, route);
      translate(b, hit.normal, amount, route);
      const ha = route.heading(a.s), hb = route.heading(b.s);
      const da = -Math.sin(ha) * hit.normal.x - Math.cos(ha) * hit.normal.z;
      const db = -Math.sin(hb) * hit.normal.x - Math.cos(hb) * hit.normal.z;
      const closing = (a.speed || 0) * da - (b.speed || 0) * db;
      if (closing > 0 && da * da + db * db > .01) {
        const impulse = closing / (da * da + db * db);
        a.speed = Math.max(0, (a.speed || 0) - impulse * da);
        b.speed = Math.max(0, (b.speed || 0) + impulse * db);
      }
    }
    if (maxDepth === 0) break;
  }
  return touched;
}
