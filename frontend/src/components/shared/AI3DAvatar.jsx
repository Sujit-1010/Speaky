import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function AI3DAvatar() {
  const containerRef = useRef(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return () => {};

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
 
    const geometries = [];
    const materials = [];

    const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 100);
    camera.position.set(0, 0.1, 4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const width = rect.width || 640;
      const height = rect.height || 360;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    container.appendChild(renderer.domElement);
    updateSize();

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.2);
    rimLight.position.set(-4, 2, -2);
    scene.add(rimLight);

    const ambient = new THREE.AmbientLight(0x0f172a, 0.9);
    scene.add(ambient);

    const headGroup = new THREE.Group();
    scene.add(headGroup);

    const shellGeo = new THREE.BoxGeometry(1.8, 1.4, 0.6, 24, 24, 24);
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.55,
      roughness: 0.2,
    });
    geometries.push(shellGeo);
    materials.push(shellMat);
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.position.set(0, 0.05, 0);
    headGroup.add(shell);

    const screenGeo = new THREE.PlaneGeometry(1.45, 1.02, 32, 32);
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x020617,
      emissive: 0x020617,
      emissiveIntensity: 0.8,
      metalness: 0.3,
      roughness: 0.4,
    });
    geometries.push(screenGeo);
    materials.push(screenMat);
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 0.08, 0.33);
    headGroup.add(screen);

    const eyeGeo = new THREE.SphereGeometry(0.12, 32, 32);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x5bfffb,
      emissive: 0x22d3ee,
      emissiveIntensity: 1.8,
      metalness: 0.2,
      roughness: 0.15,
    });
    geometries.push(eyeGeo);
    materials.push(eyeMat);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.4, 0.18, 0.38);
    rightEye.position.set(0.4, 0.18, 0.38);
    headGroup.add(leftEye);
    headGroup.add(rightEye);

    const mouthGeo = new THREE.TorusGeometry(0.35, 0.04, 32, 80, Math.PI);
    const mouthMat = new THREE.MeshStandardMaterial({
      color: 0x5bfffb,
      emissive: 0x22d3ee,
      emissiveIntensity: 1.4,
      metalness: 0.25,
      roughness: 0.2,
    });
    geometries.push(mouthGeo);
    materials.push(mouthMat);
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.rotation.x = Math.PI / 2.1;
    mouth.rotation.z = Math.PI;
    mouth.position.set(0, -0.18, 0.34);
    headGroup.add(mouth);

    const earBandGeo = new THREE.TorusGeometry(1.3, 0.06, 24, 80, Math.PI);
    const earBandMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x2563eb,
      emissiveIntensity: 0.9,
      metalness: 0.55,
      roughness: 0.25,
    });
    geometries.push(earBandGeo);
    materials.push(earBandMat);
    const earBand = new THREE.Mesh(earBandGeo, earBandMat);
    earBand.rotation.z = Math.PI / 2;
    earBand.position.set(0, 0.1, 0);
    headGroup.add(earBand);

    const cupGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.32, 32);
    const cupMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      emissive: 0x2563eb,
      emissiveIntensity: 1.2,
      metalness: 0.6,
      roughness: 0.25,
    });
    geometries.push(cupGeo);
    materials.push(cupMat);
    const leftCup = new THREE.Mesh(cupGeo, cupMat);
    const rightCup = new THREE.Mesh(cupGeo, cupMat);
    leftCup.rotation.z = Math.PI / 2;
    rightCup.rotation.z = Math.PI / 2;
    leftCup.position.set(-1.05, 0.1, 0.02);
    rightCup.position.set(1.05, 0.1, 0.02);
    headGroup.add(leftCup);
    headGroup.add(rightCup);

    const glowGeo = new THREE.SphereGeometry(1.7, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.18,
    });
    geometries.push(glowGeo);
    materials.push(glowMat);
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(0, 0.05, -0.1);
    scene.add(glow);

    const shadowGeo = new THREE.CircleGeometry(1.25, 40);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
    });
    geometries.push(shadowGeo);
    materials.push(shadowMat);
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, -0.9, 0);
    scene.add(shadow);

    const clock = new THREE.Clock();
    const baseY = 0.1;

    const animate = () => {
      const t = clock.getElapsedTime();

      const floatY = Math.sin(t * 1.6) * 0.08;
      headGroup.position.y = baseY + floatY;
      headGroup.rotation.y = Math.sin(t * 0.7) * 0.32;
      headGroup.rotation.x = Math.cos(t * 0.5) * 0.1;

      const eyePulse = 1.6 + Math.sin(t * 3.2) * 0.5;
      eyeMat.emissiveIntensity = eyePulse;
      mouthMat.emissiveIntensity = 1.3 + Math.sin(t * 2.4) * 0.35;

      const glowScale = 1.05 + Math.sin(t * 1.4) * 0.12;
      glow.scale.set(glowScale, glowScale * 0.9, glowScale);

      const bandTilt = Math.sin(t * 1.3) * 0.18;
      earBand.rotation.y = bandTilt;

      const shadowScale = 0.95 + (0.08 - floatY) * 1.4;
      shadow.scale.set(shadowScale, shadowScale, shadowScale);
      shadowMat.opacity = 0.18 + (0.08 - floatY) * 1.4;

      renderer.render(scene, camera);
      frameRef.current = window.requestAnimationFrame(animate);
    };

    frameRef.current = window.requestAnimationFrame(animate);

    const handleResize = () => {
      updateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
      try {
        container.removeChild(renderer.domElement);
      } catch {}
      renderer.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    };
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-sky-900">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="relative z-10 flex flex-col items-center justify-end h-full pb-4 px-4 pointer-events-none">
        <div className="mb-2 text-[10px] font-semibold tracking-wide uppercase text-sky-300/80 bg-sky-950/60 px-3 py-1 rounded-full border border-sky-500/40">
          AI Analysis Avatar
        </div>
        <div className="text-xs text-slate-200/90 text-center max-w-[220px]">
          Listening to the conversation, tracking speaking time and sentiment in real time.
        </div>
      </div>
    </div>
  );
}
