import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export class ClashViz {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private animId = 0
  private overlapMesh: THREE.Mesh | null = null
  private disposed = false
  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x060a12)

    const w = canvas.clientWidth || 400
    const h = canvas.clientHeight || 280
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100)
    this.camera.position.set(4.5, 3.2, 5.5)

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(w, h, false)

    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.target.set(0, 0.6, 0)

    const amb = new THREE.AmbientLight(0x8899aa, 0.55)
    this.scene.add(amb)
    const dir = new THREE.DirectionalLight(0xffffff, 1.1)
    dir.position.set(5, 8, 3)
    this.scene.add(dir)
    const fill = new THREE.DirectionalLight(0x38bdf8, 0.35)
    fill.position.set(-4, 2, -2)
    this.scene.add(fill)

    const grid = new THREE.GridHelper(10, 20, 0x243049, 0x1a2438)
    this.scene.add(grid)

    this.buildClashGeometry()
    this.animate()

    window.addEventListener('resize', this.onResize)
  }

  private buildClashGeometry() {
    // Steel beam (W-ish box) — structural orange
    const beamMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.55,
      roughness: 0.4,
    })
    const beam = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.45, 0.35), beamMat)
    beam.position.set(0, 1.0, 0)
    beam.name = 'beam'
    this.scene.add(beam)

    // flanges hint
    const flangeMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.5,
      roughness: 0.45,
    })
    const topFlange = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.08, 0.55), flangeMat)
    topFlange.position.set(0, 1.22, 0)
    this.scene.add(topFlange)
    const botFlange = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.08, 0.55), flangeMat)
    botFlange.position.set(0, 0.78, 0)
    this.scene.add(botFlange)

    // Duct — cyan rectangular
    const ductMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.2,
      roughness: 0.55,
      transparent: true,
      opacity: 0.88,
    })
    const duct = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 3.2), ductMat)
    duct.position.set(0.15, 0.85, 0.1) // overlaps beam
    duct.name = 'duct'
    this.scene.add(duct)

    // Overlap highlight volume (semi-transparent red)
    const overlapMat = new THREE.MeshStandardMaterial({
      color: 0xf87171,
      transparent: true,
      opacity: 0.55,
      emissive: 0xf87171,
      emissiveIntensity: 0.35,
      depthWrite: false,
    })
    this.overlapMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 0.4), overlapMat)
    this.overlapMesh.position.set(0.1, 0.95, 0)
    this.scene.add(this.overlapMesh)

    // Labels via sprites (simple)
    this.addLabel('BEAM W18×35', 0, 1.55, 0, 0xf59e0b)
    this.addLabel('DUCT SA-02', 0.15, 0.45, 1.4, 0x38bdf8)
    this.addLabel('CLASH', 0.1, 1.35, -0.6, 0xf87171)
  }

  private addLabel(text: string, x: number, y: number, z: number, color: number) {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 64
    const ctx = c.getContext('2d')!
    ctx.fillStyle = 'rgba(11,18,32,0.75)'
    ctx.beginPath()
    ctx.moveTo(8, 8)
    ctx.lineTo(248, 8)
    ctx.quadraticCurveTo(256, 8, 256, 16)
    ctx.lineTo(256, 48)
    ctx.quadraticCurveTo(256, 56, 248, 56)
    ctx.lineTo(8, 56)
    ctx.quadraticCurveTo(0, 56, 0, 48)
    ctx.lineTo(0, 16)
    ctx.quadraticCurveTo(0, 8, 8, 8)
    ctx.closePath()
    ctx.fill()
    ctx.font = 'bold 22px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0')
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 128, 32)
    const tex = new THREE.CanvasTexture(c)
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true })
    const sprite = new THREE.Sprite(mat)
    sprite.position.set(x, y, z)
    sprite.scale.set(1.6, 0.4, 1)
    this.scene.add(sprite)
  }

  private animate = () => {
    if (this.disposed) return
    this.animId = requestAnimationFrame(this.animate)
    if (this.overlapMesh) {
      const t = performance.now() * 0.003
      const opacity = 0.35 + 0.25 * Math.sin(t)
      ;(this.overlapMesh.material as THREE.MeshStandardMaterial).opacity = opacity
      ;(this.overlapMesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.25 + 0.2 * Math.sin(t)
    }
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  private onResize = () => {
    const canvas = this.canvas
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (w === 0 || h === 0) return
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.animId)
    window.removeEventListener('resize', this.onResize)
    this.controls.dispose()
    this.renderer.dispose()
  }
}
