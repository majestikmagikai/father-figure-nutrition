import { Suspense, useLayoutEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment, ContactShadows, useTexture } from "@react-three/drei";
import * as THREE from "three";
import bottleGlb from "@/assets/products/VitaminBottle.glb";

interface BottleSpin360Props {
  labelUrl?: string;
  capColor?: string;
  fillColor?: string | null;
  duration?: number;
}

function Bottle({ labelUrl }: { labelUrl?: string }) {
  const { scene } = useGLTF(bottleGlb);
  const labelTexture = labelUrl ? useTexture(labelUrl) : null;

  useLayoutEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    scene.position.x -= center.x;
    scene.position.z -= center.z;

    if (labelTexture) {
      labelTexture.colorSpace = THREE.SRGBColorSpace;
      labelTexture.wrapS = THREE.RepeatWrapping;
      labelTexture.wrapT = THREE.ClampToEdgeWrapping;
      labelTexture.flipY = false;
      labelTexture.repeat.set(1.0, 3.441);
      labelTexture.offset.set(0.0, -0.233);
      labelTexture.needsUpdate = true;
    }

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const meshName = mesh.name.toLowerCase();

        if (meshName.includes("label")) {
          if (labelTexture) {
            mesh.material = new THREE.MeshStandardMaterial({
              map: labelTexture,
              roughness: 0.4,
              metalness: 0.0,
              side: THREE.FrontSide,
              polygonOffset: true,
              polygonOffsetFactor: -1,
              polygonOffsetUnits: -1,
            });
          }
        }

        if (meshName.includes("bottle") || meshName.includes("body")) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          mat.transparent = true;
          mat.opacity = 0.75;
          mat.roughness = 0.05;
          mat.needsUpdate = true;
          mesh.material = mat;
        }

        if (meshName.includes("cap")) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          mat.color.set("#ffffff");
          mat.roughness = 0.2;
          mat.metalness = 0.05;
          mat.needsUpdate = true;
          mesh.material = mat;
        }
      }
    });
  }, [scene, labelTexture]);

  return (
    <group position={[0, 0.4, 0]}>
      <primitive object={scene} scale={1.2} />
    </group>
  );
}

export const BottleSpin360 = ({ labelUrl }: BottleSpin360Props) => {
  return (
    <div
      className="relative w-full aspect-square cursor-grab active:cursor-grabbing"
      role="img"
      aria-label="360° view of supplement bottle. Drag to rotate."
    >
      <div className="absolute inset-10 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <Canvas camera={{ position: [0, 0.6, 18], fov: 35 }} shadows>
        <ambientLight intensity={0.05} />
        <directionalLight position={[4, 6, 4]} intensity={0.05} />
        <directionalLight position={[-4, 2, -2]} intensity={0.1} />
        <Suspense fallback={null}>
          <Bottle labelUrl={labelUrl} />
          <ContactShadows position={[0, -2, 0]} opacity={0.5} scale={5} blur={2} />
          <Environment preset="sunset" environmentRotation={[1, 0, 1]} />
        </Suspense>
        <OrbitControls
          enableZoom={true}
          enablePan={true}
          minDistance={4}
          maxDistance={12}
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 1.8}
          autoRotate
          autoRotateSpeed={0.8}
        />
      </Canvas>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest text-muted-foreground bg-background/60 backdrop-blur px-2.5 py-1 rounded-full border border-border pointer-events-none">
        360° · drag to rotate
      </div>
    </div>
  );
};
