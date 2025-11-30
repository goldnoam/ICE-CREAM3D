import React, { useEffect, useRef } from 'react';

const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#EC4899'];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  size: number;
  wobble: number;
  wobbleSpeed: number;
}

export const Confetti = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set dimensions
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    let particles: Particle[] = [];
    
    // Spawn particles (Burst from center)
    const particleCount = 150;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * 15 + 10; // Speed
      const spread = Math.random();
      
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: Math.cos(angle) * velocity * spread,
        vy: Math.sin(angle) * velocity * spread - 8, // Initial upward pop
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        size: Math.random() * 8 + 6,
        wobble: Math.random() * 10,
        wobbleSpeed: Math.random() * 0.1 + 0.05
      });
    }

    let animationId: number;

    const update = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.5; // Gravity
        p.vx *= 0.96; // Air resistance
        p.vy *= 0.96; 
        
        p.rotation += p.rotationSpeed;
        p.wobble += p.wobbleSpeed;
        
        // Oscillation
        const wobbleX = Math.sin(p.wobble) * 2;

        ctx.save();
        ctx.translate(p.x + wobbleX, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        
        ctx.fillStyle = p.color;
        // Draw confetti piece
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        
        ctx.restore();

        return p.y < canvas.height + 50; // Keep if on screen
      });

      if (particles.length > 0) {
        animationId = requestAnimationFrame(update);
      }
    };

    update();

    return () => {
        window.removeEventListener('resize', resize);
        cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-[60] pointer-events-none" />;
};