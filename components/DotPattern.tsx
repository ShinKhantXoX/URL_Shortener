"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"

export interface DotPatternProps {
  className?: string
  children?: React.ReactNode
  /** Dot diameter in pixels */
  dotSize?: number
  /** Gap between dots in pixels */
  gap?: number
  /** Base dot color (hex) */
  baseColor?: string
  /** Glow color on hover (hex) */
  glowColor?: string
  /** Mouse proximity radius for highlighting */
  proximity?: number
  /** Glow intensity multiplier */
  glowIntensity?: number
  /** Wave animation speed (0 to disable) */
  waveSpeed?: number
  noBackground?: boolean
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 }
}

interface Dot {
  x: number
  y: number
  baseOpacity: number
}

export function DotPattern({
  className = "",
  children,
  dotSize = 2,
  gap = 24,
  baseColor = "#404040",
  glowColor = "#22d3ee",
  proximity = 120,
  glowIntensity = 1,
  waveSpeed = 0.5,
  noBackground = false,
}: DotPatternProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dotsRef = useRef<Dot[]>([])
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const animationRef = useRef<number>(0)
  const startTimeRef = useRef<number | null>(null)

  const baseRgb = useMemo(() => hexToRgb(baseColor), [baseColor])
  const glowRgb = useMemo(() => hexToRgb(glowColor), [glowColor])

  const buildGrid = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    const ctx = canvas.getContext("2d")
    if (ctx) ctx.scale(dpr, dpr)

    const cellSize = dotSize + gap
    const cols = Math.ceil(rect.width / cellSize) + 1
    const rows = Math.ceil(rect.height / cellSize) + 1

    const offsetX = (rect.width - (cols - 1) * cellSize) / 2
    const offsetY = (rect.height - (rows - 1) * cellSize) / 2

    const dots: Dot[] = []
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        dots.push({
          x: offsetX + col * cellSize,
          y: offsetY + row * cellSize,
          baseOpacity: 0.3 + Math.random() * 0.2,
        })
      }
    }
    dotsRef.current = dots
  }, [dotSize, gap])

  // Use a ref to store the draw function
  const drawRef = useRef<() => void>(null)

  // Define the draw function separately
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Initialize start time on first draw
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now()
    }

    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)

    const { x: mx, y: my } = mouseRef.current
    const proxSq = proximity * proximity
    const time = (Date.now() - startTimeRef.current) * 0.001 * waveSpeed

    for (const dot of dotsRef.current) {
      const dx = dot.x - mx
      const dy = dot.y - my
      const distSq = dx * dx + dy * dy

      // Wave animation
      const wave = Math.sin(dot.x * 0.02 + dot.y * 0.02 + time) * 0.5 + 0.5
      const waveOpacity = dot.baseOpacity + wave * 0.15
      const waveScale = 1 + wave * 0.2

      let opacity = waveOpacity
      let scale = waveScale
      let r = baseRgb.r
      let g = baseRgb.g
      let b = baseRgb.b
      let glow = 0

      // Mouse proximity effect
      if (distSq < proxSq) {
        const dist = Math.sqrt(distSq)
        const t = 1 - dist / proximity
        const easedT = t * t * (3 - 2 * t) // smoothstep

        // Interpolate color
        r = Math.round(baseRgb.r + (glowRgb.r - baseRgb.r) * easedT)
        g = Math.round(baseRgb.g + (glowRgb.g - baseRgb.g) * easedT)
        b = Math.round(baseRgb.b + (glowRgb.b - baseRgb.b) * easedT)

        opacity = Math.min(1, waveOpacity + easedT * 0.7)
        scale = waveScale + easedT * 0.8
        glow = easedT * glowIntensity
      }

      const radius = (dotSize / 2) * scale

      // Draw glow
      if (glow > 0) {
        const gradient = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, radius * 4)
        gradient.addColorStop(0, `rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, ${glow * 0.4})`)
        gradient.addColorStop(0.5, `rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, ${glow * 0.1})`)
        gradient.addColorStop(1, `rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, 0)`)
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, radius * 4, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      }

      // Draw dot
      ctx.beginPath()
      ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`
      ctx.fill()
    }

    // Use the ref to call the same function
    if (drawRef.current) {
      animationRef.current = requestAnimationFrame(drawRef.current)
    }
  }, [proximity, baseRgb, glowRgb, dotSize, glowIntensity, waveSpeed])

  // Update the ref whenever draw changes
  useEffect(() => {
    drawRef.current = draw
  }, [draw])

  useEffect(() => {
    buildGrid()

    const container = containerRef.current
    if (!container) return

    const ro = new ResizeObserver(buildGrid)
    ro.observe(container)

    return () => ro.disconnect()
  }, [buildGrid])

  useEffect(() => {
    // Start the animation
    if (drawRef.current) {
      animationRef.current = requestAnimationFrame(drawRef.current)
    }
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener("mousemove", handleMouseMove)
      container.addEventListener("mouseleave", handleMouseLeave)
    }

    return () => {
      if (container) {
        container.removeEventListener("mousemove", handleMouseMove)
        container.removeEventListener("mouseleave", handleMouseLeave)
      }
    }
  }, [])

  // Combine classes manually since we don't have cn utility
  const combinedClassName = [
    "fixed inset-0 overflow-hidden bg-neutral-950",
    !noBackground && "bg-neutral-950", 
    className
  ].filter(Boolean).join(" ")

  return (
    <div
      ref={containerRef}
      className={combinedClassName}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Vignette overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(10,10,10,0.6) 100%)",
        }}
      />

      {/* Content layer */}
      {children && <div className="relative z-10 h-full w-full">{children}</div>}
    </div>
  )
}

// Optional: Export a default demo component
export default function DotPatternDemo() {
  return <DotPattern />
}