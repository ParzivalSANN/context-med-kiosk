import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Voice from './Voice'

/**
 * Avatar Component (Lip Sync Enabled)
 * Karakter yüklendiğinde gltfjsx ile güncellenecek.
 */
export function Avatar(props) {
  const group = useRef()
  const headRef = useRef()
  const mouthRef = useRef()
  const leftEyeRef = useRef()
  const rightEyeRef = useRef()
  
  // Karakter hareket animasyonu ve Lip Sync
  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime()
    
    // Genel Salınım (Idling)
    if (group.current) {
      // PROPS'tan gelen asıl pozisyonu koruyarak üzerine salınım ekliyoruz
      const baseY = props.position ? props.position[1] : 0;
      group.current.position.y = baseY + Math.sin(t * 1.5) * 0.03;
      
      // Vücut hafifçe döner
      group.current.rotation.y = Math.sin(t * 0.5) * 0.05;
    }

    if (headRef.current) {
      // Kafa biraz daha bağımsız, sevimli bir şekilde sağa sola eğilir
      headRef.current.rotation.z = Math.sin(t * 0.8) * 0.02;
      headRef.current.rotation.x = Math.sin(t * 1.2) * 0.02;
    }

    // Lip Sync - Voice.getAudioLevel() her frame simulated level döndürür
    const audioLevel = Voice.getAudioLevel() // 0.0 - 1.0

    // Sevimli Robot Ağız Animasyonu
    if (mouthRef.current) {
      // Konuşurken ağız dikeyde açılır, yatayda hafifçe genişler
      const targetScaleY = 0.2 + audioLevel * 2.5; 
      const targetScaleX = 1.0 + audioLevel * 0.5;
      mouthRef.current.scale.y = THREE.MathUtils.lerp(mouthRef.current.scale.y, targetScaleY, 0.2);
      mouthRef.current.scale.x = THREE.MathUtils.lerp(mouthRef.current.scale.x, targetScaleX, 0.2);
    }
    
    // Göz kırpma animasyonu (Rastgele sevimli göz kırpmalar)
    if (leftEyeRef.current && rightEyeRef.current) {
      const blink = Math.random() > 0.99 ? 0.1 : 1;
      leftEyeRef.current.scale.y = THREE.MathUtils.lerp(leftEyeRef.current.scale.y, blink, 0.5);
      rightEyeRef.current.scale.y = THREE.MathUtils.lerp(rightEyeRef.current.scale.y, blink, 0.5);
    }
  })

  // Renkler
  const primaryColor = new THREE.Color('#003CBD')
  const bodyColor = new THREE.Color('#ffffff')
  const eyeColor = new THREE.Color('#1e293b')

  return (
    <group ref={group} {...props} dispose={null}>
      
      {/* --- GÖVDE --- */}
      {/* Yumuşak silindir gövde */}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.25, 0.35, 0.6, 32]} />
        <meshStandardMaterial color={bodyColor} roughness={0.2} metalness={0.1} clearcoat={1} />
      </mesh>
      
      {/* Göğüsteki sevimli ekran/kalp */}
      <mesh position={[0, -0.2, 0.31]}>
        <boxGeometry args={[0.2, 0.15, 0.05]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.2, 0.33]}>
        <planeGeometry args={[0.15, 0.05]} />
        <meshBasicMaterial color="#10b981" /> {/* Yeşil sağlık çizgisi */}
      </mesh>

      {/* Boyun Mafsalı */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.1, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.2} />
      </mesh>

      {/* --- KAFA --- */}
      <group ref={headRef} position={[0, 0.35, 0]}>
        {/* Yuvarlak Tatlı Kafa */}
        <mesh>
          <sphereGeometry args={[0.3, 64, 64]} />
          <meshStandardMaterial color={bodyColor} roughness={0.1} metalness={0.1} clearcoat={1} />
        </mesh>

        {/* Sevimli Kulaklar (Sensörler) */}
        <mesh position={[-0.32, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.05, 0.1, 16, 16]} />
          <meshStandardMaterial color={primaryColor} emissive={primaryColor} emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0.32, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.05, 0.1, 16, 16]} />
          <meshStandardMaterial color={primaryColor} emissive={primaryColor} emissiveIntensity={0.5} />
        </mesh>

        {/* Yüz Siyah Camı (Vizör) */}
        <mesh position={[0, 0, 0.22]}>
          <boxGeometry args={[0.45, 0.3, 0.2]} />
          <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.8} />
        </mesh>

        {/* --- YÜZ İFADESİ --- */}
        {/* Sol Göz */}
        <mesh ref={leftEyeRef} position={[-0.1, 0.05, 0.32]}>
          <capsuleGeometry args={[0.03, 0.06, 16, 16]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>

        {/* Sağ Göz */}
        <mesh ref={rightEyeRef} position={[0.1, 0.05, 0.32]}>
          <capsuleGeometry args={[0.03, 0.06, 16, 16]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>

        {/* Konuşan Ağız (Lip Sync) */}
        <mesh ref={mouthRef} position={[0, -0.08, 0.32]}>
          <boxGeometry args={[0.1, 0.02, 0.01]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      </group>

      {/* Çevre Yansımaları KioskFrame'den yönetiliyor */}
    </group>
  )
}

export default Avatar;
