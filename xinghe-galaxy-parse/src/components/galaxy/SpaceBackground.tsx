"use client";

// 星河 3D 太空背景
// 超还原星空:多层星野(自定义着色器闪烁) + 程序化星云 + 流星 + 银河尘埃带 + 鼠标视差
import { useEffect, useRef } from "react";
import * as THREE from "three";

function makeNebulaTexture(inner: string, outer: string): THREE.Texture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  // 多层径向渐变模拟气体发光
  const layers = 7;
  for (let i = 0; i < layers; i++) {
    const r = size * (0.18 + Math.random() * 0.3);
    const x = size / 2 + (Math.random() - 0.5) * size * 0.4;
    const y = size / 2 + (Math.random() - 0.5) * size * 0.4;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, inner);
    g.addColorStop(0.4, outer);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.16 + Math.random() * 0.12;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export default function SpaceBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030014, 0.00055);
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      3000
    );
    camera.position.set(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x030014, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    const isMobile = window.innerWidth < 768;
    const STAR_COUNT = isMobile ? 4500 : 9000;
    const DUST_COUNT = isMobile ? 1200 : 2600;

    // ---------- 星野:自定义着色器(大小衰减 + 闪烁 + 色温) ----------
    const starGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(STAR_COUNT * 3);
    const colors = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    const phases = new Float32Array(STAR_COUNT);

    const palette = [
      [1.0, 1.0, 1.0], // 白
      [0.72, 0.85, 1.0], // 冷蓝白
      [1.0, 0.92, 0.78], // 暖黄
      [0.85, 0.75, 1.0], // 淡紫
      [0.75, 0.95, 1.0], // 青光
      [1.0, 0.68, 0.72], // 玫红
    ];
    for (let i = 0; i < STAR_COUNT; i++) {
      // 球壳分布,保证四周都是深空
      const r = 400 + Math.random() * 1100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      const c = palette[Math.floor(Math.pow(Math.random(), 1.6) * palette.length)];
      const bright = 0.55 + Math.random() * 0.45;
      colors[i * 3] = c[0] * bright;
      colors[i * 3 + 1] = c[1] * bright;
      colors[i * 3 + 2] = c[2] * bright;
      sizes[i] = Math.random() < 0.04 ? 5 + Math.random() * 6 : 0.8 + Math.random() * 2.4; // 少量亮星
      phases[i] = Math.random() * Math.PI * 2;
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    starGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    starGeometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

    const starMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute vec3 aColor; attribute float aSize; attribute float aPhase;
        uniform float uTime;
        varying vec3 vColor; varying float vTwinkle;
        void main() {
          vColor = aColor;
          vTwinkle = 0.65 + 0.35 * sin(uTime * (0.6 + fract(aPhase) * 1.7) + aPhase * 7.0);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * vTwinkle * (620.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor; varying float vTwinkle;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          float core = smoothstep(0.5, 0.0, d);
          float halo = smoothstep(0.5, 0.12, d) * 0.35;
          float a = (core + halo) * vTwinkle;
          if (a < 0.02) discard;
          gl_FragColor = vec4(vColor * (1.15 + core * 0.8), a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // ---------- 银河尘埃带(倾斜圆盘,密集微尘) ----------
    const dustGeometry = new THREE.BufferGeometry();
    const dPos = new Float32Array(DUST_COUNT * 3);
    const dCol = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i++) {
      const ang = Math.random() * Math.PI * 2;
      const radius = 300 + Math.pow(Math.random(), 0.7) * 900;
      const height = (Math.random() - 0.5) * (140 + radius * 0.16);
      dPos[i * 3] = Math.cos(ang) * radius;
      dPos[i * 3 + 1] = height;
      dPos[i * 3 + 2] = Math.sin(ang) * radius;
      const t = Math.random();
      const col =
        t < 0.4
          ? [0.62, 0.44, 0.96]
          : t < 0.75
          ? [0.3, 0.8, 0.92]
          : [0.95, 0.62, 0.78];
      dCol[i * 3] = col[0] * 0.32;
      dCol[i * 3 + 1] = col[1] * 0.32;
      dCol[i * 3 + 2] = col[2] * 0.32;
    }
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
    dustGeometry.setAttribute("aColor", new THREE.BufferAttribute(dCol, 3));
    dustGeometry.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(Array.from({ length: DUST_COUNT }, () => 1.2 + Math.random() * 2.2)), 1));
    dustGeometry.setAttribute("aPhase", new THREE.BufferAttribute(new Float32Array(Array.from({ length: DUST_COUNT }, () => Math.random() * Math.PI * 2)), 1));
    const dustMaterial = starMaterial.clone();
    dustMaterial.uniforms.uTime = { value: 0 };
    // 银河带倾斜
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    dust.rotation.set(THREE.MathUtils.degToRad(62), 0, THREE.MathUtils.degToRad(18));
    scene.add(dust);

    // ---------- 星云(程序化纹理,缓慢自转 + 呼吸) ----------
    const nebulae: { mesh: THREE.Mesh; material: THREE.MeshBasicMaterial; speed: number; baseScale: number; phase: number }[] = [];
    const nebulaDefs: [number, number, number, string, string, number][] = [
      [-520, 140, -760, "rgba(139,92,246,0.55)", "rgba(76,29,149,0.30)", 560],
      [640, -80, -900, "rgba(34,211,238,0.4)", "rgba(14,116,144,0.22)", 660],
      [-180, -300, -1080, "rgba(244,114,182,0.32)", "rgba(88,28,135,0.24)", 500],
      [260, 260, -1250, "rgba(167,139,250,0.34)", "rgba(30,27,75,0.28)", 780],
    ];
    for (const [x, y, z, inner, outer, scale] of nebulaDefs) {
      const material = new THREE.MeshBasicMaterial({
        map: makeNebulaTexture(inner, outer),
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(scale, scale), material);
      mesh.position.set(x, y, z);
      mesh.rotation.z = Math.random() * Math.PI;
      scene.add(mesh);
      nebulae.push({ mesh, material, speed: (Math.random() - 0.5) * 0.02, baseScale: scale, phase: Math.random() * Math.PI * 2 });
    }

    // ---------- 远景气态巨行星(程序化) ----------
    const planetCanvas = document.createElement("canvas");
    planetCanvas.width = 256;
    planetCanvas.height = 256;
    const pctx = planetCanvas.getContext("2d")!;
    const pg = pctx.createLinearGradient(0, 0, 256, 256);
    pg.addColorStop(0, "#1b1440");
    pg.addColorStop(0.45, "#4c1d95");
    pg.addColorStop(0.7, "#7c3aed");
    pg.addColorStop(1, "#0f0a2e");
    pctx.fillStyle = pg;
    pctx.beginPath();
    pctx.arc(128, 128, 127, 0, Math.PI * 2);
    pctx.fill();
    // 条纹
    for (let i = 0; i < 9; i++) {
      pctx.globalAlpha = 0.1 + Math.random() * 0.12;
      pctx.fillStyle = i % 2 ? "#c4b5fd" : "#312e81";
      const y = 20 + Math.random() * 216;
      const h = 6 + Math.random() * 16;
      pctx.beginPath();
      pctx.ellipse(128, y, 127 * Math.sqrt(1 - Math.pow((y - 128) / 128, 2)) || 10, h, 0, 0, Math.PI * 2);
      pctx.fill();
    }
    pctx.globalAlpha = 1;
    const planetTex = new THREE.CanvasTexture(planetCanvas);
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(74, 48, 48),
      new THREE.MeshBasicMaterial({ map: planetTex })
    );
    planet.position.set(-560, -190, -1050);
    planet.rotation.z = 0.35;
    scene.add(planet);
    // 行星环
    const ringGeo = new THREE.RingGeometry(96, 150, 90);
    const ringPos = ringGeo.attributes.position;
    const ringAlpha = new Float32Array(ringPos.count);
    for (let i = 0; i < ringPos.count; i++) {
      const r = Math.hypot(ringPos.getX(i), ringPos.getY(i));
      ringAlpha[i] = 0.12 + 0.5 * Math.max(0, 1 - Math.abs(r - 118) / 34);
    }
    ringGeo.setAttribute("aAlpha", new THREE.BufferAttribute(ringAlpha, 1));
    const ringMat = new THREE.ShaderMaterial({
      vertexShader: `attribute float aAlpha; varying float vA;
        void main(){ vA=aAlpha; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `varying float vA;
        void main(){ gl_FragColor=vec4(0.76,0.68,0.98,vA); }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(planet.position);
    ring.rotation.x = Math.PI / 2.35;
    ring.rotation.y = 0.2;
    scene.add(ring);

    // ---------- 流星 ----------
    interface Meteor {
      head: THREE.Mesh;
      tail: THREE.Mesh;
      vel: THREE.Vector3;
      life: number;
      maxLife: number;
    }
    const meteors: Meteor[] = [];
    const makeMeteor = (): Meteor => {
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.55 + Math.random() * 0.12, 0.7, 0.85),
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const head = new THREE.Mesh(new THREE.SphereGeometry(2.6, 8, 8), material);
      const tailMat = material.clone();
      tailMat.opacity = 0.45;
      const tail = new THREE.Mesh(new THREE.ConeGeometry(2.0, 90, 8, 1, true), tailMat);
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        -0.45 - Math.random() * 0.5,
        Math.random() - 0.5
      ).normalize();
      const start = new THREE.Vector3(
        (Math.random() - 0.5) * 1100,
        240 + Math.random() * 260,
        (Math.random() - 0.5) * 1100
      );
      head.position.copy(start);
      // 尾巴朝运动反方向
      tail.position.copy(start).addScaledVector(dir, -45);
      tail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
      scene.add(head);
      scene.add(tail);
      const speed = 340 + Math.random() * 300;
      return {
        head,
        tail,
        vel: dir.multiplyScalar(speed),
        life: 0,
        maxLife: 1.6 + Math.random() * 1.4,
      };
    };

    let meteorTimer = 0;
    const meteorInterval = () => 3.5 + Math.random() * 6;

    // ---------- 交互与动画 ----------
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    const onPointerMove = (e: PointerEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    let hidden = false;
    const onVisibility = () => {
      hidden = document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);

    const clock = new THREE.Clock();
    let raf = 0;
    let scrollFactor = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (hidden) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      // 视差:缓动跟随鼠标 + 页面滚动改变俯仰
      mouseX += (targetX - mouseX) * 0.035;
      mouseY += (targetY - mouseY) * 0.035;
      const pitch = -mouseY * 0.12 + scrollFactor * 0.22;
      camera.rotation.y = -mouseX * 0.16;
      camera.rotation.x = pitch;

      // 星野整体极缓慢自转
      stars.rotation.y += dt * 0.0045;
      dust.rotation.y -= dt * 0.003;
      starMaterial.uniforms.uTime.value = t;
      dustMaterial.uniforms.uTime.value = t * 0.7;

      for (const n of nebulae) {
        n.mesh.rotation.z += dt * n.speed * 0.05;
        const breathe = 1 + Math.sin(t * 0.14 + n.phase) * 0.045;
        n.mesh.scale.setScalar(breathe);
        n.mesh.lookAt(camera.position);
      }
      planet.rotation.y += dt * 0.03;
      ring.rotation.z += dt * 0.01;

      // 流星
      meteorTimer -= dt;
      if (meteorTimer <= 0 && meteors.length < 3) {
        meteors.push(makeMeteor());
        meteorTimer = meteorInterval();
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.life += dt;
        const step = m.vel.clone().multiplyScalar(dt);
        m.head.position.add(step);
        m.tail.position.add(step);
        const fade = Math.sin(Math.min(m.life / m.maxLife, 1) * Math.PI);
        (m.head.material as THREE.MeshBasicMaterial).opacity = 0.95 * fade;
        (m.tail.material as THREE.MeshBasicMaterial).opacity = 0.45 * fade;
        if (m.life >= m.maxLife) {
          scene.remove(m.head);
          scene.remove(m.tail);
          m.head.geometry.dispose();
          m.tail.geometry.dispose();
          meteors.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
    };

    // 滚动联动
    const onScroll = () => {
      scrollFactor = Math.min(window.scrollY / window.innerHeight, 1.6);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
      renderer.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      dustGeometry.dispose();
      dustMaterial.dispose();
      nebulae.forEach((n) => {
        n.material.map?.dispose();
        n.material.dispose();
        n.mesh.geometry.dispose();
      });
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden bg-[#030014]"
    />
  );
}
