import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";

/*
  BottleViewer3D — Viewer 3D interattivo di una bottiglia di vino

  COME FUNZIONA:
  1. Crea una forma di bottiglia usando LatheGeometry (profilo 2D ruotato attorno all'asse Y)
  2. La bottiglia è in vetro scuro (verde bottiglia) con riflessi
  3. Se c'è un'immagine del vino (labelUrl), viene mappata come etichetta sulla bottiglia
  4. L'utente può trascinare col mouse per ruotare la bottiglia (OrbitControls)
  5. La bottiglia ruota lentamente da sola se l'utente non interagisce

  PROFILO BOTTIGLIA (coordinate 2D che vengono ruotate a 360°):
  - Base piatta (raggio ~3.5cm)
  - Corpo cilindrico (la parte grossa, ~15cm di altezza)
  - Spalla curva (dove si restringe)
  - Collo stretto (~1.2cm di raggio, ~8cm)
  - Labbro in cima (leggermente allargato)

  PROPS:
  - labelUrl: URL dell'immagine del vino (opzionale)
  - className: classi CSS per il container
*/

// Profilo della bottiglia — punti [x, y] dove x=raggio e y=altezza
// Viene ruotato attorno all'asse Y per creare la forma 3D
function createBottleProfile(): THREE.Vector2[] {
  const points: THREE.Vector2[] = [];

  // Fondo piatto
  points.push(new THREE.Vector2(0, 0));
  points.push(new THREE.Vector2(3.4, 0));
  points.push(new THREE.Vector2(3.5, 0.2));

  // Corpo (parte cilindrica principale)
  points.push(new THREE.Vector2(3.5, 0.5));
  points.push(new THREE.Vector2(3.5, 12));

  // Spalla (curva di transizione corpo → collo)
  points.push(new THREE.Vector2(3.4, 13));
  points.push(new THREE.Vector2(3.0, 14));
  points.push(new THREE.Vector2(2.4, 15));
  points.push(new THREE.Vector2(1.8, 16));
  points.push(new THREE.Vector2(1.4, 17));

  // Collo
  points.push(new THREE.Vector2(1.2, 18));
  points.push(new THREE.Vector2(1.2, 23));

  // Labbro (bordo in cima)
  points.push(new THREE.Vector2(1.4, 23.3));
  points.push(new THREE.Vector2(1.4, 24));
  points.push(new THREE.Vector2(1.2, 24.2));
  points.push(new THREE.Vector2(0, 24.2));

  return points;
}

// Componente interno: la bottiglia 3D
function Bottle({ labelUrl }: { labelUrl?: string | null }) {
  const bottleRef = useRef<THREE.Group>(null);

  // Crea la geometria della bottiglia (LatheGeometry = profilo ruotato)
  const geometry = useMemo(() => {
    const profile = createBottleProfile();
    const geo = new THREE.LatheGeometry(profile, 64); // 64 segmenti per la rotazione
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Carica la texture dell'etichetta (se disponibile)
  const labelTexture = useMemo(() => {
    if (!labelUrl) return null;
    const loader = new THREE.TextureLoader();
    const tex = loader.load(labelUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [labelUrl]);

  // Rotazione automatica lenta
  useFrame((_, delta) => {
    if (bottleRef.current) {
      bottleRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group ref={bottleRef} position={[0, -12, 0]}>
      {/* Corpo della bottiglia — vetro scuro */}
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          color="#1a3a2a"
          roughness={0.15}
          metalness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.1}
          transmission={0.15}
          thickness={2}
          envMapIntensity={0.8}
        />
      </mesh>

      {/* Etichetta — cilindro sottile sovrapposto al corpo */}
      {labelTexture ? (
        <mesh position={[0, 7, 0]}>
          <cylinderGeometry args={[3.55, 3.55, 6, 64, 1, true]} />
          <meshStandardMaterial
            map={labelTexture}
            transparent
            side={THREE.FrontSide}
            roughness={0.6}
          />
        </mesh>
      ) : null}

      {/* Capsula (foil in cima al collo) */}
      <mesh position={[0, 23.5, 0]}>
        <cylinderGeometry args={[1.45, 1.25, 2, 32]} />
        <meshStandardMaterial color="#111111" roughness={0.3} metalness={0.6} />
      </mesh>
    </group>
  );
}

// Componente esterno con Canvas + controlli
type Props = {
  labelUrl?: string | null;
  className?: string;
};

export function BottleViewer3D({ labelUrl, className }: Props) {
  return (
    <div
      className={className}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 360,
        cursor: "grab",
        borderRadius: "1rem",
        overflow: "hidden",
        background:
          "linear-gradient(to bottom, rgba(228,213,183,0.15), rgba(228,213,183,0.05))",
      }}
    >
      <Canvas
        camera={{
          position: [0, 5, 30],
          fov: 35,
          near: 0.1,
          far: 100,
        }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        {/* Illuminazione */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[8, 12, 8]} intensity={1.2} />
        <directionalLight position={[-5, 8, -5]} intensity={0.4} />

        {/* Environment per i riflessi sul vetro */}
        <Environment preset="studio" />

        {/* La bottiglia */}
        <Bottle labelUrl={labelUrl} />

        {/* Controlli mouse — trascina per ruotare */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
    </div>
  );
}
