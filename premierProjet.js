// --- scène de base --------------------------------------------------------
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Caméra orthographique
let camera = new THREE.OrthographicCamera(
  -window.innerWidth / 2, window.innerWidth / 2,
  window.innerHeight / 2, -window.innerHeight / 2,
  0.1, 10
);
camera.position.set(0, 0, 1);
camera.lookAt(0, 0, 0);

// Plan invisible pour le Raycaster (z=0)
const planGeometry = new THREE.PlaneGeometry(1000, 1000);
const planMaterial = new THREE.MeshBasicMaterial({ visible: false });
const plan = new THREE.Mesh(planGeometry, planMaterial);
scene.add(plan);

    const pointsGroup = new THREE.Group();  // groupe de points rouges
    scene.add(pointsGroup);
    let curveLine = null;
    let lines = null;
    let pts = [];

// Objet THREE.Points pour afficher les points
const pointsGeometry = new THREE.BufferGeometry();
const pointsMaterial = new THREE.PointsMaterial({
  color: 0xff0000,
  size: 10,
});
const points = new THREE.Points(pointsGeometry, pointsMaterial);
scene.add(points);

// Fonction pour créer un cercle rouge (optionnel)
function makeRedDot(x, y) {
  const geom = new THREE.CircleGeometry(5, 32);
  const mat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
  const m = new THREE.Mesh(geom, mat);
  m.position.set(x, y, 0);
  return m;
}

// Effacer la courbe
function clearCurve() {
  if (curveLine) {
    scene.remove(curveLine);
    curveLine.geometry.dispose();
    curveLine.material.dispose();
    curveLine = null;
  }
}

// Effacer tous les points
function clearAll() {
  pts = [];
  clearCurve();
  // Vider les points THREE.Points
  pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
  // Vider les cercles rouges (optionnel)
  while (pointsGroup.children.length) {
    const m = pointsGroup.children.pop();
    m.geometry.dispose();
    m.material.dispose();
  }
}

// Ajouter un point
function addPoint(x, y) {
  pts.push(new THREE.Vector2(x, y));
  // Ajouter un cercle rouge (optionnel)
  pointsGroup.add(makeRedDot(x, y));
  // Mettre à jour la géométrie des points
  updatePointsGeometry();
  updateCurve(0);
}

// Mettre à jour la géométrie des points
function updatePointsGeometry() {
  const positions = [];
  for (const pt of pts) {
    positions.push(pt.x, pt.y, 0);
  }
  pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
}

// Courbe de Bézier (inchangé)
function updateCurve(option) {
  clearCurve();
  switch(option) {
    default:
      allLine();
      break;
    case 1:
      bezier();
      break;
  }
}

// Fonctions allLine et bezier (inchangées)
function allLine() {
  if (pts.length < 2) return;
  const positions = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const x = pts[i].x;
    const y = pts[i].y;
    positions.push(x, y, 0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff });
  curveLine = new THREE.Line(geo, mat);
  scene.add(curveLine);
}

function bezier() {
  if (pts.length < 2) return;
  const positions = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = (i > 0) ? pts[i-1] : pts[i];
    const p1 = pts[i];
    const p2 = pts[i+1];
    const p3 = (i + 2 < pts.length) ? pts[i+2] : pts[i+1];
    const b0 = p1.clone();
    const b1 = p1.clone().add( p2.clone().sub(p0).multiplyScalar(1/6) );
    const b2 = p2.clone().sub( p3.clone().sub(p1).multiplyScalar(1/6) );
    const b3 = p2.clone();
    const steps = 24;
    for (let j = 0; j <= steps; j++) {
      const t = j / steps;
      const umt = 1 - t;
      const umt2 = umt * umt;
      const t2 = t * t;
      const x = umt2*umt * b0.x + 3*umt2*t * b1.x + 3*umt*t2 * b2.x + t2*t * b3.x;
      const y = umt2*umt * b0.y + 3*umt2*t * b1.y + 3*umt*t2 * b2.y + t2*t * b3.y;
      positions.push(x, y, 0);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff });
  curveLine = new THREE.Line(geo, mat);
  scene.add(curveLine);
}

    function clearCurve() {
      if (curveLine) {
        scene.remove(curveLine);
        curveLine.geometry.dispose();
        curveLine.material.dispose();
        curveLine = null;
      }
      if (lines) {
        scene.remove(lines);
        lines.geometry.dispose();
        lines.material.dispose();
        lines = null;
      }
    }
// Placer un point avec Raycaster
renderer.domElement.addEventListener('pointerdown', (e) => {
  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

    function addPoint(x, y) {
      pts.push(new THREE.Vector2(x, y));
      pointsGroup.add(makeRedDot(x, y));
      updateCurve(1);
      //clearAll();
    }

    // Courbe de Béizers
    function updateCurve(option) {
      clearCurve();
      switch(option) {
        default:
          allLine();
          break;
        case 1:
          bezier();
          allLine();
          break;
      }
    }



    function allLine(){
      if (pts.length < 2) return;
      const positions = [];
      for (let i = 0; i < pts.length; i++) {
        const x = pts[i].x;
        const y = pts[i].y;
        positions.push(x, y, 0);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({ color: 0x00ff00 });
      lines = new THREE.Line(geo, mat);
      scene.add(lines);
    }

    function binom(n,k){
      if(k<0 || k>n) return 0;
      if(k===0 || k===n) return 1;
      if(k>n-k) k = n-k;
      let res = 1;
      for(let j=1; j<=k; j++){
        res = (res*(n - (k - j))) / j;
      }
      return res;
    }

    

    function bernstein(points, t){
      const n = points.length - 1;
      if (n < 1) return new THREE.Vector2();
      if (t<=0) return points[0].clone();
      if (t>=1) return points[n].clone();

      let x = 0, y = 0;
      const umt = 1 - t;
      // on peut calculer directement C(n,i) t^i (1-t)^(n-i)
      for(let i=0; i<=n; i++){
        const w = binom(n, i) * Math.pow(t, i) * Math.pow(umt, n - i);
        x += points[i].x * w;
        y += points[i].y * w;
      }
      return new THREE.Vector2(x, y);
    }

    function bezier(){
      if (pts.length < 2) return;

      const steps = 200; // lissage
      const positions = [];
      for(let j=0; j<=steps; j++){
        const t = j/steps;
        const p = bernstein(pts, t);
        positions.push(p.x, p.y, 0);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({ color:0xffffff });
      curveLine = new THREE.Line(geo, mat);
      scene.add(curveLine);
    }
    

    // Redimensionner la fenêtre (C'est optionnel mais j'aime bien)
    function onResize() {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.left   = -window.innerWidth / 2;
      camera.right  =  window.innerWidth / 2;
      camera.top    =  window.innerHeight / 2;
      camera.bottom = -window.innerHeight / 2;
      camera.updateProjectionMatrix();
      updateCurve();
    }
    window.addEventListener('resize', onResize);

    // La boucle d'affichage
    (function animate(){
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    })();
  const intersects = raycaster.intersectObject(plan);
  if (intersects.length > 0) {
    const point = intersects[0].point;
    addPoint(point.x, point.y);
  }
});

// Effacer avec la touche 'r'
window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    clearAll();
  }
});

// Redimensionner la fenêtre
function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.left   = -window.innerWidth / 2;
  camera.right  =  window.innerWidth / 2;
  camera.top    =  window.innerHeight / 2;
  camera.bottom = -window.innerHeight / 2;
  camera.updateProjectionMatrix();
  updateCurve(0);
}
window.addEventListener('resize', onResize);

// Boucle d'affichage
(function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
})();
