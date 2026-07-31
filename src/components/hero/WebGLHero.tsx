import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import logoH from "@/assets/logo-h.png";

interface ServiceData {
  id: string;
  name: string;
  path: string;
  description: string;
  color: string;
  icon: string;
}

const SERVICES: ServiceData[] = [
  {
    id: "dev",
    name: "Houcine.tech",
    path: "/dev",
    description: "Building scalable, modern applications with React, TypeScript, and cutting-edge web technologies.",
    color: "#CCCCCC",
    icon: "terminal",
  },
  {
    id: "designs",
    name: "Houcine.studio",
    path: "/designs",
    description: "Crafting bold visual experiences through branding, UI/UX, and creative direction.",
    color: "#CCCCCC",
    icon: "palette",
  },
  {
    id: "reads",
    name: "Houcine.education",
    path: "/reads",
    description: "A curated digital bookstore for learners exploring tech, design, and innovation.",
    color: "#CCCCCC",
    icon: "book",
  },
  {
    id: "manages",
    name: "Houcine.management",
    path: "/manages",
    description: "Building and managing creative brands, artists, and strategic projects.",
    color: "#CCCCCC",
    icon: "briefcase",
  },
];

// Animation timing
const LOOP_DURATION = 18; // seconds
const FORMATION_DURATION = 4; // seconds for logo formation
const SERVICE_CYCLE_START = 5; // start cycling services after formation
const SERVICE_HIGHLIGHT_DURATION = 3; // seconds per service highlight

interface WebGLHeroProps {
  onActiveServiceChange?: (service: ServiceData | null) => void;
  onSceneReady?: (ready: boolean) => void;
}

// Helper to get viewport dimensions (handles iOS Safari address bar)
const getViewportSize = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

// Initial checks (sync to avoid hydration issues)
const checkIsMobile = () => window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const checkReducedMotion = () => typeof window !== 'undefined' && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const checkWebGLSupport = () => {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
};

export default function WebGLHero({ onActiveServiceChange, onSceneReady }: WebGLHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const serviceSpritesRef = useRef<THREE.Sprite[]>([]);
  const animationFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetMouseRef = useRef({ x: 0, y: 0 });
  const isVisibleRef = useRef(true);
  
  // Initialize state synchronously to avoid render flash
  const [isMobile, setIsMobile] = useState(() => checkIsMobile());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => checkReducedMotion());
  const [webglSupported, setWebglSupported] = useState(() => checkWebGLSupport());
  const [activeServiceIndex, setActiveServiceIndex] = useState(-1);
  const [isReady, setIsReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  // Update on client mount and handle orientation changes
  useEffect(() => {
    const updateState = () => {
      setIsMobile(checkIsMobile());
    };
    
    // Listen for orientation changes (mobile)
    window.addEventListener("orientationchange", updateState);
    window.addEventListener("resize", updateState);
    
    // Recheck reduced motion preference changes
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    motionQuery.addEventListener("change", handleMotionChange);
    
    // Mark ready after first paint
    setIsReady(true);
    
    return () => {
      window.removeEventListener("orientationchange", updateState);
      window.removeEventListener("resize", updateState);
      motionQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  // Notify parent of active service changes
  useEffect(() => {
    if (activeServiceIndex >= 0 && activeServiceIndex < SERVICES.length) {
      onActiveServiceChange?.(SERVICES[activeServiceIndex]);
    } else {
      onActiveServiceChange?.(null);
    }
  }, [activeServiceIndex, onActiveServiceChange]);

  // Create icon texture using canvas
  const createIconTexture = useCallback((icon: string, color: string): THREE.Texture => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw icon
    ctx.fillStyle = color;
    ctx.font = "bold 64px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const icons: Record<string, string> = {
      terminal: "⌨",
      palette: "🎨",
      book: "📚",
      briefcase: "💼",
    };

    // Draw a glowing circle background
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, color + "40");
    gradient.addColorStop(0.5, color + "20");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw icon text
    ctx.fillStyle = color;
    ctx.fillText(icons[icon] || "●", size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  // Load logo and extract particle positions
  const loadLogoParticles = useCallback((): Promise<Float32Array[]> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const targetWidth = isMobile ? 150 : 250;
        const scale = targetWidth / img.width;
        canvas.width = Math.floor(img.width * scale);
        canvas.height = Math.floor(img.height * scale);
        
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const particles: number[] = [];
        const targetParticleCount = isMobile ? 3000 : 6000;
        
        // Sample pixels with alpha > threshold
        const step = Math.max(1, Math.floor(Math.sqrt((canvas.width * canvas.height) / targetParticleCount)));
        
        for (let y = 0; y < canvas.height; y += step) {
          for (let x = 0; x < canvas.width; x += step) {
            const i = (y * canvas.width + x) * 4;
            const alpha = imageData.data[i + 3];
            
            if (alpha > 50) {
              // Center the logo
              const px = (x - canvas.width / 2) * 0.02;
              const py = -(y - canvas.height / 2) * 0.02;
              const pz = (Math.random() - 0.5) * 0.1;
              particles.push(px, py, pz);
            }
          }
        }

        // Generate random start positions
        const particleCount = particles.length / 3;
        const startPositions = new Float32Array(particles.length);
        const targetPositions = new Float32Array(particles);

        for (let i = 0; i < particleCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const radius = 3 + Math.random() * 5;
          startPositions[i * 3] = Math.cos(angle) * radius;
          startPositions[i * 3 + 1] = Math.sin(angle) * radius + (Math.random() - 0.5) * 4;
          startPositions[i * 3 + 2] = (Math.random() - 0.5) * 4;
        }

        resolve([startPositions, targetPositions]);
      };
      img.onerror = () => {
        // Fallback: create simple H shape
        const particles: number[] = [];
        const size = 50;
        for (let i = 0; i < size; i++) {
          // Left vertical
          particles.push(-1, (i / size - 0.5) * 2, 0);
          // Right vertical
          particles.push(1, (i / size - 0.5) * 2, 0);
          // Horizontal bar
          if (i > size * 0.4 && i < size * 0.6) {
            for (let j = 0; j < 20; j++) {
              particles.push((j / 20 - 0.5) * 2, 0, 0);
            }
          }
        }
        const startPositions = new Float32Array(particles.length);
        const targetPositions = new Float32Array(particles);
        for (let i = 0; i < particles.length / 3; i++) {
          startPositions[i * 3] = (Math.random() - 0.5) * 8;
          startPositions[i * 3 + 1] = (Math.random() - 0.5) * 8;
          startPositions[i * 3 + 2] = (Math.random() - 0.5) * 4;
        }
        resolve([startPositions, targetPositions]);
      };
      img.src = logoH;
    });
  }, [isMobile]);

  // Easing function
  const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);
  const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || !webglSupported || !isReady) return;

    const container = containerRef.current;
    
    // Use viewport dimensions, not container (fixes iOS/mobile issues)
    const { width, height } = getViewportSize();
    
    // Ensure dimensions are valid
    if (width === 0 || height === 0) {
      console.warn("WebGLHero: Invalid viewport dimensions, retrying...");
      const retryTimer = setTimeout(() => setIsReady(false), 100);
      setTimeout(() => setIsReady(true), 150);
      return () => clearTimeout(retryTimer);
    }

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera - pull back more on mobile for better framing
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.z = isMobile ? 7 : 5;
    cameraRef.current = camera;

    // Renderer with mobile-optimized settings
    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile, // Disable antialiasing on mobile for performance
      alpha: true,
      powerPreference: isMobile ? "low-power" : "high-performance",
      failIfMajorPerformanceCaveat: false, // Don't fail on low-end devices
    });
    
    // Set size explicitly to viewport (not container)
    renderer.setSize(width, height, false);
    
    // Cap pixel ratio: 1.5 for mobile, 2 for desktop
    const maxPixelRatio = isMobile ? 1.5 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    renderer.setClearColor(0x000000, 0);
    
    // Style canvas to fill container
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add fog for depth
    scene.fog = new THREE.FogExp2(0x000000, 0.08);

    // Load particles
    loadLogoParticles().then(([startPositions, targetPositions]) => {
      const particleCount = startPositions.length / 3;
      
      // Create geometry
      const geometry = new THREE.BufferGeometry();
      const positions = prefersReducedMotion 
        ? new Float32Array(targetPositions) 
        : new Float32Array(startPositions);
      
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("startPosition", new THREE.BufferAttribute(new Float32Array(startPositions), 3));
      geometry.setAttribute("targetPosition", new THREE.BufferAttribute(new Float32Array(targetPositions), 3));

      // Create shader material for particles
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: prefersReducedMotion ? 1 : 0 },
          uColor: { value: new THREE.Color(0xCCCCCC) },
          uGlow: { value: 0 },
          uPixelRatio: { value: renderer.getPixelRatio() },
        },
        vertexShader: `
          attribute vec3 startPosition;
          attribute vec3 targetPosition;
          uniform float uTime;
          uniform float uProgress;
          uniform float uPixelRatio;
          varying float vAlpha;
          
          void main() {
            vec3 pos = mix(startPosition, targetPosition, uProgress);
            
            // Breathing motion after formation
            if (uProgress > 0.99) {
              float breathe = sin(uTime * 0.5 + position.x * 2.0 + position.y * 2.0) * 0.02;
              pos += normalize(pos) * breathe;
              
              // Micro drift
              pos.x += sin(uTime * 0.3 + position.y * 3.0) * 0.01;
              pos.y += cos(uTime * 0.4 + position.x * 3.0) * 0.01;
            }
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            
            // Size with distance
            float size = 2.5 * uPixelRatio;
            gl_PointSize = size * (1.0 / -mvPosition.z);
            
            vAlpha = 0.6 + sin(uTime + position.x * 5.0) * 0.2;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uGlow;
          varying float vAlpha;
          
          void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            
            float alpha = (1.0 - dist * 2.0) * vAlpha * 1.2;
            vec3 color = uColor + uGlow * 0.3;
            
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const particles = new THREE.Points(geometry, material);
      scene.add(particles);
      particlesRef.current = particles;

      // Mark scene as ready after particles are loaded
      setSceneReady(true);
      onSceneReady?.(true);
    });

    // Create service sprites
    SERVICES.forEach((service, index) => {
      const texture = createIconTexture(service.icon, service.color);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(0.6, 0.6, 1);
      sprite.userData = { index, baseOpacity: 0.7 };
      scene.add(sprite);
      serviceSpritesRef.current.push(sprite);
    });

    // Handle resize with debounce for orientation changes
    let resizeTimeout: number;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        if (!camera || !renderer) return;
        const { width: w, height: h } = getViewportSize();
        if (w === 0 || h === 0) return;
        
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        
        // Update pixel ratio on resize (device might change)
        const maxPixelRatio = checkIsMobile() ? 1.5 : 2;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
      }, 100);
    };

    // Handle mouse move (desktop only)
    const handleMouseMove = (e: MouseEvent) => {
      if (isMobile) return;
      targetMouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      targetMouseRef.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };

    // Handle visibility change
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      if (!document.hidden) {
        startTimeRef.current = performance.now() / 1000 - (startTimeRef.current % LOOP_DURATION);
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Animation loop
    startTimeRef.current = performance.now() / 1000;

    const animate = () => {
      if (!isVisibleRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const currentTime = performance.now() / 1000;
      const elapsed = currentTime - startTimeRef.current;
      const loopTime = elapsed % LOOP_DURATION;

      // Smooth mouse lerp
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.05;

      // Camera parallax (desktop only)
      if (!isMobile && camera) {
        camera.position.x = mouseRef.current.x * 0.3;
        camera.position.y = mouseRef.current.y * 0.2;
        camera.lookAt(0, 0, 0);
      }

      // Update particles
      if (particlesRef.current && !prefersReducedMotion) {
        const material = particlesRef.current.material as THREE.ShaderMaterial;
        
        // Formation progress
        const formationProgress = Math.min(1, loopTime / FORMATION_DURATION);
        material.uniforms.uProgress.value = easeOutQuart(formationProgress);
        material.uniforms.uTime.value = currentTime;

        // Glow pulse near end of loop
        const glowPhase = (loopTime - LOOP_DURATION + 2) / 2;
        if (glowPhase > 0 && glowPhase < 1) {
          material.uniforms.uGlow.value = easeInOutSine(glowPhase) * 0.5;
        } else {
          material.uniforms.uGlow.value = 0;
        }
      }

      // Update service sprites
      if (!prefersReducedMotion) {
        const orbitRadius = isMobile ? 2.2 : 2.5;
        const orbitSpeed = 0.15;
        
        serviceSpritesRef.current.forEach((sprite, index) => {
          const angle = (currentTime * orbitSpeed) + (index * Math.PI * 0.5);
          const yOffset = Math.sin(currentTime * 0.5 + index) * 0.1;
          
          sprite.position.x = Math.cos(angle) * orbitRadius;
          sprite.position.y = Math.sin(angle) * 0.3 + yOffset;
          sprite.position.z = Math.sin(angle) * orbitRadius * 0.3;
          
          // Determine active service
          if (loopTime > SERVICE_CYCLE_START) {
            const cycleTime = loopTime - SERVICE_CYCLE_START;
            const currentServiceIndex = Math.floor(cycleTime / SERVICE_HIGHLIGHT_DURATION) % SERVICES.length;
            
            if (currentServiceIndex !== activeServiceIndex) {
              setActiveServiceIndex(currentServiceIndex);
            }
            
            const isActive = index === currentServiceIndex;
            const targetScale = isActive ? 1.0 : 0.6;
            const targetOpacity = isActive ? 1.0 : 0.5;
            const targetZ = isActive ? sprite.position.z + 0.5 : sprite.position.z;
            
            sprite.scale.lerp(new THREE.Vector3(targetScale, targetScale, 1), 0.1);
            (sprite.material as THREE.SpriteMaterial).opacity += (targetOpacity - (sprite.material as THREE.SpriteMaterial).opacity) * 0.1;
            sprite.position.z = targetZ;
          } else {
            setActiveServiceIndex(-1);
          }
        });
      }

      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cancelAnimationFrame(animationFrameRef.current);
      
      serviceSpritesRef.current.forEach((sprite) => {
        (sprite.material as THREE.SpriteMaterial).dispose();
        sprite.geometry?.dispose();
      });
      serviceSpritesRef.current = [];
      
      if (particlesRef.current) {
        (particlesRef.current.material as THREE.ShaderMaterial).dispose();
        particlesRef.current.geometry.dispose();
      }
      
      if (renderer.domElement.parentNode) {
        renderer.dispose();
        container.removeChild(renderer.domElement);
      }
    };
  }, [webglSupported, isMobile, prefersReducedMotion, loadLogoParticles, createIconTexture, activeServiceIndex, isReady]);

  if (!webglSupported) {
    return (
      <div 
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background"
      >
        <img 
          src={logoH} 
          alt="Houcine.world Logo" 
          className="w-32 h-32 md:w-48 md:h-48 object-contain opacity-80 animate-pulse"
        />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full"
      style={{
        // Ensure full viewport coverage on mobile (fixes iOS Safari address bar)
        width: '100vw',
        height: '100vh',
        minHeight: '-webkit-fill-available',
      }}
      aria-hidden="true"
    />
  );
}

export { SERVICES };
export type { ServiceData };
