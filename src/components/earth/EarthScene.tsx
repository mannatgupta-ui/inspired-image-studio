import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { sampleHotspots } from "@/lib/fire-data";

const SUN = new THREE.Vector3(5, 1.5, 3).normalize();

function latLngToVec(lat: number, lng: number, r: number) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

const earthVert = `
varying vec2 vUv; varying vec3 vNormal;
void main(){ vUv=uv; vNormal=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `;
const earthFrag = `
uniform sampler2D dayMap; uniform sampler2D nightMap; uniform vec3 sun;
varying vec2 vUv; varying vec3 vNormal;
void main(){
  float d = dot(normalize(vNormal), sun);
  float mixv = smoothstep(-0.25, 0.15, d);
  vec3 day = texture2D(dayMap, vUv).rgb * (0.35 + 1.1*max(d,0.0));
  vec3 night = texture2D(nightMap, vUv).rgb * vec3(1.0,0.82,0.55) * 1.4;
  vec3 c = mix(night, day, mixv);
  gl_FragColor = vec4(c, 1.0);
}`;
const atmoFrag = `
varying vec3 vNormal; uniform vec3 sun;
void main(){
  float i = pow(0.72 - dot(vNormal, vec3(0.0,0.0,1.0)), 3.0);
  gl_FragColor = vec4(0.25,0.75,1.0,1.0) * i * 0.9;
}`;
const atmoVert = `varying vec3 vNormal; void main(){ vNormal=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `;

export type EarthProps = {
  onPick?: ((lat: number, lng: number) => void) | undefined;
  selection?: [number, number, number, number] | null | undefined;
  spin?: boolean | undefined;
};

function SelectionBox({ b }: { b: [number, number, number, number] }) {
  const geo = useMemo(() => {
    const [s, w, n, e] = b;
    const pts: THREE.Vector3[] = [];
    const steps = 24;
    for (let i = 0; i <= steps; i++) pts.push(latLngToVec(s, w + ((e - w) * i) / steps, 1.01));
    for (let i = 0; i <= steps; i++) pts.push(latLngToVec(s + ((n - s) * i) / steps, e, 1.01));
    for (let i = 0; i <= steps; i++) pts.push(latLngToVec(n, e - ((e - w) * i) / steps, 1.01));
    for (let i = 0; i <= steps; i++) pts.push(latLngToVec(n - ((n - s) * i) / steps, w, 1.01));
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [b]);
  return (
    <line>
      <primitive object={geo} attach="geometry" />
      <lineBasicMaterial color="#ffffff" />
    </line>
  );
}

function Earth({ onPick, selection, spin = true }: EarthProps) {
  const [day, night, clouds] = useLoader(THREE.TextureLoader, [
    "/textures/earth_atmos_2048.jpg",
    "/textures/earth_lights_2048.png",
    "/textures/earth_clouds_1024.png",
  ]);
  day!.colorSpace = THREE.SRGBColorSpace;
  night!.colorSpace = THREE.SRGBColorSpace;
  const group = useRef<THREE.Group>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const markers = useRef<THREE.InstancedMesh>(null);

  const hotspots = useMemo(() => sampleHotspots().filter((_, i) => i % 3 === 0), []);
  const uniforms = useMemo(() => ({ dayMap: { value: day }, nightMap: { value: night }, sun: { value: SUN } }), [day, night]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    if (group.current && spin) group.current.rotation.y += dt * 0.04;
    if (cloudRef.current) cloudRef.current.rotation.y += dt * 0.012;
    if (markers.current && !markers.current.userData["ready"]) {
      const m = new THREE.Object3D();
      hotspots.forEach((h, i) => {
        m.position.copy(latLngToVec(h.lat, h.lng, 1.004));
        m.lookAt(0, 0, 0);
        const s = 0.006 + Math.min(h.frp, 200) / 200 * 0.012;
        m.scale.set(s, s, s);
        m.updateMatrix();
        markers.current!.setMatrixAt(i, m.matrix);
      });
      markers.current.instanceMatrix.needsUpdate = true;
      markers.current.userData["ready"] = true;
      (state.gl.domElement.parentElement?.parentElement as HTMLElement | null)?.setAttribute("data-scene-ready", "true");
    }
    if (markers.current) {
      const mat = markers.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.7 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
    }
  });

  return (
    <group
      ref={group}
      rotation={[0.35, 2.2, 0]}
      onClick={(e) => {
        if (!onPick || !group.current || e.delta > 5) return;
        e.stopPropagation();
        const p = group.current.worldToLocal(e.point.clone()).normalize();
        const lat = 90 - (Math.acos(p.y) * 180) / Math.PI;
        let lng = (Math.atan2(p.z, -p.x) * 180) / Math.PI - 180;
        if (lng < -180) lng += 360;
        onPick(lat, lng);
      }}
    >
      {selection && <SelectionBox b={selection} />}
      <mesh>
        <sphereGeometry args={[1, 96, 96]} />
        <shaderMaterial vertexShader={earthVert} fragmentShader={earthFrag} uniforms={uniforms} />
      </mesh>
      <mesh ref={cloudRef} scale={1.012}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial alphaMap={clouds ?? null} transparent opacity={0.35} color="#ffffff" depthWrite={false} />
      </mesh>
      <instancedMesh ref={markers} args={[undefined, undefined, hotspots.length]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#FF8A3D" transparent toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function Atmosphere() {
  return (
    <mesh scale={1.16}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial vertexShader={atmoVert} fragmentShader={atmoFrag} uniforms={{ sun: { value: SUN } }} blending={THREE.AdditiveBlending} side={THREE.BackSide} transparent depthWrite={false} />
    </mesh>
  );
}

function Satellite({ radius, speed, tilt, color }: { radius: number; speed: number; tilt: number; color: string }) {
  const ref = useRef<THREE.Group>(null);
  const ring = useMemo(() => {
    const pts = Array.from({ length: 129 }, (_, i) => {
      const a = (i / 128) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    });
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius]);
  useFrame((s) => {
    if (!ref.current) return;
    const a = s.clock.elapsedTime * speed;
    ref.current.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    ref.current.rotation.y = -a;
  });
  return (
    <group rotation={[tilt, 0, tilt * 0.6]}>
      <lineLoop geometry={ring}>
        <lineBasicMaterial color={color} transparent opacity={0.35} />
      </lineLoop>
      <group ref={ref}>
        <mesh><boxGeometry args={[0.035, 0.025, 0.025]} /><meshStandardMaterial color="#cfd8e3" metalness={0.8} roughness={0.3} /></mesh>
        <mesh position={[0.05, 0, 0]}><boxGeometry args={[0.06, 0.002, 0.025]} /><meshStandardMaterial color="#1d4f8a" metalness={0.5} roughness={0.4} emissive="#0b2a55" /></mesh>
        <mesh position={[-0.05, 0, 0]}><boxGeometry args={[0.06, 0.002, 0.025]} /><meshStandardMaterial color="#1d4f8a" metalness={0.5} roughness={0.4} emissive="#0b2a55" /></mesh>
        <pointLight color={color} intensity={0.4} distance={0.3} />
      </group>
    </group>
  );
}

export default function EarthScene(props: EarthProps) {
  return (
    <div className="h-full w-full">
      <Canvas camera={{ position: [0, 0.2, 3.1], fov: 42 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={["#000000"]} />
        <ambientLight intensity={0.25} />
        <directionalLight position={SUN.clone().multiplyScalar(5)} intensity={2.2} />
        <Stars radius={60} depth={30} count={2500} factor={2.5} fade speed={0.3} />
        <Suspense fallback={null}>
          <Earth {...props} />
        </Suspense>
        <Atmosphere />
        <Satellite radius={1.35} speed={0.35} tilt={0.9} color="#39D5FF" />
        <Satellite radius={1.5} speed={0.22} tilt={-0.5} color="#82E5FF" />
        <Satellite radius={1.62} speed={0.17} tilt={1.4} color="#F4D06F" />
        <OrbitControls enablePan={false} minDistance={1.6} maxDistance={6} enableDamping rotateSpeed={0.5} />
      </Canvas>
    </div>
  );
}
